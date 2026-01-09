#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include "ina219.h"
#include "wifi_config.h"
#include "mqtt_client.h"
#include "relay_control.h"

// INA219 sensor instance
INA219 ina219(0x40);  // Default I2C address
bool sensorAvailable = false;  // Track if sensor is connected

// Relay control instance
RelayControl relayControl;

// WiFi and MQTT clients
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
const unsigned long SENSOR_READ_INTERVAL = 100;  // 10 Hz (100ms)
const unsigned long MQTT_PUBLISH_INTERVAL = 1000;  // 1 second

// Sensor data
struct SensorData {
  float current;    // Amperes
  float voltage;    // Volts
  float power;      // Watts
  unsigned long timestamp;
};

SensorData sensorData;

// Device ID (can be set via WiFi config or hardcoded)
const char* DEVICE_ID = "NILM_ESP32_001";

// MQTT topics
String sensorTopic;
String commandTopic;
String statusTopic;

// Forward declarations
void readSensor();
void publishSensorData();
void publishRelayStatus();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setup() {
  // Initialize Serial immediately
  Serial.begin(115200);
  delay(3000);  // Wait for Serial to be ready
  
  // Test Serial output immediately
  Serial.println("\n\n\n");
  Serial.println("========================================");
  Serial.println("   NILM ESP32-S3 System Starting");
  Serial.println("========================================");
  Serial.println();
  Serial.flush();
  delay(100);
  
  // Initialize I2C bus (ESP32-S3 uses GPIO 8 for SDA, GPIO 9 for SCL)
  Wire.begin(8, 9);  // SDA=GPIO8, SCL=GPIO9 for ESP32-S3
  delay(100);
  
  // Initialize INA219 (optional - system will work without it for WiFi/MQTT testing)
  sensorAvailable = false;
  if (ina219.begin()) {
    Serial.println("✓ INA219 sensor initialized successfully");
    // Configure INA219 for 12V DC monitoring
    ina219.setCalibration_32V_2A();  // 32V max, 2A max (adjust if needed)
    sensorAvailable = true;
  } else {
    Serial.println("⚠ WARNING: INA219 sensor not detected!");
    Serial.println("  System will continue without sensor.");
    Serial.println("  WiFi and MQTT will work for testing.");
    Serial.println("  Connect sensor later to enable data collection.");
  }
  
  // Initialize relay control
  relayControl.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup MQTT
  setupMQTT();
  
  // Force immediate test publish (even if sensor not connected)
  Serial.println("\n[TEST] Attempting immediate MQTT test publish...");
  Serial.flush();
  delay(1000);
  
  if (mqttClient.connected()) {
    Serial.println("[TEST] ✓ MQTT connected - will publish data every second");
    Serial.flush();
  } else {
    Serial.println("[TEST] ✗ MQTT NOT connected - will retry in loop()");
    Serial.flush();
  }
  
  // Setup MQTT topics
  sensorTopic = "nilm/sensor/" + String(DEVICE_ID);
  commandTopic = "nilm/command/" + String(DEVICE_ID);
  statusTopic = "nilm/status/" + String(DEVICE_ID);
  
  // Subscribe to command topic for relay control
  if (mqttClient.connected()) {
    mqttClient.subscribe(commandTopic.c_str());
    Serial.println("Subscribed to: " + commandTopic);
  }
  
  // Set MQTT callback for receiving commands
  mqttClient.setCallback(mqttCallback);
  
  Serial.println("\n=== System Status ===");
  if (sensorAvailable) {
    Serial.println("✓ INA219 Sensor: Ready");
  } else {
    Serial.println("⚠ INA219 Sensor: Not Connected (WiFi/MQTT will still work)");
  }
  Serial.println("✓ Relay Control: Active");
  Serial.print("✓ WiFi: ");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected (");
    Serial.print(WiFi.SSID());
    Serial.print(")");
  } else {
    Serial.print("Disconnected");
  }
  Serial.println();
  Serial.print("✓ MQTT: ");
  if (mqttClient.connected()) {
    Serial.print("Connected to ");
    Serial.print(MQTT_BROKER);
  } else {
    Serial.print("Disconnected");
  }
  Serial.println();
  Serial.println("=====================");
  Serial.println("System ready! Listening for commands...\n");
}

void loop() {
  // Maintain WiFi connection
  static unsigned long lastWiFiCheck = 0;
  static unsigned long lastStatusPrint = 0;
  const unsigned long WIFI_CHECK_INTERVAL = 10000;  // Check every 10 seconds
  const unsigned long STATUS_PRINT_INTERVAL = 10000;  // Print status every 10 seconds
  
  unsigned long currentMillis = millis();
  
  // Check WiFi status periodically
  if (currentMillis - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    int wifiStatus = WiFi.status();
    
    if (wifiStatus == WL_CONNECTED) {
      // WiFi is connected - print status
      if (currentMillis - lastStatusPrint >= STATUS_PRINT_INTERVAL) {
        Serial.println("\n[WiFi] ✓ CONNECTED!");
        Serial.print("  SSID: ");
        Serial.println(WiFi.SSID());
        Serial.print("  IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("  RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
        Serial.print("  Gateway: ");
        Serial.println(WiFi.gatewayIP());
        Serial.flush();
        lastStatusPrint = currentMillis;
      }
    } else {
      // WiFi not connected
      Serial.print("\n[WiFi] ✗ DISCONNECTED! Status: ");
      Serial.println(wifiStatus);
      Serial.println("  Attempting reconnection...");
      Serial.flush();
      connectToWiFi();
    }
    lastWiFiCheck = currentMillis;
  }
  
  // Maintain MQTT connection (only if WiFi is connected)
  static unsigned long lastMqttReconnectAttempt = 0;
  const unsigned long MQTT_RECONNECT_INTERVAL = 10000;  // Try every 10 seconds
  
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      if (currentMillis - lastMqttReconnectAttempt >= MQTT_RECONNECT_INTERVAL) {
        Serial.println("\n[MQTT] WiFi connected but MQTT not connected. Attempting reconnect...");
        Serial.print("[MQTT] WiFi IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("[MQTT] MQTT Broker: ");
        Serial.print(MQTT_BROKER);
        Serial.print(":");
        Serial.println(MQTT_PORT);
        Serial.flush();
        
        reconnectMQTT();
        lastMqttReconnectAttempt = currentMillis;
        
        // Resubscribe to command topic after reconnection
        if (mqttClient.connected()) {
          Serial.println("[MQTT] ✓ Connected! Subscribing to commands...");
          Serial.flush();
          mqttClient.subscribe(commandTopic.c_str());
          mqttClient.setCallback(mqttCallback);
          
          // Immediately publish a test message
          publishSensorData();
          Serial.println("[MQTT] ✓ Test message published!");
          Serial.flush();
        } else {
          Serial.print("[MQTT] ✗ Connection failed. State: ");
          Serial.println(mqttClient.state());
          Serial.flush();
        }
      }
    } else {
      mqttClient.loop();
    }
  } else {
    // WiFi not connected, don't try MQTT
    if (mqttClient.connected()) {
      mqttClient.disconnect();
    }
  }
  
  // Read sensor at configured rate (10 Hz)
  currentMillis = millis();
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensor();
    lastSensorRead = currentMillis;
  }
  
  // Publish to MQTT at configured rate (1 Hz)
  if (currentMillis - lastMqttPublish >= MQTT_PUBLISH_INTERVAL) {
    publishSensorData();
    publishRelayStatus();
    lastMqttPublish = currentMillis;
  }
  
  delay(10);  // Small delay to prevent watchdog issues
}

void readSensor() {
  if (sensorAvailable) {
    // Read actual sensor data
    sensorData.current = ina219.getCurrent_mA() / 1000.0;  // Convert mA to A
    sensorData.voltage = ina219.getBusVoltage_V();
    sensorData.power = ina219.getPower_mW() / 1000.0;  // Convert mW to W
  } else {
    // No sensor connected - send zero values for testing
    sensorData.current = 0.0;
    sensorData.voltage = 0.0;
    sensorData.power = 0.0;
  }
  sensorData.timestamp = millis();
  
  // Debug output (can be disabled)
  if (Serial.availableForWrite() && sensorAvailable) {
    Serial.printf("I=%.3fA, V=%.2fV, P=%.2fW\n", 
                  sensorData.current, sensorData.voltage, sensorData.power);
  }
}

void publishSensorData() {
  if (!mqttClient.connected()) {
    return;
  }
  
  // Create JSON payload with sensor data and WiFi status
  StaticJsonDocument<300> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = sensorData.timestamp;
  doc["current"] = sensorData.current;
  doc["voltage"] = sensorData.voltage;
  doc["power"] = sensorData.power;
  
  // Add WiFi connection status
  if (WiFi.status() == WL_CONNECTED) {
    doc["wifi_connected"] = true;
    doc["wifi_ssid"] = WiFi.SSID();
    doc["wifi_rssi"] = WiFi.RSSI();  // Signal strength in dBm
    doc["wifi_ip"] = WiFi.localIP().toString();
  } else {
    doc["wifi_connected"] = false;
    doc["wifi_ssid"] = "";
    doc["wifi_rssi"] = 0;
    doc["wifi_ip"] = "";
  }
  
  char payload[300];
  serializeJson(doc, payload);
  
  // Publish to MQTT topic
  bool published = mqttClient.publish(sensorTopic.c_str(), payload);
  
  // Published status logged less frequently to reduce serial output
}

void publishRelayStatus() {
  if (!mqttClient.connected()) {
    return;
  }
  
  // Create JSON payload with relay status and WiFi info
  StaticJsonDocument<250> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["relay_ch1"] = relayControl.getChannel1State();
  doc["relay_ch2"] = relayControl.getChannel2State();
  
  // Add WiFi connection status
  if (WiFi.status() == WL_CONNECTED) {
    doc["wifi_connected"] = true;
    doc["wifi_ssid"] = WiFi.SSID();
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["wifi_ip"] = WiFi.localIP().toString();
  } else {
    doc["wifi_connected"] = false;
    doc["wifi_ssid"] = "";
    doc["wifi_rssi"] = 0;
    doc["wifi_ip"] = "";
  }
  
  char payload[250];
  serializeJson(doc, payload);
  
  bool published = mqttClient.publish(statusTopic.c_str(), payload);
  // Don't log every status publish to reduce serial output
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload to string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("Received MQTT message on topic: " + String(topic));
  Serial.println("Message: " + message);
  
  // Parse JSON command
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("Failed to parse JSON command");
    return;
  }
  
  // Handle relay control commands
  if (doc.containsKey("relay_ch1")) {
    bool state = doc["relay_ch1"].as<bool>();
    relayControl.setChannel1(state);
  }
  
  if (doc.containsKey("relay_ch2")) {
    bool state = doc["relay_ch2"].as<bool>();
    relayControl.setChannel2(state);
  }
  
  // Handle toggle commands
  if (doc.containsKey("toggle_ch1")) {
    relayControl.toggleChannel1();
  }
  
  if (doc.containsKey("toggle_ch2")) {
    relayControl.toggleChannel2();
  }
  
  // Handle all off/on commands
  if (doc.containsKey("all_off")) {
    relayControl.allOff();
  }
  
  if (doc.containsKey("all_on")) {
    relayControl.allOn();
  }
  
  // Publish acknowledgment
  StaticJsonDocument<150> ack;
  ack["device_id"] = DEVICE_ID;
  ack["status"] = "ok";
  ack["relay_ch1"] = relayControl.getChannel1State();
  ack["relay_ch2"] = relayControl.getChannel2State();
  
  char ackPayload[150];
  serializeJson(ack, ackPayload);
  mqttClient.publish(statusTopic.c_str(), ackPayload);
}


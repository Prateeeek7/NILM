#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <PubSubClient.h>
#include "wifi_config.h"

extern WiFiClient espClient;
extern PubSubClient mqttClient;

// Forward declaration
void reconnectMQTT();

void setupMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512);
  reconnectMQTT();
}

void reconnectMQTT() {
  // Don't try to connect if WiFi is not connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[MQTT] Cannot connect: WiFi not connected");
    Serial.flush();
    return;
  }
  
  Serial.println("\n[MQTT] Starting connection attempt...");
  Serial.print("[MQTT] WiFi Status: CONNECTED");
  Serial.print(" | IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[MQTT] Broker: ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);
  Serial.flush();
  
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    Serial.print("[MQTT] Attempt ");
    Serial.print(attempts + 1);
    Serial.print("/5...");
    Serial.flush();
    
    String clientId = "NILM_ESP32_" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
      Serial.println(" ✓ MQTT CONNECTED!");
      Serial.print("[MQTT] Client ID: ");
      Serial.println(clientId);
      Serial.flush();
      return;
    } else {
      int state = mqttClient.state();
      Serial.print(" ✗ Failed! State code: ");
      Serial.print(state);
      Serial.print(" (");
      switch(state) {
        case -4: Serial.print("TIMEOUT"); break;
        case -3: Serial.print("CONNECTION_LOST"); break;
        case -2: Serial.print("CONNECT_FAILED"); break;
        case -1: Serial.print("DISCONNECTED"); break;
        case 1: Serial.print("BAD_PROTOCOL"); break;
        case 2: Serial.print("BAD_CLIENT_ID"); break;
        case 3: Serial.print("UNAVAILABLE"); break;
        case 4: Serial.print("BAD_CREDENTIALS"); break;
        case 5: Serial.print("UNAUTHORIZED"); break;
        default: Serial.print("UNKNOWN"); break;
      }
      Serial.println(")");
      Serial.flush();
      
      if (attempts < 4) {
        delay(2000);
      }
      attempts++;
    }
  }
  
  if (!mqttClient.connected()) {
    Serial.println("[MQTT] ⚠ Connection failed after 5 attempts. Will retry in loop().");
    Serial.flush();
  }
}

#endif


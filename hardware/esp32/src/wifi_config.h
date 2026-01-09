#ifndef WIFI_CONFIG_H
#define WIFI_CONFIG_H

// WiFi credentials - UPDATE THESE
const char* WIFI_SSID = "EspWIFI";
const char* WIFI_PASSWORD = "";  // No password (open network)

// MQTT Broker configuration
const char* MQTT_BROKER = "10.231.103.132";  // Your computer's IP on WiFi network
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";  // Leave empty if no authentication
const char* MQTT_PASSWORD = "";  // Leave empty if no authentication

void connectToWiFi() {
  Serial.flush();
  delay(100);
  Serial.println("\n=== WiFi Connection ===");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  Serial.print("Password: ");
  Serial.println(WIFI_PASSWORD[0] ? "****" : "(empty)");
  Serial.flush();
  
  // Scan for available networks first
  Serial.println("\nScanning for WiFi networks...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  int n = WiFi.scanNetworks();
  Serial.print("Found ");
  Serial.print(n);
  Serial.println(" networks:");
  
  bool found = false;
  for (int i = 0; i < n; i++) {
    Serial.print("  ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(WiFi.SSID(i));
    Serial.print(" (");
    Serial.print(WiFi.RSSI(i));
    Serial.print(" dBm)");
    if (WiFi.SSID(i) == String(WIFI_SSID)) {
      Serial.print(" <-- MATCH!");
      found = true;
    }
    Serial.println();
  }
  Serial.flush();
  
  if (!found) {
    Serial.print("\n⚠ WARNING: SSID '");
    Serial.print(WIFI_SSID);
    Serial.println("' NOT FOUND in scan!");
    Serial.println("  Check:");
    Serial.println("    - SSID spelling (case-sensitive)");
    Serial.println("    - Router is broadcasting SSID");
    Serial.println("    - Router is on 2.4GHz band");
    Serial.println("    - ESP32 is within range");
    Serial.flush();
  }
  
  Serial.println("\nAttempting connection...");
  Serial.flush();
  
  // Disconnect any existing connection
  WiFi.disconnect(true);
  delay(500);
  
  // Configure WiFi for better stability
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);  // Save WiFi credentials to flash
  WiFi.setSleep(false);   // Disable WiFi sleep for better stability
  
  // Set hostname for easier identification
  WiFi.setHostname("NILM-ESP32-S3");
  
  Serial.println("Starting WiFi connection...");
  Serial.flush();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  int maxAttempts = 30;  // 15 seconds total
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    
    // Print status every 5 attempts
    if (attempts % 5 == 0 && attempts > 0) {
      Serial.print(" [Status: ");
      Serial.print(WiFi.status());
      Serial.print("]");
    }
    
    attempts++;
  }
  Serial.println(); // New line after dots
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi CONNECTED!");
    Serial.print("  IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("  Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("  MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.print("  Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.println("  WiFi configured: persistent=true, sleep=false, auto-reconnect=true");
    Serial.println("=======================\n");
    
    // Wait and verify connection is stable
    delay(2000);
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✓ Connection verified stable!");
      Serial.flush();
    } else {
      Serial.println("⚠ Connection lost immediately!");
      Serial.flush();
    }
  } else {
    Serial.println("✗ WiFi CONNECTION FAILED!");
    Serial.print("  Final Status Code: ");
    int status = WiFi.status();
    Serial.println(status);
    
    // Print status code meaning
    switch(status) {
      case 0: Serial.println("  Status: WL_IDLE_STATUS"); break;
      case 1: Serial.println("  Status: WL_NO_SSID_AVAIL"); break;
      case 3: Serial.println("  Status: WL_CONNECTED"); break;
      case 4: Serial.println("  Status: WL_CONNECT_FAILED"); break;
      case 6: Serial.println("  Status: WL_WRONG_PASSWORD"); break;
      case 7: Serial.println("  Status: WL_DISCONNECTED (NOT_ASSOCED)"); break;
      default: Serial.print("  Status: Unknown ("); Serial.print(status); Serial.println(")"); break;
    }
    
    Serial.println("  Possible causes:");
    Serial.println("    - Wrong SSID or password");
    Serial.println("    - WiFi router not in range");
    Serial.println("    - Router not broadcasting SSID");
    Serial.println("    - Router is 5GHz only (ESP32 needs 2.4GHz)");
    Serial.println("=======================\n");
  }
}

#endif


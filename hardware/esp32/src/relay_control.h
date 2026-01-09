#ifndef RELAY_CONTROL_H
#define RELAY_CONTROL_H

#include <Arduino.h>

// Relay pin definitions for ESP32-S3
// Using GPIO 4 and GPIO 5 for 2-channel relay control
#define RELAY_CH1_PIN 4   // Channel 1 control pin
#define RELAY_CH2_PIN 5   // Channel 2 control pin

// Relay states
#define RELAY_OFF LOW
#define RELAY_ON HIGH

class RelayControl {
public:
  RelayControl();
  void begin();
  void setChannel1(bool state);
  void setChannel2(bool state);
  bool getChannel1State();
  bool getChannel2State();
  void toggleChannel1();
  void toggleChannel2();
  void allOff();
  void allOn();
  
private:
  bool ch1_state;
  bool ch2_state;
};

RelayControl::RelayControl() {
  ch1_state = false;
  ch2_state = false;
}

void RelayControl::begin() {
  pinMode(RELAY_CH1_PIN, OUTPUT);
  pinMode(RELAY_CH2_PIN, OUTPUT);
  digitalWrite(RELAY_CH1_PIN, RELAY_OFF);
  digitalWrite(RELAY_CH2_PIN, RELAY_OFF);
  ch1_state = false;
  ch2_state = false;
  Serial.println("Relay control initialized");
  Serial.printf("  Channel 1: GPIO %d\n", RELAY_CH1_PIN);
  Serial.printf("  Channel 2: GPIO %d\n", RELAY_CH2_PIN);
}

void RelayControl::setChannel1(bool state) {
  digitalWrite(RELAY_CH1_PIN, state ? RELAY_ON : RELAY_OFF);
  ch1_state = state;
  Serial.printf("Relay CH1: %s\n", state ? "ON" : "OFF");
}

void RelayControl::setChannel2(bool state) {
  digitalWrite(RELAY_CH2_PIN, state ? RELAY_ON : RELAY_OFF);
  ch2_state = state;
  Serial.printf("Relay CH2: %s\n", state ? "ON" : "OFF");
}

bool RelayControl::getChannel1State() {
  return ch1_state;
}

bool RelayControl::getChannel2State() {
  return ch2_state;
}

void RelayControl::toggleChannel1() {
  setChannel1(!ch1_state);
}

void RelayControl::toggleChannel2() {
  setChannel2(!ch2_state);
}

void RelayControl::allOff() {
  setChannel1(false);
  setChannel2(false);
  Serial.println("All relays OFF");
}

void RelayControl::allOn() {
  setChannel1(true);
  setChannel2(true);
  Serial.println("All relays ON");
}

#endif // RELAY_CONTROL_H






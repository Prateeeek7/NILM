#ifndef INA219_H
#define INA219_H

#include <Wire.h>

// INA219 Register Addresses
#define INA219_REG_CONFIG          (0x00)
#define INA219_REG_SHUNTVOLTAGE     (0x01)
#define INA219_REG_BUSVOLTAGE       (0x02)
#define INA219_REG_POWER            (0x03)
#define INA219_REG_CURRENT          (0x04)
#define INA219_REG_CALIBRATION      (0x05)

// INA219 Configuration Register Bits
#define INA219_CONFIG_RESET         (0x8000)
#define INA219_CONFIG_BVOLTAGERANGE_MASK (0x2000)
#define INA219_CONFIG_BVOLTAGERANGE_16V (0x0000)
#define INA219_CONFIG_BVOLTAGERANGE_32V (0x2000)
#define INA219_CONFIG_GAIN_MASK     (0x1800)
#define INA219_CONFIG_GAIN_1_40MV   (0x0000)
#define INA219_CONFIG_GAIN_2_80MV   (0x0800)
#define INA219_CONFIG_GAIN_4_160MV  (0x1000)
#define INA219_CONFIG_GAIN_8_320MV  (0x1800)
#define INA219_CONFIG_BADCRES_MASK  (0x0780)
#define INA219_CONFIG_BADCRES_9BIT  (0x0000)
#define INA219_CONFIG_BADCRES_10BIT (0x0080)
#define INA219_CONFIG_BADCRES_11BIT (0x0100)
#define INA219_CONFIG_BADCRES_12BIT (0x0180)
#define INA219_CONFIG_SADCRES_MASK  (0x0078)
#define INA219_CONFIG_SADCRES_9BIT_1S (0x0000)
#define INA219_CONFIG_SADCRES_10BIT_1S (0x0008)
#define INA219_CONFIG_SADCRES_11BIT_1S (0x0010)
#define INA219_CONFIG_SADCRES_12BIT_1S (0x0018)
#define INA219_CONFIG_MODE_MASK     (0x0007)
#define INA219_CONFIG_MODE_POWERDOWN (0x0000)
#define INA219_CONFIG_MODE_SVOLT_TRIGGERED (0x0001)
#define INA219_CONFIG_MODE_BVOLT_TRIGGERED (0x0002)
#define INA219_CONFIG_MODE_SANDBVOLT_TRIGGERED (0x0003)
#define INA219_CONFIG_MODE_ADCOFF (0x0004)
#define INA219_CONFIG_MODE_SVOLT_CONTINUOUS (0x0005)
#define INA219_CONFIG_MODE_BVOLT_CONTINUOUS (0x0006)
#define INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS (0x0007)

class INA219 {
public:
  INA219(uint8_t address = 0x40);
  bool begin();
  void setCalibration_32V_2A();
  void setCalibration_32V_1A();
  void setCalibration_16V_400mA();
  float getBusVoltage_V();
  float getShuntVoltage_mV();
  float getCurrent_mA();
  float getPower_mW();

private:
  uint8_t _address;
  uint16_t _calValue;
  float _currentLSB;
  float _powerLSB;
  
  uint16_t readRegister(uint8_t reg);
  void writeRegister(uint8_t reg, uint16_t value);
};

INA219::INA219(uint8_t address) {
  _address = address;
  _calValue = 4096;
  _currentLSB = 0.001;  // 1mA per bit
  _powerLSB = 0.002;    // 2mW per bit
}

bool INA219::begin() {
  // Note: Wire.begin() should be called in main setup() before calling this
  // Don't call Wire.begin() here to avoid "Bus already started" warning
  delay(10);
  
  // Reset the INA219
  writeRegister(INA219_REG_CONFIG, INA219_CONFIG_RESET);
  delay(10);
  
  // Check if device responds
  uint16_t config = readRegister(INA219_REG_CONFIG);
  if (config == 0xFFFF || config == 0x0000) {
    return false;
  }
  
  return true;
}

void INA219::setCalibration_32V_2A() {
  _calValue = 4096;
  _currentLSB = 0.1;  // 100mA per bit for 2A max
  _powerLSB = 0.2;    // 200mW per bit
  
  uint16_t config = INA219_CONFIG_BVOLTAGERANGE_32V |
                    INA219_CONFIG_GAIN_8_320MV |
                    INA219_CONFIG_BADCRES_12BIT |
                    INA219_CONFIG_SADCRES_12BIT_1S |
                    INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS;
  
  writeRegister(INA219_REG_CONFIG, config);
  writeRegister(INA219_REG_CALIBRATION, _calValue);
}

void INA219::setCalibration_32V_1A() {
  _calValue = 10240;
  _currentLSB = 0.05;  // 50mA per bit for 1A max
  _powerLSB = 0.1;     // 100mW per bit
  
  uint16_t config = INA219_CONFIG_BVOLTAGERANGE_32V |
                    INA219_CONFIG_GAIN_8_320MV |
                    INA219_CONFIG_BADCRES_12BIT |
                    INA219_CONFIG_SADCRES_12BIT_1S |
                    INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS;
  
  writeRegister(INA219_REG_CONFIG, config);
  writeRegister(INA219_REG_CALIBRATION, _calValue);
}

void INA219::setCalibration_16V_400mA() {
  _calValue = 8192;
  _currentLSB = 0.01;  // 10mA per bit for 400mA max
  _powerLSB = 0.02;    // 20mW per bit
  
  uint16_t config = INA219_CONFIG_BVOLTAGERANGE_16V |
                    INA219_CONFIG_GAIN_1_40MV |
                    INA219_CONFIG_BADCRES_12BIT |
                    INA219_CONFIG_SADCRES_12BIT_1S |
                    INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS;
  
  writeRegister(INA219_REG_CONFIG, config);
  writeRegister(INA219_REG_CALIBRATION, _calValue);
}

float INA219::getBusVoltage_V() {
  uint16_t value = readRegister(INA219_REG_BUSVOLTAGE);
  return (float)((value >> 3) * 4) / 1000.0;  // Convert to volts
}

float INA219::getShuntVoltage_mV() {
  uint16_t value = readRegister(INA219_REG_SHUNTVOLTAGE);
  int16_t signedValue = (int16_t)value;
  return signedValue * 0.01;  // Convert to mV
}

float INA219::getCurrent_mA() {
  int16_t value = (int16_t)readRegister(INA219_REG_CURRENT);
  return value * _currentLSB;
}

float INA219::getPower_mW() {
  uint16_t value = readRegister(INA219_REG_POWER);
  return value * _powerLSB;
}

uint16_t INA219::readRegister(uint8_t reg) {
  Wire.beginTransmission(_address);
  Wire.write(reg);
  Wire.endTransmission();
  
  Wire.requestFrom(_address, (uint8_t)2);
  uint16_t value = ((uint16_t)Wire.read() << 8) | Wire.read();
  return value;
}

void INA219::writeRegister(uint8_t reg, uint16_t value) {
  Wire.beginTransmission(_address);
  Wire.write(reg);
  Wire.write((value >> 8) & 0xFF);
  Wire.write(value & 0xFF);
  Wire.endTransmission();
}

#endif


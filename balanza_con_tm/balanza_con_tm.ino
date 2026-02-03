#include "HX711.h"
#include <TM1637Display.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <RTClib.h>
#include <Keypad.h>
#include "SPIFFS.h"
#include <WiFi.h>
#include <WebServer.h>

#define DT 15
#define SCK 21
#define DIO 4
#define CLK 5

#define SDA_PIN 18
#define SCL_PIN 19

#define BUZZER 23
#define LED_OK 16
#define LED_ERR 17

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define ROWS 4
#define COLS 4

const char* ssid = "Balanza";
const char* password = "12345678";

WebServer server(80);

char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

byte rowP[ROWS] = {13, 12, 14, 27};
byte colP[COLS] = {26, 25, 33, 32};

Keypad keypad = Keypad(makeKeymap(keys), rowP, colP, ROWS, COLS);

HX711 scale;
TM1637Display display(CLK, DIO);
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
RTC_DS3231 rtc;

float calibration_factor = 3291.459961;
String code = "";

float samples[10];
int idx = 0;
bool filled = false;
float grams = 0;

unsigned long lastOLED = 0;
unsigned long msgUntil = 0;
bool showMsg = false;
String msgText = "";

void beep(int f, int d) {
  tone(BUZZER, f, d);
  delay(d);
  noTone(BUZZER);
  digitalWrite(BUZZER, LOW);
}

void handleRoot() {
  if (!SPIFFS.exists("/registros.json")) {
    server.send(200, "application/json", "[]");
    return;
  }

  File f = SPIFFS.open("/registros.json", FILE_READ);
  String content = "[\n";
  while (f.available()) {
    content += f.readStringUntil('\n');
    content += ",\n";
  }
  f.close();

  content.remove(content.length() - 2);
  content += "\n]";
  server.send(200, "application/json", content);
}

void saveRecord() {
  DateTime now = rtc.now();

  int hour = now.hour();
  bool pm = hour >= 12;
  if (hour == 0) hour = 12;
  else if (hour > 12) hour -= 12;

  char date[11], time[6];
  sprintf(date, "%02d/%02d/%04d", now.day(), now.month(), now.year());
  sprintf(time, "%02d:%02d", hour, now.minute());

  File f = SPIFFS.open("/registros.json", FILE_APPEND);
  if (f) {
    f.printf("{\"codigo\":\"%s\",\"peso\":%.2f,\"fecha\":\"%s\",\"hora\":\"%s\",\"turno\":\"%s\"}\n",
             code.c_str(), grams, date, time, pm ? "pm" : "am");
    f.close();
  }

  digitalWrite(LED_OK, HIGH);
  beep(2000, 120);
  msgText = "REGISTRO GUARDADO";
  msgUntil = millis() + 2000;
  showMsg = true;
  code = "";
}

void errorPeso() {
  digitalWrite(LED_ERR, HIGH);
  beep(400, 300);
  msgText = "COLOQUE PESO\nEN LA BALANZA";
  msgUntil = millis() + 2000;
  showMsg = true;
}

void setup() {
  Serial.begin(115200);

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  pinMode(LED_OK, OUTPUT);
  pinMode(LED_ERR, OUTPUT);

  SPIFFS.begin(true);

  WiFi.softAP(ssid, password);
  server.on("/", handleRoot);
  server.begin();

  scale.begin(DT, SCK);
  scale.set_scale(calibration_factor);
  scale.tare(50);

  display.setBrightness(7);

  Wire.begin(SDA_PIN, SCL_PIN);
  oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  oled.clearDisplay();
  oled.display();

  rtc.begin();
}

void loop() {

  server.handleClient();

  if (scale.is_ready()) {
    samples[idx++] = scale.get_units(1);
    if (idx >= 10) {
      idx = 0;
      filled = true;
    }
    if (filled) {
      float sum = 0;
      for (int i = 0; i < 10; i++) sum += samples[i];
      grams = sum / 10.0;
      if (grams < 0) grams = 0;

      int shown = (int)grams;
      if (shown > 9999) shown = 9999;
      display.showNumberDec(shown, true);
    }
  }

  char key = keypad.getKey();
  if (key) {
    if (key == '*') {
      if (code.length() > 0) {
        code.remove(code.length() - 1);
        beep(1500, 80);
      }
    } else if (key >= '0' && key <= '9') {
      if (code.length() < 6) {
        code += key;
        beep(1800, 80);
      }
    } else if (key == 'A') {
      if (grams > 0) saveRecord();
      else errorPeso();
    }
  }

  if (showMsg && millis() > msgUntil) {
    showMsg = false;
    digitalWrite(LED_OK, LOW);
    digitalWrite(LED_ERR, LOW);
  }

  if (millis() - lastOLED >= 300) {
    lastOLED = millis();

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    if (showMsg) {
      oled.setTextSize(1);
      oled.setCursor(10, 28);
      oled.println(msgText);
      oled.display();
      return;
    }

    DateTime now = rtc.now();
    int hour = now.hour();
    bool pm = hour >= 12;
    if (hour == 0) hour = 12;
    else if (hour > 12) hour -= 12;

    char datetime[25];
    sprintf(datetime, "%02d/%02d/%04d  %02d:%02d %s",
            now.day(), now.month(), now.year(),
            hour, now.minute(),
            pm ? "pm" : "am");

    oled.setTextSize(1);
    oled.setCursor(0, 0);
    oled.println(datetime);

    oled.drawLine(0, 16, 127, 16, SSD1306_WHITE);

    oled.setCursor(0, 22);
    oled.println("Codigo:");

    oled.setTextSize(3);
    oled.setCursor(10, 34);
    oled.println(code);

    oled.display();
  }
}

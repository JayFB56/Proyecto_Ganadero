#include "HX711.h"
#include <TM1637Display.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <RTClib.h>
#include <Keypad.h>
#include "SPIFFS.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

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

// CONFIGURACIÓN WIFI Y FIREBASE
const char* ssid = "THELAPTOP";           // CAMBIAR: Nombre de tu WiFi
const char* password = "12345678";   // CAMBIAR: Contraseña de tu WiFi
const char* firebase_host = "https://lechefacil-22cf0-default-rtdb.firebaseio.com/"; // CAMBIAR: Tu URL Firebase
const char* firebase_secret = "YPA0OWn7ARdlyFZP42WEo40FdGiYDz060MgkTk1e"; // CAMBIAR: Tu Secret de Firebase (opcional, usa reglas en su lugar)

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
bool wifiConnected = false;

void beep(int f, int d) {
  tone(BUZZER, f, d);
  delay(d);
  noTone(BUZZER);
  digitalWrite(BUZZER, LOW);
}

void sendToFirebase(String codigo, float peso, String fecha, String hora, String turno) {
  if (!wifiConnected) {
    msgText = "NO HAY WIFI";
    msgUntil = millis() + 2000;
    showMsg = true;
    return;
  }

  HTTPClient http;
  
  // Crear JSON con los datos
  StaticJsonDocument<256> doc;
  doc["codigo"] = codigo;
  doc["peso"] = peso;
  doc["fecha"] = fecha;
  doc["hora"] = hora;
  doc["turno"] = turno;
  doc["timestamp"] = millis();

  String jsonString;
  serializeJson(doc, jsonString);

  // URL del endpoint de Firebase (Realtime DB)
  String url = String(firebase_host) + "/registros.json";
  
  Serial.println("[FIREBASE] Enviando: " + jsonString);
  Serial.println("[FIREBASE] URL: " + url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonString);
  
  if (httpCode > 0) {
    Serial.println("[FIREBASE] Response code: " + String(httpCode));
    if (httpCode == 200 || httpCode == 201) {
      digitalWrite(LED_OK, HIGH);
      beep(2000, 120);
      msgText = "ENVIADO A NUBE";
    } else {
      digitalWrite(LED_ERR, HIGH);
      beep(400, 300);
      msgText = "ERROR NUBE: " + String(httpCode);
    }
  } else {
    Serial.println("[FIREBASE] Error: " + http.errorToString(httpCode));
    digitalWrite(LED_ERR, HIGH);
    beep(400, 300);
    msgText = "ERROR CONEXION";
  }
  
  http.end();
  msgUntil = millis() + 2000;
  showMsg = true;
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

  // Enviar directamente a Firebase (sin guardar localmente)
  sendToFirebase(code, grams, String(date), String(time), pm ? "pm" : "am");

  code = "";
}

void errorPeso() {
  digitalWrite(LED_ERR, HIGH);
  beep(400, 300);
  msgText = "COLOQUE PESO \nEN LA BALANZA";
  msgUntil = millis() + 2000;
  showMsg = true;
}

void setup() {
  Serial.begin(115200);

  pinMode(BUZZER, OUTPUT);
  digitalWrite(BUZZER, LOW);

  pinMode(LED_OK, OUTPUT);
  pinMode(LED_ERR, OUTPUT);

  // Inicializar WiFi (conectarse a red existente)
  Serial.println("\n\n[SETUP] Iniciando WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Conectado!");
    Serial.println("[WIFI] IP: " + WiFi.localIP().toString());
    wifiConnected = true;
  } else {
    Serial.println("\n[WIFI] No se pudo conectar. Verifica SSID y password.");
    wifiConnected = false;
  }

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
  // Verificar conexión WiFi periódicamente
  if (WiFi.status() != WL_CONNECTED && !wifiConnected) {
    wifiConnected = false;
  } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
    wifiConnected = true;
    Serial.println("[WIFI] Reconectado!");
  }

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
    
    // Mostrar estado WiFi
    oled.setTextSize(1);
    oled.setCursor(100, 0);
    oled.println(wifiConnected ? "ON" : "OFF");

    oled.display();
  }
}

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <RTClib.h>
#include <HX711.h>
#include <Keypad.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

// ---------- CONFIGURACIÓN ----------
float factor_calibracion = 17100.90;

#define DOUT 15
#define SCK 5
#define OLED_SDA 18
#define OLED_SCL 19
#define RTC_SDA 21
#define RTC_SCL 22
#define LED_CHECK 16
#define LED_ERROR 17
#define BUZZER 23

#define REG_FILE "/registros.json"

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HX711 scale;
RTC_DS3231 rtc;
WebServer server(80);

// ---------- KEYPAD ----------
const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowP[ROWS] = {13, 12, 14, 27};
byte colP[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowP, colP, ROWS, COLS);

// ---------- VARIABLES ----------
String codigo = "";
float pesoLB = 0.0;
unsigned long mensajeTimer = 0;

// ---------- UTILIDADES ----------
void addCORS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void initFS() {
  if (!LittleFS.begin(true)) {
    Serial.println("Error LittleFS");
    return;
  }

  if (!LittleFS.exists(REG_FILE)) {
    File f = LittleFS.open(REG_FILE, "w");
    f.print("[]");
    f.close();
  }
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);

  pinMode(LED_CHECK, OUTPUT);
  pinMode(LED_ERROR, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  initFS();

  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  Wire1.begin(RTC_SDA, RTC_SCL);
  rtc.begin(&Wire1);

  scale.begin(DOUT, SCK);
  scale.set_scale(factor_calibracion);
  scale.tare();

  WiFi.softAP("Balanza", "12345678");

  // ---------- ENDPOINTS ----------

  server.on("/data", HTTP_OPTIONS, [](){
    addCORS();
    server.send(204);
  });

  server.on("/data", HTTP_GET, [](){
    addCORS();
    File f = LittleFS.open(REG_FILE, "r");
    server.streamFile(f, "application/json");
    f.close();
  });

  server.on("/confirmar", HTTP_OPTIONS, [](){
    addCORS();
    server.send(204);
  });

  server.on("/confirmar", HTTP_GET, [](){
    addCORS();
    LittleFS.remove(REG_FILE);
    File f = LittleFS.open(REG_FILE, "w");
    f.print("[]");
    f.close();
    server.send(200, "text/plain", "OK");
  });

  server.begin();
  Serial.println("Servidor activo en http://192.168.4.1");

  actualizarPantalla("");
}

// ---------- LOOP ----------
void loop() {
  server.handleClient();

  if (scale.is_ready()) {
    pesoLB = scale.get_units(1) * 2.20462;
  }

  if (mensajeTimer > 0 && millis() > mensajeTimer) {
    mensajeTimer = 0;
    actualizarPantalla("");
  }

  char key = keypad.getKey();
  if (!key) return;

  if (isdigit(key) && codigo.length() < 6) {
    codigo += key;
    tone(BUZZER, 1000, 50);
  } 
  else if (key == '*') {
    codigo = "";
  } 
  else if (key == 'A') {
    guardarRegistro();
  }
}

// ---------- DISPLAY ----------
void actualizarPantalla(String msg) {
  display.clearDisplay();
  display.setTextColor(WHITE);

  DateTime now = rtc.now();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("%02d/%02d %02d:%02d",
    now.day(), now.month(), now.hour(), now.minute());

  display.drawLine(0, 12, 128, 12, WHITE);

  display.setTextSize(2);
  display.setCursor(0, 24);
  display.print(msg != "" ? msg : codigo);

  display.display();
}

// ---------- GUARDAR REGISTRO ----------
void guardarRegistro() {
  if (codigo == "") return;

  File f = LittleFS.open(REG_FILE, "r");
  DynamicJsonDocument doc(4096);
  deserializeJson(doc, f);
  f.close();

  JsonArray arr = doc.as<JsonArray>();

  DateTime now = rtc.now();
  JsonObject reg = arr.createNestedObject();

  reg["codigo"] = codigo;
  reg["peso_lb"] = round(pesoLB * 100) / 100.0;
  reg["fecha"] = String(now.day()) + "/" + String(now.month()) + "/" + String(now.year());
  reg["hora"] = String(now.hour()) + ":" + String(now.minute());
  reg["turno"] = now.hour() < 12 ? "AM" : "PM";
  reg["sync"] = false;

  f = LittleFS.open(REG_FILE, "w");
  serializeJson(doc, f);
  f.close();

  codigo = "";
  tone(BUZZER, 1500, 150);
  actualizarPantalla("GUARDADO");
  mensajeTimer = millis() + 1500;
}

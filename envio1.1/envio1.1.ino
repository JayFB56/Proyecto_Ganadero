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
#include "time.h" // Librería nativa para servidores NTP

// ---------- CONFIGURACIÓN ----------
float factor_calibracion = -435000.0;

#define DOUT 15
#define SCK 5
#define OLED_SDA 18
#define OLED_SCL 19
#define RTC_SDA 21
#define RTC_SCL 22
#define LED_CHECK 16
#define LED_ERROR 17
#define BUZZER 23

// Configuración Servidor de Tiempo (NTP)
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = -18000; // Ajuste para tu zona horaria (Ej: -18000 para GMT-5)
const int   daylightOffset_sec = 0;

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define REG_FILE "/registros.json"

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
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
    digitalWrite(LED_ERROR, HIGH);
    return;
  }
  if (!LittleFS.exists(REG_FILE)) {
    File f = LittleFS.open(REG_FILE, "w");
    f.print("[]");
    f.close();
  }
}

// Sincronizar RTC con servidor de internet
void sincronizarHoraNTP() {
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
    Serial.println("RTC Sincronizado con NTP");
  }
}

void actualizarPantalla(String msg);
void guardarRegistro();

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  pinMode(LED_CHECK, OUTPUT);
  pinMode(LED_ERROR, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  initFS();

  // Iniciar OLED en pines 18 y 19 (Confirmado funcional)
  Wire.begin(OLED_SDA, OLED_SCL);
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    for(;;); 
  }
  display.clearDisplay();
  display.display();

  // Iniciar RTC
  Wire1.begin(RTC_SDA, RTC_SCL);
  if (!rtc.begin(&Wire1)) {
    digitalWrite(LED_ERROR, HIGH);
  }

  scale.begin(DOUT, SCK);
  scale.set_scale(factor_calibracion);
  scale.tare();

  // Configuración WiFi (Modo AP + Intento de conexión para NTP)
  WiFi.softAP("Balanza_OLED", "12345678");
  
  // Opcional: Si quieres que sincronice hora, debe conectarse a un WiFi real
  // WiFi.begin("TU_SSID", "TU_PASSWORD"); 
  
  sincronizarHoraNTP();

  // Endpoints del servidor
  server.on("/data", HTTP_OPTIONS, [](){ addCORS(); server.send(204); });
  server.on("/data", HTTP_GET, [](){
    addCORS();
    File f = LittleFS.open(REG_FILE, "r");
    server.streamFile(f, "application/json");
    f.close();
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
  actualizarPantalla("");
}

// ---------- LOOP ----------
void loop() {
  server.handleClient();

  if (scale.is_ready()) {
    pesoLB = scale.get_units(1) * 2.20462;
    if (pesoLB < 0) pesoLB = 0.0; // Evitar pesos negativos por deriva
  }

  if (mensajeTimer > 0) {
    if (millis() > mensajeTimer) {
      mensajeTimer = 0;
      actualizarPantalla(""); 
    }
  } else {
    actualizarPantalla("");
  }

  char key = keypad.getKey();
  if (key) {
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
}

// ---------- DISPLAY OLED 0.96 (Amarillo/Azul) ----------
void actualizarPantalla(String msg) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // ZONA AMARILLA (0-15)
  DateTime now = rtc.now();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("%02d/%02d/%04d", now.day(), now.month(), now.year());
  display.setCursor(85, 0);
  display.printf("%02d:%02d", now.hour(), now.minute());

  display.drawLine(0, 14, 128, 14, SSD1306_WHITE);

  // ZONA AZUL (16-64)
  if (msg != "") {
    display.setTextSize(2);
    display.setCursor(10, 30);
    display.print(msg);
  } 
  else {
    // Peso grande
    display.setTextSize(2);
    display.setCursor(0, 20);
    display.print(pesoLB, 2);
    display.setTextSize(1);
    display.print(" lb");

    // Código abajo
    display.setCursor(0, 48);
    display.print("COD: ");
    display.setTextSize(2);
    display.print(codigo == "" ? "------" : codigo);
  }

  display.display();
}

// ---------- GUARDAR REGISTRO ----------
void guardarRegistro() {
  if (codigo == "") return;

  File f = LittleFS.open(REG_FILE, "r");
  if (!f) return;

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
  reg["sync"] = false;

  f = LittleFS.open(REG_FILE, "w");
  if (f) {
    serializeJson(doc, f);
    f.close();
  }

  codigo = "";
  digitalWrite(LED_CHECK, HIGH);
  tone(BUZZER, 1500, 200);
  actualizarPantalla("GUARDADO");
  mensajeTimer = millis() + 1500;
  
  // El delay de 1.5s se maneja con el timer para no bloquear el servidor
  delay(200); 
  digitalWrite(LED_CHECK, LOW);
}
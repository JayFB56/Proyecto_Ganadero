#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "RTClib.h"
#include "HX711.h"
#include <Keypad.h>
#include "LittleFS.h"

// --- CONFIGURACIÓN ---
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

Adafruit_SSD1306 display(128, 64, &Wire, -1);
HX711 scale;
RTC_DS3231 rtc;
WebServer server(80);

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};
byte rowP[ROWS] = {13, 12, 14, 27}, colP[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowP, colP, ROWS, COLS);

String codigo = "";
float pesoLB = 0.0;
unsigned long mensajeTimer = 0;

void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_CHECK, OUTPUT); 
  pinMode(LED_ERROR, OUTPUT); 
  pinMode(BUZZER, OUTPUT);

  if(!LittleFS.begin(true)) Serial.println("FS Error");
  
  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  
  Wire1.begin(RTC_SDA, RTC_SCL);
  rtc.begin(&Wire1);

  scale.begin(DOUT, SCK);
  scale.set_scale(factor_calibracion);
  scale.tare();

  WiFi.softAP("Balanza", "12345678");

  // --- RUTAS CON CORS ---

  // OPTIONS (preflight) handler para /data
  server.on("/data", HTTP_OPTIONS, [](){
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  // GET /data -> stream CSV con header CORS
  server.on("/data", HTTP_GET, [](){
    server.sendHeader("Access-Control-Allow-Origin", "*");
    File f = LittleFS.open("/registros.csv", "r");
    if(f) { 
      // opcional: enviar header adicional
      server.sendHeader("Content-Type", "text/csv");
      server.streamFile(f, "text/csv"); 
      f.close(); 
    } else {
      server.send(404, "text/plain", "Vacio");
    }
  });

  // OPTIONS (preflight) handler para /confirmar
  server.on("/confirmar", HTTP_OPTIONS, [](){
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  // GET /confirmar -> borra archivo y notifica con header CORS
  server.on("/confirmar", HTTP_GET, [](){
    server.sendHeader("Access-Control-Allow-Origin", "*");
    if(LittleFS.remove("/registros.csv")) {
      server.send(200, "text/plain", "OK");
      // --- LÓGICA DE CONFIRMACIÓN ---
      digitalWrite(LED_CHECK, HIGH);
      tone(BUZZER, 2000, 600); // Tono
      codigo = "";
      actualizarPantalla("DATOS ENVIADOS");
      mensajeTimer = millis() + 3000; // Mantiene el mensaje 3 seg
      delay(600);
      digitalWrite(LED_CHECK, LOW);
    } else {
      server.send(404, "text/plain", "No encontrado");
    }
  });

  // Opcional: responder a cualquier otra ruta con CORS para depuración
  server.onNotFound([](){
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(404, "text/plain", "Not found");
  });

  server.begin();
  Serial.println("Server started. IP: 192.168.4.1");
  actualizarPantalla("");
}

void loop() {
  server.handleClient();

  if (scale.is_ready()) {
    pesoLB = scale.get_units(1) * 2.20462;
  }

  // Limpiar mensajes temporales (Guardado, Enviado)
  if (mensajeTimer > 0 && millis() > mensajeTimer) {
    mensajeTimer = 0;
    actualizarPantalla("");
  }

  char key = keypad.getKey();
  if (key) {
    if (isdigit(key) && codigo.length() < 6) {
      codigo += key;
      tone(BUZZER, 1000, 50);
      actualizarPantalla("");
    } 
    else if (key == '*') {
      codigo = "";
      tone(BUZZER, 800, 100);
      actualizarPantalla("");
    } 
    else if (key == 'A') {
      guardarRegistro();
    }
    else if (key == 'B') {
      if (LittleFS.exists("/registros.csv")) {
        Serial.println("MODO ENVIO ACTIVADO - Esperando confirmación desde la app");
        tone(BUZZER, 1200, 200);
      } else {
        Serial.println("SIN DATOS PARA ENVIAR");
        tone(BUZZER, 300, 500);
      }
    }
  }
}

void actualizarPantalla(String statusMsg) {
  display.clearDisplay();
  display.setTextColor(WHITE);
  DateTime now = rtc.now();

  // Barra superior
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.printf("%02d/%02d %02d:%02d", now.day(), now.month(), now.hour(), now.minute());
  
  display.setCursor(0, 12);
  display.print("A.Codigo");
  
  display.drawLine(0, 22, 128, 22, WHITE);

  if (statusMsg != "") {
    display.setTextSize(1);
    display.setCursor(0, 35);
    display.print(statusMsg);
  } else {
    display.setTextSize(4);
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(codigo, 0, 0, &x1, &y1, &w, &h);
    display.setCursor((128 - w) / 2, 30);
    display.print(codigo);
  }

  display.display();
}

void guardarRegistro() {
  if (codigo == "") return;

  DateTime now = rtc.now();
  String turno = (now.hour() < 12) ? "AM" : "PM";
  String data = codigo + "," + String(pesoLB, 2) + "," + 
                String(now.day()) + "/" + String(now.month()) + "/" + String(now.year()) + "," + turno + "\n";

  File f = LittleFS.open("/registros.csv", "a");
  if (f) {
    f.print(data);
    f.close();
    digitalWrite(LED_CHECK, HIGH);
    tone(BUZZER, 1500, 100); delay(100); tone(BUZZER, 2000, 150);
    codigo = "";
    actualizarPantalla("GUARDADO OK");
    mensajeTimer = millis() + 1500;
    digitalWrite(LED_CHECK, LOW);
  }
}
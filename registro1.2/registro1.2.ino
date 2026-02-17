#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <Keypad.h>
#include <ArduinoJson.h>
#include "SPIFFS.h"
#include <time.h>
#include <rom/rtc.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define BUZZER 23
#define LED 16

LiquidCrystal_I2C lcd(0x27, 20, 4);
RTC_DS3231 rtc;
WebServer server(80);

String ssid_ap = "Balanza";
String pass_ap = "12345678";
String ssid_sta = "ASOSERLISER";
String pass_sta = "Damian20";
String labelCodigo = "CODIGO:";
String labelPeso = "PESO:";
String codigo = "";
String peso = "";
uint8_t estado = 0; 
uint32_t idActual = 1;
bool rtcDisponible = false;
unsigned long ultimoRefresco = 0;
bool requiereRefresco = true;

const byte FILAS = 4;
const byte COLUMNAS = 4;
char teclas[FILAS][COLUMNAS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte pinesFilas[FILAS] = {13, 12, 14, 27};
byte pinesColumnas[COLUMNAS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(teclas), pinesFilas, pinesColumnas, FILAS, COLUMNAS);

void cargarConfiguracion() {
  if (SPIFFS.exists("/config.json")) {
    File file = SPIFFS.open("/config.json", FILE_READ);
    DynamicJsonDocument doc(512);
    if (!deserializeJson(doc, file)) {
      ssid_ap = doc["ap_ssid"].as<String>();
      pass_ap = doc["ap_pass"].as<String>();
      ssid_sta = doc["sta_ssid"].as<String>();
      pass_sta = doc["sta_pass"].as<String>();
      labelCodigo = doc["lbl_codigo"].as<String>();
      labelPeso = doc["lbl_peso"].as<String>();
    }
    file.close();
  }
}

void guardarConfiguracion() {
  DynamicJsonDocument doc(512);
  doc["ap_ssid"] = ssid_ap; doc["ap_pass"] = pass_ap;
  doc["sta_ssid"] = ssid_sta; doc["sta_pass"] = pass_sta;
  doc["lbl_codigo"] = labelCodigo; doc["lbl_peso"] = labelPeso;
  File file = SPIFFS.open("/config.json", FILE_WRITE);
  serializeJson(doc, file); file.close();
}

void sincronizarRTCFisico() {
  if (rtcDisponible) {
    struct tm timeinfo;
    if (getLocalTime(&timeinfo)) {
      rtc.adjust(DateTime(timeinfo.tm_year + 1900, timeinfo.tm_mon + 1, timeinfo.tm_mday, timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec));
    }
  }
}

void handleConfigOrJSON() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
  if (server.method() == HTTP_OPTIONS) { server.send(204); return; }
  if (server.client().localIP() == WiFi.softAPIP()) {
    if (SPIFFS.exists("/registros.json")) {
      File file = SPIFFS.open("/registros.json", FILE_READ);
      server.streamFile(file, "application/json");
      file.close();
    } else { server.send(200, "application/json", "[]"); }
  } else if (WiFi.status() == WL_CONNECTED && server.client().localIP() == WiFi.localIP()) {
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Panel ESP32</title>";
    html += "<style>body{font-family:Arial; text-align:center; background:#f0f2f5; padding:10px;} .card{background:white; max-width:400px; margin:auto; padding:20px; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);} input{width:90%; padding:8px; margin:5px 0 15px 0; border:1px solid #ddd; border-radius:5px;} button{background:#007bff; color:white; border:none; padding:15px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;} h3{margin-bottom:5px; color:#333; font-size:16px; border-bottom:1px solid #eee; padding-bottom:5px;}</style></head><body>";
    html += "<div class='card'><h2>Configuración ESP32</h2>";
    html += "<h3>Textos en Pantalla</h3><label>Etiqueta Código:</label><br><input type='text' id='lc' value='" + labelCodigo + "'><label>Etiqueta Peso:</label><br><input type='text' id='lp' value='" + labelPeso + "'>";
    html += "<h3>Red Creada (AP)</h3><label>SSID:</label><br><input type='text' id='aps' value='" + ssid_ap + "'><label>Pass:</label><br><input type='text' id='app' value='" + pass_ap + "'>";
    html += "<h3>Conectar a WiFi (STA)</h3><label>SSID:</label><br><input type='text' id='stas' value='" + ssid_sta + "'><label>Pass:</label><br><input type='text' id='stap' value='" + pass_sta + "'>";
    html += "<h3>Fecha y Hora</h3><input type='datetime-local' id='dt' step='1'><br><button onclick='enviar()'>GUARDAR CAMBIOS</button></div>";
    html += "<script>function enviar(){ var lc=document.getElementById('lc').value; var lp=document.getElementById('lp').value; var aps=document.getElementById('aps').value; var app=document.getElementById('app').value; var stas=document.getElementById('stas').value; var stap=document.getElementById('stap').value; var dt=document.getElementById('dt').value; var qs = `?lc=${encodeURIComponent(lc)}&lp=${encodeURIComponent(lp)}&aps=${encodeURIComponent(aps)}&app=${encodeURIComponent(app)}&stas=${encodeURIComponent(stas)}&stap=${encodeURIComponent(stap)}&dt=${encodeURIComponent(dt)}`; fetch('/update' + qs).then(res=>res.text()).then(text=>{ if(text==='RESTART') { alert('Reiniciando...'); } else { alert('Actualizado'); } }); }</script></body></html>";
    server.send(200, "text/html", html);
  } else { server.send(403, "text/plain", "Acceso Denegado"); }
}

void handleUpdate() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  if (WiFi.status() == WL_CONNECTED && server.client().localIP() == WiFi.localIP()) {
    bool requiresRestart = false;
    if (server.hasArg("lc")) labelCodigo = server.arg("lc");
    if (server.hasArg("lp")) labelPeso = server.arg("lp");
    if (server.hasArg("aps") && server.arg("aps") != ssid_ap) { ssid_ap = server.arg("aps"); requiresRestart = true; }
    if (server.hasArg("app") && server.arg("app") != pass_ap) { pass_ap = server.arg("app"); requiresRestart = true; }
    if (server.hasArg("stas") && server.arg("stas") != ssid_sta) { ssid_sta = server.arg("stas"); requiresRestart = true; }
    if (server.hasArg("stap") && server.arg("stap") != pass_sta) { pass_sta = server.arg("stap"); requiresRestart = true; }
    guardarConfiguracion(); 
    if (server.hasArg("dt") && server.arg("dt").length() >= 16) {
      String dt = server.arg("dt"); 
      struct tm tm;
      tm.tm_year = dt.substring(0,4).toInt() - 1900;
      tm.tm_mon = dt.substring(5,7).toInt() - 1;
      tm.tm_mday = dt.substring(8,10).toInt();
      tm.tm_hour = dt.substring(11,13).toInt();
      tm.tm_min = dt.substring(14,16).toInt();
      tm.tm_sec = (dt.length() >= 19) ? dt.substring(17,19).toInt() : 0;
      struct timeval tv = { mktime(&tm), 0 };
      settimeofday(&tv, nullptr);
      sincronizarRTCFisico();
    }
    digitalWrite(LED, HIGH); delay(700); digitalWrite(LED, LOW);
    requiereRefresco = true; 
    if (requiresRestart) { server.send(200, "text/plain", "RESTART"); delay(1000); ESP.restart(); } 
    else { server.send(200, "text/plain", "OK"); }
  } else { server.send(403, "text/plain", "No autorizado"); }
}

void beep() { tone(BUZZER, 1000, 50); }

void actualizarLineaLCD(int fila, String label, String valor) {
  String linea = label + " " + valor;
  while (linea.length() < 20) linea += " ";
  lcd.setCursor(0, fila); lcd.print(linea.substring(0, 20));
}

void mostrarPantalla() {
  if (millis() - ultimoRefresco >= 1000 || requiereRefresco) {
    ultimoRefresco = millis(); requiereRefresco = false;
    char fechaStr[11], horaStr[9];
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10)) {
      sprintf(fechaStr, "%02d/%02d/%04d", timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900);
      sprintf(horaStr, "%02d:%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
    } else {
      strcpy(fechaStr, "01/01/2026"); strcpy(horaStr, "12:00:00");
    }
    lcd.setCursor(0,0); lcd.print(fechaStr); lcd.print(" "); lcd.print(horaStr);
    actualizarLineaLCD(1, labelCodigo, codigo);
    actualizarLineaLCD(2, labelPeso, peso);
  }
}

void guardarRegistro() {
  if (peso.length() == 0 || peso == ".") {
    for(int i=0; i<3; i++) { digitalWrite(LED, HIGH); delay(100); digitalWrite(LED, LOW); delay(100); }
    return;
  }
  char f[11], h[9];
  struct tm timeinfo;
  getLocalTime(&timeinfo);
  sprintf(f, "%02d/%02d/%04d", timeinfo.tm_mday, timeinfo.tm_mon + 1, timeinfo.tm_year + 1900);
  sprintf(h, "%02d:%02d:%02d", timeinfo.tm_hour, timeinfo.tm_min, timeinfo.tm_sec);
  String turno = (timeinfo.tm_hour < 12) ? "am" : "pm";
  DynamicJsonDocument doc(256);
  doc["id"] = idActual++; doc["codigo"] = codigo; doc["peso"] = peso; doc["fecha"] = f; doc["hora"] = h; doc["turno"] = turno;
  File file = SPIFFS.open("/registros.json", FILE_APPEND);
  if (file) { serializeJson(doc, file); file.println(); file.close(); }
  digitalWrite(LED, HIGH); beep();
  lcd.clear(); lcd.setCursor(4, 1); lcd.print("GUARDADO OK");
  delay(1500); digitalWrite(LED, LOW);
  codigo = ""; peso = ""; estado = 0; lcd.clear(); requiereRefresco = true;
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER, OUTPUT); pinMode(LED, OUTPUT);
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init(); lcd.backlight();
  SPIFFS.begin(true);

  if (rtc_get_reset_reason(0) == POWERON_RESET || rtc_get_reset_reason(0) == EXT_CPU_RESET) {
    if (SPIFFS.exists("/registros.json")) { SPIFFS.remove("/registros.json"); }
  }

  cargarConfiguracion();
  if (rtc.begin()) {
    rtcDisponible = true;
    DateTime now = rtc.now();
    struct tm tm;
    tm.tm_year = now.year() - 1900; tm.tm_mon = now.month() - 1; tm.tm_mday = now.day();
    tm.tm_hour = now.hour(); tm.tm_min = now.minute(); tm.tm_sec = now.second();
    struct timeval tv = { mktime(&tm), 0 };
    settimeofday(&tv, nullptr);
  }
  WiFi.softAP(ssid_ap.c_str(), pass_ap.c_str());
  WiFi.begin(ssid_sta.c_str(), pass_sta.c_str());
  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 5000) { delay(100); }
  if (WiFi.status() == WL_CONNECTED) {
    configTime(-18000, 0, "pool.ntp.org", "time.google.com");
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10000)) { sincronizarRTCFisico(); }
  }

  server.on("/", HTTP_GET, handleConfigOrJSON);
  server.on("/", HTTP_OPTIONS, handleConfigOrJSON);
  server.on("/json", HTTP_GET, handleConfigOrJSON);
  server.on("/json", HTTP_OPTIONS, handleConfigOrJSON);
  server.on("/data", HTTP_GET, handleConfigOrJSON);
  server.on("/data", HTTP_OPTIONS, handleConfigOrJSON);
  server.on("/data.json", HTTP_GET, handleConfigOrJSON);
  server.on("/data.json", HTTP_OPTIONS, handleConfigOrJSON);
  server.on("/registros.json", HTTP_GET, handleConfigOrJSON);
  server.on("/registros.json", HTTP_OPTIONS, handleConfigOrJSON);
  server.on("/update", HTTP_GET, handleUpdate);
  server.on("/update", HTTP_OPTIONS, handleUpdate);
  server.begin();
}

void loop() {
  server.handleClient();
  mostrarPantalla();
  char tecla = keypad.getKey();
  if (!tecla) return;
  beep(); requiereRefresco = true;
  if (estado == 0) {
    if (tecla >= '0' && tecla <= '9') codigo += tecla;
    else if (tecla == '#') { if (codigo.length() > 0) codigo.remove(codigo.length() - 1); }
    else if (tecla == 'A' && codigo.length() > 0) estado = 1;
  } else {
    if (tecla >= '0' && tecla <= '9') peso += tecla;
    else if (tecla == '*') { if (peso.indexOf('.') == -1) peso += '.'; }
    else if (tecla == '#') { if (peso.length() > 0) peso.remove(peso.length() - 1); }
    else if (tecla == 'A' && peso.length() > 0 && !peso.endsWith(".")) guardarRegistro();
  }
}
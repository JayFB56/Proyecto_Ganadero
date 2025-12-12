#include <WiFi.h>
#include <WebServer.h>
#include <Arduino_JSON.h>
#include <Keypad.h>
#include <EEPROM.h>

// --- CONFIGURACION DE PINES PARA MATRIZ 4x4 ---
const byte ROWS = 4;
const byte COLS = 4;

char hexaKeys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};

byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};

Keypad customKeypad = Keypad(makeKeymap(hexaKeys), rowPins, colPins, ROWS, COLS);

// --- CONFIGURACION WIFI ---
const char* ssid = "VacaData_AP";
const char* password = "12345678";
IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// --- CONFIGURACION EEPROM ---
#define EEPROM_SIZE 2048
#define EEPROM_WIFI_FLAG 0
#define EEPROM_COUNT_ADDR 1
#define EEPROM_DATA_START 10

// --- BASE DE DATOS DE VACAS ---
struct VacaInfo {
  int codigo;
  String nombre;
  String raza;
  int edad;
};

VacaInfo baseDatosVacas[7] = {
  {101, "Blanca", "Holstein", 4},
  {102, "Manchada", "Jersey", 3},
  {103, "Mimosa", "Angus", 5},
  {104, "Luna", "Hereford", 2},
  {105, "Estrella", "Guernsey", 4},
  {106, "Rosita", "Brahman", 3},
  {107, "Daisy", "Simmental", 6}
};

// --- REGISTROS DE PESO ---
struct RegistroPeso {
  int codigo_vaca;
  String nombre_vaca;
  float peso_lb;
  String fecha_hora;
  unsigned long timestamp;
};

std::vector<RegistroPeso> registros;
WebServer server(80);

// --- VARIABLES DE ESTADO ---
enum EstadoSistema {
  ESPERA_CODIGO,
  ESPERA_PESO,
  CONFIRMAR_WIFI,
  CONFIRMAR_BORRAR,
  WIFI_ACTIVO
};

EstadoSistema estadoActual = ESPERA_CODIGO;
String entradaCodigo = "";
String entradaPeso = "";
VacaInfo vacaActual;
bool wifiActivado = false;
unsigned long ultimaActualizacion = 0;

// --- DECLARACIONES DE FUNCIONES ---
void handleRoot();
void handleData();
void handleNotFound();
void procesarTeclado(char tecla);
void mostrarMenuPrincipal();
void buscarVacaPorCodigo(int codigo);
void guardarRegistro();
void activarWifi();
void borrarTodosRegistros();
void mostrarRegistrosSerial();
String obtenerFechaHora();
void guardarRegistrosEEPROM();
void cargarRegistrosEEPROM();
void guardarWifiEstado();
void cargarWifiEstado();

// --- FUNCIONES EEPROM ---
void guardarRegistrosEEPROM() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Guardar cantidad de registros
  int count = registros.size();
  EEPROM.write(EEPROM_COUNT_ADDR, count > 255 ? 255 : count);
  
  // Guardar cada registro
  int addr = EEPROM_DATA_START;
  for (int i = 0; i < count && i < 100; i++) {
    // Guardar codigo (2 bytes)
    EEPROM.write(addr++, (registros[i].codigo_vaca >> 8) & 0xFF);
    EEPROM.write(addr++, registros[i].codigo_vaca & 0xFF);
    
    // Guardar peso (4 bytes)
    float peso = registros[i].peso_lb;
    byte* pesoBytes = (byte*)&peso;
    for (int j = 0; j < 4; j++) {
      EEPROM.write(addr++, pesoBytes[j]);
    }
    
    // Guardar timestamp (4 bytes)
    unsigned long ts = registros[i].timestamp;
    byte* tsBytes = (byte*)&ts;
    for (int j = 0; j < 4; j++) {
      EEPROM.write(addr++, tsBytes[j]);
    }
  }
  
  EEPROM.commit();
  EEPROM.end();
  Serial.println("Registros guardados en EEPROM");
}

void cargarRegistrosEEPROM() {
  EEPROM.begin(EEPROM_SIZE);
  
  // Cargar cantidad de registros
  int count = EEPROM.read(EEPROM_COUNT_ADDR);
  if (count > 100) count = 0;
  
  registros.clear();
  
  // Cargar cada registro
  int addr = EEPROM_DATA_START;
  for (int i = 0; i < count; i++) {
    RegistroPeso reg;
    
    // Cargar codigo (2 bytes)
    reg.codigo_vaca = (EEPROM.read(addr++) << 8);
    reg.codigo_vaca |= EEPROM.read(addr++);
    
    // Cargar peso (4 bytes)
    float peso;
    byte* pesoBytes = (byte*)&peso;
    for (int j = 0; j < 4; j++) {
      pesoBytes[j] = EEPROM.read(addr++);
    }
    reg.peso_lb = peso;
    
    // Cargar timestamp (4 bytes)
    unsigned long ts;
    byte* tsBytes = (byte*)&ts;
    for (int j = 0; j < 4; j++) {
      tsBytes[j] = EEPROM.read(addr++);
    }
    reg.timestamp = ts;
    
    // Buscar nombre de la vaca
    for (int j = 0; j < 7; j++) {
      if (baseDatosVacas[j].codigo == reg.codigo_vaca) {
        reg.nombre_vaca = baseDatosVacas[j].nombre;
        break;
      }
    }
    
    // Generar fecha/hora
    unsigned long segundos = reg.timestamp / 1000;
    int horas = (segundos / 3600) % 24;
    int minutos = (segundos / 60) % 60;
    int seg = segundos % 60;
    char buffer[20];
    sprintf(buffer, "%02d:%02d:%02d", horas, minutos, seg);
    reg.fecha_hora = String(buffer);
    
    registros.push_back(reg);
  }
  
  EEPROM.end();
  Serial.print("Cargados ");
  Serial.print(registros.size());
  Serial.println(" registros de EEPROM");
}

void guardarWifiEstado() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.write(EEPROM_WIFI_FLAG, wifiActivado ? 1 : 0);
  EEPROM.commit();
  EEPROM.end();
}

void cargarWifiEstado() {
  EEPROM.begin(EEPROM_SIZE);
  wifiActivado = EEPROM.read(EEPROM_WIFI_FLAG) == 1;
  EEPROM.end();
}

// --- FUNCIONES DEL SERVIDOR WEB ---
void handleRoot() {
  server.send(200, "text/plain", "Servidor de Datos de Vacas. Usa /data para JSON");
}

void handleData() {
  JSONVar root;
  JSONVar jsonRegistros;

  for (size_t i = 0; i < registros.size(); ++i) {
    JSONVar registro;
    registro["codigo_vaca"] = registros[i].codigo_vaca;
    registro["nombre_vaca"] = registros[i].nombre_vaca.c_str();
    registro["peso_lb"] = String(registros[i].peso_lb, 2);
    registro["fecha_hora"] = registros[i].fecha_hora.c_str();
    registro["timestamp"] = (double)registros[i].timestamp;
    jsonRegistros[i] = registro;
  }

  root["wifi_activo"] = wifiActivado;
  root["total_registros"] = (int)registros.size();
  root["fecha_servidor"] = obtenerFechaHora().c_str();
  root["registros"] = jsonRegistros;

  String jsonString = JSON.stringify(root);
  server.send(200, "application/json", jsonString);
}

void handleNotFound() {
  String message = "404 - Pagina no encontrada\n\n";
  message += "URI: " + server.uri() + "\n";
  message += "Metodo: ";
  message += (server.method() == HTTP_GET ? "GET" : "POST");
  message += "\n";
  server.send(404, "text/plain", message);
}

// --- FUNCIONES DEL SISTEMA ---
void buscarVacaPorCodigo(int codigo) {
  for (int i = 0; i < 7; i++) {
    if (baseDatosVacas[i].codigo == codigo) {
      vacaActual = baseDatosVacas[i];
      Serial.println("\n=================================");
      Serial.println("VACA ENCONTRADA:");
      Serial.println("=================================");
      Serial.print("Codigo: "); Serial.println(vacaActual.codigo);
      Serial.print("Nombre: "); Serial.println(vacaActual.nombre);
      Serial.print("Raza: "); Serial.println(vacaActual.raza);
      Serial.print("Edad: "); Serial.print(vacaActual.edad); Serial.println(" años");
      Serial.println("=================================");
      return;
    }
  }
  
  Serial.println("\nERROR: Vaca no encontrada");
  Serial.println("Verifique el codigo e intente nuevamente");
  estadoActual = ESPERA_CODIGO;
  entradaCodigo = "";
}

void guardarRegistro() {
  if (entradaPeso.length() > 0) {
    float peso = entradaPeso.toFloat();
    
    RegistroPeso nuevoRegistro;
    nuevoRegistro.codigo_vaca = vacaActual.codigo;
    nuevoRegistro.nombre_vaca = vacaActual.nombre;
    nuevoRegistro.peso_lb = peso;
    nuevoRegistro.fecha_hora = obtenerFechaHora();
    nuevoRegistro.timestamp = millis();
    
    registros.push_back(nuevoRegistro);
    
    // Guardar en EEPROM
    guardarRegistrosEEPROM();
    
    Serial.println("\n=================================");
    Serial.println("REGISTRO GUARDADO EXITOSAMENTE");
    Serial.println("=================================");
    Serial.print("Vaca: "); Serial.println(vacaActual.nombre);
    Serial.print("Codigo: "); Serial.println(vacaActual.codigo);
    Serial.print("Peso registrado: "); Serial.print(peso, 2); Serial.println(" lb");
    Serial.print("Fecha: "); Serial.println(nuevoRegistro.fecha_hora);
    Serial.println("=================================\n");
  }
  
  // Resetear para nuevo registro
  estadoActual = ESPERA_CODIGO;
  entradaCodigo = "";
  entradaPeso = "";
}

void borrarTodosRegistros() {
  registros.clear();
  guardarRegistrosEEPROM();
  
  Serial.println("\n=================================");
  Serial.println("TODOS LOS REGISTROS BORRADOS");
  Serial.println("=================================\n");
}

void activarWifi() {
  if (!wifiActivado) {
    Serial.println("\n=================================");
    Serial.println("ACTIVANDO WIFI...");
    Serial.println("=================================");
    
    WiFi.softAPConfig(localIP, gateway, subnet);
    WiFi.softAP(ssid, password);
    
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.onNotFound(handleNotFound);
    server.begin();
    
    wifiActivado = true;
    
    // Guardar estado en EEPROM
    guardarWifiEstado();
    
    Serial.println("WIFI ACTIVADO");
    Serial.print("SSID: "); Serial.println(ssid);
    Serial.print("IP: "); Serial.println(WiFi.softAPIP());
    Serial.print("Contrasena: "); Serial.println(password);
    Serial.println("=================================\n");
    
    estadoActual = WIFI_ACTIVO;
  }
}

void mostrarRegistrosSerial() {
  Serial.println("\n=================================");
  Serial.println("REGISTROS ALMACENADOS");
  Serial.println("=================================");
  
  if (registros.size() == 0) {
    Serial.println("No hay registros almacenados");
  } else {
    for (size_t i = 0; i < registros.size(); i++) {
      Serial.print(i + 1); Serial.print(". ");
      Serial.print(registros[i].nombre_vaca);
      Serial.print(" ("); Serial.print(registros[i].codigo_vaca); Serial.print(") - ");
      Serial.print(registros[i].peso_lb, 2);
      Serial.print(" lb - ");
      Serial.println(registros[i].fecha_hora);
    }
    Serial.print("\nTotal: "); Serial.print(registros.size());
    Serial.println(" registros");
  }
  Serial.println("=================================\n");
}

String obtenerFechaHora() {
  unsigned long segundos = millis() / 1000;
  int horas = (segundos / 3600) % 24;
  int minutos = (segundos / 60) % 60;
  int seg = segundos % 60;
  
  char buffer[20];
  sprintf(buffer, "%02d:%02d:%02d", horas, minutos, seg);
  return String(buffer);
}

void mostrarMenuPrincipal() {
  Serial.println("\n=================================");
  Serial.println("SISTEMA DE CONTROL DE VACAS");
  Serial.println("=================================");
  Serial.println("Estado actual: " + String(wifiActivado ? "WIFI ACTIVO" : "WIFI INACTIVO"));
  Serial.println("\nINSTRUCCIONES:");
  Serial.println("1. Ingrese codigo de 3 digitos de la vaca");
  Serial.println("2. Presione # para buscar la vaca");
  Serial.println("3. Ingrese peso en libras (ej: 1250.5)");
  Serial.println("4. Presione * para guardar registro");
  
  if (!wifiActivado) {
    Serial.println("5. Presione D para activar WiFi");
  }
  
  Serial.println("6. Presione C para ver registros");
  Serial.println("7. Presione B para borrar TODOS los registros");
  
  Serial.println("\nVACAS DISPONIBLES:");
  for (int i = 0; i < 7; i++) {
    Serial.print("  "); Serial.print(baseDatosVacas[i].codigo);
    Serial.print(" - "); Serial.println(baseDatosVacas[i].nombre);
  }
  Serial.println("=================================\n");
  
  if (estadoActual == ESPERA_CODIGO) {
    Serial.println("Ingresa el codigo de la vaca (3 digitos):");
  }
}

void procesarTeclado(char tecla) {
  Serial.print("Tecla: "); Serial.println(tecla);
  
  switch(estadoActual) {
    case ESPERA_CODIGO:
      if (tecla == '#') {
        if (entradaCodigo.length() == 3) {
          int codigo = entradaCodigo.toInt();
          buscarVacaPorCodigo(codigo);
          if (vacaActual.codigo == codigo) {
            estadoActual = ESPERA_PESO;
            Serial.println("\nIngresa el peso (lb):");
          }
        } else {
          Serial.println("ERROR: El codigo debe tener 3 digitos");
          entradaCodigo = "";
          Serial.println("Ingresa el codigo de la vaca (3 digitos):");
        }
      } else if (tecla == 'D' && !wifiActivado) {
        estadoActual = CONFIRMAR_WIFI;
        Serial.println("\n=================================");
        Serial.println("CONFIRMAR ACTIVACION WIFI");
        Serial.println("=================================");
        Serial.println("Presione A para confirmar activacion WiFi");
        Serial.println("Presione cualquier otra tecla para cancelar");
        Serial.println("=================================");
      } else if (tecla == 'C') {
        mostrarRegistrosSerial();
        mostrarMenuPrincipal();
      } else if (tecla == 'B') {
        estadoActual = CONFIRMAR_BORRAR;
        Serial.println("\n=================================");
        Serial.println("CONFIRMAR BORRAR TODOS LOS REGISTROS");
        Serial.println("=================================");
        Serial.println("Presione A para confirmar borrado");
        Serial.println("Presione cualquier otra tecla para cancelar");
        Serial.println("=================================");
      } else if (isdigit(tecla)) {
        entradaCodigo += tecla;
        Serial.print("Codigo: "); Serial.println(entradaCodigo);
      }
      break;
      
    case ESPERA_PESO:
      if (tecla == '*') {
        guardarRegistro();
        mostrarMenuPrincipal();
      } else if (isdigit(tecla) || tecla == '.') {
        entradaPeso += tecla;
        Serial.print("Peso: "); Serial.println(entradaPeso);
      }
      break;
      
    case CONFIRMAR_WIFI:
      if (tecla == 'A') {
        activarWifi();
        mostrarMenuPrincipal();
      } else {
        Serial.println("Activacion WiFi cancelada");
        estadoActual = ESPERA_CODIGO;
        mostrarMenuPrincipal();
      }
      break;
      
    case CONFIRMAR_BORRAR:
      if (tecla == 'A') {
        borrarTodosRegistros();
        estadoActual = ESPERA_CODIGO;
        mostrarMenuPrincipal();
      } else {
        Serial.println("Borrado cancelado");
        estadoActual = ESPERA_CODIGO;
        mostrarMenuPrincipal();
      }
      break;
      
    case WIFI_ACTIVO:
      if (tecla == 'C') {
        mostrarRegistrosSerial();
        mostrarMenuPrincipal();
      } else if (tecla == 'B') {
        estadoActual = CONFIRMAR_BORRAR;
        Serial.println("\n=================================");
        Serial.println("CONFIRMAR BORRAR TODOS LOS REGISTROS");
        Serial.println("=================================");
        Serial.println("Presione A para confirmar borrado");
        Serial.println("Presione cualquier otra tecla para cancelar");
        Serial.println("=================================");
      } else if (isdigit(tecla)) {
        entradaCodigo += tecla;
        estadoActual = ESPERA_CODIGO;
        Serial.print("Codigo: "); Serial.println(entradaCodigo);
      }
      break;
  }
}

// --- SETUP Y LOOP ---
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n==========================================");
  Serial.println("      SISTEMA DE CONTROL DE VACAS ESP32");
  Serial.println("==========================================\n");
  
  // Configurar pines de la matriz
  for(int i = 0; i < ROWS; i++) pinMode(rowPins[i], INPUT_PULLUP);
  for(int i = 0; i < COLS; i++) pinMode(colPins[i], INPUT_PULLUP);
  
  // Cargar estado anterior de EEPROM
  cargarWifiEstado();
  cargarRegistrosEEPROM();
  
  // Si WiFi estaba activado, activarlo automaticamente
  if (wifiActivado) {
    WiFi.softAPConfig(localIP, gateway, subnet);
    WiFi.softAP(ssid, password);
    
    server.on("/", handleRoot);
    server.on("/data", handleData);
    server.onNotFound(handleNotFound);
    server.begin();
    
    estadoActual = WIFI_ACTIVO;
    Serial.println("WIFI restaurado desde EEPROM");
    Serial.print("IP: "); Serial.println(WiFi.softAPIP());
  }
  
  // Mostrar menu inicial
  mostrarMenuPrincipal();
}

void loop() {
  // Manejar servidor web si WiFi esta activo
  if (wifiActivado) {
    server.handleClient();
  }
  
  // Leer teclado matricial
  char tecla = customKeypad.getKey();
  if (tecla) {
    procesarTeclado(tecla);
  }
  
  delay(10);
}
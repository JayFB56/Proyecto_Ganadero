# 📡 ESP32 - Cambios Realizados

## Cambios Principales

### 1. **De Access Point a Station Mode**
**Antes:** El ESP32 creaba una red WiFi propia (`softAP`)
**Ahora:** Se conecta a una red WiFi existente (`WiFi.begin()`)

### 2. **De Almacenamiento Local a Firebase**
**Antes:** Guardaba en SPIFFS (`/registros.json`)
**Ahora:** Envía directamente a Firebase Realtime Database

### 3. **Comunicación**
**Antes:** La app se conectaba al AP del ESP32 y descargaba datos vía HTTP
**Ahora:** El ESP32 se conecta a Internet y envía datos a Firebase automáticamente

---

## Configuración Necesaria

### En el archivo `balanza_con_tm.ino`, líneas 29-32:

```cpp
// CONFIGURACIÓN WIFI Y FIREBASE
const char* ssid = "TU_SSID";           // CAMBIAR: Nombre de tu WiFi
const char* password = "TU_PASSWORD";   // CAMBIAR: Contraseña de tu WiFi
const char* firebase_host = "https://TU_PROYECTO.firebaseio.com"; // CAMBIAR: Tu URL Firebase
const char* firebase_secret = "TU_SECRET"; // CAMBIAR: Tu Secret de Firebase (opcional)
```

### Reemplaza con:
- **ssid**: Nombre de tu red WiFi (ej: "MiWiFi")
- **password**: Contraseña de tu WiFi
- **firebase_host**: URL de tu Realtime Database (ej: "https://lechefacil-abc123.firebaseio.com")
  - Encuentra esto en Firebase Console > Realtime Database > URL

---

## Librerías Requeridas

El código ahora usa:
- `HTTPClient.h` - Para enviar datos a Firebase
- `ArduinoJson.h` - Para crear JSON de los registros
- `WiFi.h` - Para conectarse a WiFi

**Instálalas en Arduino IDE:**
1. IDE > Sketch > Include Library > Manage Libraries
2. Busca "ArduinoJson" por Benoit Blaisey
3. Instala versión 6.x o 7.x

---

## Flujo de Funcionamiento

### Cada vez que presionas 'A':

```
┌─────────────────────────────────────┐
│ 1. Lees el peso en la balanza       │
│ 2. Verificas conexión WiFi          │
│ 3. Creas JSON con datos             │
│ 4. Envías POST a Firebase           │
│ 5. Esperas respuesta HTTP           │
│ 6. Muestras mensaje de éxito/error  │
└─────────────────────────────────────┘
```

### Mensajes en la pantalla OLED:

- **"REGISTRO GUARDADO"** ✓ Los datos se enviaron a Firebase
- **"ENVIADO A NUBE"** ✓ Confirmación exitosa
- **"NO HAY WIFI"** ✗ El ESP32 no está conectado a WiFi
- **"ERROR NUBE: XXX"** ✗ Error HTTP desde Firebase
- **"ERROR CONEXION"** ✗ No se pudo conectar al servidor

---

## Información de Conexión WiFi

### En setup():
- Intenta conectarse a WiFi hasta 20 veces (tiempos de espera de 500ms)
- Si se conecta: muestra IP en Serial Monitor
- Si no conecta: la balanza funciona pero no envía datos

### Variable global:
```cpp
bool wifiConnected = false;  // Se actualiza en loop()
```

### En la pantalla OLED:
- Se muestra "ON" si está conectado
- Se muestra "OFF" si no está conectado

---

## Estructura de Datos Enviados a Firebase

Cada registro enviado tiene esta estructura:

```json
{
  "codigo": "001",
  "peso": 12.5,
  "fecha": "08/02/2025",
  "hora": "10:30",
  "turno": "am",
  "timestamp": 1707399000000
}
```

Firebase asigna automáticamente un ID único.

---

## Cambios en setup()

```cpp
void setup() {
  // ... Configuración de componentes ...
  
  // NUEVO: Conectarse a WiFi existente
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  // Espera hasta 20 intentos
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  // Muestra resultado
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Conectado!");
    wifiConnected = true;
  }
}
```

## Cambios en loop()

```cpp
void loop() {
  // NUEVO: Verificar conexión WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
  } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
    wifiConnected = true;
  }
  
  // ... Resto del código igual ...
}
```

---

## Función Nueva: sendToFirebase()

Reemplazó la antigua `handleRoot()` que servía archivos.

```cpp
void sendToFirebase(String codigo, float peso, 
                    String fecha, String hora, String turno)
```

**Lo que hace:**
1. Verifica conexión WiFi
2. Crea JSON con los datos
3. Envía POST a Firebase
4. Procesa respuesta HTTP
5. Muestra resultado en OLED

---

## Debugging

### Ver logs en Serial Monitor:
```
[WIFI] Conectado!
[WIFI] IP: 192.168.1.100
[FIREBASE] Enviando: {"codigo":"001",...}
[FIREBASE] URL: https://lechefacil-abc.firebaseio.com/registros.json
[FIREBASE] Response code: 200
```

### Velocidad del puerto: 115200 bps

---

## Diferencias Importantes

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Conexión | AP WiFi (Balanza) | WiFi Cliente |
| Almacenamiento | SPIFFS (local) | Firebase (nube) |
| Sincronización | Manual en APP | Automática |
| Internet | NO requerida | SÍ requerida |
| Datos en tiempo real | NO | SÍ |
| Múltiples usuarios | No | Sí (mismo Firebase) |

---

## Próximos Pasos

1. ✅ Actualiza las configuraciones de WiFi y Firebase
2. ✅ Instala ArduinoJson en IDE
3. ✅ Compila y sube a ESP32
4. ✅ Verifica Serial Monitor
5. ✅ Prueba enviando un registro
6. ✅ Verifica que aparezca en Firebase Console

¡Listo! 🚀

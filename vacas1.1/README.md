# VacaData — Sistema de registro de peso (ESP32 + Matriz 4x4)

**Estado:** Primer avance  
**Descripción breve:** Proyecto electrónico para captura y almacenamiento local de registros de peso de vacas usando un ESP32 y un teclado matricial 4×4. Incluye servidor Wi-Fi (AP) para consultar los registros en formato JSON. Las vacas que se ven en la simulación son **placeholders** para pruebas y **no** están incluidas en el producto final ni en la lógica final del firmware.

---

## Características principales (preliminares)
- Captura de peso por teclado matricial 4×4.
- Búsqueda de vaca por **código de 3 dígitos** usando una base de datos local en el firmware.
- Almacenamiento persistente de registros en **EEPROM** (permanece después de apagar el ESP32).
- Modo AP Wi-Fi con SSID `VacaData_AP` y endpoint `/data` que devuelve registros en JSON.
- Comandos básicos desde teclado: activar Wi-Fi, ver registros, borrar registros, guardar peso.
- Actualmente solo se utiliza una matriz 4×4 y el ESP32 (hardware mínimo para la prueba).

---

## Hardware (usado en este avance)
- ESP32 (cualquier placa compatible)
- Teclado matricial 4×4 (pines mapeados en el código)
- Cables y fuente de alimentación
- (No hay módulo RTC: la fecha/hora es derivada de `millis()`)

**Pines en el código (ejemplo):**
- Filas: GPIO 13, 12, 14, 27
- Columnas: GPIO 26, 25, 33, 32

---

## Software / Librerías
- `WiFi.h`
- `WebServer.h` (servidor web integrado)
- `Arduino_JSON.h` (construcción de JSON)
- `Keypad.h` (gestión del teclado matricial)
- `EEPROM.h` (almacenamiento persistente)

---

## Cómo usar (operación básica)
1. Enciende el ESP32 y observa la consola Serial (115200).
2. Ingresa el **código de 3 dígitos** de la vaca por el teclado.
3. Presiona `#` para buscar la vaca.
4. Si se encuentra, ingresa el peso (ej: `1250.5`) y presiona `*` para guardar.
5. Presiona `D` (en estado de espera) para **activar** el AP Wi-Fi.
6. Conéctate a `VacaData_AP` (contraseña `12345678`) y visita `http://192.168.4.1/data` para ver JSON con los registros.
7. `C` muestra registros por Serial. `B` solicita confirmar borrado de todos los registros.

---

## Estructura de datos (resumen técnico)
- `VacaInfo` — base de datos interna con `codigo`, `nombre`, `raza`, `edad`.
- `RegistroPeso` — contiene `codigo_vaca`, `nombre_vaca`, `peso_lb`, `fecha_hora`, `timestamp`.
- EEPROM layout (resumen):
  - Byte `EEPROM_WIFI_FLAG` (0): estado Wi-Fi
  - Byte `EEPROM_COUNT_ADDR` (1): número de registros guardados
  - Desde `EEPROM_DATA_START` (10): registros serializados (código 2 bytes, peso 4 bytes, timestamp 4 bytes)…

**Nota:** `timestamp` se almacena usando `millis()` en el momento del guardado (no es tiempo real).

---

## API (JSON)
- `GET /` — devuelve texto simple.
- `GET /data` — devuelve un JSON con:
  - `wifi_activo` (bool)
  - `total_registros` (int)
  - `fecha_servidor` (string, generada por `millis()`)
  - `registros` (array con objetos: `codigo_vaca`, `nombre_vaca`, `peso_lb`, `fecha_hora`, `timestamp`)
  - `wifi_activo`, `total_registros`, `fecha_servidor` y el array `registros`.

### **1. Vista general del sistema — Menú principal**
<img width="350" alt="image" src="https://github.com/user-attachments/assets/48405f69-e67b-4651-ad36-c74d18c90a34" />

**Descripción:** Interfaz mostrada por el ESP32 vía Serial: instrucciones, códigos disponibles y estado del Wi-Fi.

---

### **2. Simulación de vacas (placeholders)**
<img width="280" alt="image" src="https://github.com/user-attachments/assets/3800bb1f-207b-43d0-a785-722f8163cf0d" />

**Descripción:** Estas vacas son solo simulaciones para validar la lógica. No forman parte del producto final.

---

### **3. Registro de leche/peso en curso**
<img width="260" alt="image" src="https://github.com/user-attachments/assets/9ffa9ad1-ebcf-4582-97f2-7066d6cb74a8" />

**Descripción:** Flujo de registro: código → `#` → peso → `*` guardar.

---

### **4. Listado de todos los registros (Serial)**
<img width="300" alt="image" src="https://github.com/user-attachments/assets/dcf73e22-5405-442f-800d-d109f714aa32" />

**Descripción:** Vista completa de los registros almacenados en EEPROM: código, nombre, peso y hora.

---

### **5. Consulta JSON desde un dispositivo**
<img width="240" alt="image" src="https://github.com/user-attachments/assets/3f2d4cb0-d581-4cba-9dc2-179d6622beae" />

**Descripción:** Respuesta del endpoint `/data` al conectarse mediante el AP del ESP32.

---

### **6. Borrado de registros (confirmación)**
<img width="300" alt="image" src="https://github.com/user-attachments/assets/a8657ba9-94f0-4b8c-aad9-93ae12d78160" />

**Descripción:** Confirmación para borrar todos los registros almacenados.



**Ejemplo (parcial):**
```json
{
  "wifi_activo": true,
  "total_registros": 3,
  "fecha_servidor": "00:12:34",
  "registros": [
    {
      "codigo_vaca": 101,
      "nombre_vaca": "Blanca",
      "peso_lb": "1200.50",
      "fecha_hora": "00:12:30",
      "timestamp": 123456
    }
  ]
}


---









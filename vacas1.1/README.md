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

# Leyendas (captions) sugeridas — pega **debajo de cada imagen**:

> A continuación te doy **6** captions detalladas (una línea + 1–2 oraciones). Tú tienes 4 imágenes, así que asigna la que mejor corresponda; si hay screenshots combinadas, pega la caption correspondiente. Cada caption está en español y lista lo que mostrar y un breve comentario de funcionamiento preliminar.

1. **Vista general del sistema — Menú principal.**  
   *Descripción:* Interfaz mostrada por el ESP32 vía Serial: instrucciones de uso, códigos de vacas disponibles y estado del Wi-Fi. Sirve como guía rápida para operar el prototipo (ingresar código, registrar peso, activar Wi-Fi).

2. **Simulación de vacas (placeholders).**  
   *Descripción:* Visualización de las vacas usadas solo para simular la operación. **Importante:** estas vacas son elementos de prueba y **no estarán** en el código/producto final; su propósito es validar la lógica de selección y registro.

3. **Registro de leche/peso en curso (entrada por teclado).**  
   *Descripción:* Pantalla/Serial mostrando la entrada del peso (ej: `1250.5`) y la confirmación de guardado. Muestra el flujo: ingresar código → `#` buscar → ingresar peso → `*` guardar.

4. **Listado de todos los registros (Serial).**  
   *Descripción:* Salida por Serial con todos los registros guardados: nombre de la vaca, código, peso y hora aproximada. Esta vista confirma que los registros se acumulan localmente y pueden listarse desde la consola.

5. **Consulta JSON desde un dispositivo (http://192.168.4.1/data).**  
   *Descripción:* Respuesta JSON del endpoint `/data` cuando el ESP32 está en modo AP. Útil para integrar apps móviles/web que consuman los registros. Contiene `wifi_activo`, `total_registros`, `fecha_servidor` y el array `registros`.

6. **Borrado de registros (confirmación).**  
   *Descripción:* Mensaje de confirmación para borrar todos los registros (operación con doble confirmación para evitar borrados accidentales). Después del borrado, la EEPROM se actualiza y el conteo queda a cero.



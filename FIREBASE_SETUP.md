# 🐄 LecheFácil - Guía de Configuración Firebase

## Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto llamado "lechefacil" (o el nombre que prefieras)
3. Selecciona tu país/región
4. **No necesitas Google Analytics** (desactívalo en la configuración)

## Paso 2: Configurar Realtime Database

1. En la consola de Firebase, ve a **Build > Realtime Database**
2. Haz clic en **Create Database**
3. Selecciona ubicación cercana a tu país
4. Inicia en modo **LOCKED** (lo cambiaremos después)
5. Una vez creada, ve a la pestaña **Rules** y reemplaza con esto:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "vacas": {
      ".indexOn": ["codigo", "createdAt"]
    },
    "registros": {
      ".indexOn": ["codigo", "timestamp"]
    }
  }
}
```

6. Haz clic en **Publish**

## Paso 3: Obtener Configuración Firebase

1. En la consola, ve a **Project Settings** (ícono de engranaje)
2. En la pestaña **Your apps**, haz clic en **Web** (<>)
3. Copia la configuración (config object)
4. Debería verse así:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "lechefacil-xxxxx.firebaseapp.com",
  databaseURL: "https://lechefacil-xxxxx.firebaseio.com",
  projectId: "lechefacil-xxxxx",
  storageBucket: "lechefacil-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcde...",
};
```

## Paso 4: Actualizar Configuración en el Código

### En la App (Frontend):
Abre `src/core/firebase.ts` y reemplaza `firebaseConfig` con tus valores.

### En el ESP32:
Abre `balanza_con_tm.ino` y busca estas líneas:

```cpp
const char* ssid = "TU_SSID";           // Tu red WiFi
const char* password = "TU_PASSWORD";   
const char* firebase_host = "https://tu-proyecto.firebaseio.com"; // Tu URL
const char* firebase_secret = "TU_SECRET"; // Opcional
```

Actualiza:
- `TU_SSID`: Nombre de tu red WiFi
- `TU_PASSWORD`: Contraseña de WiFi
- `firebase_host`: URL de tu Realtime Database (ej: `https://lechefacil-xxxxx.firebaseio.com`)

## Paso 5: Instalar Dependencias

```bash
npm install
```

## Paso 6: Ejecutar la App

### Desarrollo Web:
```bash
npm run dev
```

### Compilar para Móvil:
```bash
npm run build
npm run mobile:sync
npm run mobile:android  # o mobile:ios
```

## Paso 7: Cargar Código en ESP32

1. Abre Arduino IDE
2. Instala la librería **ArduinoJson** por Benoit Blaisey
3. Abre `balanza_con_tm.ino`
4. Selecciona Board: **ESP32 Dev Module**
5. Selecciona Puerto COM correcto
6. Haz clic en **Upload**

## Probando

1. **Enciende el ESP32** - Debería conectarse a tu WiFi
2. En el display OLED del ESP32, verás el código y estado WiFi
3. Presiona una tecla numérica para ingresar código de vaca (ej: 001)
4. Presiona **A** para registrar el peso
5. El ESP32 enviará a Firebase automáticamente

En la app:
1. Abre la app y agrega una vaca (ej: nombre="Blanca", código="001")
2. El registro aparecerá automáticamente en el dashboard
3. Los gráficos se mostrarán en tiempo real

## Solución de Problemas

### "No hay conexión WiFi"
- Verifica el SSID y password en el .ino
- Comprueba que la red WiFi es de 2.4GHz (ESP32 no soporta 5GHz)

### "No se envían datos a Firebase"
- Verifica la URL de Firebase sea correcta
- Comprueba reglas de Base de Datos permitan escritura

### "Datos no aparecen en la app"
- Asegúrate que el código ingresado en ESP32 coincida con el código en la app
- Comprueba que Firebase esté correctamente configurado

---

## Estructura de Datos en Firebase

### Vacas (`/vacas`)
```json
{
  "V001": {
    "id": "V001",
    "nombre": "Blanca",
    "codigo": "V001",
    "createdAt": "2025-02-08T10:30:00Z"
  }
}
```

### Registros (`/registros`)
```json
{
  "1707399000000": {
    "codigo": "V001",
    "peso": 12.5,
    "fecha": "08/02/2025",
    "hora": "10:30",
    "turno": "am",
    "timestamp": 1707399000000
  }
}
```

---

¡Tu sistema IoT está listo! 🚀

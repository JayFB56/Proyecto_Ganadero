# ⚡ Inicio Rápido - 15 minutos

## Asume que ya tienes:
- ✅ Cuenta Gmail (para Firebase)
- ✅ Arduino IDE instalada
- ✅ Node.js instalado
- ✅ ESP32 con hardware listo

---

## 1️⃣ Firebase (5 min)

```
1. Ve a https://console.firebase.google.com
2. "Nueva Proyecto" → Nombre: "lechefacil"
3. Desactiva Google Analytics
4. Abre proyecto
5. Build → Realtime Database → Create Database
6. Ubica cercana → LOCKED → Create
7. Rules tab → Reemplaza con esto:

{
  "rules": {
    ".read": true,
    ".write": true,
    "vacas": {
      ".indexOn": ["codigo"]
    },
    "registros": {
      ".indexOn": ["codigo"]
    }
  }
}

8. Publish
9. Project Settings → Web → Copia config
```

**Copias 4 valores principales:**
- `databaseURL` (ej: https://lechefacil-abc.firebaseio.com)
- `projectId`
- `apiKey`
- `authDomain`

---

## 2️⃣ Configurar App (3 min)

```bash
cd lechefacil-demo-registros

# Editar archivo
# src/core/firebase.ts

# Línea ~12, reemplaza firebaseConfig:
const firebaseConfig = {
  apiKey: "TU_VALUES_AQUI",
  authDomain: "tu-dominio...",
  databaseURL: "https://tu-url.firebaseio.com",
  projectId: "tu-proyecto",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};

# Guardar
```

---

## 3️⃣ Configurar ESP32 (5 min)

```
1. Abre balanza_con_tm.ino en Arduino IDE
2. Instala ArduinoJson:
   - Tools → Manage Libraries
   - Busca "ArduinoJson"
   - Instala por Benoit Blaisey
3. Líneas 29-32 del .ino:

const char* ssid = "MI_SSID";        // Tu WiFi
const char* password = "PASSWORD";    // Tu password
const char* firebase_host = "https://lechefacil-abc.firebaseio.com";

4. Reemplaza MI_SSID, PASSWORD, y firebase_host
5. Board → "ESP32 Dev Module"
6. Puerto → COM correcto
7. Upload

8. Abre Serial Monitor (115200 bps)
9. Deberías ver: "[WIFI] Conectado!"
```

---

## 4️⃣ Ejecutar App (2 min)

```bash
# En carpeta lechefacil-demo-registros
npm install
npm run dev

# Abre navegador
http://localhost:8080
```

---

## 5️⃣ Probar (Video rápido)

```
1. EN APP:
   - Sección "Mis Vacas" → "+ Agregar Vaca"
   - Nombre: "Blanca"
   - Código: "001"
   - Agregar

2. EN ESP32:
   - Presiona: 0, 0, 1 (el código)
   - Coloca vaca en balanza
   - Espera 2 segundos (lee peso)
   - Presiona A (envía)
   - Verás "ENVIADO A NUBE"

3. EN APP:
   - Espera 2 segundos
   - ¡El registro debe aparecer en la gráfica!
```

---

## 🎉 ¡Listo!

Si todo funciona:
- Gráficos aparecer automáticamente
- Firebase recibe en tiempo real
- App sincroniza en tiempo real

---

## ⚠️ Si no funciona

### Problema: ESP32 no conecta WiFi
- Verifica SSID y password (error común: espacios)
- WiFi debe ser 2.4GHz (no 5GHz)
- Serial debe mostrar "[WIFI] Conectado!"

### Problema: Datos no llegan a Firebase
- Verifica firebase_host es correcto (sin "/" al final)
- Serial debe mostrar "[FIREBASE] Response code: 200"
- Revisa Firebase Console → Realtime DB → registros

### Problema: App no carga
- `npm install` (puede haber problema de dependencias)
- `npm run dev` (ejecutar otra vez)
- Clear browser cache (Ctrl+Shift+Delete)
- Verifica firebase.ts tiene config correcta

---

## 📚 Documentación Completa

Para más detalles:
- `README_IMPLEMENTACION.md` - Guía completa
- `FIREBASE_SETUP.md` - Setup detallado
- `GUIA_USO_APP.md` - Cómo usar la app
- `balanza_con_tm/CAMBIOS.md` - Cambios ESP32

---

Ahora vale! 🚀

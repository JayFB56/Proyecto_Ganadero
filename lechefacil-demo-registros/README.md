#  Arquitectura de Almacenamiento y Sincronización Offline/Online

Este proyecto implementa una arquitectura robusta para el manejo de **registros offline/online**, sincronización controlada, y compatibilidad tanto en **web como en plataformas nativas (Capacitor)**.

El enfoque prioriza **resiliencia**, **simplicidad**, y **escalabilidad**, asegurando que los datos no se pierdan ante caídas de red, cierres inesperados o fallos de sincronización.

---

##  Cambios principales

### 1. Wrapper seguro para almacenamiento
**Archivo:** `index.ts`

- Implementación de un **SafeStorage** centralizado.
- Uso de **@capacitor/preferences** como almacenamiento principal.
- **Fallback automático a IndexedDB** cuando Preferences no esté disponible.
- Manejo de un índice (`registros:index`) para:
  - Identificar registros pendientes.
  - Separar estados offline/online.
- Garantiza persistencia de datos incluso sin conexión.

---

### 2. Sincronización simple y robusta
**Archivo:** `index.ts`

- Proceso de sincronización controlado y predecible.
- Soporte de **concurrencia configurable**.
- Manejo explícito de estados de sincronización:
  - `pending` → registro pendiente de envío.
  - `synced` → registro sincronizado correctamente.
  - `failed` → error durante la sincronización.
- Permite:
  - Reintentos automáticos.
  - Reintentos manuales desde la interfaz.

---

### 3. Control de sincronización en la UI
**Componente:** `SyncControl.tsx`

- Botón para iniciar sincronización manual.
- Visualización de estados básicos.
- Manejo simple de errores.
- Reintentos sin bloquear la aplicación.
- Pensado para usuarios finales y operadores.

---

### 4. Tabla de registros mejorada
**Componente:** `RegistroTable.tsx`

- Tabla optimizada para visualización clara de datos.
- Soporte de **ordenamiento** por:
  - Código
  - Peso
  - Fecha
  - Hora
  - Turno (AM / PM)
- Diseño limpio y legible.
- Preparada para grandes volúmenes de registros.

---

### 5. Gestión de red con fallback
**Archivo:** `index.ts`

- Uso prioritario de **@capacitor/network** para detectar conectividad.
- Fallback automático a:
  - `navigator.onLine`
  - Eventos `online` / `offline` del navegador.
- Suscripción a cambios de red para:
  - Lanzar sincronizaciones automáticas.
  - Actualizar estados internos.

---

### 6. Inicialización ampliada de Capacitor
**Archivo:** `capacitor-init.ts`

- Soporte para **Edge-to-Edge** en Android.
- Control de **StatusBar**.
- Notificación de estado de la app a:
  - `@capgo/capacitor-updater`
- Solo se ejecuta en plataformas nativas (Android / iOS).

---

### 7. Tipos y declaraciones
**Archivos:**
- `types.ts`
- `capacitor-plugins.d.ts`

Incluye:
- Nuevos tipos:
  - `StoredRegistro`
  - `StorageStatus`
- Declaraciones mínimas para plugins Capacitor.
- Mejora el tipado y evita errores en TypeScript.

---

##  Módulos / dependencias agregadas (esenciales)

## 📦 Dependencias

### Dependencias de producción

```bash
npm install @capacitor/preferences
npm install @capacitor/network
npm install @capgo/capacitor-updater
npm install @capawesome/capacitor-android-edge-to-edge-support
npm install @capacitor/status-bar
npm install @capacitor-community/sqlite
```

### Dependencias de desarrollo

```bash
npm install -D lovable-tagger
npm install tailwindcss-animate
```

## Captura de la aplicación (Web)

<img width="1365" height="577" alt="Vista de la aplicación web" src="https://github.com/user-attachments/assets/ee9cb6a1-cf20-47ed-9f2a-c432824bbd48" />



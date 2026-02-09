# 📊 LecheFácil APP - Guía de Uso

## Descripción General

La app ahora está diseñada como un **dashboard profesional de producción** con gráficas en tiempo real.

### Cambios Principales

| Función | Antes | Ahora |
|---------|-------|-------|
| Ver datos | Tabla de registros | Gráficos por vaca |
| Registros | Manual (botón descargar) | Automáticos (tiempo real) |
| Filtrado | NO | Sí, por código de vaca |
| Visualización | Tabla grande | Dashboard limpio |
| Métricas | Contador de registros | Total, promedio, tendencias |

---

## 🏠 Interfaz Principal

### Sección Superior: Logo e Información
```
🐄 LecheFácil - Dashboard de Producción
Monitoreo en tiempo real de la producción de leche
```

### Sección "Mis Vacas"
Aquí puedes:
- **+ Agregar Vaca** - Crea una nueva entrada
  - Completa: Nombre (visible) y Código (único)
  - Ejemplo: Nombre="Blanca", Código="001"
- **Tarjetas de vacas** - Muestra todas las vacas
  - Botón "Eliminar" en cada una

### Tabs de Navegación
Botones para cambiar entre vacas (si tienes varias)

### Dashboard de Vaca
Muestra gráficos e información de la vaca seleccionada

---

## 🎯 Flujo de Uso Principal

### 1. Crear una Vaca

```
App (Abierta)
    ↓
Sección "Mis Vacas"
    ↓
Botón "+ Agregar Vaca"
    ↓
Llenar Formulario:
  - Nombre: "Blanca" (lo que tú llamas)
  - Código: "001" (lo que registras en ESP32)
    ↓
Botón "Agregar Vaca"
    ↓
Vaca aparece en lista y tabs
```

### 2. Registrar Peso en ESP32

```
Encender ESP32
    ↓
Esperar a que diga "Conectado"
    ↓
Ingresa Código: presiona: 0, 0, 1 (sin "V", solo números)
    ↓
Coloca vaca en balanza
    ↓
Espera a leer peso
    ↓
Presiona "A" para guardar
    ↓
ESP32 muestra "ENVIADO A NUBE"
    ↓
Automáticamente llega a Firebase
```

### 3. Ver Datos en App

```
La app recibe automáticamente en tiempo real
    ↓
Selecciona vaca con tab o dropdown
    ↓
Dashboard muestra:
  - Gráficos de AM/PM/Total
  - Métricas de producción
  - Tabla histórica
```

---

## 📈 Dashboard de Vaca

Cuando seleccionas una vaca, ves:

### 1. Encabezado
- Nombre y código de la vaca

### 2. Tarjetas de Métricas (3 columnas)
```
┌─────────────────┬──────────────┬────────────┐
│ Total Producción│ Promedio Diario│ Registros │
│  245.50 lb     │   12.25 lb    │    20     │
└─────────────────┴──────────────┴────────────┘
```

### 3. Gráfico de Líneas (interactivo)
- **Eje X**: Fechas (día a día)
- **Eje Y**: Libras
- **3 líneas**:
  - Naranja: Producción AM
  - Azul: Producción PM
  - Verde: Total del día
- **Interactividad**: Pasa el ratón para ver valores exactos

### 4. Tabla de Historial
```
Fecha       AM      PM      Total
08/02/2025  6.50    6.75    13.25
07/02/2025  5.80    6.20    12.00
06/02/2025  7.10    6.90    14.00
```

---

## 🔄 Cómo Funciona el Filtrado Automático

### Sistema detrás de escenas:

1. **Registras en ESP32 con código "001"**
2. **Creas vaca con código "001"**
3. **App escucha Firebase**: `/registros`
4. **Filtra automáticamente** donde `registro.codigo == "001"`
5. **Muestra SOLO** registros de esa vaca

### Ejemplo:

```
Firebase registros:
  {codigo: "001", peso: 12.5, ... }  ← Sale en dashboard de Blanca
  {codigo: "V002", peso: 11.0, ... }  ← Sale en dashboard de Negrita
  {codigo: "001", peso: 12.8, ... }  ← Sale en dashboard de Blanca

App:
  Selecciona "Blanca" (001)
    ↓
    Ve SOLO registros de 001
    (ignora V002)
```

---

## 🎨 Características de Interfaz

### Tema Oscuro/Claro
La app se adapta al tema del sistema
- Light: Fondos blancos
- Dark: Fondos oscuros (mejor para ojos de noche)

### Responsive (Móvil/Desktop)
- En móvil: Columnas se apilan
- En desktop: Usa todo el ancho

### Acceso Rápido
- Pestañas de vacas siempre visibles
- Cambio rápido entre vacas

---

## 📊 Interpretación de Gráficos

### ¿Qué significa el gráfico?

```
Producción (lb)
     ↑
   15 │     AM    PM
   14 │   ╱╲   ╱╲
   13 │  ╱  ╲╱  ╲    Total (sum)
   12 │ ╱          ╲
   11 │╱            ╲
     └─────────────────→ Fechas
```

- **Línea naranja sube** = Más leche en AM
- **Línea azul sube** = Más leche en PM
- **Línea verde sube** = Mejor producción total ese día
- **Línea baja** = Producción baja, revisar vaca

### Análisis de Tendencias

- Si todas las líneas **bajan progresivamente** = Vaca menos productiva
- Si hay **picos irregulares** = Posible estrés o enfermedad
- Si **AM >> PM** = Vaca produce más en mañana
- Si **PM >> AM** = Vaca produce más en tarde

---

## ⚙️ Configuración

### Habilitar en Móvil

Para usar en celular Android/iOS:

```bash
npm run build
npm run mobile:sync
npm run mobile:android  # Android
npm run mobile:ios      # iOS
```

### Usar en Navegador Web

```bash
npm run dev
# Abre http://localhost:5173
```

---

## 🔔 Datos que la App Recibe

### Estructura de cada registro:

```javascript
{
  codigo: "001",        // Código que registraste en ESP32
  peso: 12.5,           // Peso en libras
  fecha: "08/02/2025",  // Formato dd/mm/yyyy
  hora: "10:30",        // Formato HH:MM
  turno: "am",          // "am" o "pm"
  timestamp: 1707399000000  // Hora exacta en milisegundos
}
```

---

## ❌ Problemas Comunes

### "No aparecen datos en la app"
- Verifica que el código en ESP32 matchee con código en app
- Revisa Firebase Console → registros
- Si está en Firebase pero no en app: Problema de config Firebase

### "El gráfico no se actualiza"
- Espera 5 segundos (Firebase puede tardar)
- Recarga la página (F5)
- Verifica conexión a Internet

### "Las métricas no coinciden"
- Asegúrate de contar: AM + PM = Total
- Si solo hay AM: total = AM
- Si solo hay PM: total = PM

### "No puedo eliminar la vaca"
- Confirma en el popup
- Si sale error: Intenta recargando app

---

## 🔐 Seguridad y Privacidad

### Datos en Firebase
- Los datos se guardan en la nube (Google/Firebase)
- Puedes verlos en Firebase Console
- No hay autenticación de usuario YET

### Para Producción
Si planeas usar con muchos usuarios, agregar:
- Autenticación (Google Sign-in, etc.)
- Restricciones de acceso por usuario
- Encriptación de datos sensibles

---

## 💡 Tips y Trucos

### Para Mejor Precisión
1. Calibra la balanza antes de empezar el día
2. Coloca la vaca siempre en el mismo lugar
3. Registra a la misma hora cada día (consistencia)

### Para Análisis
1. Observa patrones en días específicos
2. Compara AM vs PM de la misma vaca
3. Compara vacas diferentes (¿cuál es más productiva?)

### Mantener Datos Limpios
1. Revisa tabla de historial regularmente
2. Elimina registros duplicados si los hay
3. Verifica códigos no tengan errores de dedo

---

## 📱 Versión Móvil (Capacitor)

La app está optimizada para móvil:
- Botones grandes fáciles de tocar
- Gráficos redimensionan automáticamente
- Scroll vertical para ver todo
- Sin zoom por defecto

---

## 🎓 Conceptos

### ¿Por qué gráficos en lugar de tabla?
- **Gráficos** muestran tendencias fácilmente
- **Tabla** muestra exactitud de números
- Tenemos ambos: gráfico + tabla debajo

### ¿Por qué filtrado automático?
- Cada vaca tiene su código ÚNICO
- La app filtra automáticamente
- No necesitas selector manual para cada registro

### ¿Por qué AM y PM separados?
- Es común hacer 2 ordeños por día
- Permite ver cuál turno es más productivo
- Facilita identificar problemas por turno

---

## ✅ Checklist Antes de Usar

- [ ] Firebase completamente configurado
- [ ] App cargando sin errores
- [ ] ESP32 conectado a WiFi
- [ ] ESP32 enviando a Firebase (verifica Serial)
- [ ] Primera vaca agregada en app
- [ ] Código de vaca en app = Código que usarás en ESP32
- [ ] Primer registro hecho desde ESP32
- [ ] Registro visible en Firebase Console
- [ ] Registro visible en app

---

¡Listo para monitorear tus vacas! 🚀

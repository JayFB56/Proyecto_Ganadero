# 🔧 API Firebase - Referencia Técnica

Guía de funciones disponibles en `src/core/firebase.ts`

---

## 📚 Tabla de Contenidos

1. [Inicialización](#inicialización)
2. [Gestión de Vacas](#gestión-de-vacas)
3. [Gestión de Registros](#gestión-de-registros)
4. [Estructura de Datos](#estructura-de-datos)
5. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Inicialización

### `firebaseConfig`
Objeto de configuración de Firebase.

```typescript
const firebaseConfig = {
  apiKey: string,
  authDomain: string,
  databaseURL: string,
  projectId: string,
  storageBucket: string,
  messagingSenderId: string,
  appId: string,
};
```

**Dónde obtenerlo**: Firebase Console > Project Settings > Web

### `app`
Instancia inicializada de Firebase.

```typescript
const app = initializeApp(firebaseConfig);
```

### `database`
Referencia a Realtime Database.

```typescript
const database = getDatabase(app);
```

---

## Gestión de Vacas

### `addVaca(vaca: Vaca): Promise<void>`
Agregar una nueva vaca a la base de datos.

```typescript
interface Vaca {
  id: string;        // Código único (ej: "001")
  nombre: string;    // Nombre visible (ej: "Blanca")
  codigo: string;    // Código (debe coincidir con id)
  createdAt: string; // Timestamp ISO (autogenerado)
}

// Uso
await addVaca({
  id: "001",
  nombre: "Blanca",
  codigo: "001",
  createdAt: new Date().toISOString()
});
```

**Ubicación en Firebase**: `/vacas/001`

**Lo que hace**:
- Valida que `id` sea único
- Crea entrada en `/vacas/{id}`
- Almacena automáticamente fecha de creación

---

### `getVacas(callback: (vacas: Vaca[]) => void): Promise<void>`
Escuchar cambios en la lista de vacas (tiempo real).

```typescript
// Uso
getVacas((vacas) => {
  console.log("Vacas actualizadas:", vacas);
  // Se ejecuta cada vez que cambia la lista
});
```

**Lo que hace**:
- Activa listener en `/vacas`
- Ejecuta `callback` cada vez que hay cambios
- Retorna array de todas las vacas

**La escucha es automática**: No necesitas polling.

---

### `deleteVaca(vacaId: string): Promise<void>`
Eliminar una vaca y todos sus registros.

```typescript
// Uso
await deleteVaca("001");
```

**Lo que hace**:
- Elimina vaca de `/vacas/001`
- Elimina todos los registros de esa vaca
- Actualiza listeners automáticamente

**Cuidado**: Esta acción NO se puede deshacer.

---

## Gestión de Registros

### `addRegistro(registro: Registro): Promise<void>`
Agregar un nuevo registro de pesaje.

```typescript
interface Registro {
  codigo: string;    // Código de vaca (ej: "001")
  peso: number;      // Peso en libras
  fecha: string;     // Formato: "dd/mm/yyyy"
  hora: string;      // Formato: "HH:MM"
  turno: string;     // "am" o "pm"
  id?: string;       // Opcional (generado automáticamente)
  timestamp?: number; // Opcional (generado automáticamente)
}

// Uso
await addRegistro({
  codigo: "001",
  peso: 12.5,
  fecha: "08/02/2025",
  hora: "10:30",
  turno: "am"
});
```

**Ubicación en Firebase**: `/registros/{timestamp}`

**Lo que hace**:
- Crea nuevo documento con timestamp como ID
- Agrega campo `timestamp` automáticamente
- Listeners se actualizan automáticamente

---

### `getRegistrosByCodigo(codigo: string, callback: (registros: Registro[]) => void): Promise<void>`
Obtener registros de una vaca específica (tiempo real).

```typescript
// Uso
getRegistrosByCodigo("001", (registros) => {
  console.log("Registros de 001:", registros);
  // Se actualiza automáticamente cuando hay cambios
});
```

**Lo que hace**:
- Filtra registros WHERE codigo == "001"
- Ejecuta callback con registros filtrantes
- Se actualiza en tiempo real si hay nuevos registros

**Nota**: Se ejecuta automáticamente cuando cambian datos.

---

### `getAllRegistros(callback: (registros: Registro[]) => void): Promise<void>`
Obtener TODOS los registros (tiempo real).

```typescript
// Uso
getAllRegistros((registros) => {
  console.log("Total de registros:", registros.length);
  // Se actualiza cuando hay cualquier cambio
});
```

**Lo que hace**:
- Obtiene todos los registros de `/registros`
- Ejecuta callback con el array completo
- Se actualiza automáticamente

**Cuidado con performance**: Si tienes miles de registros, mejor usar `getRegistrosByCodigo`.

---

### `deleteRegistro(registroId: string): Promise<void>`
Eliminar un registro específico.

```typescript
// Uso (el ID es el timestamp)
await deleteRegistro("1707399000000");
```

**Lo que hace**:
- Elimina registro de `/registros/{registroId}`
- Actualiza listeners automáticamente

**Nota**: Generalmente NO necesitarás esto (los registros son históricos).

---

## `getFirebaseDatabase()`
Obtener referencia a la base de datos (para usos avanzados).

```typescript
const db = getFirebaseDatabase();
```

**Cuándo usar**: Si necesitas hacer operaciones Firebase no incluidas en la API.

---

## Estructura de Datos

### En Firebase Console

```
mi-proyecto/
├── vacas/
│   ├── 001
│   │   ├── id: "001"
│   │   ├── nombre: "Blanca"
│   │   ├── codigo: "001"
│   │   └── createdAt: "2025-02-08T10:30:00Z"
│   └── V002
│       ├── id: "V002"
│       ├── nombre: "Negrita"
│       ├── codigo: "V002"
│       └── createdAt: "2025-02-08T10:35:00Z"
│
└── registros/
    ├── 1707399000000
    │   ├── codigo: "001"
    │   ├── peso: 12.5
    │   ├── fecha: "08/02/2025"
    │   ├── hora: "10:30"
    │   ├── turno: "am"
    │   └── timestamp: 1707399000000
    │
    └── 1707399500000
        ├── codigo: "001"
        ├── peso: 12.8
        ├── fecha: "08/02/2025"
        ├── hora: "14:25"
        ├── turno: "pm"
        └── timestamp: 1707399500000
```

---

## Ejemplos de Uso

### Ejemplo 1: Cargar todas las vacas al iniciar

```typescript
import { getVacas, Vaca } from "../core/firebase";

function App() {
  const [vacas, setVacas] = useState<Vaca[]>([]);

  useEffect(() => {
    getVacas((loadedVacas) => {
      setVacas(loadedVacas);
    });
  }, []);

  return (
    <div>
      {vacas.map(vaca => (
        <div key={vaca.id}>{vaca.nombre}</div>
      ))}
    </div>
  );
}
```

**Lo que pasa**:
1. Componente monta
2. Activamos listener en `/vacas`
3. Callback ejecuta cada vez que cambia
4. State se actualiza
5. Componente se renderiza

---

### Ejemplo 2: Mostrar registros de vaca seleccionada

```typescript
import { getRegistrosByCodigo } from "../core/firebase";

function CowDashboard({ codigoVaca }: { codigoVaca: string }) {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    getRegistrosByCodigo(codigoVaca, (data) => {
      setRegistros(data);
    });
  }, [codigoVaca]);

  return (
    <div>
      <p>Registros: {registros.length}</p>
      {registros.map((reg, i) => (
        <div key={i}>
          {reg.fecha} - {reg.peso}lb ({reg.turno})
        </div>
      ))}
    </div>
  );
}
```

**Lo que pasa**:
1. User selecciona vaca con código "001"
2. useEffect activa listener para "001"
3. Si cambia la vaca, listener se actualiza
4. Automáticamente recibe nuevos registros

---

### Ejemplo 3: Agregar nueva vaca

```typescript
import { addVaca } from "../core/firebase";

function AddVacaForm() {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addVaca({
        id: codigo,
        nombre,
        codigo,
        createdAt: new Date().toISOString()
      });
      
      // Éxito - listeners actualizarán automáticamente
      setNombre("");
      setCodigo("");
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
      />
      <input
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Código"
      />
      <button disabled={loading}>
        {loading ? "Agregando..." : "Agregar"}
      </button>
    </form>
  );
}
```

**Lo que pasa**:
1. User completa formulario
2. Presiona submit
3. Se ejecuta `addVaca()`
4. Firebase guarda datos
5. Todos los listeners se actualizan automáticamente
6. Componentes que usan `getVacas()` se re-renderizan

---

### Ejemplo 4: Escuchar cambios en tiempo real

```typescript
import { getRegistrosByCodigo } from "../core/firebase";
import { Line } from "react-chartjs-2";

function Chart({ codigoVaca }: { codigoVaca: string }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Este listener se ejecuta CADA VEZ que hay cambios
    getRegistrosByCodigo(codigoVaca, (registros) => {
      // Procesar registros y actualizar gráfico
      const processedData = registros.map(r => ({
        fecha: r.fecha,
        peso: r.peso
      }));
      
      setData(processedData);
      // Gráfico automáticamente se re-renderiza con nuevos datos
    });
  }, [codigoVaca]);

  return <Line data={data} />;
}
```

---

## 🎯 Patrones Comunes

### Patrón: Cargar una lista y mantenerla sincronizada

```typescript
const [vacas, setVacas] = useState<Vaca[]>([]);

useEffect(() => {
  const unsubscribe = getVacas((data) => {
    setVacas(data);
  });
  
  // Limpieza (opcional, según necesidad)
  // return () => unsubscribe();
}, []);
```

**Resultado**: `vacas` siempre tiene los datos más recientes.

---

### Patrón: Filtrado manual adicional

```typescript
const registrosFiltrados = registros.filter(
  r => r.turno === "am" && r.peso > 10
);
```

**Cuándo usar**: Cuando `getRegistrosByCodigo` no es suficiente.

---

### Patrón: Acciones en cascada

```typescript
// Agregar registro → Listeners se actualizan → Gráfico se actualiza
await addRegistro(nuevoRegistro);
// No necesitas recargar nada, ocurre automáticamente
```

---

## 🔐 Seguridad

### Autenticación (Futuro)

Para agregar autenticación:

```typescript
import { getAuth, signInWithGoogle } from "firebase/auth";

const auth = getAuth(app);
// Luego agregar lógica de login
```

**Nota**: Actualmente NO hay autenticación (datos públicos).

---

### Reglas en Firebase Console

Las reglas permitidas son:

```json
{
  "rules": {
    ".read": true,      // Cualquiera puede leer
    ".write": true,     // Cualquiera puede escribir
    "vacas": {
      ".indexOn": ["codigo"]
    },
    "registros": {
      ".indexOn": ["codigo"]
    }
  }
}
```

**Para producción**: Restricción con autenticación.

---

## 🐛 Debugging

### Ver datos en tiempo real

```typescript
getAllRegistros((data) => {
  console.log("Todos los datos actuales:", data);
});
```

### Logs en consola

```typescript
getRegistrosByCodigo("001", (data) => {
  console.log(`Datos de 001 actualizados: ${data.length} registros`);
  data.forEach(r => {
    console.log(`  ${r.fecha} ${r.hora}: ${r.peso}lb (${r.turno})`);
  });
});
```

### Verificar Firebase está inicializado

```typescript
import { getFirebaseDatabase } from "../core/firebase";

const db = getFirebaseDatabase();
console.log("Database URL:", db.ref().toString());
```

---

## ⚠️ Limitaciones y Notas

### 1. Listeners son permanentes
Una vez activas un listener, se mantiene escuchando hasta que se desmonta el componente.

### 2. Sin autenticación
Actualmente cualquiera puede de Los datos. Para producción, agregar auth.

### 3. Costo de lectura
Firebase cobra por lecturas. `getAllRegistros()` con miles de registros es costoso.

### 4. Índices
Las líneas `.indexOn` mejoran performance de filtrados. Mantenerlas actualizadas.

### 5. Eliminación en cascada
`deleteVaca` elimina la vaca Y sus registros. Operación destructiva.

---

## 📱 Testing

### Test 1: Agregar vaca
```
firebase.addVaca({ id: "TEST", nombre: "Test", codigo: "TEST" })
// Ver en console si ejecuta sin error
```

### Test 2: Escuchar cambios
```
firebase.getVacas((v) => console.log(v))
// Debería loguear la lista al instante
```

### Test 3: Agregar registro
```
firebase.addRegistro({
  codigo: "TEST",
  peso: 10,
  fecha: "08/02/2025",
  hora: "10:00",
  turno: "am"
})
```

---

## 🎓 Recursos Extras

- [Firebase Docs](https://firebase.google.com/docs/database)
- [React + Firebase](https://firebase.google.com/docs/database/web/start)
- [Firebase Realtime DB Best Practices](https://firebase.google.com/docs/database/usage-best-practices)

---

**API v1.0** - Compatible con Firebase SDK 10.x+

Para cambios o preguntas, revisa el código en `src/core/firebase.ts`.

import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
  get,
  query,
  orderByChild,
  equalTo,
  DatabaseReference,
  Query,
} from "firebase/database";

// CAMBIAR ESTAS CONFIGURACIONES CON LOS VALORES DE TU PROYECTO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA957hsegSLJt-ikpPuHkayoOCKZyNCBCM",
  authDomain: "lechefacil-22cf0.firebaseapp.com",
  databaseURL: "https://lechefacil-22cf0-default-rtdb.firebaseio.com",
  projectId: "lechefacil-22cf0",
  storageBucket: "lechefacil-22cf0.firebasestorage.app",
  messagingSenderId: "808227632073",
  appId: "1:808227632073:web:4bb0fe5fa01fdeef2b2e18"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export interface Vaca {
  id: string; // Código único de la vaca
  nombre: string; // OBLIGATORIO
  codigo: string; // OBLIGATORIO
  createdAt: string;
  // Campos opcionales para análisis futuro
  edad?: number; // En años
  raza?: string;
  fechaNacimiento?: string; // dd/mm/yyyy
  pesoInicial?: number; // En kg
  notas?: string;
  activa?: boolean; // true por defecto
}

export interface Registro {
  id?: string;
  codigo: string;
  peso: number; // SIEMPRE en kilogramos (internamente)
  fecha: string; // dd/mm/yyyy
  hora: string; // HH:MM
  turno: string; // am | pm
  timestamp?: number;
}

export type UnidadPeso = "kg" | "lb" | "g" | "t";

// Gestión de Vacas
export async function addVaca(vaca: Vaca): Promise<void> {
  const vacaRef = ref(database, `vacas/${vaca.id}`);
  await set(vacaRef, {
    id: vaca.id,
    nombre: vaca.nombre,
    codigo: vaca.codigo,
    createdAt: new Date().toISOString(),
  });
}

export async function getVacas(callback: (vacas: Vaca[]) => void): Promise<void> {
  const vacasRef = ref(database, "vacas");
  onValue(vacasRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const vacas = Object.values(data) as Vaca[];
      callback(vacas);
    } else {
      callback([]);
    }
  });
}

export async function deleteVaca(vacaId: string): Promise<void> {
  const vacaRef = ref(database, `vacas/${vacaId}`);
  await remove(vacaRef);
  // También eliminar todos sus registros
  const registrosRef = ref(database, `registros`);
  const q = query(
    registrosRef,
    orderByChild("codigo"),
    equalTo(vacaId)
  );
  onValue(q, (snapshot) => {
    snapshot.forEach((child) => {
      remove(child.ref);
    });
  });
}

// Gestión de Registros (Pesajes)
export async function addRegistro(registro: Registro): Promise<void> {
  const registrosRef = ref(database, "registros");
  const newRegistroRef = ref(database, `registros/${Date.now()}`);
  await set(newRegistroRef, {
    ...registro,
    timestamp: Date.now(),
  });
}

export async function getRegistrosByCodigo(
  codigo: string,
  callback: (registros: Registro[]) => void
): Promise<void> {
  const registrosRef = ref(database, "registros");
  onValue(registrosRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const registros = Object.values(data).filter(
        (r: any) => r.codigo === codigo
      ) as Registro[];
      callback(registros);
    } else {
      callback([]);
    }
  });
}

export async function getAllRegistros(
  callback: (registros: Registro[]) => void
): Promise<void> {
  const registrosRef = ref(database, "registros");
  onValue(registrosRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const registros = Object.values(data) as Registro[];
      callback(registros);
    } else {
      callback([]);
    }
  });
}

export async function deleteRegistro(registroId: string): Promise<void> {
  const registroRef = ref(database, `registros/${registroId}`);
  await remove(registroRef);
}

export function getFirebaseDatabase() {
  return database;
}

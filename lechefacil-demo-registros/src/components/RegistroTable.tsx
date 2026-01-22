import React from "react";
import { Registro as RegistroType } from "../core/types";

export type Registro = RegistroType;

const RegistroTable: React.FC<{ registros: Registro[] }> = ({ registros }) => {
  // Ordenar por código, peso, fecha, hora, turno
  const sorted = [...registros].sort((a, b) => {
    // Ordenar por código (alfanumérico)
    if (a.codigo !== b.codigo) return a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
    // Luego por peso (descendente)
    if (a.peso !== b.peso) return b.peso - a.peso;
    // Luego por fecha (asumiendo formato dd/mm/yyyy)
    if (a.fecha !== b.fecha) {
      const [da, ma, ya] = a.fecha.split("/").map(Number);
      const [db, mb, yb] = b.fecha.split("/").map(Number);
      const fa = new Date(ya, ma - 1, da);
      const fb = new Date(yb, mb - 1, db);
      if (fa.getTime() !== fb.getTime()) return fb.getTime() - fa.getTime();
    }
    // Luego por hora (asumiendo formato HH:MM)
    if (a.hora !== b.hora) return b.hora.localeCompare(a.hora);
    // Finalmente por turno (AM/PM)
    return a.turno.localeCompare(b.turno);
  });
  return (
    <div className="overflow-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">Código</th>
            <th className="border px-2 py-1 text-left">Peso (lb)</th>
            <th className="border px-2 py-1 text-left">Fecha</th>
            <th className="border px-2 py-1 text-left">Hora</th>
            <th className="border px-2 py-1 text-left">Turno</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td className="border px-2 py-1" colSpan={5}>
                No hay registros.
              </td>
            </tr>
          )}
          {sorted.map((r) => (
            <tr key={r.id}>
              <td className="border px-2 py-1">{r.codigo}</td>
              <td className="border px-2 py-1">{r.peso.toFixed(2)}</td>
              <td className="border px-2 py-1">{r.fecha}</td>
              <td className="border px-2 py-1">{r.hora}</td>
              <td className="border px-2 py-1">{r.turno}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RegistroTable;

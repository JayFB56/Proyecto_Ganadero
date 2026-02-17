import React from "react";
import { Registro as RegistroType } from "../core/types";

export type Registro = RegistroType;

const RegistroTable: React.FC<{ registros: Registro[] }> = ({ registros }) => {
  const sorted = [...registros].sort((a, b) => {
    const [da, ma, ya] = a.fecha.split("/").map(Number);
    const [db, mb, yb] = b.fecha.split("/").map(Number);

    const [ha, mina] = a.hora.split(":").map(Number);
    const [hb, minb] = b.hora.split(":").map(Number);

    const fechaA = new Date(ya, ma - 1, da, ha, mina);
    const fechaB = new Date(yb, mb - 1, db, hb, minb);

    return fechaB.getTime() - fechaA.getTime();
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

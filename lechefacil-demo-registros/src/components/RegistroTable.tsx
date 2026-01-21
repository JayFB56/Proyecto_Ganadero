import React from "react";

export type Registro = {
  id: string; // unique id (raw line)
  codigo: string;
  peso: number;
  fecha: string;
  hora: string;
  turno: string;
  raw: string;
};

const RegistroTable: React.FC<{ registros: Registro[] }> = ({ registros }) => {
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
          {registros.length === 0 && (
            <tr>
              <td className="border px-2 py-1" colSpan={5}>
                No hay registros.
              </td>
            </tr>
          )}
          {registros.map((r) => (
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

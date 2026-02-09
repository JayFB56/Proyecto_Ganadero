import React, { useState, useEffect } from "react";
import { Vaca, addVaca, deleteVaca, getVacas } from "../core/firebase";

interface CowManagerProps {
  onVacasChange?: (vacas: Vaca[]) => void;
}

const CowManager: React.FC<CowManagerProps> = ({ onVacasChange }) => {
  const [vacas, setVacas] = useState<Vaca[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Suscribir a cambios de vacas
    getVacas((updatedVacas) => {
      setVacas(updatedVacas);
      onVacasChange?.(updatedVacas);
    });
  }, [onVacasChange]);

  const handleAddVaca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !codigo.trim()) {
      alert("Completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const newVaca: Vaca = {
        id: codigo,
        nombre,
        codigo,
        createdAt: new Date().toISOString(),
      };
      await addVaca(newVaca);
      setNombre("");
      setCodigo("");
      setShowForm(false);
    } catch (error) {
      console.error("Error al agregar vaca:", error);
      alert("Error al agregar la vaca");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVaca = async (vacaId: string) => {
    if (window.confirm("¿Eliminar esta vaca y todos sus registros?")) {
      try {
        await deleteVaca(vacaId);
      } catch (error) {
        console.error("Error al eliminar vaca:", error);
        alert("Error al eliminar la vaca");
      }
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Mis Vacas</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? "Cancelar" : "+ Agregar Vaca"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddVaca} className="mb-4 p-4 bg-white dark:bg-slate-800 rounded">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Nombre de la Vaca</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Blanca, Negrita, etc."
              className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Código (ID único)</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej: V001, V002, etc."
              className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? "Agregando..." : "Agregar Vaca"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vacas.length === 0 ? (
          <div className="col-span-full text-center py-6 text-gray-500">
            No hay vacas registradas. Agrega una para comenzar.
          </div>
        ) : (
          vacas.map((vaca) => (
            <div
              key={vaca.id}
              className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-md transition"
            >
              <h3 className="font-bold text-lg mb-1">{vaca.nombre}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Código: {vaca.codigo}</p>
              <button
                onClick={() => handleDeleteVaca(vaca.id)}
                className="w-full px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CowManager;

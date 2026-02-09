import React, { useState, useEffect } from "react";
import { Vaca, addVaca, deleteVaca, getVacas } from "../core/firebase";

interface CowManagerProps {
  onVacasChange?: (vacas: Vaca[]) => void;
}

const CowManagerV2: React.FC<CowManagerProps> = ({ onVacasChange }) => {
  const [vacas, setVacas] = useState<Vaca[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Campos obligatorios
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  
  // Campos opcionales
  const [edad, setEdad] = useState<number | undefined>();
  const [raza, setRaza] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [notas, setNotas] = useState("");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getVacas((updatedVacas) => {
      setVacas(updatedVacas);
      onVacasChange?.(updatedVacas);
    });
  }, [onVacasChange]);

  const limpiarFormulario = () => {
    setNombre("");
    setCodigo("");
    setEdad(undefined);
    setRaza("");
    setFechaNacimiento("");
    setNotas("");
  };

  const handleAddVaca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !codigo.trim()) {
      alert("El código y nombre son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const newVaca: Vaca = {
        id: codigo,
        nombre,
        codigo,
        createdAt: new Date().toISOString(),
        ...(edad && { edad }),
        ...(raza && { raza }),
        ...(fechaNacimiento && { fechaNacimiento }),
        ...(notas && { notas }),
        activa: true,
      };
      await addVaca(newVaca);
      limpiarFormulario();
      setShowForm(false);
    } catch (error) {
      console.error("Error al agregar vaca:", error);
      alert("Error al agregar la vaca");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVaca = async (vacaId: string) => {
    if (window.confirm("¿Eliminar esta vaca y todos sus registros? Esta acción no se puede deshacer.")) {
      try {
        await deleteVaca(vacaId);
      } catch (error) {
        console.error("Error al eliminar vaca:", error);
        alert("Error al eliminar la vaca");
      }
    }
  };

  return (
    <div className="cow-manager">
      {/* Header */}
      <div className="manager-header">
        <div>
          <h2>Administración de Vacas</h2>
          <p className="header-subtitle">Gestiona el inventario de tu rebaño</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`btn-primary ${showForm ? "active" : ""}`}
        >
          {showForm ? "✕ Cancelar" : "+ Nueva Vaca"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleAddVaca} className="vaca-form">
          <div className="form-section">
            <h3>Información Obligatoria</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="codigo">Código *</label>
                <input
                  id="codigo"
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej: V001"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Blanca"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Información Opcional (para análisis)</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="edad">Edad (años)</label>
                <input
                  id="edad"
                  type="number"
                  min="0"
                  max="30"
                  value={edad || ""}
                  onChange={(e) => setEdad(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Ej: 3"
                />
              </div>
              <div className="form-group">
                <label htmlFor="raza">Raza</label>
                <input
                  id="raza"
                  type="text"
                  value={raza}
                  onChange={(e) => setRaza(e.target.value)}
                  placeholder="Ej: Holstein"
                />
              </div>
              <div className="form-group">
                <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
                <input
                  id="fechaNacimiento"
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                />
              </div>
              <div className="form-group full-width">
                <label htmlFor="notas">Notas</label>
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn-submit">
              {loading ? "Guardando..." : "Guardar Vaca"}
            </button>
            <button
              type="button"
              onClick={() => {
                limpiarFormulario();
                setShowForm(false);
              }}
              className="btn-cancel"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista de Vacas */}
      {vacas.length === 0 ? (
        <div className="empty-section">
          <p>No hay vacas registradas aún</p>
          <p className="empty-hint">Crea tu primer vaca para comenzar a registrar producción</p>
        </div>
      ) : (
        <div className="vacas-grid">
          {vacas.map((vaca) => (
            <div key={vaca.id} className="vaca-card">
              <div className="card-header">
                <h3>{vaca.nombre}</h3>
                <button
                  onClick={() => setExpandedId(expandedId === vaca.id ? null : vaca.id)}
                  className="btn-expand"
                  title={expandedId === vaca.id ? "Ocultar detalles" : "Ver detalles"}
                >
                  {expandedId === vaca.id ? "▼" : "▶"}
                </button>
              </div>

              <div className="card-content">
                <p className="card-info">
                  <span className="label">Código:</span>
                  <span className="value">{vaca.codigo}</span>
                </p>

                {expandedId === vaca.id && (
                  <>
                    {vaca.raza && (
                      <p className="card-info">
                        <span className="label">Raza:</span>
                        <span className="value">{vaca.raza}</span>
                      </p>
                    )}
                    {vaca.edad && (
                      <p className="card-info">
                        <span className="label">Edad:</span>
                        <span className="value">{vaca.edad} años</span>
                      </p>
                    )}
                    {vaca.fechaNacimiento && (
                      <p className="card-info">
                        <span className="label">Nacimiento:</span>
                        <span className="value">{vaca.fechaNacimiento}</span>
                      </p>
                    )}
                    {vaca.notas && (
                      <p className="card-info notes">
                        <span className="label">Notas:</span>
                        <span className="value">{vaca.notas}</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="card-actions">
                <button
                  onClick={() => handleDeleteVaca(vaca.id)}
                  className="btn-delete"
                  title="Eliminar vaca y sus registros"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CowManagerV2;

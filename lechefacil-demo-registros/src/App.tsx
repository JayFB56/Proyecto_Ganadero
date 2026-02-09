import "./App.css";

import { useEffect, useState } from "react";
import { UnitsProvider } from "./core/unitsContext";
import CowManagerV2 from "./components/CowManagerV2";
import CowDashboardV2 from "./components/CowDashboardV2";
import GlobalDashboard from "./components/GlobalDashboard";
import UnitsSelector from "./components/UnitsSelector";
import { getVacas, Vaca } from "./core/firebase";

type Seccion = "individual" | "global";

const App = () => {
  const [vacas, setVacas] = useState<Vaca[]>([]);
  const [selectedVaca, setSelectedVaca] = useState<Vaca | null>(null);
  const [loading, setLoading] = useState(true);
  const [seccion, setSeccion] = useState<Seccion>("individual");

  useEffect(() => {
    setLoading(true);
    getVacas((loadedVacas) => {
      setVacas(loadedVacas);
      setLoading(false);
      if (loadedVacas.length > 0 && !selectedVaca) {
        setSelectedVaca(loadedVacas[0]);
      }
    });
  }, []);

  const handleVacasChange = (updatedVacas: Vaca[]) => {
    setVacas(updatedVacas);
    if (updatedVacas.length > 0 && !selectedVaca) {
      setSelectedVaca(updatedVacas[0]);
    }
    if (selectedVaca && !updatedVacas.find((v) => v.id === selectedVaca.id)) {
      setSelectedVaca(updatedVacas.length > 0 ? updatedVacas[0] : null);
    }
  };

  return (
    <UnitsProvider>
      <div className="app-layout">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <div className="header-title-group">
              <h1 className="app-title">LecheFácil</h1>
              <p className="app-subtitle">Dashboard de Producción Lechera</p>
            </div>
            <div className="header-controls">
              <UnitsSelector />
            </div>
          </div>
        </header>

        {/* Main Navigation */}
        <nav className="nav-tabs">
          <div className="nav-container">
            <div className="nav-buttons">
              <button
                onClick={() => setSeccion("individual")}
                className={`nav-btn ${seccion === "individual" ? "active" : ""}`}
              >
                Por Vaca
              </button>
              <button
                onClick={() => setSeccion("global")}
                className={`nav-btn ${seccion === "global" ? "active" : ""}`}
              >
                Visión Global
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="app-main">
          <div className="container">
            {/* Gestor de Vacas */}
            <CowManagerV2 onVacasChange={handleVacasChange} />

            {/* Selección de Vaca (si estamos en vista individual) */}
            {seccion === "individual" && vacas.length > 0 && (
              <div className="cow-selector">
                <div className="selector-header">
                  <span>Selecciona una vaca:</span>
                </div>
                <div className="selector-buttons">
                  {vacas.map((vaca) => (
                    <button
                      key={vaca.id}
                      onClick={() => setSelectedVaca(vaca)}
                      className={`cow-btn ${selectedVaca?.id === vaca.id ? "active" : ""}`}
                    >
                      {vaca.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contenido Principal */}
            {loading ? (
              <div className="loading-section">
                <p>Cargando datos...</p>
              </div>
            ) : seccion === "individual" ? (
              selectedVaca ? (
                <CowDashboardV2 key={selectedVaca.id} vaca={selectedVaca} />
              ) : (
                <div className="empty-section">
                  <p>Crea una vaca para comenzar</p>
                </div>
              )
            ) : (
              <GlobalDashboard vacas={vacas} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>LecheFácil © 2025 - Sistema de Monitoreo de Producción Lechera</p>
        </footer>
      </div>
    </UnitsProvider>
  );
};

export default App;

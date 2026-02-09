import React, { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getAllRegistros, Registro, Vaca } from "../core/firebase";
import { useUnits } from "../core/unitsContext";
import {
  RangoTiempo,
  filtrarPorRango,
  procesarDatos,
  calcularAnalisis,
} from "../utils/dataAnalysis";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface GlobalDashboardProps {
  vacas: Vaca[];
}

type Vista = "produccion" | "comparacion" | "tendencias";

const GlobalDashboard: React.FC<GlobalDashboardProps> = ({ vacas }) => {
  const { convertir, formateo } = useUnits();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [rango, setRango] = useState<RangoTiempo>("mes");
  const [vista, setVista] = useState<Vista>("produccion");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllRegistros((data) => {
      setRegistros(data);
      setLoading(false);
    });
  }, []);

  const registrosFiltrados = filtrarPorRango(registros, rango);

  // Calcular totales globales
  const totalGlobal = registrosFiltrados.reduce((sum, r) => sum + r.peso, 0);
  const promedioDiario = registrosFiltrados.length > 0 ? totalGlobal / registrosFiltrados.length : 0;
  const registrosPorVaca = vacas.map((vaca) => ({
    vaca,
    registros: registrosFiltrados.filter((r) => r.codigo === vaca.codigo),
  }));

  const produccionPorVaca = registrosPorVaca.map((item) => {
    const datosDiarios = procesarDatos(item.registros);
    const analisis = calcularAnalisis(datosDiarios);
    return {
      nombre: item.vaca.nombre,
      codigo: item.vaca.codigo,
      total: analisis.totalProduccion,
      promedio: analisis.promedioDiario,
      registros: item.registros.length,
    };
  });

  const produccionPorVacaOrdenada = [...produccionPorVaca].sort((a, b) => b.total - a.total);

  // Gráfico de producción por vaca (barras)
  const chartProduccion = {
    labels: produccionPorVacaOrdenada.map((p) => p.nombre),
    datasets: [
      {
        label: "Total Producción",
        data: produccionPorVacaOrdenada.map((p) => convertir(p.total)),
        backgroundColor: [
          "#10b981",
          "#3b82f6",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#14b8a6",
          "#6366f1",
        ],
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
      },
    ],
  };

  // Gráfico de evolución global
  const datosDiariosGlobal = procesarDatos(registrosFiltrados);
  const chartEvolucion = {
    labels: datosDiariosGlobal.map((d) => d.fecha),
    datasets: [
      {
        label: "Producción Total",
        data: datosDiariosGlobal.map((d) => convertir(d.total)),
        borderColor: "#059669",
        backgroundColor: "rgba(5, 150, 105, 0.1)",
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Gráfico de tendencias por vaca
  const chartComparacion = {
    labels: datosDiariosGlobal.map((d) => d.fecha),
    datasets: registrosPorVaca
      .filter((item) => item.registros.length > 0)
      .slice(0, 5)
      .map((item, idx) => {
        const datosVaca = procesarDatos(item.registros);
        const colores = [
          "#10b981",
          "#3b82f6",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
        ];
        return {
          label: item.vaca.nombre,
          data: datosDiariosGlobal.map((dGlobal) => {
            const dVaca = datosVaca.find((d) => d.fecha === dGlobal.fecha);
            return dVaca ? convertir(dVaca.total) : 0;
          }),
          borderColor: colores[idx],
          backgroundColor: colores[idx] + "15",
          tension: 0.4,
        };
      }),
  };

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: { usePointStyle: true, padding: 15, font: { size: 12 } },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { size: 11 } },
      },
      x: {
        ticks: { font: { size: 10 } },
      },
    },
  };

  return (
    <div className="global-dashboard">
      {/* Encabezado */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Producción Global</h2>
          <p className="dashboard-subtitle">Resumen de todas las vacas</p>
        </div>
      </div>

      {/* Controles */}
      <div className="controls-section">
        <div className="control-group">
          <label>Período:</label>
          <div className="button-group">
            {(["semana", "mes", "trimestre", "semestre", "año", "todo"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRango(r)}
                className={`btn-control ${rango === r ? "active" : ""}`}
              >
                {r === "semana" && "7 días"}
                {r === "mes" && "1 mes"}
                {r === "trimestre" && "3 meses"}
                {r === "semestre" && "6 meses"}
                {r === "año" && "1 año"}
                {r === "todo" && "Todo"}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Vista:</label>
          <div className="button-group">
            {(["produccion", "comparacion", "tendencias"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`btn-control ${vista === v ? "active" : ""}`}
              >
                {v === "produccion" && "Producción"}
                {v === "comparacion" && "Comparación"}
                {v === "tendencias" && "Tendencias"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Cargando datos...</p>
        </div>
      ) : datosDiariosGlobal.length === 0 ? (
        <div className="empty-state">
          <p>Sin datos de producción en este período</p>
        </div>
      ) : (
        <>
          {/* Métricas Globales */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total del Período</div>
              <div className="metric-value">{formateo(totalGlobal, 1)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Promedio Diario</div>
              <div className="metric-value">{formateo(datosDiariosGlobal.reduce((s, d) => s + d.total, 0) / datosDiariosGlobal.length, 2)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Vacas Activas</div>
              <div className="metric-value">{registrosPorVaca.filter((p) => p.registros.length > 0).length}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Registros</div>
              <div className="metric-value">{registrosFiltrados.length}</div>
            </div>
          </div>

          {/* Contenido por Vista */}
          {vista === "produccion" && (
            <>
              <div className="chart-container">
                <h3>Producción Total por Vaca</h3>
                <div className="chart-wrapper">
                  <Bar data={chartProduccion} options={opciones} />
                </div>
              </div>

              <div className="ranking-table">
                <h3>Ranking de Producción</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Posición</th>
                        <th>Vaca</th>
                        <th>Total</th>
                        <th>Promedio</th>
                        <th>Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produccionPorVacaOrdenada.map((p, idx) => (
                        <tr key={p.codigo}>
                          <td className="rank-number">#{idx + 1}</td>
                          <td className="vaca-name">{p.nombre}</td>
                          <td>{formateo(p.total, 2)}</td>
                          <td>{formateo(p.promedio, 2)}</td>
                          <td>{p.registros}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {vista === "comparacion" && (
            <div className="chart-container">
              <h3>Comparación de Tendencias</h3>
              <div className="chart-wrapper">
                <Line data={chartComparacion} options={opciones} />
              </div>
            </div>
          )}

          {vista === "tendencias" && (
            <div className="chart-container">
              <h3>Evolución de Producción Global</h3>
              <div className="chart-wrapper">
                <Line data={chartEvolucion} options={opciones} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GlobalDashboard;

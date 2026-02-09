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
import { getRegistrosByCodigo, Registro, Vaca } from "../core/firebase";
import { useUnits } from "../core/unitsContext";
import {
  RangoTiempo,
  filtrarPorRango,
  procesarDatos,
  calcularAnalisis,
  generarPrediccion,
  getInterpretacion,
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

interface CowDashboardProps {
  vaca: Vaca;
}

type Vista = "resumen" | "tendencias" | "prediccion" | "historial";

const CowDashboard: React.FC<CowDashboardProps> = ({ vaca }) => {
  const { convertir, formateo } = useUnits();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [rango, setRango] = useState<RangoTiempo>("mes");
  const [vista, setVista] = useState<Vista>("resumen");
  const [loading, setLoading] = useState(true);

  const registrosFiltrados = filtrarPorRango(registros, rango);
  const datosDiarios = procesarDatos(registrosFiltrados);
  const analisis = calcularAnalisis(datosDiarios);
  const prediccion = generarPrediccion(datosDiarios);

  useEffect(() => {
    setLoading(true);
    getRegistrosByCodigo(vaca.codigo, (data) => {
      setRegistros(data);
      setLoading(false);
    });
  }, [vaca.codigo]);

  // Datos para gráfico de líneas (tendencias)
  const chartDataLineas = {
    labels: datosDiarios.map((d) => d.fecha),
    datasets: [
      {
        label: "AM",
        data: datosDiarios.map((d) => convertir(d.am)),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.05)",
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: "PM",
        data: datosDiarios.map((d) => convertir(d.pm)),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.05)",
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: "Total",
        data: datosDiarios.map((d) => convertir(d.total)),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 5,
      },
    ],
  };

  // Datos para gráfico de barras (comparación AM/PM)
  const chartDataBarras = {
    labels: datosDiarios.map((d) => d.fecha),
    datasets: [
      {
        label: "AM",
        data: datosDiarios.map((d) => convertir(d.am)),
        backgroundColor: "#f59e0b",
      },
      {
        label: "PM",
        data: datosDiarios.map((d) => convertir(d.pm)),
        backgroundColor: "#3b82f6",
      },
    ],
  };

  // Datos para predicción
  const chartDataPrediccion = {
    labels: [
      ...datosDiarios.slice(-3).map((d) => d.fecha),
      "Pred +1",
      "Pred +2",
      "Pred +3",
    ],
    datasets: [
      {
        label: "Histórico",
        data: [
          ...datosDiarios.slice(-3).map((d) => convertir(d.total)),
          null,
          null,
          null,
        ],
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
      {
        label: "Predicción",
        data: [null, null, null, ...prediccion.proximo3Dias.map((v) => convertir(v))],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderDash: [5, 5],
        tension: 0.4,
      },
    ],
  };

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12 },
        },
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
    <div className="cow-dashboard">
      {/* Encabezado */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">{vaca.nombre}</h2>
          <p className="dashboard-subtitle">Código: {vaca.codigo}</p>
          {vaca.raza && <p className="dashboard-subtitle">Raza: {vaca.raza}</p>}
          {vaca.edad && <p className="dashboard-subtitle">Edad: {vaca.edad} años</p>}
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
            {(["resumen", "tendencias", "prediccion", "historial"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`btn-control ${vista === v ? "active" : ""}`}
              >
                {v === "resumen" && "Resumen"}
                {v === "tendencias" && "Tendencias"}
                {v === "prediccion" && "Predicción"}
                {v === "historial" && "Historial"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="loading-state">
          <p>Cargando datos...</p>
        </div>
      ) : datosDiarios.length === 0 ? (
        <div className="empty-state">
          <p>Sin datos de producción en este período</p>
        </div>
      ) : vista === "resumen" ? (
        <div className="resumen-view">
          {/* Métricas */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Producción Total</div>
              <div className="metric-value">{formateo(analisis.totalProduccion, 1)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Promedio Diario</div>
              <div className="metric-value">{formateo(analisis.promedioDiario, 2)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Máximo Día</div>
              <div className="metric-value">{formateo(analisis.maximoDia, 2)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Mínimo Día</div>
              <div className="metric-value">{formateo(analisis.minimoDia, 2)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Promedio AM</div>
              <div className="metric-value">{formateo(analisis.promedioAM, 2)}</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Promedio PM</div>
              <div className="metric-value">{formateo(analisis.promedioPM, 2)}</div>
            </div>
          </div>

          {/* Gráfico de líneas */}
          <div className="chart-container">
            <h3>Producción por Turno</h3>
            <div className="chart-wrapper">
              <Line data={chartDataLineas} options={opciones} />
            </div>
          </div>

          {/* Interpretación */}
          <div className="interpretation-card">
            <div className="interpretation-header">
              <span className={`badge ${analisis.tendencia}`}>{analisis.tendencia}</span>
            </div>
            <p>{getInterpretacion(analisis)}</p>
            <p className="interpretation-detail">
              {analisis.diasConDatos} días con datos
              {analisis.variacion > 0 ? ` (+${analisis.variacion}%)` : ` (${analisis.variacion}%)`}
            </p>
          </div>
        </div>
      ) : vista === "tendencias" ? (
        <div className="tendencias-view">
          <div className="chart-container">
            <h3>Comparación AM vs PM</h3>
            <div className="chart-wrapper">
              <Bar data={chartDataBarras} options={opciones} />
            </div>
          </div>

          <div className="chart-container">
            <h3>Evolución Diaria</h3>
            <div className="chart-wrapper">
              <Line data={chartDataLineas} options={opciones} />
            </div>
          </div>
        </div>
      ) : vista === "prediccion" ? (
        <div className="prediccion-view">
          <div className="prediction-info">
            <div className="prediction-header">
              <h3>Próximos 3 Días</h3>
              <span className={`confidence-badge ${prediccion.confianza}`}>
                Confianza: {prediccion.confianza}
              </span>
            </div>

            <div className="prediction-text">
              <p>{prediccion.razon}</p>
            </div>

            <div className="prediction-values">
              {prediccion.proximo3Dias.map((valor, i) => (
                <div key={i} className="prediction-day">
                  <div>Día +{i + 1}</div>
                  <div className="prediction-value">{formateo(valor, 2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-container">
            <h3>Tendencia y Predicción</h3>
            <div className="chart-wrapper">
              <Line data={chartDataPrediccion} options={opciones} />
            </div>
          </div>
        </div>
      ) : (
        <div className="historial-view">
          <div className="table-container">
            <table className="historial-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>AM</th>
                  <th>PM</th>
                  <th>Total</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {datosDiarios.reverse().map((d, i) => (
                  <tr key={i}>
                    <td>{d.fecha}</td>
                    <td>{formateo(d.am, 2)}</td>
                    <td>{formateo(d.pm, 2)}</td>
                    <td className="total-cell">{formateo(d.total, 2)}</td>
                    <td>{formateo(d.promedio, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CowDashboard;

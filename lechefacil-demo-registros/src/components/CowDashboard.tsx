import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { getRegistrosByCodigo, Registro } from "../core/firebase";
import { Vaca } from "../core/firebase";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface CowDashboardProps {
  vaca: Vaca;
}

interface DailyData {
  fecha: string;
  am: number;
  pm: number;
  total: number;
}

const CowDashboard: React.FC<CowDashboardProps> = ({ vaca }) => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRegistrosByCodigo(vaca.codigo, (data) => {
      setRegistros(data);
      procesarDatos(data);
      setLoading(false);
    });
  }, [vaca.codigo]);

  const procesarDatos = (registros: Registro[]) => {
    const dataMap: { [fecha: string]: { am: number; pm: number } } = {};

    registros.forEach((reg) => {
      if (!dataMap[reg.fecha]) {
        dataMap[reg.fecha] = { am: 0, pm: 0 };
      }
      const peso = Number(reg.peso) || 0;
      if (reg.turno?.toLowerCase() === "am") {
        dataMap[reg.fecha].am = Math.max(dataMap[reg.fecha].am, peso); // Última lectura del turno
      } else if (reg.turno?.toLowerCase() === "pm") {
        dataMap[reg.fecha].pm = Math.max(dataMap[reg.fecha].pm, peso);
      }
    });

    // Convertir a array y ordenar por fecha
    const processed = Object.entries(dataMap)
      .map(([fecha, turno]) => ({
        fecha,
        am: turno.am,
        pm: turno.pm,
        total: turno.am + turno.pm,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.fecha.split("/").reverse().join("-"));
        const dateB = new Date(b.fecha.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
      });

    setDailyData(processed);
  };

  const totalProduccion = dailyData.reduce((sum, d) => sum + d.total, 0);
  const promedioDiario = dailyData.length > 0 ? totalProduccion / dailyData.length : 0;

  const chartData = {
    labels: dailyData.map((d) => d.fecha),
    datasets: [
      {
        label: "AM (libras)",
        data: dailyData.map((d) => d.am),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.4,
      },
      {
        label: "PM (libras)",
        data: dailyData.map((d) => d.pm),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "Total (libras)",
        data: dailyData.map((d) => d.total),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `Producción: ${vaca.nombre} (${vaca.codigo})`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Libras",
        },
      },
    },
  };

  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">{vaca.nombre}</h2>
        <p className="text-gray-600 dark:text-gray-400">Código: {vaca.codigo}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Producción</div>
          <div className="text-2xl font-bold">{totalProduccion.toFixed(2)} lb</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">Promedio Diario</div>
          <div className="text-2xl font-bold">{promedioDiario.toFixed(2)} lb</div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded">
          <div className="text-sm text-gray-600 dark:text-gray-400">Registros</div>
          <div className="text-2xl font-bold">{dailyData.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          Cargando datos...
        </div>
      ) : dailyData.length === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-500">
          Sin datos de producción aún
        </div>
      ) : (
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {dailyData.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Historial por Día</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">AM</th>
                  <th className="px-3 py-2 text-right">PM</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((d, idx) => (
                  <tr key={idx} className="border-t border-gray-200 dark:border-slate-700">
                    <td className="px-3 py-2">{d.fecha}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.am.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{d.pm.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{d.total.toFixed(2)}</td>
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

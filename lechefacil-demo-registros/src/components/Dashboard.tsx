import React from "react";
import InfoCard from "./InfoCard";
import ProductionChart from "./ProductionChart";
import useProductionData from "../hooks/useProductionData";
import type { Registro } from "./RegistroTable";
import type { DashboardProps } from "../types/dashboard";

/**
 * Dashboard
 * Layout principal tipo dashboard que muestra tarjetas informativas y la gráfica de producción.
 * Este componente se integra con los datos ya disponibles y NO altera la lógica de sincronización ni el storage.
 */
const Dashboard: React.FC<DashboardProps> = ({ registros, pendingCount = 0 }) => {
  const { points, total, avg, totalToday } = useProductionData(registros, 30);

  const totalRecords = registros.length;
  const avgWeight = registros.length ? registros.reduce((s, r) => s + (Number(r.peso) || 0), 0) / registros.length : 0;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-3">Dashboard — Producción</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <InfoCard title="Registros totales" value={totalRecords} />
        <InfoCard title="Pendientes" value={pendingCount} />
        <InfoCard title="Producción hoy (lb)" value={totalToday.toFixed(2)} />
        <InfoCard title="Peso promedio (lb)" value={avgWeight.toFixed(2)} />
      </div>

      <div className="bg-white dark:bg-slate-800 shadow rounded p-4">
        <div className="text-sm text-slate-500 mb-2">Producción últimos 30 días</div>
        <ProductionChart data={points} />
      </div>
    </div>
  );
};

export default Dashboard;

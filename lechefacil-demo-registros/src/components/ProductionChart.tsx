import React from "react";
import type { DayPoint } from "../types/dashboard";

/**
 * ProductionChart
 * Gráfica SVG ligera (sin dependencias externas) para mostrar la producción diaria.
 * - data: array de { date: 'YYYY-MM-DD', value }
 * - implementa line chart con puntos y etiquetas simples
 */
const ProductionChart: React.FC<{ data: DayPoint[]; height?: number; width?: number }> = ({ data, height = 120, width = 600 }) => {
  if (!data || data.length === 0) return <div className="text-sm text-slate-500">No hay datos de producción.</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const padding = 20;
  const w = Math.max(width, 300);
  const h = height;
  const step = (w - padding * 2) / (data.length - 1 || 1);

  const points = data
    .map((d, i) => {
      const x = padding + i * step;
      const y = h - padding - (d.value / max) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg className="w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Producción">
        <polyline fill="none" stroke="#0ea5e9" strokeWidth={2} points={points} />
        {data.map((d, i) => {
          const x = padding + i * step;
          const y = h - padding - (d.value / max) * (h - padding * 2);
          return <circle cx={x} cy={y} r={2} fill="#0284c7" key={d.date} />;
        })}

        <text x={padding} y={h - 4} fontSize="8" fill="#6b7280">
          {data[0].date.slice(5)}
        </text>
        <text x={w / 2} y={h - 4} fontSize="8" fill="#6b7280" textAnchor="middle">
          {data[Math.floor(data.length / 2)].date.slice(5)}
        </text>
        <text x={w - padding} y={h - 4} fontSize="8" fill="#6b7280" textAnchor="end">
          {data[data.length - 1].date.slice(5)}
        </text>
      </svg>
    </div>
  );
};

export default ProductionChart;

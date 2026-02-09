import React from "react";

type InfoCardProps = {
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  className?: string;
};

/**
 * InfoCard
 * Simple componente de tarjeta informativa usado en el dashboard.
 * Mantiene estilos con Tailwind y es accesible.
 */
const InfoCard: React.FC<InfoCardProps> = ({ title, value, unit, description, className }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 shadow rounded p-4 ${className || ""}`}>
      <div className="text-sm text-slate-500 mb-1">{title}</div>
      <div className="text-2xl font-semibold">
        {value} {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>
      {description && <div className="text-xs text-slate-400 mt-1">{description}</div>}
    </div>
  );
};

export default InfoCard;

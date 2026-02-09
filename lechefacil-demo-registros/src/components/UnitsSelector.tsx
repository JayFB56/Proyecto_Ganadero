import React from "react";
import { useUnits, UnidadPeso } from "../core/unitsContext";

const UnitsSelector: React.FC = () => {
  const { unidad, setUnidad } = useUnits();

  return (
    <div className="units-selector">
      <label htmlFor="unit-select">Unidad de Peso:</label>
      <select
        id="unit-select"
        value={unidad}
        onChange={(e) => setUnidad(e.target.value as UnidadPeso)}
        className="unit-select"
      >
        <option value="kg">Kilogramos (kg)</option>
        <option value="lb">Libras (lb)</option>
        <option value="g">Gramos (g)</option>
        <option value="t">Toneladas (t)</option>
      </select>
    </div>
  );
};

export default UnitsSelector;

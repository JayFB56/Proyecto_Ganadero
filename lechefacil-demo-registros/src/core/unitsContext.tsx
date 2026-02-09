import React, { createContext, useContext, useState, useCallback } from "react";

export type UnidadPeso = "kg" | "lb" | "g" | "t";

interface UnitContextType {
  unidad: UnidadPeso;
  setUnidad: (unidad: UnidadPeso) => void;
  convertir: (kg: number) => number;
  formateo: (valor: number, decimal?: number) => string;
}

const UnitsContext = createContext<UnitContextType | undefined>(undefined);

export const UnitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unidad, setUnidad] = useState<UnidadPeso>("kg");

  // Conversión de kg a la unidad seleccionada
  const convertir = useCallback((kg: number) => {
    switch (unidad) {
      case "kg":
        return kg;
      case "lb":
        return kg * 2.20462;
      case "g":
        return kg * 1000;
      case "t":
        return kg / 1000;
      default:
        return kg;
    }
  }, [unidad]);

  // Formato con símbolo
  const formateo = useCallback((valor: number, decimal: number = 2) => {
    const convertido = convertir(valor);
    const simbolos = { kg: "kg", lb: "lb", g: "g", t: "t" };
    return `${convertido.toFixed(decimal)} ${simbolos[unidad]}`;
  }, [convertir, unidad]);

  return (
    <UnitsContext.Provider value={{ unidad, setUnidad, convertir, formateo }}>
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = () => {
  const context = useContext(UnitsContext);
  if (!context) {
    throw new Error("useUnits debe usarse dentro de UnitsProvider");
  }
  return context;
};

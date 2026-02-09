import { useMemo } from "react";
import type { Registro } from "../components/RegistroTable";
import type { DayPoint } from "../types/dashboard";

/**
 * parseFecha
 * Convierte una fecha en formato `dd/mm/yyyy` a Date, o devuelve null si inválida.
 */
export function parseFecha(fecha: string): Date | null {
  if (!fecha) return null;
  const parts = fecha.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

/**
 * useProductionData
 * Hook que transforma una lista de `Registro` en una serie diaria de producción (suma de `peso`).
 * - Devuelve puntos diarios (últimos `days` días), total, promedio y total del día actual.
 */
export default function useProductionData(registros: Registro[], days = 30) {
  return useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (days - 1));

    const map = new Map<string, { value: number; count: number }>();

    for (let d = 0; d < days; d++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + d);
      const key = dt.toISOString().slice(0, 10);
      map.set(key, { value: 0, count: 0 });
    }

    registros.forEach((r) => {
      const dt = parseFecha(r.fecha);
      if (!dt) return;
      const key = dt.toISOString().slice(0, 10);
      if (!map.has(key)) return;
      const entry = map.get(key)!;
      entry.value += Number(r.peso) || 0;
      entry.count += 1;
    });

    const points: DayPoint[] = Array.from(map.entries()).map(([date, { value, count }]) => ({ date, value: Number(value.toFixed(2)), count }));
    const total = points.reduce((s, p) => s + p.value, 0);
    const avg = points.length ? total / points.length : 0;
    const totalToday = (() => {
      const todayKey = new Date().toISOString().slice(0, 10);
      const p = map.get(todayKey);
      return p ? p.value : 0;
    })();

    return { points, total, avg: Number(avg.toFixed(2)), totalToday };
  }, [registros, days]);
}

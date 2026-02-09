export type DayPoint = { date: string; value: number; count: number };

export interface DashboardProps {
  registros: import("../components/RegistroTable").Registro[];
  pendingCount?: number;
}

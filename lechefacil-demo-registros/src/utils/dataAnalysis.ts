import { Registro } from "../core/firebase";

export type RangoTiempo = "semana" | "mes" | "trimestre" | "semestre" | "año" | "todo";

interface DatoDiario {
  fecha: string;
  am: number;
  pm: number;
  total: number;
  promedio: number;
}

interface Analisis {
  totalProduccion: number;
  promedioDiario: number;
  promedioAM: number;
  promedioPM: number;
  variacion: number; // en %
  tendencia: "mejora" | "estable" | "caida";
  diasConDatos: number;
  diasSinDatos: number;
  maximoDia: number;
  minimoDia: number;
}

interface Prediccion {
  proximo3Dias: number[]; // Array de 3 valores predichos
  confianza: "alta" | "media" | "baja";
  razon: string;
}

// Parsear fecha dd/mm/yyyy a Date
function parseFecha(fecha: string): Date {
  const [d, m, y] = fecha.split("/").map(Number);
  return new Date(y, m - 1, d);
}

// Obtener registros dentro de un rango de tiempo
export function filtrarPorRango(registros: Registro[], rango: RangoTiempo): Registro[] {
  const ahora = new Date();
  const hace = new Date();

  switch (rango) {
    case "semana":
      hace.setDate(ahora.getDate() - 7);
      break;
    case "mes":
      hace.setMonth(ahora.getMonth() - 1);
      break;
    case "trimestre":
      hace.setMonth(ahora.getMonth() - 3);
      break;
    case "semestre":
      hace.setMonth(ahora.getMonth() - 6);
      break;
    case "año":
      hace.setFullYear(ahora.getFullYear() - 1);
      break;
    case "todo":
      hace.setFullYear(1970); // Desde el principio
      break;
  }

  return registros.filter((reg) => {
    const fechaReg = parseFecha(reg.fecha);
    return fechaReg >= hace;
  });
}

// Procesar datos a formato diario
export function procesarDatos(registros: Registro[]): DatoDiario[] {
  const dataMap: { [fecha: string]: { am: number[]; pm: number[] } } = {};

  registros.forEach((reg) => {
    if (!dataMap[reg.fecha]) {
      dataMap[reg.fecha] = { am: [], pm: [] };
    }
    const peso = Number(reg.peso) || 0;

    if (reg.turno?.toLowerCase() === "am") {
      dataMap[reg.fecha].am.push(peso);
    } else if (reg.turno?.toLowerCase() === "pm") {
      dataMap[reg.fecha].pm.push(peso);
    }
  });

  // Convertir a datos diarios con promedios por turno
  const processed = Object.entries(dataMap)
    .map(([fecha, turno]) => {
      const am = turno.am.length > 0 ? turno.am.reduce((a, b) => a + b, 0) / turno.am.length : 0;
      const pm = turno.pm.length > 0 ? turno.pm.reduce((a, b) => a + b, 0) / turno.pm.length : 0;
      const total = am + pm;
      return {
        fecha,
        am: Number(am.toFixed(2)),
        pm: Number(pm.toFixed(2)),
        total: Number(total.toFixed(2)),
        promedio: Number(((am + pm) / 2).toFixed(2)),
      };
    })
    .sort((a, b) => {
      const dateA = parseFecha(a.fecha);
      const dateB = parseFecha(b.fecha);
      return dateA.getTime() - dateB.getTime();
    });

  return processed;
}

// Calcular análisis
export function calcularAnalisis(datos: DatoDiario[]): Analisis {
  if (datos.length === 0) {
    return {
      totalProduccion: 0,
      promedioDiario: 0,
      promedioAM: 0,
      promedioPM: 0,
      variacion: 0,
      tendencia: "estable",
      diasConDatos: 0,
      diasSinDatos: 0,
      maximoDia: 0,
      minimoDia: 0,
    };
  }

  const totalProduccion = datos.reduce((sum, d) => sum + d.total, 0);
  const promedioDiario = totalProduccion / datos.length;
  const promedioAM = datos.reduce((sum, d) => sum + d.am, 0) / datos.length;
  const promedioPM = datos.reduce((sum, d) => sum + d.pm, 0) / datos.length;

  // Calcular variación (últimos 3 días vs primeros 3 días)
  const primerosTres = datos.slice(0, Math.min(3, datos.length));
  const ultimosTres = datos.slice(Math.max(0, datos.length - 3));

  const promPrimeros =
    primerosTres.length > 0 ? primerosTres.reduce((s, d) => s + d.total, 0) / primerosTres.length : 0;
  const promUltimos =
    ultimosTres.length > 0 ? ultimosTres.reduce((s, d) => s + d.total, 0) / ultimosTres.length : 0;

  const variacion =
    promPrimeros > 0 ? Number((((promUltimos - promPrimeros) / promPrimeros) * 100).toFixed(2)) : 0;

  // Tendencia
  let tendencia: "mejora" | "estable" | "caida" = "estable";
  if (variacion > 5) tendencia = "mejora";
  else if (variacion < -5) tendencia = "caida";

  const maximoDia = Math.max(...datos.map((d) => d.total));
  const minimoDia = Math.min(...datos.map((d) => d.total));

  // Días con datos (asumiendo registros diarios)
  const diasConDatos = datos.length;
  const diasSinDatos = 0; // Podría calcularse si se sabe el rango esperado

  return {
    totalProduccion,
    promedioDiario,
    promedioAM,
    promedioPM,
    variacion,
    tendencia,
    diasConDatos,
    diasSinDatos,
    maximoDia,
    minimoDia,
  };
}

// Generar predicción simple (últimos 3 valores)
export function generarPrediccion(datos: DatoDiario[]): Prediccion {
  if (datos.length === 0) {
    return {
      proximo3Dias: [0, 0, 0],
      confianza: "baja",
      razon: "Sin datos disponibles",
    };
  }

  if (datos.length < 3) {
    const promedio = datos.reduce((s, d) => s + d.total, 0) / datos.length;
    return {
      proximo3Dias: [promedio, promedio, promedio],
      confianza: "baja",
      razon: "Datos insuficientes para predicción precisa",
    };
  }

  // Usar últimos 5 datos para tendencia
  const ultimos = datos.slice(Math.max(0, datos.length - 5));
  const valores = ultimos.map((d) => d.total);

  // Calcular pendiente usando regresión simple
  const n = valores.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = valores.reduce((a, b) => a + b, 0);
  const sumXY = valores.reduce((sum, y, i) => sum + (i + 1) * y, 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;

  // Predecir próximos 3 días
  const predicho = [
    Math.max(0, Number((intercepto + pendiente * (n + 1)).toFixed(2))),
    Math.max(0, Number((intercepto + pendiente * (n + 2)).toFixed(2))),
    Math.max(0, Number((intercepto + pendiente * (n + 3)).toFixed(2))),
  ];

  // Confianza basada en consistencia
  const desviacion = Math.sqrt(
    valores.reduce((sum, v) => sum + Math.pow(v - (sumY / n), 2), 0) / n
  );
  const coeficienteVariacion = (desviacion / (sumY / n)) * 100;

  let confianza: "alta" | "media" | "baja" = "media";
  if (coeficienteVariacion < 15) confianza = "alta";
  else if (coeficienteVariacion > 30) confianza = "baja";

  const razon =
    Math.abs(pendiente) < 0.1
      ? "Producción estable"
      : pendiente > 0
        ? `Tendencia de aumento (~${(pendiente * 100).toFixed(1)}% diario)`
        : `Tendencia de caída (~${Math.abs(pendiente * 100).toFixed(1)}% diario)`;

  return { proximo3Dias: predicho, confianza, razon };
}

// Obtener etiqueta de interpretación
export function getInterpretacion(analisis: Analisis): string {
  if (analisis.diasConDatos === 0) return "Sin datos suficientes";

  const tendenciaTexto =
    analisis.tendencia === "mejora"
      ? "Producción en aumento"
      : analisis.tendencia === "caida"
        ? "Producción en descenso"
        : "Producción estable";

  const variacionTexto = Math.abs(analisis.variacion || 0).toFixed(1);

  return `${tendenciaTexto} (${variacionTexto}% en el período)`;
}

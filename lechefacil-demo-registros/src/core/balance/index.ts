

const TRY_PATHS = [
  "/data",
  "/registros.json",
  "/data.json",
  "/"
];

export type DownloadResult = {
  ok: boolean;
  text?: string;
  url?: string;
  status?: number;
  errorType?: "network" | "cors" | "invalid" | "http" | "other";
  error?: any;
};

/* ===========================
   Helper: Timeout Wrapper
   =========================== */
function promiseTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => {
      clearTimeout(t);
      resolve(v);
    }).catch(e => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/* ===========================
   1. Native HTTP (Capacitor)
   Intento prioritario para Móvil (evita CORS)
   =========================== */
async function nativeHttpGet(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; text?: string; status?: number }> {

  const { CapacitorHttp } = await import("@capacitor/core");

  const options = {
    url,
    method: 'GET',
    connectTimeout: 15000,
    readTimeout: 15000,
    headers: {
      'Accept': 'text/plain, application/json', 
    },
  };

  const res = await CapacitorHttp.request(options);

  const data = res.data;
  const text = typeof data === "object" ? JSON.stringify(data) : String(data ?? "");

  return {
    ok: res.status >= 200 && res.status < 300,
    text: text.trim(),
    status: res.status
  };
}

/* ===========================
   2. Web Fetch (Fallback)
   Se usa en Web o si falla el nativo
   =========================== */
async function fetchGet(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; text?: string; status?: number }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      // mode: 'cors' // Normalmente necesario en web, el ESP debe soportarlo
    });

    const text = await res.text();

    return {
      ok: res.ok,
      text,
      status: res.status
    };
  } finally {
    clearTimeout(id);
  }
}

/* ===========================
   Lógica Principal de Descarga
   =========================== */
export async function downloadFromHost(
  host: string,
  timeoutMs = 10000
): Promise<DownloadResult> {
  let lastErr: any = null;
  const baseUrl = host.replace(/\/+$/, "");

  for (const path of TRY_PATHS) {
    const url = baseUrl + path;

    // --- PASO 1: Intentar HTTP Nativo (Sin preguntar plataforma) ---
    try {
      const res = await nativeHttpGet(url, timeoutMs);
      if (res.ok && res.text && res.text.trim().length > 0) {
        return { ok: true, text: res.text, url, status: res.status };
      }
      // Si responde 404 u otro error HTTP, dejamos que intente el fallback por si acaso,
      // o podríamos retornar error aquí. Por robustez, dejamos continuar.
    } catch (e) {
      // Falló la carga del plugin, el método nativo o timeout nativo.
      // Silenciosamente continuamos al fallback (fetch).
    }

    // --- PASO 2: Fallback Web Fetch ---
    try {
      const res = await fetchGet(url, timeoutMs);
      if (res.ok && res.text && res.text.trim().length > 0) {
        return { ok: true, text: res.text, url, status: res.status };
      }

      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      // Clasificación básica de errores para feedback
      const msg = String(e?.message || "").toLowerCase();

      if (/timeout|network|failed to fetch/i.test(msg)) {
        lastErr = { type: "network", error: e };
      } else if (/cors|access-control/i.test(msg)) {
        // Este es el error que Native HTTP soluciona en móvil
        lastErr = { type: "cors", error: e };
      } else {
        lastErr = { type: "other", error: e };
      }
    }
  }

  // Si llegamos aquí, fallaron todos los intentos
  const finalErr = lastErr?.error || lastErr;
  const finalType = lastErr?.type || "other";

  return { ok: false, errorType: finalType, error: finalErr };
}

// Función auxiliar para confirmar conexión
export async function confirmHost(host: string, timeoutMs = 5000): Promise<boolean> {
  const res = await downloadFromHost(host, timeoutMs);
  return res.ok;
}
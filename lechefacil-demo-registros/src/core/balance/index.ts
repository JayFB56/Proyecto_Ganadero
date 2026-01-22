import { getStatus as getNetworkStatus } from "../network";

const TRY_PATHS = ["/data", "/registros.jsonl", "/registros.json", "/data.json", "/"]; // keep same as App

export type DownloadResult = {
  ok: boolean;
  text?: string;
  url?: string;
  status?: number;
  errorType?: "network" | "cors" | "invalid" | "http" | "other";
  error?: any;
};

async function nativeHttpGet(url: string, timeoutMs = 10000): Promise<{ ok: boolean; text?: string; status?: number }> {
  try {
    const { CapacitorHttp } = await import("@capacitor/core");

    const options = {
      method: "GET",
      url: url,
  
    };

    const p = CapacitorHttp.request(options);
    const res = await promiseTimeout(p, timeoutMs) as any;

    const data = res && (res.data ?? res.body);
    const text = typeof data === "string" ? data : JSON.stringify(data);

    return { ok: true, text, status: res?.status };
  } catch (e) {
    console.error("Error en CapacitorHttp:", e);
    throw e;
  }

}

async function fetchGet(url: string, timeoutMs = 10000): Promise<{ ok: boolean; text?: string; status?: number }> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(id);
    const text = await res.text();
    return { ok: res.ok, text, status: res.status };
  } finally {
    clearTimeout(id);
  }
}

function promiseTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function downloadFromHost(host: string, timeoutMs = 10000): Promise<DownloadResult> {
  // try each path
  let lastErr: any = null;
  for (const p of TRY_PATHS) {
    const url = host.replace(/\/+$/, "") + p;
    // Try native HTTP first if running on native platform
    try {
      // Do not rely on internet connectivity; attempt native HTTP even if offline
      const native = await tryNativeHttpGet(url, timeoutMs);
      if (native.ok && native.text && native.text.trim().length > 0) {
        return { ok: true, text: native.text, url, status: native.status };
      } else if (native.ok && (!native.text || native.text.trim().length === 0)) {
        // empty
        lastErr = new Error("empty");
        continue;
      }
    } catch (e) {
      lastErr = e;
      // If native plugin not available or failed, fall back to fetch
    }

    try {
      const f = await fetchGet(url, timeoutMs);
      if (f.ok && f.text && f.text.trim().length > 0) return { ok: true, text: f.text, url, status: f.status };
      if (!f.ok) return { ok: false, errorType: "http", status: f.status, error: new Error(`HTTP ${f.status}`) };
      lastErr = new Error("empty");
    } catch (e: any) {
      // classify
      const msg = String(e?.message || e || "").toLowerCase();
      if (/failed to fetch|networkerror|network request failed/i.test(msg)) {
        return { ok: false, errorType: "network", error: e };
      }
      if (/cors|access-control/i.test(msg)) {
        return { ok: false, errorType: "cors", error: e };
      }
      return { ok: false, errorType: "other", error: e };
    }
  }

  return { ok: false, errorType: "other", error: lastErr };
}

export async function confirmHost(host: string, timeoutMs = 5000): Promise<boolean> {
  // Attempt to call /confirmar on host using the same native/fetch strategy where possible.
  try {
    const url = host.replace(/\/+$/, "") + "/confirmar";
    try {
      const native = await tryNativeHttpGet(url, timeoutMs);
      if (native.ok) return true;
    } catch (e) {
      // ignore
    }

    try {
      const f = await fetchGet(url, timeoutMs);
      return f.ok;
    } catch (e) {
      return false;
    }
  } catch (e) {
    return false;
  }
}

async function tryNativeHttpGet(url: string, timeoutMs: number) {
  // call native plugin but do not fail if plugin missing
  try {
    return await nativeHttpGet(url, timeoutMs);
  } catch (e) {
    throw e;
  }
}

export default { downloadFromHost };

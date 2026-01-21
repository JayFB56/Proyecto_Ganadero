import "./App.css";
import { useEffect, useState } from "react";
import RegistroTable, { Registro } from "./components/RegistroTable";
import { loadRecords, addNewRecords } from "./utils/dataStore";

const DATA_HOST = "http://192.168.4.1";
const TRY_PATHS = ["/data", "/registros.jsonl", "/registros.json", "/data.json", "/"]; // try these in order

const App = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchedPreview, setFetchedPreview] = useState<string | null>(null);

  useEffect(() => {
    // keep local state in sync with localStorage in case other parts update it
    let mounted = true;
    (async () => {
      const stored = await loadRecords();
      if (mounted) setRegistros(stored);
    })();
    return () => { mounted = false };
  }, []);

  const descargarRegistros = async () => {
    setMessage(null);
    setLoading(true);
    let lastErr: any = null;
    try {
      let text: string | null = null;
      const existing = await loadRecords();
      const maxId = existing.reduce((m, r) => {
        const n = Number(r.id);
        return Number.isFinite(n) ? Math.max(m, n) : m;
      }, 0);
      for (const p of TRY_PATHS) {
        const urlWithFrom = `${DATA_HOST}${p}${p.includes("?") ? "&" : "?"}from=${maxId}`;
        const urlsToTry = [urlWithFrom, `${DATA_HOST}${p}`];
        for (const u of urlsToTry) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(u, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) {
              lastErr = new Error(`HTTP ${res.status} at ${u}`);
              console.warn("Descarga: respuesta no OK", u, res.status);
              continue;
            }

            const candidate = await res.text();
            console.info("Descarga: contenido recibido (primeros 200 chars):", candidate?.slice(0,200));
            // set preview to inspect in UI
            setFetchedPreview(candidate?.slice(0,1000) ?? null);
            if (candidate && candidate.trim().length > 0) {
              text = candidate;
              console.info("Descarga: éxito desde", u);
              break;
            } else {
              lastErr = new Error(`Vacío en ${u}`);
              console.warn("Descarga: contenido vacío en", u);
            }
          } catch (e: any) {
            lastErr = e;
            console.warn("Descarga falló en", u, e?.message || e);
            // try next url
          }
          if (text) break;
        }
        if (text) break;
      }

      if (!text) {
        // no successful download
        const isNetwork = lastErr instanceof TypeError || (lastErr && /failed to fetch/i.test(String(lastErr)));
        if (isNetwork) {
          setMessage(
            "Error al descargar (conexión o CORS). Revisa la conexión WiFi al ESP y las cabeceras CORS del servidor."
          );
        } else {
          setMessage(`Error al descargar: ${lastErr?.message || lastErr || "Desconocido"}`);
        }
        return;
      }

      const added = await addNewRecords(text);
      if (added > 0) {
        const all = await loadRecords();
        setRegistros(all);
        // confirm only after succesful save
        try {
          const cRes = await fetch(`${DATA_HOST}/confirmar`);
          if (!cRes.ok) console.warn("Confirm failed", cRes.status);
        } catch (e) {
          console.warn("Error confirmando en ESP:", e);
        }
      }
      setMessage(added > 0 ? `Se añadieron ${added} registros nuevos.` : "No hay registros nuevos.");
    } catch (err: any) {
      setMessage(`Error inesperado: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  // Import button removed: app uses direct fetch + confirm flow with ESP

  return (
    <div className="app-shell p-4">
      <h1 className="text-xl font-bold mb-4">LecheFácil — Registros</h1>

      <div className="mb-4">
        <button
          className="download-btn px-4 py-2 rounded"
          onClick={descargarRegistros}
          disabled={loading}
        >
          {loading ? "Descargando..." : "Descargar registros"}
        </button>
        {/* no import button: app syncs directly with ESP */}
      </div>

      {message && <div className="mb-4 text-sm">{message}</div>}
      {fetchedPreview && (
        <div className="mb-4 text-sm">
          <strong>Depuración — Vista previa de la descarga:</strong>
          <pre className="mt-2 p-2 bg-gray-100 overflow-auto" style={{ maxHeight: 200 }}>
            {fetchedPreview}
          </pre>
        </div>
      )}

      <RegistroTable registros={registros} />
    </div>
  );
};

export default App;

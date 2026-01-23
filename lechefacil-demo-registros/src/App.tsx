import "./App.css";

import { useEffect, useState } from "react";
import RegistroTable, { Registro } from "./components/RegistroTable";
import { loadRecords, addNewRecords } from "./utils/dataStore";
import storage from "./core/storage";
import * as network from "./core/network";
import SyncControl from "./components/SyncControl";
import { downloadFromHost, confirmHost } from "./core/balance";

const DEFAULT_DATA_HOST = "http://192.168.4.1";
const TRY_PATHS = ["/data", "/registros.jsonl", "/registros.json", "/data.json", "/"]; // try these in order

const App = () => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dataHost, setDataHost] = useState(() => {
    return localStorage.getItem("esp32_data_host") || DEFAULT_DATA_HOST;
  });
  const [online, setOnline] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    // keep local state in sync with storage (source of truth)
    let mounted = true;
    (async () => {
      const stored = await loadRecords();
      if (mounted) setRegistros(stored);
      // update pending count
      const all = await storage.getAll();
      const pend = all.filter((s: any) => s.status === "pending").length;
      if (mounted) setPendingCount(pend);
      const st = await network.getStatus();
      setOnline(st);
    })();

    const unsub = network.subscribe((v) => {
      setOnline(v);
      // update pending count when network changes
      (async () => {
        const all = await storage.getAll();
        setPendingCount(all.filter((s: any) => s.status === "pending").length);
      })();
    });

    return () => { mounted = false; unsub(); };
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

      // Use core/balance to download from host; it uses native HTTP when possible (no CORS) and fetch as fallback
      try {
        const res = await downloadFromHost(dataHost);

        if (!res.ok) {
          if (res.errorType === "network") {
            lastErr = new Error("network");
          } else if (res.errorType === "cors") {
            lastErr = new Error("cors");
          } else {
            lastErr = res.error || new Error("unknown");
          }
        } else {
          text = res.text ?? null;
          console.info("Descarga: éxito desde", res.url);
        }
      } catch (e) {
        lastErr = e;
        console.warn("Descarga falló (downloadFromHost)", e);
      }

      if (!text) {
        // no successful download
        const msg = lastErr?.message || String(lastErr || "");
        if (msg === "network") {
          setMessage(
            "Error de red con la Balanza"
          );
        } else if (msg === "cors") {
          setMessage(
            "Error de CORS: la versión web no puede acceder al ESP directamente. Prueba en el dispositivo con la app instalada o configura las cabeceras CORS en el servidor del ESP."
          );
        } else {
          setMessage(`Error al descargar: ${msg}`);
        }
        return;
      }

      const added = await addNewRecords(text);
      if (added > 0) {
        const all = await loadRecords();
        setRegistros(all);
        // update pending count
        try {
          const storedAll = await storage.getAll();
          setPendingCount(storedAll.filter((s: any) => s.status === "pending").length);
        } catch (e) {
          console.warn("Error reading pending count:", e);
        }

        // confirm only after succesful save
        // ... dentro de descargarRegistros ...

        // SUSTITUYE TODO EL BLOQUE DEL TRY ANTERIOR POR ESTE:
        try {
          // Ya no necesitas await import().default
          const res = await downloadFromHost(dataHost);

          if (!res.ok) {
            if (res.errorType === "network") {
              lastErr = new Error("network");
            } else if (res.errorType === "cors") {
              lastErr = new Error("cors");
            } else {
              lastErr = res.error || new Error("unknown");
            }
          } else {
            text = res.text ?? null;
            console.info("Descarga: éxito desde", res.url);
          }
        } catch (e) {
          lastErr = e;
          console.warn("Descarga falló (downloadFromHost)", e);
        }

        // ... y más abajo cuando haces el confirmHost:
        try {
          const ok = await confirmHost(dataHost); // Uso directo
          if (!ok) console.warn("Confirm failed (confirmHost) or not supported");
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



      <div className="mb-4 text-sm">
        <div>Estado de red: <strong>{online ? "Online" : "Offline"}</strong></div>
        <div>Pendientes: <strong>{pendingCount}</strong></div>
      </div>

      {message && <div className="mb-4 text-sm">{message}</div>}

      {/* Sync section (manual) */}
      <div className="mb-4 flex items-center gap-3">
        <SyncControl pending={pendingCount} onSynced={(n) => setMessage(n > 0 ? `Sincronizados ${n} registros` : "Sin registros sincronizados.")} />
        <button
          className="download-btn px-3 py-1 rounded"
          onClick={descargarRegistros}
          disabled={loading}
          title="Iniciar descarga de la balanza"
        >
          {loading ? "Actualizando..." : "Actualizar desde balanza"}
        </button>
      </div>

      <RegistroTable registros={registros} />
    </div>
  );
};

export default App;

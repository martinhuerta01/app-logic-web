import { api } from "@/lib/api";

const DEFAULTS = {
  tipos:        ["INSTALACION", "REVISION", "DESINSTALACION"],
  dispositivos: ["GPS", "LECTORA", "GPS Y LECTORA", "CAMARA", "TRACTOR", "SEMI", "CHASIS"],
  estados:      ["PENDIENTE", "CONFIRMADO", "REALIZADO", "REPROGRAMADO", "SUSPENDIDO", "EVALUADO"],
};

const LS_KEY = "app_opciones_carga";

// ── localStorage (cache local / fallback) ─────────────────────────
function getLocal() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        tipos:        p.tipos        || DEFAULTS.tipos,
        dispositivos: p.dispositivos || DEFAULTS.dispositivos,
        estados:      p.estados      || DEFAULTS.estados,
      };
    }
  } catch {}
  return { ...DEFAULTS };
}

function setLocal(opciones) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(opciones)); } catch {}
}

// ── API (compartida entre todos los usuarios) ─────────────────────
// Requiere endpoint Django: GET/PUT /opciones-carga/
// Si el endpoint no existe, cae silenciosamente a localStorage.

export async function fetchOpciones() {
  try {
    const data = await api.get("/opciones-carga/");
    setLocal(data); // cache local
    return data;
  } catch {
    // Endpoint todavía no disponible → usar localStorage
    return getLocal();
  }
}

export async function persistOpciones(opciones) {
  setLocal(opciones); // guardar siempre localmente
  try {
    await api.put("/opciones-carga/", opciones);
  } catch {
    // Endpoint no disponible → solo localStorage por ahora
  }
}

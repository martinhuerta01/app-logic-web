const DEFAULTS = {
  tipos:        ["INSTALACION", "REVISION", "DESINSTALACION"],
  dispositivos: ["GPS", "LECTORA", "GPS Y LECTORA", "CAMARA", "TRACTOR", "SEMI", "CHASIS"],
  estados:      ["PENDIENTE", "CONFIRMADO", "REALIZADO", "SUSPENDIDO"],
};

const KEY = "app_opciones_carga";

export function getOpciones() {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        tipos:        parsed.tipos        || DEFAULTS.tipos,
        dispositivos: parsed.dispositivos || DEFAULTS.dispositivos,
        estados:      parsed.estados      || DEFAULTS.estados,
      };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveOpciones(opciones) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(opciones));
}

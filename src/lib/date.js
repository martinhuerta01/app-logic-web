const TZ = "America/Argentina/Buenos_Aires";

/** Fecha de hoy en Argentina: "YYYY-MM-DD" */
export function hoyAR() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Mes actual en Argentina (1-12) */
export function mesAR() {
  return parseInt(new Date().toLocaleDateString("en-US", { timeZone: TZ, month: "numeric" }));
}

/** Año actual en Argentina */
export function anioAR() {
  return parseInt(new Date().toLocaleDateString("en-US", { timeZone: TZ, year: "numeric" }));
}

/** Día del mes actual en Argentina (1-31) */
export function diaAR() {
  return parseInt(new Date().toLocaleDateString("en-US", { timeZone: TZ, day: "numeric" }));
}

// Fuente única de módulos y submódulos del menú y de los permisos por usuario.
// El menú lateral (Sidebar) y la pantalla de usuarios leen de acá; agregar un módulo
// en este archivo lo hace aparecer en los dos lugares.

export const MODULOS = [
  {
    key: "servicios", nombre: "Servicios",
    subs: [
      { key: "carga-dia",  href: "/dashboard/carga-dia",  label: "Carga del día" },
      { key: "vista-dia",  href: "/dashboard/vista-dia",  label: "Vista del día" },
      { key: "historial",  href: "/dashboard/historial",  label: "Historial" },
    ],
  },
  {
    key: "personal", nombre: "Personal",
    subs: [
      { key: "horario-tecnico",     href: "/dashboard/personal/horario-tecnico",     label: "Horario Técnico" },
      { key: "historial-camioneta", href: "/dashboard/personal/historial-camioneta", label: "Historial" },
    ],
  },
  {
    key: "contactos", nombre: "Contactos",
    subs: [
      { key: "clientes",          href: "/dashboard/contactos/clientes",          label: "Clientes" },
      { key: "proveedores",       href: "/dashboard/contactos/proveedores",       label: "Proveedores" },
      { key: "tecnicos-talleres", href: "/dashboard/contactos/tecnicos-talleres", label: "Técnicos / Talleres" },
    ],
  },
  {
    key: "estadisticas", nombre: "Estadísticas",
    subs: [
      { key: "dashboard",   href: "/dashboard/estadisticas?tab=dashboard",   label: "Dashboard" },
      { key: "horas",       href: "/dashboard/estadisticas?tab=horas",       label: "Horas trabajadas" },
      { key: "responsable", href: "/dashboard/estadisticas?tab=responsable", label: "Por Responsable" },
      { key: "clientes",    href: "/dashboard/estadisticas?tab=clientes",    label: "Por Cliente" },
      { key: "cruzado",     href: "/dashboard/estadisticas?tab=cruzado",     label: "Reporte cruzado" },
      { key: "stock-kpi",   href: "/dashboard/estadisticas?tab=stock",       label: "Stock KPI" },
      { key: "patentes",    href: "/dashboard/estadisticas?tab=patentes",    label: "Revisiones frecuentes" },
    ],
  },
  {
    key: "stock", nombre: "Stock",
    isDynamic: true,
    subs: [
      { href: "/dashboard/stock/overview", label: "Dashboard" },
      { href: "/dashboard/stock/ubicacion",   label: "Stock por ubicación" },
      { href: "/dashboard/stock/movimientos", label: "Movimientos" },
      { href: "/dashboard/stock/tickets",  label: "Descontar por tickets" },
      { href: "/dashboard/stock/herramientas", label: "Herramientas" },
      { href: "/dashboard/stock/kits",     label: "Kits" },
      { href: "/dashboard/stock/talleres", label: "Mapeo de talleres" },
    ],
  },
  {
    key: "tareas", nombre: "Tickets",
    subs: [
      { key: "tickets",   href: "/dashboard/tareas",           label: "Tickets" },
      { key: "historial", href: "/dashboard/tareas/historial", label: "Historial" },
    ],
  },
  {
    key: "recibos", nombre: "Recibos",
    subs: [
      { key: "recibos", href: "/dashboard/recibos", label: "Recibos de Sueldo" },
    ],
  },
  {
    key: "configuracion", nombre: "Configuración",
    subs: [
      { key: "configuracion", href: "/dashboard/configuracion", label: "Equipos, Ubicaciones, Productos" },
    ],
  },
  {
    key: "exportar", nombre: "Exportar",
    subs: [
      { key: "exportar", href: "/dashboard/exportar-importar", label: "Exportar" },
    ],
  },
];

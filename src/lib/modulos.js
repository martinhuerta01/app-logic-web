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
      { key: "opciones",   href: "/dashboard/opciones-carga", label: "Opciones de carga" },
    ],
  },
  {
    key: "personal", nombre: "Personal",
    subs: [
      { key: "horario-tecnico",     href: "/dashboard/personal/horario-tecnico",     label: "Horario Técnico" },
      { key: "historial-camioneta", href: "/dashboard/personal/historial-camioneta", label: "Historial" },
      { key: "equipos",             href: "/dashboard/personal/equipos",             label: "Equipos" },
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
      { key: "consumo",     href: "/dashboard/estadisticas?tab=consumo",     label: "Consumo de insumos" },
      { key: "patentes",    href: "/dashboard/estadisticas?tab=patentes",    label: "Revisiones frecuentes" },
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
    key: "stock", nombre: "Stock",
    subs: [
      { key: "dashboard",   href: "/dashboard/stock-nuevo/dashboard",   label: "Dashboard" },
      { key: "ubicaciones", href: "/dashboard/stock-nuevo/ubicaciones", label: "Stock por ubicación" },
      { key: "entradas",    href: "/dashboard/stock-nuevo/entradas",    label: "Entradas" },
      { key: "envios",      href: "/dashboard/stock-nuevo/envios",      label: "Envíos" },
      { key: "tickets",     href: "/dashboard/stock-nuevo/tickets",     label: "Importar tickets" },
      { key: "retirados",   href: "/dashboard/stock-nuevo/retirados",   label: "Retirados" },
      { key: "equipos",     href: "/dashboard/stock-nuevo/equipos",     label: "Equipos por serie" },
      { key: "movimientos", href: "/dashboard/stock-nuevo/movimientos", label: "Movimientos" },
      { key: "herramientas", href: "/dashboard/stock-nuevo/herramientas", label: "Herramientas" },
      { key: "kits",        href: "/dashboard/stock-nuevo/kits",        label: "Kits" },
      { key: "talleres",    href: "/dashboard/stock-nuevo/talleres",    label: "Mapeo de talleres" },
      { key: "catalogos",   href: "/dashboard/stock-nuevo/catalogos",   label: "Catálogos" },
    ],
  },
  {
    key: "recibos", nombre: "Recibos",
    subs: [
      { key: "recibos", href: "/dashboard/recibos", label: "Recibos de Sueldo" },
    ],
  },
];

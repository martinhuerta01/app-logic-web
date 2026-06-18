# App Logic Web — Documentación del Proyecto

Aplicación de gestión operativa para empresa de instalaciones GPS/tracking.
Frontend: Next.js 16 + Tailwind. Backend: FastAPI + Supabase (repo separado: App-Logic).

## Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS, `xlsx-js-style` para exportaciones
- **Backend:** FastAPI + Supabase (C:\Users\Tincho\Desktop\App-Logic)
- **Auth:** JWT via `src/lib/auth.js`
- **API client:** `src/lib/api.js` — `api.get/post/put/patch/delete/upload`

## Estructura principal

```
src/app/dashboard/
  estadisticas/        → Estadísticas (dashboard, horas, responsable, clientes, cruzado, stock KPI, patentes)
  personal/
    horario-tecnico/   → Carga movimientos camioneta + ausencias (incluye parser de Excel LogicTracker)
    historial-camioneta/ → Historial de movimientos por mes
  stock/oficina/       → Stock de oficina (actual, entradas, salidas, búsqueda)
  exportar-importar/   → Exportaciones Excel + informe de tickets en .docx
  tareas/              → Sistema de tickets (kanban + lista + panel de detalle con notas)
    historial/         → Tickets resueltos filtrados por período
  recibos/             → Recibos de sueldo (subir PDF bulk, split por empleado, descarga individual)
  admin/usuarios/      → Gestión de usuarios (módulos + sub-módulos por usuario)
src/components/
  Sidebar.js           → Navegación lateral con versión
src/lib/
  auth.js              → AuthContext — expone user, rol, modulos, submodulos
```

## Convenciones importantes

- **Push siempre ambos repos** si hay cambios en backend y frontend
- **Solo frontend** si el cambio es únicamente UI (no tocar App-Logic)
- **Equipos:** Equipo 1 = AB887CX (Maxi, va a LCH), Equipo 2 = AH453YE (Hugo, va a GR)
- **Geocercas relevantes E1:** Casa Maxi, Chutro, LA SE - LONGCHAMPS
- **Geocercas relevantes E2:** Casa Hugo, Chutro, LA SE - GENERAL RODRIGUEZ
- **Chutro** = Oficina en el sistema
- **PUNTOS** del formulario: `["Oficina", "Casa Maxi", "Casa Hugo"]`

## Endpoints clave del backend

```
GET  /equipos/
GET  /movimientos-camioneta/?equipo_id=&mes=&anio=
POST /movimientos-camioneta/
GET  /servicios/?mes=&anio=&tipo=equipos|interior
GET  /stock/actual/?ubicacion_id=
GET  /stock/movimientos/?producto_id=
GET  /directorio/tecnicos
GET  /jornadas/ausencias/
GET  /tareas/?estado=&tipo=&prioridad=
POST /tareas/
PUT  /tareas/{id}
GET  /tareas/{id}/notas/
POST /tareas/{id}/notas/
DELETE /tareas/{id}/notas/{nota_id}
GET  /usuarios/
POST /usuarios/
PUT  /usuarios/{id}
POST /recibos/upload
GET  /recibos/empleados
GET  /recibos/{id}/url
DELETE /recibos/{id}
```

## Módulo de Estadísticas — tabs

| Tab | Ruta |
|-----|------|
| Dashboard | `?tab=dashboard` |
| Horas trabajadas | `?tab=horas` |
| Servicios por Responsable | `?tab=responsable` |
| Servicios por Cliente | `?tab=clientes` |
| Reporte Cruzado | `?tab=cruzado` |
| Stock KPI | `?tab=stock` |
| Revisiones Frecuentes (patentes) | `?tab=patentes` |

## Stock KPI

- Productos monitoreados guardados en `localStorage` bajo key `stock_kpi_watched_v1`
- Calcula consumo diario promedio de los últimos lotes
- Filtra `stock_actual` solo por `ubicaciones.tipo === "oficina"`
- Fecha de compra sugerida = hoy + días restantes - 3 días de anticipación

## Revisiones Frecuentes (patentes)

- Trae servicios REALIZADOS de los últimos 90/180/365 días
- Muestra ciclo completo por patente: INSTALACION → REVISION(es) → DESINSTALACION
- Detecta pares de revisiones con <30 días entre sí
- Línea de tiempo expandible por patente

## Auto-carga de movimientos camioneta (LogicTracker)

- Parser en `horario-tecnico/page.js` — lee Excel del "Reporte de Geocercas" de LogicTracker
- Config en `GEOCERCA_CONFIG` por patente de vehículo
- Lógica: primera Salida base → hora salida; primera Entrada GR/LCH → llegada; última Salida GR/LCH → salida; primera Entrada base post-GR → hora llegada
- Detecta "uso indebido" si hay salida de base después de la hora llegada
- Archivo procesado en el browser, sin credenciales ni backend

## Exportaciones

| Nombre | Descripción |
|--------|-------------|
| Informe de Personal | Horas + productividad por técnico/equipo con ausencias justificadas y balance |
| Stock Oficina | Solo ubicaciones tipo "oficina", ordenado por categoría |
| Servicios del período | Todos los servicios + resumen por responsable |
| Clientes vs Responsables | Tabla cruzada pivot |
| Servicios por Cliente | Filtrable por cliente específico + año/mes |
| Informe de Tickets (.docx) | Selector individual de tickets → Word con portada, resumen y detalle por ticket |

## Módulo de Tickets (tareas/)

- **Tipos:** tarea | investigacion | bug | mejora
- **Estados:** pendiente → en_progreso → completada
- **Número auto-incremental** por ticket (#001, #002…) — campo `numero` en tabla `tareas`
- **Kanban:** 3 columnas, flechas al hover para mover entre estados
- **Lista:** filtrable por estado, tipo, prioridad y búsqueda libre
- **Panel de detalle:** slide-over derecho con metadata, botones avanzar/retroceder, notas
- **Notas/historial:** tabla `ticket_notas` (ticket_id, texto, cargado_por, created_at)
- **Historial:** sub-módulo `/tareas/historial` — solo resueltos, navegable por mes, resumen por tipo

## Administración de Usuarios (admin/usuarios/)

- **Módulos:** lista hardcodeada en `TODOS_MODULOS` — agregar ahí para que aparezca en el modal
- **Sub-módulos:** cada módulo puede tener `subs[]`; al habilitar un módulo aparece ▼ para restringir subs individuales
- Campo `submodulos` JSONB en tabla `usuarios` — `null` = sin restricción, `{ "contactos": ["clientes"] }` = solo esos subs
- Sidebar filtra subs con: `mod.subs.filter(s => submodulos[mod.key].includes(s.key))`
- `auth.js` expone `submodulos` junto con `modulos` (localStorage + context)

## Módulo de Recibos de Sueldo (recibos/)

- **Subir PDF:** drag & drop de PDF con múltiples recibos (1 página por empleado, ORIGINAL + DUPLICADO lado a lado)
- **Backend:** PyMuPDF (`fitz`) extrae texto por página → regex captura nombre (incluyendo Ñ/tildes), legajo y período
- **Storage:** Supabase Storage bucket `recibos-sueldo`, path `{anio}/{mes:02d}/{NOMBRE_SEGURO}.pdf`
- **Upload via httpx** directo (no supabase-py Storage client) con header `x-upsert: true`
- **DB:** tabla `recibos_sueldo` (id, empleado_nombre, legajo, mes, anio, periodo_texto, archivo_path, subido_por)
- **Descarga:** URL firmada (`/storage/v1/object/sign/`) con expiración 1h → `window.open`
- **Vista empleados:** accordion por nombre → lista de períodos → botón descargar por recibo

## Design System (v1.6+)

- **Tokens:** `globals.css` con `@theme {}` (Tailwind v4) — colores brand/sidebar/surface/border
- **Fuentes:** DM Sans (UI), DM Mono (números, fechas, códigos)
- **Sidebar:** fondo `#0a0f1a`, iconos SVG Tabler-style, sub-panel animado con `max-height`
- **Componente Modal:** `src/components/Modal.js` — header gradiente azul, animación `modal-enter`, exports: `BtnPrimary`, `BtnSecondary`, `KeyboardHint`, `FieldLabel`, `FieldInput`, `FieldTextarea`, `FieldSelect`, `ChipGroup`
- **Estilo general:** inline styles con variables CSS; evitar Tailwind para rgba/hover states
- **Tablas:** headers 9.5px uppercase `#94a3b8`, rows hover `#f8fafc`
- **Badges semánticos:** `{ bg, color }` inline — sin clases de color de Tailwind

## Historial de versiones

### v1.7 (Jun 2026)
- Recibos de Sueldo: nuevo módulo — subida de PDF bulk, split por empleado, guardado en Supabase Storage, descarga individual por período
- Exportaciones: informe de tickets en formato Word (.docx) con selector individual de tickets
- Backend: PyMuPDF para extracción de texto PDF, httpx para uploads directos a Supabase Storage

### v1.6 (Jun 2026)
- UI Redesign completo: design system con DM Sans/Mono, brand azul `#2563eb`, sidebar oscuro `#0a0f1a`
- Componente `Modal.js` compartido con primitivas de formulario (FieldInput, ChipGroup, etc.)
- Todos los módulos migrados a inline styles con design system (excepto estadísticas)
- Seguridad backend: JWT en todos los routers, CORS restringido, rate limiting login, logging middleware
- Revisiones Frecuentes: oculta patentes con un solo servicio; muestra Dispositivo en línea de tiempo
- Vista Día: dispositivos del modal editar traídos desde Configuración (no hardcodeados)
- Historial Tickets: filtra por `updated_at`/`created_at` cuando no hay `fecha_vencimiento`

### v1.5 (Jun 2026)
- Tickets: reemplazo completo del módulo de tareas por sistema de tickets (kanban, tipos, categoría, numeración, notas/historial, panel de detalle)
- Tickets: sub-módulo Historial — resueltos filtrados por período con resumen por tipo
- Usuarios: control de sub-módulos por usuario (JSONB `submodulos` en tabla `usuarios`)
- Sidebar: módulo Tareas renombrado a Tickets 🎫

### v1.4 (Jun 2026)
- Estadísticas: Stock KPI por insumo (consumo diario, días restantes, compra sugerida)
- Estadísticas: Revisiones Frecuentes — historial completo por patente con ciclo de vida
- Exportaciones: Informe de Personal (fusión Horas + Productividad con lógica real de estadísticas)
- Exportaciones: Stock solo oficina, filtro "Todos los meses"
- Horario Técnico: auto-carga desde Excel semanal de LogicTracker (parser en browser)
- Historial Camioneta: filtra por mes actual por defecto

### v1.3 (anterior)
- Dashboard de estadísticas, horas trabajadas, reporte cruzado
- Módulo de stock completo (oficina, general, Serenísima)
- Exportaciones iniciales (horas, productividad, stock, servicios, clientes)
- Módulo de tareas privadas por usuario

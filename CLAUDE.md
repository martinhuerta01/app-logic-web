# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (app-logic-web)
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

### Backend (App-Logic)
```bash
cd C:\Users\Tincho\Desktop\App-Logic
uvicorn main:app --reload --port 8001   # Start API server (localhost:8001)
```

## Architecture

**App Logic** is a Spanish-language business operations dashboard for a GPS/device installation services company. It manages: stock inventory, service scheduling, contacts, personnel, tasks, statistics, and data export.

### Stack

**Frontend**
- **Next.js 16.2.3** (App Router, `"use client"` on all interactive pages)
- **React 19.2.4**
- **Tailwind CSS 4**
- **xlsx-js-style 1.2.0** — Excel export with cell styling in `exportar-importar` page
- **Recharts 3** — charts in `estadisticas` page

**Backend** (`C:\Users\Tincho\Desktop\App-Logic`)
- **FastAPI 0.135.1** — REST API, NOT Django
- **Supabase** — PostgreSQL cloud database (credentials in `.env`)
- **PyJWT** — JWT tokens (12-hour expiry)
- **bcrypt** — password hashing
- Base URL: `http://127.0.0.1:8001` (configured via `NEXT_PUBLIC_API_URL`)

### Key frontend patterns

**API calls** — always use `src/lib/api.js`:
```js
import { api } from "@/lib/api";
api.get("/stock/productos/")
api.post("/stock/entradas/", { producto_id, ubicacion_id, cantidad, fecha })
```
Token is read from `localStorage` automatically. 401 auto-redirects to `/`.

**Auth** — `src/lib/auth.js` exposes `useAuth()` hook (`user`, `token`, `login`, `logout`). Wrapped in `AuthProvider` in `src/app/dashboard/layout.js`. User data stored in `localStorage` includes `modulos` array for module-level access control and `rol` (`admin` | `usuario`).

**Keep-alive** — dashboard layout pings backend every 12 minutes to prevent idle disconnect.

**Routing** — all pages are under `src/app/dashboard/`. Dynamic content via URL query params (e.g. `?tab=actual`, `?ub=Camioneta%201`, `?cd=Longchamps`), read with `useSearchParams()`.

**Sidebar** (`src/components/Sidebar.js`) dynamically loads ubicaciones from `/stock/ubicaciones/` and groups them:
- `tipo === "cd"` → La Serenísima submenu
- `tipo === "camioneta"` or `"tecnico"` → General submenu
- `tipo === "oficina"` → fixed Oficina group

**Date helpers** — `src/lib/date.js` exports `hoyAR()`, `mesAR()`, `anioAR` using `America/Argentina/Buenos_Aires` timezone. Use `new Date(dateStr + "T12:00:00Z")` with UTC methods for safe date arithmetic that avoids DST issues.

---

## Frontend Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.js` | Login page |
| `/dashboard` | `src/app/dashboard/page.js` | Main dashboard: KPIs, charts, recent services, quick links |
| `/dashboard/carga-dia` | `carga-dia/page.js` | Daily service batch entry |
| `/dashboard/vista-dia` | `vista-dia/page.js` | Daily service overview |
| `/dashboard/historial` | `historial/page.js` | Service history with filters |
| `/dashboard/tareas` | `tareas/page.js` | Task management — two tabs: Hoy (recurring + urgent) / Todas (full list + calendar) |
| `/dashboard/configuracion` | `configuracion/page.js` | Equipment, locations, products configuration |
| `/dashboard/exportar-importar` | `exportar-importar/page.js` | Excel exports only (Importar removed): Horas, Productividad, Stock, Servicios, Clientes vs Responsables |
| `/dashboard/estadisticas` | `estadisticas/page.js` | Analytics: 5 tabs (dashboard, horas, responsable, clientes, cruzado) |
| `/dashboard/personal/horario-tecnico` | `personal/horario-tecnico/page.js` | Technician schedule tracking |
| `/dashboard/personal/historial-camioneta` | `personal/historial-camioneta/page.js` | Vehicle movement history with observaciones |
| `/dashboard/contactos/clientes` | `contactos/clientes/page.js` | Customer directory |
| `/dashboard/contactos/proveedores` | `contactos/proveedores/page.js` | Supplier directory |
| `/dashboard/contactos/tecnicos-talleres` | `contactos/tecnicos-talleres/page.js` | Technician/workshop contacts |
| `/dashboard/directorio` | `directorio/page.js` | Employee directory (interno/interior/cliente/proveedor) |
| `/dashboard/stock/general` | `stock/general/page.js` | Stock by location (`?ub=` param) |
| `/dashboard/stock/oficina` | `stock/oficina/page.js` | Office stock: 4 tabs (Actual/Entradas/Salidas/Búsqueda) |
| `/dashboard/stock/serenisima` | `stock/serenisima/page.js` | La Serenísima CD stock (`?cd=` param) |
| `/dashboard/admin/usuarios` | `admin/usuarios/page.js` | User management (admin only) |

---

## Module Notes

### Personal

**Horario Técnico** (`personal/horario-tecnico/page.js`) — dos tabs:
- **Movimiento camioneta**: form de carga con selector de técnicos presentes ese día. Técnicos cargados via `/directorio/tecnicos` (solo `tipo=interno`). Los técnicos seleccionados se guardan en `tecnicos_jornada` vía `tecnicos: [{ tecnico_id, presente: true }]`. Si no se selecciona nadie = día normal (estadísticas usan los técnicos por defecto del equipo).
- **Ausencias**: registrar ausencias por técnico con tipo de licencia. Historial filtrable por mes/año con días calculados. Justificadas (Médica/Vacaciones/Personal) acreditan 8h en estadísticas sin generar déficit.

**Historial Camioneta** (`personal/historial-camioneta/page.js`) — tabla de movimientos con columna **Técnicos** mostrando quiénes salieron cada día (pills desde `tecnicos_jornada`). Días normales en gris, días especiales en indigo.

### Estadísticas (`estadisticas/page.js`)
- **5 tabs**: Dashboard, Horas Trabajadas, Servicios por Responsable, Servicios por Cliente, Reporte Cruzado
- **Dashboard tab**: Día/Semana/Mes/Año period selector with ← → navigation, KPIs, bar chart, donut, services table
- **Semana** = Lun–Vie of the selected week; fetches months that overlap and deduplicates by id
- **Reporte Cruzado (Productividad)**: cards per equipo showing Servicios, Horas, Balance + breakdown by type (Instalaciones/Revisiones/Desinstalaciones). Data built client-side from `/movimientos-camioneta/` + `/servicios/` — NOT from `/estadisticas/reporte-cruzado`
- **GR/LCH chart**: ComposedChart with bars (horas trabajadas + horas GR/LCH) + Line (% GR/LCH). Color logic: >70% GR/LCH = green (positive), <55% = red
- **Horas Trabajadas**: tabla día a día por equipo + **Resumen por técnico** al final. Lógica: si movimiento sin `tecnicos_jornada` → horas se atribuyen a los técnicos por defecto del equipo (desde `/directorio/tecnicos`). Si tiene selección → solo a los presentes. Ausencias justificadas del período acreditan 8h/día y aparecen como pills en columna "Aus. justificadas".

### Exportar (`exportar-importar/page.js`)
- Uses `xlsx-js-style` (not plain `xlsx`) for cell styling support
- **5 exports**: Horas Trabajadas, Productividad, Stock Actual, Servicios del mes, Clientes vs Responsables
- **Horas Trabajadas**: one sheet per equipo with daily detail + footer rows (Horas trabajadas / Horas esperadas (8hs × días cargados) / BALANCE in green/red). Includes Observaciones column.
- **Productividad**: built client-side same as estadísticas. Columns include Instalaciones/Revisiones/Desinstalaciones. Hours formatted as HH:MM.
- **Stock Actual**: "Todo" sheet + one sheet per ubicación with totals row
- **Servicios**: sorted by fecha+hora + summary sheet by responsable
- **Clientes vs Responsables**: pivot table + detail sheet
- Helper functions: `minsToHHMM()`, `horasDecToHHMM()`, `balanceDecToHHMM()`, `setColWidths()`, `applyRowStyle()`
- Style constants: `S_HEADER` (indigo bg), `S_TOTAL` (blue-light bg), `S_SUBTOTAL` (gray bg), `S_BALANCE_POS` (green), `S_BALANCE_NEG` (red)

### Tareas (`tareas/page.js`)
- **Tab Hoy**: date navigator (← →), recurring tasks for selected day with completion toggle, urgent/overdue non-recurring tasks section, alert if daily task wasn't completed yesterday
- **Tab Todas**: filters by estado + prioridad, text search, list sorted by priority then due date, calendar toggle (inline, no page change)
- Tab badges: recurring progress (2/3), urgent count (red), total pending (gray)
- Recurring logic: `debeMostrar(tarea, fecha)` handles diaria/semanal/quincenal/mensual with business day adjustments

### Stock Oficina (`stock/oficina/page.js`)
- **4 tabs**: Actual, Entradas, Salidas, Búsqueda
- Entradas/Salidas: historial sorted by date desc, searchable by insumo/código (Salidas also by destino)
- **Búsqueda tab**: unified search across all entradas+salidas for Oficina, filter by tipo (Todos/Entradas/Salidas) and destino dropdown

---

## Backend API Modules

All routers are registered in `main.py`. Backend lives at `C:\Users\Tincho\Desktop\App-Logic`.

### Auth (`/auth`)
```
POST /login          { username, password } → { token, user }
```

### Empleados (`/empleados`)
```
GET    /             list active employees
POST   /             create
PUT    /{id}         update
DELETE /{id}         soft delete (activo=false)
```

### Jornadas (`/jornadas`)
```
POST /               create work day entry
GET  /               list (filter: mes, anio, empleado_id)
GET  /{id}           get one
DELETE /{id}         delete
POST /ausencias/     create absence (fields: empleado_id, nombre, tipo, fecha_desde, fecha_hasta, tipo_licencia)
GET  /ausencias/     list absences (filter: empleado_id)
DELETE /ausencias/{id}  delete absence
GET  /reporte_cruzado/  hours + services summary
```
Tipos de licencia: `Médica`, `Vacaciones`, `Personal`, `Sin aviso`, `Otro`
Justificadas (acreditan 8h en estadísticas): `Médica`, `Vacaciones`, `Personal`

### Stock (`/stock`)
```
GET/POST/PUT/DELETE /productos/
GET/POST/PUT/DELETE /ubicaciones/
GET    /actual/?ubicacion_id=X
PATCH  /actual/{id}/
POST   /entradas/        { producto_id, ubicacion_id, cantidad, fecha, observaciones? }
POST   /transferencias/  { producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha }
GET    /movimientos/
GET/POST/PUT/DELETE /mapeo-serenisima/
POST   /instalacion/     consumes components per recipe
```

### Terceros (`/terceros`)
```
GET    /             list active
POST   /             create (auto-creates location)
PUT    /{id}         update
DELETE /{id}         deactivate
GET    /{id}/stock   stock by third party
```

### Proveedores (`/proveedores`)
```
GET/POST/PUT/DELETE standard CRUD
```

### Equipos (`/equipos`)
```
GET/POST/PUT standard CRUD
```

### Movimientos Camioneta (`/movimientos-camioneta`)
```
GET    /             list (filter: equipo_id, mes, anio) — includes tecnicos_jornada(*, empleados(nombre)) inline
POST   /             create with technician assignments
PUT    /{id}         full update
PATCH  /{id}         partial update
DELETE /{id}         delete (cascades tecnicos_jornada)
GET    /{id}/tecnicos list technicians for movement
```
Fields include: equipo_id, fecha, hora_salida, hora_llegada, punto_inicio, punto_fin, observaciones, cargado_por
`tecnicos` array on POST: `[{ tecnico_id, presente: true }]` — populates `tecnicos_jornada`

### Directorio (`/directorio`)
```
GET    /             list (filter: tipo = interno|interior|cliente|proveedor)
GET    /tecnicos     internal technicians only
GET    /interior     interior employees only
POST   /             create entry
POST   /subresponsable   add sub-contact
PUT    /{id}         update
DELETE /{id}         deactivate
DELETE /subresponsable/{id}
GET    /{id}/subresponsables
```

### Servicios (`/servicios`)
```
GET    /             filter: cliente_ref, cliente, equipo_id, responsable, estado, mes, anio, fecha, tipo
POST   /             create
PUT    /{id}         update
DELETE /{id}         delete
```
`tipo_servicio` values: `INSTALACION`, `REVISION`, `DESINSTALACION`

### Estadísticas (`/estadisticas`)
```
GET /horas                   hours by technician vs base hours
GET /servicios-responsable   services by responsible person
GET /servicios-cliente        services by client
GET /reporte-cruzado          productivity — NOTE: frontend builds this client-side, endpoint not used
GET /cliente-vs-responsable   cross-tabulation
```

### Opciones Carga (`/opciones-carga`)
```
GET /    configuration options (tipos, dispositivos, estados)
PUT /    update configuration
```

### Usuarios (`/usuarios`)
```
GET    /             list users (no passwords)
POST   /             create (bcrypt hash)
PUT    /{id}         update rol, modulos, activo, password
```

### Tareas (`/tareas`)
```
GET    /                     list (filter: estado, prioridad, fecha_vencimiento)
POST   /                     create
PUT    /{id}                  update
DELETE /{id}                  delete
GET    /completaciones/       list completions
POST   /completaciones/       mark complete (for recurring tasks)
DELETE /completaciones/       remove completion
```

---

## Key Data Models (Supabase tables)

| Table | Key fields |
|-------|-----------|
| `usuarios` | nombre, password_hash, rol (admin\|usuario), modulos[], activo |
| `empleados` | nombre, telefono, dni, zona, vehiculo, patente, activo, tipo (interno\|...), equipo_id |
| `equipos` | nombre, patente, activo |
| `jornadas` | empleado_id, fecha, tipo_asistencia, horas, instalaciones, desinstalaciones |
| `ausencias` | empleado_id, nombre, tipo, fecha_desde, fecha_hasta, tipo_licencia, motivo, cargado_por |
| `servicios` | fecha, equipo_id, responsable, cliente, tipo_servicio (INSTALACION\|REVISION\|DESINSTALACION), dispositivo, patente, estado |
| `movimientos_camioneta` | equipo_id, fecha, hora_salida, hora_llegada, punto_inicio, punto_fin, observaciones, cargado_por |
| `tecnicos_jornada` | movimiento_id, tecnico_id, presente, motivo_ausencia |
| `productos` | codigo, descripcion, categoria, proveedor_id, activo |
| `ubicaciones` | nombre, tipo (OFICINA\|CD\|GENERAL) |
| `stock_actual` | producto_id, ubicacion_id, cantidad |
| `movimientos` | tipo (ENTRADA\|SALIDA\|TRANSFERENCIA\|INSTALACION), producto_id, origen_id, destino_id, cantidad, fecha |
| `terceros` | nombre, ciudad, telefono, email, empresa, activo |
| `proveedores` | nombre, responsable, telefono, email, productos_que_vende, activo |
| `directorio` | nombre, tipo (interno\|interior\|cliente\|proveedor), empresa, base, activo |
| `subresponsables` | contacto_id, nombre, celular, email |
| `tareas` | titulo, descripcion, fecha_vencimiento, prioridad, estado, asignado_a, es_recurrente, frecuencia (diaria\|semanal\|quincenal\|mensual) |
| `tareas_completadas` | tarea_id, fecha, completado_por |
| `configuracion_opciones` | clave, valor |

---

## Deployment

- **Frontend**: Vercel auto-deploys from `main` branch of `github.com/martinhuerta01/app-logic-web`. Push to `main` to deploy.
- **Backend**: Runs locally. No cloud deployment currently.
- Always push frontend and backend repos together when making changes to both.

## Timezone

All dates use `America/Argentina/Buenos_Aires` timezone throughout the app.

## Version History

- **v1.5** (2026-05-29): Búsqueda de historial cross-month (todo el año, sin filtrar por mes), Export "Servicios por Cliente" (filtro por nombre parcial + año/mes opcional, Excel con listado + resumen), Stock Oficina Salidas en bloque (Destino y Fecha fijos, múltiples filas de insumos con Enter para agregar fila)
- **v1.4** (2026-05-21): Módulo Personal renovado — Ausencias (tab en Horario Técnico con tipos de licencia, historial filtrable, DELETE backend), Técnicos por movimiento (selección en formulario, columna en Historial Camioneta), Estadísticas Horas con resumen individual por técnico (día normal = equipo completo, día especial = solo seleccionados, ausencias justificadas acreditan 8h sin generar déficit)
- **v1.3** (2026-05-18): Dashboard tab en estadísticas, Reporte Cruzado cards con tipos de servicio, Stock Oficina tab Búsqueda, Exportar rediseñado (5 exports con xlsx-js-style, sin Importar), Tareas rediseñado (tabs Hoy/Todas)
- **v1.2**: Tareas recurrentes con lógica de días hábiles, ubicaciones simplificadas (OFICINA/CD/GENERAL), fix timezone Argentina

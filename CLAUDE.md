# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Architecture

**App Logic** is a Spanish-language business dashboard for managing GPS/device installation services. It handles stock inventory, service scheduling, contacts, personnel, statistics, and data import/export.

### Stack
- **Next.js 16.2.3** (App Router, `"use client"` on all interactive pages)
- **Tailwind CSS 4**
- **XLSX 0.18.5** — Excel import/export in `exportar-importar` page
- **Recharts 3** — charts in `estadisticas` page
- Backend: external Django REST API, configured via `NEXT_PUBLIC_API_URL` (default `http://127.0.0.1:8001`)

### Key patterns

**API calls** — always use `src/lib/api.js`:
```js
import { api } from "@/lib/api";
api.get("/stock/productos/")
api.post("/stock/entradas/", { producto_id, ubicacion_id, cantidad, fecha })
```
Token is read from `localStorage` automatically. 401 auto-redirects to `/`.

**Auth** — `src/lib/auth.js` exposes `useAuth()` hook (`user`, `token`, `login`, `logout`). Wrap pages in `AuthProvider` (done in `src/app/dashboard/layout.js`).

**Routing** — all pages are under `src/app/dashboard/`. Dynamic content is passed via URL query params (e.g. `?tab=actual`, `?ub=Camioneta%201`, `?cd=Longchamps`), read with `useSearchParams()`.

### Stock module structure

- `stock/oficina/page.js` — 3 tabs (Actual / Entradas / Salidas), all in one file with 3 sub-components
- `stock/serenisima/page.js` — reads `?cd=` param; uses `/mapeo-serenisima/` to translate internal codes to Serenísima codes
- `stock/general/page.js` — reads `?ub=` param; shows transfers from Oficina to that location

**Sidebar** (`src/components/Sidebar.js`) dynamically loads ubicaciones from `/stock/ubicaciones/` and groups them:
- `tipo === "cd"` → La Serenísima submenu
- `tipo === "camioneta"` or `"tecnico"` → General submenu
- `tipo === "oficina"` → always shown as the fixed Oficina group

### Backend endpoints used
```
GET  /stock/productos/
GET  /stock/ubicaciones/
GET  /stock/actual/?ubicacion_id=X
GET  /stock/movimientos/
POST /stock/entradas/      { producto_id, ubicacion_id, cantidad, fecha, observaciones? }
POST /stock/transferencias/{ producto_id, ubicacion_origen_id, ubicacion_destino_id, cantidad, fecha }
GET  /mapeo-serenisima/    (fallback: /stock/mapeo-serenisima/)
```

### Deployment
Vercel auto-deploys from `main` branch of `github.com/martinhuerta01/app-logic-web`. Push directly to `main` to deploy.

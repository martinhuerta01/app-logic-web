# Plan de mejoras de la aplicación

Documento de análisis y propuesta. Resultado de la Fase 0 (exploración de ambos repositorios, sin modificar código) y de la Fase 1 (este plan). **No se implementó nada.** Se espera tu aprobación antes de avanzar.

Cómo leerlo: la sección 1 resume todo en una página; la sección 2 muestra lo que encontré en el código y en los datos reales; la sección 4 analiza cada módulo; la sección 6 responde una por una las diez preguntas abiertas; la sección 7 ordena el trabajo por fases; la sección 8 lista las decisiones que necesito que apruebes.

Palabras técnicas, explicadas una vez:
- **Backend**: la parte del servidor (recibe pedidos, valida reglas de negocio y habla con la base de datos). Repositorio `App-Logic`.
- **Frontend**: la parte visual que se abre en el navegador. Repositorio `app-logic-web`.
- **Migración**: un cambio versionado y reversible de la estructura de la base de datos (tablas y columnas), guardado como archivo para poder repetirlo o deshacerlo.
- **Ruta del servidor**: una dirección del backend que devuelve o guarda datos (por ejemplo, la que devuelve la lista de servicios).
- **Archivo PDF**: formato de documento portátil, el que se abre igual en cualquier dispositivo.

---

## 1. Resumen ejecutivo

1. **La aplicación está completa en funciones, pero tiene tres problemas de fondo que conviene resolver primero**, porque todo lo demás se apoya en ellos:
   - **Datos sin identificador confiable.** En los 2053 servicios cargados, la columna que enlaza con el cliente (`cliente_ref`) está vacía en el 100 % de los casos. Los clientes se guardan como texto libre: hay 130 escrituras distintas que corresponden a 20 empresas con sus bases (89 combinaciones de empresa y base en Contactos) (por ejemplo "La Serenisima / LD", "LA SERENISIMA LD" y "LA SERENISIMA DIS"). Lo mismo pasa con los responsables ("VITACO (German)" y "VITACO German") y en el 26 % de los servicios el responsable está vacío. Hoy los reportes lo arreglan dentro del navegador con una limpieza de texto; con datos así ningún reporte ni ninguna inteligencia artificial futura va a ser confiable.
   - **Los cálculos de Estadísticas están duplicados y el servidor no se usa.** El backend tiene un módulo completo de estadísticas que el frontend **no llama nunca**. Cada pestaña descarga los datos crudos y recalcula todo en el navegador, con fórmulas que ya divergieron.
   - **Falta control de acceso en el servidor.** Cualquier usuario con sesión iniciada puede llamar cualquier ruta, incluida la creación de usuarios: la restricción por módulo existe solo en la parte visual. Esto es un riesgo real y, además, bloquea la idea de que cada persona vea solo sus recibos.
2. **Hay trabajo tuyo sin guardar en control de versiones**: todo lo de Stock de esta semana (ambos repositorios) está sin confirmar. Y las migraciones de Stock se ejecutaron a mano en Supabase y no quedaron como archivos en ningún repositorio. Es lo primero que hay que asegurar.
3. **"Servicios del día" no suma** porque es un número aislado. Propongo reemplazar el Dashboard por una pantalla de decisiones: lo pendiente de cerrar (con antigüedad), la agenda de hoy y mañana con alertas, el cumplimiento del mes contra el mes anterior en igualdad de fecha, y las alertas de unidades, stock y horas.
4. **Una sola carga de tickets, varios usos.** Propongo guardar cada ticket de la plataforma de Logictracker una única vez en una tabla propia y usarlo para tres cosas: descontar stock, marcar servicios como realizados y armar el historial por unidad con su descripción. Es la mejora de mayor impacto que no mencionaste.
5. **"Mandar al grupo" de WhatsApp**: el envío automático a un grupo existente no es viable de forma oficial. La mejor alternativa es generar una tarjeta-imagen pensada para celular con vista previa y compartirla con la función nativa de compartir del teléfono (o copiar y pegar en computadora). Es simple, gratuita y confiable.
6. **Recibos**: dejar de depender del formato. Identificar a cada persona contra el listado de Personal (por número de identificación laboral y por nombre), con vista previa y confirmación; las páginas no reconocidas se asignan a mano. No enviar los recibos a un servicio externo de inteligencia artificial por ser datos sensibles.
7. **Configuraciones y Exportar dejan de ser módulos** y se reparten: cada cosa va al módulo al que pertenece y cada pantalla tiene su botón de exportar. Lo que quede realmente global (parámetros) pasa a Administración, que sigue siendo el último ítem del menú.
8. **Tickets internos**: se usaron 17 veces entre el 30 de abril y el 6 de julio, ninguno nuevo en tres meses. Recomiendo transformarlo en "Proyecto" (con alertas automáticas que hoy no existen) y cambiarle el nombre, porque hoy se confunde con los tickets de la plataforma.
9. **La estructura queda preparada para inteligencia artificial**: identificadores estables, un maestro de clientes y de responsables, tickets guardados, historial de cambios y un único lugar donde se calculan los indicadores.

### Tabla resumen por módulo

| Módulo | Propuesta en una línea | Esfuerzo | Fase |
|---|---|---|---|
| Servicios: Carga del día | Regla anti-duplicado en el servidor, localidad automática, carga más rápida | Medio | B |
| Servicios: Vista del día | Tarjeta para compartir; cruce con tickets para pasar a REALIZADO | Alto | D |
| Servicios: Historial | Sin cambios; solo botón de exportar | Bajo | B |
| Personal | Fuente de verdad de zona, equipo, jornada y datos para recibos | Medio | F |
| Contactos | Búsqueda global, etiquetas, ficha de taller, maestro de clientes | Medio | F |
| Estadísticas: Dashboard | Rediseño hacia decisiones y alertas | Alto | E |
| Estadísticas: Horas trabajadas | Exclusiones compartidas, informe mensual con horas y productividad | Medio | E |
| Estadísticas: Reportes cruzados | Productividad comparable, talleres del interior, rediseño de Equipo 2 contra bases | Alto | E |
| Estadísticas: Indicadores de Stock | Eliminar de Estadísticas; integrar al Stock | Bajo | C |
| Estadísticas: Revisiones frecuentes | Pasar a "Unidades" con ficha por patente y número de serie | Alto | E |
| Stock | Carga inicial con plantilla, instructivo, unificar Camioneta con Equipo | Alto | C |
| Tickets | Transformar en "Proyecto" | Medio | F |
| Recibos | Identificación independiente del formato | Alto | F |
| Configuraciones | Repartir y eliminar como módulo | Medio | B |
| Exportar | Reemplazar por botones contextuales | Medio | B |
| Administración | Sin cambios visibles; último ítem del menú | Bajo | A |

---

## 2. Hallazgos de la exploración (Fase 0)

### 2.1 Cómo está armada

- **Backend** (`App-Logic`): FastAPI (marco de trabajo para servidores) y Supabase (base de datos). 24 tablas detectadas. Cada módulo es un archivo de rutas dentro de `routers/`, con modelos de validación en `models/`.
- **Frontend** (`app-logic-web`): Next.js 16, React 19, Tailwind 4, gráficos con Recharts, exportaciones con `xlsx-js-style` y `docx`. El menú lateral se define en `src/components/Sidebar.js`.
- **Convenciones que se respetan** (leídas en los documentos de instrucciones de cada repositorio): estilos inline con el sistema de diseño en el frontend; en el backend, modelos de creación y de actualización, rutas con prefijo solo en `main.py`, todo router con verificación de sesión, nombres en español.
- **Importación de archivos**: se procesan en el navegador (los Excel de tickets y de geocercas). El servidor solo procesa directamente los archivos PDF de recibos.
- **No existe** ningún mecanismo de notificaciones, correo electrónico o WhatsApp (búsqueda confirmada en todo el backend y el frontend).

### 2.2 Datos reales observados (consulta de solo lectura a la base)

| Dato | Valor | Qué implica |
|---|---|---|
| Servicios cargados | 2053 (del 2 de enero al 28 de septiembre de 2026) | Volumen suficiente para reportes reales |
| Estados | 1824 realizados, 95 pendientes, 63 evaluados, 17 reprogramados, 11 confirmados, 6 suspendidos, 37 sin estado | Hay 95 pendientes: revisar cuáles son deuda de cierre |
| Servicios con enlace al cliente (`cliente_ref`) | 0 | El cliente es texto libre |
| Clientes | 130 escrituras de texto que corresponden a 20 empresas; en Contactos hay 89 filas porque cada fila es una empresa con una de sus bases (por ejemplo, Enel 22, Quilmes Distribuidores 18, La Serenisima 13) | Hace falta un maestro de clientes de dos niveles: empresa y bases |
| Servicios sin responsable | 526 (26 %) | Se resuelve hoy por el vehículo, pero es frágil |
| Responsables con variantes | "VITACO (German)" contra "VITACO German", "OTRO" | Hace falta enlazar a Contactos |
| Servicios repetidos (misma patente, tipo y fecha) | 5 casos, los 5 copias exactas | La regla anti-duplicado propuesta es correcta y detecta errores reales |
| Patente con espacio al final | Al menos 1 caso ("AI339ZN ") | Normalizar patentes al guardar |
| Contactos | 89 clientes, 17 técnicos del interior, 4 internos, 2 proveedores | Todos los técnicos del interior tienen localidad cargada, así que el autocompletado es viable |
| Tickets internos (módulo Tickets) | 17 en total; 9 completados, 6 en progreso, 2 pendientes; creados entre el 30 de abril y el 6 de julio | Uso bajo y sin novedades hace tres meses |
| Recibos de sueldo cargados | 40 | Pocos: la migración de formato es de bajo riesgo |
| Equipos | 5 | Equipo 1 y Equipo 2 más otros (supuesto: no verifiqué los nombres) |
| Movimientos de camioneta | 269 | Base para horas trabajadas |

### 2.3 Deuda técnica y riesgos, ordenados por gravedad

| # | Hallazgo | Evidencia | Riesgo | Propuesta |
|---|---|---|---|---|
| 1 | Sin control de acceso por rol en el servidor | `auth_middleware.py` solo valida que la sesión sea válida; rol y módulos se leen únicamente en `auth.py` y `usuarios.py` | Alto | Fase A: verificar rol y módulo en cada ruta sensible |
| 2 | El esquema de la base no está versionado | No hay carpeta de migraciones ni archivos de instrucciones de base en ningún repositorio | Alto | Fase A: carpeta `migraciones/` con archivos numerados que se pueden aplicar y deshacer |
| 3 | Trabajo de Stock sin confirmar | `git status` muestra archivos modificados y nuevos en ambos repositorios | Alto | Fase A: confirmar en una rama y subir los dos repositorios juntos (convención del proyecto) |
| 4 | Estadísticas del servidor sin usar | Ninguna llamada a rutas de estadísticas en `src/` | Medio | Fase E: el servidor pasa a ser la única fuente de cálculo |
| 5 | Cliente y responsable como texto libre | 0 de 2053 servicios con enlace; 130 escrituras para 20 empresas con sus bases | Alto | Fase B/F: maestro de clientes y de responsables, con migración de datos históricos |
| 6 | Sin validación anti-duplicado en el servidor | `routers/servicios.py`, función de creación, inserta sin verificar; en cambio jornadas sí valida | Medio | Fase B |
| 7 | Consultas sin paginación | Los listados hacen `select("*")` sin límite | Medio | Fase E: agregaciones en la base y paginación en listados largos |
| 8 | Exclusiones de horas y lista de productos vigilados en Indicadores de Stock, guardadas en el navegador | Claves `horas_excluidos_*` y `stock_kpi_watched_v1` en el almacenamiento local | Medio | Fase E/C: guardar en la base para que se compartan y queden auditadas |
| 9 | Datos fijos en el código | Puntos "Casa Maxi", "Casa Hugo"; geocercas por patente; nombre literal "Equipo 2"; años 2025 a 2027; jornada de 8 horas; anticipación de 3 días | Medio | Pasar a catálogos y parámetros editables |
| 10 | Archivos gigantes | `estadisticas/page.js` (2195 líneas), `exportar-importar/page.js` (1103), `stock/oficina/page.js` (1032), `tareas/page.js` (882) | Medio | Dividir al rediseñar cada módulo |
| 11 | Lógica de consumo de stock duplicada | Estadísticas (Indicadores de Stock) y `stock/overview` calculan lo mismo por separado | Bajo | Fase C: una sola función |
| 12 | Código sin uso | Página `directorio` sin enlace; router `terceros` sin llamadas encontradas con barra final (verificar antes de borrar); ruta de cruce de jornadas sin llamadas | Bajo | Fase A: revisar y eliminar |
| 13 | Documentación desactualizada | El documento de instrucciones del backend menciona un frontend anterior (`Logic/`, `rxconfig.py`) que ya no existe | Bajo | Fase A: actualizar |
| 14 | Archivos compilados versionados | Archivos `__pycache__` figuran modificados en el control de versiones | Bajo | Fase A: quitarlos del control de versiones |
| 15 | Ruta de opciones acepta cualquier contenido | `opciones_carga.py`, actualización sin modelo de validación | Bajo | Fase B: validar |
| 16 | Sesión de 12 horas sin renovación | `auth.js` solo reacciona al rechazo del servidor | Bajo | Fase A: renovación silenciosa |
| 17 | Sin pruebas automáticas | No hay carpeta de pruebas | Medio | Pruebas para las reglas críticas (duplicados, cruce de tickets, interpretación de tickets, recibos) |
| 18 | Accesibilidad | Elementos clickeables sin rol, cuadros de confirmación nativos del navegador, botones de solo ícono sin nombre | Bajo | Mejora transversal |

### 2.4 Supuestos y cosas que no pude verificar

Estas afirmaciones no salen del código o de los datos y hay que confirmarlas:

1. **Multiempresa.** Pediste respetar el esquema multiempresa, pero **no existe** en el código: no hay identificador de empresa ni tabla de organizaciones. Supongo que la aplicación es de una sola empresa. Si en el futuro se necesitan varias, se agrega un identificador de organización; recomiendo no construirlo ahora (ver decisión 1).
2. **Carga de servicios.** Supongo que la pantalla de carga envía un pedido por fila (no vi todo el código de envío).
3. **Localidad de técnicos del interior.** Verificado: los 17 la tienen cargada.
4. **Tarifas por tipo de servicio.** El modelo de Contactos tiene precios por instalación básica, chasis, tracto, semi, revisión, desinstalación y cámara. Supongo que el campo "dispositivo" del servicio (chasis, semi, tractor) permite vincular cada servicio con su tarifa.
5. **Hospedaje.** Por los mensajes de confirmaciones anteriores, supongo frontend en Vercel y backend en Render. Determina cómo programar tareas automáticas.
6. **Límites actuales de WhatsApp.** Las capacidades de grupos de la interfaz oficial de WhatsApp para empresas cambian seguido; lo que digo en la pregunta 1 está basado en lo conocido y debe verificarse antes de comprometer algo.
7. **Uso real de rutas "sin llamadas".** Se buscó por texto; puede haber llamadas armadas dinámicamente. Verificar antes de borrar.
8. **Nombres de los 5 equipos** y su relación con Camioneta 1 y Camioneta 2 de Stock.

---

## 3. Fase A: cimientos (antes de cualquier módulo)

Nada de esto cambia lo que ves, pero evita perder trabajo y hace posible todo lo demás.

| Aspecto | Detalle |
|---|---|
| Situación actual | Trabajo de Stock sin confirmar; migraciones ejecutadas a mano y no versionadas; sin control de rol en el servidor; documentos desactualizados |
| Propuesta | 1) Confirmar el trabajo de Stock en la rama `stock/importacion-de-tickets` en ambos repositorios y subirlos juntos.<br>2) Crear `migraciones/` en el backend con archivos numerados, cada uno con su instrucción de aplicar y de deshacer. Las migraciones de Stock de esta semana se reconstruyen desde el plan guardado.<br>3) Verificar rol y módulo en el servidor (por ejemplo, crear usuarios solo para administración).<br>4) Quitar `__pycache__` del control de versiones, borrar código sin uso, actualizar documentos.<br>5) Crear los componentes compartidos mínimos: filtro de período, colores y estados, estado vacío, estado de carga, cuadro de confirmación accesible (ver sección 5). |
| Cambios en el servidor | Verificación de rol como dependencia reutilizable; carpeta de migraciones; sin tablas nuevas |
| Cambios en el frontend | Componentes compartidos; ocultar botones según rol (ya existe, se mantiene) |
| Esfuerzo | Medio |
| Riesgos | La verificación de rol puede bloquear a un usuario que hoy funciona: se prueba con cada rol antes de activarla y se activa por rutas, de a poco |

---

## 4. Análisis y propuesta por módulo

### 4.1 Servicios: Carga del día

| Aspecto | Detalle |
|---|---|
| Situación actual | La pantalla `carga-dia/page.js` (379 líneas) permite cargar varios servicios para un mismo cliente. El técnico o taller se elige de una lista que viene del servidor. **La localidad del interior es un cuadro de texto libre** (líneas 227 a 231). No hay validación anti-duplicado en la pantalla ni en el servidor. Los tipos, dispositivos y estados vienen de opciones editables (con copia local de respaldo). |
| Propuesta | **Localidad automática:** al elegir un técnico o taller del interior, la localidad se completa con la que tiene cargada en Contactos (los 17 la tienen). Queda editable solo con un botón "cambiar para este servicio", y si el contacto no tiene localidad se avisa con un enlace para completarla.<br>**Regla anti-duplicado (definida):** un servicio es duplicado cuando coincide la **patente normalizada** (sin espacios, en mayúsculas), el **tipo de servicio** y la **fecha**, y el servicio existente **no está suspendido**. No se aplica cuando la patente está vacía o es "-". El servidor rechaza con una respuesta de conflicto que incluye el servicio ya existente; la pantalla muestra "Ya existe este servicio: [detalle]. ¿Cargar igual?" y solo si se confirma explícitamente el servidor lo acepta. También se valida al editar (cambio de fecha, tipo o patente) y dentro del mismo lote de filas. De los 5 casos reales encontrados, los 5 habrían sido detectados.<br>**Carga más rápida:** 1) repetir la última fila con un botón; 2) pegar una lista de patentes (una por línea) y que se creen las filas; 3) recordar la última selección de cliente y tipo del día; 4) autocompletar patente desde el historial de esa patente (cliente y dispositivo de la última vez); 5) validar el formato de patente argentina al escribir (antiguo: tres letras y tres números; nuevo: dos letras, tres números y dos letras) y avisar sin bloquear; 6) enviar todo el lote en un solo pedido que se guarda completo o no se guarda (evita cargas a medias); 7) recorrer el formulario solo con el teclado; 8) mostrar al final un resumen "se cargaron 7 servicios" con enlace a la vista del día. |
| Cambios en el servidor | Validación de duplicado en creación y actualización; ruta de carga por lote con transacción; normalización de patente al guardar; respuesta de conflicto con detalle. Migración: índice sobre patente normalizada, tipo y fecha para que la búsqueda sea rápida (sin restricción única, para poder confirmar excepciones). Guardar el motivo cuando se confirma un duplicado |
| Cambios en el frontend | Autocompletado de localidad desde Contactos; cuadro de confirmación de duplicado; botones de repetir y pegar lista; validación visual de patente |
| Esfuerzo | Medio |
| Riesgos | Que el técnico quiera cargar dos servicios legítimos iguales el mismo día (por ejemplo dos revisiones): por eso existe la confirmación explícita. Los 5 duplicados históricos no se borran automáticamente: se listan para que decidas |

### 4.2 Servicios: Vista del día

| Aspecto | Detalle |
|---|---|
| Situación actual | `vista-dia/page.js` (349 líneas) sirve para editar errores de carga y tiene un modo "vista técnicos". Hoy se saca una captura de pantalla y se manda al grupo. No hay ninguna función de compartir, ni de captura, ni de cruce con tickets. |
| Propuesta | **A) Mandar al grupo:** ver pregunta 1 (sección 6) para el análisis completo. En corto: botón "Mandar al grupo" que abre una vista previa con una tarjeta limpia pensada para celular (ancho de 390 píxeles, sin botones ni datos internos), permite elegir qué equipo o técnico incluir, y al confirmar genera la imagen y abre la función nativa de compartir del teléfono para elegir el grupo (en computadora copia la imagen para pegarla en el grupo).<br>**B) Cruce con tickets:** botón "Cruzar con tickets": se sube el archivo de tickets de la plataforma y la aplicación **propone** pasar servicios de PENDIENTE o CONFIRMADO a REALIZADO. Regla de emparejamiento: **patente y fecha** (con tolerancia configurable de 0 a 3 días; el ticket puede generarse o cerrarse un día distinto). El **tipo de servicio no se usa para decidir** porque la columna de incidencia del ticket no es confiable (en el archivo de agosto, 128 de 178 tickets marcados como "Revisión" eran instalaciones de cámara). El estado del ticket (cerrado) es requisito. Se muestran tres listas: emparejados (con un tilde para confirmar), servicios sin ticket y tickets sin servicio, para revisión manual. Nunca cambia estados sin confirmación. Se guarda el número de ticket en el servicio (columna nueva `numero_ticket`), lo que habilita más adelante el historial por unidad con la descripción. |
| Cambios en el servidor | Migración: columna `numero_ticket` en servicios y tabla `tickets_soporte` (ver 4.10 y sección 5). Ruta de propuesta de cruce (solo lectura) y ruta de confirmación por lote. Registro de quién confirmó. La generación de la imagen es en el navegador, no requiere servidor |
| Cambios en el frontend | Componente de tarjeta de agenda; modal de vista previa; función de compartir con alternativa para computadora; pantalla de revisión del cruce (reutiliza el interpretador de Excel que ya existe en `src/lib/tickets/excel.js`). Nueva dependencia propuesta: `html-to-image` (para convertir la tarjeta en imagen). Requiere tu aprobación |
| Esfuerzo | Alto (el cruce) y Bajo a Medio (la tarjeta) |
| Riesgos | Servicios sin patente (por ejemplo, con "-") no se pueden emparejar: quedan siempre en la lista manual. Patentes mal escritas en la carga: el emparejamiento sugiere coincidencias parciales para corregirlas |

### 4.3 Servicios: Historial

| Aspecto | Detalle |
|---|---|
| Situación actual | Calendario mensual con conteo por equipo y aviso de "sin cerrar"; búsqueda que trae todo el año y filtra en el navegador. Los colores de equipos se asignan por posición: con más de dos equipos el tercero repite el azul. |
| Propuesta | Se mantiene como está. Solo se agrega el botón de exportar contextual (exporta exactamente lo filtrado en pantalla) y se corrige el color por equipo usando la paleta compartida. |
| Cambios en el servidor | Ninguno (opcional más adelante: búsqueda en el servidor) |
| Cambios en el frontend | Botón de exportar; paleta compartida |
| Esfuerzo | Bajo |
| Riesgos | Ninguno relevante |

### 4.4 Personal (horarios de técnicos, historial de camioneta)

| Aspecto | Detalle |
|---|---|
| Situación actual | `horario-tecnico/page.js` (675 líneas) mezcla la carga manual de movimientos, la lectura del reporte de geocercas de Logictracker y las ausencias. Tiene fijos en el código: los puntos "Oficina", "Casa Maxi" y "Casa Hugo"; la configuración de geocercas para exactamente dos patentes; y los tipos de licencia. `historial-camioneta` repite los puntos fijos y compara con el nombre literal "Equipo 2". Los técnicos internos son 4 y viven en la misma tabla que clientes y proveedores (`empleados`, separados por un campo de tipo). |
| Propuesta | **Personal como fuente de verdad:** cada técnico con su zona, su equipo asignado, su jornada base (hoy 8 horas fijas para todos), su correo electrónico y su **número de Clave Única de Identificación Laboral** (dato necesario para reconocer sus recibos, ver 4.13).<br>**Catálogos editables** en lugar de datos fijos: puntos de recorrido por equipo, configuración de geocercas por equipo (qué geocerca es la base y cuáles son destinos), tipos de licencia y cuáles cuentan como justificadas.<br>**Unificar Equipo con Camioneta:** agregar a cada ubicación de Stock un enlace opcional al equipo (Camioneta 1 corresponde a Equipo 1). Las pantallas de Stock muestran el nombre del equipo y viceversa, sin duplicar datos. Migración reversible.<br>**Calendario de ausencias** visible junto a la agenda para planificar (hoy hay solo 3 ausencias y 11 jornadas cargadas, por lo que se recomienda simplificar la carga antes de ampliar). |
| Cambios en el servidor | Columnas nuevas en `empleados` (jornada base, correo, número de identificación laboral, equipo asignado si falta); tablas `puntos_recorrido` y `geocercas_equipo`; catálogo de tipos de licencia; columna de enlace de ubicación a equipo. Migraciones reversibles |
| Cambios en el frontend | Ficha de técnico; pantallas de catálogos; el lector de geocercas pasa a usar la configuración por equipo |
| Esfuerzo | Medio |
| Riesgos | El lector de geocercas hoy funciona para dos patentes: se prueba con los mismos archivos antes de reemplazar la configuración fija. Cargar el número de identificación laboral es un dato personal: solo visible para administración |

### 4.5 Contactos (técnicos y talleres, clientes, proveedores)

| Aspecto | Detalle |
|---|---|
| Situación actual | Todo vive en la tabla `empleados` distinguido por tipo (89 clientes, 17 interior, 4 internos, 2 proveedores) más una tabla de subresponsables. Los técnicos del interior tienen localidad en texto libre y precios por tipo de servicio. La búsqueda es simple y local a cada pestaña. No hay relación entre cliente y servicios más allá del texto. Existe una tabla `terceros` (4 registros) sin llamadas encontradas desde el frontend. |
| Propuesta | **Maestro de clientes de dos niveles:** empresa (20) y sus bases o centros de distribución (las 89 filas actuales, que se mantienen como están). Convertirlos en la fuente única y enlazar cada servicio por identificador (`cliente_ref`, hoy vacío). Migración de datos históricos en dos pasos: 1) emparejamiento automático por nombre normalizado (sin tildes ni mayúsculas; asigna cada uno de los 130 textos a una empresa y a una base, respetando las bases que ya existen en Contactos); 2) una pantalla de revisión para los textos que no coinciden, con sugerencias. El texto original se conserva para poder deshacer.<br>**Maestro de responsables:** lo mismo para técnicos y talleres, para unir "VITACO (German)" y "VITACO German" y para completar el 26 % de servicios sin responsable.<br>**Búsqueda global** en un solo cuadro que recorre todos los tipos, con atajo de teclado.<br>**Etiquetas** libres (por ejemplo "taller", "zona sur", "factura mensual") para filtrar.<br>**Ficha de taller:** datos de contacto, tarifas, datos de facturación (razón social, número de identificación tributaria, condición frente al impuesto, dirección fiscal), servicios del período con enlace al reporte y **monto estimado del período** calculado con sus tarifas, útil para controlar la factura que mandan al cobrar.<br>**Ficha de cliente:** bases, servicios recientes, unidades atendidas, tickets asociados.<br>**Tabla `terceros`:** documentar y, si se confirma que no se usa, retirarla en la Fase A. |
| Cambios en el servidor | Rutas de búsqueda global; tabla de etiquetas y relación con contactos; columnas de facturación; rutas de emparejamiento y revisión de clientes y responsables; migración que completa `cliente_ref` y `responsable_id` |
| Cambios en el frontend | Cuadro de búsqueda global; etiquetas; fichas; pantalla de revisión de emparejamiento |
| Esfuerzo | Medio |
| Riesgos | El emparejamiento automático puede equivocarse con clientes de nombres parecidos: por eso hay revisión humana y se conserva el texto original. Es la base de casi todos los reportes, así que se hace antes del rediseño de Estadísticas |

### 4.6 Estadísticas: Dashboard

| Aspecto | Detalle |
|---|---|
| Situación actual | Dos pantallas de inicio: la pestaña Dashboard de Estadísticas (períodos día, semana, mes, año; indicadores de total, realizados, sin cerrar, instalaciones y revisiones; barras y torta; últimos servicios) y el Dashboard de inicio (`dashboard/page.js`: servicios de hoy, del mes, realizados, sin cerrar, evaluados, tareas pendientes). Todo se calcula en el navegador. "Servicios del día" es un conteo sin contexto ni acción. La regla que considera resuelto un reprogramado solo mira dentro del mes en curso. Los colores de estado están repetidos en dos archivos y no coinciden. |
| Propuesta | Un único Dashboard pensado para decidir. **Qué mostrar y por qué:**<br>1) **Pendientes de cierre con antigüedad** (95 hoy): lista ordenada por días de atraso, con acción directa. *Por qué:* es lo que hay que resolver hoy y hoy no se ve.<br>2) **Agenda de hoy y de mañana** con marcas: sin confirmar, sin patente, sin técnico. *Por qué:* reemplaza al número aislado de "servicios del día" por algo accionable.<br>3) **Cumplimiento del mes** (realizados sobre programados) comparado con el mes anterior **hasta el mismo día del mes**. *Por qué:* comparar un mes completo con uno a medias engaña.<br>4) **Tendencia** de servicios por semana en las últimas ocho semanas, separada por instalaciones, revisiones y desinstalaciones. *Por qué:* muestra si la actividad sube o baja.<br>5) **Tasa de reprogramados y suspendidos** del mes y por cliente. *Por qué:* revela problemas de coordinación.<br>6) **Productividad por equipo** (servicios por hora y por día, sin desinstalaciones) con variación contra el mes anterior. *Por qué:* responde la comparación entre equipos.<br>7) **Interior:** servicios por taller del mes y monto estimado según tarifas. *Por qué:* anticipa la factura.<br>8) **Alertas:** unidades con revisiones repetidas, insumos en nivel crítico (Oficina, La Serenísima, camionetas), pendientes internos vencidos, horas extra o adeudadas por técnico. *Por qué:* hoy están dispersas en cinco pantallas.<br>Se quita "Servicios del día" como indicador aislado. Cada tarjeta lleva un enlace al detalle. Un solo selector de período para toda la pantalla. |
| Cambios en el servidor | Ruta única de resumen (`/estadisticas/resumen`) que calcula todo con agregaciones en la base (funciones almacenadas, patrón que ya se usó en Stock). Unifica los estados con la regla de reprogramado resuelto a través de los meses |
| Cambios en el frontend | Nuevo Dashboard con componentes de gráficos compartidos; se elimina el segundo Dashboard duplicado o se reduce a accesos; colores de estado desde un solo archivo |
| Esfuerzo | Alto |
| Riesgos | Depende del maestro de clientes y de responsables (4.5) y de los componentes compartidos (Fase A). Si se cambia la definición de "sin cerrar", los números históricos cambian: se documenta la definición |

### 4.7 Estadísticas: Horas trabajadas

| Aspecto | Detalle |
|---|---|
| Situación actual | La pantalla calcula en el navegador con cuatro pedidos y **no usa** la ruta `/estadisticas/horas` del servidor, que hace el mismo cálculo. Las horas salen de los movimientos de camioneta (salida y llegada); el balance es horas menos 8. Si un día no tiene técnicos cargados, **asume en silencio** que trabajaron los técnicos por defecto del equipo. Las ausencias justificadas (médica, vacaciones, personal) acreditan 8 horas. Las exclusiones manuales de días se guardan solo en el navegador de cada usuario. |
| Propuesta | **Una sola fuente de cálculo (el servidor)**, con la jornada base tomada de Personal por técnico.<br>**Exclusiones compartidas:** guardarlas en una tabla con quién y cuándo las hizo y con motivo.<br>**Suposición visible:** cuando el sistema asume técnicos por defecto, se marca en la tabla y en el informe ("día asumido").<br>**Informe mensual para tu jefe:** botón "Generar informe del mes" que combina **horas + productividad** por técnico y por equipo, con vista previa, y se descarga en Excel (con la librería que ya está) y en PDF (usando una página preparada para imprimir, sin dependencias nuevas). **Automático:** en una segunda etapa, el servidor lo genera el primer día del mes y lo envía por correo. Requiere elegir un servicio de envío de correo y una tarea programada (decisión 10). |
| Cambios en el servidor | Migración: tabla `horas_exclusiones`; jornada base por técnico; ruta de informe mensual; en la etapa automática, tarea programada y envío de correo |
| Cambios en el frontend | Pantalla usa el servidor; marca de días asumidos; vista previa del informe; botón de descarga |
| Esfuerzo | Medio (informe manual) y Medio adicional (envío automático) |
| Riesgos | Las horas siguen dependiendo de que se carguen los movimientos de camioneta. Si el cálculo del servidor difiere del actual en algún caso, se compara mes por mes contra los números que ya conocés antes de reemplazar |

### 4.8 Estadísticas: Reportes cruzados

Hoy tiene tres sub-pestañas (productividad, cliente contra responsable, Equipo 2 contra horas en las bases) y la elección de sub-pestaña se pierde al recargar. Se propone reorganizar así:

**4.8.1 Productividad (por equipo y por técnico)** *(definición ajustada con tus indicaciones)*

| Aspecto | Detalle |
|---|---|
| Situación actual | Agrupa horas por nombre de equipo y servicios por el texto del responsable: si no coinciden exactamente, el equipo no aparece. **Incluye desinstalaciones** en el conteo. No distingue días de La Serenísima ni la composición del equipo. Compara con el mes anterior y pinta en verde a quien supera el promedio, sin ponderar por tipo. **Dato clave:** la composición diaria casi no está cargada: de 269 movimientos de camioneta solo 6 tienen técnicos registrados (8 filas). La pantalla de horas completa en silencio con los técnicos habituales del equipo. En la base hay cinco "equipos": Equipo 1, Equipo 2, Equipos Juntos, Cabify y Vehículo Personal. |
| Propuesta | 1) **Excluir desinstalaciones** de la productividad (se muestran aparte).<br>2) **Dos comparaciones entre equipos:** (a) **comparación directa**, solo en los días de la semana que definas (por defecto martes y jueves, cuando ambos equipos van a La Serenísima); (b) **comparación general**, todos los días y **sin importar el cliente**, para ver quién hace más aunque los clientes sean distintos. El cliente solo es condición en la comparación directa: si un martes uno de los equipos no fue a La Serenísima, ese día se descarta de la directa y aparece en una lista con el motivo. Los días de la semana y el cliente son parámetros editables. En los datos hay 148 días en los que ambos equipos hicieron servicios realizados (sin desinstalaciones), unos 28 a 32 por cada día de la semana, así que hay muestra suficiente.<br>3) **Métricas:** unidades atendidas (patentes distintas), servicios, por día, por hora, y por persona (por persona y por día, y por persona y por hora).<br>4) **Productividad por técnico.** Los servicios se cargan por equipo, no por técnico; con los datos actuales la única atribución posible es **repartir los servicios del equipo de ese día en partes iguales entre las personas que salieron**. Ejemplo tuyo: el martes Sergio salió solo e hizo 3 unidades (3,0 por persona); Hugo y Lautaro salieron juntos e hicieron 3 (1,5 por persona cada uno); Maxi, con licencia médica, no cuenta ese día ni suma ni resta. Resultado: Sergio más productivo. Cuando los equipos salen juntos ("Equipos Juntos") se reparte entre todos los presentes.<br>5) **Carga de trabajo:** contar servicios no distingue una unidad con cámara, dispositivo y giróscopo de una instalación simple. Se agrega un valor de "puntos de trabajo" **configurable** por tipo de servicio y accesorio (por defecto vale 1 por servicio hasta que definas los valores). Los accesorios salen del campo dispositivo del servicio y, desde la Fase D, del texto del ticket (el intérprete de tickets de Stock ya reconoce cámara, corte y giróscopo). Se muestran siempre las dos vistas: cantidad simple y cantidad ponderada.<br>6) Equipos identificados por su identificador, no por texto; la cantidad de equipos deja de ser fija. |
| Dato que falta y cómo se resuelve | **Regla acordada:** se parte de los movimientos de camioneta (los horarios). Si ese día no se tilda a ningún técnico, se considera que **salió el equipo habitual**; si salió otra combinación, la modificás vos en el movimiento. Para que se note qué días son "habituales" y cuáles fueron editados, el informe los marca con una etiqueta (no cambia el cálculo). Opcionalmente, una pantalla con calendario para corregir varios días pasados de una vez. |
| Cambios en el servidor | Ruta de productividad con parámetros (días de comparación directa, cliente de esos días, equipos, período, ponderación); tabla de puntos de trabajo; asistencia diaria confirmada; migraciones reversibles |
| Cambios en el frontend | Pestañas "Equipos" (directa y general) y "Técnicos"; tabla de días incluidos y descartados con motivo; gráfico de barras agrupadas; carga de quién salió con lista pre-marcada; pantalla para completar días pasados |
| Esfuerzo | Alto |
| Riesgos | Hoy solo 6 de 269 días tienen técnicos cargados, así que casi todo se calcula con el equipo habitual: el resultado es correcto mientras cargues los días en que cambió la composición. El reparto en partes iguales es un supuesto: si dos personas van juntas pero una hace más trabajo, no se ve. Para los días de comparación directa depende del maestro de clientes |

**4.8.2 Cliente por responsable: talleres y técnicos del interior**

| Aspecto | Detalle |
|---|---|
| Situación actual | Cruce en forma de matriz de cliente contra responsable con acordeón. No hay análisis por localidad ni listado exportable de unidades por taller. |
| Propuesta | Pantalla **"Talleres del interior"**: por taller y período, servicios por tipo, por cliente y por localidad, promedio por día trabajado y **monto estimado con sus tarifas** (para revisar el esquema de pago). Junto a eso, el **listado de unidades atendidas por taller y período**: fecha, patente, tipo de servicio, cliente, configuración del dispositivo, estado, número de ticket cuando exista y observaciones; ordenable y **exportable a Excel**. La factura no se carga: es un listado para el control manual, como pediste. |
| Cambios en el servidor | Ruta de talleres del interior con agregaciones y listado |
| Cambios en el frontend | Pantalla nueva; botón de exportar |
| Esfuerzo | Medio |
| Riesgos | Depende del maestro de responsables (para unir "VITACO (German)" con "VITACO German"). La tarifa por servicio depende del supuesto 4 (sección 2.4) |

**4.8.3 Equipo 2 contra las bases de La Serenísima (General Rodríguez y Longchamps)**

| Aspecto | Detalle |
|---|---|
| Situación actual | Muestra horas totales contra horas en las bases (dos campos cargados a mano en el movimiento de camioneta). El nombre "Equipo 2" está fijo en el código y, si cambia, la pestaña deja de funcionar sin avisar. El gráfico combinado tiene etiquetas rotadas que se amontonan con un mes completo; la tabla no pagina; muchos días quedan con guiones por datos no cargados. |
| Propuesta | Rediseño: fila de cuatro indicadores (porcentaje del tiempo en bases, horas promedio en base por día, hora promedio de llegada y de salida, días sin dato), **gráfico semanal** (una barra por semana en vez de una por día), y detalle diario **plegado** con paginación. El equipo y las bases se eligen de una lista (configuración de Personal), no están fijos. Los días sin dato se explican en una nota en vez de mostrar guiones sueltos. |
| Cambios en el servidor | Ruta de horas en bases por equipo y período |
| Cambios en el frontend | Rediseño con componentes compartidos |
| Esfuerzo | Medio |
| Riesgos | Sigue dependiendo de que se carguen a mano los horarios de las bases; el rediseño no puede inventar datos |

**4.8.4 Por Cliente y Por Responsable:** ver pregunta 4 (sección 6). Se integran.

### 4.9 Estadísticas: Indicadores de Stock

(En pantalla la pestaña figura con un rótulo abreviado en inglés; en este documento se la nombra con palabras completas.)

| Aspecto | Detalle |
|---|---|
| Situación actual | Lista de productos "monitoreados" guardada en el navegador de cada usuario; solo mira Oficina; calcula consumo y días restantes con una función casi idéntica a la del Dashboard de Stock, pero con otra anticipación (3 días fijos) y sin las vistas de La Serenísima ni camionetas. |
| Propuesta | Ver pregunta 5. Se elimina la pestaña de Estadísticas; lo útil se integra al Dashboard de Stock. |
| Cambios en el servidor | Campo de plazo de entrega por producto (para reemplazar los 3 días fijos) y stock mínimo por ubicación (ya previsto en el plan de Stock) |
| Cambios en el frontend | Retirar la pestaña; una sola función de cálculo compartida; en Estadísticas, una pestaña de **consumo histórico de insumos** (por mes, producto y ubicación) que sí es análisis y no monitoreo |
| Esfuerzo | Bajo |
| Riesgos | Quien hoy usa la lista guardada en su navegador la pierde: se avisa y se ofrece "monitorear todo lo activo" |

### 4.10 Estadísticas: Revisiones frecuentes, que pasa a ser "Unidades"

| Aspecto | Detalle |
|---|---|
| Situación actual | Trae servicios realizados de 90, 180 o 365 días, los agrupa por patente y marca pares de revisiones a menos de 30 días. Hasta doce meses de pedidos por cambio de filtro, sin caché. No tiene exportación. No sabe qué dispositivo (número de serie) hay en cada unidad ni el texto del ticket. |
| Propuesta | Pantalla **"Unidades"** con una ficha por patente: línea de tiempo de servicios, **tickets con su descripción completa**, dispositivo instalado y retirado (con número de serie y configuración) y ubicación actual. La regla de "revisiones repetidas" pasa a ser un parámetro (30 días hoy). **Reporte por unidad para el cliente**: descarga en Excel y PDF con el historial y la descripción de cada ticket ("se hicieron varias revisiones en poco tiempo, hay que analizarlo"), con vista previa. La búsqueda por número de serie muestra dónde estuvo el dispositivo (esto usa el seguimiento por serie que ya se construyó en Stock). |
| Cambios en el servidor | Tabla `tickets_soporte` (ver sección 5, punto 2) y la columna `numero_ticket` en servicios; rutas de ficha de unidad y de reporte. Migración con carga inicial de tickets históricos a partir de los archivos que ya tenés |
| Cambios en el frontend | Ficha de unidad; buscador por patente o serie; descarga |
| Esfuerzo | Alto |
| Riesgos | Sin los tickets guardados la descripción no se puede mostrar: es una dependencia dura de la Fase D. Los tickets históricos anteriores al archivo de agosto solo se pueden cargar si conservás esos archivos |

### 4.11 Stock

| Aspecto | Detalle |
|---|---|
| Situación actual | Ya se construyó esta semana (sin confirmar): importación de tickets con serie y configuración, kits y mapeo de talleres editables, doble pool por taller (La Serenísima contra otros clientes), Dashboard con vistas (Oficina, La Serenísima, camionetas), pantalla de Herramientas, activación e inactivación de productos. Pendiente: control de equipos retirados, stock mínimo, pantalla de Equipos y Estadísticas de dispositivos. |
| Propuesta | **Carga inicial para arrancar de cero** (con plantilla y validaciones):<br>1) *Plantilla de Excel descargable* con tres hojas: **Existencias** (ubicación, código de producto, cantidad), **Dispositivos** (número de serie, código de producto, ubicación, estado, configuración, cliente, patente) y **Notas**. Se generan con las listas reales de ubicaciones y productos activos para que se elija de un menú y no se tipee.<br>2) *Validaciones* antes de guardar: ubicación y producto existen y están activos; cantidades enteras y no negativas; números de serie sin repetidos (en el archivo y en la base); prefijo del serie coherente con el modelo (tabla de prefijos ya confirmada) con advertencia si no coincide; estado y configuración dentro de los valores válidos; filas vacías ignoradas.<br>3) *Vista previa por fila* con errores (bloquean) y advertencias (permiten seguir); nada se guarda hasta confirmar.<br>4) *Guardado como movimientos de ajuste* con el motivo "Carga inicial" y un identificador de lote, para que el registro de movimientos sea coherente desde el primer día, y las filas de equipos por serie. **Se puede deshacer el lote completo** mientras no haya movimientos posteriores sobre esos productos.<br>5) *Reinicio:* antes de arrancar de cero se hace una copia de respaldo de las tablas de existencias y movimientos (tablas de respaldo con fecha, sin borrar nada) y recién después se reinicia. Se pide confirmación escrita.<br>**Instructivo para técnicos** (documento aparte, `docs/INSTRUCTIVO_TECNICOS_STOCK.md`, se entrega junto con el bloque de Stock). Contenido previsto: qué escribir en la descripción del ticket con frases fijas que el sistema entiende ("instalación", "cambio de dispositivo", "desinstalación", "portable", "sin corte de corriente", el marcador automático de dispositivo eliminado); que la columna de dispositivo siempre lleve el número de serie completo; qué hacer con un equipo desinstalado (queda como "retirado pendiente de control" y se entrega en oficina o se controla en el lugar); qué hacer cuando se reinstala un equipo ("se vuelve a instalar" debe nombrar el equipo); cómo indicar materiales sueltos y metros de cable; errores frecuentes con ejemplos reales tomados de tus tickets; y una tabla de "lo que escribís, lo que el sistema descuenta". Se puede complementar con un menú de frases predefinidas si la plataforma lo permite (supuesto no verificado).<br>**Otros puntos del bloque:** enlace de ubicación con equipo (ver 4.4); pantalla de Equipos para ver y editar configuración, cliente, estado y ubicación de cada dispositivo; control de campo y de oficina; stock mínimo con alertas; pasar la configuración de productos y ubicaciones a esta sección (ver 4.14). |
| Cambios en el servidor | Rutas de plantilla, validación en seco y confirmación de la carga inicial; tabla `cargas_iniciales` con lote y estado; tablas de respaldo; stock mínimo; enlace ubicación con equipo. Migraciones reversibles |
| Cambios en el frontend | Pantalla de carga inicial con descarga de plantilla, vista previa y deshacer; pantalla de Equipos; alertas |
| Esfuerzo | Alto |
| Riesgos | Un error en una carga inicial afecta todo el stock: por eso hay validación en seco, respaldo y deshacer. Los seriales cargados sin control quedan marcados como "sin control" hasta que se verifiquen |

### 4.12 Tickets (tareas internas)

| Aspecto | Detalle |
|---|---|
| Situación actual | Tablero por columnas, lista, panel de detalle y notas. **17 tickets en total, el último creado el 6 de julio de 2026**; 8 sin completar; solo 7 con fecha de vencimiento. **No genera ninguna alerta ni aviso** (se confirmó en servidor y en pantalla). Solo el Dashboard de inicio lista las cinco más urgentes. El nombre se confunde con los tickets de soporte de la plataforma. |
| Propuesta | Ver pregunta 6. Transformarlo en **"Proyecto"**: 1) un contador visible en el menú; 2) **alertas automáticas** generadas por el sistema (servicios sin cerrar por más de un número configurable de días, stock en nivel crítico, unidades con revisiones repetidas, equipos retirados sin controlar por mucho tiempo, pendientes vencidos); 3) cada alerta se puede resolver, posponer o convertir en pendiente con responsable; 4) se conserva el historial existente (17 tickets con sus notas). |
| Cambios en el servidor | Tabla `alertas` con origen, gravedad, estado y enlace al objeto; tarea que las genera; renombrar rutas de forma compatible (las viejas siguen funcionando durante la transición) |
| Cambios en el frontend | Nuevo nombre e ícono; bandeja de alertas; contador en menú; el informe en Word existente se mantiene |
| Esfuerzo | Medio |
| Riesgos | Riesgo de "fatiga de alertas": se limita a pocas fuentes con umbral configurable y se puede silenciar cada tipo. Si preferís eliminarlo, el plan de limpieza está en la pregunta 6 |

### 4.13 Recibos

| Aspecto | Detalle |
|---|---|
| Situación actual | Llega un archivo PDF con todos los recibos juntos. El servidor extrae el texto de cada página y prueba **dos formatos fijos** con expresiones regulares (un patrón de texto para encontrar nombre, legajo y período). El historial de cambios muestra unas doce correcciones sucesivas de esos patrones. Hay verificación de duplicado por nombre, mes y año. Se guarda cada página como archivo individual en un almacenamiento de Supabase y se descarga con un enlace firmado de una hora. La pantalla solo valida que el archivo sea PDF y recién informa errores después de procesar. 40 recibos cargados. **No hay envío** a cada persona: solo descarga individual. |
| Propuesta | Ver pregunta 7. En resumen: identificar a cada persona **contra Personal**, no contra un formato; vista previa de cada página con la persona detectada y el nivel de confianza; asignación manual de lo no reconocido; confirmación antes de guardar y enviar; el período se toma del texto si aparece y, si no, se elige en pantalla al subir. |
| Cambios en el servidor | Nuevo interpretador por capas; tabla de páginas pendientes de revisión; en la etapa de envío: enlace entre usuario y empleado, y correo electrónico. Requiere primero el control de acceso por rol en el servidor (Fase A) |
| Cambios en el frontend | Pantalla de vista previa con miniatura y desplegable de persona; pantalla de envío |
| Esfuerzo | Alto |
| Riesgos | Son datos sensibles: registrar quién los ve y descarga; no enviarlos a servicios externos de inteligencia artificial; en la etapa de envío, que cada persona vea solo lo suyo depende de la verificación en el servidor |

### 4.14 Configuraciones

| Aspecto | Detalle |
|---|---|
| Situación actual | `configuracion/page.js` (655 líneas), con estilos anteriores al sistema de diseño actual. Contiene cinco secciones: equipos; ubicaciones de stock; productos de stock; mapeo de códigos de La Serenísima; opciones de carga (tipos, dispositivos y estados, con copia en el navegador). No tiene nada que sea realmente global. |
| Propuesta | Ver pregunta 8. Repartir: **equipos → Personal**; **ubicaciones, productos, mapeo de La Serenísima, kits y mapeo de talleres → Stock** (pestaña "Catálogos de stock"); **opciones de carga → Servicios** (pestaña "Opciones de carga"). Lo que quede realmente global son los **parámetros del sistema** (jornada base, umbral de revisiones repetidas, días de tolerancia del cruce de tickets, anticipación de pedido, días para alerta de pendientes), que van a Administración. Después de repartir, **el módulo se elimina** del menú. |
| Cambios en el servidor | Tabla `parametros` (clave, valor, descripción); ninguna ruta existente cambia de nombre (se mantiene compatibilidad) |
| Cambios en el frontend | Mover secciones a su módulo aprovechando para migrar al sistema de diseño actual; permisos por submódulo actualizados en el maestro de módulos; redirección de la dirección vieja a la nueva |
| Esfuerzo | Medio |
| Riesgos | Los usuarios con permiso solo sobre Configuración quedan sin acceso: se migran sus permisos al módulo nuevo correspondiente antes de retirar el módulo |

### 4.15 Exportar

| Aspecto | Detalle |
|---|---|
| Situación actual | `exportar-importar/page.js` (1103 líneas). Pese al nombre, **no importa nada**: solo exporta. Ofrece informe de personal, stock de oficina, servicios del período, clientes contra responsables, servicios por cliente, y un informe de tickets en Word. Su lógica de horas está repetida respecto a Estadísticas. |
| Propuesta | Ver pregunta 9. Se elimina como módulo y se reemplaza por un **botón de exportar contextual** en cada pantalla que exporta exactamente lo filtrado en pantalla. |
| Cambios en el servidor | Ninguno obligatorio (opcional: exportaciones pesadas generadas en el servidor) |
| Cambios en el frontend | Una función compartida de exportación (columnas, formato y nombre de archivo) reutilizada por todas las pantallas; el informe de personal pasa a Horas trabajadas; el informe de tickets en Word pasa a Pendientes; después se retira el módulo con una redirección |
| Esfuerzo | Medio |
| Riesgos | No retirarlo hasta que cada pantalla tenga su botón; el nombre del archivo debe incluir los filtros para no mezclar descargas |

### 4.16 Administración

Sin cambios visibles. **Sigue siendo el último ítem del menú** y cualquier módulo nuevo se agrega antes. Se suma la sección "Parámetros del sistema" (ver 4.14) y, en la Fase A, la verificación de rol en el servidor, que no cambia la pantalla. Hoy la lista de módulos está duplicada entre el menú (`Sidebar.js`) y la pantalla de usuarios (`admin/usuarios/page.js`): se unifica en un único archivo para que un módulo nuevo no quede afuera de los permisos.

| Esfuerzo | Bajo |
|---|---|
| Riesgos | Ninguno relevante |

---

## 5. Mejoras transversales

1. **Gráficos.** Ya se usa una sola librería (Recharts) en todas las pestañas; el problema no es la librería sino la falta de sistema. Se crean componentes compartidos (barras, líneas, torta, indicador) con una paleta única definida en un solo archivo (hoy los colores de estado están repetidos y difieren entre el Dashboard y Estadísticas), formato de números y fechas, ayudas emergentes consistentes, estado vacío ("no hay datos en este período") y estado de carga. Los colores que se deben distinguir difieren también en luminosidad, no solo en tono. Los ejes con muchos elementos se agrupan (por semana).
2. **Tickets de la plataforma guardados una sola vez.** Nueva tabla `tickets_soporte` (número, fecha, incidencia, descripción, estado, distrito, base, vehículo, dispositivo, archivo de origen) cargada con un paso único "Cargar tickets" que guarda todas las filas (también las excluidas) y evita duplicados por número. De ahí salen: el descuento de stock, el cruce de servicios y el historial por unidad. Hoy solo se guardan los tickets confirmados por Stock.
3. **Filtros consistentes.** Un componente de filtro con período (día, semana, mes, año, rango), cliente y equipo, usado por todas las pantallas de análisis, con el estado en la dirección para poder compartir el enlace y que al recargar no se pierda. Los años dejan de estar fijos (hoy 2025 a 2027).
4. **Diseño y facilidad de uso.** Migrar Configuración y Estadísticas al sistema de diseño de estilos actual; cuadros de confirmación accesibles en lugar de los nativos del navegador; nombres accesibles en botones de solo ícono; atajos de teclado en las cargas; búsqueda global; mensajes de error que distingan "sin conexión", "sin permiso" y "error del servidor"; estados vacíos con una acción sugerida.
5. **Historial de cambios (auditoría).** Tabla que registra quién cambió qué y cuándo en servicios, stock y contactos. Hoy un servicio se puede editar en la vista del día sin dejar rastro.
6. **Cierre de período.** Cuando se emite el informe mensual, se puede "cerrar" el mes para que los números ya informados no cambien por ediciones posteriores (solo con permiso especial y con registro).
7. **Pruebas automáticas** de las reglas críticas: anti-duplicado, cruce de tickets, interpretación de tickets de stock, identificación de recibos, cálculo de horas y de productividad comparable.
8. **Estructura para sumar módulos.** Lista única de módulos y permisos (una sola fuente), rutas del servidor agrupadas por módulo, y un documento de "cómo se agrega un módulo".

---

## 6. Respuestas a las preguntas abiertas

**1. ¿Cómo implementar "Mandar al grupo" de WhatsApp de forma viable?**
*Recomendación:* generar una **tarjeta-imagen** para celular con vista previa y compartirla con la **función nativa de compartir** del teléfono; en computadora, **copiar la imagen al portapapeles** y pegarla en el grupo (o descargarla).
- **Por qué no envío automático:** la interfaz oficial de WhatsApp para empresas está pensada para conversaciones individuales con mensajes plantilla aprobados y con costo; publicar automáticamente en un grupo **ya existente** no está soportado de forma oficial. Las librerías no oficiales que controlan WhatsApp Web violan sus condiciones y pueden llevar al bloqueo del número, así que las descarto. Nota: Meta viene agregando capacidades de grupos para empresas con restricciones; **no lo verifiqué** y habría que revisarlo antes de prometer algo.
- **Cómo funciona:** botón "Mandar al grupo" en la vista del día → vista previa de la tarjeta (fecha, equipo o técnico, servicios por hora con cliente, patente, tipo y localidad; sin datos internos) → "Confirmar" → en el teléfono se abre el menú de compartir y elegís el grupo; en computadora se copia la imagen y aparece "Pegala en el grupo (con las teclas Control y V)".
- **Ventajas:** gratis, sin aprobaciones, sin claves, funciona hoy. **Costo:** un clic más que el envío automático. **Dependencia nueva:** `html-to-image`.
- **Alternativa futura** (si se quiere agenda individual a cada técnico, sin grupo): mensajes por la interfaz oficial con plantilla aprobada; tiene costo por conversación y requiere cuenta de empresa verificada.

**2. ¿Qué mejoras tienen sentido en Personal y Contactos?**
Ver 4.4 y 4.5. Las de mayor valor: Personal como fuente de verdad (zona, equipo, jornada, número de identificación laboral, correo); catálogos en lugar de datos fijos; maestro de clientes y de responsables para que los reportes dejen de depender de texto libre; búsqueda global; ficha de taller con monto estimado para controlar la factura.

**3. ¿Qué debería mostrar el Dashboard?**
Ver 4.6: pendientes de cierre con antigüedad, agenda de hoy y mañana con marcas, cumplimiento contra el mes anterior a igual fecha, tendencia semanal, tasa de reprogramados y suspendidos, productividad por equipo, interior con monto estimado, y alertas unificadas.

**4. ¿Por Cliente y Por Responsable se mejoran o se integran?**
*Recomendación:* **integrarlos**. Las dos pestañas y la matriz de cruce muestran los mismos servicios agrupados de tres maneras. Se reemplazan por una sola pantalla **"Servicios"** con un selector "agrupar por" (cliente, responsable, tipo, localidad) que comparte filtros y exportación, más la **matriz cliente por responsable** como vista opcional. Lo de responsables del equipo propio se absorbe en Productividad y lo de talleres en "Talleres del interior". Con esto la barra de pestañas de Estadísticas queda en: Dashboard, Productividad, Horas trabajadas, Servicios, Talleres del interior, Equipo 2 contra bases, Unidades y Consumo de insumos.

**5. ¿Cómo repensar Indicadores de Stock con el nuevo Stock?**
*Recomendación:* **eliminar la pestaña** de Estadísticas y llevar lo útil al Dashboard de Stock, que ya calcula consumo, días restantes y nivel para Oficina, La Serenísima y camionetas sobre todos los productos activos (no sobre una lista guardada en el navegador). Se conserva la idea de "fecha de pedido sugerida" pero con un **plazo de entrega por producto** en lugar de los 3 días fijos, más **stock mínimo por ubicación** con alerta. En Estadísticas queda una pestaña de **consumo histórico** (análisis, no monitoreo). Una sola función de cálculo compartida.

**6. ¿Ticket se elimina o se transforma?**
*Recomendación:* **transformar** en "Proyecto" (ver 4.12) y **cambiar el nombre**. *Justificación:* aunque el uso real es bajo (17 en total, ninguno desde el 6 de julio), el valor está en lo que hoy falta y es barato de sumar: alertas automáticas que consoliden lo que hoy está disperso en cinco pantallas. Además el nombre actual se confunde con los tickets de soporte de la plataforma. *Si preferís eliminarlo:* 1) exportar a Excel y Word los 17 y sus notas; 2) dejar el módulo en solo lectura 30 días; 3) retirar el menú, las rutas y la sección del Dashboard; 4) recién después borrar las tablas `tareas` y `ticket_notas`, con copia de respaldo.

**7. ¿Cómo hacer Recibos independiente del formato?**
*Recomendación:* un enfoque **por capas, sin plantillas fijas**:
1. Extraer el texto de cada página del PDF (ya se hace).
2. **Identificar a la persona contra Personal**: primero por **número de Clave Única de Identificación Laboral** (11 dígitos, se valida con su dígito verificador; si aparece en la página y coincide, es definitivo), después por **nombre** con comparación tolerante (sin tildes, sin importar el orden, aceptando abreviaturas de nombres), y por último por **legajo**.
3. **Período:** se busca un mes escrito y un año, o el formato mes/año, en cualquier parte del texto; si no aparece, **se elige en pantalla al subir** (mes y año), lo que hace el proceso independiente del texto.
4. **Vista previa obligatoria:** una fila por página con miniatura, persona detectada, motivo y confianza. Las no reconocidas quedan marcadas y se asignan a mano con un desplegable. Nada se guarda ni se envía sin confirmar.
5. **Envío:** primero solo asignar y descargar (como hoy, pero confiable); luego, cuando exista el control de acceso por rol, cada persona entra y ve **solo sus recibos**, y opcionalmente se le avisa por correo con un enlace.
- **Plantillas configurables** no hacen falta si el paso 2 funciona: la fuente de verdad son los datos de Personal, no la posición del texto.
- **Inteligencia artificial para extraer datos:** no la recomiendo como primera opción. Son datos sensibles (sueldos y documentos) y enviarlos a un servicio externo requiere consentimiento y evaluación legal. Con Personal como referencia alcanza con reglas. Queda como último recurso opcional y con tu aprobación explícita.

**8. ¿Qué se mueve de Configuraciones y se mantiene o se elimina?**
Ver 4.14. **Se mueve:** equipos a Personal; ubicaciones, productos, mapeo de La Serenísima, kits y mapeo de talleres a Stock; opciones de carga a Servicios. **Se elimina el módulo.** Lo global que queda va a **Administración** con el nombre **"Parámetros del sistema"** (en lugar de mantener un módulo con un nombre nuevo, porque quedaría con una sola sección y Administración ya existe para eso).

**9. ¿Exportar se elimina en favor de botones contextuales?**
*Recomendación:* **eliminar el módulo** una vez que cada pantalla tenga su botón. *Justificación:* hoy no importa nada, repite la lógica de Estadísticas y obliga a repetir filtros en una pantalla separada. Un botón junto a lo que ya estás mirando exporta exactamente lo filtrado. No conviene dejarlo como "hub" porque duplicaría los filtros y se desactualizaría.

**10. ¿Qué otras mejoras de alto impacto veo que no mencionaste?**
1. **Control de acceso por rol en el servidor** (hoy es solo visual).
2. **Migraciones versionadas y respaldos** de la base.
3. **Tickets de la plataforma guardados una sola vez** y usados para stock, servicios y unidades.
4. **Maestro de clientes y de responsables** (y enlazar los 2053 servicios).
5. **Ficha de unidad** por patente y por número de serie.
6. **Bandeja de alertas** unificada.
7. **Historial de cambios (auditoría)** y **cierre de período**.
8. **Pruebas automáticas** de las reglas críticas.
9. **Renovación silenciosa de la sesión** (hoy vence a las 12 horas sin aviso).
10. **Vista móvil de solo lectura para técnicos** de su propia agenda (con inicio de sesión), como paso posterior a la tarjeta para el grupo. Se deja como idea, sin comprometer alcance.

---

## 7. Orden de implementación por fases

Cada fase se hace en su propia rama, con confirmaciones descriptivas y migraciones reversibles. Al terminar cada bloque entrego: resumen de cambios, cómo probarlo y qué quedó pendiente.

| Fase | Contenido | Por qué en este orden | Rama |
|---|---|---|---|
| **A. Cimientos** | Confirmar Stock; carpeta de migraciones; control de rol en servidor; limpieza; componentes compartidos mínimos; lista única de módulos | Protege el trabajo, cierra el riesgo de seguridad y evita repetir código en todo lo demás | `mejoras/fase-a-cimientos` |
| **B. Ganancias rápidas** | Anti-duplicado y carga rápida; localidad automática; botones de exportar; repartir y retirar Configuraciones; retirar Exportar (la migración de clientes pasó a la Fase E) | Resuelven dolores de todos los días con poco riesgo | `mejoras/fase-b-servicios-rapido` |
| **C. Stock completo** | Carga inicial con plantilla; instructivo; enlace Camioneta con Equipo; Indicadores de Stock integrado; stock mínimo y alertas; pantalla de Equipos | Es el bloque en el que ya estás trabajando y tiene datos pendientes de cargar | `mejoras/fase-c-stock` |
| **D. Tickets y agenda** | Tabla de tickets; cruce de servicios con tickets; número de ticket en servicios; "Mandar al grupo" | Los tickets guardados son base de Estadísticas (Unidades) y de las alertas | `mejoras/fase-d-tickets-agenda` |
| **E. Estadísticas** | Un solo cálculo en el servidor; Dashboard; horas e informe mensual; productividad comparable; talleres; Equipo 2 contra bases; Unidades; consumo de insumos | Necesita maestro de clientes (4.5), componentes compartidos (A) y tickets guardados (D) | `mejoras/fase-e-estadisticas` |
| **F. Personas y pendientes** | Personal y Contactos con maestros; Recibos independientes del formato; Proyecto | Recibos necesita el control de rol (A) y los datos de Personal | `mejoras/fase-f-personas` |
| **G. Automatización e inteligencia artificial** | Informe mensual automático por correo; base para consultas en lenguaje natural | Requiere todo lo anterior y decisiones de proveedores | `mejoras/fase-g-automatizacion` |

Nota sobre el maestro de clientes: se necesita para los reportes de Estadísticas, así que su migración de datos (parte de 4.5) se hace **al comienzo de la Fase E** (decisión tomada al cerrar la Fase B, para llegar antes a Stock), dejando la pantalla de fichas para la Fase F. Mientras tanto la carga del día ya guarda el identificador del cliente (`cliente_ref`) en los servicios nuevos.

---

## 8. Decisiones (estado)

Aprobadas por vos, con los ajustes indicados:

1. **Multiempresa: aprobada.** Una sola empresa. Los clientes están todos en Contactos: son 20 empresas y cada una tiene distintas bases o centros de distribución; **eso se mantiene igual**. El maestro de clientes tiene dos niveles (empresa y bases).
2. **Control de acceso por rol en el servidor: aprobado** (se activa por rutas y con pruebas por rol).
3. **Retirar módulos: aprobado.** Configuraciones, Exportar y la pestaña Indicadores de Stock de Estadísticas.
4. **Tickets internos: aprobado, con nombre "Proyecto"** y con alertas automáticas.
5. **Nueva dependencia `html-to-image`: aprobada.**
6. **Tabla de tickets de soporte y número de ticket en servicios: aprobada.**
7. **Regla de duplicado: aprobada** (patente normalizada, tipo y fecha, con servicio existente no suspendido; bloquear con confirmación explícita).
8. **Carga inicial de stock: pospuesta por decisión tuya.** Se sigue con lo construido hasta ahora. Cuando tengas el conteo real completo avisás y definimos cómo se implementa. Para ese momento queda anotado: fecha de corte del inventario, respaldo previo, reinicio con confirmación escrita y posibilidad de deshacer el lote.
9. **Recibos sin inteligencia artificial externa: aprobado.**
10. **Informe mensual automático: aprobado** (por ahora con botón; el envío automático en la Fase G).
11. **Productividad: aprobada con la definición ajustada** que figura en 4.8.1: sin desinstalaciones; comparación directa solo martes y jueves (configurable) y comparación general de todos los días sin importar el cliente; productividad por técnico con reparto en partes iguales entre quienes salieron; carga de trabajo configurable; registro diario de quién salió como requisito.
12. **Migración de los textos de cliente: aprobada**, ahora hacia 20 empresas con sus bases (no 114 clientes) y con revisión humana de lo que no coincida.

Valores por defecto de la productividad (se cambian después desde la pantalla, no hace falta decidirlos ahora): una "unidad" es una patente distinta atendida por día; los puntos de trabajo valen 1 por servicio; los días de comparación directa son martes y jueves.

Forma de trabajo acordada: se implementa por etapas y se prueba en local; **no se sube nada** a los repositorios remotos hasta terminar las fases A, B y C (hasta Stock) y revisarlas juntos. Se sube todo junto, backend y frontend.

---

## 9. Preparación para inteligencia artificial

Para que una consulta como "armame un reporte de este dispositivo" o "cargá este servicio" sea confiable, el diseño deja:
- **Identificadores estables** para clientes, responsables, unidades (patente) y dispositivos (número de serie), en lugar de texto libre.
- **Una única fuente de cálculo** de indicadores en el servidor, para que la inteligencia artificial y las pantallas den el mismo número.
- **Tickets guardados** con su descripción y **línea de tiempo por unidad**.
- **Historial de cambios** para saber quién hizo qué (importante si una acción viene de un asistente).
- **Rutas de lectura estables y documentadas** por entidad, que luego se exponen como herramientas al asistente, con permisos por rol y confirmación antes de cualquier escritura.
- **Un diccionario de datos** (qué significa cada campo y cada estado) en `docs/`.

Empezar con solo lectura (reportes y consultas) y sumar escritura con confirmación más adelante, tal como se conversó.

---

*Fin del documento. Próximo paso: tu aprobación (total o por fases) y respuestas a las decisiones de la sección 8.*

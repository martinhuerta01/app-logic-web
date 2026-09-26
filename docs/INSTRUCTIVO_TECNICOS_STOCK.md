# Instructivo para técnicos: cómo completar los tickets para que el stock se descuente solo

## Para qué sirve

Cada semana se sube a la aplicación el archivo de tickets de soporte de la plataforma. La aplicación lee la **descripción** y la columna **Dispositivo** de cada ticket y, con eso:

- descuenta del stock lo que se instaló, en el lugar correcto (centro de distribución, taller o camioneta);
- anota qué número de serie quedó instalado en cada patente y cuál se retiró;
- deja registrado con qué configuración quedó el equipo.

La aplicación **no adivina**: entiende frases concretas. Si la descripción no las tiene, el ticket queda "para revisar" y alguien lo tiene que completar a mano. Este instructivo explica qué escribir.

## Las cinco reglas de oro

1. **Una descripción clara, en una o varias líneas.** Cada trabajo hecho tiene que estar nombrado (equipo, cámara, sensor, corte, etcétera).
2. **La columna Dispositivo siempre lleva el número de serie completo del equipo que queda instalado.** No abreviarlo ni dejarlo vacío.
3. **Cuando se cambia un equipo, no tocar la línea automática que dice "Dispo eliminado".** La plataforma la genera sola y es la que le dice a la aplicación qué serie salió.
4. **Escribir solo lo que se hizo.** Si algo no se instaló, no nombrarlo, o escribir "sin" antes ("sin corte de corriente"): la aplicación ignora lo que viene después de "sin".
5. **Cerrar el ticket.** Solo los tickets con estado cerrado descuentan stock.

## Qué escribir y qué hace la aplicación

| Si escribís... | La aplicación entiende... |
|---|---|
| "instalación gps" (o "instalación de gps") | Instalación de un equipo nuevo: descuenta el equipo, el cableado y la tarjeta de datos del kit, y anota la serie de la columna Dispositivo |
| "cambio de dispositivo" o "cambio de gps" **más la línea automática "Dispo eliminado"** | Se cambió el equipo: descuenta uno nuevo y registra el que salió |
| "desinstalación de gps" (o "desintalación", con el error de tipeo también se entiende) | Se retiró un equipo: no descuenta nada; el equipo retirado queda "pendiente de control" |
| "portable" | Instalación de un equipo portátil: usa su propio kit (equipo, cableado, sensor de temperatura, cable corto y pasacable) |
| "cámara de retroceso" (o "retroceso") | Descuenta el kit de cámara: cámara y soporte |
| "corte" | Descuenta el kit de corte: relé y portarrelé |
| "sensor de temperatura" | Descuenta un sensor de temperatura |
| "sensor de puertas" | Descuenta un sensor magnético de puerta |
| "botón de pánico", "lectora", "giróscopo", "antena" | Descuenta ese insumo |
| "caja estanca" | Descuenta una caja estanca |
| "ficha de enganche macho" o "hembra" | Descuenta esa ficha |
| "cableado 25 metros" (con el número y "metros" o "mts") | Descuenta esa cantidad de metros de cable |
| "revisión", "reparación", "se acomodó" (sin cambiar nada) | No descuenta stock |

Los errores de tipeo más comunes ("teperatura", "caja estaca", "engache") se entienden, pero conviene escribir bien.

## Cuando se cambia un equipo

1. Escribí en la descripción algo como: "cambio de dispositivo y sensor de temperatura".
2. La plataforma agrega sola la línea `*Dispo eliminado: 31015108 *` con la serie del equipo viejo. **No la borres.**
3. En la columna **Dispositivo** tiene que quedar la serie del equipo **nuevo**.

Importante: si escribís "cambio" y nombrás el equipo pero la línea de "Dispo eliminado" no está, la aplicación entiende que **no cambiaste el equipo** (por ejemplo, que cambiaste una antena) y no toca la serie. Ejemplo real: "vitaco cambio de antena GPS" se interpreta como cambio de antena, no como cambio de equipo.

## Cuando se desinstala un equipo

- Escribí "desinstalación de gps" (más lo que retiraste: lectora, sensor, corte).
- La columna Dispositivo debe tener la serie del equipo que se retiró.
- El equipo aparece en la aplicación como **"Retirado sin controlar"**. Cuando lo entregás o lo probás, quien administra el stock registra el resultado: reutilizable (controlado en campo o en oficina), con falla (garantía) o de baja.
- Si el equipo retirado se vuelve a instalar en otra unidad, ese nuevo ticket tiene que **nombrar el equipo y traer su serie** en la columna Dispositivo. Un ticket que solo dice "se vuelve a instalar" no alcanza y queda para revisar.

## Cómo se reconoce el modelo por la serie

La aplicación identifica el modelo por cómo empieza el número de serie:

| Empieza con | Modelo |
|---|---|
| 0104020 | Equipo nuevo |
| 200, 300 o 310 | Equipo antiguo, ficha negra |
| 410 | Equipo antiguo, ficha blanca |
| 86 | Equipo de la otra marca (Queclink) |

Por eso importa escribir la serie completa y sin errores.

## Tickets que la aplicación ignora a propósito

Escribí una de estas frases cuando el ticket no corresponde al stock:

- "OMITIR" (por ejemplo, "OMITIR TICKET");
- "no disponible";
- "realizado por el transportista".

## Errores frecuentes

| Qué pasa | Cómo evitarlo |
|---|---|
| Dice "cambio" y nombra el equipo, pero falta la línea "Dispo eliminado" | No editar ni borrar la línea automática |
| La columna Dispositivo está vacía o con una serie cortada | Copiar la serie completa |
| Descripción genérica: "se vuelve a instalar", "trabajo realizado" | Nombrar qué se instaló y con qué equipo |
| Se escribe "corte" o "temperatura" aunque no se instaló | Escribir "sin corte de corriente" o no nombrarlo |
| El ticket quedó sin cerrar | Cerrarlo: si no, no descuenta |
| Dos trabajos distintos en un ticket sin separar | Una línea por trabajo |

## Lista para revisar antes de cerrar el ticket

- [ ] La descripción nombra todo lo que se instaló o retiró.
- [ ] La columna Dispositivo tiene la serie completa del equipo instalado (o del retirado, si fue una desinstalación).
- [ ] Si fue un cambio de equipo, la línea "Dispo eliminado" sigue ahí.
- [ ] Nada figura como instalado si no se instaló.
- [ ] El ticket está cerrado.

## Ejemplos reales

| Descripción | Resultado |
|---|---|
| "instalación de gps y sensor temperatura" | Descuenta el kit del equipo y un sensor de temperatura; anota la serie instalada |
| "cambio de sensor de puertas y temperatura" | Descuenta ambos sensores; no toca ninguna serie |
| "desinstalación GPS, corte corriente" | Retira el equipo; queda pendiente de control |
| "instalación cámara retroceso y monitor 7" | Descuenta el kit de cámara |
| "PORTABLE cambio de dispositivo *Dispo eliminado: 010402012197 *" | Descuenta el kit portátil; registra la serie que salió |
| "instalación gps. sin corte de corriente" | Descuenta el equipo y no descuenta relé ni portarrelé |

## Quién completa lo que no se entiende

Los tickets que la aplicación no logra interpretar aparecen marcados con una advertencia en la pantalla de importación (Stock → Descontar por tickets). Quien importa los completa a mano antes de confirmar; si el mismo error se repite, se ajusta este instructivo o el reconocimiento de frases.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UI / UX Rules

- Every interactive element (button, link, clickable div, select, input) MUST have an explicit `cursor-pointer` class. Never rely on browser defaults — Tailwind resets cursors to `auto` by default.
- Disabled buttons use `cursor-not-allowed` (not `cursor-default` or omitted).
- These rules apply to all new code and must be fixed in any code being edited nearby.

# Cuentas y correos

La app **no tiene recuperación de contraseña**. Se quitó a propósito: Supabase
usa su SMTP por defecto, que solo entrega a miembros de la organización, así que
el enlace nunca llegaría a los distribuidores y la pantalla igual les diría
"revisá tu correo". No reintroducir `/auth/reset-password` sin configurar antes
un SMTP propio en Supabase (Authentication → Emails → SMTP Settings).

Los correos salen por **Resend**, desde scripts que se corren a mano en la
máquina — nunca desde la app desplegada. Por eso `RESEND_API_KEY`, `RESEND_FROM`
y `NEXT_PUBLIC_SITE_URL` viven solo en `.env.local` y **no** están en Vercel.

Las contraseñas viven en `~/Desktop/growpath-usuarios.csv`, no en la DB.

## Cuando el usuario pida "resetear la clave de X"

Correr el script, no mandarlo a hacerlo a mano. Siempre dry-run primero:

```
node scripts/resetear-clave.mjs --solo=correo@dominio.com            # dry-run
node scripts/resetear-clave.mjs --solo=correo@dominio.com --send     # aplica y envía
```

Genera una clave nueva, la escribe en Supabase, se la manda al usuario con la
plantilla de siempre y actualiza la fila del CSV (deja `.bak`). Con
`--clave=LaQueQuieras` se fija una en vez de generarla.

## Cuando pida enviar bienvenidas

```
node scripts/enviar-bienvenida.mjs                        # dry-run de todos
node scripts/enviar-bienvenida.mjs --send --solo=x@y.com  # uno solo
node scripts/enviar-bienvenida.mjs --test=x@y.com --send  # prueba con datos falsos
```

## Copia oculta

Los dos scripts mandan BCC a `tecnologia@agenciamil.com` y
`planning@agenciamil.com` para que quede registro del envío. El dry-run la
muestra antes de enviar. Se desactiva con `--sin-copia`.

Ojo: esas dos direcciones también son filas del CSV, pero sin contraseña, así
que el filtro las saltea como destinatarias. Reciben solo la copia.

## Respuestas

El remitente es `noreply@agenciamil.com`, pero el pie del correo invita a
"escribinos respondiendo este correo". Por eso los dos scripts mandan
`replyTo: "planning@agenciamil.com"`: quien conteste le escribe a planning, no
a una casilla muerta.

## Plantilla

`scripts/plantilla-correo.mjs` es la fuente única del diseño de ambos correos.
Tocar el look ahí; los dos scripts la importan.

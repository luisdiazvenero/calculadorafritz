// Envía el correo de bienvenida con usuario, contraseña y URL.
//
// Se corre a mano desde la máquina, no desde la app: los usuarios no tienen
// ningún botón para esto y las contraseñas viven en un CSV local, no en la DB.
//
//   node scripts/enviar-bienvenida.mjs                 # dry-run, no envía nada
//   node scripts/enviar-bienvenida.mjs --send          # envía a todos
//   node scripts/enviar-bienvenida.mjs --send --solo=correo@dom.com
//
// Lee de .env.local: RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL
// Lee las contraseñas de: ~/Desktop/growpath-usuarios.csv

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Resend } from "resend";
import { html as plantilla, texto as plantillaTexto, ROL } from "./plantilla-correo.mjs";

const CSV = process.env.CSV_USUARIOS ?? join(homedir(), "Desktop", "growpath-usuarios.csv");
const SEND = process.argv.includes("--send");
const SOLO = process.argv.find((a) => a.startsWith("--solo="))?.split("=")[1];
// --test=correo manda un unico correo con datos de ejemplo, sin tocar el CSV
const TEST = process.argv.find((a) => a.startsWith("--test="))?.split("=")[1];

// ── env ───────────────────────────────────────────────────────────────────────
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL: SITE } = process.env;
for (const [k, v] of Object.entries({ RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL: SITE })) {
  if (!v) { console.error(`Falta ${k} en .env.local`); process.exit(1); }
}
if (!TEST && !existsSync(CSV)) { console.error(`No existe el CSV: ${CSV}`); process.exit(1); }

// ── destinatarios ─────────────────────────────────────────────────────────────
const rows = TEST
  ? [{ nombre: "Luis", email: TEST, rol: "editor", alcance: "Oriente Norte", password: "Fritz2026-EJEMPLO" }]
  : readFileSync(CSV, "utf8").split("\n").slice(1).filter(Boolean)
  .map((l) => {
    const c = (l.match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
    return { nombre: c[0], email: c[1], rol: c[2], alcance: c[3], password: c[4] };
  })
  .filter((r) => r.email && r.password && !r.password.startsWith("("))
  .filter((r) => !SOLO || r.email.toLowerCase() === SOLO.toLowerCase());

// ── plantilla ─────────────────────────────────────────────────────────────────
const datos = ({ nombre, email, password, rol, alcance }) => ({
  site: SITE,
  titulo: "Bienvenido a Grow Path",
  subtitulo: "Dashboard de métricas de distribuidores",
  cuerpo: [
    `Hola ${nombre},`,
    `Ya tenés acceso a <strong>Grow Path</strong>, donde vas a poder consultar y cargar ` +
    `los indicadores de tus distribuidores mes a mes. Entrás como ` +
    `<strong>${ROL[rol] ?? rol}</strong>${alcance ? ` con alcance en <strong>${alcance}</strong>` : ""}.`,
  ],
  email,
  password,
  cta: "Entrar a Grow Path",
  nota: "Guardá estos datos. Si tenés algún inconveniente para entrar, escribinos respondiendo este correo.",
});

const html  = (r) => plantilla(datos(r));
const texto = (r) => plantillaTexto(datos(r));

// ── envío ─────────────────────────────────────────────────────────────────────
// Copia oculta del equipo: queda registro de cada envío sin que el
// destinatario vea las otras direcciones. Se desactiva con --sin-copia.
const COPIA = ["tecnologia@agenciamil.com", "planning@agenciamil.com"];
const bcc = process.argv.includes("--sin-copia") ? undefined : COPIA;

// El remitente es noreply@, así que las respuestas se redirigen a planning@:
// el correo invita a "escribinos respondiendo este correo".
const replyTo = "planning@agenciamil.com";

console.log(`${rows.length} destinatarios · remitente: ${RESEND_FROM} · url: ${SITE}`);
console.log(`copia oculta: ${bcc ? bcc.join(", ") : "(ninguna, --sin-copia)"}`);
console.log(`responder a:  ${replyTo}`);
if (!SEND) {
  console.log("\nDRY-RUN — no se envía nada. Agregá --send para enviar de verdad.\n");
  rows.forEach((r) => console.log(`  ${r.email.padEnd(45)} ${r.nombre}`));
  writeFileSync("preview-bienvenida.html", html(rows[0]));
  console.log("\nPreview del primer correo → preview-bienvenida.html");
  process.exit(0);
}

const resend = new Resend(RESEND_API_KEY);
const log = [];
for (const r of rows) {
  const { data, error } = await resend.emails.send({
    from: RESEND_FROM,
    to: r.email,
    bcc,
    replyTo,
    subject: "Tu acceso a Grow Path",
    html: html(r),
    text: texto(r),
  });
  if (error) { console.log(`ERROR  ${r.email}  ${error.message}`); log.push([r.email, "error", error.message]); }
  else { console.log(`OK     ${r.email}`); log.push([r.email, "enviado", data?.id ?? ""]); }
  await new Promise((s) => setTimeout(s, 600)); // Resend limita a 2/seg
}
writeFileSync("envios-bienvenida.log", log.map((l) => l.join(" | ")).join("\n"));
console.log(`\n${log.filter((l) => l[1] === "enviado").length}/${rows.length} enviados · detalle en envios-bienvenida.log`);

// Asigna una contraseña nueva a un usuario y se la manda por correo.
//
// La app no tiene recuperación de contraseña: el SMTP por defecto de Supabase
// solo entrega a miembros de la organización, así que los distribuidores nunca
// recibirían el enlace. El reseteo se hace desde acá, a mano.
//
//   node scripts/resetear-clave.mjs --solo=correo@dom.com            # dry-run
//   node scripts/resetear-clave.mjs --solo=correo@dom.com --send     # cambia y envía
//   node scripts/resetear-clave.mjs --solo=correo@dom.com --send --clave=LaQueQuieras
//
// Lee de .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
// RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL
// Si el usuario está en ~/Desktop/growpath-usuarios.csv, actualiza esa fila.

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { html, texto, ROL } from "./plantilla-correo.mjs";

const CSV = process.env.CSV_USUARIOS ?? join(homedir(), "Desktop", "growpath-usuarios.csv");
const SEND = process.argv.includes("--send");
const SOLO = process.argv.find((a) => a.startsWith("--solo="))?.split("=")[1];
const CLAVE = process.argv.find((a) => a.startsWith("--clave="))?.split("=")[1];

// ── env ───────────────────────────────────────────────────────────────────────
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const {
  NEXT_PUBLIC_SUPABASE_URL: SUPA_URL,
  SUPABASE_SECRET_KEY: SUPA_KEY,
  RESEND_API_KEY,
  RESEND_FROM,
  NEXT_PUBLIC_SITE_URL: SITE,
} = process.env;

for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPA_URL,
  SUPABASE_SECRET_KEY: SUPA_KEY,
  RESEND_API_KEY,
  RESEND_FROM,
  NEXT_PUBLIC_SITE_URL: SITE,
})) {
  if (!v) { console.error(`Falta ${k} en .env.local`); process.exit(1); }
}

if (!SOLO) {
  console.error("Falta --solo=correo@dominio.com (el usuario a resetear).");
  process.exit(1);
}

// ── contraseña ────────────────────────────────────────────────────────────────
// Sin I/O/l/o/0/1: se dictan por teléfono y se copian a mano del correo.
const ALFA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const generar = () => "Fritz-" + Array.from({ length: 10 }, () => ALFA[randomInt(ALFA.length)]).join("");
const password = CLAVE ?? generar();

// ── usuario ───────────────────────────────────────────────────────────────────
const admin = createClient(SUPA_URL, SUPA_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: lista, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error(`No se pudo listar usuarios: ${listErr.message}`); process.exit(1); }

const user = lista.users.find((u) => u.email?.toLowerCase() === SOLO.toLowerCase());
if (!user) { console.error(`No existe ningún usuario con el correo ${SOLO}.`); process.exit(1); }

const baneado = user.banned_until && Date.parse(user.banned_until) > Date.now();
const nombre = user.user_metadata?.display_name ?? user.email.split("@")[0];
const rol = user.app_metadata?.role ?? "";

// El alcance sale de app_metadata, que guarda slugs; el correo muestra el nombre.
let alcance = "";
if (user.app_metadata?.region_slug) {
  const { data } = await admin.from("regions").select("name").eq("slug", user.app_metadata.region_slug).maybeSingle();
  alcance = data?.name ?? user.app_metadata.region_slug;
} else if (user.app_metadata?.distributor_slug) {
  const { data } = await admin.from("distributors").select("name").eq("slug", user.app_metadata.distributor_slug).maybeSingle();
  alcance = data?.name ?? user.app_metadata.distributor_slug;
}

// ── correo ────────────────────────────────────────────────────────────────────
const cuerpo = [
  `Hola ${nombre},`,
  `Generamos una contraseña nueva para tu cuenta de <strong>Grow Path</strong>. ` +
  `Reemplaza a la anterior, que ya no funciona. Entrás como <strong>${ROL[rol] ?? rol}</strong>` +
  `${alcance ? ` con alcance en <strong>${alcance}</strong>` : ""}.`,
];
const datos = {
  site: SITE,
  titulo: "Tu nueva contraseña",
  subtitulo: "Grow Path · Dashboard de métricas",
  cuerpo,
  email: user.email,
  password,
  cta: "Entrar a Grow Path",
  nota: "Si no pediste este cambio, escribinos respondiendo este correo.",
};

// ── dry-run ───────────────────────────────────────────────────────────────────
// Copia oculta del equipo: queda registro de cada envío sin que el
// destinatario vea las otras direcciones. Se desactiva con --sin-copia.
const COPIA = ["tecnologia@agenciamil.com", "planning@agenciamil.com"];
const bcc = process.argv.includes("--sin-copia") ? undefined : COPIA;

// El remitente es noreply@, así que las respuestas se redirigen a planning@:
// el correo invita a "escribinos respondiendo este correo".
const replyTo = "planning@agenciamil.com";

console.log(`usuario: ${user.email}`);
console.log(`nombre:  ${nombre}`);
console.log(`rol:     ${(ROL[rol] ?? rol) || "(sin rol)"}${alcance ? ` · ${alcance}` : ""}`);
console.log(`estado:  ${baneado ? "DESHABILITADO — no va a poder entrar aunque cambie la clave" : "activo"}`);
console.log(`clave:   ${password}${CLAVE ? " (fijada con --clave)" : " (generada)"}`);
console.log(`url:     ${SITE}`);
console.log(`copia:   ${bcc ? bcc.join(", ") : "(ninguna, --sin-copia)"}`);
console.log(`responder a: ${replyTo}`);

if (!SEND) {
  writeFileSync("preview-clave.html", html(datos));
  console.log("\nDRY-RUN — no se cambió nada. Agregá --send para aplicar.");
  console.log("Preview del correo → preview-clave.html\n");
  process.exit(0);
}

// ── aplicar ───────────────────────────────────────────────────────────────────
// Primero la contraseña: si el correo falla, la clave nueva ya quedó impresa
// arriba y se le puede pasar por otro medio.
const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password });
if (updErr) { console.error(`\nERROR al cambiar la contraseña: ${updErr.message}`); process.exit(1); }
console.log("\nOK  contraseña actualizada en Supabase");

const resend = new Resend(RESEND_API_KEY);
const { data: envio, error: mailErr } = await resend.emails.send({
  from: RESEND_FROM,
  to: user.email,
  bcc,
  replyTo,
  subject: "Tu nueva contraseña de Grow Path",
  html: html(datos),
  text: texto(datos),
});
if (mailErr) {
  console.error(`ERROR al enviar el correo: ${mailErr.message}`);
  console.error(`La contraseña YA quedó cambiada. Pasásela por otro medio: ${password}`);
} else {
  console.log(`OK  correo enviado (${envio?.id ?? ""})`);
}

// ── CSV ───────────────────────────────────────────────────────────────────────
// El CSV del Desktop es la copia local de las claves; si el usuario está ahí,
// hay que moverla o queda desactualizada.
if (!existsSync(CSV)) {
  console.log(`\nNo existe ${CSV} — no hay nada que actualizar.`);
} else {
  const lineas = readFileSync(CSV, "utf8").split("\n");
  const i = lineas.findIndex((l) => {
    const c = (l.match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
    return c[1]?.toLowerCase() === user.email.toLowerCase();
  });
  if (i === -1) {
    console.log(`\nEl usuario no está en el CSV — no se tocó ${CSV}.`);
  } else {
    copyFileSync(CSV, `${CSV}.bak`);
    const campos = (lineas[i].match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
    campos[4] = password;
    lineas[i] = campos.map((c) => `"${c}"`).join(",");
    writeFileSync(CSV, lineas.join("\n"));
    console.log(`\nOK  fila actualizada en el CSV (backup en ${CSV}.bak)`);
  }
}

// Plantilla compartida de los correos que salen por Resend.
//
// La usan enviar-bienvenida.mjs y resetear-clave.mjs: mismo diseño, distinto
// texto. Si hay que retocar el look del correo, se toca acá y cambian los dos.

const AZUL = "#2544D8";

export const ROL = {
  editor: "Editor",
  gerente: "Administrador",
  distribuidor: "Distribuidor",
};

// cuerpo: array de párrafos. Acepta HTML inline (<strong>) en la versión html.
export const html = ({ site, titulo, subtitulo, cuerpo, email, password, cta, nota }) => `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.08);">

<tr><td style="padding:40px 40px 24px;text-align:center;">
  <div style="display:inline-block;width:56px;height:56px;background:${AZUL};border-radius:14px;line-height:56px;color:#fff;font-size:26px;font-weight:700;">G</div>
  <h1 style="margin:20px 0 6px;font-size:24px;line-height:1.25;color:#101828;font-weight:700;">${titulo}</h1>
  <p style="margin:0;font-size:15px;color:#667085;">${subtitulo}</p>
</td></tr>

<tr><td style="padding:0 40px;">
  ${cuerpo.map((p, i) => `<p style="margin:0 0 ${i === cuerpo.length - 1 ? 24 : 16}px;font-size:16px;line-height:1.6;color:#344054;">${p}</p>`).join("\n  ")}
</td></tr>

<tr><td style="padding:0 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #eaecf0;border-radius:12px;">
    <tr><td style="padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#98a2b3;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Usuario</p>
      <p style="margin:0 0 16px;font-size:15px;color:#101828;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${email}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#98a2b3;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Contraseña</p>
      <p style="margin:0;font-size:15px;color:#101828;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${password}</p>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:28px 40px 32px;text-align:center;">
  <a href="${site}" style="display:inline-block;background:${AZUL};color:#fff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:12px;">${cta}</a>
  <p style="margin:14px 0 0;font-size:13px;color:#98a2b3;">${site}</p>
</td></tr>

<tr><td style="padding:20px 40px 32px;border-top:1px solid #eaecf0;">
  <p style="margin:0;font-size:13px;line-height:1.6;color:#98a2b3;">${nota}</p>
</td></tr>

</table>
<p style="margin:20px 0 0;font-size:12px;color:#98a2b3;">Fritz International</p>
</td></tr></table></body></html>`;

// Misma info sin markup, para clientes que no renderizan HTML.
export const texto = ({ site, cuerpo, email, password, nota }) =>
  [
    ...cuerpo.map((p) => p.replace(/<[^>]+>/g, "")),
    "",
    `Usuario: ${email}`,
    `Contraseña: ${password}`,
    "",
    `Entrá en: ${site}`,
    "",
    nota,
    "",
    "Fritz International",
  ].join("\n");

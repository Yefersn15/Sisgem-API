const nodemailer = require('nodemailer');

let transporter = null;
let transporterChecked = false;

// El transporter solo se crea si hay credenciales SMTP configuradas.
// Si no las hay (ej. en desarrollo local sin correo configurado), sendMail
// simplemente registra el correo en consola en vez de fallar.
const getTransporter = () => {
  if (transporterChecked) return transporter;
  transporterChecked = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
};

exports.sendMail = async ({ to, subject, html }) => {
  const t = getTransporter();

  if (!t) {
    console.warn(`[mailer] SMTP no configurado. Correo "${subject}" no enviado a ${to}.`);
    return false;
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return true;
};

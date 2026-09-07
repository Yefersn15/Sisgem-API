const configurado = Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);

// Se usa la API HTTP de Brevo (puerto 443) en vez de SMTP porque muchos
// hostings gratuitos bloquean los puertos SMTP salientes.
// Si no hay API key configurada, no se rompe el flujo (p. ej. registro o
// recuperación de contraseña no deben fallar por esto): simplemente se deja
// constancia en el log del servidor, útil en desarrollo.
module.exports = async function sendEmail({ to, subject, html }) {
  if (!configurado) {
    console.warn(`[email] Brevo no configurado. Correo NO enviado a ${to}: "${subject}"`);
    return { enviado: false };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    throw new Error(`Brevo respondió ${response.status} al enviar correo a ${to}: ${detalle}`);
  }

  return { enviado: true };
};

export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY não configurada.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // 👇 ATENÇÃO: Troque para o domínio que você está verificando no Resend
        from: 'VEHLOX <noreply@login.pinheiromecanica.com>', 
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('Erro ao enviar e-mail:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Erro de conexão com Resend:', error);
    return false;
  }
}

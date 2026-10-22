export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY não configurada no ambiente.');
    return false;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey, // ✅ O Brevo usa o header 'api-key'
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'VEHLOX',
          // 👇 IMPORTANTE: Use o e-mail exato do domínio que você verificou no Brevo
          email: 'noreply@login.pinheiromecanica.com', 
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html, // ✅ Brevo usa 'htmlContent' em vez de 'html'
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      console.error('Erro ao enviar e-mail (Brevo):', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro de conexão com Brevo:', error);
    return false;
  }
}

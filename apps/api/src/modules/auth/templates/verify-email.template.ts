export function buildVerifyEmailSubject(): string {
  return 'Verify your email';
}

export function buildVerifyEmailText(params: { verifyUrl: string }): string {
  return [
    'Welcome!',
    '',
    'Please verify your email address by clicking the link below:',
    params.verifyUrl,
    '',
    'This link expires in 15 minutes.',
  ].join('\n');
}

export function buildVerifyEmailHtml(params: { verifyUrl: string }): string {
  const { verifyUrl } = params;
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 24px; }
      .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 24px; background: #fff; }
      .btn { display: inline-block; padding: 12px 18px; background: #2563eb; color: #fff !important; text-decoration: none; border-radius: 8px; }
      .muted { color: #6b7280; font-size: 12px; }
      .code { word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <p>Welcome!</p>
        <p>Please verify your email address to activate your account.</p>
        <p style="margin: 18px 0;">
          <a class="btn" href="${verifyUrl}">Verify your email</a>
        </p>
        <p class="muted">If the button doesn't work, copy and paste this link:</p>
        <p class="code"><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p class="muted"><strong>This link expires in 15 minutes.</strong></p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}


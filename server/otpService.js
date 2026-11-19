import crypto from 'node:crypto';

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(rawEmail) {
  return String(rawEmail || '').trim().toLowerCase();
}

export function validateEmail(rawEmail) {
  const email = normalizeEmail(rawEmail);
  return email.length <= 254 && EMAIL_REGEX.test(email);
}

export function hashEmail(rawEmail) {
  const normalized = normalizeEmail(rawEmail);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export function maskEmail(rawEmail) {
  const normalized = normalizeEmail(rawEmail);
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function createOtpService(options = {}) {
  const otpMap = new Map(); // normalizedEmail -> { code, expiresAt, attempts }
  const sessionMap = new Map(); // token -> { email, emailHash, expiresAt }
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  function cleanup(now = Date.now()) {
    for (const [email, entry] of otpMap.entries()) {
      if (now > entry.expiresAt) {
        otpMap.delete(email);
      }
    }
    for (const [token, entry] of sessionMap.entries()) {
      if (now > entry.expiresAt) {
        sessionMap.delete(token);
      }
    }
  }

  async function sendEmailViaProvider(toEmail, code, env = process.env) {
    const apiKey = (env.EMAIL_API_KEY || '').trim();
    const provider = (env.EMAIL_PROVIDER || 'resend').trim().toLowerCase();
    const from = (env.EMAIL_FROM || 'e-SAM <onboarding@resend.dev>').trim();

    if (!apiKey) {
      console.log(`[e-SAM OTP] Código de verificação para ${toEmail}: ${code} (válido por 10 min)`);
      return { delivered: true, deliveryMode: 'dev-fallback', devCode: code };
    }

    const subject = `Seu código de verificação e-SAM: ${code}`;
    const textBody = `Seu código de verificação do e-SAM (electronic SAM) é: ${code}. Ele expira em 10 minutos.`;
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Verificação de acesso — e-SAM</h2>
        <p style="font-size: 14px; color: #475569;">Use o código de 6 dígitos abaixo para confirmar seu e-mail no e-SAM (electronic SAM):</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center; font-family: monospace;">
          ${code}
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 16px;">Este código expira automaticamente em 10 minutos. Se você não solicitou, ignore esta mensagem.</p>
      </div>
    `;

    if (provider === 'brevo') {
      const fromMatch = from.match(/^(.*)<([^>]+)>$/);
      const sender = fromMatch
        ? { name: fromMatch[1].trim() || 'e-SAM', email: fromMatch[2].trim() }
        : { name: 'e-SAM', email: from };

      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender,
          to: [{ email: toEmail }],
          subject,
          htmlContent: htmlBody,
          textContent: textBody,
        }),
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Falha ao enviar e-mail via Brevo (${response.status}): ${errText.slice(0, 140)}`);
      }
      return { delivered: true, deliveryMode: 'brevo' };
    }

    // Default: Resend HTTP API
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Falha ao enviar e-mail via Resend (${response.status}): ${errText.slice(0, 140)}`);
    }
    return { delivered: true, deliveryMode: 'resend' };
  }

  async function requestOtp(rawEmail, now = Date.now(), env = process.env) {
    cleanup(now);
    const email = normalizeEmail(rawEmail);
    if (!validateEmail(email)) {
      return { status: 400, error: 'Informe um endereço de e-mail válido.' };
    }

    const code = String(crypto.randomInt(100000, 1000000));
    otpMap.set(email, {
      code,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
    });

    try {
      const sendResult = await sendEmailViaProvider(email, code, env);
      return {
        status: 200,
        sent: true,
        email,
        deliveryMode: sendResult.deliveryMode,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        ...(sendResult.devCode ? { devCode: sendResult.devCode } : {}),
      };
    } catch (err) {
      otpMap.delete(email);
      return {
        status: 502,
        error: err instanceof Error ? err.message : 'Erro ao enviar código de verificação por e-mail.',
      };
    }
  }

  function verifyOtp(rawEmail, rawCode, now = Date.now()) {
    cleanup(now);
    const email = normalizeEmail(rawEmail);
    const code = String(rawCode || '').replace(/\D/g, '');
    if (!validateEmail(email)) {
      return { status: 400, error: 'Endereço de e-mail inválido.' };
    }
    if (code.length !== 6) {
      return { status: 400, error: 'Informe o código numérico de 6 dígitos.' };
    }

    const entry = otpMap.get(email);
    if (!entry) {
      return { status: 401, error: 'Código não encontrado ou expirado. Solicite um novo código.' };
    }
    if (now > entry.expiresAt) {
      otpMap.delete(email);
      return { status: 401, error: 'Código expirado (validade de 10 minutos). Solicite um novo código.' };
    }

    entry.attempts += 1;
    if (entry.attempts > 5) {
      otpMap.delete(email);
      return { status: 429, error: 'Muitas tentativas incorretas. Solicite um novo código.' };
    }

    if (!timingSafeEqualStr(entry.code, code)) {
      return { status: 401, error: 'Código de verificação incorreto.' };
    }

    otpMap.delete(email);
    const token = crypto.randomBytes(32).toString('hex');
    const emailHash = hashEmail(email);
    sessionMap.set(token, {
      email,
      emailHash,
      expiresAt: now + SESSION_TTL_MS,
    });

    return {
      status: 200,
      verified: true,
      token,
      email,
      emailHash,
    };
  }

  function resolveSession(token, now = Date.now()) {
    cleanup(now);
    if (typeof token !== 'string' || !token.trim()) return null;
    const session = sessionMap.get(token.trim());
    if (!session || now > session.expiresAt) {
      sessionMap.delete(token);
      return null;
    }
    return session;
  }

  return {
    cleanup,
    requestOtp,
    verifyOtp,
    resolveSession,
  };
}

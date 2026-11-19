import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OTP_TTL_MS,
  SESSION_TTL_MS,
  createOtpService,
  hashEmail,
  maskEmail,
  validateEmail,
} from './otpService.js';

describe('otpService', () => {
  it('validates, normalizes, hashes, and masks emails', () => {
    assert.equal(validateEmail('Docente@Universidade.EDU.BR'), true);
    assert.equal(validateEmail('invalido'), false);
    assert.equal(validateEmail('sem-dominio@'), false);
    assert.equal(hashEmail('USER@example.com'), hashEmail('  user@example.com '));
    assert.equal(maskEmail('pesquisador@unipampa.edu.br'), 'pe***@unipampa.edu.br');
  });

  it('generates 6-digit OTP in dev-fallback when EMAIL_API_KEY is unset and verifies into session token', async () => {
    const svc = createOtpService();
    const now = 1_700_000_000_000;
    const reqRes = await svc.requestOtp('docente@esam.edu.br', now, {});
    assert.equal(reqRes.status, 200);
    assert.ok('deliveryMode' in reqRes && 'devCode' in reqRes);
    assert.equal(reqRes.deliveryMode, 'dev-fallback');
    const code = String(reqRes.devCode || '');
    assert.ok(/^\d{6}$/.test(code));

    const wrong = svc.verifyOtp('docente@esam.edu.br', '000000', now + 1000);
    assert.equal(wrong.status, 401);

    const ok = svc.verifyOtp('docente@esam.edu.br', code, now + 2000);
    assert.equal(ok.status, 200);
    assert.ok('token' in ok && ok.token);

    const session = svc.resolveSession(ok.token, now + 3000);
    assert.ok(session);
    assert.equal(session.email, 'docente@esam.edu.br');

    // Session expires after SESSION_TTL_MS
    assert.equal(svc.resolveSession(ok.token, now + SESSION_TTL_MS + 5000), null);
  });

  it('expires OTP after 10 minutes and locks after too many wrong attempts', async () => {
    const svc = createOtpService();
    const now = 1_700_000_000_000;
    const req1 = await svc.requestOtp('prof@esam.edu.br', now, {});
    assert.ok('devCode' in req1 && req1.devCode);
    const code1 = String(req1.devCode);

    const expired = svc.verifyOtp('prof@esam.edu.br', code1, now + OTP_TTL_MS + 1);
    assert.equal(expired.status, 401);

    const req2 = await svc.requestOtp('prof2@esam.edu.br', now, {});
    assert.ok('devCode' in req2 && req2.devCode);
    const code2 = String(req2.devCode);
    const wrongCode = code2 === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) {
      const r = svc.verifyOtp('prof2@esam.edu.br', wrongCode, now + 100);
      assert.equal(r.status, 401);
    }
    const locked = svc.verifyOtp('prof2@esam.edu.br', code2, now + 200);
    assert.equal(locked.status, 429);
  });

  it('sends HTTP payload to Resend and Brevo when EMAIL_API_KEY is configured', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const mockFetch = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: 'ok' }), { status: 200 });
    };

    const svc = createOtpService({ fetchImpl: mockFetch });
    const now = 1_700_000_000_000;

    const resendRes = await svc.requestOtp('a@b.com', now, {
      EMAIL_PROVIDER: 'resend',
      EMAIL_API_KEY: 're_test_123',
      EMAIL_FROM: 'e-SAM <noreply@esam.app>',
    });
    assert.equal(resendRes.status, 200);
    assert.ok('deliveryMode' in resendRes);
    assert.equal(resendRes.deliveryMode, 'resend');
    assert.equal('devCode' in resendRes, false);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');

    const brevoRes = await svc.requestOtp('b@b.com', now, {
      EMAIL_PROVIDER: 'brevo',
      EMAIL_API_KEY: 'xkeysib_test',
      EMAIL_FROM: 'e-SAM <noreply@esam.app>',
    });
    assert.equal(brevoRes.status, 200);
    assert.ok('deliveryMode' in brevoRes);
    assert.equal(brevoRes.deliveryMode, 'brevo');
    assert.equal(calls[1].url, 'https://api.brevo.com/v3/smtp/email');
  });

  it('returns actionable guidance when Brevo blocks dynamic server IP (401 unrecognised IP)', async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          message:
            'We have detected you are using an unrecognised IP address 152.55.180.27. If you performed this action make sure to add the new IP.',
        }),
        { status: 401 }
      );
    const svc = createOtpService({ fetchImpl: mockFetch });
    const res = await svc.requestOtp('c@b.com', 1_700_000_000_000, {
      EMAIL_PROVIDER: 'brevo',
      EMAIL_API_KEY: 'xkeysib_test',
      EMAIL_FROM: 'e-SAM <noreply@esam.app>',
    });
    assert.equal(res.status, 502);
    assert.ok('error' in res && typeof res.error === 'string' && res.error.includes('authorised_ips'));
  });
});

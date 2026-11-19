import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, Send } from 'lucide-react';
import type { RoomAdmin } from '../utils/emotiSam';

interface AdminAuthViewProps {
  initialPin?: string;
  onBack: () => void;
  onAuthenticated: (room: RoomAdmin, creatorToken: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const AdminAuthView: React.FC<AdminAuthViewProps> = ({
  initialPin = '',
  onBack,
  onAuthenticated,
}) => {
  const [pin, setPin] = useState(initialPin);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [infoMessage, setInfoMessage] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setDevCodeHint('');

    const cleanPin = pin.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (cleanPin.length !== 6) {
      setError('Digite o PIN de 6 dígitos da sala.');
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError('Informe o endereço de e-mail válido utilizado na criação da sala.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin, email: cleanEmail, purpose: 'admin' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível enviar o código de verificação.');
      }
      setStep('verify');
      setCode('');
      if (data.deliveryMode === 'dev-fallback' && data.devCode) {
        setDevCodeHint(String(data.devCode));
        setInfoMessage('Ambiente de teste sem EMAIL_API_KEY: código gerado no servidor.');
      } else {
        setInfoMessage(`Código de 6 dígitos enviado para ${cleanEmail}. Válido por 10 minutos.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPin = pin.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, '');

    if (cleanCode.length !== 6) {
      setError('Informe o código numérico de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${cleanPin}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível autenticar nesta sala.');
      }
      onAuthenticated(data.room as RoomAdmin, String(data.token || ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao acessar painel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Voltar ao início</span>
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700">
            <KeyRound className="w-5 h-5" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Sala Existente</h1>
          </div>
          <p className="text-sm text-slate-600">
            Informe o PIN da sala e confirme seu e-mail com um código de verificação de 6 dígitos para acessar resultados e exportações.
          </p>
        </div>

        <form
          onSubmit={step === 'request' ? handleRequestCode : handleVerifyAndOpen}
          className="space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="admin-pin" className="block text-sm font-semibold text-slate-800 mb-1.5">
              PIN da Sala (6 dígitos)
            </label>
            <input
              id="admin-pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              disabled={step === 'verify'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.25em] tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:opacity-70"
            />
          </div>

          <div>
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-800 mb-1.5">
              E-mail do Criador
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                disabled={step === 'verify'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pesquisador@universidade.edu.br"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-50 disabled:text-slate-600"
              />
            </div>
          </div>

          {step === 'verify' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {infoMessage && <p className="text-xs text-slate-600">{infoMessage}</p>}

              {devCodeHint && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Código de teste:{' '}
                    <strong className="font-mono text-sm tracking-widest">{devCodeHint}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCode(devCodeHint)}
                    className="rounded border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    Preencher
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="admin-otp-code" className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Código de Verificação (6 dígitos)
                </label>
                <input
                  id="admin-otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-center text-xl font-mono font-bold tracking-[0.25em] tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          {step === 'request' ? (
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Enviando código...' : 'Enviar código de verificação'}</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Validando acesso...' : 'Acessar Painel da Sala'}
              </button>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setCode('');
                    setError('');
                    setInfoMessage('');
                    setDevCodeHint('');
                  }}
                  className="hover:text-slate-900 underline cursor-pointer"
                >
                  Alterar PIN ou e-mail
                </button>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={loading}
                  className="text-blue-700 hover:underline font-medium cursor-pointer"
                >
                  Reenviar código
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

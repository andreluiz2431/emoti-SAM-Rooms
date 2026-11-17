import React, { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { formatCpfMask, onlyDigits, validateCpf } from '../utils/cpf';
import type { RoomAdmin } from '../utils/emotiSam';

interface AdminAuthViewProps {
  initialPin?: string;
  onBack: () => void;
  onAuthenticated: (room: RoomAdmin, rawCpf: string) => void;
}

export const AdminAuthView: React.FC<AdminAuthViewProps> = ({
  initialPin = '',
  onBack,
  onAuthenticated,
}) => {
  const [pin, setPin] = useState(initialPin);
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPin = pin.replace(/\D/g, '');
    const cpfDigits = onlyDigits(cpf);

    if (cleanPin.length !== 6) {
      setError('Digite o PIN de 6 dígitos da sala.');
      return;
    }
    if (!validateCpf(cpfDigits)) {
      setError('Informe um CPF válido (11 dígitos com dígitos verificadores).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${cleanPin}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível autenticar nesta sala.');
      }
      onAuthenticated(data.room as RoomAdmin, cpfDigits);
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
            Informe o PIN da sala e o CPF utilizado na criação para visualizar estatísticas e exportar dados.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="admin-pin" className="block text-sm font-semibold text-slate-800 mb-1.5">
              PIN da Sala (6 dígitos)
            </label>
            <input
              id="admin-pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.25em] tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div>
            <label htmlFor="admin-cpf" className="block text-sm font-semibold text-slate-800 mb-1.5">
              CPF do Criador
            </label>
            <input
              id="admin-cpf"
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={cpf}
              onChange={(e) => setCpf(formatCpfMask(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Validando acesso...' : 'Acessar Painel da Sala'}
          </button>
        </form>
      </div>
    </div>
  );
};

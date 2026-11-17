import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, PlusCircle, ShieldCheck } from 'lucide-react';
import { EmotiSamFace } from './EmotiSamFaces';

interface HomeViewProps {
  initialPin?: string;
  onJoinRoom: (pin: string, participantName: string) => Promise<void>;
  onNavigateCreate: () => void;
  onNavigateManage: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  initialPin = '',
  onJoinRoom,
  onNavigateCreate,
  onNavigateManage,
}) => {
  const [pin, setPin] = useState(initialPin);
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin.replace(/\D/g, '').slice(0, 6));
    }
  }, [initialPin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanPin = pin.replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setError('Digite o PIN de 6 dígitos fornecido pelo responsável pela sala.');
      return;
    }
    if (!participantName.trim()) {
      setError('Digite seu nome ou apelido para participar.');
      return;
    }
    setLoading(true);
    try {
      await onJoinRoom(cleanPin, participantName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar na sala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero + Primary Action Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
          <p className="text-xs font-medium tracking-wide text-slate-500">
            Instrumento científico emoti-SAM · Hayashi et al. (2016) · Modelo PAD
          </p>
          <h1
            className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-slate-900 leading-[1.15]"
            style={{ textWrap: 'balance' }}
          >
            Avalie experiências afetivas em tempo real, com o formato pictórico do emoti-SAM
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            Crie salas interativas para medir <strong>Valência</strong>,{' '}
            <strong>Excitação</strong> e <strong>Dominância</strong> no uso de sistemas computacionais
            ou em ações de extensão universitária — sem exigir cadastro ou login dos participantes.
          </p>

          {/* Compact pictorial preview of the 3 PAD dimensions */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-xl">
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center text-center">
              <EmotiSamFace dimension="valence" anchorLevel={5} className="w-14 h-12" />
              <span className="mt-1.5 text-xs font-semibold text-slate-900">1. Valência</span>
              <span className="text-[11px] text-slate-500">Prazer e satisfação</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center text-center">
              <EmotiSamFace dimension="arousal" anchorLevel={5} className="w-14 h-12" />
              <span className="mt-1.5 text-xs font-semibold text-slate-900">2. Excitação</span>
              <span className="text-[11px] text-slate-500">Energia e motivação</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center text-center">
              <EmotiSamFace dimension="dominance" anchorLevel={5} className="w-14 h-12" />
              <span className="mt-1.5 text-xs font-semibold text-slate-900">3. Dominância</span>
              <span className="text-[11px] text-slate-500">Sentimento de controle</span>
            </div>
          </div>
        </div>

        {/* Participant Join Card */}
        <div className="lg:col-span-5">
          <div className="h-full rounded-xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Entrar em uma Sala</h2>
              <p className="mt-1 text-sm text-slate-600">
                Informe o código PIN exibido pelo avaliador ou escaneie o QR Code da sala.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="join-pin" className="block text-sm font-medium text-slate-800 mb-1.5">
                    PIN da Sala (6 dígitos)
                  </label>
                  <input
                    id="join-pin"
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
                  <label htmlFor="join-name" className="block text-sm font-medium text-slate-800 mb-1.5">
                    Seu Nome ou Apelido
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    maxLength={80}
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Ex.: Ana Silva ou Participante 01"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                >
                  <span>{loading ? 'Buscando sala...' : 'Entrar na Sala'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>

            <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Suporta acesso direto via link com parâmetro <code className="font-mono text-slate-700">?pin=123456</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Creator Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-slate-900">
              <PlusCircle className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-bold">Criar ou Importar Sala</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Configure uma nova avaliação em escala de 5 ou 9 pontos, ou importe um arquivo{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">.json</code>{' '}
              exportado anteriormente para clonar ou restaurar uma sala.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onNavigateCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Configurar Nova Sala</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-slate-900">
              <BarChart3 className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-bold">Gerenciar Sala Existente</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Acesse os resultados em tempo real, projete o QR Code em modo telão e exporte as
              respostas em CSV (Excel) ou JSON completo informando o PIN e seu CPF.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={onNavigateManage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Abrir Painel do Criador</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Privacy & Retention Summary */}
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <p className="text-sm text-slate-700">
            <strong>Privacidade & LGPD:</strong> O CPF do criador é convertido em hash SHA-256 no servidor
            (nunca salvo em texto puro) e todas as salas expiram automaticamente após <strong>30 dias</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

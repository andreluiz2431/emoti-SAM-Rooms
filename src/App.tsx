import { useEffect, useState } from 'react';
import { AdminAuthView } from './components/AdminAuthView';
import { AdminPanelView } from './components/AdminPanelView';
import { CreateRoomView } from './components/CreateRoomView';
import { EvaluateView } from './components/EvaluateView';
import { HomeView } from './components/HomeView';
import { InstrumentInfoModal } from './components/InstrumentInfoModal';
import type { RoomAdmin, RoomPublic } from './utils/emotiSam';

type ActiveView =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'manage-auth' }
  | { name: 'evaluate'; room: RoomPublic }
  | { name: 'admin-panel'; room: RoomAdmin; creatorToken: string };

export default function App() {
  const [urlPin, setUrlPin] = useState('');
  const [view, setView] = useState<ActiveView>({ name: 'home' });
  const [infoOpen, setInfoOpen] = useState(false);

  // Support ?pin=123456 auto-fill from QR code or shared links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = (params.get('pin') || '').replace(/\D/g, '').slice(0, 6);
    if (pinParam.length === 6) {
      setUrlPin(pinParam);
    }
  }, []);

  const handleJoinRoom = async (pin: string) => {
    const res = await fetch(`/api/rooms/${pin}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Sala não encontrada ou expirada.');
    }
    setView({
      name: 'evaluate',
      room: data.room as RoomPublic,
    });
  };

  const goHome = () => {
    setView({ name: 'home' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* 3-Zone Top Bar Contract */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={goHome}
            title="e-SAM — electronic SAM"
            className="text-lg font-display font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded flex items-baseline gap-1.5"
          >
            <span>e-SAM</span>
            <span className="hidden sm:inline text-xs font-medium text-slate-400">electronic SAM</span>
          </button>

          {/* Zone 2: Concise single-line navigation links */}
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={goHome}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view.name === 'home' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Entrar na Sala
            </button>
            <button
              type="button"
              onClick={() => setView({ name: 'create' })}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view.name === 'create' ? 'text-slate-900 font-semibold underline underline-offset-4' : ''
              }`}
            >
              Criar ou Importar
            </button>
            <button
              type="button"
              onClick={() => setView({ name: 'manage-auth' })}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view.name === 'manage-auth' || view.name === 'admin-panel'
                  ? 'text-slate-900 font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              Painel do Criador
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sobre o e-SAM
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setView({ name: 'create' })}
              className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Nova Sala
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {view.name === 'home' && (
          <HomeView
            initialPin={urlPin}
            onJoinRoom={handleJoinRoom}
            onNavigateCreate={() => setView({ name: 'create' })}
            onNavigateManage={() => setView({ name: 'manage-auth' })}
          />
        )}

        {view.name === 'create' && (
          <CreateRoomView
            onBack={goHome}
            onRoomCreated={(room, creatorToken) =>
              setView({ name: 'admin-panel', room, creatorToken })
            }
          />
        )}

        {view.name === 'manage-auth' && (
          <AdminAuthView
            initialPin={urlPin}
            onBack={goHome}
            onAuthenticated={(room, creatorToken) =>
              setView({ name: 'admin-panel', room, creatorToken })
            }
          />
        )}

        {view.name === 'evaluate' && (
          <EvaluateView room={view.room} onExitHome={goHome} />
        )}

        {view.name === 'admin-panel' && (
          <AdminPanelView
            initialRoom={view.room}
            creatorToken={view.creatorToken}
            onExitHome={goHome}
            onRoomDeleted={goHome}
          />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 text-center md:text-left">
          <span>
            e-SAM (electronic SAM) · Fundamentado em Hayashi et al. (2016) e Lang &amp; Bradley (1994)
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span className="font-medium text-slate-600">
              Desenvolvido por André Luiz Montanha (2026)
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="whitespace-nowrap">Retenção máxima de 30 dias</span>
          </div>
        </div>
      </footer>

      <InstrumentInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

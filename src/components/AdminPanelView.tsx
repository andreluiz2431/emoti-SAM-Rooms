import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DIMENSION_KEYS,
  buildRoomCsv,
  buildRoomExportJson,
  countUniqueRespondents,
  createDefaultInstrumentConfig,
  formatRemainingRetention,
  getContextLabel,
  getInstrumentLabel,
  getRoomQuestionsList,
  type InstrumentConfig,
  type RoomAdmin,
} from '../utils/emotiSam';
import { InstrumentConfigurator } from './InstrumentConfigurator';
import { ScientificCharts } from './ScientificCharts';

interface AdminPanelViewProps {
  initialRoom: RoomAdmin;
  creatorToken: string;
  onExitHome: () => void;
  onRoomDeleted: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  initialRoom,
  creatorToken,
  onExitHome,
  onRoomDeleted,
}) => {
  const [room, setRoom] = useState<RoomAdmin>(initialRoom);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('all');
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Editable config state (unlocked ONLY when responses.length === 0)
  const [configOpen, setConfigOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState<InstrumentConfig>(() =>
    initialRoom.instrumentConfig || createDefaultInstrumentConfig(initialRoom.instrument || 'e-sam', initialRoom.scale)
  );
  const [draftRequireName, setDraftRequireName] = useState(Boolean(initialRoom.requireParticipantName));
  const [draftAllowComments, setDraftAllowComments] = useState(initialRoom.allowComments !== false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');

  const isLocked = room.locked || room.responses.length > 0;
  const questions = useMemo(() => getRoomQuestionsList(room), [room]);
  const instrumentConfig = useMemo(
    () => room.instrumentConfig || createDefaultInstrumentConfig(room.instrument || 'e-sam', room.scale),
    [room.instrumentConfig, room.instrument, room.scale]
  );

  // Sync draft when room transitions to locked
  useEffect(() => {
    if (isLocked && configOpen) {
      setConfigOpen(false);
    }
  }, [isLocked, configOpen]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/?pin=${room.pin}`;
    return `${window.location.origin}/?pin=${room.pin}`;
  }, [room.pin]);

  // Generate QR code client-side
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [shareUrl]);

  // Live 30-day retention countdown clock
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshRoom = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${room.pin}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível atualizar os dados da sala.');
      }
      setRoom(data.room as RoomAdmin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar respostas.');
    } finally {
      setRefreshing(false);
    }
  }, [room.pin, creatorToken]);

  // Automatic polling every 5 seconds for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRoom();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshRoom]);

  const scopedResponses = useMemo(() => {
    if (selectedQuestionId === 'all') return room.responses;
    return room.responses.filter(
      (r) => (r.questionId || questions[0]?.id || 'q1') === selectedQuestionId
    );
  }, [room.responses, selectedQuestionId, questions]);

  const uniqueRespondentsCount = useMemo(
    () => countUniqueRespondents(scopedResponses),
    [scopedResponses]
  );

  const totalUniqueRespondents = useMemo(
    () => countUniqueRespondents(room.responses),
    [room.responses]
  );

  const dimensionMeans = useMemo(() => {
    const n = scopedResponses.length;
    return DIMENSION_KEYS.map((key) => {
      const sum = scopedResponses.reduce((acc, r) => acc + r[key], 0);
      return {
        key,
        title: instrumentConfig.dimensions[key].title,
        mean: n > 0 ? sum / n : 0,
        count: n,
      };
    });
  }, [scopedResponses, instrumentConfig]);

  const overallMeans = useMemo(() => {
    const n = room.responses.length;
    return DIMENSION_KEYS.map((key) => {
      const sum = room.responses.reduce((acc, r) => acc + r[key], 0);
      return n > 0 ? sum / n : 0;
    });
  }, [room.responses]);

  const filteredResponses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...scopedResponses].sort(
      (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
    );
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        (r.userId && r.userId.toLowerCase().includes(q)) ||
        (r.participantName && r.participantName.toLowerCase().includes(q)) ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.questionPrompt && r.questionPrompt.toLowerCase().includes(q))
    );
  }, [scopedResponses, searchQuery]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setConfigError('');
    setConfigMessage('');
    setSavingConfig(true);
    try {
      const res = await fetch(`/api/rooms/${room.pin}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({
          instrument: draftConfig.instrument,
          scale: draftConfig.scale,
          instrumentConfig: draftConfig,
          requireParticipantName: draftRequireName,
          allowComments: draftAllowComments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível salvar as configurações.');
      }
      setRoom(data.room as RoomAdmin);
      setConfigMessage('Configurações do instrumento atualizadas com sucesso.');
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setQuestionError('');
    const prompt = newQuestionPrompt.trim();
    if (prompt.length < 5) {
      setQuestionError('A nova questão deve ter pelo menos 5 caracteres.');
      return;
    }
    setAddingQuestion(true);
    try {
      const res = await fetch(`/api/rooms/${room.pin}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível adicionar a questão.');
      }
      setRoom(data.room as RoomAdmin);
      setNewQuestionPrompt('');
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : 'Erro ao adicionar questão.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore if clipboard unavailable
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = buildRoomCsv(room);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `e-sam-sala-${room.pin}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const payload = buildRoomExportJson(room);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `e-sam-sala-${room.pin}-completo.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteRoom = async () => {
    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${room.pin}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${creatorToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível excluir a sala.');
      }
      onRoomDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir sala.');
      setDeleting(false);
    }
  };

  const retentionText = formatRemainingRetention(room.expiresAt, now);

  // Fullscreen Kahoot-style Presentation / Telão Overlay
  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-10 overflow-y-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-400">
              e-SAM (electronic SAM) · {getInstrumentLabel(instrumentConfig.instrument)} · {getContextLabel(room.contextType)} · Escala {room.scale} pontos
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">{room.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => setPresentationMode(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-4 h-4" aria-hidden="true" />
            <span>Sair do Modo Telão</span>
          </button>
        </div>

        <div className="my-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-6">
            <div>
              <span className="text-sm font-medium text-slate-400">Pergunta da avaliação</span>
              <p className="mt-1 text-2xl sm:text-4xl font-bold leading-tight text-white">
                {room.question}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-6 space-y-2">
              <span className="text-xs font-medium text-slate-400">PIN da Sala para entrar</span>
              <div className="text-5xl sm:text-7xl font-mono font-extrabold tracking-[0.18em] tabular-nums text-amber-300">
                {room.pin}
              </div>
              <p className="text-xs sm:text-sm font-mono text-slate-300 break-all pt-1">{shareUrl}</p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="block text-xs text-slate-400">Respondentes únicos</span>
                <span className="text-4xl font-mono font-bold tabular-nums text-emerald-400">
                  {totalUniqueRespondents}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div>
                <span className="block text-xs text-slate-400">Questões ativas</span>
                <span className="text-4xl font-mono font-bold tabular-nums text-white">
                  {questions.length}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-700" />
              <div>
                <span className="block text-xs text-slate-400">Valência / Excitação / Dominância</span>
                <span className="text-xl font-mono font-semibold tabular-nums text-white">
                  {overallMeans[0].toFixed(1)} · {overallMeans[1].toFixed(1)} · {overallMeans[2].toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-center">
            <div className="rounded-2xl bg-white p-5 shadow-lg">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code para entrar na sala ${room.pin}`}
                  className="w-60 h-60 sm:w-72 sm:h-72 object-contain"
                />
              ) : (
                <div className="w-60 h-60 flex items-center justify-center text-slate-500 text-sm">
                  Gerando QR Code...
                </div>
              )}
            </div>
            <span className="mt-3 text-sm text-slate-300">
              Aponte a câmera do celular para responder agora
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>Atualização automática ativa</span>
          <span>{retentionText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onExitHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Voltar ao início</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={refreshRoom}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => setPresentationMode(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Modo Telão</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar Tudo (.json)</span>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* Room Summary + QR Code Projection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{getInstrumentLabel(instrumentConfig.instrument)}</span>
              <span aria-hidden="true">·</span>
              <span>{getContextLabel(room.contextType)}</span>
              <span aria-hidden="true">·</span>
              <span>Escala de {room.scale} pontos</span>
              <span aria-hidden="true">·</span>
              <span>{questions.length} {questions.length === 1 ? 'questão' : 'questões'}</span>
              <span aria-hidden="true">·</span>
              <span>{room.requireParticipantName ? 'Identificação obrigatória' : 'Participação anônima'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{room.title}</h1>
            <p className="text-base text-slate-700">
              {questions.length > 1 ? `Q1: ${questions[0].prompt}` : room.question}
            </p>
          </div>

          {/* Real-time 30-day Retention Countdown */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm text-amber-950">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span className="font-medium tabular-nums">{retentionText}</span>
          </div>

          {/* 4-column KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Respondentes únicos</span>
              </span>
              <span className="mt-1 block text-2xl font-mono font-bold tabular-nums text-slate-900">
                {uniqueRespondentsCount}
              </span>
              {scopedResponses.length !== uniqueRespondentsCount && (
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {scopedResponses.length} avaliações
                </span>
              )}
            </div>
            {dimensionMeans.map((stat) => (
              <div key={stat.key}>
                <span className="text-xs text-slate-500 truncate block">{stat.title.split(' / ')[0]} (Média)</span>
                <span className="mt-1 block text-2xl font-mono font-bold tabular-nums text-blue-700">
                  {stat.count > 0 ? stat.mean.toFixed(2) : '—'}
                  <span className="text-xs font-normal text-slate-400">/{room.scale}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PIN + QR Code Card */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-6 flex flex-col items-center justify-between text-center gap-4">
          <div className="w-full">
            <span className="text-xs font-medium text-slate-500">PIN da Sala</span>
            <div className="mt-1 text-4xl font-mono font-extrabold tracking-[0.2em] tabular-nums text-slate-900">
              {room.pin}
            </div>
          </div>

          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt={`QR Code de acesso à sala ${room.pin}`}
              className="w-40 h-40 rounded-lg border border-slate-100 p-1 bg-white"
            />
          )}

          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Link copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copiar link direto (?pin={room.pin})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Methodological Integrity Lock / Pre-Response Instrument Config Editor */}
      {isLocked ? (
        <section
          aria-labelledby="methodological-lock-heading"
          className="rounded-xl border border-slate-300 bg-slate-100/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 id="methodological-lock-heading" className="text-sm font-bold text-slate-900">
                Configurações do Instrumento Bloqueadas (Integridade Metodológica)
              </h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                Esta sala já recebeu respostas. Para preservar a validade científica e comparabilidade dos dados, o instrumento ({getInstrumentLabel(instrumentConfig.instrument)}), a escala ({room.scale} pontos), a ordenação das dimensões, as figuras, a exigência de identificação e a lista de questões foram bloqueados permanentemente. Para testar outra configuração, exporte o arquivo <code className="font-mono">.json</code> e clone em uma nova sala.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-center shrink-0"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
            <span>Exportar para Clonar (.json)</span>
          </button>
        </section>
      ) : (
        <section aria-labelledby="room-config-heading" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => {
              if (!configOpen) {
                setDraftConfig(instrumentConfig);
                setDraftRequireName(Boolean(room.requireParticipantName));
                setDraftAllowComments(room.allowComments !== false);
                setConfigMessage('');
                setConfigError('');
              }
              setConfigOpen((v) => !v);
            }}
            aria-expanded={configOpen}
            className="w-full px-6 py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
              <div>
                <h2 id="room-config-heading" className="text-sm sm:text-base font-bold text-slate-900">
                  Editar Configurações do Instrumento (Liberado até a 1ª resposta)
                </h2>
                <p className="text-xs text-slate-500">
                  Ajuste instrumento, escala (3/5/9), ordenação, textos, imagens ou identificação enquanto não houver respostas registradas.
                </p>
              </div>
            </div>
            {configOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            )}
          </button>

          {configOpen && (
            <form onSubmit={handleSaveConfig} className="px-6 pb-6 pt-4 border-t border-slate-100 space-y-5">
              <InstrumentConfigurator
                config={draftConfig}
                onChange={setDraftConfig}
                idPrefix="admin-edit"
              />

              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftRequireName}
                    onChange={(e) => setDraftRequireName(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Exigir identificação do respondente
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftAllowComments}
                    onChange={(e) => setDraftAllowComments(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Permitir campo opcional de comentário aberto
                  </span>
                </label>
              </div>

              {configError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {configError}
                </p>
              )}
              {configMessage && (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  {configMessage}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{savingConfig ? 'Salvando...' : 'Salvar Configurações'}</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Questions Management (locked after 1st response for methodological integrity) */}
      <section aria-labelledby="questions-manage-heading" className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 id="questions-manage-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-700" aria-hidden="true" />
            <span>Questões da Sala ({questions.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isLocked
              ? 'Lista de questões bloqueada após o recebimento da 1ª resposta para preservar a integridade metodológica da coleta.'
              : 'Você pode adicionar novas perguntas enquanto a sala não possuir respostas registradas.'}
          </p>
        </div>

        <ol className="space-y-2">
          {questions.map((q, idx) => {
            const qCount = room.responses.filter(
              (r) => (r.questionId || questions[0]?.id || 'q1') === q.id
            ).length;
            return (
              <li
                key={q.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 shrink-0">Q{idx + 1}</span>
                  <span className="text-slate-900 font-medium">{q.prompt}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {qCount} {qCount === 1 ? 'resposta' : 'respostas'}
                </span>
              </li>
            );
          })}
        </ol>

        {isLocked ? (
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-600">
            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
            <span>Adição de novas questões desativada após o recebimento de respostas.</span>
          </div>
        ) : (
          <>
            <form onSubmit={handleAddQuestion} className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5" noValidate>
              <div className="flex-1">
                <label htmlFor="admin-add-question" className="sr-only">
                  Nova questão para a sala
                </label>
                <input
                  id="admin-add-question"
                  type="text"
                  maxLength={280}
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                  placeholder={`Adicionar Questão ${questions.length + 1} (ex.: Como você se sentiu na etapa seguinte?)`}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <button
                type="submit"
                disabled={addingQuestion || questions.length >= 30}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{addingQuestion ? 'Adicionando...' : 'Adicionar Questão'}</span>
              </button>
            </form>
            {questionError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {questionError}
              </p>
            )}
          </>
        )}
      </section>

      {/* Question Filter Tabs for Scientific Charts */}
      {questions.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtrar gráficos por questão">
          <button
            type="button"
            role="tab"
            aria-selected={selectedQuestionId === 'all'}
            onClick={() => setSelectedQuestionId('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              selectedQuestionId === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Todas ({room.responses.length})
          </button>
          {questions.map((q, idx) => {
            const count = room.responses.filter(
              (r) => (r.questionId || questions[0]?.id || 'q1') === q.id
            ).length;
            return (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={selectedQuestionId === q.id}
                onClick={() => setSelectedQuestionId(q.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  selectedQuestionId === q.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Q{idx + 1} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Scientific Visualizations (Hayashi et al., 2016) */}
      {scopedResponses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 px-6 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            Nenhuma resposta registrada {selectedQuestionId !== 'all' ? 'para esta questão ' : ''}ainda
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Projete o PIN <strong className="font-mono">{room.pin}</strong> ou o QR Code acima para os
            participantes. Os gráficos (Barras Divergentes, Boxplots e Mapa Afetivo 2D) aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <ScientificCharts
          responses={scopedResponses}
          scale={room.scale}
          instrumentConfig={instrumentConfig}
        />
      )}

      {/* Individual Responses Table with ID_Usuario */}
      <section aria-labelledby="responses-heading" className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="responses-heading" className="text-lg font-bold text-slate-900">
            Respostas Individuais ({filteredResponses.length})
          </h2>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por ID_Usuario, nome ou comentário..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {filteredResponses.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            {scopedResponses.length === 0
              ? 'Aguardando o primeiro participante enviar sua avaliação.'
              : 'Nenhuma resposta encontrada para o filtro informado.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">ID_Usuario</th>
                  <th className="py-2.5 px-3">Participante</th>
                  {questions.length > 1 && <th className="py-2.5 px-3">Questão</th>}
                  <th className="py-2.5 px-3 text-right">Valência</th>
                  <th className="py-2.5 px-3 text-right">Excitação</th>
                  <th className="py-2.5 px-3 text-right">Dominância</th>
                  <th className="py-2.5 px-3">Comentário</th>
                  <th className="py-2.5 pl-3 text-right">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResponses.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                      {r.userId}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {r.participantName ? r.participantName : <span className="text-slate-400 font-normal">Anônimo</span>}
                    </td>
                    {questions.length > 1 && (
                      <td className="py-2.5 px-3 text-xs text-slate-600 max-w-xs">
                        <span className="font-mono font-bold text-blue-700 mr-1">
                          Q{r.questionIndex || 1}
                        </span>
                        <span className="truncate inline-block max-w-[180px] align-bottom" title={r.questionPrompt}>
                          {r.questionPrompt}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {r.valence}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {r.arousal}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                      {r.dominance}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md">
                      {r.comment ? r.comment : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(r.submittedAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Early Room Deletion & Backup Reminder */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Encerrar e Excluir Sala Antecipadamente</h3>
          <p className="text-xs text-slate-600">
            Recomendamos baixar o backup completo (<Download className="w-3 h-3 inline" /> .json ou .csv) antes
            de excluir permanentemente esta sala.
          </p>
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Excluir Sala</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteRoom}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer disabled:opacity-60"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão Permanente'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

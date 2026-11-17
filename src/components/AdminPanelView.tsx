import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  ListChecks,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DIMENSIONS,
  buildRoomCsv,
  buildRoomExportJson,
  computeDimensionStats,
  formatRemainingRetention,
  getContextLabel,
  getRoomQuestionsList,
  type RoomAdmin,
} from '../utils/emotiSam';

interface AdminPanelViewProps {
  initialRoom: RoomAdmin;
  creatorCpf: string;
  onExitHome: () => void;
  onRoomDeleted: () => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  initialRoom,
  creatorCpf,
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

  const questions = useMemo(() => getRoomQuestionsList(room), [room]);

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

  // Live 30-day retention countdown clock (updates every 30s)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: creatorCpf }),
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
  }, [room.pin, creatorCpf]);

  // Automatic polling every 5 seconds for live Kahoot-style room updates
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

  const statsList = useMemo(() => {
    return DIMENSIONS.map((dim) =>
      computeDimensionStats(scopedResponses, room.scale, dim.key, dim.title)
    );
  }, [scopedResponses, room.scale]);

  const overallStatsList = useMemo(() => {
    return DIMENSIONS.map((dim) =>
      computeDimensionStats(room.responses, room.scale, dim.key, dim.title)
    );
  }, [room.responses, room.scale]);

  const filteredResponses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...scopedResponses].sort(
      (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
    );
    if (!q) return sorted;
    return sorted.filter(
      (r) =>
        r.participantName.toLowerCase().includes(q) ||
        (r.comment && r.comment.toLowerCase().includes(q)) ||
        (r.questionPrompt && r.questionPrompt.toLowerCase().includes(q))
    );
  }, [scopedResponses, searchQuery]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: creatorCpf, prompt }),
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
      // Fallback ignored if clipboard unavailable
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = buildRoomCsv(room);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emoti-sam-sala-${room.pin}.csv`;
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
    link.download = `emoti-sam-sala-${room.pin}-completo.json`;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: creatorCpf }),
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
              emoti-SAM Rooms · {getContextLabel(room.contextType)} · Escala {room.scale} pontos
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

            <div className="flex items-center gap-6">
              <div>
                <span className="block text-xs text-slate-400">Avaliações recebidas</span>
                <span className="text-4xl font-mono font-bold tabular-nums text-emerald-400">
                  {room.responses.length}
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
                  {overallStatsList[0].mean.toFixed(1)} · {overallStatsList[1].mean.toFixed(1)} · {overallStatsList[2].mean.toFixed(1)}
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
              <span>{getContextLabel(room.contextType)}</span>
              <span aria-hidden="true">·</span>
              <span>Escala de {room.scale} pontos</span>
              <span aria-hidden="true">·</span>
              <span>{questions.length} {questions.length === 1 ? 'questão' : 'questões'}</span>
              <span aria-hidden="true">·</span>
              <span>Criada em {new Date(room.createdAt).toLocaleDateString('pt-BR')}</span>
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
                <span>Avaliações {selectedQuestionId !== 'all' ? '(filtro)' : ''}</span>
              </span>
              <span className="mt-1 block text-2xl font-mono font-bold tabular-nums text-slate-900">
                {scopedResponses.length}
              </span>
            </div>
            {statsList.map((stat) => (
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

      {/* Questions Management & Add Question Live */}
      <section aria-labelledby="questions-manage-heading" className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 id="questions-manage-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-blue-700" aria-hidden="true" />
              <span>Questões da Sala ({questions.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Você pode adicionar novas perguntas a qualquer momento; novos participantes verão todas as questões em sequência.
            </p>
          </div>
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
      </section>

      {/* Visual Distribution (Figure 9 Style - Hayashi et al., 2016) */}
      <section aria-labelledby="charts-heading" className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 id="charts-heading" className="text-lg font-bold text-slate-900">
              Distribuição Afetiva (Estilo Figura 9 — Hayashi et al., 2016)
            </h2>
            <p className="text-xs text-slate-500">
              Barras empilhadas proporcionais da menor nota (vermelho) à maior nota (verde escuro).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> Negativo (1)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#64748B]" /> Neutro ({room.scale === 9 ? 5 : 3})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" /> Positivo ({room.scale})
            </span>
          </div>
        </div>

        {questions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1" role="tablist" aria-label="Filtrar gráficos por questão">
            <button
              type="button"
              role="tab"
              aria-selected={selectedQuestionId === 'all'}
              onClick={() => setSelectedQuestionId('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                selectedQuestionId === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Q{idx + 1} ({count})
                </button>
              );
            })}
          </div>
        )}

        {scopedResponses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 py-10 px-4 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">Nenhuma resposta registrada {selectedQuestionId !== 'all' ? 'para esta questão ' : ''}ainda</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Projete o PIN <strong className="font-mono">{room.pin}</strong> ou o QR Code acima para os
              participantes. Os gráficos atualizarão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {statsList.map((stat) => (
              <div key={stat.key} className="space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-slate-900">{stat.title}</span>
                  <span className="font-mono text-xs tabular-nums text-slate-600">
                    Média: <strong className="text-slate-900">{stat.mean.toFixed(2)}</strong> / {room.scale}
                  </span>
                </div>

                {/* Stacked Bar */}
                <div
                  className="w-full h-9 rounded-lg overflow-hidden bg-slate-100 flex border border-slate-200"
                  role="img"
                  aria-label={`Distribuição de ${stat.title}`}
                >
                  {stat.distribution.map((bucket) =>
                    bucket.count > 0 ? (
                      <div
                        key={bucket.score}
                        style={{
                          width: `${bucket.percent}%`,
                          backgroundColor: bucket.color,
                          color: bucket.textColor,
                        }}
                        title={`Nota ${bucket.score}: ${bucket.count} resposta(s) (${bucket.percent}%)`}
                        className="h-full flex items-center justify-center text-[11px] font-mono font-bold transition-all duration-300 overflow-hidden px-1"
                      >
                        {bucket.percent >= 8 ? `${bucket.score} (${Math.round(bucket.percent)}%)` : ''}
                      </div>
                    ) : null
                  )}
                </div>

                {/* Tabular score counts */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-600">
                  {stat.distribution.map((b) => (
                    <span key={b.score} className="inline-flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-xs inline-block"
                        style={{ backgroundColor: b.color }}
                      />
                      <span>
                        {b.score}: <strong>{b.count}</strong> ({b.percent}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Individual Responses Table */}
      <section aria-labelledby="responses-heading" className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="responses-heading" className="text-lg font-bold text-slate-900">
            Respostas Individuais ({filteredResponses.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nome, questão ou comentário..."
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
                  <th className="py-2.5 pr-4">Participante</th>
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
                    <td className="py-2.5 pr-4 font-medium text-slate-900 whitespace-nowrap">
                      {r.participantName}
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

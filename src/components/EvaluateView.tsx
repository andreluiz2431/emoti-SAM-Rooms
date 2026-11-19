import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  DIMENSION_KEYS,
  createDefaultInstrumentConfig,
  getContextLabel,
  getInstrumentLabel,
  getRoomQuestionsList,
  scoreToAnchorLevel,
  type RoomPublic,
} from '../utils/emotiSam';
import { EmotiSamRow } from './EmotiSamRow';
import { InstrumentFigure } from './InstrumentFigure';

interface EvaluateViewProps {
  room: RoomPublic;
  onExitHome: () => void;
}

interface QuestionDraft {
  valence: number | null;
  arousal: number | null;
  dominance: number | null;
  comment: string;
}

interface SubmittedQuestionSummary {
  questionId: string;
  questionIndex: number;
  prompt: string;
  valence: number;
  arousal: number;
  dominance: number;
}

const EMPTY_DRAFT: QuestionDraft = {
  valence: null,
  arousal: null,
  dominance: null,
  comment: '',
};

export const EvaluateView: React.FC<EvaluateViewProps> = ({
  room: initialRoom,
  onExitHome,
}) => {
  const [room, setRoom] = useState<RoomPublic>(initialRoom);
  const questions = useMemo(() => getRoomQuestionsList(room), [room]);
  const instrumentConfig = useMemo(
    () => room.instrumentConfig || createDefaultInstrumentConfig(room.instrument || 'e-sam', room.scale),
    [room.instrumentConfig, room.instrument, room.scale]
  );

  const [participantName, setParticipantName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [refreshingQuestions, setRefreshingQuestions] = useState(false);

  const [attemptedStep, setAttemptedStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedSummary, setSubmittedSummary] = useState<{
    userId: string;
    participantName: string;
    items: SubmittedQuestionSummary[];
  } | null>(null);

  const safeIndex = Math.min(currentIndex, Math.max(0, questions.length - 1));
  const currentQuestion = questions[safeIndex] || { id: 'q1', prompt: room.question };
  const currentDraft = drafts[currentQuestion.id] || EMPTY_DRAFT;
  const isMultiQuestion = questions.length > 1;
  const isLastQuestion = safeIndex === questions.length - 1;

  const updateCurrentDraft = (patch: Partial<QuestionDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || EMPTY_DRAFT),
        ...patch,
      },
    }));
  };

  const isQuestionComplete = (qId: string) => {
    const d = drafts[qId];
    return Boolean(d && d.valence !== null && d.arousal !== null && d.dominance !== null);
  };

  const handleRefreshQuestions = async () => {
    setRefreshingQuestions(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${room.pin}`);
      const data = await res.json();
      if (res.ok && data?.room) {
        setRoom(data.room as RoomPublic);
      }
    } catch {
      // Ignore transient refresh failure
    } finally {
      setRefreshingQuestions(false);
    }
  };

  const handleNextQuestion = () => {
    setError('');
    if (
      currentDraft.valence === null ||
      currentDraft.arousal === null ||
      currentDraft.dominance === null
    ) {
      setAttemptedStep(true);
      setError(
        `Selecione uma opção nas 3 dimensões antes de avançar da Questão ${safeIndex + 1}.`
      );
      return;
    }
    setAttemptedStep(false);
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevQuestion = () => {
    setError('');
    setAttemptedStep(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelectStep = (idx: number) => {
    setError('');
    setAttemptedStep(false);
    setCurrentIndex(idx);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedStep(true);
    setError('');

    if (room.requireParticipantName && !participantName.trim()) {
      setError('Informe sua identificação antes de enviar a avaliação.');
      return;
    }

    const firstIncompleteIdx = questions.findIndex((q) => !isQuestionComplete(q.id));
    if (firstIncompleteIdx !== -1) {
      setCurrentIndex(firstIncompleteIdx);
      setError(
        questions.length > 1
          ? `Responda às 3 dimensões na Questão ${firstIncompleteIdx + 1} antes de enviar.`
          : 'Selecione uma opção nas 3 dimensões antes de enviar.'
      );
      return;
    }

    const answersPayload = questions.map((q) => {
      const d = drafts[q.id] || EMPTY_DRAFT;
      return {
        questionId: q.id,
        valence: d.valence as number,
        arousal: d.arousal as number,
        dominance: d.dominance as number,
        comment: room.allowComments ? d.comment.trim() : '',
      };
    });

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.pin}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: room.requireParticipantName ? participantName.trim() : '',
          answers: answersPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao enviar avaliação.');
      }
      setSubmittedSummary({
        userId: String(data.userId || ''),
        participantName: room.requireParticipantName ? participantName.trim() : '',
        items: questions.map((q, idx) => {
          const d = drafts[q.id] || EMPTY_DRAFT;
          return {
            questionId: q.id,
            questionIndex: idx + 1,
            prompt: q.prompt,
            valence: d.valence as number,
            arousal: d.arousal as number,
            dominance: d.dominance as number,
          };
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar sua resposta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewParticipant = async () => {
    setParticipantName('');
    setDrafts({});
    setCurrentIndex(0);
    setAttemptedStep(false);
    setError('');
    setSubmittedSummary(null);
    await handleRefreshQuestions();
  };

  if (submittedSummary) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10 text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-700" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Avaliação registrada!
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              {submittedSummary.participantName ? (
                <>Obrigado, <strong>{submittedSummary.participantName}</strong>. </>
              ) : (
                <>Obrigado pela participação. </>
              )}
              {submittedSummary.items.length > 1
                ? `Suas respostas para as ${submittedSummary.items.length} questões na sala `
                : 'Sua resposta afetiva na sala '}
              <strong className="font-mono">{room.pin}</strong> foram salvas com sucesso.
            </p>
            {submittedSummary.userId && (
              <p className="text-xs font-mono text-slate-500">
                Identificador da submissão: <strong className="text-slate-700">{submittedSummary.userId}</strong>
              </p>
            )}
          </div>

          <div className="space-y-4 text-left">
            {submittedSummary.items.map((item) => {
              const scoreByDim = {
                valence: item.valence,
                arousal: item.arousal,
                dominance: item.dominance,
              };
              return (
                <div key={item.questionId} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  {submittedSummary.items.length > 1 && (
                    <p className="text-xs font-semibold text-slate-800">
                      <span className="font-mono text-blue-700 mr-1.5">Q{item.questionIndex}</span>
                      {item.prompt}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2.5">
                    {DIMENSION_KEYS.map((dimKey) => {
                      const score = scoreByDim[dimKey];
                      const anchor = scoreToAnchorLevel(score, room.scale);
                      const dimCfg = instrumentConfig.dimensions[dimKey];
                      return (
                        <div key={dimKey} className="rounded-lg border border-slate-200 bg-white p-2.5 flex flex-col items-center">
                          <InstrumentFigure
                            instrument={instrumentConfig.instrument}
                            dimension={dimKey}
                            anchorLevel={anchor}
                            altText={dimCfg.altTexts[anchor]}
                            customImage={dimCfg.customImages?.[anchor]}
                            className="w-11 h-9 sm:w-14 sm:h-12"
                          />
                          <span className="mt-1 text-[11px] text-slate-600 text-center">
                            {dimCfg.title.split(' / ')[0]}
                          </span>
                          <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                            {score} / {room.scale}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleNewParticipant}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Nova Resposta (Outro Participante)</span>
            </button>
            <button
              type="button"
              onClick={onExitHome}
              className="w-full sm:w-auto rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExitHome}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Sair da sala</span>
        </button>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-mono font-semibold text-slate-700 whitespace-nowrap">PIN {room.pin}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{getInstrumentLabel(instrumentConfig.instrument)}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{getContextLabel(room.contextType)}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Escala {room.scale} pts</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleRefreshQuestions}
            disabled={refreshingQuestions}
            title="Verificar se o criador adicionou novas questões"
            className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-medium cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3 h-3 ${refreshingQuestions ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Atualizar questões</span>
          </button>
        </div>
      </div>

      {/* Multi-question step bar */}
      {isMultiQuestion && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-700">
            Questão <span className="font-mono text-blue-700">{safeIndex + 1}</span> de{' '}
            <span className="font-mono">{questions.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Questões da sala">
            {questions.map((q, idx) => {
              const active = idx === safeIndex;
              const complete = isQuestionComplete(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleSelectStep(idx)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-700 text-white'
                      : complete
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  {complete && !active && <Check className="w-3 h-3" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Room Question Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">{room.title}</p>
          {isMultiQuestion && (
            <span className="text-xs font-mono font-bold text-blue-700">
              Questão {safeIndex + 1}/{questions.length}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug" style={{ textWrap: 'balance' }}>
          {currentQuestion.prompt}
        </h1>

        {/* Identification field ONLY when explicitly enabled by the room creator */}
        {room.requireParticipantName && (
          <div className="pt-2 max-w-sm">
            <label htmlFor="eval-participant-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Identificação do Participante *
            </label>
            <input
              id="eval-participant-name"
              type="text"
              maxLength={80}
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Seu nome ou apelido"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        )}
      </div>

      {/* 3 Purely Pictorial Affective Dimensions */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {DIMENSION_KEYS.map((dimKey) => (
          <EmotiSamRow
            key={dimKey}
            dimensionKey={dimKey}
            dimensionConfig={instrumentConfig.dimensions[dimKey]}
            instrument={instrumentConfig.instrument}
            scale={instrumentConfig.scale}
            showDimensionTexts={instrumentConfig.showDimensionTexts}
            value={currentDraft[dimKey]}
            onChange={(score) => updateCurrentDraft({ [dimKey]: score })}
            hasError={attemptedStep && currentDraft[dimKey] === null}
            idPrefix={`eval-${currentQuestion.id}`}
          />
        ))}

        {room.allowComments && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <label htmlFor="eval-comment" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Comentário opcional {isMultiQuestion ? `(Questão ${safeIndex + 1})` : ''}
            </label>
            <textarea
              id="eval-comment"
              rows={3}
              maxLength={1000}
              value={currentDraft.comment}
              onChange={(e) => updateCurrentDraft({ comment: e.target.value })}
              placeholder="Se desejar, descreva o motivo da sua avaliação ou sugestões de melhoria..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
          <div>
            {isMultiQuestion && safeIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevQuestion}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Questão Anterior</span>
              </button>
            )}
          </div>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
            {isMultiQuestion && !isLastQuestion ? (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              >
                <span>Próxima Questão</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>
                  {submitting
                    ? 'Enviando...'
                    : isMultiQuestion
                    ? 'Enviar Todas as Respostas'
                    : 'Enviar Avaliação'}
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

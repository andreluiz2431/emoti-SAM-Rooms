import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import {
  DIMENSIONS,
  getContextLabel,
  type RoomPublic,
} from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';
import { EmotiSamRow } from './EmotiSamRow';

interface EvaluateViewProps {
  room: RoomPublic;
  initialParticipantName: string;
  onExitHome: () => void;
}

export const EvaluateView: React.FC<EvaluateViewProps> = ({
  room,
  initialParticipantName,
  onExitHome,
}) => {
  const [participantName, setParticipantName] = useState(initialParticipantName);
  const [valence, setValence] = useState<number | null>(null);
  const [arousal, setArousal] = useState<number | null>(null);
  const [dominance, setDominance] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState<{
    participantName: string;
    valence: number;
    arousal: number;
    dominance: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setError('');

    if (!participantName.trim()) {
      setError('Informe seu nome ou apelido antes de enviar.');
      return;
    }
    if (valence === null || arousal === null || dominance === null) {
      setError('Selecione uma opção nas 3 dimensões (Valência, Excitação e Dominância).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.pin}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName: participantName.trim(),
          valence,
          arousal,
          dominance,
          comment: room.allowComments ? comment.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Falha ao enviar avaliação.');
      }
      setSubmittedData({
        participantName: participantName.trim(),
        valence,
        arousal,
        dominance,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar sua resposta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewParticipant = () => {
    setParticipantName('');
    setValence(null);
    setArousal(null);
    setDominance(null);
    setComment('');
    setAttemptedSubmit(false);
    setError('');
    setSubmittedData(null);
  };

  const toAnchor = (score: number): 1 | 2 | 3 | 4 | 5 => {
    if (room.scale === 5) return Math.min(5, Math.max(1, score)) as 1 | 2 | 3 | 4 | 5;
    return Math.min(5, Math.max(1, Math.round((score + 1) / 2))) as 1 | 2 | 3 | 4 | 5;
  };

  if (submittedData) {
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
              Obrigado, <strong>{submittedData.participantName}</strong>. Sua resposta afetiva na sala{' '}
              <strong className="font-mono">{room.pin}</strong> foi salva com sucesso.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col items-center">
              <EmotiSamFace
                dimension="valence"
                anchorLevel={toAnchor(submittedData.valence)}
                scaleVariant={room.scale}
                className="w-12 h-10 sm:w-16 sm:h-14"
              />
              <span className="mt-1 text-xs text-slate-600">Valência</span>
              <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                {submittedData.valence} / {room.scale}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col items-center">
              <EmotiSamFace
                dimension="arousal"
                anchorLevel={toAnchor(submittedData.arousal)}
                scaleVariant={room.scale}
                className="w-12 h-10 sm:w-16 sm:h-14"
              />
              <span className="mt-1 text-xs text-slate-600">Excitação</span>
              <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                {submittedData.arousal} / {room.scale}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col items-center">
              <EmotiSamFace
                dimension="dominance"
                anchorLevel={toAnchor(submittedData.dominance)}
                scaleVariant={room.scale}
                className="w-12 h-10 sm:w-16 sm:h-14"
              />
              <span className="mt-1 text-xs text-slate-600">Dominância</span>
              <span className="text-base font-mono font-bold text-slate-900 tabular-nums">
                {submittedData.dominance} / {room.scale}
              </span>
            </div>
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
          <span className="whitespace-nowrap">{getContextLabel(room.contextType)}</span>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">Escala {room.scale} pts</span>
        </div>
      </div>

      {/* Room Question Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 space-y-3">
        <p className="text-xs font-medium text-slate-500">{room.title}</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug" style={{ textWrap: 'balance' }}>
          {room.question}
        </h1>
        <div className="pt-2 max-w-sm">
          <label htmlFor="eval-participant-name" className="block text-xs font-medium text-slate-600 mb-1">
            Participante
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
      </div>

      {/* 3 emoti-SAM Dimensions */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <EmotiSamRow
          dimension={DIMENSIONS[0]}
          scale={room.scale}
          value={valence}
          onChange={setValence}
          hasError={attemptedSubmit && valence === null}
        />
        <EmotiSamRow
          dimension={DIMENSIONS[1]}
          scale={room.scale}
          value={arousal}
          onChange={setArousal}
          hasError={attemptedSubmit && arousal === null}
        />
        <EmotiSamRow
          dimension={DIMENSIONS[2]}
          scale={room.scale}
          value={dominance}
          onChange={setDominance}
          hasError={attemptedSubmit && dominance === null}
        />

        {room.allowComments && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <label htmlFor="eval-comment" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Comentário opcional
            </label>
            <textarea
              id="eval-comment"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{submitting ? 'Enviando...' : 'Enviar Avaliação'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

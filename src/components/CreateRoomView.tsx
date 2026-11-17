import React, { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileUp, Info, Plus, ShieldAlert, Trash2, Upload } from 'lucide-react';
import { formatCpfMask, onlyDigits, validateCpf } from '../utils/cpf';
import {
  parseImportedRoomJson,
  type ContextType,
  type RoomAdmin,
  type RoomQuestion,
  type RoomResponse,
  type ScaleType,
} from '../utils/emotiSam';
import { EmotiSamFace } from './EmotiSamFaces';

interface CreateRoomViewProps {
  onBack: () => void;
  onRoomCreated: (room: RoomAdmin, rawCpf: string) => void;
}

export const CreateRoomView: React.FC<CreateRoomViewProps> = ({ onBack, onRoomCreated }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<RoomQuestion[]>([
    { id: 'q1', prompt: 'Como você se sentiu durante esta experiência?' },
  ]);
  const [contextType, setContextType] = useState<ContextType>('system');
  const [scale, setScale] = useState<ScaleType>(5);
  const [allowComments, setAllowComments] = useState(true);
  const [cpf, setCpf] = useState('');

  // JSON Import state
  const [importedFileName, setImportedFileName] = useState('');
  const [importedOriginalPin, setImportedOriginalPin] = useState('');
  const [importedResponses, setImportedResponses] = useState<RoomResponse[]>([]);
  const [keepResponses, setKeepResponses] = useState(true);
  const [keepOriginalPin, setKeepOriginalPin] = useState(false);
  const [importError, setImportError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cpfDigits = onlyDigits(cpf);
  const cpfIsValid = cpfDigits.length === 11 && validateCpf(cpf);
  const cpfHasError = cpfDigits.length === 11 && !cpfIsValid;

  const handleAddQuestion = () => {
    if (questions.length >= 30) return;
    const nextNum = questions.length + 1;
    const used = new Set(questions.map((q) => q.id));
    let id = `q${nextNum}`;
    let counter = nextNum;
    while (used.has(id)) {
      counter += 1;
      id = `q${counter}`;
    }
    setQuestions((prev) => [...prev, { id, prompt: '' }]);
  };

  const handleQuestionChange = (index: number, prompt: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, prompt } : q)));
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleJsonFile = async (file: File | undefined) => {
    setImportError('');
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportedRoomJson(text);
      setTitle(parsed.title);
      setQuestions(
        parsed.questions.length > 0
          ? parsed.questions
          : [{ id: 'q1', prompt: parsed.question }]
      );
      setContextType(parsed.contextType);
      setScale(parsed.scale);
      setAllowComments(parsed.allowComments);
      setImportedFileName(file.name);
      setImportedOriginalPin(parsed.pin);
      setImportedResponses(parsed.responses);
      setKeepResponses(true);
      setKeepOriginalPin(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao ler o arquivo JSON.');
    }
  };

  const clearImported = () => {
    setImportedFileName('');
    setImportedOriginalPin('');
    setImportedResponses([]);
    setKeepResponses(true);
    setKeepOriginalPin(false);
    setImportError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (title.trim().length < 3) {
      setError('Informe um título para a sala com pelo menos 3 caracteres.');
      return;
    }

    const cleanedQuestions = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt.trim(),
    }));
    const invalidIdx = cleanedQuestions.findIndex((q) => q.prompt.length < 5);
    if (invalidIdx !== -1) {
      setError(
        `A Questão ${invalidIdx + 1} deve ter pelo menos 5 caracteres.`
      );
      return;
    }

    if (!cpfIsValid) {
      setError('Informe um CPF válido (11 dígitos com dígitos verificadores corretos).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          question: cleanedQuestions[0].prompt,
          questions: cleanedQuestions,
          contextType,
          scale,
          allowComments,
          cpf: cpfDigits,
          keepResponses: importedFileName ? keepResponses : false,
          importedResponses: importedFileName && keepResponses ? importedResponses : [],
          keepOriginalPin: importedFileName ? keepOriginalPin : false,
          requestedPin: importedFileName && keepOriginalPin ? importedOriginalPin : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível criar a sala.');
      }
      onRoomCreated(data.room as RoomAdmin, cpfDigits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar a sala.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Voltar ao início</span>
        </button>
        <span className="text-xs text-slate-500 font-mono">Retenção máxima: 30 dias</span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Criar ou Importar Sala</h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure os parâmetros do instrumento emoti-SAM para sua turma, oficina ou teste de usabilidade.
        </p>
      </div>

      {/* Import Room from JSON */}
      <section aria-labelledby="import-heading" className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 id="import-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>Importar Sala de Arquivo (.json)</span>
            </h2>
            <p className="text-sm text-slate-600">
              Opcional: carregue um backup JSON exportado anteriormente para clonar o modelo ou restaurar respostas.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              id="import-json-input"
              type="file"
              accept=".json,application/json"
              onChange={(e) => handleJsonFile(e.target.files?.[0])}
              className="sr-only"
            />
            <label
              htmlFor="import-json-input"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Selecionar .json</span>
            </label>
            {importedFileName && (
              <button
                type="button"
                onClick={clearImported}
                className="text-xs font-medium text-slate-600 hover:text-red-700 px-2 py-1 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {importError && (
          <p role="alert" className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {importError}
          </p>
        )}

        {importedFileName && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                Arquivo carregado: <strong className="font-mono">{importedFileName}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>{importedResponses.length} resposta(s) no arquivo</span>
              {importedOriginalPin && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">PIN original: {importedOriginalPin}</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepResponses}
                  onChange={(e) => setKeepResponses(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-800">
                  <strong>Manter respostas existentes do arquivo importado</strong>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    Desmarque para criar uma sala limpa reaproveitando apenas as configurações.
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3 ${
                  importedOriginalPin ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!importedOriginalPin}
                  checked={keepOriginalPin}
                  onChange={(e) => setKeepOriginalPin(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-800">
                  <strong>Manter o mesmo PIN original da sala</strong>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {importedOriginalPin
                      ? `Restaurar PIN ${importedOriginalPin} (se desmarcado, gera novo PIN).`
                      : 'Arquivo sem PIN original válido.'}
                  </span>
                </span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Create Room Form */}
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6" noValidate>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label htmlFor="room-title" className="block text-sm font-semibold text-slate-900 mb-1.5">
              Título da Sala / Avaliação *
            </label>
            <input
              id="room-title"
              type="text"
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Oficina de Programação com Scratch — Escola Municipal"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Perguntas da Avaliação ({questions.length}) *
                </span>
                <span className="block text-xs text-slate-500">
                  Cada questão será avaliada pelo participante nas 3 dimensões emoti-SAM (Valência, Excitação e Dominância).
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={questions.length >= 30}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Adicionar pergunta</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {questions.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <label htmlFor={`room-question-${idx}`} className="sr-only">
                      Pergunta da Questão {idx + 1}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono font-bold text-slate-400 select-none">
                        Q{idx + 1}
                      </span>
                      <input
                        id={`room-question-${idx}`}
                        type="text"
                        maxLength={280}
                        value={q.prompt}
                        onChange={(e) => handleQuestionChange(idx, e.target.value)}
                        placeholder={
                          idx === 0
                            ? 'Ex.: Como você se sentiu na tela inicial do sistema?'
                            : `Ex.: Como você se sentiu na etapa ${idx + 1}?`
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                      />
                    </div>
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      aria-label={`Remover Questão ${idx + 1}`}
                      title={`Remover Questão ${idx + 1}`}
                      className="mt-1 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Context & Scale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="block text-sm font-semibold text-slate-900 mb-2">
              Tipo de Contexto *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Tipo de contexto">
              <button
                type="button"
                role="radio"
                aria-checked={contextType === 'system'}
                onClick={() => setContextType('system')}
                className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer ${
                  contextType === 'system'
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Sistema Computacional</span>
                <span className="block text-xs text-slate-500 mt-0.5">Apps, sites, protótipos de IHC</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={contextType === 'extension'}
                onClick={() => setContextType('extension')}
                className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer ${
                  contextType === 'extension'
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Ação de Extensão</span>
                <span className="block text-xs text-slate-500 mt-0.5">Oficinas, escolas e comunidade</span>
              </button>
            </div>
          </div>

          <div>
            <span className="block text-sm font-semibold text-slate-900 mb-2">
              Escala do Instrumento emoti-SAM *
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Escala do instrumento">
              <button
                type="button"
                role="radio"
                aria-checked={scale === 5}
                onClick={() => setScale(5)}
                className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer ${
                  scale === 5
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Escala de 5 pontos</span>
                <span className="block text-xs text-slate-500 mt-0.5">Ideal para extensão e público geral</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={scale === 9}
                onClick={() => setScale(9)}
                className={`rounded-lg border px-3.5 py-3 text-left transition-all cursor-pointer ${
                  scale === 9
                    ? 'border-blue-700 bg-blue-50/70 ring-2 ring-blue-600/15'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Escala de 9 pontos</span>
                <span className="block text-xs text-slate-500 mt-0.5">Pontos intermediários para sistemas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scale live preview */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
            <span className="font-semibold text-slate-800">
              Pré-visualização (Dimensão Dominância · Escala de {scale} pontos)
            </span>
            <span className="font-mono">{scale === 9 ? '9 opções (9 a 1)' : '5 figuras diretas (5 a 1)'}</span>
          </div>
          <div className="grid grid-cols-5 gap-2 items-center justify-items-center">
            {([5, 4, 3, 2, 1] as const).map((level) => (
              <div key={level} className="flex flex-col items-center gap-1">
                <EmotiSamFace dimension="dominance" anchorLevel={level} scaleVariant={scale} className="w-11 h-9 sm:w-14 sm:h-11" />
                <span className="text-[11px] font-mono text-slate-600">
                  {scale === 9 ? level * 2 - 1 : level}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Comments toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allowComments}
            onChange={(e) => setAllowComments(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
          />
          <span className="text-sm text-slate-800">
            Permitir campo opcional de comentário aberto aos participantes
          </span>
        </label>

        {/* Creator CPF Certification */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div>
            <label htmlFor="creator-cpf" className="block text-sm font-semibold text-slate-900 mb-1">
              CPF do Criador (Chave de Acesso ao Painel) *
            </label>
            <p className="text-xs text-slate-600 mb-2">
              Necessário para acessar resultados, exportar CSV/JSON e excluir a sala antecipadamente.
            </p>
            <div className="max-w-xs">
              <input
                id="creator-cpf"
                type="text"
                inputMode="numeric"
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(formatCpfMask(e.target.value))}
                placeholder="000.000.000-00"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 ${
                  cpfHasError
                    ? 'border-red-400 bg-red-50/40 text-red-900 focus:ring-red-200'
                    : cpfIsValid
                    ? 'border-emerald-500 bg-emerald-50/30 text-slate-900 focus:ring-emerald-200'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-blue-700 focus:ring-blue-600/20'
                }`}
              />
            </div>
            {cpfHasError && (
              <p className="mt-1.5 text-xs font-medium text-red-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>CPF matematicamente inválido. Verifique os dígitos verificadores.</span>
              </p>
            )}
            {cpfIsValid && (
              <p className="mt-1.5 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>CPF válido. Será convertido em hash SHA-256 irreversível no servidor.</span>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p>
                <strong>Segurança e LGPD:</strong> O servidor nunca armazena seu CPF em texto puro — apenas o
                resumo criptográfico SHA-256 para autenticar seu acesso ao painel.
              </p>
              <p>
                <strong>Retenção Máxima de 30 Dias:</strong> Esta sala e suas respostas permanecerão disponíveis
                por no máximo <strong>30 dias</strong> a partir da criação, sendo apagadas automaticamente após o prazo.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Criando sala...' : 'Criar Sala e Gerar PIN'}
          </button>
        </div>
      </form>
    </div>
  );
};

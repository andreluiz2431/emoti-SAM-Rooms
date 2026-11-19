import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Info,
  Mail,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  createDefaultInstrumentConfig,
  parseImportedRoomJson,
  type ContextType,
  type InstrumentConfig,
  type RoomAdmin,
  type RoomQuestion,
  type RoomResponse,
} from '../utils/emotiSam';
import { InstrumentConfigurator } from './InstrumentConfigurator';

interface CreateRoomViewProps {
  onBack: () => void;
  onRoomCreated: (room: RoomAdmin, creatorToken: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const CreateRoomView: React.FC<CreateRoomViewProps> = ({ onBack, onRoomCreated }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<RoomQuestion[]>([
    { id: 'q1', prompt: 'Como você se sentiu durante esta experiência?' },
  ]);
  const [contextType, setContextType] = useState<ContextType>('system');
  const [instrumentConfig, setInstrumentConfig] = useState<InstrumentConfig>(() =>
    createDefaultInstrumentConfig('e-sam', 5)
  );
  const [requireParticipantName, setRequireParticipantName] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // Email + 6-digit OTP state
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [creatorToken, setCreatorToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // JSON Import state
  const [importedFileName, setImportedFileName] = useState('');
  const [importedOriginalPin, setImportedOriginalPin] = useState('');
  const [importedResponses, setImportedResponses] = useState<RoomResponse[]>([]);
  const [keepResponses, setKeepResponses] = useState(true);
  const [keepOriginalPin, setKeepOriginalPin] = useState(false);
  const [importError, setImportError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);
  const isEmailVerified = Boolean(creatorToken && verifiedEmail === normalizedEmail);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim().toLowerCase() !== verifiedEmail) {
      setCreatorToken('');
      setVerifiedEmail('');
    }
    setOtpError('');
  };

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
      setInstrumentConfig(parsed.instrumentConfig);
      setRequireParticipantName(parsed.requireParticipantName);
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

  const handleRequestOtp = async () => {
    setOtpError('');
    setOtpInfo('');
    setDevCodeHint('');
    if (!isEmailValid) {
      setOtpError('Informe um endereço de e-mail válido.');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, purpose: 'create' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível enviar o código de verificação.');
      }
      setOtpSent(true);
      setOtpCode('');
      if (data.deliveryMode === 'dev-fallback' && data.devCode) {
        setDevCodeHint(String(data.devCode));
        setOtpInfo('Ambiente de teste sem EMAIL_API_KEY configurada: código gerado no servidor e exibido abaixo.');
      } else {
        setOtpInfo(`Código de 6 dígitos enviado para ${normalizedEmail}. Válido por 10 minutos.`);
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Erro ao enviar código.');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpCode = async (): Promise<string | null> => {
    setOtpError('');
    const cleanCode = otpCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setOtpError('Digite o código numérico de 6 dígitos enviado ao seu e-mail.');
      return null;
    }

    setOtpVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Código inválido ou expirado.');
      }
      setCreatorToken(data.token);
      setVerifiedEmail(normalizedEmail);
      setDevCodeHint('');
      setOtpInfo('');
      return data.token as string;
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Falha ao validar código.');
      return null;
    } finally {
      setOtpVerifying(false);
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
      setError(`A Questão ${invalidIdx + 1} deve ter pelo menos 5 caracteres.`);
      return;
    }

    let activeToken = isEmailVerified ? creatorToken : '';
    if (!activeToken) {
      if (!isEmailValid) {
        setError('Informe seu e-mail e conclua a verificação por código de 6 dígitos.');
        return;
      }
      if (otpSent && otpCode.replace(/\D/g, '').length === 6) {
        const verifiedToken = await verifyOtpCode();
        if (!verifiedToken) return;
        activeToken = verifiedToken;
      } else {
        setError('Clique em "Enviar código de verificação" e confirme o código de 6 dígitos recebido no seu e-mail.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          question: cleanedQuestions[0].prompt,
          questions: cleanedQuestions,
          contextType,
          instrument: instrumentConfig.instrument,
          scale: instrumentConfig.scale,
          instrumentConfig,
          requireParticipantName,
          allowComments,
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
      onRoomCreated(data.room as RoomAdmin, activeToken);
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
          Configure os parâmetros do instrumento e-SAM para a avaliação da experiência afetiva no uso de um sistema computacional ou participação em ação de extensão.
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
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-7" noValidate>
        {/* Basic Metadata & Multi-Question Builder */}
        <div className="space-y-5">
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

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Perguntas da Avaliação ({questions.length}) *
                </span>
                <span className="block text-xs text-slate-500">
                  Cada questão será avaliada pelo participante nas 3 dimensões (Valência, Excitação e Dominância).
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

        {/* Instrument, Scales (3/5/9), Customization, Ordering & Full Live 3-Dimension Preview */}
        <div className="pt-5 border-t border-slate-200">
          <InstrumentConfigurator
            config={instrumentConfig}
            onChange={setInstrumentConfig}
            idPrefix="create"
          />
        </div>

        {/* Participant Options */}
        <div className="pt-5 border-t border-slate-200 space-y-3">
          <span className="block text-sm font-semibold text-slate-900">
            Opções de Participação
          </span>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              id="require-participant-name"
              type="checkbox"
              checked={requireParticipantName}
              onChange={(e) => setRequireParticipantName(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-sm text-slate-800">
              <strong>Exigir identificação do respondente</strong>
              <span className="block text-xs text-slate-500 mt-0.5">
                Desativado por padrão (avaliação anônima). Mesmo quando desativado ou com nomes repetidos, cada submissão recebe um <code className="font-mono">ID_Usuario</code> único.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              id="allow-comments"
              type="checkbox"
              checked={allowComments}
              onChange={(e) => setAllowComments(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-sm text-slate-800">
              Permitir campo opcional de comentário aberto aos participantes
            </span>
          </label>
        </div>

        {/* Creator Identification via Email + 6-digit OTP */}
        <div className="pt-5 border-t border-slate-200 space-y-4">
          <div>
            <label htmlFor="creator-email" className="block text-sm font-semibold text-slate-900 mb-1">
              E-mail do Criador (Verificação por Código OTP) *
            </label>
            <p className="text-xs text-slate-600 mb-2.5">
              Confirme a titularidade do seu e-mail para proteger o acesso ao painel de resultados, exportação e edição da sala.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 max-w-md">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="creator-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="pesquisador@universidade.edu.br"
                  className={`w-full rounded-lg border pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                    isEmailVerified
                      ? 'border-emerald-500 bg-emerald-50/30 text-slate-900 focus:ring-emerald-200'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-blue-700 focus:ring-blue-600/20'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpSending || !isEmailValid}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-700 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {otpSending
                    ? 'Enviando...'
                    : otpSent
                    ? 'Reenviar código'
                    : 'Enviar código de verificação'}
                </span>
              </button>
            </div>
          </div>

          {isEmailVerified && (
            <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>E-mail <strong>{verifiedEmail}</strong> verificado com sucesso. Você já pode criar a sala.</span>
            </p>
          )}

          {otpSent && !isEmailVerified && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
              {otpInfo && <p className="text-xs text-slate-700">{otpInfo}</p>}

              {devCodeHint && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Modo de desenvolvimento (sem <code className="font-mono">EMAIL_API_KEY</code>): código de verificação{' '}
                    <strong className="font-mono text-sm tracking-widest">{devCodeHint}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devCodeHint)}
                    className="rounded border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    Preencher código
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                <div className="max-w-[220px] flex-1">
                  <label htmlFor="creator-otp-code" className="block text-xs font-semibold text-slate-800 mb-1">
                    Código de verificação (6 dígitos)
                  </label>
                  <input
                    id="creator-otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-center text-base font-mono font-bold tracking-[0.25em] tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyOtpCode}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {otpVerifying ? 'Confirmando...' : 'Confirmar código'}
                </button>
              </div>
            </div>
          )}

          {otpError && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {otpError}
            </p>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p>
                <strong>Integridade Metodológica:</strong> As configurações do instrumento poderão ser ajustadas no Painel do Criador apenas enquanto a sala não possuir respostas. Após a 1ª resposta, ficam bloqueadas permanentemente.
              </p>
              <p>
                <strong>Privacidade e Retenção:</strong> O servidor armazena apenas o hash SHA-256 do seu e-mail e remove automaticamente a sala após <strong>30 dias</strong>.
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

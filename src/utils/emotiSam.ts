export type ContextType = 'system' | 'extension';
export type InstrumentType = 'e-sam' | 'sam';
export type ScaleType = 3 | 5 | 9;
export type DimensionKey = 'valence' | 'arousal' | 'dominance';
export type DimensionOrder = 'pos-to-neg' | 'neg-to-pos';
export type AnchorLevel = 1 | 2 | 3 | 4 | 5;

export interface RoomQuestion {
  id: string;
  prompt: string;
}

export interface DimensionCustomization {
  title: string;
  subtitle: string;
  order: DimensionOrder;
  altTexts: Record<AnchorLevel, string>;
  customImages?: Partial<Record<AnchorLevel, string>>;
}

export interface InstrumentConfig {
  instrument: InstrumentType;
  scale: ScaleType;
  showDimensionTexts: boolean;
  dimensions: Record<DimensionKey, DimensionCustomization>;
}

export interface RoomResponse {
  id: string;
  userId: string;
  submissionId?: string;
  questionId?: string;
  questionIndex?: number;
  questionPrompt?: string;
  participantName: string;
  valence: number;
  arousal: number;
  dominance: number;
  comment: string;
  submittedAt: string;
}

export interface RoomPublic {
  pin: string;
  title: string;
  question: string;
  questions: RoomQuestion[];
  contextType: ContextType;
  instrument: InstrumentType;
  scale: ScaleType;
  instrumentConfig: InstrumentConfig;
  requireParticipantName: boolean;
  allowComments: boolean;
  createdAt: number;
  expiresAt: number;
  responseCount: number;
}

export interface RoomAdmin {
  pin: string;
  title: string;
  question: string;
  questions: RoomQuestion[];
  contextType: ContextType;
  instrument: InstrumentType;
  scale: ScaleType;
  instrumentConfig: InstrumentConfig;
  requireParticipantName: boolean;
  allowComments: boolean;
  creatorEmailMasked?: string;
  locked: boolean;
  createdAt: number;
  expiresAt: number;
  responses: RoomResponse[];
}

export interface ExportedRoomPayload {
  schemaVersion: string;
  exportedAt: string;
  pin: string;
  title: string;
  question: string;
  questions: RoomQuestion[];
  contextType: ContextType;
  instrument: InstrumentType;
  scale: ScaleType;
  instrumentConfig: InstrumentConfig;
  requireParticipantName: boolean;
  allowComments: boolean;
  createdAt: number;
  expiresAt: number;
  responses: RoomResponse[];
}

export const DIMENSION_KEYS: DimensionKey[] = ['valence', 'arousal', 'dominance'];

export function getDefaultDimensionOrders(instrument: InstrumentType): Record<DimensionKey, DimensionOrder> {
  if (instrument === 'sam') {
    return {
      valence: 'pos-to-neg',
      arousal: 'pos-to-neg',
      dominance: 'neg-to-pos',
    };
  }
  return {
    valence: 'pos-to-neg',
    arousal: 'pos-to-neg',
    dominance: 'pos-to-neg',
  };
}

export function createDefaultInstrumentConfig(
  instrument: InstrumentType = 'e-sam',
  scale: ScaleType = 5
): InstrumentConfig {
  const orders = getDefaultDimensionOrders(instrument);
  return {
    instrument,
    scale,
    showDimensionTexts: true,
    dimensions: {
      valence: {
        title: 'Valência / Prazer',
        subtitle: 'Satisfação e agrado durante a experiência',
        order: orders.valence,
        altTexts: {
          5: 'Valência máxima: muito feliz e satisfeito',
          4: 'Valência positiva: sorridente e satisfeito',
          3: 'Valência neutra: expressão neutra',
          2: 'Valência negativa: triste ou insatisfeito',
          1: 'Valência mínima: irritado ou muito insatisfeito',
        },
      },
      arousal: {
        title: 'Excitação / Alerta',
        subtitle: 'Motivação, energia e estímulo sentido',
        order: orders.arousal,
        altTexts: {
          5: 'Excitação máxima: muito empolgado e energizado',
          4: 'Excitação positiva: animado e desperto',
          3: 'Excitação neutra: nível moderado de energia',
          2: 'Excitação baixa: entediado ou desanimado',
          1: 'Excitação mínima: calmo ou sonolento',
        },
      },
      dominance: {
        title: 'Dominância / Controle',
        subtitle: 'Sentimento de capacidade, facilidade e domínio',
        order: orders.dominance,
        altTexts: {
          5: 'Dominância máxima: total controle e confiança',
          4: 'Dominância positiva: confiante e tranquilo',
          3: 'Dominância neutra: controle moderado',
          2: 'Dominância baixa: confuso ou inseguro',
          1: 'Dominância mínima: sem controle ou frustrado',
        },
      },
    },
  };
}

export function getActiveAnchorLevels(scale: ScaleType): AnchorLevel[] {
  return scale === 3 ? [5, 3, 1] : [5, 4, 3, 2, 1];
}

/**
 * Returns anchor items in the visual left-to-right display order configured for the dimension.
 * Standardized score is ALWAYS 1 = lowest/most negative, max (3, 5, or 9) = highest/most positive.
 */
export function getOrderedAnchors(
  scale: ScaleType,
  order: DimensionOrder
): { anchorLevel: AnchorLevel; score: number }[] {
  const baseDesc: { anchorLevel: AnchorLevel; score: number }[] =
    scale === 3
      ? [
          { anchorLevel: 5, score: 3 },
          { anchorLevel: 3, score: 2 },
          { anchorLevel: 1, score: 1 },
        ]
      : scale === 5
      ? [
          { anchorLevel: 5, score: 5 },
          { anchorLevel: 4, score: 4 },
          { anchorLevel: 3, score: 3 },
          { anchorLevel: 2, score: 2 },
          { anchorLevel: 1, score: 1 },
        ]
      : [
          { anchorLevel: 5, score: 9 },
          { anchorLevel: 4, score: 7 },
          { anchorLevel: 3, score: 5 },
          { anchorLevel: 2, score: 3 },
          { anchorLevel: 1, score: 1 },
        ];

  return order === 'neg-to-pos' ? [...baseDesc].reverse() : baseDesc;
}

/**
 * Returns all selectable scores in visual left-to-right order (always 1..scale).
 */
export function getOrderedScaleScores(scale: ScaleType, order: DimensionOrder): number[] {
  const asc: number[] = [];
  for (let i = 1; i <= scale; i++) asc.push(i);
  return order === 'pos-to-neg' ? asc.reverse() : asc;
}

export function scoreToAnchorLevel(score: number, scale: ScaleType): AnchorLevel {
  if (scale === 3) {
    if (score >= 3) return 5;
    if (score === 2) return 3;
    return 1;
  }
  if (scale === 5) {
    return Math.min(5, Math.max(1, Math.round(score))) as AnchorLevel;
  }
  return Math.min(5, Math.max(1, Math.round((score + 1) / 2))) as AnchorLevel;
}

export function getContextLabel(contextType: ContextType): string {
  return contextType === 'extension'
    ? 'Ação de Extensão / Educacional'
    : 'Sistema Computacional';
}

export function getInstrumentLabel(instrument: InstrumentType): string {
  return instrument === 'sam' ? 'SAM Original (Lang & Bradley)' : 'e-SAM (emoti-SAM)';
}

export function formatRemainingRetention(expiresAt: number, now = Date.now()): string {
  const diff = expiresAt - now;
  if (diff <= 0) return 'Expirada';
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Expira em ${days} ${days === 1 ? 'dia' : 'dias'} e ${hours} ${hours === 1 ? 'hora' : 'horas'} — Retenção máxima de 30 dias`;
  }
  if (hours > 0) {
    return `Expira em ${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} min — Retenção máxima de 30 dias`;
  }
  return `Expira em ${Math.max(1, minutes)} min — Retenção máxima de 30 dias`;
}

export function getRoomQuestionsList(room: Pick<RoomPublic, 'question' | 'questions'>): RoomQuestion[] {
  if (Array.isArray(room.questions) && room.questions.length > 0) {
    return room.questions;
  }
  return room.question ? [{ id: 'q1', prompt: room.question }] : [];
}

export function countUniqueRespondents(responses: RoomResponse[]): number {
  const ids = new Set<string>();
  responses.forEach((r, idx) => {
    ids.add(r.userId || r.submissionId || `anon-${idx}`);
  });
  return ids.size;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[;"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates Excel-friendly Portuguese CSV (UTF-8 BOM + semicolon separator) including ID_Usuario.
 */
export function buildRoomCsv(room: RoomAdmin): string {
  const headers = [
    'PIN_Sala',
    'Titulo_Sala',
    'Contexto_Tipo',
    'Instrumento',
    'Escala',
    'Numero_Questao',
    'Questao',
    'ID_Usuario',
    'ID_Resposta',
    'Nome_Participante',
    'Data_Hora_ISO',
    'Valencia',
    'Excitacao',
    'Dominancia',
    'Comentario_Opcional',
  ];

  const contextLabel = getContextLabel(room.contextType);
  const instrumentLabel = getInstrumentLabel(room.instrument || room.instrumentConfig?.instrument || 'e-sam');
  const scaleLabel = `${room.scale} pontos`;
  const questions = getRoomQuestionsList(room);
  const questionMap = new Map(questions.map((q, idx) => [q.id, { index: idx + 1, prompt: q.prompt }]));

  const rows = room.responses.map((resp) => {
    const matched = resp.questionId ? questionMap.get(resp.questionId) : undefined;
    const qIndex = resp.questionIndex || matched?.index || 1;
    const qPrompt = resp.questionPrompt || matched?.prompt || room.question || '';
    return [
      escapeCsvCell(room.pin),
      escapeCsvCell(room.title),
      escapeCsvCell(contextLabel),
      escapeCsvCell(instrumentLabel),
      escapeCsvCell(scaleLabel),
      escapeCsvCell(qIndex),
      escapeCsvCell(qPrompt),
      escapeCsvCell(resp.userId || ''),
      escapeCsvCell(resp.id),
      escapeCsvCell(resp.participantName || 'Anônimo'),
      escapeCsvCell(resp.submittedAt),
      escapeCsvCell(resp.valence),
      escapeCsvCell(resp.arousal),
      escapeCsvCell(resp.dominance),
      escapeCsvCell(resp.comment || ''),
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

export function buildRoomExportJson(room: RoomAdmin): ExportedRoomPayload {
  const questions = getRoomQuestionsList(room);
  const instrumentConfig =
    room.instrumentConfig || createDefaultInstrumentConfig(room.instrument || 'e-sam', room.scale);
  return {
    schemaVersion: '2.0',
    exportedAt: new Date().toISOString(),
    pin: room.pin,
    title: room.title,
    question: questions[0]?.prompt || room.question,
    questions,
    contextType: room.contextType,
    instrument: instrumentConfig.instrument,
    scale: instrumentConfig.scale,
    instrumentConfig,
    requireParticipantName: Boolean(room.requireParticipantName),
    allowComments: room.allowComments,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responses: room.responses,
  };
}

export function parseImportedRoomJson(rawJson: string): {
  title: string;
  question: string;
  questions: RoomQuestion[];
  contextType: ContextType;
  instrument: InstrumentType;
  scale: ScaleType;
  instrumentConfig: InstrumentConfig;
  requireParticipantName: boolean;
  allowComments: boolean;
  pin: string;
  responses: RoomResponse[];
} {
  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo JSON inválido.');
  }
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) {
    throw new Error('O arquivo JSON não contém um título de sala válido.');
  }

  let questions: RoomQuestion[] = [];
  if (Array.isArray(parsed.questions)) {
    questions = parsed.questions
      .map((item: unknown, idx: number): RoomQuestion | null => {
        if (typeof item === 'string' && item.trim()) {
          return { id: `q${idx + 1}`, prompt: item.trim() };
        }
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as RoomQuestion).prompt === 'string' &&
          (item as RoomQuestion).prompt.trim()
        ) {
          const rawId = (item as RoomQuestion).id;
          return {
            id: typeof rawId === 'string' && rawId.trim() ? rawId.trim() : `q${idx + 1}`,
            prompt: (item as RoomQuestion).prompt.trim(),
          };
        }
        return null;
      })
      .filter((q: RoomQuestion | null): q is RoomQuestion => q !== null);
  }

  if (questions.length === 0) {
    if (typeof parsed.question !== 'string' || !parsed.question.trim()) {
      throw new Error('O arquivo JSON não contém perguntas de avaliação válidas.');
    }
    questions = [{ id: 'q1', prompt: parsed.question.trim() }];
  }

  const contextType: ContextType = parsed.contextType === 'extension' ? 'extension' : 'system';
  const rawInstrument = parsed.instrumentConfig?.instrument || parsed.instrument;
  const instrument: InstrumentType = rawInstrument === 'sam' ? 'sam' : 'e-sam';
  const rawScale = Number(parsed.instrumentConfig?.scale ?? parsed.scale);
  const scale: ScaleType = rawScale === 3 ? 3 : rawScale === 9 ? 9 : 5;

  const baseConfig = createDefaultInstrumentConfig(instrument, scale);
  const incomingCfg = parsed.instrumentConfig;
  if (incomingCfg && typeof incomingCfg === 'object') {
    baseConfig.showDimensionTexts = incomingCfg.showDimensionTexts !== false;
    for (const key of DIMENSION_KEYS) {
      const incDim = incomingCfg.dimensions?.[key];
      if (incDim && typeof incDim === 'object') {
        if (typeof incDim.title === 'string' && incDim.title.trim()) {
          baseConfig.dimensions[key].title = incDim.title.trim();
        }
        if (typeof incDim.subtitle === 'string' && incDim.subtitle.trim()) {
          baseConfig.dimensions[key].subtitle = incDim.subtitle.trim();
        }
        if (incDim.order === 'pos-to-neg' || incDim.order === 'neg-to-pos') {
          baseConfig.dimensions[key].order = incDim.order;
        }
        if (incDim.altTexts && typeof incDim.altTexts === 'object') {
          for (const lvl of [1, 2, 3, 4, 5] as AnchorLevel[]) {
            const val = incDim.altTexts[lvl] ?? incDim.altTexts[String(lvl)];
            if (typeof val === 'string' && val.trim()) {
              baseConfig.dimensions[key].altTexts[lvl] = val.trim();
            }
          }
        }
        if (incDim.customImages && typeof incDim.customImages === 'object') {
          const imgs: Partial<Record<AnchorLevel, string>> = {};
          for (const lvl of [1, 2, 3, 4, 5] as AnchorLevel[]) {
            const val = incDim.customImages[lvl] ?? incDim.customImages[String(lvl)];
            if (typeof val === 'string' && val.startsWith('data:image/')) {
              imgs[lvl] = val;
            }
          }
          if (Object.keys(imgs).length > 0) {
            baseConfig.dimensions[key].customImages = imgs;
          }
        }
      }
    }
  }

  const requireParticipantName = Boolean(parsed.requireParticipantName);
  const allowComments = parsed.allowComments !== false;
  const pin = typeof parsed.pin === 'string' && /^\d{6}$/.test(parsed.pin) ? parsed.pin : '';
  const responses: RoomResponse[] = Array.isArray(parsed.responses)
    ? parsed.responses
        .filter(
          (r: unknown): r is RoomResponse =>
            Boolean(r) &&
            typeof r === 'object' &&
            Number.isInteger((r as RoomResponse).valence) &&
            Number.isInteger((r as RoomResponse).arousal) &&
            Number.isInteger((r as RoomResponse).dominance)
        )
        .map((r: RoomResponse, idx: number) => ({
          ...r,
          userId: r.userId || r.submissionId || `USR-IMPORT-${idx + 1}`,
          participantName: typeof r.participantName === 'string' ? r.participantName : '',
        }))
    : [];

  return {
    title: parsed.title.trim(),
    question: questions[0].prompt,
    questions,
    contextType,
    instrument,
    scale,
    instrumentConfig: baseConfig,
    requireParticipantName,
    allowComments,
    pin,
    responses,
  };
}

/**
 * Resizes an uploaded image file client-side to max 160x160 to keep rooms.json lightweight.
 */
export function resizeImageFileToDataUrl(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const webp = canvas.toDataURL('image/webp', 0.85);
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

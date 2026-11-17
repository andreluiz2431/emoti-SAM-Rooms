export type ContextType = 'system' | 'extension';
export type ScaleType = 5 | 9;
export type DimensionKey = 'valence' | 'arousal' | 'dominance';

export interface RoomResponse {
  id: string;
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
  contextType: ContextType;
  scale: ScaleType;
  allowComments: boolean;
  createdAt: number;
  expiresAt: number;
  responseCount: number;
}

export interface RoomAdmin {
  pin: string;
  title: string;
  question: string;
  contextType: ContextType;
  scale: ScaleType;
  allowComments: boolean;
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
  contextType: ContextType;
  scale: ScaleType;
  allowComments: boolean;
  createdAt: number;
  expiresAt: number;
  responses: RoomResponse[];
}

export interface DimensionMeta {
  key: DimensionKey;
  title: string;
  subtitle: string;
  highLabel: string;
  lowLabel: string;
  anchors5: { value: number; label: string }[];
}

export const DIMENSIONS: DimensionMeta[] = [
  {
    key: 'valence',
    title: 'Valência / Prazer',
    subtitle: 'Satisfação e agrado durante a experiência',
    highLabel: 'Muito satisfeito / Prazer máximo',
    lowLabel: 'Muito insatisfeito / Desagrado máximo',
    anchors5: [
      { value: 5, label: 'Muito feliz' },
      { value: 4, label: 'Satisfeito' },
      { value: 3, label: 'Neutro' },
      { value: 2, label: 'Triste' },
      { value: 1, label: 'Irritado' },
    ],
  },
  {
    key: 'arousal',
    title: 'Excitação / Alerta',
    subtitle: 'Motivação, energia e estímulo sentido',
    highLabel: 'Muito empolgado / Motivação máxima',
    lowLabel: 'Sem energia / Sonolento',
    anchors5: [
      { value: 5, label: 'Empolgado' },
      { value: 4, label: 'Animado' },
      { value: 3, label: 'Neutro' },
      { value: 2, label: 'Entediado' },
      { value: 1, label: 'Sonolento' },
    ],
  },
  {
    key: 'dominance',
    title: 'Dominância / Controle',
    subtitle: 'Sentimento de capacidade, facilidade e domínio',
    highLabel: 'No controle / Domínio total',
    lowLabel: 'Frustrado / Sem controle',
    anchors5: [
      { value: 5, label: 'No controle' },
      { value: 4, label: 'Confiante' },
      { value: 3, label: 'Neutro' },
      { value: 2, label: 'Confuso' },
      { value: 1, label: 'Frustrado' },
    ],
  },
];

export function getScalePoints(scale: ScaleType): number[] {
  return scale === 9 ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [5, 4, 3, 2, 1];
}

export function getContextLabel(contextType: ContextType): string {
  return contextType === 'extension'
    ? 'Ação de Extensão / Educacional'
    : 'Sistema Computacional';
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

export interface DimensionStats {
  key: DimensionKey;
  title: string;
  count: number;
  mean: number;
  distribution: {
    score: number;
    count: number;
    percent: number;
    color: string;
    textColor: string;
    label: string;
  }[];
}

/**
 * Color palette inspired by Figure 9 of Hayashi et al. (2016):
 * most negative = dark red, intermediate negative = orange/light coral,
 * neutral = slate gray, intermediate positive = light green, most positive = dark green.
 */
export function getScoreColor(score: number, scale: ScaleType): string {
  if (scale === 5) {
    switch (score) {
      case 5: return '#15803D'; // Dark green
      case 4: return '#4ADE80'; // Light green
      case 3: return '#64748B'; // Neutral slate
      case 2: return '#FB923C'; // Light negative orange
      default: return '#DC2626'; // Dark red
    }
  }
  const palette9: Record<number, string> = {
    9: '#15803D',
    8: '#16A34A',
    7: '#4ADE80',
    6: '#86EFAC',
    5: '#64748B',
    4: '#FDBA74',
    3: '#FB923C',
    2: '#EF4444',
    1: '#B91C1C',
  };
  return palette9[score] || '#64748B';
}

export function getScoreTextColor(score: number, scale: ScaleType): string {
  if (scale === 5) {
    return score === 4 || score === 2 ? '#0F172A' : '#FFFFFF';
  }
  return [3, 4, 6, 7].includes(score) ? '#0F172A' : '#FFFFFF';
}

export function computeDimensionStats(
  responses: RoomResponse[],
  scale: ScaleType,
  key: DimensionKey,
  title: string
): DimensionStats {
  const points = getScalePoints(scale); // descending: [5..1] or [9..1]
  const orderedAscending = [...points].reverse(); // [1..5] or [1..9] so left=negative red, right=positive green like Fig 9!
  const count = responses.length;
  const sum = responses.reduce((acc, r) => acc + r[key], 0);
  const mean = count > 0 ? Number((sum / count).toFixed(2)) : 0;

  const distribution = orderedAscending.map((score) => {
    const scoreCount = responses.filter((r) => r[key] === score).length;
    const percent = count > 0 ? Number(((scoreCount / count) * 100).toFixed(1)) : 0;
    return {
      score,
      count: scoreCount,
      percent,
      color: getScoreColor(score, scale),
      textColor: getScoreTextColor(score, scale),
      label: `Nota ${score}`,
    };
  });

  return { key, title, count, mean, distribution };
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[;"\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates Excel-friendly Portuguese CSV (UTF-8 BOM + semicolon separator).
 */
export function buildRoomCsv(room: RoomAdmin): string {
  const headers = [
    'PIN_Sala',
    'Titulo_Sala',
    'Contexto_Tipo',
    'Escala',
    'ID_Resposta',
    'Nome_Participante',
    'Data_Hora_ISO',
    'Valencia',
    'Excitacao',
    'Dominancia',
    'Comentario_Opcional',
  ];

  const contextLabel = getContextLabel(room.contextType);
  const scaleLabel = `${room.scale} pontos`;

  const rows = room.responses.map((resp) => [
    escapeCsvCell(room.pin),
    escapeCsvCell(room.title),
    escapeCsvCell(contextLabel),
    escapeCsvCell(scaleLabel),
    escapeCsvCell(resp.id),
    escapeCsvCell(resp.participantName),
    escapeCsvCell(resp.submittedAt),
    escapeCsvCell(resp.valence),
    escapeCsvCell(resp.arousal),
    escapeCsvCell(resp.dominance),
    escapeCsvCell(resp.comment || ''),
  ].join(';'));

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
}

export function buildRoomExportJson(room: RoomAdmin): ExportedRoomPayload {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    pin: room.pin,
    title: room.title,
    question: room.question,
    contextType: room.contextType,
    scale: room.scale,
    allowComments: room.allowComments,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responses: room.responses,
  };
}

export function parseImportedRoomJson(rawJson: string): {
  title: string;
  question: string;
  contextType: ContextType;
  scale: ScaleType;
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
  if (typeof parsed.question !== 'string' || !parsed.question.trim()) {
    throw new Error('O arquivo JSON não contém uma pergunta de avaliação válida.');
  }

  const contextType: ContextType = parsed.contextType === 'extension' ? 'extension' : 'system';
  const scale: ScaleType = Number(parsed.scale) === 9 ? 9 : 5;
  const allowComments = parsed.allowComments !== false;
  const pin = typeof parsed.pin === 'string' && /^\d{6}$/.test(parsed.pin) ? parsed.pin : '';
  const responses: RoomResponse[] = Array.isArray(parsed.responses)
    ? parsed.responses.filter(
        (r: unknown): r is RoomResponse =>
          Boolean(r) &&
          typeof r === 'object' &&
          typeof (r as RoomResponse).participantName === 'string' &&
          Number.isInteger((r as RoomResponse).valence) &&
          Number.isInteger((r as RoomResponse).arousal) &&
          Number.isInteger((r as RoomResponse).dominance)
      )
    : [];

  return {
    title: parsed.title.trim(),
    question: parsed.question.trim(),
    contextType,
    scale,
    allowComments,
    pin,
    responses,
  };
}

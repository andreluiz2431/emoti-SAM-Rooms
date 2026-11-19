import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { hashEmail, maskEmail, validateEmail } from './otpService.js';

export const RETENTION_DAYS = 30;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const VALID_SCALES = [3, 5, 9];
export const VALID_INSTRUMENTS = ['e-sam', 'sam'];

const DEFAULT_DIMENSION_TEXTS = {
  valence: {
    title: 'Valência / Prazer',
    subtitle: 'Satisfação e agrado durante a experiência',
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
    altTexts: {
      5: 'Dominância máxima: total controle e confiança',
      4: 'Dominância positiva: confiante e tranquilo',
      3: 'Dominância neutra: controle moderado',
      2: 'Dominância baixa: confuso ou inseguro',
      1: 'Dominância mínima: sem controle ou frustrado',
    },
  },
};

export function getDefaultDimensionOrders(instrument) {
  if (instrument === 'sam') {
    // Original Lang & Bradley SAM: Valence & Arousal positive->negative, Dominance small(low)->large(high)
    return {
      valence: 'pos-to-neg',
      arousal: 'pos-to-neg',
      dominance: 'neg-to-pos',
    };
  }
  // e-SAM (emoti-SAM): positive/high -> negative/low across all 3 rows
  return {
    valence: 'pos-to-neg',
    arousal: 'pos-to-neg',
    dominance: 'pos-to-neg',
  };
}

export function normalizeInstrumentConfig(rawConfig, fallbackInstrument = 'e-sam', fallbackScale = 5) {
  const instrument = VALID_INSTRUMENTS.includes(rawConfig?.instrument)
    ? rawConfig.instrument
    : VALID_INSTRUMENTS.includes(fallbackInstrument)
    ? fallbackInstrument
    : 'e-sam';

  const rawScale = Number(rawConfig?.scale ?? fallbackScale);
  const scale = VALID_SCALES.includes(rawScale) ? rawScale : 5;
  const showDimensionTexts = rawConfig?.showDimensionTexts !== false;
  const defaultOrders = getDefaultDimensionOrders(instrument);

  const dimensions = {};
  for (const key of ['valence', 'arousal', 'dominance']) {
    const def = DEFAULT_DIMENSION_TEXTS[key];
    const incoming = rawConfig?.dimensions?.[key] || {};
    const order =
      incoming.order === 'neg-to-pos' || incoming.order === 'pos-to-neg'
        ? incoming.order
        : defaultOrders[key];

    const altTexts = {};
    for (const lvl of [1, 2, 3, 4, 5]) {
      const incomingAlt = incoming?.altTexts?.[lvl] ?? incoming?.altTexts?.[String(lvl)];
      altTexts[lvl] =
        typeof incomingAlt === 'string' && incomingAlt.trim()
          ? incomingAlt.trim().slice(0, 180)
          : def.altTexts[lvl];
    }

    const customImages = {};
    if (incoming?.customImages && typeof incoming.customImages === 'object') {
      for (const lvl of [1, 2, 3, 4, 5]) {
        const img = incoming.customImages[lvl] ?? incoming.customImages[String(lvl)];
        if (typeof img === 'string' && img.startsWith('data:image/') && img.length <= 220000) {
          customImages[lvl] = img;
        }
      }
    }

    dimensions[key] = {
      title:
        typeof incoming.title === 'string' && incoming.title.trim()
          ? incoming.title.trim().slice(0, 100)
          : def.title,
      subtitle:
        typeof incoming.subtitle === 'string' && incoming.subtitle.trim()
          ? incoming.subtitle.trim().slice(0, 180)
          : def.subtitle,
      order,
      altTexts,
      ...(Object.keys(customImages).length > 0 ? { customImages } : {}),
    };
  }

  return {
    instrument,
    scale,
    showDimensionTexts,
    dimensions,
  };
}

/**
 * Resolve the persistent storage directory.
 * Uses Railway's RAILWAY_VOLUME_MOUNT_PATH if configured, otherwise local ./data.
 */
export function resolveDataDir(customDir) {
  if (customDir) return customDir;
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH && process.env.RAILWAY_VOLUME_MOUNT_PATH.trim() !== '') {
    return process.env.RAILWAY_VOLUME_MOUNT_PATH.trim();
  }
  return path.join(process.cwd(), 'data');
}

function timingSafeHexEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

export function generateUserId(now = Date.now()) {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3);
  return `USR-${now}-${suffix}`;
}

export function pruneExpiredRooms(rooms, now = Date.now()) {
  if (!Array.isArray(rooms)) return [];
  return rooms.filter((room) => room && typeof room.expiresAt === 'number' && now <= room.expiresAt);
}

function getRoomsFilePath(dataDir) {
  return path.join(dataDir, 'rooms.json');
}

export function readRooms(dataDir, now = Date.now()) {
  fs.mkdirSync(dataDir, { recursive: true });
  const filePath = getRoomsFilePath(dataDir);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    const active = pruneExpiredRooms(list, now);
    if (active.length !== list.length) {
      writeRooms(dataDir, active, now);
    }
    return active;
  } catch {
    return [];
  }
}

export function writeRooms(dataDir, rooms, now = Date.now()) {
  fs.mkdirSync(dataDir, { recursive: true });
  const active = pruneExpiredRooms(rooms, now);
  const filePath = getRoomsFilePath(dataDir);
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ rooms: active, updatedAt: now }, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
  return active;
}

export function cleanupExpiredRooms(dataDir, now = Date.now()) {
  const filePath = getRoomsFilePath(dataDir);
  if (!fs.existsSync(filePath)) return { removed: 0, remaining: 0 };
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    const active = pruneExpiredRooms(list, now);
    if (active.length !== list.length) {
      writeRooms(dataDir, active, now);
    }
    return { removed: list.length - active.length, remaining: active.length };
  } catch {
    return { removed: 0, remaining: 0 };
  }
}

function generateUniquePin(existingRooms) {
  const used = new Set(existingRooms.map((r) => r.pin));
  for (let i = 0; i < 100; i++) {
    const pin = String(crypto.randomInt(100000, 1000000));
    if (!used.has(pin)) return pin;
  }
  throw new Error('Não foi possível gerar um PIN único.');
}

function normalizeQuestions(payload, fallbackPrompt = '') {
  const rawList = Array.isArray(payload?.questions) ? payload.questions : null;
  if (rawList && rawList.length > 0) {
    const normalized = rawList
      .map((item, idx) => {
        if (typeof item === 'string') {
          const prompt = item.trim().slice(0, 280);
          return prompt ? { id: `q${idx + 1}`, prompt } : null;
        }
        if (item && typeof item === 'object') {
          const prompt = typeof item.prompt === 'string' ? item.prompt.trim().slice(0, 280) : '';
          if (!prompt) return null;
          const id =
            typeof item.id === 'string' && item.id.trim()
              ? item.id.trim().slice(0, 64)
              : `q${idx + 1}`;
          return { id, prompt };
        }
        return null;
      })
      .filter(Boolean);
    if (normalized.length > 0) {
      return normalized.slice(0, 30);
    }
  }

  const single =
    typeof payload?.question === 'string'
      ? payload.question.trim().slice(0, 280)
      : fallbackPrompt.trim().slice(0, 280);
  return single ? [{ id: 'q1', prompt: single }] : [];
}

function getRoomQuestions(room) {
  return normalizeQuestions(room, room?.question || '');
}

function sanitizeImportedResponses(responses, scale, questions) {
  if (!Array.isArray(responses)) return [];
  const maxVal = VALID_SCALES.includes(scale) ? scale : 5;
  const fallbackQ = questions[0] || { id: 'q1', prompt: '' };
  const questionMap = new Map(questions.map((q, i) => [q.id, { ...q, index: i + 1 }]));

  return responses
    .map((item, idx) => {
      if (!item || typeof item !== 'object') return null;
      const valence = Number(item.valence);
      const arousal = Number(item.arousal);
      const dominance = Number(item.dominance);
      if (
        !Number.isInteger(valence) || valence < 1 || valence > maxVal ||
        !Number.isInteger(arousal) || arousal < 1 || arousal > maxVal ||
        !Number.isInteger(dominance) || dominance < 1 || dominance > maxVal
      ) {
        return null;
      }
      const rawQId =
        typeof item.questionId === 'string' && item.questionId.trim()
          ? item.questionId.trim()
          : fallbackQ.id;
      const matchedQ = questionMap.get(rawQId);
      const questionId = matchedQ ? matchedQ.id : rawQId;
      const questionIndex = matchedQ
        ? matchedQ.index
        : Number.isInteger(Number(item.questionIndex)) && Number(item.questionIndex) > 0
        ? Number(item.questionIndex)
        : 1;
      const questionPrompt =
        typeof item.questionPrompt === 'string' && item.questionPrompt.trim()
          ? item.questionPrompt.trim().slice(0, 280)
          : matchedQ?.prompt || fallbackQ.prompt;

      const userId =
        typeof item.userId === 'string' && item.userId.trim()
          ? item.userId.trim().slice(0, 64)
          : generateUserId(Date.now() + idx);

      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        userId,
        submissionId:
          typeof item.submissionId === 'string' && item.submissionId.trim()
            ? item.submissionId.trim()
            : userId,
        questionId,
        questionIndex,
        questionPrompt,
        participantName:
          typeof item.participantName === 'string' ? item.participantName.trim().slice(0, 80) : '',
        valence,
        arousal,
        dominance,
        comment: typeof item.comment === 'string' ? item.comment.trim().slice(0, 1000) : '',
        submittedAt:
          typeof item.submittedAt === 'string' && !Number.isNaN(Date.parse(item.submittedAt))
            ? item.submittedAt
            : new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

export function sanitizeRoomForAdmin(room) {
  const questions = getRoomQuestions(room);
  const fallbackQ = questions[0] || { id: 'q1', prompt: room.question || '' };
  const instrumentConfig = normalizeInstrumentConfig(
    room.instrumentConfig,
    room.instrument || 'e-sam',
    room.scale || 5
  );
  const responses = (room.responses || []).map((r, idx) => ({
    ...r,
    userId: r.userId || r.submissionId || `USR-LEGACY-${idx + 1}`,
    questionId: r.questionId || fallbackQ.id,
    questionIndex: r.questionIndex || 1,
    questionPrompt: r.questionPrompt || fallbackQ.prompt,
    participantName: typeof r.participantName === 'string' ? r.participantName : '',
  }));

  return {
    pin: room.pin,
    title: room.title,
    question: fallbackQ.prompt,
    questions,
    contextType: room.contextType,
    instrument: instrumentConfig.instrument,
    scale: instrumentConfig.scale,
    instrumentConfig,
    requireParticipantName: Boolean(room.requireParticipantName),
    allowComments: room.allowComments !== false,
    creatorEmailMasked: room.creatorEmailMasked || '',
    locked: responses.length > 0,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responses,
  };
}

export function sanitizeRoomForParticipant(room) {
  const questions = getRoomQuestions(room);
  const instrumentConfig = normalizeInstrumentConfig(
    room.instrumentConfig,
    room.instrument || 'e-sam',
    room.scale || 5
  );
  return {
    pin: room.pin,
    title: room.title,
    question: questions[0]?.prompt || room.question || '',
    questions,
    contextType: room.contextType,
    instrument: instrumentConfig.instrument,
    scale: instrumentConfig.scale,
    instrumentConfig,
    requireParticipantName: Boolean(room.requireParticipantName),
    allowComments: room.allowComments !== false,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responseCount: Array.isArray(room.responses) ? room.responses.length : 0,
  };
}

export function createOrImportRoom(dataDir, payload, creatorSession, now = Date.now()) {
  if (!creatorSession || !validateEmail(creatorSession.email)) {
    return { status: 401, error: 'Confirme seu e-mail com o código de verificação antes de criar a sala.' };
  }

  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const questions = normalizeQuestions(payload);
  const contextType =
    payload?.contextType === 'extension'
      ? 'extension'
      : payload?.contextType === 'system'
      ? 'system'
      : '';
  const requestedScale = Number(payload?.instrumentConfig?.scale ?? payload?.scale);
  if (!VALID_SCALES.includes(requestedScale)) {
    return { status: 400, error: 'Selecione uma escala válida (3, 5 ou 9 pontos).' };
  }

  const instrumentConfig = normalizeInstrumentConfig(
    payload?.instrumentConfig,
    payload?.instrument || 'e-sam',
    requestedScale
  );
  const allowComments = payload?.allowComments !== false;
  const requireParticipantName = Boolean(payload?.requireParticipantName);

  if (!title || title.length < 3) {
    return { status: 400, error: 'Informe um título com pelo menos 3 caracteres.' };
  }
  if (questions.length === 0 || questions.some((q) => q.prompt.length < 5)) {
    return { status: 400, error: 'Todas as questões devem ter pelo menos 5 caracteres.' };
  }
  if (!contextType) {
    return {
      status: 400,
      error: 'Selecione o contexto da avaliação (Sistema Computacional ou Ação de Extensão).',
    };
  }

  const rooms = readRooms(dataDir, now);
  let pin;
  const keepPin = Boolean(payload?.keepOriginalPin);
  const requestedPin = typeof payload?.requestedPin === 'string' ? payload.requestedPin.trim() : '';

  if (keepPin && /^\d{6}$/.test(requestedPin)) {
    const conflict = rooms.find((r) => r.pin === requestedPin);
    if (conflict) {
      return {
        status: 409,
        error: `O PIN ${requestedPin} já está em uso por uma sala ativa. Desmarque "Manter o mesmo PIN original" para gerar um novo PIN ou exclua a sala anterior.`,
      };
    }
    pin = requestedPin;
  } else {
    pin = generateUniquePin(rooms);
  }

  const responses = payload?.keepResponses
    ? sanitizeImportedResponses(payload?.importedResponses, instrumentConfig.scale, questions)
    : [];

  const createdAt = now;
  const expiresAt = createdAt + RETENTION_MS;

  const newRoom = {
    pin,
    title: title.slice(0, 140),
    question: questions[0].prompt,
    questions,
    contextType,
    instrument: instrumentConfig.instrument,
    scale: instrumentConfig.scale,
    instrumentConfig,
    requireParticipantName,
    allowComments,
    emailHash: creatorSession.emailHash || hashEmail(creatorSession.email),
    creatorEmailMasked: maskEmail(creatorSession.email),
    createdAt,
    expiresAt,
    responses,
  };

  rooms.push(newRoom);
  writeRooms(dataDir, rooms, now);

  return { status: 201, room: sanitizeRoomForAdmin(newRoom) };
}

export function getPublicRoom(dataDir, pin, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido. Deve conter exatamente 6 dígitos numéricos.' };
  }
  const rooms = readRooms(dataDir, now);
  const room = rooms.find((r) => r.pin === cleanPin);
  if (!room) {
    return { status: 404, error: 'Sala não encontrada ou expirada (retenção máxima de 30 dias).' };
  }
  return { status: 200, room: sanitizeRoomForParticipant(room) };
}

export function verifyRoomCreatorEmail(dataDir, pin, rawEmail, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido. Deve conter 6 dígitos.' };
  }
  if (!validateEmail(rawEmail)) {
    return { status: 400, error: 'Informe um endereço de e-mail válido.' };
  }
  const rooms = readRooms(dataDir, now);
  const room = rooms.find((r) => r.pin === cleanPin);
  if (!room) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }
  const candidateHash = hashEmail(rawEmail);
  if (!timingSafeHexEqual(candidateHash, room.emailHash)) {
    return { status: 403, error: 'Este e-mail não corresponde ao criador desta sala.' };
  }
  return { status: 200, ok: true };
}

export function authenticateAdminSession(dataDir, pin, creatorSession, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido. Deve conter 6 dígitos.' };
  }
  if (!creatorSession || !creatorSession.emailHash) {
    return { status: 401, error: 'Sessão de criador expirada ou inválida. Verifique seu e-mail novamente.' };
  }

  const rooms = readRooms(dataDir, now);
  const room = rooms.find((r) => r.pin === cleanPin);
  if (!room) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }

  if (!timingSafeHexEqual(creatorSession.emailHash, room.emailHash)) {
    return { status: 403, error: 'E-mail não corresponde ao criador desta sala.' };
  }

  return { status: 200, room: sanitizeRoomForAdmin(room) };
}

/**
 * Updates room instrument configuration ONLY when the room has 0 responses.
 * Permanently locked after the first response for methodological integrity.
 */
export function updateRoomConfig(dataDir, pin, payload, creatorSession, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }
  if (!creatorSession || !creatorSession.emailHash) {
    return { status: 401, error: 'Sessão expirada. Faça a verificação por e-mail novamente.' };
  }

  const rooms = readRooms(dataDir, now);
  const idx = rooms.findIndex((r) => r.pin === cleanPin);
  if (idx === -1) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }

  const room = rooms[idx];
  if (!timingSafeHexEqual(creatorSession.emailHash, room.emailHash)) {
    return { status: 403, error: 'Você não tem permissão para editar esta sala.' };
  }

  if (Array.isArray(room.responses) && room.responses.length >= 1) {
    return {
      status: 409,
      error:
        'Configurações bloqueadas após o recebimento da primeira resposta para preservar a integridade metodológica dos dados. Exporte/clone a sala para criar uma nova.',
    };
  }

  const title =
    typeof payload?.title === 'string' && payload.title.trim().length >= 3
      ? payload.title.trim().slice(0, 140)
      : room.title;

  const contextType =
    payload?.contextType === 'extension' || payload?.contextType === 'system'
      ? payload.contextType
      : room.contextType;

  const requestedScale = Number(payload?.instrumentConfig?.scale ?? payload?.scale ?? room.scale);
  if (!VALID_SCALES.includes(requestedScale)) {
    return { status: 400, error: 'Escala inválida. Escolha 3, 5 ou 9 pontos.' };
  }

  const requestedInstrument = VALID_INSTRUMENTS.includes(payload?.instrumentConfig?.instrument)
    ? payload.instrumentConfig.instrument
    : VALID_INSTRUMENTS.includes(payload?.instrument)
    ? payload.instrument
    : room.instrument || 'e-sam';

  const baseConfigForUpdate = payload?.instrumentConfig
    ? payload.instrumentConfig
    : {
        ...(room.instrumentConfig || {}),
        instrument: requestedInstrument,
        scale: requestedScale,
      };

  const instrumentConfig = normalizeInstrumentConfig(
    baseConfigForUpdate,
    requestedInstrument,
    requestedScale
  );

  const updatedQuestions = payload?.questions ? normalizeQuestions(payload) : getRoomQuestions(room);
  if (updatedQuestions.length === 0 || updatedQuestions.some((q) => q.prompt.length < 5)) {
    return { status: 400, error: 'Todas as questões devem ter pelo menos 5 caracteres.' };
  }

  room.title = title;
  room.contextType = contextType;
  room.instrument = instrumentConfig.instrument;
  room.scale = instrumentConfig.scale;
  room.instrumentConfig = instrumentConfig;
  room.questions = updatedQuestions;
  room.question = updatedQuestions[0].prompt;
  if (typeof payload?.requireParticipantName === 'boolean') {
    room.requireParticipantName = payload.requireParticipantName;
  }
  if (typeof payload?.allowComments === 'boolean') {
    room.allowComments = payload.allowComments;
  }

  rooms[idx] = room;
  writeRooms(dataDir, rooms, now);

  return { status: 200, room: sanitizeRoomForAdmin(room) };
}

export function addQuestionToRoom(dataDir, pin, payload, creatorSession, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }
  if (!creatorSession || !creatorSession.emailHash) {
    return { status: 401, error: 'Sessão expirada. Verifique seu e-mail novamente.' };
  }
  const prompt = typeof payload?.prompt === 'string' ? payload.prompt.trim().slice(0, 280) : '';
  if (prompt.length < 5) {
    return { status: 400, error: 'A nova questão deve ter pelo menos 5 caracteres.' };
  }

  const rooms = readRooms(dataDir, now);
  const idx = rooms.findIndex((r) => r.pin === cleanPin);
  if (idx === -1) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }

  const room = rooms[idx];
  if (!timingSafeHexEqual(creatorSession.emailHash, room.emailHash)) {
    return { status: 403, error: 'E-mail não autorizado para adicionar questões nesta sala.' };
  }

  const questions = getRoomQuestions(room);
  if (questions.length >= 30) {
    return { status: 400, error: 'Limite máximo de 30 questões por sala atingido.' };
  }

  const nextIndex = questions.length + 1;
  let newId = `q${nextIndex}`;
  const usedIds = new Set(questions.map((q) => q.id));
  if (usedIds.has(newId)) {
    newId = `q-${crypto.randomUUID().slice(0, 8)}`;
  }

  const updatedQuestions = [...questions, { id: newId, prompt }];
  room.questions = updatedQuestions;
  room.question = updatedQuestions[0].prompt;
  rooms[idx] = room;
  writeRooms(dataDir, rooms, now);

  return { status: 201, room: sanitizeRoomForAdmin(room), addedQuestion: { id: newId, prompt } };
}

export function addResponse(dataDir, pin, payload, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }

  const rooms = readRooms(dataDir, now);
  const idx = rooms.findIndex((r) => r.pin === cleanPin);
  if (idx === -1) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }

  const room = rooms[idx];
  const participantName =
    typeof payload?.participantName === 'string' ? payload.participantName.trim().slice(0, 80) : '';

  if (room.requireParticipantName && !participantName) {
    return { status: 400, error: 'Informe sua identificação para registrar a resposta.' };
  }

  const questions = getRoomQuestions(room);
  const questionMap = new Map(questions.map((q, i) => [q.id, { ...q, index: i + 1 }]));
  const maxVal = VALID_SCALES.includes(room.scale) ? room.scale : 5;
  const submittedAt = new Date(now).toISOString();
  const userId = generateUserId(now);
  const submissionId = userId;

  const rawAnswers = Array.isArray(payload?.answers)
    ? payload.answers
    : [
        {
          questionId: payload?.questionId || questions[0].id,
          valence: payload?.valence,
          arousal: payload?.arousal,
          dominance: payload?.dominance,
          comment: payload?.comment,
        },
      ];

  if (rawAnswers.length === 0) {
    return { status: 400, error: 'Envie ao menos uma resposta válida.' };
  }

  const entries = [];
  for (const item of rawAnswers) {
    const targetQId =
      typeof item?.questionId === 'string' ? item.questionId.trim() : questions[0].id;
    const matchedQ = questionMap.get(targetQId);
    if (!matchedQ) {
      return { status: 400, error: 'Questão não encontrada nesta sala.' };
    }
    const valence = Number(item?.valence);
    const arousal = Number(item?.arousal);
    const dominance = Number(item?.dominance);
    if (
      !Number.isInteger(valence) || valence < 1 || valence > maxVal ||
      !Number.isInteger(arousal) || arousal < 1 || arousal > maxVal ||
      !Number.isInteger(dominance) || dominance < 1 || dominance > maxVal
    ) {
      return {
        status: 400,
        error: `Selecione uma opção válida (1 a ${maxVal}) em todas as 3 dimensões da Questão ${matchedQ.index}.`,
      };
    }

    const comment =
      room.allowComments && typeof item?.comment === 'string'
        ? item.comment.trim().slice(0, 1000)
        : '';

    entries.push({
      id: crypto.randomUUID(),
      userId,
      submissionId,
      questionId: matchedQ.id,
      questionIndex: matchedQ.index,
      questionPrompt: matchedQ.prompt,
      participantName: room.requireParticipantName ? participantName : '',
      valence,
      arousal,
      dominance,
      comment,
      submittedAt,
    });
  }

  room.responses = Array.isArray(room.responses) ? room.responses : [];
  room.responses.push(...entries);
  rooms[idx] = room;
  writeRooms(dataDir, rooms, now);

  return {
    status: 201,
    userId,
    response: entries[0],
    responses: entries,
    responseCount: room.responses.length,
  };
}

export function deleteRoom(dataDir, pin, creatorSession, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }
  if (!creatorSession || !creatorSession.emailHash) {
    return { status: 401, error: 'Sessão expirada. Verifique seu e-mail novamente.' };
  }

  const rooms = readRooms(dataDir, now);
  const idx = rooms.findIndex((r) => r.pin === cleanPin);
  if (idx === -1) {
    return { status: 404, error: 'Sala não encontrada ou já expirada.' };
  }

  if (!timingSafeHexEqual(creatorSession.emailHash, rooms[idx].emailHash)) {
    return { status: 403, error: 'E-mail não autorizado para excluir esta sala.' };
  }

  const remaining = rooms.filter((r) => r.pin !== cleanPin);
  writeRooms(dataDir, remaining, now);
  return { status: 200, deleted: true, pin: cleanPin };
}

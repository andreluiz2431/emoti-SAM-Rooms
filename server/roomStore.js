import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const RETENTION_DAYS = 30;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

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

export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Mathematically validates a Brazilian CPF (11 digits + 2 check digits).
 */
export function validateCpfDigits(rawCpf) {
  const digits = onlyDigits(rawCpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(digits[10])) return false;

  return true;
}

/**
 * Converts a validated CPF into a SHA-256 hex digest.
 * Plaintext CPF is never persisted.
 */
export function hashCpf(rawCpf) {
  const digits = onlyDigits(rawCpf);
  return crypto.createHash('sha256').update(digits).digest('hex');
}

function timingSafeHexEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
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
  const maxVal = scale === 9 ? 9 : 5;
  const fallbackQ = questions[0] || { id: 'q1', prompt: '' };
  const questionMap = new Map(questions.map((q, i) => [q.id, { ...q, index: i + 1 }]));

  return responses
    .map((item) => {
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
      const rawQId = typeof item.questionId === 'string' && item.questionId.trim() ? item.questionId.trim() : fallbackQ.id;
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

      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : crypto.randomUUID(),
        submissionId: typeof item.submissionId === 'string' && item.submissionId.trim() ? item.submissionId.trim() : undefined,
        questionId,
        questionIndex,
        questionPrompt,
        participantName: typeof item.participantName === 'string' && item.participantName.trim()
          ? item.participantName.trim().slice(0, 80)
          : 'Participante',
        valence,
        arousal,
        dominance,
        comment: typeof item.comment === 'string' ? item.comment.trim().slice(0, 1000) : '',
        submittedAt: typeof item.submittedAt === 'string' && !Number.isNaN(Date.parse(item.submittedAt))
          ? item.submittedAt
          : new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

export function sanitizeRoomForAdmin(room) {
  const questions = getRoomQuestions(room);
  const fallbackQ = questions[0] || { id: 'q1', prompt: room.question || '' };
  const responses = (room.responses || []).map((r) => ({
    ...r,
    questionId: r.questionId || fallbackQ.id,
    questionIndex: r.questionIndex || 1,
    questionPrompt: r.questionPrompt || fallbackQ.prompt,
  }));

  return {
    pin: room.pin,
    title: room.title,
    question: fallbackQ.prompt,
    questions,
    contextType: room.contextType,
    scale: room.scale,
    allowComments: room.allowComments,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responses,
  };
}

export function sanitizeRoomForParticipant(room) {
  const questions = getRoomQuestions(room);
  return {
    pin: room.pin,
    title: room.title,
    question: questions[0]?.prompt || room.question || '',
    questions,
    contextType: room.contextType,
    scale: room.scale,
    allowComments: room.allowComments,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    responseCount: Array.isArray(room.responses) ? room.responses.length : 0,
  };
}

export function createOrImportRoom(dataDir, payload, now = Date.now()) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const questions = normalizeQuestions(payload);
  const contextType = payload?.contextType === 'extension' ? 'extension' : payload?.contextType === 'system' ? 'system' : '';
  const scale = Number(payload?.scale) === 9 ? 9 : Number(payload?.scale) === 5 ? 5 : 0;
  const allowComments = payload?.allowComments !== false;
  const cpf = payload?.cpf;

  if (!title || title.length < 3) {
    return { status: 400, error: 'Informe um título com pelo menos 3 caracteres.' };
  }
  if (questions.length === 0 || questions.some((q) => q.prompt.length < 5)) {
    return { status: 400, error: 'Todas as questões devem ter pelo menos 5 caracteres.' };
  }
  if (!contextType) {
    return { status: 400, error: 'Selecione o contexto da avaliação (Sistema Computacional ou Ação de Extensão).' };
  }
  if (!scale) {
    return { status: 400, error: 'Selecione a escala do emoti-SAM (5 ou 9 pontos).' };
  }
  if (!validateCpfDigits(cpf)) {
    return { status: 400, error: 'CPF inválido. Verifique os 11 dígitos e os dígitos verificadores.' };
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
    ? sanitizeImportedResponses(payload?.importedResponses, scale, questions)
    : [];

  const createdAt = now;
  const expiresAt = createdAt + RETENTION_MS;

  const newRoom = {
    pin,
    title: title.slice(0, 140),
    question: questions[0].prompt,
    questions,
    contextType,
    scale,
    allowComments,
    cpfHash: hashCpf(cpf),
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

export function addQuestionToRoom(dataDir, pin, payload, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }
  if (!validateCpfDigits(payload?.cpf)) {
    return { status: 400, error: 'CPF inválido. Verifique os dígitos informados.' };
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
  const candidateHash = hashCpf(payload.cpf);
  if (!timingSafeHexEqual(candidateHash, room.cpfHash)) {
    return { status: 403, error: 'CPF não autorizado para adicionar questões nesta sala.' };
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
  const participantName = typeof payload?.participantName === 'string' ? payload.participantName.trim() : '';
  if (!participantName) {
    return { status: 400, error: 'Informe seu nome ou apelido para registrar a resposta.' };
  }

  const questions = getRoomQuestions(room);
  const questionMap = new Map(questions.map((q, i) => [q.id, { ...q, index: i + 1 }]));
  const maxVal = room.scale === 9 ? 9 : 5;
  const submittedAt = new Date(now).toISOString();
  const submissionId = crypto.randomUUID();

  // Support both multi-question { answers: [...] } and legacy single { valence, arousal, dominance }
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
    const targetQId = typeof item?.questionId === 'string' ? item.questionId.trim() : questions[0].id;
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
      submissionId,
      questionId: matchedQ.id,
      questionIndex: matchedQ.index,
      questionPrompt: matchedQ.prompt,
      participantName: participantName.slice(0, 80),
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
    response: entries[0],
    responses: entries,
    responseCount: room.responses.length,
  };
}

export function authenticateAdmin(dataDir, pin, cpf, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido. Deve conter 6 dígitos.' };
  }
  if (!validateCpfDigits(cpf)) {
    return { status: 400, error: 'CPF inválido. Verifique os dígitos informados.' };
  }

  const rooms = readRooms(dataDir, now);
  const room = rooms.find((r) => r.pin === cleanPin);
  if (!room) {
    return { status: 404, error: 'Sala não encontrada ou expirada.' };
  }

  const candidateHash = hashCpf(cpf);
  if (!timingSafeHexEqual(candidateHash, room.cpfHash)) {
    return { status: 403, error: 'CPF não corresponde ao criador desta sala.' };
  }

  return { status: 200, room: sanitizeRoomForAdmin(room) };
}

export function deleteRoom(dataDir, pin, cpf, now = Date.now()) {
  const cleanPin = String(pin || '').trim();
  if (!/^\d{6}$/.test(cleanPin)) {
    return { status: 400, error: 'PIN inválido.' };
  }
  if (!validateCpfDigits(cpf)) {
    return { status: 400, error: 'CPF inválido.' };
  }

  const rooms = readRooms(dataDir, now);
  const idx = rooms.findIndex((r) => r.pin === cleanPin);
  if (idx === -1) {
    return { status: 404, error: 'Sala não encontrada ou já expirada.' };
  }

  const candidateHash = hashCpf(cpf);
  if (!timingSafeHexEqual(candidateHash, rooms[idx].cpfHash)) {
    return { status: 403, error: 'CPF não autorizado para excluir esta sala.' };
  }

  const remaining = rooms.filter((r) => r.pin !== cleanPin);
  writeRooms(dataDir, remaining, now);
  return { status: 200, deleted: true, pin: cleanPin };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoomCsv,
  buildRoomExportJson,
  computeDimensionStats,
  formatRemainingRetention,
  getScalePoints,
  parseImportedRoomJson,
  type RoomAdmin,
} from './emotiSam';

const sampleRoom: RoomAdmin = {
  pin: '482910',
  title: 'Oficina de Scratch - Escola A',
  question: 'Como você se sentiu durante a oficina?',
  questions: [
    { id: 'q1', prompt: 'Como você se sentiu durante a oficina?' },
    { id: 'q2', prompt: 'Como você se sentiu ao apresentar seu projeto?' },
  ],
  contextType: 'extension',
  scale: 5,
  allowComments: true,
  createdAt: 1700000000000,
  expiresAt: 1700000000000 + 30 * 24 * 60 * 60 * 1000,
  responses: [
    {
      id: 'resp-1',
      questionId: 'q1',
      questionIndex: 1,
      questionPrompt: 'Como você se sentiu durante a oficina?',
      participantName: 'Maria; Clara',
      valence: 5,
      arousal: 4,
      dominance: 5,
      comment: 'Gostei "muito" da aula!',
      submittedAt: '2026-11-17T10:00:00.000Z',
    },
    {
      id: 'resp-2',
      questionId: 'q2',
      questionIndex: 2,
      questionPrompt: 'Como você se sentiu ao apresentar seu projeto?',
      participantName: 'João',
      valence: 3,
      arousal: 2,
      dominance: 4,
      comment: '',
      submittedAt: '2026-11-17T10:05:00.000Z',
    },
  ],
};

test('getScalePoints returns descending scale points', () => {
  assert.deepEqual(getScalePoints(5), [5, 4, 3, 2, 1]);
  assert.deepEqual(getScalePoints(9), [9, 8, 7, 6, 5, 4, 3, 2, 1]);
});

test('computeDimensionStats calculates mean and ordered distribution', () => {
  const stats = computeDimensionStats(sampleRoom.responses, 5, 'valence', 'Valência');
  assert.equal(stats.count, 2);
  assert.equal(stats.mean, 4);
  assert.equal(stats.distribution[0].score, 1);
  assert.equal(stats.distribution[2].score, 3);
  assert.equal(stats.distribution[2].count, 1);
  assert.equal(stats.distribution[2].percent, 50);
  assert.equal(stats.distribution[4].score, 5);
  assert.equal(stats.distribution[4].count, 1);
  assert.equal(stats.distribution[4].percent, 50);
});

test('buildRoomCsv produces UTF-8 BOM with semicolon separator, question columns, and proper escaping', () => {
  const csv = buildRoomCsv(sampleRoom);
  assert.equal(csv.startsWith('\uFEFF'), true);
  const lines = csv.slice(1).split('\r\n');
  assert.equal(
    lines[0],
    'PIN_Sala;Titulo_Sala;Contexto_Tipo;Escala;Numero_Questao;Questao;ID_Resposta;Nome_Participante;Data_Hora_ISO;Valencia;Excitacao;Dominancia;Comentario_Opcional'
  );
  assert.match(
    lines[1],
    /^482910;Oficina de Scratch - Escola A;Ação de Extensão \/ Educacional;5 pontos;1;Como você se sentiu durante a oficina\?;resp-1;"Maria; Clara";2026-11-17T10:00:00\.000Z;5;4;5;"Gostei ""muito"" da aula!"$/
  );
  assert.match(
    lines[2],
    /^482910;Oficina de Scratch - Escola A;Ação de Extensão \/ Educacional;5 pontos;2;Como você se sentiu ao apresentar seu projeto\?;resp-2;João;2026-11-17T10:05:00\.000Z;3;2;4;$/
  );
});

test('buildRoomExportJson and parseImportedRoomJson round-trip multiple questions without cpfHash', () => {
  const exported = buildRoomExportJson(sampleRoom);
  const raw = JSON.stringify(exported);
  assert.equal(raw.includes('cpfHash'), false);

  const parsed = parseImportedRoomJson(raw);
  assert.equal(parsed.pin, '482910');
  assert.equal(parsed.title, 'Oficina de Scratch - Escola A');
  assert.equal(parsed.contextType, 'extension');
  assert.equal(parsed.scale, 5);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[1].prompt, 'Como você se sentiu ao apresentar seu projeto?');
  assert.equal(parsed.responses.length, 2);
});

test('parseImportedRoomJson supports legacy single-question v1.0 payloads', () => {
  const legacyRaw = JSON.stringify({
    schemaVersion: '1.0',
    pin: '123456',
    title: 'Sala Legada',
    question: 'Como foi a experiência?',
    contextType: 'system',
    scale: 9,
    allowComments: true,
    responses: [],
  });
  const parsed = parseImportedRoomJson(legacyRaw);
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.questions[0].id, 'q1');
  assert.equal(parsed.questions[0].prompt, 'Como foi a experiência?');
});

test('formatRemainingRetention formats days and hours cleanly', () => {
  const now = 1700000000000;
  const expiresAt = now + (27 * 24 + 14) * 60 * 60 * 1000;
  assert.equal(
    formatRemainingRetention(expiresAt, now),
    'Expira em 27 dias e 14 horas — Retenção máxima de 30 dias'
  );
  assert.equal(formatRemainingRetention(now - 1000, now), 'Expirada');
});

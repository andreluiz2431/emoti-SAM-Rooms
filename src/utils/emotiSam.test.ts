import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRoomCsv,
  buildRoomExportJson,
  countUniqueRespondents,
  createDefaultInstrumentConfig,
  getOrderedAnchors,
  getOrderedScaleScores,
  parseImportedRoomJson,
  scoreToAnchorLevel,
  type RoomAdmin,
} from './emotiSam';

describe('emotiSam utilities (e-SAM v2.0)', () => {
  it('orders anchors and scores properly for pos-to-neg and neg-to-pos across 3, 5, and 9 scales', () => {
    assert.deepEqual(getOrderedScaleScores(3, 'pos-to-neg'), [3, 2, 1]);
    assert.deepEqual(getOrderedScaleScores(3, 'neg-to-pos'), [1, 2, 3]);
    assert.deepEqual(getOrderedScaleScores(5, 'pos-to-neg'), [5, 4, 3, 2, 1]);
    assert.deepEqual(getOrderedScaleScores(9, 'neg-to-pos'), [1, 2, 3, 4, 5, 6, 7, 8, 9]);

    const anchors3Pos = getOrderedAnchors(3, 'pos-to-neg');
    assert.deepEqual(
      anchors3Pos.map((a) => [a.anchorLevel, a.score]),
      [
        [5, 3],
        [3, 2],
        [1, 1],
      ]
    );

    const anchors9Neg = getOrderedAnchors(9, 'neg-to-pos');
    assert.deepEqual(
      anchors9Neg.map((a) => [a.anchorLevel, a.score]),
      [
        [1, 1],
        [2, 3],
        [3, 5],
        [4, 7],
        [5, 9],
      ]
    );

    assert.equal(scoreToAnchorLevel(3, 3), 5);
    assert.equal(scoreToAnchorLevel(2, 3), 3);
    assert.equal(scoreToAnchorLevel(1, 3), 1);
    assert.equal(scoreToAnchorLevel(9, 9), 5);
    assert.equal(scoreToAnchorLevel(5, 9), 3);
    assert.equal(scoreToAnchorLevel(1, 9), 1);
  });

  it('exports CSV with ID_Usuario and Instrumento and round-trips JSON v2.0 including instrumentConfig', () => {
    const cfg = createDefaultInstrumentConfig('sam', 9);
    cfg.showDimensionTexts = false;
    cfg.dimensions.valence.order = 'neg-to-pos';

    const room: RoomAdmin = {
      pin: '482910',
      title: 'Estudo SAM 9 Pontos',
      question: 'Como você se sentiu na tarefa?',
      questions: [{ id: 'q1', prompt: 'Como você se sentiu na tarefa?' }],
      contextType: 'system',
      instrument: 'sam',
      scale: 9,
      instrumentConfig: cfg,
      requireParticipantName: false,
      allowComments: true,
      locked: true,
      createdAt: 1_700_000_000_000,
      expiresAt: 1_702_592_000_000,
      responses: [
        {
          id: 'resp-1',
          userId: 'USR-1700000001000-A1B',
          questionId: 'q1',
          questionIndex: 1,
          questionPrompt: 'Como você se sentiu na tarefa?',
          participantName: '',
          valence: 9,
          arousal: 7,
          dominance: 8,
          comment: 'Muito claro',
          submittedAt: '2026-01-10T12:00:00.000Z',
        },
        {
          id: 'resp-2',
          userId: 'USR-1700000002000-C3D',
          questionId: 'q1',
          questionIndex: 1,
          questionPrompt: 'Como você se sentiu na tarefa?',
          participantName: '',
          valence: 5,
          arousal: 5,
          dominance: 6,
          comment: '',
          submittedAt: '2026-01-10T12:01:00.000Z',
        },
      ],
    };

    assert.equal(countUniqueRespondents(room.responses), 2);

    const csv = buildRoomCsv(room);
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('ID_Usuario'));
    assert.ok(csv.includes('Instrumento'));
    assert.ok(csv.includes('USR-1700000001000-A1B'));
    assert.ok(csv.includes('SAM Original (Lang & Bradley)'));
    assert.ok(csv.includes('Anônimo'));

    const exported = buildRoomExportJson(room);
    assert.equal(exported.schemaVersion, '2.0');
    const reimported = parseImportedRoomJson(JSON.stringify(exported));
    assert.equal(reimported.instrument, 'sam');
    assert.equal(reimported.scale, 9);
    assert.equal(reimported.instrumentConfig.showDimensionTexts, false);
    assert.equal(reimported.instrumentConfig.dimensions.valence.order, 'neg-to-pos');
    assert.equal(reimported.responses.length, 2);
    assert.equal(reimported.responses[0].userId, 'USR-1700000001000-A1B');
  });

  it('imports legacy v1.0 JSON gracefully with defaults', () => {
    const legacy = JSON.stringify({
      schemaVersion: '1.0',
      pin: '123456',
      title: 'Sala Legada',
      question: 'Pergunta antiga?',
      contextType: 'extension',
      scale: 5,
      responses: [{ id: '1', participantName: 'Ana', valence: 5, arousal: 4, dominance: 5, comment: '', submittedAt: '2025-05-01T10:00:00Z' }],
    });
    const parsed = parseImportedRoomJson(legacy);
    assert.equal(parsed.instrument, 'e-sam');
    assert.equal(parsed.scale, 5);
    assert.equal(parsed.requireParticipantName, false);
    assert.ok(parsed.responses[0].userId.startsWith('USR-IMPORT-'));
  });
});

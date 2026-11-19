import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { hashEmail } from './otpService.js';
import {
  RETENTION_MS,
  addQuestionToRoom,
  addResponse,
  authenticateAdminSession,
  cleanupExpiredRooms,
  createOrImportRoom,
  deleteRoom,
  getPublicRoom,
  updateRoomConfig,
  verifyRoomCreatorEmail,
} from './roomStore.js';

const CREATOR_EMAIL = 'pesquisador@universidade.edu.br';
const CREATOR_SESSION = { email: CREATOR_EMAIL, emailHash: hashEmail(CREATOR_EMAIL) };
const OTHER_SESSION = { email: 'outro@universidade.edu.br', emailHash: hashEmail('outro@universidade.edu.br') };

describe('roomStore persistence, anonymity, ID_Usuario & methodological lock', () => {
  let tempDir = '';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esam-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates rooms with 3/5/9 scales, SAM Original canonical ordering, and anonymous-by-default submissions with unique ID_Usuario', () => {
    const now = 1_700_000_000_000;
    const created = createOrImportRoom(
      tempDir,
      {
        title: 'Avaliação SAM 3 pontos',
        questions: [{ id: 'q1', prompt: 'Como você se sentiu no aplicativo?' }],
        contextType: 'system',
        instrument: 'sam',
        scale: 3,
      },
      CREATOR_SESSION,
      now
    );

    assert.equal(created.status, 201);
    assert.ok(created.room);
    assert.equal(created.room.instrument, 'sam');
    assert.equal(created.room.scale, 3);
    assert.equal(created.room.requireParticipantName, false);
    assert.equal(created.room.locked, false);
    // SAM Original Dominance defaults to neg-to-pos
    const dims = created.room.instrumentConfig.dimensions as Record<string, { order: string }>;
    assert.equal(dims.dominance.order, 'neg-to-pos');
    assert.equal(dims.valence.order, 'pos-to-neg');

    // Anonymous submission succeeds without participantName and generates unique ID_Usuario
    const r1 = addResponse(tempDir, created.room.pin, { valence: 3, arousal: 2, dominance: 1 }, now + 1000);
    assert.equal(r1.status, 201);
    assert.ok(r1.userId && r1.userId.startsWith('USR-'));
    assert.equal(r1.response?.participantName, '');

    const r2 = addResponse(tempDir, created.room.pin, { valence: 2, arousal: 2, dominance: 3 }, now + 2000);
    assert.equal(r2.status, 201);
    assert.notEqual(r1.userId, r2.userId);

    // Out-of-range score rejected on 3-point scale
    const invalidScore = addResponse(tempDir, created.room.pin, { valence: 4, arousal: 2, dominance: 1 }, now + 3000);
    assert.equal(invalidScore.status, 400);
  });

  it('enforces required identification only when enabled and differentiates homonyms via ID_Usuario', () => {
    const now = 1_700_000_000_000;
    const created = createOrImportRoom(
      tempDir,
      {
        title: 'Oficina com Identificação',
        question: 'Como foi a oficina prática?',
        contextType: 'extension',
        instrument: 'e-sam',
        scale: 5,
        requireParticipantName: true,
      },
      CREATOR_SESSION,
      now
    );
    assert.ok(created.room);

    // Missing name fails when requireParticipantName is true
    const missing = addResponse(tempDir, created.room.pin, { valence: 5, arousal: 4, dominance: 5 }, now + 100);
    assert.equal(missing.status, 400);

    // Two homonyms named "Fulano" get distinct ID_Usuario values
    const f1 = addResponse(
      tempDir,
      created.room.pin,
      { participantName: 'Fulano', valence: 5, arousal: 4, dominance: 5 },
      now + 200
    );
    const f2 = addResponse(
      tempDir,
      created.room.pin,
      { participantName: 'Fulano', valence: 2, arousal: 3, dominance: 2 },
      now + 300
    );
    assert.equal(f1.status, 201);
    assert.equal(f2.status, 201);
    assert.notEqual(f1.userId, f2.userId);
    assert.equal(f1.response?.participantName, 'Fulano');
    assert.equal(f2.response?.participantName, 'Fulano');
  });

  it('allows editing instrument config at 0 responses and permanently locks (409) after 1st response', () => {
    const now = 1_700_000_000_000;
    const created = createOrImportRoom(
      tempDir,
      {
        title: 'Teste de Bloqueio Metodológico',
        question: 'Avalie o protótipo navegável.',
        contextType: 'system',
        instrument: 'e-sam',
        scale: 5,
      },
      CREATOR_SESSION,
      now
    );
    assert.ok(created.room);
    const pin = created.room.pin;

    // Editable when 0 responses
    const updated = updateRoomConfig(
      tempDir,
      pin,
      {
        instrument: 'sam',
        scale: 9,
        requireParticipantName: true,
      },
      CREATOR_SESSION,
      now + 500
    );
    assert.equal(updated.status, 200);
    assert.ok(updated.room);
    assert.equal(updated.room.instrument, 'sam');
    assert.equal(updated.room.scale, 9);
    assert.equal(updated.room.requireParticipantName, true);
    assert.equal(updated.room.locked, false);

    // Submit 1st response
    const resp = addResponse(
      tempDir,
      pin,
      { participantName: 'Maria', valence: 8, arousal: 7, dominance: 9 },
      now + 1000
    );
    assert.equal(resp.status, 201);

    // Now admin view reports locked = true
    const adminView = authenticateAdminSession(tempDir, pin, CREATOR_SESSION, now + 1100);
    assert.equal(adminView.status, 200);
    assert.equal(adminView.room?.locked, true);

    // Further config edits and adding new questions return 409 Conflict
    const blocked = updateRoomConfig(
      tempDir,
      pin,
      { instrument: 'e-sam', scale: 5 },
      CREATOR_SESSION,
      now + 1200
    );
    assert.equal(blocked.status, 409);

    const blockedQuestion = addQuestionToRoom(
      tempDir,
      pin,
      { prompt: 'Nova pergunta bloqueada?' },
      CREATOR_SESSION,
      now + 1300
    );
    assert.equal(blockedQuestion.status, 409);
  });

  it('validates creator email ownership, adds questions live, enforces 30-day retention, and allows deletion', () => {
    const now = 1_700_000_000_000;
    const created = createOrImportRoom(
      tempDir,
      {
        title: 'Sala Multi-Questão',
        question: 'Questão 1: Tela inicial?',
        contextType: 'system',
        scale: 5,
      },
      CREATOR_SESSION,
      now
    );
    assert.ok(created.room);
    const pin = created.room.pin;

    assert.equal(verifyRoomCreatorEmail(tempDir, pin, CREATOR_EMAIL, now).status, 200);
    assert.equal(verifyRoomCreatorEmail(tempDir, pin, 'errado@uni.br', now).status, 403);
    assert.equal(authenticateAdminSession(tempDir, pin, OTHER_SESSION, now).status, 403);

    const added = addQuestionToRoom(tempDir, pin, { prompt: 'Questão 2: Checkout?' }, CREATOR_SESSION, now + 100);
    assert.equal(added.status, 201);
    assert.equal(added.room?.questions.length, 2);

    // Still active before 30 days
    assert.equal(getPublicRoom(tempDir, pin, now + RETENTION_MS - 1000).status, 200);

    // Delete works for creator
    const deleted = deleteRoom(tempDir, pin, CREATOR_SESSION, now + 2000);
    assert.equal(deleted.status, 200);
    assert.equal(getPublicRoom(tempDir, pin, now + 2100).status, 404);

    // Retention cleanup removes expired rooms after 30 days
    const expRoom = createOrImportRoom(
      tempDir,
      { title: 'Sala Expirada', question: 'Pergunta de expiração?', contextType: 'extension', scale: 5 },
      CREATOR_SESSION,
      now
    );
    assert.ok(expRoom.room);
    const cleaned = cleanupExpiredRooms(tempDir, now + RETENTION_MS + 1000);
    assert.equal(cleaned.removed, 1);
    assert.equal(cleaned.remaining, 0);
  });
});

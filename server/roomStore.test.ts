import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  RETENTION_MS,
  addQuestionToRoom,
  addResponse,
  authenticateAdmin,
  cleanupExpiredRooms,
  createOrImportRoom,
  deleteRoom,
  getPublicRoom,
  hashCpf,
  readRooms,
  resolveDataDir,
} from './roomStore.js';

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'emoti-sam-test-'));
}

test('resolveDataDir prefers RAILWAY_VOLUME_MOUNT_PATH when set', () => {
  const prev = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  process.env.RAILWAY_VOLUME_MOUNT_PATH = '/mnt/railway-data';
  assert.equal(resolveDataDir(), '/mnt/railway-data');
  if (prev === undefined) {
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
  } else {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = prev;
  }
});

test('room lifecycle: create with SHA-256 CPF hash, respond, authenticate, and delete', () => {
  const dir = createTempDir();
  try {
    const now = 1700000000000;
    const validCpf = '529.982.247-25';
    const otherCpf = '111.444.777-35';

    const created = createOrImportRoom(
      dir,
      {
        title: 'Avaliação Portal Acadêmico',
        question: 'Como você se sentiu usando o portal?',
        contextType: 'system',
        scale: 9,
        allowComments: true,
        cpf: validCpf,
      },
      now
    );

    assert.equal(created.status, 201);
    assert.ok(created.room);
    const pin = created.room.pin;
    assert.match(pin, /^\d{6}$/);
    assert.equal(created.room.expiresAt, now + RETENTION_MS);

    // Ensure plaintext CPF is never stored on disk
    const rawFile = fs.readFileSync(path.join(dir, 'rooms.json'), 'utf8');
    assert.equal(rawFile.includes('52998224725'), false);
    assert.equal(rawFile.includes('529.982.247-25'), false);
    assert.equal(rawFile.includes(hashCpf(validCpf)), true);

    // Public room fetch
    const pub = getPublicRoom(dir, pin, now + 1000);
    assert.equal(pub.status, 200);
    assert.ok(pub.room);
    assert.equal(pub.room.scale, 9);
    assert.equal(pub.room.responseCount, 0);

    // Submit response
    const resp = addResponse(
      dir,
      pin,
      {
        participantName: 'Lucas',
        valence: 8,
        arousal: 7,
        dominance: 9,
        comment: 'Interface bem clara.',
      },
      now + 2000
    );
    assert.equal(resp.status, 201);
    assert.equal(resp.responseCount, 1);

    // Wrong CPF rejected
    const badAuth = authenticateAdmin(dir, pin, otherCpf, now + 3000);
    assert.equal(badAuth.status, 403);

    // Correct CPF authenticated
    const goodAuth = authenticateAdmin(dir, pin, validCpf, now + 3000);
    assert.equal(goodAuth.status, 200);
    assert.ok(goodAuth.room);
    assert.equal(goodAuth.room.responses.length, 1);
    assert.equal(goodAuth.room.responses[0].valence, 8);
    assert.equal('cpfHash' in goodAuth.room, false);

    // Delete room
    const del = deleteRoom(dir, pin, validCpf, now + 4000);
    assert.equal(del.status, 200);
    assert.equal(getPublicRoom(dir, pin, now + 5000).status, 404);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('30-day automatic expiration prunes expired rooms on read and cleanup', () => {
  const dir = createTempDir();
  try {
    const now = 1700000000000;
    const created = createOrImportRoom(
      dir,
      {
        title: 'Ação de Extensão',
        question: 'Como foi a oficina?',
        contextType: 'extension',
        scale: 5,
        allowComments: true,
        cpf: '529.982.247-25',
      },
      now
    );
    assert.ok(created.room);
    const pin = created.room.pin;

    // Still active at 29 days
    assert.equal(readRooms(dir, now + RETENTION_MS - 1000).length, 1);

    // Expired at 30 days + 1ms
    const cleaned = cleanupExpiredRooms(dir, now + RETENTION_MS + 1);
    assert.equal(cleaned.removed, 1);
    assert.equal(cleaned.remaining, 0);
    assert.equal(getPublicRoom(dir, pin, now + RETENTION_MS + 1).status, 404);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('import/clone room supports keeping responses and optional original PIN', () => {
  const dir = createTempDir();
  try {
    const now = 1700000000000;
    const imported = createOrImportRoom(
      dir,
      {
        title: 'Turma B Clonada',
        question: 'Como você avalia a atividade?',
        contextType: 'extension',
        scale: 5,
        allowComments: true,
        cpf: '529.982.247-25',
        keepOriginalPin: true,
        requestedPin: '654321',
        keepResponses: true,
        importedResponses: [
          {
            id: 'old-1',
            participantName: 'Ana',
            valence: 5,
            arousal: 5,
            dominance: 4,
            comment: 'Ótimo!',
            submittedAt: '2026-11-16T12:00:00.000Z',
          },
        ],
      },
      now
    );

    assert.equal(imported.status, 201);
    assert.ok(imported.room);
    assert.equal(imported.room.pin, '654321');
    assert.equal(imported.room.responses.length, 1);

    // Attempting to clone again with the same PIN while active yields 409
    const duplicate = createOrImportRoom(
      dir,
      {
        title: 'Conflito',
        question: 'Pergunta teste?',
        contextType: 'system',
        scale: 5,
        allowComments: true,
        cpf: '529.982.247-25',
        keepOriginalPin: true,
        requestedPin: '654321',
        keepResponses: false,
      },
      now + 1000
    );
    assert.equal(duplicate.status, 409);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('multi-question rooms: create with multiple questions, add question live, and submit multi-question answers', () => {
  const dir = createTempDir();
  try {
    const now = 1700000000000;
    const validCpf = '529.982.247-25';
    const created = createOrImportRoom(
      dir,
      {
        title: 'Teste de Usabilidade Multi-Etapa',
        questions: [
          { id: 'q1', prompt: 'Como você se sentiu na tela de login?' },
          { id: 'q2', prompt: 'Como você se sentiu ao gerar o relatório?' },
        ],
        contextType: 'system',
        scale: 9,
        allowComments: true,
        cpf: validCpf,
      },
      now
    );

    assert.equal(created.status, 201);
    assert.ok(created.room);
    const pin = created.room.pin;
    assert.equal(created.room.questions.length, 2);

    // Creator adds a 3rd question to the active room
    const addedBadCpf = addQuestionToRoom(
      dir,
      pin,
      { cpf: '111.444.777-35', prompt: 'Como foi o checkout?' },
      now + 500
    );
    assert.equal(addedBadCpf.status, 403);

    const added = addQuestionToRoom(
      dir,
      pin,
      { cpf: validCpf, prompt: 'Como você se sentiu ao finalizar a tarefa?' },
      now + 1000
    );
    assert.equal(added.status, 201);
    assert.ok(added.room);
    assert.equal(added.room.questions.length, 3);
    assert.equal(added.room.questions[2].id, 'q3');

    // Public room exposes all 3 questions
    const pub = getPublicRoom(dir, pin, now + 1500);
    assert.equal(pub.status, 200);
    assert.ok(pub.room);
    assert.equal(pub.room.questions.length, 3);

    // Participant submits answers for all 3 questions
    const resp = addResponse(
      dir,
      pin,
      {
        participantName: 'Carla',
        answers: [
          { questionId: 'q1', valence: 7, arousal: 6, dominance: 8, comment: 'Rápido' },
          { questionId: 'q2', valence: 4, arousal: 7, dominance: 3, comment: 'Filtro confuso' },
          { questionId: 'q3', valence: 9, arousal: 8, dominance: 9, comment: '' },
        ],
      },
      now + 2000
    );
    assert.equal(resp.status, 201);
    assert.equal(resp.responseCount, 3);
    assert.ok(resp.responses);
    assert.equal(resp.responses.length, 3);
    assert.equal(resp.responses[1].questionIndex, 2);
    assert.equal(resp.responses[1].questionPrompt, 'Como você se sentiu ao gerar o relatório?');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

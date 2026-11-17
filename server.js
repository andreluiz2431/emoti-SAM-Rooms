import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RETENTION_DAYS,
  addQuestionToRoom,
  addResponse,
  authenticateAdmin,
  cleanupExpiredRooms,
  createOrImportRoom,
  deleteRoom,
  getPublicRoom,
  readRooms,
  resolveDataDir,
} from './server/roomStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = resolveDataDir();
const IS_DEV = process.env.NODE_ENV === 'development';

// Ensure data directory exists on boot and purge any expired rooms
fs.mkdirSync(DATA_DIR, { recursive: true });
cleanupExpiredRooms(DATA_DIR);

// Periodic cleanup every 60 minutes
const cleanupTimer = setInterval(() => {
  cleanupExpiredRooms(DATA_DIR);
}, 60 * 60 * 1000);
cleanupTimer.unref();

const app = express();
app.use(express.json({ limit: '2mb' }));

// Healthcheck endpoint for Railway & monitoring
app.get('/api/health', (_req, res) => {
  const rooms = readRooms(DATA_DIR);
  res.status(200).json({
    status: 'ok',
    service: 'emoti-sam-rooms',
    persistentVolumeActive: Boolean(
      process.env.RAILWAY_VOLUME_MOUNT_PATH && process.env.RAILWAY_VOLUME_MOUNT_PATH.trim() !== ''
    ),
    dataDir: process.env.RAILWAY_VOLUME_MOUNT_PATH ? 'railway-volume' : 'local-data',
    retentionDays: RETENTION_DAYS,
    activeRooms: rooms.length,
    timestamp: new Date().toISOString(),
  });
});

// Create or import/clone a room
app.post('/api/rooms', (req, res) => {
  const result = createOrImportRoom(DATA_DIR, req.body);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ room: result.room });
});

// Get public room metadata for participant evaluation
app.get('/api/rooms/:pin', (req, res) => {
  const result = getPublicRoom(DATA_DIR, req.params.pin);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ room: result.room });
});

// Submit participant emoti-SAM response (single or multi-question)
app.post('/api/rooms/:pin/respond', (req, res) => {
  const result = addResponse(DATA_DIR, req.params.pin, req.body);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({
    response: result.response,
    responses: result.responses,
    responseCount: result.responseCount,
  });
});

// Add a new question to an existing room (authenticated via creator CPF)
app.post('/api/rooms/:pin/questions', (req, res) => {
  const result = addQuestionToRoom(DATA_DIR, req.params.pin, req.body);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({
    room: result.room,
    addedQuestion: result.addedQuestion,
  });
});

// Authenticate creator via PIN + CPF and return full room results
app.post('/api/rooms/:pin/admin', (req, res) => {
  const result = authenticateAdmin(DATA_DIR, req.params.pin, req.body?.cpf);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ room: result.room });
});

// Delete room early (authenticated via creator CPF)
app.delete('/api/rooms/:pin', (req, res) => {
  const cpf = req.body?.cpf || req.headers['x-creator-cpf'];
  const result = deleteRoom(DATA_DIR, req.params.pin, cpf);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ deleted: true, pin: result.pin });
});

async function startServer() {
  if (IS_DEV) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[emoti-SAM Rooms] Servidor ativo na porta ${PORT} (${IS_DEV ? 'dev' : 'prod'})`);
  });
}

startServer();

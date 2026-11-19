import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOtpService } from './server/otpService.js';
import {
  RETENTION_DAYS,
  addQuestionToRoom,
  addResponse,
  authenticateAdminSession,
  cleanupExpiredRooms,
  createOrImportRoom,
  deleteRoom,
  getPublicRoom,
  readRooms,
  resolveDataDir,
  updateRoomConfig,
  verifyRoomCreatorEmail,
} from './server/roomStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = resolveDataDir();
const IS_DEV = process.env.NODE_ENV === 'development';

const otpService = createOtpService();

// Ensure data directory exists on boot and purge any expired rooms
fs.mkdirSync(DATA_DIR, { recursive: true });
cleanupExpiredRooms(DATA_DIR);

// Periodic cleanup every 60 minutes (rooms > 30 days & expired OTPs/sessions)
const cleanupTimer = setInterval(() => {
  cleanupExpiredRooms(DATA_DIR);
  otpService.cleanup();
}, 60 * 60 * 1000);
cleanupTimer.unref();

const app = express();
app.use(express.json({ limit: '5mb' }));

function extractCreatorSession(req) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = bearerToken || req.body?.token || req.headers['x-creator-token'] || '';
  return otpService.resolveSession(token);
}

// Healthcheck endpoint for Railway & monitoring
app.get('/api/health', (_req, res) => {
  const rooms = readRooms(DATA_DIR);
  res.status(200).json({
    status: 'ok',
    service: 'e-sam',
    persistentVolumeActive: Boolean(
      process.env.RAILWAY_VOLUME_MOUNT_PATH && process.env.RAILWAY_VOLUME_MOUNT_PATH.trim() !== ''
    ),
    dataDir: process.env.RAILWAY_VOLUME_MOUNT_PATH ? 'railway-volume' : 'local-data',
    emailConfigured: Boolean(process.env.EMAIL_API_KEY && process.env.EMAIL_API_KEY.trim() !== ''),
    retentionDays: RETENTION_DAYS,
    activeRooms: rooms.length,
    timestamp: new Date().toISOString(),
  });
});

// Step 1 of Email OTP Auth: request 6-digit verification code
app.post('/api/auth/request-otp', async (req, res) => {
  const { email, purpose, pin } = req.body || {};

  if (purpose === 'admin') {
    const check = verifyRoomCreatorEmail(DATA_DIR, pin, email);
    if (check.error) {
      return res.status(check.status).json({ error: check.error });
    }
  }

  const result = await otpService.requestOtp(email);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(200).json(result);
});

// Step 2 of Email OTP Auth: verify 6-digit code and obtain creator session token
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, code } = req.body || {};
  const result = otpService.verifyOtp(email, code);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(200).json({
    verified: true,
    token: result.token,
    email: result.email,
  });
});

// Create or import/clone a room (authenticated via verified email session token)
app.post('/api/rooms', (req, res) => {
  const session = extractCreatorSession(req);
  const result = createOrImportRoom(DATA_DIR, req.body, session);
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

// Submit participant evaluation response (single or multi-question)
app.post('/api/rooms/:pin/respond', (req, res) => {
  const result = addResponse(DATA_DIR, req.params.pin, req.body);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({
    userId: result.userId,
    response: result.response,
    responses: result.responses,
    responseCount: result.responseCount,
  });
});

// Authenticate creator (via session token OR email + otpCode) and return full room results
app.post('/api/rooms/:pin/admin', (req, res) => {
  let session = extractCreatorSession(req);
  let issuedToken;

  if (!session && req.body?.email && req.body?.code) {
    const verified = otpService.verifyOtp(req.body.email, req.body.code);
    if (verified.error) {
      return res.status(verified.status).json({ error: verified.error });
    }
    session = { email: verified.email, emailHash: verified.emailHash };
    issuedToken = verified.token;
  }

  const result = authenticateAdminSession(DATA_DIR, req.params.pin, session);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({
    room: result.room,
    ...(issuedToken ? { token: issuedToken } : {}),
  });
});

// Update room instrument configuration (locked after first response)
app.put('/api/rooms/:pin/config', (req, res) => {
  const session = extractCreatorSession(req);
  const result = updateRoomConfig(DATA_DIR, req.params.pin, req.body, session);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({ room: result.room });
});

// Add a new question to an existing room (authenticated via creator session)
app.post('/api/rooms/:pin/questions', (req, res) => {
  const session = extractCreatorSession(req);
  const result = addQuestionToRoom(DATA_DIR, req.params.pin, req.body, session);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(result.status).json({
    room: result.room,
    addedQuestion: result.addedQuestion,
  });
});

// Delete room early (authenticated via creator session)
app.delete('/api/rooms/:pin', (req, res) => {
  const session = extractCreatorSession(req);
  const result = deleteRoom(DATA_DIR, req.params.pin, session);
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
    console.log(`[e-SAM] Servidor ativo na porta ${PORT} (${IS_DEV ? 'dev' : 'prod'})`);
  });
}

startServer();

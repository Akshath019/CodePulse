import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { pool, testConnection } from './db.js'
import { publishJob, startResultsConsumer } from './kafka.js'

const app = express()
const httpServer = createServer(app)

// Create Socket.io server
const io = new SocketServer(httpServer, {
  cors: { origin: 'http://localhost:5173' },
})

const PORT = 4000

app.use(cors())
app.use(express.json({ limit: '100kb' }))

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'java'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

interface ExecuteRequest {
  roomId?: string
  code?: string
  language?: string
}

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
}

// ─── Socket.io connection handler ────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`)

  socket.on('room:join', (roomId: string) => {
    socket.join(roomId)
    console.log(`[SOCKET] ${socket.id} joined room ${roomId}`)
  })

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Disconnected: ${socket.id}`)
  })
})

// Expose io globally so kafka.ts can emit results
export { io }

// ─── Routes ──────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodePulse API is running' })
})

app.post('/execute', async (req, res) => {
  const body = req.body as ExecuteRequest
  const roomId = body.roomId || 'local-dev-room'
  const code = body.code
  const language = body.language

  if (!code || !language) {
    res.status(400).json({ error: 'code and language are required' })
    return
  }
  if (!isSupportedLanguage(language)) {
    res.status(400).json({
      error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    })
    return
  }
  if (code.length > 10_000) {
    res.status(400).json({ error: 'Code too long. Max 10,000 characters.' })
    return
  }

  const executionId = randomUUID()

  try {
    await pool.query(
      `INSERT INTO executions (id, room_id, language, code, status)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [executionId, roomId, language, code]
    )
  } catch (err) {
    console.error('[DB] Failed to insert queued execution:', err)
    res.status(500).json({ error: 'Database error' })
    return
  }

  try {
    await publishJob({ executionId, roomId, language, code })
  } catch (err) {
    console.error('[KAFKA] Failed to publish job:', err)
    res.status(500).json({ error: 'Failed to queue job' })
    return
  }

  res.status(202).json({
    executionId,
    roomId,
    status: 'queued',
  })
})

app.get('/history/:roomId', async (req, res) => {
  const { roomId } = req.params
  const limit = parseInt((req.query.limit as string) || '20')

  try {
    const result = await pool.query(
      `SELECT id, language, status, duration_ms, exit_code, created_at,
              LEFT(code, 200) AS code_preview,
              LEFT(stdout, 500) AS stdout_preview
       FROM executions
       WHERE room_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [roomId, limit]
    )
    res.json({ executions: result.rows })
  } catch (err) {
    console.error('[DB] Failed to fetch history:', err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ─── Start ───────────────────────────────────────────

async function start() {
  await testConnection()
  await startResultsConsumer()
  httpServer.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[API] Failed to start:', err)
  process.exit(1)
})
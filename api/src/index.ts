import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { pool, testConnection } from "./db.js";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const SUPPORTED_LANGUAGES = ["python", "javascript", "java"] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
type ExecutionStatus = "success" | "error" | "timeout";

interface ExecuteRequest {
  roomId?: string;
  code?: string;
  language?: string;
}

interface ExecutionResponse {
  executionId: string;
  roomId: string;
  language: SupportedLanguage;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

function getMockOutput(language: SupportedLanguage): string {
  if (language === "python" || language === "javascript") {
    return `Hello from CodePulse API!\nLine 0\nLine 1\nLine 2\nLine 3\nLine 4`;
  }
  return `Hello from CodePulse API!\nJava program executed successfully.`;
}

// ─── Routes ──────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "CodePulse API is running" });
});

app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;
  const roomId = body.roomId || "local-dev-room";
  const code = body.code;
  const language = body.language;

  if (!code || !language) {
    res.status(400).json({ error: "code and language are required" });
    return;
  }

  if (!isSupportedLanguage(language)) {
    res.status(400).json({
      error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
    });
    return;
  }

  if (code.length > 10_000) {
    res.status(400).json({ error: "Code too long. Max 10,000 characters." });
    return;
  }

  const executionId = randomUUID();
  const startTime = Date.now();

  // Fake execution delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const durationMs = Date.now() - startTime;
  const stdout = getMockOutput(language);
  const stderr = "";
  const exitCode = 0;
  const status: ExecutionStatus = "success";

  // Save to Postgres
  try {
    await pool.query(
      `INSERT INTO executions
        (id, room_id, language, code, stdout, stderr, exit_code, status, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        executionId,
        roomId,
        language,
        code,
        stdout,
        stderr,
        exitCode,
        status,
        durationMs,
      ],
    );
    console.log(`[DB] Saved execution ${executionId}`);
  } catch (err) {
    console.error("[DB] Failed to save execution:", err);
  }

  const response: ExecutionResponse = {
    executionId,
    roomId,
    language,
    status,
    stdout,
    stderr,
    exitCode,
    durationMs,
  };

  res.status(200).json(response);
});

// Get history for a room
app.get("/history/:roomId", async (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt((req.query.limit as string) || "20");

  try {
    const result = await pool.query(
      `SELECT id, language, status, duration_ms, exit_code, created_at,
              LEFT(code, 200) AS code_preview,
              LEFT(stdout, 500) AS stdout_preview
       FROM executions
       WHERE room_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [roomId, limit],
    );
    res.json({ executions: result.rows });
  } catch (err) {
    console.error("[DB] Failed to fetch history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ─── Start ───────────────────────────────────────────────

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("[API] Failed to start:", err);
  process.exit(1);
});

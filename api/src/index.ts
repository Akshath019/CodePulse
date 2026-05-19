import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

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
  if (language === "python") {
    return `Hello from CodePulse API!
Line 0
Line 1
Line 2
Line 3
Line 4`;
  }

  if (language === "javascript") {
    return `Hello from CodePulse API!
Line 0
Line 1
Line 2
Line 3
Line 4`;
  }

  return `Hello from CodePulse API!
Java program executed successfully.`;
}

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "CodePulse API is running",
  });
});

// Temporary mock execute endpoint
// Later this will push job to Kafka instead of returning directly
app.post("/execute", async (req, res) => {
  const body = req.body as ExecuteRequest;

  const roomId = body.roomId || "local-dev-room";
  const code = body.code;
  const language = body.language;

  if (!code || !language) {
    res.status(400).json({
      error: "code and language are required",
    });
    return;
  }

  if (!isSupportedLanguage(language)) {
    res.status(400).json({
      error: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
    });
    return;
  }

  if (code.length > 10_000) {
    res.status(400).json({
      error: "Code too long. Max 10,000 characters allowed.",
    });
    return;
  }

  const startTime = Date.now();

  // Fake delay to simulate real execution
  await new Promise((resolve) => setTimeout(resolve, 900));

  const response: ExecutionResponse = {
    executionId: randomUUID(),
    roomId,
    language,
    status: "success",
    stdout: getMockOutput(language),
    stderr: "",
    exitCode: 0,
    durationMs: Date.now() - startTime,
  };

  res.status(200).json(response);
});

app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
});

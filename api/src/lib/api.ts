const API_URL = "http://localhost:4000";

export interface ExecutionResult {
  executionId: string;
  roomId: string;
  language: string;
  status: "success" | "error" | "timeout";
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

interface SubmitCodeArgs {
  roomId: string;
  code: string;
  language: string;
}

export async function submitCode({
  roomId,
  code,
  language,
}: SubmitCodeArgs): Promise<ExecutionResult> {
  const response = await fetch(`${API_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, code, language }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

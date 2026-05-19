import Docker from "dockerode";

// Windows uses named pipes for Docker
// On Linux/Mac, use: { socketPath: '/var/run/docker.sock' }
const docker = new Docker({ socketPath: "//./pipe/docker_engine" });

interface LanguageConfig {
  image: string;
  filename: string;
  runCmd: string;
  timeoutMs: number;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    image: "python:3.11-alpine",
    filename: "solution.py",
    runCmd: "python solution.py",
    timeoutMs: 10_000,
  },
  javascript: {
    image: "node:20-alpine",
    filename: "solution.js",
    runCmd: "node solution.js",
    timeoutMs: 10_000,
  },
  java: {
    image: "eclipse-temurin:21-jdk-alpine",
    filename: "Solution.java",
    runCmd: "javac Solution.java && java Solution",
    timeoutMs: 20_000,
  },
};

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  status: "success" | "error" | "timeout";
}

export async function executeCode(
  language: string,
  code: string,
): Promise<ExecutionResult> {
  const config = LANGUAGE_CONFIGS[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  const startTime = Date.now();
  let container: Docker.Container | null = null;

  // Escape single quotes so shell heredoc works
  const escapedCode = code.replace(/'/g, `'\\''`);

  try {
    container = await docker.createContainer({
      Image: config.image,
      Cmd: [
        "sh",
        "-c",
        `cat > ${config.filename} << 'CODEEOF'\n${escapedCode}\nCODEEOF\n${config.runCmd}`,
      ],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      NetworkDisabled: true, // No internet — security
      HostConfig: {
        Memory: 128 * 1024 * 1024, // 128 MB RAM cap
        CpuPeriod: 100_000,
        CpuQuota: 50_000, // 50% CPU cap
        AutoRemove: true, // Auto-cleanup
      },
    });

    await container.start();

    // Race: execution finishes OR timeout
    const result = await Promise.race([
      collectOutput(container),
      new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), config.timeoutMs),
      ),
    ]);

    const durationMs = Date.now() - startTime;

    if (result === "timeout") {
      try {
        await container.kill();
      } catch {}
      return {
        stdout: "",
        stderr: "Execution timed out",
        exitCode: -1,
        durationMs,
        status: "timeout",
      };
    }

    return {
      stdout: result.stdout.slice(0, 10_000),
      stderr: result.stderr.slice(0, 5_000),
      exitCode: result.exitCode,
      durationMs,
      status: result.exitCode === 0 ? "success" : "error",
    };
  } catch (err: any) {
    return {
      stdout: "",
      stderr: err.message || "Execution failed",
      exitCode: -1,
      durationMs: Date.now() - startTime,
      status: "error",
    };
  }
}

async function collectOutput(
  container: Docker.Container,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const stream = await container.logs({
    stdout: true,
    stderr: true,
    follow: true,
  });

  let stdoutBuf = Buffer.alloc(0);
  let stderrBuf = Buffer.alloc(0);
  let raw = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      raw = Buffer.concat([raw, chunk]);

      // Docker stream format:
      // [8-byte header][payload]
      // header[0] = stream type: 1=stdout, 2=stderr
      // header[4..8] = payload length (big-endian uint32)
      while (raw.length >= 8) {
        const type = raw[0];
        const size = raw.readUInt32BE(4);

        if (raw.length < 8 + size) break; // wait for more data

        const payload = raw.subarray(8, 8 + size);
        if (type === 1) stdoutBuf = Buffer.concat([stdoutBuf, payload]);
        else if (type === 2) stderrBuf = Buffer.concat([stderrBuf, payload]);

        raw = raw.subarray(8 + size);
      }
    });

    stream.on("end", async () => {
      try {
        const data = await container.wait();
        resolve({
          stdout: stdoutBuf.toString("utf8"),
          stderr: stderrBuf.toString("utf8"),
          exitCode: data.StatusCode,
        });
      } catch (err) {
        reject(err);
      }
    });

    stream.on("error", reject);
  });
}

import { useState, useEffect, useRef } from "react";
import { useSocket } from "./hooks/useSocket";
import Editor from "./components/Editor";
import OutputPanel from "./components/OutputPanel";
import { submitCode } from "./lib/api";

const LANGUAGES = ["python", "javascript", "java"];

const DEFAULT_CODE: Record<string, string> = {
  python: `print("Hello from CodePulse!")

for i in range(5):
    print(f"Line {i}")`,

  javascript: `console.log("Hello from CodePulse!");

for (let i = 0; i < 5; i++) {
  console.log(\`Line \${i}\`);
}`,

  java: `public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello from CodePulse!");
    }
}`,
};

export default function App() {
  // ── Room ID from URL or generated ──────────────────────
  const [roomId] = useState<string>(() => {
    const urlRoom = new URLSearchParams(window.location.search).get("room");
    if (urlRoom) return urlRoom;

    // Generate a short random ID (e.g. "aB3xK9pQ")
    const newRoom = Math.random().toString(36).substring(2, 10);
    window.history.replaceState(null, "", `?room=${newRoom}`);
    return newRoom;
  });

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODE["python"]);
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  // Prevents re-broadcasting when we receive an incoming update
  const isRemoteUpdate = useRef(false);
  // ── Listen for incoming code changes from collaborators ──
  const { socket, connected } = useSocket(roomId);

  // ── Listen for incoming code changes from collaborators ──
  useEffect(() => {
    if (!socket) return;

    socket.on("code:updated", ({ code: newCode, language: newLang }) => {
      isRemoteUpdate.current = true;
      setCode(newCode);
      setLanguage(newLang);
    });

    return () => {
      socket.off("code:updated");
    };
  }, [socket]);

  // ── Listen for execution results via WebSocket ─────────
  useEffect(() => {
    if (!socket) return;

    socket.on("execution:result", (data: any) => {
      console.log("[SOCKET] Received result:", data);
      setResult({
        status: data.status,
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        exitCode: data.exitCode ?? 0,
        durationMs: data.durationMs ?? 0,
      });
      setIsRunning(false);
    });

    return () => {
      socket.off("execution:result");
    };
  }, [socket]);

  // ── Copy shareable URL to clipboard ────────────────────
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-white">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#111111] border-b border-white/10">
        {/* Left — Brand + Room */}
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold text-xl tracking-tight">
            ⚡ CodePulse
          </span>

          <button
            onClick={handleShare}
            title="Click to copy shareable link"
            className="text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded font-mono flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                connected ? "bg-green-400" : "bg-red-400"
              }`}
            ></span>
            Room: {roomId}
            <span className="text-white/30">{copied ? "✓ copied" : "📋"}</span>
          </button>
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              const newCode = DEFAULT_CODE[newLang];
              setLanguage(newLang);
              setCode(newCode);
              socket?.emit("code:change", {
                roomId,
                code: newCode,
                language: newLang,
              });
            }}
            className="bg-[#1a1a1a] text-white text-sm px-3 py-1.5 rounded-md border border-white/10 focus:outline-none focus:border-green-500/50 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={async () => {
              setIsRunning(true);
              setResult(null);

              try {
                await submitCode({ roomId, code, language });
                // Result arrives via WebSocket
              } catch (err: any) {
                setResult({
                  status: "error",
                  stdout: "",
                  stderr: err.message || "Failed to execute code",
                  exitCode: -1,
                  durationMs: 0,
                });
                setIsRunning(false);
              }
            }}
            disabled={isRunning}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              isRunning
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-400 text-black"
            }`}
          >
            {isRunning ? "⏳ Running..." : "▶ Run"}
          </button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — Editor (60%) */}
        <div className="w-3/5 flex flex-col border-r border-white/10">
          <div className="px-4 py-2 bg-[#111111] border-b border-white/10 text-xs text-white/40 font-mono">
            {language === "java"
              ? "Solution.java"
              : language === "python"
                ? "solution.py"
                : "solution.js"}
          </div>
          <Editor
            code={code}
            language={language}
            onChange={(value) => {
              const newCode = value || "";
              setCode(newCode);

              // Don't re-emit if this change came from another user
              if (isRemoteUpdate.current) {
                isRemoteUpdate.current = false;
                return;
              }

              socket?.emit("code:change", { roomId, code: newCode, language });
            }}
          />
        </div>

        {/* Right — Output (40%) */}
        <div className="w-2/5 flex flex-col">
          <div className="px-4 py-2 bg-[#111111] border-b border-white/10 text-xs text-white/40">
            Output
          </div>
          <OutputPanel result={result} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}

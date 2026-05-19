import { useState } from "react";
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
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(DEFAULT_CODE["python"]);
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-white">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#111111] border-b border-white/10">
        {/* Left — Brand */}
        <div className="flex items-center gap-3">
          <span className="text-green-400 font-bold text-xl tracking-tight">
            CodePulse
          </span>
          <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded font-mono">
            Room: loading...
          </span>
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setCode(DEFAULT_CODE[e.target.value]);
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
                const data = await submitCode({
                  roomId: "local-dev-room",
                  code,
                  language,
                });
                setResult(data);
              } catch (err: any) {
                setResult({
                  status: "error",
                  stdout: "",
                  stderr: err.message || "Failed to execute code",
                  exitCode: -1,
                  durationMs: 0,
                });
              } finally {
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
          {/* Monaco Editor goes here next step */}
          <Editor
            code={code}
            language={language}
            onChange={(value) => setCode(value || "")}
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

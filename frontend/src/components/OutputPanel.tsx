interface ExecutionResult {
  status: "success" | "error" | "timeout";
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

interface OutputPanelProps {
  result: ExecutionResult | null;
  isRunning: boolean;
}

export default function OutputPanel({ result, isRunning }: OutputPanelProps) {
  // Running state
  if (isRunning) {
    return (
      <div className="flex-1 bg-[#0a0a0a] p-4 font-mono text-sm text-yellow-400 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
        Executing...
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex-1 bg-[#0a0a0a] p-4 font-mono text-sm text-white/30">
        Output will appear here after you run your code.
      </div>
    );
  }

  // Result state
  const statusConfig = {
    success: { color: "text-green-400", dot: "bg-green-400", label: "SUCCESS" },
    error: { color: "text-red-400", dot: "bg-red-400", label: "ERROR" },
    timeout: {
      color: "text-yellow-400",
      dot: "bg-yellow-400",
      label: "TIMEOUT",
    },
  };
  const cfg = statusConfig[result.status];

  return (
    <div className="flex-1 bg-[#0a0a0a] p-4 font-mono text-sm overflow-auto">
      {/* Status bar */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <span className={`inline-block w-2 h-2 ${cfg.dot} rounded-full`}></span>
        <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
        <span className="text-xs text-white/40 ml-auto">
          {result.durationMs}ms · exit {result.exitCode}
        </span>
      </div>

      {/* stdout */}
      {result.stdout && (
        <pre className="text-white/80 whitespace-pre-wrap leading-relaxed">
          {result.stdout}
        </pre>
      )}

      {/* stderr */}
      {result.stderr && (
        <pre className="text-red-400 whitespace-pre-wrap leading-relaxed mt-3">
          {result.stderr}
        </pre>
      )}
    </div>
  );
}

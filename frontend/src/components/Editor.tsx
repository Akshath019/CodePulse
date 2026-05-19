import MonacoEditor from "@monaco-editor/react";

interface EditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
}

export default function Editor({ code, language, onChange }: EditorProps) {
  return (
    <div className="flex-1 h-full">
      <MonacoEditor
        height="100%"
        language={language}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "JetBrains Mono, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          padding: { top: 16 },
        }}
      />
    </div>
  );
}

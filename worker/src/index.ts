import { executeCode } from "./executor.js";

// Test JavaScript
const jsResult = await executeCode(
  "javascript",
  `
console.log("Hello from Node.js!");
for (let i = 0; i < 3; i++) console.log(\`Line \${i}\`);
`,
);
console.log("[JS]", JSON.stringify(jsResult, null, 2));

// Test Python
const pyResult = await executeCode(
  "python",
  `
print("Hello from Python!")
for i in range(3): print(f"Line {i}")
`,
);
console.log("[PY]", JSON.stringify(pyResult, null, 2));

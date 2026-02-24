import { spawn } from "node:child_process";

const forwarded = process.argv.slice(2).filter((arg) => arg !== "-x");
const child = spawn("npx", ["vitest", "run", ...forwarded], { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

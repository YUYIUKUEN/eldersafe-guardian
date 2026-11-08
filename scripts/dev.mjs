import { spawn } from "node:child_process";

const apps = [
  "@eldersafe/elder",
  "@eldersafe/volunteer",
  "@eldersafe/admin",
];

const children = apps.map((filter) => {
  const child = spawn(
    "pnpm",
    ["--filter", filter, "run", "dev"],
    {
      stdio: "inherit",
      shell: true,
      env: process.env,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });

  return child;
});

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

import { spawnSync } from "node:child_process";

const channel = process.argv[2] ?? "preview";
const message =
  process.argv.slice(3).join(" ").trim() || `OTA ${new Date().toISOString()}`;

const args = [
  "--yes",
  "eas-cli@latest",
  "update",
  "--channel",
  channel,
  "--environment",
  channel,
  "--message",
  message,
];

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  args,
  { stdio: "inherit", env: { ...process.env, CI: "1" } },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

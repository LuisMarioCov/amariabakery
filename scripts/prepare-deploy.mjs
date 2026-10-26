import { chmodSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "node_modules", ".bin", "wrangler");
const real = join(root, "node_modules", "wrangler", "bin", "wrangler.js");
const vite = join(root, "node_modules", "vite", "bin", "vite.js");

const shim = `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
if (args[0] === "deploy" && !args.includes("--config")) {
  const build = spawnSync(process.execPath, [${JSON.stringify(vite)}, "build"], { stdio: "inherit" });
  if ((build.status ?? 1) !== 0) process.exit(build.status ?? 1);
  if (!existsSync("dist/worker/wrangler.json")) {
    console.error("No se generó la configuración de despliegue.");
    process.exit(1);
  }
  args.push("--config", "dist/worker/wrangler.json");
}

const result = spawnSync(process.execPath, [${JSON.stringify(real)}, ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);
`;

writeFileSync(target, shim);
chmodSync(target, 0o755);

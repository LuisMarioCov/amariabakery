import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = join("node_modules", ".bin", "wrangler");
const shim = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
real="$basedir/../wrangler/bin/wrangler.js"
if [ "$1" = "deploy" ]; then
  shift
  exec node "$real" deploy --experimental-provision "$@"
fi
exec node "$real" "$@"
`;

writeFileSync(target, shim);
chmodSync(target, 0o755);

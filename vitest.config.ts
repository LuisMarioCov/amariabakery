import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          ADMIN_PASSWORD: "test-password-amaria",
          SESSION_SECRET: "test-session-secret-should-be-32b",
        },
      },
    }),
  ],
  test: {
    include: ["test/**/*.spec.ts"],
  },
});

import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

function inlineCss(): Plugin {
  return {
    name: "inline-css",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["index.html"];
      const cssName = Object.keys(bundle).find((name) => name.endsWith(".css"));
      if (!html || html.type !== "asset" || !cssName) return;
      const css = bundle[cssName];
      if (!css || css.type !== "asset" || typeof css.source !== "string" || typeof html.source !== "string") return;
      html.source = html.source.replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css.source}</style>`);
      delete bundle[cssName];
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom/client": "preact/compat/client",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-dev-runtime",
    },
  },
  plugins: [react(), tailwindcss(), inlineCss(), cloudflare({ viteEnvironment: { name: "worker" } })],
  environments: {
    worker: { build: { sourcemap: true } },
  },
});

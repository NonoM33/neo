/**
 * Bun HTTP server for the Neo ERP status dashboard.
 *
 *   bun run _status/server.ts
 *
 * Routes
 *   GET  /              → serve index.html (the dashboard UI)
 *   GET  /api/status    → fresh repo scan (JSON)
 *   GET  /api/markdown  → fresh STATUS.md rendered text
 *   POST /api/markdown  → regenerate and write STATUS.md to repo root
 *
 * No external deps. The scanner re-runs on every API call so the dashboard
 * always reflects the current FS state.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "./scanner";
import { renderMarkdown } from "./markdown";

const PORT = Number(process.env.PORT ?? 4321);
const HTML_PATH = join(import.meta.dir, "index.html");
const MARKDOWN_PATH = join(import.meta.dir, "..", "STATUS.md");

function mime(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = readFileSync(HTML_PATH, "utf-8");
      // Replace the static snapshot (inlined by `build.ts`) with a fresh
      // live one so the dashboard renders immediately with current data.
      const status = scanRepo();
      const live = `<script id="neo-bootstrap">window.__NEO_STATUS__ = ${JSON.stringify(status)};</script>`;
      const injected = html.replace(
        /<script id="neo-bootstrap">[\s\S]*?<\/script>/,
        live,
      );
      return new Response(injected, {
        headers: { "Content-Type": mime("index.html") },
      });
    }

    if (url.pathname === "/api/status") {
      const status = scanRepo();
      return Response.json(status, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (url.pathname === "/api/markdown") {
      if (req.method === "POST") {
        const status = scanRepo();
        const md = renderMarkdown(status);
        writeFileSync(MARKDOWN_PATH, md, "utf-8");
        return new Response(JSON.stringify({ ok: true, path: MARKDOWN_PATH }), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }
      const status = scanRepo();
      const md = renderMarkdown(status);
      return new Response(md, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

const startupLines = [
  "",
  "┌────────────────────────────────────────────────┐",
  `│  🚀  Neo ERP Dashboard                          │`,
  `│  →  http://localhost:${server.port}                  │`,
  `│  →  http://localhost:${server.port}/api/status       │`,
  `│  →  POST /api/markdown to regenerate STATUS.md │`,
  "└────────────────────────────────────────────────┘",
  "",
];
console.log(startupLines.join("\n"));

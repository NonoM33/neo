/**
 * One-shot build : refreshes both
 *   - STATUS.md at the repo root (committed snapshot)
 *   - the inlined `window.__NEO_STATUS__` bootstrap in _status/index.html
 *     so the dashboard works offline in preview panes / static viewers.
 *
 *   bun run _status/build.ts
 *
 * The Bun server keeps replacing the bootstrap with a live one on each
 * request, so live data still works whenever the server is running.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "./scanner";
import { renderMarkdown } from "./markdown";

const status = scanRepo();
const md = renderMarkdown(status);

const repoRoot = join(import.meta.dir, "..");
const mdPath = join(repoRoot, "STATUS.md");
const htmlPath = join(import.meta.dir, "index.html");

writeFileSync(mdPath, md, "utf-8");

const html = readFileSync(htmlPath, "utf-8");
const bootstrap = `<script id="neo-bootstrap">window.__NEO_STATUS__ = ${JSON.stringify(status)};</script>`;
const next = html.replace(
  /<script id="neo-bootstrap">[\s\S]*?<\/script>/,
  bootstrap,
);

if (next === html) {
  console.error(
    "❌ Could not find <script id='neo-bootstrap'> placeholder in index.html.",
  );
  process.exit(1);
}

writeFileSync(htmlPath, next, "utf-8");

console.log(`✅ Build complete`);
console.log(`   ${status.totals.loc.toLocaleString("fr-FR")} LOC · ${status.totals.testFiles} tests · ${status.totals.bigFilesCount} big files · ${status.totals.todosCount} TODOs`);
console.log(`   → ${mdPath}`);
console.log(`   → ${htmlPath} (bootstrap refreshed)`);

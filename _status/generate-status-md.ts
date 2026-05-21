/**
 * Generate STATUS.md at the repo root by running the scanner once.
 *
 *   bun run _status/generate-status-md.ts
 *
 * Useful for one-shot markdown snapshots without spinning up the HTTP server
 * or refreshing the inlined HTML bootstrap. For the full build (md + html),
 * use `bun run _status/build.ts`.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanRepo } from "./scanner";
import { renderMarkdown } from "./markdown";

const status = scanRepo();
const md = renderMarkdown(status);
const outPath = join(import.meta.dir, "..", "STATUS.md");
writeFileSync(outPath, md, "utf-8");

console.log(`✅ STATUS.md generated → ${outPath}`);
console.log(
  `   ${status.totals.loc.toLocaleString("fr-FR")} LOC · ${status.totals.testFiles} tests · ${status.totals.bigFilesCount} big files · ${status.totals.todosCount} TODOs`,
);

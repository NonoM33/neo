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
import { scanRepo, type RepoStatus } from "./scanner";

const PORT = Number(process.env.PORT ?? 4321);
const HTML_PATH = join(import.meta.dir, "index.html");
const MARKDOWN_PATH = join(import.meta.dir, "..", "STATUS.md");

function renderMarkdown(status: RepoStatus): string {
  const lines: string[] = [];
  const date = new Date(status.generatedAt).toLocaleString("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
  });

  lines.push("# 📊 Neo Domotique — État de l'ERP");
  lines.push("");
  lines.push(`> Snapshot généré le **${date}** — branche \`${status.branch}\`${status.commitsAhead ? ` (${status.commitsAhead} commit(s) en avance sur origin/main)` : ""}`);
  lines.push("");
  lines.push("> 🔄 Pour le dashboard temps réel : `bun run _status/server.ts` puis http://localhost:4321");
  lines.push("");

  // KPIs
  lines.push("## 🎯 Vue d'ensemble");
  lines.push("");
  lines.push("| Métrique | Valeur |");
  lines.push("|---|---|");
  lines.push(`| Lignes de code total | **${status.totals.loc.toLocaleString("fr-FR")}** |`);
  lines.push(`| Fichiers source | ${status.totals.files.toLocaleString("fr-FR")} |`);
  lines.push(`| Tests | **${status.totals.testFiles}** fichiers |`);
  lines.push(`| Modules backend | ${status.totals.modulesBackend} |`);
  lines.push(`| Écrans intégrateur | ${status.totals.screensIntegrateur} |`);
  lines.push(`| Pages CRM | ${status.totals.pagesCrm} |`);
  lines.push(`| Fichiers > 300L | ${status.totals.bigFilesCount} (cible: 0) |`);
  lines.push(`| TODOs / FIXMEs | ${status.totals.todosCount} |`);
  lines.push(`| Commits 30 derniers jours | ${status.totals.commitsLast30d} |`);
  lines.push("");

  // Health
  lines.push("## 🩺 Santé du projet");
  lines.push("");
  for (const h of status.health) {
    const icon = h.level === "ok" ? "✅" : h.level === "warn" ? "🟠" : "🔴";
    lines.push(`- ${icon} **${h.label}** — ${h.message}`);
  }
  lines.push("");

  // Projects
  lines.push("## 📦 Projets");
  lines.push("");
  lines.push("| | Projet | Stack | LOC | Fichiers | Tests |");
  lines.push("|---|---|---|---:|---:|---:|");
  for (const p of status.projects) {
    lines.push(`| ${p.emoji} | **${p.name}** | ${p.stack} | ${p.loc.toLocaleString("fr-FR")} | ${p.files} | ${p.testCount} |`);
  }
  lines.push("");

  for (const p of status.projects) {
    lines.push(`### ${p.emoji} ${p.name}`);
    lines.push("");
    lines.push(p.description);
    lines.push("");
    lines.push(`- Stack : ${p.stack}`);
    lines.push(`- LOC : **${p.loc.toLocaleString("fr-FR")}** dans ${p.files} fichiers`);
    lines.push(`- Tests : ${p.testCount}`);
    lines.push("");
  }

  // Backend modules
  if (status.backendModules.length) {
    lines.push("## 🛠️ Modules backend");
    lines.push("");
    lines.push(status.backendModules.map((m) => `\`${m}\``).join(" · "));
    lines.push("");
  }

  // Integrateur
  if (status.integrateurScreens.length) {
    lines.push("## 📱 Écrans intégrateur");
    lines.push("");
    lines.push(status.integrateurScreens.map((s) => `\`${s}\``).join(" · "));
    lines.push("");
    lines.push("### Blocs");
    lines.push("");
    lines.push(status.integrateurBlocs.map((s) => `\`${s}\``).join(" · "));
    lines.push("");
  }

  // CRM
  if (status.crmPages.length) {
    lines.push("## 📞 Pages CRM");
    lines.push("");
    lines.push(status.crmPages.map((p) => `\`${p}\``).join(" · "));
    lines.push("");
  }

  // Big files
  lines.push("## 🐘 Fichiers monstres (>300 lignes)");
  lines.push("");
  lines.push(`Le CLAUDE.md global impose une cible de **200-300 lignes max par fichier**. ${status.bigFiles.length} fichiers dépassent.`);
  lines.push("");
  lines.push("| Lignes | Fichier |");
  lines.push("|---:|---|");
  for (const f of status.bigFiles.slice(0, 20)) {
    lines.push(`| ${f.lines} | \`${f.path}\` |`);
  }
  if (status.bigFiles.length > 20) {
    lines.push(`| … | _… ${status.bigFiles.length - 20} autres_ |`);
  }
  lines.push("");

  // TODOs
  if (status.todos.length) {
    lines.push("## 📝 TODOs / FIXMEs");
    lines.push("");
    for (const t of status.todos.slice(0, 30)) {
      lines.push(`- **${t.kind}** \`${t.file}:${t.line}\` — ${t.text || "_(sans texte)_"}`);
    }
    if (status.todos.length > 30) {
      lines.push(`- _… ${status.todos.length - 30} autres_`);
    }
    lines.push("");
  }

  // Roadmap
  lines.push("## 🗺️ Roadmap");
  lines.push("");
  for (const section of status.roadmap) {
    lines.push(`### ${section.title}`);
    lines.push("");
    for (const item of section.items) {
      const box = item.status === "done" ? "[x]" : item.status === "in_progress" ? "[~]" : "[ ]";
      const detail = item.detail ? ` _(${item.detail})_` : "";
      lines.push(`- ${box} ${item.label}${detail}`);
    }
    lines.push("");
  }

  // Recent commits
  lines.push("## 📜 Derniers commits");
  lines.push("");
  lines.push("| SHA | Message | Auteur | Date |");
  lines.push("|---|---|---|---|");
  for (const c of status.recentCommits.slice(0, 15)) {
    const shortDate = c.date.slice(0, 16).replace("T", " ");
    const msg = c.message.replace(/\|/g, "\\|");
    lines.push(`| \`${c.sha}\` | ${msg} | ${c.author} | ${shortDate} |`);
  }
  lines.push("");

  return lines.join("\n");
}

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
      return new Response(html, { headers: { "Content-Type": mime("index.html") } });
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

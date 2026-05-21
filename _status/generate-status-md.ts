/**
 * Generate STATUS.md at the repo root by running the scanner once.
 *
 *   bun run _status/generate-status-md.ts
 *
 * Useful for one-shot snapshots without spinning up the HTTP server.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanRepo, type RepoStatus } from "./scanner";

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

  lines.push("## 🩺 Santé du projet");
  lines.push("");
  for (const h of status.health) {
    const icon = h.level === "ok" ? "✅" : h.level === "warn" ? "🟠" : "🔴";
    lines.push(`- ${icon} **${h.label}** — ${h.message}`);
  }
  lines.push("");

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

  if (status.backendModules.length) {
    lines.push("## 🛠️ Modules backend");
    lines.push("");
    lines.push(status.backendModules.map((m) => `\`${m}\``).join(" · "));
    lines.push("");
  }

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

  if (status.crmPages.length) {
    lines.push("## 📞 Pages CRM");
    lines.push("");
    lines.push(status.crmPages.map((p) => `\`${p}\``).join(" · "));
    lines.push("");
  }

  lines.push("## 🐘 Fichiers monstres (>300 lignes)");
  lines.push("");
  lines.push(`Le CLAUDE.md global impose une cible de **200-300 lignes max par fichier**. ${status.bigFiles.length} fichiers dépassent.`);
  lines.push("");
  lines.push("| Lignes | Fichier |");
  lines.push("|---:|---|");
  for (const f of status.bigFiles.slice(0, 25)) {
    lines.push(`| ${f.lines} | \`${f.path}\` |`);
  }
  if (status.bigFiles.length > 25) {
    lines.push(`| … | _… ${status.bigFiles.length - 25} autres_ |`);
  }
  lines.push("");

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

const status = scanRepo();
const md = renderMarkdown(status);
const outPath = join(import.meta.dir, "..", "STATUS.md");
writeFileSync(outPath, md, "utf-8");

console.log(`✅ STATUS.md generated → ${outPath}`);
console.log(`   ${status.totals.loc.toLocaleString("fr-FR")} LOC · ${status.totals.testFiles} tests · ${status.totals.bigFilesCount} big files · ${status.totals.todosCount} TODOs`);

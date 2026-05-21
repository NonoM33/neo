/**
 * Repo scanner — produces a JSON snapshot of the Neo ERP state.
 *
 * Runs in Bun. No external deps. All FS access is read-only.
 * The shape returned here is what /api/status serves and what the
 * dashboard UI consumes.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..");

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RepoStatus {
  generatedAt: string;
  branch: string;
  commitsAhead: number;
  totals: Totals;
  projects: ProjectInfo[];
  backendModules: string[];
  integrateurScreens: string[];
  integrateurBlocs: string[];
  crmPages: string[];
  bigFiles: FileSize[];
  todos: TodoItem[];
  tests: TestSummary;
  recentCommits: CommitInfo[];
  roadmap: RoadmapSection[];
  health: HealthCheck[];
}

interface Totals {
  loc: number;
  files: number;
  testFiles: number;
  bigFilesCount: number;
  todosCount: number;
  commitsLast30d: number;
  modulesBackend: number;
  screensIntegrateur: number;
  pagesCrm: number;
}

interface ProjectInfo {
  slug: string;
  name: string;
  stack: string;
  description: string;
  loc: number;
  files: number;
  testCount: number;
  emoji: string;
  status: "prod" | "dev" | "exp";
}

interface FileSize {
  path: string;
  lines: number;
  project: string;
}

interface TodoItem {
  file: string;
  line: number;
  kind: "TODO" | "FIXME" | "XXX" | "HACK";
  text: string;
}

interface TestSummary {
  total: number;
  byProject: Record<string, number>;
  files: string[];
}

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  filesChanged: number;
}

interface RoadmapSection {
  title: string;
  items: RoadmapItem[];
}

interface RoadmapItem {
  status: "done" | "in_progress" | "todo";
  label: string;
  detail?: string;
}

interface HealthCheck {
  label: string;
  level: "ok" | "warn" | "alert";
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules",
  ".dart_tool",
  "build",
  "dist",
  ".next",
  ".git",
  ".idea",
  ".vscode",
  "ios",
  "android",
  ".symlinks",
  "Pods",
  ".astro",
  "Flutter",
  ".cursor",
  ".claude",
  "_status",
  "_bmad",
  "_bmad-output",
  "worktrees",
]);

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".dart",
  ".astro",
  ".py",
  ".js",
  ".jsx",
]);

function isCodeFile(filename: string): boolean {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return false;
  return CODE_EXT.has(filename.slice(dotIdx));
}

function* walk(dir: string): Generator<string> {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function countLines(path: string): number {
  try {
    return readFileSync(path, "utf-8").split("\n").length;
  } catch {
    return 0;
  }
}

function safeGit(args: string[]): string {
  try {
    const proc = Bun.spawnSync({
      cmd: ["git", ...args],
      cwd: REPO_ROOT,
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode !== 0) return "";
    return new TextDecoder().decode(proc.stdout).trim();
  } catch {
    return "";
  }
}

function listDirs(path: string): string[] {
  try {
    return readdirSync(join(REPO_ROOT, path), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scanners
// ─────────────────────────────────────────────────────────────────────────────

const PROJECTS: Array<Omit<ProjectInfo, "loc" | "files" | "testCount">> = [
  {
    slug: "backend",
    name: "Backend",
    stack: "Hono + Bun + Drizzle + Postgres",
    description: "API REST principale, Swagger, 25 modules métier, signatures Documenso, S3, JWT",
    emoji: "🛠️",
    status: "prod",
  },
  {
    slug: "integrateur-app",
    name: "App Intégrateur",
    stack: "Flutter (BLoC + Hive + Dio + RoomPlan LiDAR)",
    description: "App tablette terrain — audit, photos, plan 2D/3D, devis, signature électronique native",
    emoji: "📱",
    status: "prod",
  },
  {
    slug: "crm-commercial",
    name: "CRM Commercial",
    stack: "React 19 + Vite + Zustand",
    description: "Prospection, RDV Calendly, leads, calls + qualif IA Whisper/Claude, KPI, leaderboard",
    emoji: "📞",
    status: "prod",
  },
  {
    slug: "site-vitrine",
    name: "Site Vitrine",
    stack: "Astro + Tailwind",
    description: "Vitrine commerciale, audit conversion, formulaires, booking public",
    emoji: "🌐",
    status: "prod",
  },
  {
    slug: "neo-cloud",
    name: "Neo Cloud",
    stack: "Home Assistant custom + Docker",
    description: "Provisioning auto d'instances HA white-label, custom components",
    emoji: "☁️",
    status: "prod",
  },
  {
    slug: "whisper-proxy",
    name: "Whisper Proxy",
    stack: "Python + Parakeet",
    description: "Transcription audio locale (NVIDIA Parakeet) pour les appels CRM",
    emoji: "🎙️",
    status: "prod",
  },
];

function scanProject(slug: string): { loc: number; files: number; testCount: number } {
  const root = join(REPO_ROOT, slug);
  if (!existsSync(root)) return { loc: 0, files: 0, testCount: 0 };
  let loc = 0;
  let files = 0;
  let testCount = 0;
  for (const f of walk(root)) {
    const name = f.split("/").pop()!;
    if (!isCodeFile(name)) continue;
    files += 1;
    loc += countLines(f);
    if (name.endsWith("_test.dart") || name.endsWith(".test.ts") || name.endsWith(".spec.ts")) {
      testCount += 1;
    }
  }
  return { loc, files, testCount };
}

function scanBigFiles(): FileSize[] {
  const results: FileSize[] = [];
  for (const proj of PROJECTS) {
    const root = join(REPO_ROOT, proj.slug);
    if (!existsSync(root)) continue;
    for (const f of walk(root)) {
      const name = f.split("/").pop()!;
      if (!isCodeFile(name)) continue;
      const lines = countLines(f);
      if (lines > 300) {
        results.push({
          path: relative(REPO_ROOT, f),
          lines,
          project: proj.slug,
        });
      }
    }
  }
  return results.sort((a, b) => b.lines - a.lines);
}

function scanTodos(): TodoItem[] {
  const results: TodoItem[] = [];
  const re = /\b(TODO|FIXME|XXX|HACK)\b[:\s-]*([^\n]{0,140})/;
  for (const proj of PROJECTS) {
    const root = join(REPO_ROOT, proj.slug);
    if (!existsSync(root)) continue;
    for (const f of walk(root)) {
      const name = f.split("/").pop()!;
      if (!isCodeFile(name)) continue;
      let content: string;
      try {
        content = readFileSync(f, "utf-8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = re.exec(lines[i]);
        if (m) {
          results.push({
            file: relative(REPO_ROOT, f),
            line: i + 1,
            kind: m[1] as TodoItem["kind"],
            text: (m[2] ?? "").trim(),
          });
        }
      }
    }
  }
  return results;
}

function scanTests(): TestSummary {
  const files: string[] = [];
  const byProject: Record<string, number> = {};
  for (const proj of PROJECTS) {
    const root = join(REPO_ROOT, proj.slug);
    if (!existsSync(root)) continue;
    let n = 0;
    for (const f of walk(root)) {
      const name = f.split("/").pop()!;
      if (
        name.endsWith("_test.dart") ||
        name.endsWith(".test.ts") ||
        name.endsWith(".spec.ts")
      ) {
        files.push(relative(REPO_ROOT, f));
        n += 1;
      }
    }
    byProject[proj.slug] = n;
  }
  return { total: files.length, byProject, files };
}

function scanGit(): { branch: string; commitsAhead: number; recent: CommitInfo[]; commitsLast30d: number } {
  const branch = safeGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  const aheadRaw = safeGit(["rev-list", "--count", "origin/main..HEAD"]);
  const commitsAhead = parseInt(aheadRaw, 10) || 0;

  const SEP = "<<NEO_SEP>>";
  const logRaw = safeGit([
    "log",
    "-20",
    `--pretty=format:%h${SEP}%s${SEP}%aN${SEP}%ad`,
    "--date=iso-strict",
  ]);
  const recent: CommitInfo[] = logRaw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, message, author, date] = line.split(SEP);
      return { sha, message, author, date, filesChanged: 0 };
    });

  const commitsLast30dRaw = safeGit(["log", "--since=30 days ago", "--oneline"]);
  const commitsLast30d = commitsLast30dRaw.split("\n").filter(Boolean).length;

  return { branch, commitsAhead, recent, commitsLast30d };
}

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap — hand-curated based on current sprint state
// ─────────────────────────────────────────────────────────────────────────────

function buildRoadmap(testTotal: number, bigFilesCount: number): RoadmapSection[] {
  return [
    {
      title: "Sprint Qualité (en cours)",
      items: [
        { status: "done", label: "Tests repositories (project, quote, catalogue, floor_plan)", detail: "82 tests" },
        { status: "done", label: "Tests blocs (projects, quotes, audit, floor_plan)", detail: "62 tests" },
        { status: "done", label: "Fix 3 tests AuthRepository pré-existants" },
        { status: "done", label: "Hook pre-commit flutter test bloquant", detail: "scripts/git-hooks/" },
        { status: "done", label: "Refacto audit_screen round 1", detail: "2621 → 2018 lignes" },
        { status: "done", label: "CRM noUnusedLocals/Params ré-activé" },
        { status: "in_progress", label: "Refacto audit_screen rounds 2-4", detail: "Encore 2018L, cible ~300L" },
        { status: "todo", label: "Refacto project_detail_screen.dart", detail: "2102L intact" },
        { status: "todo", label: "Tests blocs restants (catalogue, dashboard, homes, sync, tech_audit, tickets, appointments)" },
        { status: "todo", label: "Tests repositories restants (auth*, device, user, sync, ticket, appointment)" },
      ],
    },
    {
      title: "Sprint Sync & Offline polish (prévu)",
      items: [
        { status: "todo", label: "Sync robuste backend ↔ app (offline-first)" },
        { status: "todo", label: "Gestion des conflits sync" },
        { status: "todo", label: "Upload photos background avec retry queue" },
        { status: "todo", label: "Indicateur sync UI temps réel" },
      ],
    },
    {
      title: "Sprint Devis → Facturation → Stock (prévu)",
      items: [
        { status: "todo", label: "Workflow devis signé → bon de commande fournisseur" },
        { status: "todo", label: "Réception stock + scan QR" },
        { status: "todo", label: "Facturation client" },
        { status: "todo", label: "Paiements (intégration Stripe ou virement)" },
      ],
    },
    {
      title: "Sprint CRM × App — unifier l'écosystème (prévu)",
      items: [
        { status: "todo", label: "Dispatching auto leads CRM → intégrateurs app" },
        { status: "todo", label: "KPI temps réel partagés CRM/app" },
        { status: "todo", label: "Vue commerciale 360° client" },
      ],
    },
    {
      title: "Dette technique observée",
      items: [
        { status: bigFilesCount > 20 ? "in_progress" : "done", label: `${bigFilesCount} fichiers > 300L à découper` },
        { status: testTotal < 200 ? "in_progress" : "done", label: `${testTotal} tests — cible 80% couverture (CLAUDE.md global)` },
        { status: "todo", label: "Migrations DB : passer du programmatique à drizzle-kit migrate propre" },
        { status: "todo", label: "Backend : split modules > 1000L (appointments.service.ts 1634L)" },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Health checks
// ─────────────────────────────────────────────────────────────────────────────

function buildHealth(status: Omit<RepoStatus, "health" | "generatedAt">): HealthCheck[] {
  const checks: HealthCheck[] = [];

  if (status.tests.total >= 150) {
    checks.push({ label: "Tests Flutter", level: "ok", message: `${status.tests.total} tests présents` });
  } else if (status.tests.total >= 50) {
    checks.push({ label: "Tests Flutter", level: "warn", message: `${status.tests.total} tests — sous-couvert` });
  } else {
    checks.push({ label: "Tests Flutter", level: "alert", message: `${status.tests.total} tests — couverture critique` });
  }

  const monster = status.bigFiles.find((f) => f.lines > 2000);
  if (monster) {
    checks.push({
      label: "Fichiers monstres",
      level: "alert",
      message: `${monster.path} : ${monster.lines} lignes (max recommandé 300)`,
    });
  }

  if (status.todos.length === 0) {
    checks.push({ label: "TODOs/FIXMEs", level: "ok", message: "Aucun" });
  } else if (status.todos.length < 30) {
    checks.push({ label: "TODOs/FIXMEs", level: "warn", message: `${status.todos.length} marqueurs dans le code` });
  } else {
    checks.push({ label: "TODOs/FIXMEs", level: "alert", message: `${status.todos.length} marqueurs — à nettoyer` });
  }

  if (status.commitsAhead > 0) {
    checks.push({
      label: "Branche locale",
      level: "warn",
      message: `${status.commitsAhead} commit(s) en avance sur origin/main — push pending`,
    });
  } else {
    checks.push({ label: "Branche locale", level: "ok", message: "à jour avec origin/main" });
  }

  return checks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function scanRepo(): RepoStatus {
  const projects: ProjectInfo[] = PROJECTS.map((p) => {
    const { loc, files, testCount } = scanProject(p.slug);
    return { ...p, loc, files, testCount };
  });

  const bigFiles = scanBigFiles();
  const todos = scanTodos();
  const tests = scanTests();
  const git = scanGit();

  const totals: Totals = {
    loc: projects.reduce((s, p) => s + p.loc, 0),
    files: projects.reduce((s, p) => s + p.files, 0),
    testFiles: tests.total,
    bigFilesCount: bigFiles.length,
    todosCount: todos.length,
    commitsLast30d: git.commitsLast30d,
    modulesBackend: listDirs("backend/src/modules").length,
    screensIntegrateur: listDirs("integrateur-app/lib/presentation/screens").length,
    pagesCrm: listDirs("crm-commercial/src/pages").length,
  };

  const partial: Omit<RepoStatus, "health" | "generatedAt"> = {
    branch: git.branch,
    commitsAhead: git.commitsAhead,
    totals,
    projects,
    backendModules: listDirs("backend/src/modules"),
    integrateurScreens: listDirs("integrateur-app/lib/presentation/screens"),
    integrateurBlocs: listDirs("integrateur-app/lib/presentation/blocs"),
    crmPages: listDirs("crm-commercial/src/pages"),
    bigFiles,
    todos,
    tests,
    recentCommits: git.recent,
    roadmap: buildRoadmap(tests.total, bigFiles.length),
  };

  return {
    ...partial,
    health: buildHealth(partial),
    generatedAt: new Date().toISOString(),
  };
}

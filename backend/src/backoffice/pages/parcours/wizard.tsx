import type { FC } from 'hono/jsx';

export interface ParcoursWizardPageProps {
  /** Short-lived staff JWT used by the browser wizard to call /api. */
  token: string;
  /** Display name of the commercial driving the journey. */
  userName: string;
  /** Optional project id to resume an in-progress journey. */
  resumeProjectId?: string;
}

/**
 * Fullscreen guided journey ("parcours"). Renders its own document (no
 * back-office chrome) so the commercial — and the client watching — get an
 * immersive, app-like experience. All business logic is reused from the
 * existing /api endpoints; the heavy lifting lives in the client bundle.
 */
export const ParcoursWizardPage: FC<ParcoursWizardPageProps> = ({
  token,
  userName,
  resumeProjectId,
}) => {
  const bootstrap = JSON.stringify({
    token,
    userName,
    resumeProjectId: resumeProjectId ?? null,
    apiBase: '/api',
  });

  return (
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Parcours projet — Neo</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
        <style>{CSS}</style>
      </head>
      <body>
        <div id="app">
          <div class="boot">
            <div class="boot-spin"></div>
            <p>Préparation du parcours…</p>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `window.__PARCOURS__ = ${bootstrap};` }} />
        <script src="/backoffice/parcours/app.js" defer></script>
      </body>
    </html>
  );
};

const CSS = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg0:#0b1020; --bg1:#131a32; --panel:rgba(255,255,255,.06);
  --panel-bd:rgba(255,255,255,.10); --ink:#eef2ff; --muted:#9aa6c7;
  --accent:#6366f1; --accent2:#22d3ee; --good:#34d399; --warn:#fbbf24; --bad:#f87171;
  --grad:linear-gradient(135deg,#6366f1 0%,#22d3ee 100%);
}
html,body{height:100%}
body{
  margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink);background:
    radial-gradient(1200px 700px at 80% -10%,rgba(99,102,241,.25),transparent 60%),
    radial-gradient(900px 600px at 0% 110%,rgba(34,211,238,.18),transparent 55%),
    var(--bg0);
  overflow:hidden;
}
.boot{height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:var(--muted)}
.boot-spin{width:46px;height:46px;border-radius:50%;border:3px solid rgba(255,255,255,.12);border-top-color:var(--accent2);animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.shell{height:100vh;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;gap:16px;padding:16px 26px;flex:0 0 auto}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.3px}
.brand .dot{width:30px;height:30px;border-radius:9px;background:var(--grad);display:grid;place-items:center;color:#0b1020;font-size:1.1rem}
.topbar .who{margin-left:auto;color:var(--muted);font-size:.9rem;display:flex;align-items:center;gap:14px}
.btn-ghost{background:var(--panel);border:1px solid var(--panel-bd);color:var(--ink);padding:8px 14px;border-radius:11px;cursor:pointer;font-size:.86rem;display:inline-flex;align-items:center;gap:8px;transition:.15s;text-decoration:none}
.btn-ghost:hover{background:rgba(255,255,255,.12)}

/* Stepper */
.stepper{display:flex;align-items:center;gap:6px;padding:4px 26px 10px;flex:0 0 auto;overflow-x:auto}
.step{display:flex;align-items:center;gap:9px;padding:8px 12px;border-radius:12px;white-space:nowrap;color:var(--muted);font-size:.82rem;transition:.2s}
.step .num{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid var(--panel-bd);font-weight:700;font-size:.8rem}
.step.done{color:var(--ink)}
.step.done .num{background:var(--good);color:#04231a;border-color:transparent}
.step.active{color:#fff;background:var(--panel);border:1px solid var(--panel-bd)}
.step.active .num{background:var(--grad);color:#06121f;border-color:transparent;box-shadow:0 0 0 4px rgba(99,102,241,.20)}
.step .bar{width:18px;height:2px;background:rgba(255,255,255,.12);border-radius:2px}

/* Stage */
.stage{flex:1 1 auto;overflow-y:auto;padding:6px 26px 28px;display:flex;justify-content:center}
.panel{width:100%;max-width:980px;animation:rise .35s cubic-bezier(.2,.7,.3,1)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.h-lead{font-size:1.9rem;font-weight:800;margin:6px 0 2px;letter-spacing:-.5px}
.h-sub{color:var(--muted);margin:0 0 22px}
.card{background:var(--panel);border:1px solid var(--panel-bd);border-radius:18px;padding:22px;backdrop-filter:blur(10px);box-shadow:0 18px 50px rgba(0,0,0,.35)}
.card + .card{margin-top:16px}
.grid{display:grid;gap:14px}
.grid.cols-2{grid-template-columns:1fr 1fr}
@media(max-width:720px){.grid.cols-2{grid-template-columns:1fr}.h-lead{font-size:1.5rem}}

label.fld{display:block}
label.fld > span{display:block;font-size:.78rem;color:var(--muted);margin:0 0 6px;text-transform:uppercase;letter-spacing:.4px}
.inp{width:100%;background:rgba(0,0,0,.25);border:1px solid var(--panel-bd);color:var(--ink);padding:13px 14px;border-radius:12px;font-size:1rem;outline:none;transition:.15s}
.inp:focus{border-color:var(--accent);box-shadow:0 0 0 4px rgba(99,102,241,.18)}
textarea.inp{resize:vertical;min-height:80px}

.btn{border:none;border-radius:13px;padding:13px 20px;font-size:1rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:9px;transition:.15s}
.btn-primary{background:var(--grad);color:#06121f}
.btn-primary:hover{filter:brightness(1.07);transform:translateY(-1px)}
.btn-soft{background:var(--panel);border:1px solid var(--panel-bd);color:var(--ink)}
.btn-soft:hover{background:rgba(255,255,255,.12)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;filter:none}
.btn-lg{padding:16px 26px;font-size:1.06rem}

.footnav{display:flex;align-items:center;gap:12px;margin-top:20px}
.footnav .spacer{flex:1}

/* chips / tiles */
.chip{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;border:1px solid var(--panel-bd);background:rgba(0,0,0,.22);cursor:pointer;font-size:.9rem;transition:.12s;user-select:none}
.chip:hover{border-color:var(--accent)}
.chip.on{background:var(--grad);color:#06121f;border-color:transparent;font-weight:700}
.chips{display:flex;flex-wrap:wrap;gap:9px}

.tile{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:14px;border:1px solid var(--panel-bd);background:rgba(0,0,0,.2);cursor:pointer;transition:.15s}
.tile:hover{border-color:var(--accent);transform:translateY(-1px)}
.tile.on{border-color:var(--accent2);box-shadow:0 0 0 3px rgba(34,211,238,.18)}
.tile .ic{width:44px;height:44px;border-radius:12px;background:var(--grad);display:grid;place-items:center;color:#06121f;font-size:1.3rem;flex:0 0 auto}
.tile .t{font-weight:700}
.tile .s{color:var(--muted);font-size:.85rem}

.list-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:rgba(0,0,0,.18);border:1px solid var(--panel-bd)}
.list-row + .list-row{margin-top:9px}
.pill{font-size:.72rem;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--muted)}

.kpi{display:flex;flex-direction:column;gap:2px;background:rgba(0,0,0,.22);border:1px solid var(--panel-bd);border-radius:14px;padding:16px}
.kpi .v{font-size:1.7rem;font-weight:800}
.kpi .l{color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.4px}

.muted{color:var(--muted)}
.right{text-align:right}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1b2444;border:1px solid var(--panel-bd);padding:12px 18px;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);opacity:0;transition:.25s;z-index:60}
.toast.show{opacity:1;transform:translateX(-50%) translateY(-4px)}
.toast.err{border-color:var(--bad)}

/* Client fullscreen mode */
body.client-mode .topbar .who,body.client-mode .footnav{filter:none}
.client-banner{display:none}
body.client-mode{background:
  radial-gradient(1400px 800px at 50% -20%,rgba(99,102,241,.30),transparent 60%),
  radial-gradient(1000px 700px at 50% 120%,rgba(34,211,238,.22),transparent 55%),var(--bg0)}
body.client-mode .commercial-only{display:none!important}
body.client-mode .client-banner{display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;background:var(--grad);color:#06121f;font-weight:700;letter-spacing:.3px}
body.client-mode .panel{max-width:1100px}
body.client-mode .h-lead{font-size:2.4rem}
.exit-client{display:none}
body.client-mode .exit-client{display:grid;place-items:center;position:fixed;top:14px;right:14px;z-index:70;width:40px;height:40px;border-radius:50%;border:1px solid var(--panel-bd);background:rgba(0,0,0,.35);color:#fff;cursor:pointer;font-size:1rem}
body.client-mode .exit-client:hover{background:rgba(0,0,0,.6)}

.sig-frame{width:100%;height:62vh;border:none;border-radius:16px;background:#fff}
.spin-sm{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin .7s linear infinite;display:inline-block}
.confetti{font-size:4rem;animation:pop .6s cubic-bezier(.2,.8,.3,1.4)}
@keyframes pop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}

/* Equipment catalogue */
.equip-search{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.25);border:1px solid var(--panel-bd);border-radius:12px;padding:0 14px;margin-bottom:12px}
.equip-search i{color:var(--muted)}
.equip-search .inp{border:none;background:transparent;padding:12px 0;box-shadow:none}
.equip-cats{margin-bottom:16px}
.equip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px}
.pcard{display:flex;flex-direction:column;border:1px solid var(--panel-bd);background:rgba(0,0,0,.2);border-radius:16px;overflow:hidden;transition:.15s}
.pcard:hover{border-color:var(--accent);transform:translateY(-2px)}
.pcard.on{border-color:var(--accent2);box-shadow:0 0 0 3px rgba(34,211,238,.18)}
.pcard-img{height:110px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.04)}
.pcard-img--ph{display:grid;place-items:center;font-size:2.2rem;color:var(--muted);background:linear-gradient(135deg,rgba(99,102,241,.18),rgba(34,211,238,.12))}
.pcard-body{padding:12px 13px 10px;flex:1}
.pcard-cat{font-size:.7rem;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}
.pcard-name{font-weight:700;font-size:.92rem;margin:3px 0 6px;line-height:1.25}
.pcard-price{font-weight:800;background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.btn-add{margin:0 13px 13px;border-radius:11px;padding:10px;font-size:.9rem;width:calc(100% - 26px)}
.qty{display:flex;align-items:center;justify-content:space-between;margin:0 13px 13px;background:rgba(0,0,0,.3);border:1px solid var(--panel-bd);border-radius:11px;padding:5px}
.qty-btn{width:34px;height:34px;border-radius:9px;border:none;background:var(--grad);color:#06121f;font-size:1rem;cursor:pointer;display:grid;place-items:center}
.qty-btn:hover{filter:brightness(1.08)}
.qty-n{font-weight:800;font-size:1.05rem;min-width:28px;text-align:center}
@media(max-width:720px){.equip-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}
`;

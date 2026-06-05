/**
 * Styleguide vivant du Neo Backoffice Design System.
 * Recrée `backoffice/Neo Design System.html` du handoff Claude Design.
 * Référence DA obligatoire — voir DESIGN_SYSTEM.md.
 */

const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Swatch({ bg, name, value, token, darkName }: { bg: string; name: string; value: string; token: string; darkName?: boolean }) {
  return (
    <div className="sw">
      <div className="chip" style={{ background: bg }} />
      <div className="nm" style={darkName ? { color: 'var(--ink)' } : undefined}>{name}</div>
      <div className="vl">{value}</div>
      <div className="tk">{token}</div>
    </div>
  );
}

export function DesignSystemPage() {
  return (
    <div className="neo-ds">
      <div className="sg-wrap">
        <header className="sg-hero">
          <span className="eb"><span className="pd" />Neo Backoffice · Design System</span>
          <h1>La DA, en un coup d'œil.</h1>
          <p>
            Fondé sur le Komun Design System, adapté à l'outil staff. Tokens, composants et patterns.
            Pour la doc complète et les recettes de pages, voir <code>DESIGN_SYSTEM.md</code>.
          </p>
        </header>

        {/* COULEURS — surfaces */}
        <section className="sg-sec">
          <h2>Couleurs — surfaces</h2>
          <div className="sg-row">
            <Swatch bg="var(--paper)" name="Paper" value="#FBFAF7" token="--paper" />
            <Swatch bg="var(--paper-2)" name="Paper 2" value="#F4F1EA" token="--paper-2" />
            <Swatch bg="var(--card)" name="Card" value="#FFFFFF" token="--card" />
            <Swatch bg="var(--hover)" name="Hover" value="#F0ECE3" token="--hover" />
            <Swatch bg="var(--line)" name="Line" value="#E8E2D5" token="--line" />
          </div>
        </section>

        {/* COULEURS — encre */}
        <section className="sg-sec">
          <h2>Couleurs — encre</h2>
          <div className="sg-row">
            <Swatch bg="var(--ink)" name="Ink" value="#14213D" token="--ink" darkName />
            <Swatch bg="var(--ink-2)" name="Ink 2" value="#3B4A6B" token="--ink-2" />
            <Swatch bg="var(--ink-3)" name="Ink 3" value="#6B7895" token="--ink-3" />
            <Swatch bg="var(--ink-4)" name="Ink 4" value="#A0A8BA" token="--ink-4" />
          </div>
        </section>

        {/* COULEURS — marque & sémantique */}
        <section className="sg-sec">
          <h2>Couleurs — marque &amp; sémantique</h2>
          <div className="sg-row">
            <Swatch bg="var(--komun)" name="Komun blue" value="action" token="--komun" />
            <Swatch bg="var(--komun-soft)" name="Komun soft" value="fond teinté" token="--komun-soft" />
            <Swatch bg="var(--ochre)" name="Ochre" value="accent" token="--ochre" />
            <Swatch bg="var(--ochre-soft)" name="Ochre soft" value="fond teinté" token="--ochre-soft" />
            <Swatch bg="var(--success)" name="Success" value="terminé" token="--success" />
            <Swatch bg="var(--warning)" name="Warning" value="en cours" token="--warning" />
            <Swatch bg="var(--danger)" name="Danger" value="urgence" token="--danger" />
          </div>
        </section>

        {/* COULEURS — sidebar */}
        <section className="sg-sec">
          <h2>Couleurs — sidebar (surface navy)</h2>
          <div className="sg-row">
            <Swatch bg="var(--sb-bg)" name="SB bg" value="#14213D" token="--sb-bg" darkName />
            <Swatch bg="var(--sb-bg-2)" name="SB bg 2" value="hover/actif" token="--sb-bg-2" />
            <Swatch bg="var(--sb-ink)" name="SB ink" value="#C6CEDF" token="--sb-ink" />
            <Swatch bg="var(--sb-ink-2)" name="SB ink 2" value="#8793AD" token="--sb-ink-2" />
          </div>
        </section>

        {/* TYPO */}
        <section className="sg-sec">
          <h2>Typographie</h2>
          <div className="type-row"><div className="meta">Serif · display 52</div><div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 48, lineHeight: 1 }}>Villa connectée</div></div>
          <div className="type-row"><div className="meta">Geist · h1 25/600</div><div style={{ fontSize: 25, fontWeight: 600, letterSpacing: '-.025em' }}>Pipeline commercial</div></div>
          <div className="type-row"><div className="meta">Geist · h3 16/600</div><div style={{ fontSize: 16, fontWeight: 600 }}>Projets récents</div></div>
          <div className="type-row"><div className="meta">Geist · body 15/400</div><div style={{ fontSize: 15 }}>Voici ce qui se passe chez Neo aujourd'hui.</div></div>
          <div className="type-row"><div className="meta">Geist · small 13</div><div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Lead créé le 4 juin 2026</div></div>
          <div className="type-row"><div className="meta">Méta · 12 upper</div><div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Description du besoin</div></div>
          <div className="type-row"><div className="meta">Mono · 13</div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>DEV-2041 · 24 800 €</div></div>
        </section>

        {/* RAYONS */}
        <section className="sg-sec">
          <h2>Rayons</h2>
          <div className="sg-row">
            <div><div className="radius-box" style={{ borderRadius: 'var(--r-xs)' }}>4</div><div className="tk" style={{ marginTop: 8 }}>--r-xs · tags</div></div>
            <div><div className="radius-box" style={{ borderRadius: 'var(--r-sm)' }}>8</div><div className="tk" style={{ marginTop: 8 }}>--r-sm · boutons</div></div>
            <div><div className="radius-box" style={{ borderRadius: 'var(--r-md)' }}>12</div><div className="tk" style={{ marginTop: 8 }}>--r-md · cartes</div></div>
            <div><div className="radius-box" style={{ borderRadius: 'var(--r-lg)' }}>16</div><div className="tk" style={{ marginTop: 8 }}>--r-lg · grandes</div></div>
            <div><div className="radius-box" style={{ borderRadius: 'var(--r-xl)' }}>24</div><div className="tk" style={{ marginTop: 8 }}>--r-xl · héros</div></div>
          </div>
        </section>

        {/* OMBRES */}
        <section className="sg-sec">
          <h2>Ombres (warm-navy)</h2>
          <div className="sg-row">
            <div className="shadow-box" style={{ boxShadow: 'var(--shadow-1)' }}>--shadow-1</div>
            <div className="shadow-box" style={{ boxShadow: 'var(--shadow-2)' }}>--shadow-2</div>
            <div className="shadow-box" style={{ boxShadow: 'var(--shadow-3)' }}>--shadow-3</div>
            <div className="shadow-box" style={{ boxShadow: 'var(--shadow-4)' }}>--shadow-4</div>
          </div>
        </section>

        {/* BOUTONS */}
        <section className="sg-sec">
          <h2>Boutons</h2>
          <p className="demo-label">Variantes</p>
          <div className="sg-row" style={{ alignItems: 'center' }}>
            <button className="btn">Primaire</button>
            <button className="btn ochre">Ochre</button>
            <button className="btn success"><svg className="ico" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.2}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>Convertir</button>
            <button className="btn ghost">Ghost</button>
            <button className="btn subtle">Subtle</button>
          </div>
          <p className="demo-label" style={{ marginTop: 24 }}>Tailles</p>
          <div className="sg-row" style={{ alignItems: 'center' }}>
            <button className="btn sm">Small</button>
            <button className="btn">Medium</button>
            <button className="btn lg"><svg className="ico" viewBox="0 0 24 24" {...svgProps} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></svg>Large</button>
          </div>
        </section>

        {/* PILLS */}
        <section className="sg-sec">
          <h2>Badges de statut</h2>
          <div className="sg-row" style={{ alignItems: 'center' }}>
            <span className="pill ochre"><span className="pd" style={{ background: 'var(--ochre)' }} />Prospect</span>
            <span className="pill info"><span className="pd" style={{ background: 'var(--komun)' }} />Qualifié</span>
            <span className="pill warning"><span className="pd" style={{ background: 'var(--warning)' }} />En cours</span>
            <span className="pill success"><span className="pd" style={{ background: 'var(--success)' }} />Gagné</span>
            <span className="pill danger"><span className="pd" style={{ background: 'var(--danger)' }} />Urgent</span>
            <span className="pill neutral">Clos</span>
            <span className="pill dark">Confidentiel</span>
          </div>
        </section>

        {/* AVATARS */}
        <section className="sg-sec">
          <h2>Avatars</h2>
          <div className="sg-row" style={{ alignItems: 'center' }}>
            <div className="avatar grad" style={{ width: 44, height: 44, fontSize: 16 }}>AN</div>
            <div className="avatar ochre" style={{ width: 44, height: 44, fontSize: 16 }}>TB</div>
            <div className="avatar blue" style={{ width: 44, height: 44, fontSize: 16 }}>ML</div>
            <div className="avatar green" style={{ width: 44, height: 44, fontSize: 16 }}>FD</div>
            <div className="avatar ink" style={{ width: 44, height: 44, fontSize: 16 }}>SM</div>
          </div>
        </section>

        {/* CARTES & STATS */}
        <section className="sg-sec">
          <h2>Cartes &amp; stats</h2>
          <div className="card-grid">
            <div className="stat">
              <div className="st-top">
                <span className="st-ic blue"><svg className="ico" viewBox="0 0 24 24" {...svgProps}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg></span>
                <span className="st-trend up"><svg width="13" height="13" viewBox="0 0 24 24" {...svgProps} style={{ transform: 'rotate(-45deg)' }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>12 %</span>
              </div>
              <div className="st-val">48</div>
              <div className="st-label">Leads actifs</div>
              <svg className="st-spark" viewBox="0 0 120 34" preserveAspectRatio="none" fill="none"><path d="M 0 28 L 20 22 L 40 24 L 60 14 L 80 16 L 100 6 L 120 3" stroke="var(--komun)" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <div className="card">
              <div className="card-head"><span className="ch-ic"><svg className="ico" viewBox="0 0 24 24" {...svgProps}><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg></span><h3>Carte standard</h3></div>
              <p style={{ color: 'var(--ink-2)', fontSize: 14, margin: 0, lineHeight: 1.55 }}>Bord + ombre douce + radius 12. La brique de base de toute page.</p>
            </div>
            <div className="kcard">
              <div className="kc-top"><div className="kc-name">Marie Laurent</div></div>
              <div className="kc-desc">Appartement Haussmann — pack confort complet.</div>
              <div className="kc-foot"><span className="kc-val">12 300 €</span><span className="pill neutral">Pub</span></div>
            </div>
          </div>
        </section>

        {/* TABLE */}
        <section className="sg-sec">
          <h2>Table</h2>
          <div className="tbl-wrap">
            <div className="tbl-toolbar">
              <div className="seg"><button className="on">Tous</button><button>Actifs</button><button>Prospects</button></div>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-3)' }}>3 résultats</span>
            </div>
            <table className="tbl">
              <thead><tr><th>Client</th><th>Ville</th><th>CA total</th><th>Statut</th></tr></thead>
              <tbody>
                <tr>
                  <td><div className="row-flex"><div className="avatar ochre" style={{ width: 34, height: 34, fontSize: 13 }}>TB</div><div><div className="t-main">Thomas Berger</div><div className="t-sub">t.berger@gmail.com</div></div></div></td>
                  <td>Neuilly</td>
                  <td className="t-main" style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5 }}>24 800 €</td>
                  <td><span className="pill success"><span className="pd" style={{ background: 'var(--success)' }} />Actif</span></td>
                </tr>
                <tr>
                  <td><div className="row-flex"><div className="avatar blue" style={{ width: 34, height: 34, fontSize: 13 }}>ML</div><div><div className="t-main">Marie Laurent</div><div className="t-sub">marie.l@orange.fr</div></div></div></td>
                  <td>Paris 7e</td>
                  <td className="t-main" style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5 }}>12 300 €</td>
                  <td><span className="pill ochre"><span className="pd" style={{ background: 'var(--ochre)' }} />Prospect</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* COMPOSANTS SIGNATURE */}
        <section className="sg-sec">
          <h2>Composants signature</h2>
          <div className="grid-2">
            <div className="xp-card">
              <div className="xp-top">
                <div className="avatar ochre" style={{ width: 46, height: 46, fontSize: 17 }}>AN</div>
                <div><div className="xp-lvl">Niveau 7 · Closer</div><div className="xp-name">2 740 XP</div></div>
              </div>
              <div className="xp-bar"><i style={{ width: '68%' }} /></div>
              <div className="xp-meta"><span>2 740 / 4 000 XP</span><span>Niveau 8 dans 1 260 XP</span></div>
            </div>
            <div className="card">
              <div className="demo-label">Stepper / parcours</div>
              <div className="stepper" style={{ gridAutoColumns: '1fr' }}>
                <div className="step-node done"><div className="step-dot"><svg width="20" height="20" viewBox="0 0 24 24" {...svgProps}><path d="M20 6 9 17l-5-5" /></svg></div><div className="step-t">Devis</div><div className="step-d">24 mai</div></div>
                <div className="step-node current"><div className="step-dot"><svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" /><path d="m7 16.5-4.74-2.85" /><path d="m7 16.5 5-3" /><path d="M7 16.5v5.17" /><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" /></svg></div><div className="step-t">Installation</div><div className="step-d">en cours</div></div>
                <div className="step-node upcoming"><div className="step-dot"><svg width="18" height="18" viewBox="0 0 24 24" {...svgProps}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg></div><div className="step-t">Suivi</div><div className="step-d">à venir</div></div>
              </div>
            </div>
          </div>
        </section>

        <footer className="sg-foot">
          Doc complète &amp; recettes de pages → <code>DESIGN_SYSTEM.md</code> · DA obligatoire pour toute nouvelle page.
        </footer>
      </div>
    </div>
  );
}

export default DesignSystemPage;

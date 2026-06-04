/* Neo — Parcours guidé (back-office). Vanilla JS, zéro dépendance.
 * Pilote le cycle de vie complet d'un projet en réutilisant les endpoints /api
 * déjà testés (projets, pièces, devis, signature, factures, cloud-instances).
 * Le commercial est guidé étape par étape ; un "mode client" plein écran permet
 * au client de suivre et de signer. */
(function () {
  'use strict';

  var CFG = window.__PARCOURS__ || {};
  var LS_KEY = 'neo.parcours.v1';

  // ----- State -------------------------------------------------------------
  var S = loadState();
  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return blank();
  }
  function blank() {
    return {
      step: 0,
      client: null, // {id, firstName, lastName, ...}
      project: null, // {id, name, ...}
      rooms: [], // [{id, name, type, needs:[{id,category,label}]}]
      currentRoomId: null,
      quote: null, // {id, number, totalHT, totalTVA, totalTTC, lines:[]}
      signature: null, // {id, mode, status, signingUrl}
      invoice: null, // {id, number}
      instance: null, // {id, status, domain}
    };
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
  }
  function reset() { S = blank(); save(); render(); }

  // ----- API ---------------------------------------------------------------
  function api(method, path, body) {
    return fetch(CFG.apiBase + path, {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + CFG.token,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().catch(function () { return null; }).then(function (data) {
        if (!r.ok) {
          var msg = (data && data.error && (data.error.message || data.error)) || ('Erreur ' + r.status);
          var err = new Error(typeof msg === 'string' ? msg : 'Erreur');
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  // ----- Helpers -----------------------------------------------------------
  function fmtEUR(n) {
    var v = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(isFinite(v) ? v : 0);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var toastTimer;
  function toast(msg, isErr) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast' + (isErr ? ' err' : ''); }, 3200);
  }
  function busy(btn, on) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.innerHTML = '<span class="spin-sm"></span>'; btn.disabled = true; }
    else { if (btn.dataset.label) btn.innerHTML = btn.dataset.label; btn.disabled = false; }
  }

  var NEEDS = [
    { cat: 'Éclairage', icon: 'bi-lightbulb', items: ['Plafonnier connecté', 'Variateur', 'Détecteur de présence', 'Ruban LED'] },
    { cat: 'Ouvrants', icon: 'bi-door-open', items: ['Volet roulant', 'Store', 'Portail', 'Porte de garage'] },
    { cat: 'Chauffage / Clim', icon: 'bi-thermometer-half', items: ['Thermostat', 'Tête thermostatique', 'Climatisation'] },
    { cat: 'Sécurité', icon: 'bi-shield-lock', items: ['Caméra', 'Détecteur de fumée', "Détecteur d'ouverture", 'Serrure connectée', 'Sirène'] },
    { cat: 'Énergie', icon: 'bi-plug', items: ['Prise connectée', 'Suivi de consommation', 'Recharge VE'] },
    { cat: 'Confort', icon: 'bi-speaker', items: ['Enceinte', 'TV', 'Arrosage', 'Assistant vocal'] },
  ];
  var ROOM_PRESETS = [
    { type: 'salon', name: 'Salon', icon: 'bi-tv' },
    { type: 'cuisine', name: 'Cuisine', icon: 'bi-egg-fried' },
    { type: 'chambre', name: 'Chambre', icon: 'bi-moon-stars' },
    { type: 'salle_de_bain', name: 'Salle de bain', icon: 'bi-droplet' },
    { type: 'bureau', name: 'Bureau', icon: 'bi-laptop' },
    { type: 'garage', name: 'Garage', icon: 'bi-car-front' },
    { type: 'exterieur', name: 'Extérieur', icon: 'bi-tree' },
    { type: 'autre', name: 'Autre', icon: 'bi-house' },
  ];

  // ----- Steps -------------------------------------------------------------
  var STEPS = [
    { id: 'client', label: 'Client', icon: 'bi-person', render: stepClient },
    { id: 'project', label: 'Projet', icon: 'bi-folder', render: stepProject },
    { id: 'audit', label: 'Audit', icon: 'bi-list-check', render: stepAudit },
    { id: 'quote', label: 'Devis', icon: 'bi-file-earmark-text', render: stepQuote },
    { id: 'sign', label: 'Signature', icon: 'bi-pen', render: stepSign },
    { id: 'invoice', label: 'Acompte', icon: 'bi-receipt', render: stepInvoice },
    { id: 'cloud', label: 'Mise en service', icon: 'bi-hdd-network', render: stepCloud },
    { id: 'done', label: 'Terminé', icon: 'bi-check2-circle', render: stepDone },
  ];

  function goTo(i) { S.step = Math.max(0, Math.min(STEPS.length - 1, i)); save(); render(); }
  function next() { goTo(S.step + 1); }
  function back() { goTo(S.step - 1); }

  // ----- Render shell ------------------------------------------------------
  function render() {
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="shell">' +
        '<div class="client-banner"><i class="bi bi-stars"></i> Votre projet domotique, étape par étape</div>' +
        '<button class="exit-client" data-act="exit-client"><i class="bi bi-x-lg"></i></button>' +
        '<div class="topbar">' +
          '<div class="brand"><span class="dot"><i class="bi bi-house-gear"></i></span> Neo · Parcours</div>' +
          '<div class="who">' +
            '<span class="commercial-only">' + esc(CFG.userName || '') + '</span>' +
            '<button class="btn-ghost commercial-only" data-act="client-mode"><i class="bi bi-easel"></i> Mode client</button>' +
            '<a class="btn-ghost commercial-only" href="/backoffice/projects"><i class="bi bi-box-arrow-left"></i> Quitter</a>' +
          '</div>' +
        '</div>' +
        renderStepper() +
        '<div class="stage"><div class="panel" id="panel"></div></div>' +
      '</div>';
    document.getElementById('panel').innerHTML = STEPS[S.step].render();
    var s = STEPS[S.step];
    if (s.mounted) s.mounted();
  }

  function renderStepper() {
    var h = '<div class="stepper">';
    for (var i = 0; i < STEPS.length; i++) {
      var cls = i < S.step ? 'done' : (i === S.step ? 'active' : '');
      h += '<div class="step ' + cls + '" data-act="goto" data-i="' + i + '">' +
        '<span class="num">' + (i < S.step ? '<i class="bi bi-check2"></i>' : (i + 1)) + '</span>' +
        '<span>' + esc(STEPS[i].label) + '</span></div>';
      if (i < STEPS.length - 1) h += '<span class="bar"></span>';
    }
    return h + '</div>';
  }

  function nav(opts) {
    opts = opts || {};
    var canBack = S.step > 0 && !opts.hideBack;
    return '<div class="footnav">' +
      (canBack ? '<button class="btn btn-soft commercial-only" data-act="back"><i class="bi bi-arrow-left"></i> Retour</button>' : '') +
      '<span class="spacer"></span>' +
      (opts.next ? '<button class="btn btn-primary btn-lg" data-act="' + (opts.nextAct || 'next') + '"' + (opts.nextDisabled ? ' disabled' : '') + '>' + opts.next + ' <i class="bi bi-arrow-right"></i></button>' : '') +
      '</div>';
  }

  // ===== STEP 1 — CLIENT ===================================================
  function stepClient() {
    var sel = S.client;
    return '<h1 class="h-lead">À qui est destiné ce projet ?</h1>' +
      '<p class="h-sub">Recherchez un client existant ou créez-en un nouveau.</p>' +
      '<div class="card">' +
        '<label class="fld"><span>Rechercher un client</span>' +
          '<input class="inp" id="cli-search" placeholder="Nom, prénom, email…" autocomplete="off" value=""></label>' +
        '<div id="cli-results" style="margin-top:12px"></div>' +
      '</div>' +
      '<div class="card">' +
        '<div style="font-weight:700;margin-bottom:12px"><i class="bi bi-person-plus"></i> Nouveau client</div>' +
        '<div class="grid cols-2">' +
          fld('cf-first', 'Prénom', '') + fld('cf-last', 'Nom', '') +
          fld('cf-email', 'Email', '', 'email') + fld('cf-phone', 'Téléphone', '') +
        '</div>' +
        '<div class="grid cols-2" style="margin-top:14px">' +
          fld('cf-address', 'Adresse', '') + fld('cf-city', 'Ville', '') +
        '</div>' +
        '<div style="margin-top:14px"><button class="btn btn-soft" data-act="create-client"><i class="bi bi-plus-lg"></i> Créer le client</button></div>' +
      '</div>' +
      (sel ? '<div class="card"><div class="list-row"><span class="ic" style="width:40px;height:40px;border-radius:10px;background:var(--grad);display:grid;place-items:center;color:#06121f"><i class="bi bi-check2"></i></span>' +
        '<div><div style="font-weight:700">' + esc(sel.firstName + ' ' + sel.lastName) + '</div><div class="muted" style="font-size:.85rem">' + esc(sel.email || sel.phone || 'Client sélectionné') + '</div></div></div></div>' : '') +
      nav({ next: 'Continuer', nextDisabled: !sel });
  }
  stepClient.mounted = function () {
    var inp = document.getElementById('cli-search');
    if (!inp) return;
    var t;
    inp.addEventListener('input', function () {
      clearTimeout(t);
      var q = inp.value.trim();
      t = setTimeout(function () { searchClients(q); }, 280);
    });
  };
  function searchClients(q) {
    var box = document.getElementById('cli-results');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = '<div class="muted" style="font-size:.85rem">Tapez au moins 2 caractères…</div>'; return; }
    box.innerHTML = '<div class="muted"><span class="spin-sm"></span></div>';
    api('GET', '/projets/clients?search=' + encodeURIComponent(q) + '&limit=6').then(function (res) {
      var list = (res && res.data) || [];
      if (!list.length) { box.innerHTML = '<div class="muted" style="font-size:.85rem">Aucun client trouvé.</div>'; return; }
      box.innerHTML = list.map(function (c) {
        return '<div class="list-row" data-act="pick-client" data-id="' + c.id + '" style="cursor:pointer">' +
          '<i class="bi bi-person-circle" style="font-size:1.4rem"></i>' +
          '<div style="flex:1"><div style="font-weight:600">' + esc(c.firstName + ' ' + c.lastName) + '</div>' +
          '<div class="muted" style="font-size:.82rem">' + esc(c.email || c.phone || '') + '</div></div>' +
          '<i class="bi bi-arrow-right-circle"></i></div>';
      }).join('');
      window.__cliCache = list;
    }).catch(function (e) { box.innerHTML = '<div class="muted" style="color:var(--bad)">' + esc(e.message) + '</div>'; });
  }

  // ===== STEP 2 — PROJECT ==================================================
  function stepProject() {
    var p = S.project || {};
    return '<h1 class="h-lead">Le projet</h1>' +
      '<p class="h-sub">Quelques infos pour démarrer l\'audit chez ' + esc(S.client ? S.client.firstName : 'le client') + '.</p>' +
      '<div class="card">' +
        fld('pf-name', 'Nom du projet', p.name || ('Domotique ' + (S.client ? S.client.lastName : ''))) +
        '<div class="grid cols-2" style="margin-top:14px">' +
          fld('pf-address', 'Adresse', p.address || (S.client && S.client.address) || '') +
          fld('pf-city', 'Ville', p.city || (S.client && S.client.city) || '') +
        '</div>' +
        '<div class="grid cols-2" style="margin-top:14px">' +
          fld('pf-postal', 'Code postal', p.postalCode || (S.client && S.client.postalCode) || '') +
          fld('pf-surface', 'Surface (m²)', p.surface || '', 'number') +
        '</div>' +
      '</div>' +
      nav({ next: S.project ? 'Continuer' : 'Créer le projet', nextAct: 'save-project' });
  }

  // ===== STEP 3 — AUDIT ====================================================
  function stepAudit() {
    var cur = S.rooms.filter(function (r) { return r.id === S.currentRoomId; })[0];
    var roomsHtml = S.rooms.length ? S.rooms.map(function (r) {
      var on = r.id === S.currentRoomId;
      return '<div class="tile ' + (on ? 'on' : '') + '" data-act="pick-room" data-id="' + r.id + '">' +
        '<span class="ic"><i class="bi ' + roomIcon(r.type) + '"></i></span>' +
        '<div style="flex:1"><div class="t">' + esc(r.name) + '</div>' +
        '<div class="s">' + (r.needs ? r.needs.length : 0) + ' besoin(s)</div></div>' +
        '<button class="btn-ghost" data-act="del-room" data-id="' + r.id + '"><i class="bi bi-trash"></i></button></div>';
    }).join('') : '<div class="muted">Ajoutez les pièces à équiper.</div>';

    var addRoom = '<div class="chips" style="margin-top:14px">' +
      ROOM_PRESETS.map(function (rp) {
        return '<span class="chip" data-act="add-room" data-type="' + rp.type + '" data-name="' + esc(rp.name) + '"><i class="bi ' + rp.icon + '"></i> ' + esc(rp.name) + '</span>';
      }).join('') + '</div>';

    var needsPanel = '';
    if (cur) {
      needsPanel = '<div class="card"><div style="font-weight:700;margin-bottom:4px"><i class="bi ' + roomIcon(cur.type) + '"></i> Besoins — ' + esc(cur.name) + '</div>' +
        '<p class="h-sub" style="margin:0 0 14px">Touchez les équipements souhaités.</p>';
      NEEDS.forEach(function (g) {
        needsPanel += '<div style="margin-bottom:12px"><div class="muted" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.4px;margin-bottom:7px"><i class="bi ' + g.icon + '"></i> ' + esc(g.cat) + '</div><div class="chips">';
        g.items.forEach(function (label) {
          var on = (cur.needs || []).some(function (n) { return n.label === label && n.category === g.cat; });
          needsPanel += '<span class="chip ' + (on ? 'on' : '') + '" data-act="toggle-need" data-cat="' + esc(g.cat) + '" data-label="' + esc(label) + '">' + (on ? '<i class="bi bi-check2"></i> ' : '') + esc(label) + '</span>';
        });
        needsPanel += '</div></div>';
      });
      needsPanel += '</div>';
    }

    var totalNeeds = S.rooms.reduce(function (a, r) { return a + (r.needs ? r.needs.length : 0); }, 0);
    return '<h1 class="h-lead">Audit des besoins</h1>' +
      '<p class="h-sub">' + S.rooms.length + ' pièce(s) · ' + totalNeeds + ' besoin(s) identifié(s).</p>' +
      '<div class="card"><div style="font-weight:700;margin-bottom:8px">Pièces du logement</div>' +
        '<div class="grid">' + roomsHtml + '</div>' + addRoom + '</div>' +
      needsPanel +
      nav({ next: 'Générer le devis', nextDisabled: totalNeeds === 0 });
  }

  // ===== STEP 4 — QUOTE ====================================================
  function stepQuote() {
    if (!S.quote) {
      return '<h1 class="h-lead">Le devis</h1>' +
        '<p class="h-sub">Nous proposons automatiquement les produits adaptés à l\'audit.</p>' +
        '<div class="card" style="text-align:center;padding:40px">' +
          '<div style="font-size:3rem"><i class="bi bi-magic"></i></div>' +
          '<p class="muted">Génération du devis à partir de ' + S.rooms.reduce(function (a, r) { return a + (r.needs ? r.needs.length : 0); }, 0) + ' besoins.</p>' +
          '<button class="btn btn-primary btn-lg" data-act="gen-quote"><i class="bi bi-stars"></i> Générer le devis</button>' +
        '</div>' + nav({});
    }
    var q = S.quote;
    var lines = (q.lines || []).map(function (l) {
      return '<div class="list-row"><div style="flex:1"><div style="font-weight:600">' + esc(l.description) + '</div>' +
        '<div class="muted" style="font-size:.82rem">' + (l.quantity || 1) + ' × ' + fmtEUR(l.unitPriceHT) + ' HT</div></div>' +
        '<div class="right" style="font-weight:700">' + fmtEUR(l.totalHT) + '</div></div>';
    }).join('') || '<div class="muted">Aucune ligne — ajustez l\'audit ou complétez le devis dans le back-office.</div>';
    return '<h1 class="h-lead">Devis ' + esc(q.number || '') + '</h1>' +
      '<p class="h-sub commercial-only">Vérifiez les lignes avec le client puis passez à la signature.</p>' +
      '<div class="card">' + lines + '</div>' +
      '<div class="card"><div class="grid cols-2">' +
        '<div class="kpi"><span class="l">Total HT</span><span class="v">' + fmtEUR(q.totalHT) + '</span></div>' +
        '<div class="kpi"><span class="l">Total TTC</span><span class="v" style="background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">' + fmtEUR(q.totalTTC) + '</span></div>' +
      '</div>' +
      '<div class="footnav commercial-only"><a class="btn-ghost" href="/api/devis/' + q.id + '/pdf" target="_blank"><i class="bi bi-file-pdf"></i> Aperçu PDF</a>' +
      '<span class="spacer"></span><button class="btn-ghost" data-act="regen-quote"><i class="bi bi-arrow-clockwise"></i> Régénérer</button></div>' +
      '</div>' +
      nav({ next: 'Passer à la signature' });
  }

  // ===== STEP 5 — SIGNATURE ================================================
  function stepSign() {
    var sig = S.signature;
    if (sig && sig.status === 'signed') {
      return signedRecap();
    }
    if (sig && sig.mode === 'direct' && sig.signingUrl) {
      return '<h1 class="h-lead">Signature du devis</h1>' +
        '<p class="h-sub">Le client signe ci-dessous. La validation est automatique.</p>' +
        '<div class="card"><iframe class="sig-frame" src="' + esc(sig.signingUrl) + '"></iframe></div>' +
        '<div class="footnav"><button class="btn btn-soft commercial-only" data-act="cancel-sign"><i class="bi bi-x-lg"></i> Annuler</button>' +
        '<span class="spacer"></span><span class="muted"><span class="spin-sm"></span> En attente de signature…</span></div>';
    }
    if (sig && sig.mode === 'remote') {
      return '<h1 class="h-lead">Devis envoyé</h1>' +
        '<p class="h-sub">Un email de signature a été envoyé à ' + esc(sig.sentTo || S.client.email || 'le client') + '.</p>' +
        '<div class="card" style="text-align:center;padding:36px"><div style="font-size:3rem"><i class="bi bi-envelope-check"></i></div>' +
        '<p class="muted"><span class="spin-sm"></span> En attente de la signature du client…</p>' +
        '<button class="btn-ghost" data-act="cancel-sign">Annuler l\'envoi</button></div>' +
        nav({ hideBack: true });
    }
    return '<h1 class="h-lead">Faire signer le devis</h1>' +
      '<p class="h-sub">Sur place, ou à distance par email.</p>' +
      '<div class="grid cols-2">' +
        '<div class="tile" data-act="sign-direct"><span class="ic"><i class="bi bi-pencil-square"></i></span>' +
          '<div><div class="t">Signer ici</div><div class="s">Sur cet écran, passe en mode client</div></div></div>' +
        '<div class="tile" data-act="sign-remote"><span class="ic"><i class="bi bi-send"></i></span>' +
          '<div><div class="t">Envoyer par email</div><div class="s">' + esc(S.client && S.client.email ? S.client.email : 'le client') + '</div></div></div>' +
      '</div>' + nav({});
  }
  function signedRecap() {
    return '<div class="card" style="text-align:center;padding:40px">' +
      '<div class="confetti">🎉</div>' +
      '<h1 class="h-lead" style="margin-top:8px">Devis signé !</h1>' +
      '<p class="h-sub">Merci ' + esc(S.client ? S.client.firstName : '') + '. Le devis est accepté.</p>' +
      '</div>' + nav({ next: 'Continuer' });
  }
  stepSign.mounted = function () {
    var sig = S.signature;
    if (sig && (sig.status === 'pending') && (sig.mode === 'direct' || sig.mode === 'remote')) startSignPoll();
  };
  var pollTimer;
  function startSignPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      if (!S.quote || !S.signature) return stopPoll();
      api('GET', '/devis/' + S.quote.id + '/signature/refresh').then(function (r) {
        if (r && r.status === 'signed') {
          stopPoll();
          S.signature.status = 'signed';
          save();
          exitClientMode();
          render();
        }
      }).catch(function () {});
    }, 3000);
  }
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  // ===== STEP 6 — INVOICE (acompte) ========================================
  function stepInvoice() {
    if (S.invoice) {
      return '<h1 class="h-lead">Acompte facturé</h1>' +
        '<p class="h-sub">Facture ' + esc(S.invoice.number || '') + ' créée.</p>' +
        '<div class="card"><div class="list-row"><i class="bi bi-receipt" style="font-size:1.6rem"></i>' +
        '<div style="flex:1"><div style="font-weight:700">' + esc(S.invoice.number || 'Facture') + '</div>' +
        '<div class="muted" style="font-size:.85rem">' + fmtEUR(S.invoice.totalTTC) + ' TTC</div></div>' +
        '<a class="btn-ghost commercial-only" href="/api/factures/' + S.invoice.id + '/pdf" target="_blank"><i class="bi bi-file-pdf"></i> PDF</a></div></div>' +
        nav({ next: 'Continuer' });
    }
    var ttc = S.quote ? parseFloat(S.quote.totalTTC || 0) : 0;
    return '<h1 class="h-lead">Acompte</h1>' +
      '<p class="h-sub">Générez la facture d\'acompte pour lancer le projet.</p>' +
      '<div class="card"><div class="muted" style="margin-bottom:10px">Montant du devis : <b>' + fmtEUR(ttc) + '</b> TTC</div>' +
        '<div class="chips" id="acompte-pcts">' +
          [30, 40, 50, 100].map(function (p, i) {
            return '<span class="chip ' + (i === 0 ? 'on' : '') + '" data-act="pick-pct" data-pct="' + p + '">' + p + '% · ' + fmtEUR(ttc * p / 100) + '</span>';
          }).join('') +
        '</div>' +
        '<div style="margin-top:18px"><button class="btn btn-primary btn-lg" data-act="create-invoice"><i class="bi bi-receipt"></i> Créer la facture d\'acompte</button></div>' +
      '</div>' +
      '<div class="footnav commercial-only"><span class="spacer"></span><button class="btn-ghost" data-act="skip"><i class="bi bi-skip-forward"></i> Ignorer cette étape</button></div>' +
      nav({});
  }

  // ===== STEP 7 — CLOUD ====================================================
  function stepCloud() {
    if (S.instance) {
      return '<h1 class="h-lead">Box dans le cloud</h1>' +
        '<p class="h-sub">L\'instance Home Assistant du client est provisionnée.</p>' +
        '<div class="card"><div class="list-row"><span class="ic" style="width:42px;height:42px;border-radius:11px;background:var(--grad);display:grid;place-items:center;color:#06121f"><i class="bi bi-hdd-network"></i></span>' +
        '<div style="flex:1"><div style="font-weight:700">' + esc(S.instance.domain || 'Instance HA') + '</div>' +
        '<div class="muted" style="font-size:.85rem">Statut : ' + esc(S.instance.status || 'provisioning') + '</div></div>' +
        '<span class="pill">' + esc(S.instance.status || '…') + '</span></div></div>' +
        nav({ next: 'Finaliser' });
    }
    return '<h1 class="h-lead">Mise en service</h1>' +
      '<p class="h-sub">Créez l\'instance domotique cloud du client.</p>' +
      '<div class="card">' +
        '<div class="grid cols-2">' +
          '<label class="fld"><span>Mémoire</span><select class="inp" id="cl-mem"><option value="512">512 Mo</option><option value="1024">1 Go</option><option value="2048">2 Go</option></select></label>' +
          fld('cl-domain', 'Sous-domaine (optionnel)', '') +
        '</div>' +
        '<div style="margin-top:18px"><button class="btn btn-primary btn-lg" data-act="provision"><i class="bi bi-rocket-takeoff"></i> Provisionner l\'instance</button></div>' +
      '</div>' +
      '<div class="footnav commercial-only"><span class="spacer"></span><button class="btn-ghost" data-act="skip"><i class="bi bi-skip-forward"></i> Ignorer cette étape</button></div>' +
      nav({});
  }

  // ===== STEP 8 — DONE =====================================================
  function stepDone() {
    var ttc = S.quote ? fmtEUR(S.quote.totalTTC) : '—';
    return '<div class="card" style="text-align:center;padding:46px">' +
      '<div class="confetti">✅</div>' +
      '<h1 class="h-lead" style="margin-top:8px">Projet créé de A à Z</h1>' +
      '<p class="h-sub">Tout est enregistré dans le back-office.</p>' +
      '<div class="grid cols-2" style="max-width:560px;margin:18px auto 0">' +
        '<div class="kpi"><span class="l">Pièces</span><span class="v">' + S.rooms.length + '</span></div>' +
        '<div class="kpi"><span class="l">Devis signé</span><span class="v">' + ttc + '</span></div>' +
        '<div class="kpi"><span class="l">Acompte</span><span class="v">' + (S.invoice ? '✓' : '—') + '</span></div>' +
        '<div class="kpi"><span class="l">Box cloud</span><span class="v">' + (S.instance ? '✓' : '—') + '</span></div>' +
      '</div>' +
      '<div class="footnav" style="justify-content:center;margin-top:26px">' +
        (S.project ? '<a class="btn btn-soft commercial-only" href="/backoffice/projects/' + S.project.id + '"><i class="bi bi-folder2-open"></i> Ouvrir le projet</a>' : '') +
        '<button class="btn btn-primary commercial-only" data-act="restart"><i class="bi bi-plus-lg"></i> Nouveau parcours</button>' +
      '</div></div>';
  }

  // ----- small helpers -----------------------------------------------------
  function fld(id, label, val, type) {
    return '<label class="fld"><span>' + esc(label) + '</span><input class="inp" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '"></label>';
  }
  function roomIcon(type) {
    var m = { salon: 'bi-tv', cuisine: 'bi-egg-fried', chambre: 'bi-moon-stars', salle_de_bain: 'bi-droplet', bureau: 'bi-laptop', garage: 'bi-car-front', exterieur: 'bi-tree' };
    return m[type] || 'bi-house';
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  // ----- Client mode -------------------------------------------------------
  function enterClientMode() {
    document.body.classList.add('client-mode');
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
  }
  function exitClientMode() {
    document.body.classList.remove('client-mode');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }

  // ----- Actions -----------------------------------------------------------
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]');
    if (!a) return;
    var act = a.dataset.act;
    var H = ACTIONS[act];
    if (H) { e.preventDefault(); H(a, e); }
  });

  var pendingPct = 30;
  var ACTIONS = {
    goto: function (a) { var i = +a.dataset.i; if (i <= S.step) goTo(i); },
    next: next,
    back: back,
    skip: next,
    'client-mode': function () { enterClientMode(); render(); },
    'exit-client': function () { exitClientMode(); render(); },
    restart: reset,

    'pick-client': function (a) {
      var c = (window.__cliCache || []).filter(function (x) { return x.id === a.dataset.id; })[0];
      if (c) { S.client = c; save(); render(); }
    },
    'create-client': function (a) {
      var body = { firstName: val('cf-first'), lastName: val('cf-last') };
      if (!body.firstName || !body.lastName) return toast('Prénom et nom requis', true);
      if (val('cf-email')) body.email = val('cf-email');
      if (val('cf-phone')) body.phone = val('cf-phone');
      if (val('cf-address')) body.address = val('cf-address');
      if (val('cf-city')) body.city = val('cf-city');
      busy(a, true);
      api('POST', '/projets/clients', body).then(function (c) {
        S.client = c; save(); toast('Client créé'); render();
      }).catch(function (err) { busy(a, false); toast(err.message, true); });
    },

    'save-project': function (a) {
      var name = val('pf-name');
      if (!name) return toast('Nom du projet requis', true);
      var body = { clientId: S.client.id, name: name };
      if (val('pf-address')) body.address = val('pf-address');
      if (val('pf-city')) body.city = val('pf-city');
      if (val('pf-postal')) body.postalCode = val('pf-postal');
      if (val('pf-surface')) body.surface = +val('pf-surface');
      busy(a, true);
      if (S.project) {
        api('PUT', '/projets/' + S.project.id, body).then(function (p) { S.project = p; save(); next(); })
          .catch(function (err) { busy(a, false); toast(err.message, true); });
      } else {
        api('POST', '/projets', body).then(function (p) { S.project = p; save(); next(); })
          .catch(function (err) { busy(a, false); toast(err.message, true); });
      }
    },

    'add-room': function (a) {
      var name = a.dataset.name, type = a.dataset.type;
      var n = S.rooms.filter(function (r) { return r.type === type; }).length;
      if (n > 0) name = name + ' ' + (n + 1);
      api('POST', '/projets/' + S.project.id + '/pieces', { name: name, type: type }).then(function (r) {
        r.needs = []; S.rooms.push(r); S.currentRoomId = r.id; save(); render();
      }).catch(function (err) { toast(err.message, true); });
    },
    'pick-room': function (a) { S.currentRoomId = a.dataset.id; save(); render(); },
    'del-room': function (a) {
      var id = a.dataset.id;
      api('DELETE', '/pieces/' + id).then(function () {
        S.rooms = S.rooms.filter(function (r) { return r.id !== id; });
        if (S.currentRoomId === id) S.currentRoomId = S.rooms.length ? S.rooms[0].id : null;
        save(); render();
      }).catch(function (err) { toast(err.message, true); });
    },
    'toggle-need': function (a) {
      var cur = S.rooms.filter(function (r) { return r.id === S.currentRoomId; })[0];
      if (!cur) return;
      cur.needs = cur.needs || [];
      var cat = a.dataset.cat, label = a.dataset.label;
      var existing = cur.needs.filter(function (n) { return n.label === label && n.category === cat; })[0];
      if (existing) {
        api('DELETE', '/checklist/' + existing.id).then(function () {
          cur.needs = cur.needs.filter(function (n) { return n !== existing; }); save(); render();
        }).catch(function (err) { toast(err.message, true); });
      } else {
        api('POST', '/pieces/' + cur.id + '/checklist', { category: cat, label: label, checked: true }).then(function (item) {
          cur.needs.push({ id: item.id, category: cat, label: label }); save(); render();
        }).catch(function (err) { toast(err.message, true); });
      }
    },

    'gen-quote': function (a) { genQuote(a); },
    'regen-quote': function (a) { S.quote = null; save(); render(); },

    'sign-direct': function (a) {
      busy(a, true);
      api('POST', '/devis/' + S.quote.id + '/signature', { mode: 'direct' }).then(function (r) {
        S.signature = { id: r.id, mode: 'direct', status: 'pending', signingUrl: r.signingUrl };
        save(); enterClientMode(); render();
      }).catch(function (err) { busy(a, false); toast(err.message, true); });
    },
    'sign-remote': function (a) {
      busy(a, true);
      api('POST', '/devis/' + S.quote.id + '/signature', { mode: 'remote' }).then(function (r) {
        S.signature = { id: r.id, mode: 'remote', status: 'pending', sentTo: r.sentTo };
        save(); render();
      }).catch(function (err) { busy(a, false); toast(err.message, true); });
    },
    'cancel-sign': function (a) {
      stopPoll();
      api('DELETE', '/devis/' + S.quote.id + '/signature').catch(function () {});
      S.signature = null; save(); exitClientMode(); render();
    },

    'pick-pct': function (a) {
      pendingPct = +a.dataset.pct;
      document.querySelectorAll('#acompte-pcts .chip').forEach(function (c) { c.classList.toggle('on', c === a); });
    },
    'create-invoice': function (a) { createInvoice(a); },

    'provision': function (a) { provision(a); },
  };

  function genQuote(a) {
    busy(a, true);
    var roomIds = S.rooms.map(function (r) { return r.id; });
    api('POST', '/projets/' + S.project.id + '/devis/from-checklist', { roomIds: roomIds, validityDays: 30 })
      .then(function (res) {
        return api('GET', '/devis/' + res.quoteId);
      }).then(function (q) {
        S.quote = q; save(); toast('Devis généré'); render();
      }).catch(function (err) { busy(a, false); toast(err.message, true); });
  }

  function createInvoice(a) {
    if (S.invoice) return next();
    var ttc = parseFloat(S.quote.totalTTC || 0);
    var unit = Math.round((ttc * pendingPct / 100) / 1.2 * 100) / 100; // HT depuis TTC (TVA 20%)
    busy(a, true);
    api('POST', '/factures', {
      projectId: S.project.id,
      notes: 'Acompte ' + pendingPct + '% — Devis ' + (S.quote.number || ''),
      lines: [{ description: 'Acompte ' + pendingPct + '% sur devis ' + (S.quote.number || ''), quantity: 1, unitPriceHT: unit, tvaRate: 20 }],
    }).then(function (inv) {
      S.invoice = inv; save(); toast('Facture créée'); render();
    }).catch(function (err) {
      busy(a, false);
      if (err.status === 403) toast('Facturation réservée aux comptes admin — étape ignorée', true);
      else toast(err.message, true);
    });
  }

  function provision(a) {
    busy(a, true);
    var body = { clientId: S.client.id, memoryLimitMb: +val('cl-mem') || 512 };
    if (val('cl-domain')) body.domain = val('cl-domain');
    api('POST', '/cloud-instances', body).then(function (inst) {
      S.instance = inst; save(); toast('Instance provisionnée');
      api('POST', '/cloud-instances/' + inst.id + '/start').catch(function () {});
      render();
    }).catch(function (err) {
      busy(a, false);
      if (err.status === 403) toast('Provisioning réservé aux comptes admin — étape ignorable', true);
      else toast(err.message, true);
    });
  }

  // ----- Resume / boot -----------------------------------------------------
  function boot() {
    if (CFG.resumeProjectId && (!S.project || S.project.id !== CFG.resumeProjectId)) {
      // resume an existing project: load project + client + rooms
      reset();
      api('GET', '/projets/' + CFG.resumeProjectId).then(function (p) {
        S.project = p;
        return api('GET', '/projets/clients/' + (p.clientId || (p.client && p.client.id)));
      }).then(function (c) {
        if (c) S.client = c;
        return api('GET', '/projets/' + CFG.resumeProjectId + '/pieces');
      }).then(function (rooms) {
        S.rooms = (rooms || []).map(function (r) { return { id: r.id, name: r.name, type: r.type, needs: (r.checklistItems || []).map(function (i) { return { id: i.id, category: i.category, label: i.label }; }) }; });
        S.step = 2; save(); render();
      }).catch(function () { render(); });
    } else {
      render();
    }
  }

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement) document.body.classList.remove('client-mode');
  });

  boot();
})();

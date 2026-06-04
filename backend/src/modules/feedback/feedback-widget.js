/* Neo Feedback Widget — bouton flottant + modale guidee, auto-contenu.
 * Embarquable sur n'importe quelle page (backoffice, CRM, site vitrine).
 * Capture automatiquement URL/route, navigateur, viewport et logs console
 * pour que l'equipe puisse traiter le retour sans aller-retour. */
(function () {
  'use strict';
  if (window.__neoFeedbackLoaded) return;
  window.__neoFeedbackLoaded = true;

  // document.currentScript est null quand le script est injecte dynamiquement
  // (CRM) ou charge en defer/async : on retombe alors sur la balise <script>
  // qui pointe vers feedback-widget.js pour lire ses data-attributs.
  function resolveConfig(doc) {
    var script = doc.currentScript;
    if (!script || !script.src || script.src.indexOf('feedback-widget.js') === -1) {
      var all = doc.getElementsByTagName('script');
      for (var s = all.length - 1; s >= 0; s--) {
        if (all[s].src && all[s].src.indexOf('feedback-widget.js') !== -1) {
          script = all[s];
          break;
        }
      }
    }
    return {
      app: (script && script.getAttribute('data-app')) || 'site',
      api:
        (script && script.getAttribute('data-api')) ||
        (script && script.src ? new URL(script.src).origin : ''),
      email: (script && script.getAttribute('data-email')) || '',
    };
  }
  var cfg = resolveConfig(document);
  var API = cfg.api.replace(/\/$/, '');

  /* ---- Capture des logs console (ring buffer) ---- */
  var LOGS = [];
  function pushLog(level, args) {
    try {
      var msg = Array.prototype.map
        .call(args, function (a) {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch (e) {
              return String(a);
            }
          }
          return String(a);
        })
        .join(' ');
      LOGS.push({ level: level, message: msg.slice(0, 1000), at: new Date().toISOString() });
      if (LOGS.length > 40) LOGS.shift();
    } catch (e) {
      /* ne jamais casser l'app hote */
    }
  }
  ['log', 'warn', 'error', 'info'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      pushLog(level, arguments);
      if (orig) orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (e) {
    pushLog('error', [e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || '')]);
  });
  window.addEventListener('unhandledrejection', function (e) {
    pushLog('error', ['Unhandled promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)]);
  });

  function buildContext() {
    return {
      url: location.href,
      route: location.pathname + location.search + location.hash,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      screen: { width: screen.width, height: screen.height },
      devicePixelRatio: window.devicePixelRatio || 1,
      capturedAt: new Date().toISOString(),
      logs: LOGS.slice(),
    };
  }

  /* ---- Styles ---- */
  var css =
    '#nf-root{position:fixed;z-index:2147483000;bottom:20px;right:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}' +
    '#nf-fab{width:56px;height:56px;border-radius:50%;background:#1565C0;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(21,101,192,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}' +
    '#nf-fab:hover{transform:scale(1.06)}' +
    '#nf-fab svg{width:26px;height:26px;fill:#fff}' +
    '.nf-overlay{position:fixed;inset:0;background:rgba(15,20,25,.55);z-index:2147483001;display:flex;align-items:flex-end;justify-content:flex-end;padding:20px}' +
    '.nf-modal{background:#fff;color:#1a1d21;width:420px;max-width:calc(100vw - 40px);max-height:calc(100vh - 40px);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}' +
    '.nf-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #eef0f3}' +
    '.nf-head h3{margin:0;font-size:16px;font-weight:700}' +
    '.nf-close{background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#888;padding:4px 8px}' +
    '.nf-tabs{display:flex;border-bottom:1px solid #eef0f3}' +
    '.nf-tab{flex:1;padding:11px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:600;color:#6c757d;border-bottom:2px solid transparent}' +
    '.nf-tab.active{color:#1565C0;border-bottom-color:#1565C0}' +
    '.nf-body{padding:16px 18px;overflow-y:auto}' +
    '.nf-field{margin-bottom:13px}' +
    '.nf-field label{display:block;font-size:12px;font-weight:600;margin-bottom:5px;color:#374151}' +
    '.nf-field input,.nf-field textarea,.nf-field select{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:9px;padding:9px 11px;font-size:13px;font-family:inherit;color:#1a1d21}' +
    '.nf-field textarea{resize:vertical;min-height:62px}' +
    '.nf-field .nf-hint{font-size:11px;color:#9ca3af;margin-top:3px}' +
    '.nf-kinds{display:flex;gap:8px}' +
    '.nf-kind{flex:1;border:1.5px solid #d1d5db;border-radius:10px;padding:10px;text-align:center;cursor:pointer;font-size:13px;font-weight:600;color:#374151;background:#fff}' +
    '.nf-kind.active{border-color:#1565C0;background:#e9f1fb;color:#1565C0}' +
    '.nf-ctx{border:1px solid #eef0f3;border-radius:9px;margin-top:4px;font-size:12px}' +
    '.nf-ctx summary{cursor:pointer;padding:9px 11px;color:#6c757d;font-weight:600}' +
    '.nf-ctx .nf-ctx-in{padding:0 11px 10px;color:#6b7280;word-break:break-all}' +
    '.nf-ctx code{background:#f5f7fa;padding:1px 4px;border-radius:4px}' +
    '.nf-submit{width:100%;background:#1565C0;color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer}' +
    '.nf-submit:disabled{opacity:.6;cursor:progress}' +
    '.nf-msg{padding:10px 12px;border-radius:9px;font-size:13px;margin-bottom:12px}' +
    '.nf-msg.ok{background:#e7f6ec;color:#1d6f3a}' +
    '.nf-msg.err{background:#fbeaea;color:#b42318}' +
    '.nf-list-item{border:1px solid #eef0f3;border-radius:10px;padding:11px 12px;margin-bottom:10px}' +
    '.nf-list-item .nf-it-top{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.nf-list-item h4{margin:0;font-size:13px;font-weight:600}' +
    '.nf-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}' +
    '.nf-st-ouvert{background:#fbeaea;color:#b42318}.nf-st-corrige{background:#e7f1fb;color:#1565C0}.nf-st-valide{background:#e7f6ec;color:#1d6f3a}.nf-st-a_revoir{background:#fef3e2;color:#b06a00}' +
    '.nf-reply{background:#f5f7fa;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px;color:#374151;white-space:pre-wrap}' +
    '.nf-reply .nf-reply-author{font-weight:700;color:#1565C0;display:block;margin-bottom:2px}' +
    '.nf-it-actions{margin-top:9px;display:flex;gap:8px;align-items:center}' +
    '.nf-edit{background:#fff;border:1.5px solid #1565C0;color:#1565C0;border-radius:8px;padding:5px 11px;font-size:12px;font-weight:600;cursor:pointer}' +
    '.nf-edit:hover{background:#e9f1fb}' +
    '.nf-lock{font-size:11px;color:#9ca3af}' +
    '.nf-back{background:none;border:none;color:#1565C0;font-size:12px;font-weight:600;cursor:pointer;padding:0 0 12px;display:block}' +
    '.nf-empty{text-align:center;color:#9ca3af;font-size:13px;padding:24px 0}';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var root = el('div', { id: 'nf-root' });
    var fab = el(
      'button',
      { id: 'nf-fab', 'aria-label': 'Donner mon avis / signaler un probleme', title: 'Feedback' },
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg>'
    );
    root.appendChild(fab);
    document.body.appendChild(root);
    fab.addEventListener('click', openModal);
  }

  var overlay = null;
  function closeModal() {
    if (overlay) {
      syncFromInputs();
      saveDraft();
      overlay.remove();
      overlay = null;
    }
  }

  function statusClass(s) {
    return 'nf-badge nf-st-' + s;
  }

  function openModal() {
    if (overlay) return;
    loadDraftIntoState();
    overlay = el('div', { class: 'nf-overlay' });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    var modal = el('div', { class: 'nf-modal' });
    modal.innerHTML =
      '<div class="nf-head"><h3>Votre retour</h3><button class="nf-close" aria-label="Fermer">&times;</button></div>' +
      '<div class="nf-tabs"><button class="nf-tab active" data-tab="report">Signaler</button><button class="nf-tab" data-tab="mine">Mes retours</button></div>' +
      '<div class="nf-body" id="nf-body"></div>';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    modal.querySelector('.nf-close').addEventListener('click', closeModal);
    var tabs = modal.querySelectorAll('.nf-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        // Sauvegarde le brouillon avant de quitter l'onglet "Signaler".
        syncFromInputs();
        saveDraft();
        tabs.forEach(function (x) {
          x.classList.remove('active');
        });
        t.classList.add('active');
        if (t.getAttribute('data-tab') === 'mine') renderMine();
        else renderReport();
      });
    });
    renderReport();
  }

  /* ---- Brouillon persistant par page ----
   * Conserve ce que l'utilisateur a saisi quand il ferme la modale, change
   * d'onglet ou bascule bug/idee, et le restaure a la reouverture SUR LA MEME
   * PAGE. Vide a l'envoi. Expire apres 24h pour ne pas trainer indefiniment. */
  var DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  function defaultState() {
    return {
      kind: 'bug',
      title: '',
      severity: 'majeur',
      desc: '',
      steps: '',
      exp: '',
      email: '',
    };
  }
  var state = defaultState();

  function draftKey() {
    return 'nf_draft:' + location.pathname;
  }
  // Pur : un brouillon est "vide" si aucun champ texte n'a ete saisi.
  function draftIsEmpty(d) {
    if (!d) return true;
    return !(
      (d.title && d.title.trim()) ||
      (d.desc && d.desc.trim()) ||
      (d.steps && d.steps.trim()) ||
      (d.exp && d.exp.trim())
    );
  }
  // Pur : un brouillon est restaurable s'il a un horodatage recent (< TTL).
  function draftIsFresh(d, now, ttl) {
    return !!(d && typeof d.at === 'number' && now - d.at <= ttl);
  }
  function syncFromInputs() {
    var get = function (id) {
      var e = document.getElementById(id);
      return e ? e.value : undefined;
    };
    var v;
    if ((v = get('nf-title')) !== undefined) state.title = v;
    if ((v = get('nf-sev')) !== undefined) state.severity = v;
    if ((v = get('nf-desc')) !== undefined) state.desc = v;
    if ((v = get('nf-steps')) !== undefined) state.steps = v;
    if ((v = get('nf-exp')) !== undefined) state.exp = v;
    if ((v = get('nf-email')) !== undefined) state.email = v;
  }
  function saveDraft() {
    try {
      var d = {
        kind: state.kind,
        title: state.title,
        severity: state.severity,
        desc: state.desc,
        steps: state.steps,
        exp: state.exp,
        email: state.email,
        at: Date.now(),
      };
      if (draftIsEmpty(d)) localStorage.removeItem(draftKey());
      else localStorage.setItem(draftKey(), JSON.stringify(d));
    } catch (e) {
      /* localStorage indisponible : on ignore, jamais casser l'app hote */
    }
  }
  function clearDraft() {
    try {
      localStorage.removeItem(draftKey());
    } catch (e) {
      /* ignore */
    }
  }
  function loadDraftIntoState() {
    state = defaultState();
    try {
      var raw = localStorage.getItem(draftKey());
      if (!raw) return;
      var d = JSON.parse(raw);
      if (draftIsEmpty(d) || !draftIsFresh(d, Date.now(), DRAFT_TTL_MS)) {
        localStorage.removeItem(draftKey());
        return;
      }
      state.kind = d.kind === 'amelioration' ? 'amelioration' : 'bug';
      state.title = d.title || '';
      state.severity = d.severity || 'majeur';
      state.desc = d.desc || '';
      state.steps = d.steps || '';
      state.exp = d.exp || '';
      state.email = d.email || '';
    } catch (e) {
      /* brouillon illisible : on repart d'un etat propre */
    }
  }

  function renderReport() {
    var body = document.getElementById('nf-body');
    var ctx = buildContext();
    var savedEmail = state.email || cfg.email || localStorage.getItem('nf_email') || '';
    var sevSel = function (v) {
      return state.severity === v ? ' selected' : '';
    };
    body.innerHTML =
      '<div id="nf-msg"></div>' +
      '<div class="nf-field"><label>Type de retour</label><div class="nf-kinds">' +
      '<div class="nf-kind' + (state.kind === 'bug' ? ' active' : '') + '" data-kind="bug">🐞 Un bug</div>' +
      '<div class="nf-kind' + (state.kind === 'amelioration' ? ' active' : '') + '" data-kind="amelioration">💡 Une idee</div>' +
      '</div></div>' +
      '<div class="nf-field"><label>Resume *</label><input id="nf-title" maxlength="300" value="' + escapeAttr(state.title) + '" placeholder="' +
      (state.kind === 'bug' ? 'Ex : Le bouton Enregistrer ne repond pas' : 'Ex : Ajouter un export PDF du devis') +
      '"/></div>' +
      '<div class="nf-field" id="nf-sev-wrap"' + (state.kind === 'amelioration' ? ' style="display:none"' : '') + '><label>Gravite</label><select id="nf-sev">' +
      '<option value="bloquant"' + sevSel('bloquant') + '>Bloquant — je ne peux pas continuer</option>' +
      '<option value="majeur"' + sevSel('majeur') + '>Majeur — ca gene fortement</option>' +
      '<option value="mineur"' + sevSel('mineur') + '>Mineur — desagreable mais contournable</option>' +
      '<option value="cosmetique"' + sevSel('cosmetique') + '>Cosmetique — detail visuel</option>' +
      '</select></div>' +
      '<div class="nf-field"><label>' + (state.kind === 'bug' ? "Que s'est-il passe ? *" : 'Decrivez votre idee *') + '</label><textarea id="nf-desc" placeholder="' +
      (state.kind === 'bug' ? 'Decrivez precisement ce que vous avez vu (message d\'erreur, comportement inattendu...)' : 'Quel besoin cela couvre-t-il ? Comment l\'imaginez-vous ?') +
      '">' + escapeHtml(state.desc) + '</textarea></div>' +
      (state.kind === 'bug'
        ? '<div class="nf-field"><label>Etapes pour reproduire</label><textarea id="nf-steps" placeholder="1. Je vais sur...\n2. Je clique sur...\n3. ...">' + escapeHtml(state.steps) + '</textarea></div>' +
          '<div class="nf-field"><label>Ce que vous attendiez</label><textarea id="nf-exp" placeholder="Le resultat normal aurait du etre...">' + escapeHtml(state.exp) + '</textarea></div>'
        : '') +
      '<div class="nf-field"><label>Votre email (pour le suivi) *</label><input id="nf-email" type="email" value="' + escapeAttr(savedEmail) + '" placeholder="vous@exemple.fr"/><div class="nf-hint">Nous vous repondrons et vous previendrons a la cloture.</div></div>' +
      '<details class="nf-ctx"><summary>🔧 Infos techniques jointes automatiquement</summary><div class="nf-ctx-in">' +
      'Page : <code>' + escapeHtml(ctx.route) + '</code><br/>' +
      'Ecran : ' + ctx.viewport.width + '×' + ctx.viewport.height + '<br/>' +
      'Navigateur : ' + escapeHtml((ctx.userAgent || '').slice(0, 80)) + '<br/>' +
      'Logs captures : ' + ctx.logs.length + ' ligne(s)' +
      '</div></details>' +
      '<button class="nf-submit" id="nf-send">Envoyer mon retour</button>';

    body.querySelectorAll('.nf-kind').forEach(function (k) {
      k.addEventListener('click', function () {
        syncFromInputs();
        state.kind = k.getAttribute('data-kind');
        renderReport();
      });
    });
    // Auto-sauvegarde du brouillon a chaque frappe/selection.
    ['nf-title', 'nf-sev', 'nf-desc', 'nf-steps', 'nf-exp', 'nf-email'].forEach(function (id) {
      var e = document.getElementById(id);
      if (!e) return;
      var persist = function () {
        syncFromInputs();
        saveDraft();
      };
      e.addEventListener('input', persist);
      e.addEventListener('change', persist);
    });
    document.getElementById('nf-send').addEventListener('click', submit);
  }

  function submit() {
    var msg = document.getElementById('nf-msg');
    var title = (document.getElementById('nf-title').value || '').trim();
    var email = (document.getElementById('nf-email').value || '').trim();
    var desc = (document.getElementById('nf-desc').value || '').trim();
    if (title.length < 3) return showMsg(msg, 'err', 'Merci de resumer votre retour en quelques mots.');
    if (!desc) return showMsg(msg, 'err', 'Merci de decrire un peu plus votre retour.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showMsg(msg, 'err', 'Merci d\'indiquer un email valide pour le suivi.');

    localStorage.setItem('nf_email', email);
    var payload = {
      app: cfg.app,
      kind: state.kind,
      title: title,
      severity: state.kind === 'bug' ? document.getElementById('nf-sev').value : 'mineur',
      description: desc,
      reporterEmail: email,
      context: buildContext(),
    };
    var stepsEl = document.getElementById('nf-steps');
    var expEl = document.getElementById('nf-exp');
    if (stepsEl && stepsEl.value.trim()) payload.stepsToReproduce = stepsEl.value.trim();
    if (expEl && expEl.value.trim()) payload.expectedResult = expEl.value.trim();

    var btn = document.getElementById('nf-send');
    btn.disabled = true;
    btn.textContent = 'Envoi...';
    fetch(API + '/feedback-api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function () {
        // Retour envoye : on purge le brouillon pour ne pas le re-proposer.
        clearDraft();
        state = defaultState();
        var body = document.getElementById('nf-body');
        body.innerHTML =
          '<div class="nf-msg ok">✅ Merci ! Votre retour a bien ete enregistre. Vous pouvez suivre son avancement dans « Mes retours ».</div>' +
          '<button class="nf-submit" id="nf-again">Envoyer un autre retour</button>';
        document.getElementById('nf-again').addEventListener('click', renderReport);
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Envoyer mon retour';
        showMsg(msg, 'err', "L'envoi a echoue. Verifiez votre connexion et reessayez.");
      });
  }

  // Cache des retours charges, pour pre-remplir le formulaire de correction
  // sans re-fetch (cle = id du retour).
  var mineCache = {};

  function renderMine() {
    var body = document.getElementById('nf-body');
    var email = cfg.email || localStorage.getItem('nf_email') || '';
    if (!email) {
      body.innerHTML = '<div class="nf-empty">Envoyez d\'abord un retour pour suivre vos demandes ici.</div>';
      return;
    }
    body.innerHTML = '<div class="nf-empty">Chargement...</div>';
    fetch(API + '/feedback-api/mine?email=' + encodeURIComponent(email))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (!items.length) {
          body.innerHTML = '<div class="nf-empty">Aucun retour pour ' + escapeHtml(email) + '.</div>';
          return;
        }
        mineCache = {};
        items.forEach(function (it) {
          mineCache[it.id] = it;
        });
        body.innerHTML =
          '<div id="nf-msg"></div>' +
          items
            .map(function (it) {
              var replies = (it.comments || [])
                .map(function (c) {
                  return '<div class="nf-reply"><span class="nf-reply-author">' + escapeHtml(c.author) + '</span>' + escapeHtml(c.body) + '</div>';
                })
                .join('');
              var actions = it.editable
                ? '<div class="nf-it-actions"><button class="nf-edit" data-id="' + escapeAttr(it.id) + '">✏️ Corriger / completer</button></div>'
                : '<div class="nf-it-actions"><span class="nf-lock">🔒 En traitement — non modifiable</span></div>';
              return (
                '<div class="nf-list-item"><div class="nf-it-top"><h4>' +
                escapeHtml(it.title) +
                '</h4><span class="' + statusClass(it.status) + '">' + escapeHtml(it.statusLabel) + '</span></div>' +
                '<div class="nf-hint" style="margin-top:4px">' + escapeHtml(it.kindLabel) + ' · ' + new Date(it.createdAt).toLocaleDateString('fr-FR') + '</div>' +
                replies +
                actions +
                '</div>'
              );
            })
            .join('');
        body.querySelectorAll('.nf-edit').forEach(function (b) {
          b.addEventListener('click', function () {
            var item = mineCache[b.getAttribute('data-id')];
            if (item) renderEditForm(item);
          });
        });
      })
      .catch(function () {
        body.innerHTML = '<div class="nf-msg err">Impossible de charger vos retours.</div>';
      });
  }

  // Formulaire de correction d'un retour encore "ouvert" (non pris en charge).
  function renderEditForm(it) {
    var body = document.getElementById('nf-body');
    var isBug = it.kind === 'bug';
    var sevSel = function (v) {
      return it.severity === v ? ' selected' : '';
    };
    body.innerHTML =
      '<div id="nf-msg"></div>' +
      '<button class="nf-back" id="nf-edit-back">← Retour à mes retours</button>' +
      '<div class="nf-field"><label>Resume *</label><input id="nf-e-title" maxlength="300" value="' + escapeAttr(it.title) + '"/></div>' +
      (isBug
        ? '<div class="nf-field"><label>Gravite</label><select id="nf-e-sev">' +
          '<option value="bloquant"' + sevSel('bloquant') + '>Bloquant — je ne peux pas continuer</option>' +
          '<option value="majeur"' + sevSel('majeur') + '>Majeur — ca gene fortement</option>' +
          '<option value="mineur"' + sevSel('mineur') + '>Mineur — desagreable mais contournable</option>' +
          '<option value="cosmetique"' + sevSel('cosmetique') + '>Cosmetique — detail visuel</option>' +
          '</select></div>'
        : '') +
      '<div class="nf-field"><label>' + (isBug ? "Que s'est-il passe ? *" : 'Decrivez votre idee *') + '</label><textarea id="nf-e-desc">' + escapeHtml(it.description || '') + '</textarea></div>' +
      (isBug
        ? '<div class="nf-field"><label>Etapes pour reproduire</label><textarea id="nf-e-steps">' + escapeHtml(it.stepsToReproduce || '') + '</textarea></div>' +
          '<div class="nf-field"><label>Ce que vous attendiez</label><textarea id="nf-e-exp">' + escapeHtml(it.expectedResult || '') + '</textarea></div>'
        : '') +
      '<button class="nf-submit" id="nf-e-save">Enregistrer les corrections</button>';
    document.getElementById('nf-edit-back').addEventListener('click', renderMine);
    document.getElementById('nf-e-save').addEventListener('click', function () {
      saveEdit(it);
    });
  }

  function saveEdit(it) {
    var msg = document.getElementById('nf-msg');
    var email = cfg.email || localStorage.getItem('nf_email') || '';
    var title = (document.getElementById('nf-e-title').value || '').trim();
    var desc = (document.getElementById('nf-e-desc').value || '').trim();
    if (title.length < 3) return showMsg(msg, 'err', 'Merci de resumer votre retour en quelques mots.');
    if (!desc) return showMsg(msg, 'err', 'Merci de decrire un peu plus votre retour.');
    var payload = { email: email, title: title, description: desc };
    var sevEl = document.getElementById('nf-e-sev');
    if (sevEl) payload.severity = sevEl.value;
    var stepsEl = document.getElementById('nf-e-steps');
    var expEl = document.getElementById('nf-e-exp');
    if (stepsEl) payload.stepsToReproduce = stepsEl.value.trim();
    if (expEl) payload.expectedResult = expEl.value.trim();

    var btn = document.getElementById('nf-e-save');
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';
    fetch(API + '/feedback-api/' + encodeURIComponent(it.id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (r.status === 409) throw new Error('locked');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function () {
        renderMine();
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'Enregistrer les corrections';
        if (e && e.message === 'locked') {
          showMsg(msg, 'err', "Ce retour vient d'etre pris en charge : il n'est plus modifiable.");
        } else {
          showMsg(msg, 'err', "L'enregistrement a echoue. Verifiez votre connexion et reessayez.");
        }
      });
  }

  function showMsg(node, type, text) {
    node.className = 'nf-msg ' + type;
    node.textContent = text;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

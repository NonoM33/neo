/* Neo Chatbot Widget — bulle de discussion bas-droite, auto-contenue.
 * Engage le visiteur du site vitrine après quelques secondes, dialogue via
 * WebSocket avec l'assistant IA côté backend, et permet à un conseiller
 * de prendre la main depuis le back-office. Objectif : décrocher un RDV. */
(function () {
  'use strict';
  if (window.__neoChatLoaded) return;
  window.__neoChatLoaded = true;

  var AUTO_ENGAGE_MS = 6000;
  var GREETING =
    "Bonjour 👋 Je suis Léa, l'assistante Neo Domotique. Vous avez un projet de maison connectée ? Je peux vous proposer un rendez-vous gratuit avec un expert.";

  /* ---- Config (lit les data-attributs de la balise <script>) ---- */
  function resolveConfig(doc) {
    var script = doc.currentScript;
    if (!script || !script.src || script.src.indexOf('chatbot-widget.js') === -1) {
      var all = doc.getElementsByTagName('script');
      for (var s = all.length - 1; s >= 0; s--) {
        if (all[s].src && all[s].src.indexOf('chatbot-widget.js') !== -1) {
          script = all[s];
          break;
        }
      }
    }
    return {
      api:
        (script && script.getAttribute('data-api')) ||
        (script && script.src ? new URL(script.src).origin : ''),
    };
  }
  var cfg = resolveConfig(document);
  var API = cfg.api.replace(/\/$/, '');
  function wsUrl() {
    var u = new URL(API);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws/chatbot';
    return u.toString();
  }

  /* ---- Identifiant visiteur persistant ---- */
  function visitorId() {
    var id = localStorage.getItem('neo_chat_vid');
    if (!id) {
      id =
        'v_' +
        Date.now().toString(36) +
        '_' +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem('neo_chat_vid', id);
    }
    return id;
  }

  /* ---- État ---- */
  var ws = null;
  var connected = false;
  var sessionId = null;
  var opened = false;
  var mode = 'bot';
  var seenIds = {};
  var lastTypingSent = 0;
  var lastRenderedRole = null; // évite de répéter le libellé émetteur
  var pending = []; // bulles visiteur optimistes en attente d'écho serveur
  var sessionClosed = false; // true quand le serveur a clos la conversation
  var reconnectTimer = null;
  var reconnectDelay = 1000; // backoff exponentiel borné

  /* ---- Styles ---- */
  var css =
    '#ncw{position:fixed;z-index:2147482000;bottom:20px;right:88px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}' +
    '#ncw-fab{width:60px;height:60px;border-radius:50%;background:#0d6efd;color:#fff;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(13,110,253,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s ease}' +
    '#ncw-fab:hover{transform:scale(1.06)}' +
    '#ncw-fab svg{width:30px;height:30px;fill:#fff}' +
    '#ncw-badge{position:absolute;top:-2px;right:-2px;background:#dc3545;color:#fff;border-radius:50%;width:20px;height:20px;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:center}' +
    '#ncw-teaser{position:absolute;bottom:74px;right:0;width:280px;background:#fff;color:#1a1d21;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:14px 16px;font-size:14px;line-height:1.4;cursor:pointer;display:none;animation:ncw-pop .25s ease}' +
    '#ncw-teaser .ncw-tc{position:absolute;top:6px;right:9px;color:#aaa;font-size:16px;line-height:1}' +
    '@keyframes ncw-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '#ncw-panel{position:absolute;bottom:74px;right:0;width:370px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden}' +
    '#ncw-head{background:#0d6efd;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}' +
    '#ncw-head .ncw-av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:18px}' +
    '#ncw-head h3{margin:0;font-size:15px;font-weight:700}' +
    '#ncw-head .ncw-sub{font-size:12px;opacity:.85}' +
    '#ncw-close{margin-left:auto;background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1}' +
    '#ncw-msgs{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:16px;background:#f5f7fa;display:flex;flex-direction:column;gap:10px}' +
    '.ncw-m{max-width:80%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}' +
    '.ncw-m.bot{align-self:flex-start;background:#fff;color:#1a1d21;border:1px solid #e9ecef;border-bottom-left-radius:4px}' +
    '.ncw-m.visitor{align-self:flex-end;background:#0d6efd;color:#fff;border-bottom-right-radius:4px}' +
    '.ncw-m.visitor[data-pending]{opacity:.55}' +
    '.ncw-m.staff{align-self:flex-start;background:#198754;color:#fff;border-bottom-left-radius:4px}' +
    '.ncw-m.system{align-self:center;background:transparent;color:#6c757d;font-size:12px;font-style:italic;padding:2px}' +
    '.ncw-meta{align-self:flex-start;font-size:11px;font-weight:600;color:#198754;margin:2px 4px -4px;display:flex;align-items:center;gap:4px}' +
    '.ncw-typing{align-self:flex-start;padding:6px 10px;background:#fff;border:1px solid #e9ecef;border-radius:14px;border-bottom-left-radius:4px}' +
    '.ncw-dots{display:inline-flex;gap:4px;align-items:center}' +
    '.ncw-dots i{width:7px;height:7px;border-radius:50%;background:#adb5bd;display:inline-block;animation:ncw-bounce 1.2s infinite ease-in-out}' +
    '.ncw-dots i:nth-child(2){animation-delay:.15s}' +
    '.ncw-dots i:nth-child(3){animation-delay:.3s}' +
    '@keyframes ncw-bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}' +
    '#ncw-form{display:flex;gap:8px;padding:12px;border-top:1px solid #e9ecef;background:#fff}' +
    '#ncw-input{flex:1;border:1px solid #d1d5db;border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;resize:none;max-height:90px;outline:none}' +
    '#ncw-input:focus{border-color:#0d6efd}' +
    '#ncw-send{background:#0d6efd;color:#fff;border:none;border-radius:10px;width:42px;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
    '#ncw-send svg{width:20px;height:20px;fill:#fff}';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var root, panel, msgsEl, inputEl, teaser, badge;

  function mount() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    root = el('div', { id: 'ncw' });
    var fab = el(
      'button',
      { id: 'ncw-fab', 'aria-label': 'Ouvrir la discussion', title: 'Discuter avec nous' },
      '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 9h10v2H7V9zm6 5H7v-2h6v2zm4-6H7V6h10v2z"/></svg>' +
        '<span id="ncw-badge">1</span>'
    );
    badge = fab.querySelector('#ncw-badge');

    teaser = el('div', { id: 'ncw-teaser' }, '<span class="ncw-tc">&times;</span>' + escapeHtml(GREETING));

    panel = el('div', { id: 'ncw-panel' });
    panel.innerHTML =
      '<div id="ncw-head"><div class="ncw-av">💬</div><div><h3>Neo Domotique</h3><div class="ncw-sub" id="ncw-sub">Assistant en ligne</div></div><button id="ncw-close" aria-label="Fermer">&times;</button></div>' +
      '<div id="ncw-msgs"></div>' +
      '<form id="ncw-form"><textarea id="ncw-input" rows="1" placeholder="Écrivez votre message..."></textarea>' +
      '<button id="ncw-send" type="submit" aria-label="Envoyer"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></button></form>';

    root.appendChild(teaser);
    root.appendChild(panel);
    root.appendChild(fab);
    document.body.appendChild(root);

    msgsEl = panel.querySelector('#ncw-msgs');
    inputEl = panel.querySelector('#ncw-input');

    fab.addEventListener('click', togglePanel);
    teaser.addEventListener('click', function (e) {
      if (e.target && e.target.className === 'ncw-tc') {
        hideTeaser();
        return;
      }
      openPanel();
    });
    panel.querySelector('#ncw-close').addEventListener('click', closePanel);
    panel.querySelector('#ncw-form').addEventListener('submit', onSubmit);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit(e);
      }
    });
    inputEl.addEventListener('input', sendTyping);

    // Auto-engagement : montre une accroche après quelques secondes.
    setTimeout(function () {
      if (!opened) showTeaser();
    }, AUTO_ENGAGE_MS);
  }

  function showTeaser() {
    if (opened) return;
    teaser.style.display = 'block';
  }
  function hideTeaser() {
    teaser.style.display = 'none';
  }
  function setBadge(n) {
    if (n > 0 && !opened) {
      badge.textContent = n;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  function togglePanel() {
    if (opened) closePanel();
    else openPanel();
  }

  function openPanel() {
    opened = true;
    hideTeaser();
    setBadge(0);
    panel.style.display = 'flex';
    connect();
    if (msgsEl.childElementCount === 0) {
      var greet = addMsg('bot', GREETING);
      if (greet) greet.setAttribute('data-greeting', '1');
    }
    inputEl.focus();
    scrollDown();
  }
  function closePanel() {
    opened = false;
    panel.style.display = 'none';
  }

  function addMsg(role, content) {
    // Quand un conseiller humain prend la main, on le signale au visiteur par un
    // libellé au-dessus de ses messages (sans le répéter pour des messages suivis).
    if (role === 'staff' && lastRenderedRole !== 'staff') {
      var meta = el('div', { class: 'ncw-meta' }, '\u{1F9D1}‍\u{1F4BC} Conseiller');
      msgsEl.appendChild(meta);
    }
    var m = el('div', { class: 'ncw-m ' + role });
    m.textContent = content;
    msgsEl.appendChild(m);
    if (role !== 'system') lastRenderedRole = role;
    scrollDown();
    return m;
  }
  function scrollDown() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  var typingEl = null;
  function showTyping() {
    if (typingEl) return;
    typingEl = el(
      'div',
      { class: 'ncw-typing' },
      '<span class="ncw-dots"><i></i><i></i><i></i></span>'
    );
    msgsEl.appendChild(typingEl);
    scrollDown();
  }
  function hideTyping() {
    if (typingEl) {
      typingEl.remove();
      typingEl = null;
    }
  }

  function setSub(text) {
    var sub = panel.querySelector('#ncw-sub');
    if (sub) sub.textContent = text;
  }

  /* ---- WebSocket ---- */
  function connect() {
    if (connected || (ws && ws.readyState === WebSocket.CONNECTING)) return;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    try {
      ws = new WebSocket(wsUrl());
    } catch (e) {
      scheduleReconnect();
      return;
    }
    ws.onopen = function () {
      connected = true;
      reconnectDelay = 1000; // succès : on réinitialise le backoff
      ws.send(
        JSON.stringify({
          type: 'init',
          visitorId: visitorId(),
          pageUrl: location.href,
          userAgent: navigator.userAgent,
        })
      );
    };
    ws.onmessage = function (evt) {
      var data;
      try {
        data = JSON.parse(evt.data);
      } catch (e) {
        return;
      }
      handleServer(data);
    };
    ws.onclose = function () {
      connected = false;
      ws = null;
      scheduleReconnect();
    };
    ws.onerror = function () {
      try {
        ws.close();
      } catch (e) {}
    };
  }

  // Reconnexion automatique tant que la conversation est ouverte et non close :
  // garantit que les messages en attente partent et que l'historique se resync.
  function scheduleReconnect() {
    if (sessionClosed || !opened) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 15000);
  }

  function handleServer(data) {
    if (data.type === 'session') {
      sessionId = data.sessionId;
      sessionClosed = false;
      mode = data.mode || 'bot';
      if (mode === 'human') setSub('Conseiller en ligne');
      if (data.messages && data.messages.length) {
        // Historique réel : on retire l'accroche locale puis on rend l'historique
        // de façon IDEMPOTENTE. On n'efface JAMAIS le DOM en bloc, pour ne pas
        // détruire les bulles optimistes (messages envoyés mais pas encore
        // confirmés) lors d'une (re)connexion — c'était la cause des messages
        // qui disparaissaient.
        var greet = msgsEl.querySelectorAll('[data-greeting]');
        for (var g = 0; g < greet.length; g++) greet[g].remove();
        data.messages.forEach(function (m) {
          if (seenIds[m.id]) return;
          renderServerMessage(m);
        });
      }
      // Connexion (ré)établie : on (re)pousse les messages jamais partis.
      flushPending();
    } else if (data.type === 'message') {
      var m = data.message;
      if (!m) return;
      hideTyping();
      var added = renderServerMessage(m);
      // Pas de pastille pour l'écho de nos propres messages.
      if (added && !opened && m.role !== 'visitor') setBadge(1);
    } else if (data.type === 'typing') {
      showTyping();
    } else if (data.type === 'mode') {
      mode = data.mode;
      setSub(mode === 'human' ? 'Conseiller en ligne' : 'Assistant en ligne');
    } else if (data.type === 'closed') {
      sessionClosed = true;
      addMsg('system', 'La conversation est terminée. Merci !');
    }
  }

  // Rend un message serveur de façon idempotente. Retourne true si une nouvelle
  // bulle a été ajoutée, false si le message était déjà connu/réconcilié.
  function renderServerMessage(m) {
    if (!m) return false;
    if (m.id != null) {
      if (seenIds[m.id]) return false;
      seenIds[m.id] = true;
    }
    // Un message visiteur revient du serveur : il a déjà été affiché de façon
    // optimiste à l'envoi. On réconcilie la bulle en attente (par contenu)
    // plutôt que d'en créer une seconde — et on confirme la bulle au passage.
    if (m.role === 'visitor') {
      for (var i = 0; i < pending.length; i++) {
        if (pending[i].text === m.content) {
          if (pending[i].el) pending[i].el.removeAttribute('data-pending');
          pending.splice(i, 1);
          return false;
        }
      }
    }
    addMsg(m.role, m.content);
    return true;
  }

  // Prévient le conseiller que le visiteur est en train d'écrire (throttle 1,5 s).
  function sendTyping() {
    var now = Date.now();
    if (now - lastTypingSent < 1500) return;
    lastTypingSent = now;
    if (ws && ws.readyState === WebSocket.OPEN && sessionId) {
      ws.send(JSON.stringify({ type: 'typing' }));
    }
  }

  function onSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var text = (inputEl.value || '').trim();
    if (!text) return;
    inputEl.value = '';
    // Rendu optimiste : la bulle est marquée "en attente" et conservée dans
    // `pending` jusqu'à l'écho serveur (réconciliation par contenu). Elle
    // survit ainsi à un rechargement d'historique / une reconnexion.
    var bubble = addMsg('visitor', text);
    var item = { el: bubble, text: text, sent: false };
    if (bubble) bubble.setAttribute('data-pending', '1');
    pending.push(item);
    connect();
    trySend(item, 20);
  }

  // Émet un message en attente sur la connexion ouverte. `item.sent` garantit
  // qu'un même message n'est jamais envoyé deux fois (pas de doublon possible
  // même si plusieurs tentatives se chevauchent après une reconnexion).
  function trySend(item, attempts) {
    if (item.sent) return;
    if (ws && ws.readyState === WebSocket.OPEN && sessionId) {
      ws.send(JSON.stringify({ type: 'message', content: item.text }));
      item.sent = true;
    } else if (attempts > 0) {
      setTimeout(function () {
        trySend(item, attempts - 1);
      }, 250);
    }
  }

  // À la (re)connexion, renvoie les messages jamais partis (sent === false).
  // Ceux déjà reçus par le serveur reviennent via l'historique et sont
  // réconciliés, donc ne sont pas réémis.
  function flushPending() {
    for (var i = 0; i < pending.length; i++) {
      if (!pending[i].sent) trySend(pending[i], 20);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();

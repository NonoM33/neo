import type { FC } from 'hono/jsx';
import { Layout } from '../../components/layout';
import type { AdminUser } from '../../middleware/admin-auth';

interface ChatbotLivePageProps {
  user: AdminUser;
  chatbotEnabled: boolean;
}

const STYLE = `
  .chat-console { display: flex; gap: 16px; height: calc(100vh - 140px); }
  .chat-list { width: 320px; flex-shrink: 0; background: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,.05); display: flex; flex-direction: column; overflow: hidden; }
  .chat-list-head { padding: 14px 16px; border-bottom: 1px solid #e9ecef; font-weight: 600; display:flex; justify-content:space-between; align-items:center; }
  .chat-list-body { overflow-y: auto; flex: 1; }
  .chat-item { padding: 12px 16px; border-bottom: 1px solid #f1f3f5; cursor: pointer; }
  .chat-item:hover { background: #f8f9fa; }
  .chat-item.active { background: #e7f1ff; border-left: 3px solid #0d6efd; }
  .chat-item .ci-top { display:flex; justify-content:space-between; align-items:center; gap:6px; }
  .chat-item .ci-name { font-weight: 600; font-size: 14px; color:#212529; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chat-item .ci-prev { font-size: 12px; color:#6c757d; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chat-item .ci-time { font-size:11px; color:#adb5bd; white-space:nowrap; }
  .chat-empty { padding: 24px; text-align:center; color:#adb5bd; font-size:14px; }
  .chat-main { flex: 1; background: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,.05); display: flex; flex-direction: column; overflow: hidden; }
  .chat-main-head { padding: 14px 16px; border-bottom: 1px solid #e9ecef; display:flex; align-items:center; gap:10px; }
  .chat-thread { flex:1; overflow-y:auto; padding:16px; background:#f5f7fa; display:flex; flex-direction:column; gap:10px; }
  .cm { max-width:72%; padding:9px 12px; border-radius:14px; font-size:14px; line-height:1.4; white-space:pre-wrap; word-wrap:break-word; }
  .cm.visitor { align-self:flex-start; background:#fff; border:1px solid #e9ecef; }
  .cm.bot { align-self:flex-end; background:#e7f1ff; color:#0a58ca; }
  .cm.staff { align-self:flex-end; background:#198754; color:#fff; }
  .cm.system { align-self:center; background:transparent; color:#6c757d; font-size:12px; font-style:italic; }
  .chat-form { display:flex; gap:8px; padding:12px; border-top:1px solid #e9ecef; }
  .chat-form textarea { flex:1; border:1px solid #d1d5db; border-radius:10px; padding:10px; font-size:14px; resize:none; outline:none; }
  .badge-mode-bot { background:#6c757d; }
  .badge-mode-human { background:#198754; }
  .chat-placeholder { flex:1; display:flex; align-items:center; justify-content:center; color:#adb5bd; }
`;

const SCRIPT = `
(function(){
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  var WS_URL = proto + '//' + location.host + '/ws/chatbot/staff';
  var sessions = {};
  var current = null;
  var ws = null;
  var seen = {}; // ids des messages déjà rendus dans le fil courant (anti-doublon)
  var statusEl = document.getElementById('ws-status');

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function fmtTime(t){try{return new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
  function label(s){ return s.visitorName || s.visitorEmail || s.visitorPhone || ('Visiteur ' + s.id.slice(0,8)); }

  function connect(){
    ws = new WebSocket(WS_URL);
    ws.onopen = function(){ statusEl.textContent='● en ligne'; statusEl.style.color='#198754'; };
    ws.onclose = function(){ statusEl.textContent='● déconnecté'; statusEl.style.color='#dc3545'; setTimeout(connect, 3000); };
    ws.onmessage = function(evt){ var d; try{d=JSON.parse(evt.data);}catch(e){return;} handle(d); };
  }
  function sendAction(obj){ if(ws && ws.readyState===1) ws.send(JSON.stringify(obj)); }

  function handle(d){
    if(d.type==='init'){ sessions={}; d.sessions.forEach(function(s){sessions[s.id]=s;}); renderList(); }
    else if(d.type==='session_upsert'){ sessions[d.session.id]=d.session; renderList(); if(current===d.session.id) renderHead(); }
    else if(d.type==='session_closed'){ delete sessions[d.session]; if(current===d.sessionId) current=null; renderList(); renderMain(); }
    else if(d.type==='history'){ if(d.sessionId===current){ renderThread(d.messages); } }
    else if(d.type==='message'){
      var s = sessions[d.sessionId];
      if(s){ s.lastMessage = d.message.content; s.lastMessageAt = d.message.createdAt; if(d.sessionId!==current && d.message.role==='visitor'){ s.unreadForStaff=(s.unreadForStaff||0)+1; } renderList(); }
      if(d.sessionId===current){ appendMsg(d.message); }
    }
  }

  function renderList(){
    var body = document.getElementById('chat-list-body');
    var arr = Object.keys(sessions).map(function(k){return sessions[k];});
    arr.sort(function(a,b){return new Date(b.lastMessageAt)-new Date(a.lastMessageAt);});
    if(!arr.length){ body.innerHTML='<div class="chat-empty">Aucune conversation active.</div>'; return; }
    body.innerHTML = arr.map(function(s){
      var unread = s.unreadForStaff>0 ? '<span class="badge bg-danger rounded-pill">'+s.unreadForStaff+'</span>' : '';
      var modeBadge = '<span class="badge '+(s.mode==='human'?'badge-mode-human':'badge-mode-bot')+'">'+(s.mode==='human'?'Agent':'Bot')+'</span>';
      return '<div class="chat-item '+(s.id===current?'active':'')+'" data-id="'+s.id+'">'+
        '<div class="ci-top"><span class="ci-name">'+esc(label(s))+'</span><span class="ci-time">'+fmtTime(s.lastMessageAt)+'</span></div>'+
        '<div class="ci-prev">'+esc(s.lastMessage||'…')+'</div>'+
        '<div class="ci-top" style="margin-top:5px">'+modeBadge+' '+unread+'</div>'+
      '</div>';
    }).join('');
    Array.prototype.forEach.call(body.querySelectorAll('.chat-item'), function(it){
      it.addEventListener('click', function(){ openSession(it.getAttribute('data-id')); });
    });
  }

  function openSession(id){
    current = id;
    var s = sessions[id]; if(s) s.unreadForStaff=0;
    renderList(); renderMain();
    sendAction({type:'open', sessionId:id});
  }

  function renderMain(){
    var main = document.getElementById('chat-main');
    if(!current || !sessions[current]){ main.innerHTML='<div class="chat-placeholder">Sélectionnez une conversation pour la suivre en temps réel.</div>'; return; }
    main.innerHTML =
      '<div class="chat-main-head" id="chat-head"></div>'+
      '<div class="chat-thread" id="chat-thread"></div>'+
      '<form class="chat-form" id="chat-form"><textarea id="chat-input" rows="2" placeholder="Répondre au visiteur..."></textarea>'+
      '<button class="btn btn-primary" type="submit"><i class="bi bi-send"></i></button></form>';
    renderHead();
    document.getElementById('chat-form').addEventListener('submit', function(e){
      e.preventDefault();
      var inp = document.getElementById('chat-input');
      var txt = (inp.value||'').trim(); if(!txt) return;
      inp.value='';
      appendOptimisticStaff(txt);
      sendAction({type:'message', sessionId:current, content:txt});
    });
    document.getElementById('chat-input').addEventListener('keydown', function(e){
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('chat-form').dispatchEvent(new Event('submit',{cancelable:true})); }
    });
  }

  function renderHead(){
    var head = document.getElementById('chat-head'); if(!head) return;
    var s = sessions[current]; if(!s) return;
    var contact = [s.visitorEmail, s.visitorPhone].filter(Boolean).join(' · ');
    var lead = s.leadId ? '<span class="badge bg-success ms-2"><i class="bi bi-person-check"></i> RDV / Lead créé</span>' : '';
    var takeBtn = s.mode==='human'
      ? '<button class="btn btn-sm btn-outline-secondary" id="btn-release"><i class="bi bi-robot"></i> Rendre au bot</button>'
      : '<button class="btn btn-sm btn-warning" id="btn-takeover"><i class="bi bi-hand-index-thumb"></i> Prendre la main</button>';
    head.innerHTML =
      '<div style="flex:1"><div style="font-weight:600">'+esc(label(s))+lead+'</div>'+
      '<div style="font-size:12px;color:#6c757d">'+esc(contact||'Coordonnées non renseignées')+'</div></div>'+
      takeBtn+
      ' <button class="btn btn-sm btn-outline-danger" id="btn-close"><i class="bi bi-x-circle"></i> Clôturer</button>';
    var tk=document.getElementById('btn-takeover'); if(tk) tk.addEventListener('click', function(){ sendAction({type:'takeover', sessionId:current}); });
    var rl=document.getElementById('btn-release'); if(rl) rl.addEventListener('click', function(){ sendAction({type:'release', sessionId:current}); });
    var cl=document.getElementById('btn-close'); if(cl) cl.addEventListener('click', function(){ if(confirm('Clôturer cette conversation ?')) sendAction({type:'close', sessionId:current}); });
  }

  function renderThread(messages){
    var thread = document.getElementById('chat-thread'); if(!thread) return;
    thread.innerHTML='';
    seen = {};
    messages.forEach(appendMsg);
  }
  function appendMsg(m){
    var thread = document.getElementById('chat-thread'); if(!thread) return;
    if(m.id){ if(seen[m.id]) return; seen[m.id]=true; }
    // Confirme un message staff déjà affiché en optimiste (même contenu en attente)
    // au lieu d'en créer un doublon quand l'écho serveur revient.
    if(m.role==='staff'){
      var pend = thread.querySelector('.cm.staff[data-pending]');
      if(pend && pend.getAttribute('data-pending')===m.content){ pend.removeAttribute('data-pending'); return; }
    }
    var div = document.createElement('div');
    div.className = 'cm ' + m.role;
    div.textContent = m.content;
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }
  // Affiche immédiatement le message du conseiller (optimiste) ; l'écho serveur
  // viendra confirmer ce nœud plutôt que d'en ajouter un second.
  function appendOptimisticStaff(content){
    var thread = document.getElementById('chat-thread'); if(!thread) return;
    var div = document.createElement('div');
    div.className = 'cm staff';
    div.setAttribute('data-pending', content);
    div.textContent = content;
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  renderMain();
  connect();
})();
`;

export const ChatbotLivePage: FC<ChatbotLivePageProps> = ({ user, chatbotEnabled }) => {
  return (
    <Layout title="Chat live" currentPath="/backoffice/support/chat" user={user}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      {!chatbotEnabled && (
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle me-2"></i>
          La clé <code>OPENROUTER_API_KEY</code> n'est pas configurée : le bot ne répond
          pas automatiquement. Les conversations restent visibles et vous pouvez y
          répondre manuellement.
        </div>
      )}
      <div class="chat-console">
        <div class="chat-list">
          <div class="chat-list-head">
            <span><i class="bi bi-chat-dots me-2"></i>Conversations</span>
            <small id="ws-status" style="font-size:12px;color:#adb5bd">● connexion…</small>
          </div>
          <div class="chat-list-body" id="chat-list-body">
            <div class="chat-empty">Chargement…</div>
          </div>
        </div>
        <div class="chat-main" id="chat-main"></div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </Layout>
  );
};

import type { QuoteDataForPdf } from './documenso.service';

function eur(v: string | null) {
  if (!v) return '0,00 €';
  return `${parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;
}

function fmtDate(d: Date | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR');
}

const CGV_SHORT = `
<b>Article 1 – Objet</b><br>Ces CGV régissent la fourniture et l'installation de systèmes domotiques par NEO Domotique.<br><br>
<b>Article 2 – Prix et paiement</b><br>30% à la commande, 40% à la livraison, 30% à la réception. Pénalités de retard : 3× le taux légal.<br><br>
<b>Article 3 – Réserve de propriété</b><br>Le matériel reste propriété de NEO Domotique jusqu'au paiement intégral.<br><br>
<b>Article 4 – Garanties</b><br>Garantie constructeur sur le matériel. Main-d'œuvre garantie 1 an à compter de la réception des travaux.<br><br>
<b>Article 5 – Droit de rétractation</b><br>14 jours pour les contrats hors établissement (art. L.221-18 Code de la consommation), sauf démarrage des travaux avec accord exprès.<br><br>
<b>Article 6 – Responsabilité</b><br>Limitée au montant du devis. Aucune responsabilité pour dommages indirects.<br><br>
<b>Article 7 – Litiges</b><br>Recherche amiable préalable. À défaut, tribunal de commerce compétent.
`;

export function buildSigningPage(
  quoteData: QuoteDataForPdf,
  signatureRequestId: string,
  alreadySigned: boolean,
): string {
  const clientName = quoteData.client
    ? `${quoteData.client.firstName} ${quoteData.client.lastName}`
    : 'Le Client';

  const linesHtml = quoteData.lines
    .map((l) =>
      l.clientOwned
        ? `<tr class="owned"><td>${l.description}</td><td colspan="3" style="color:#888;font-style:italic">Déjà possédé</td></tr>`
        : `<tr>
            <td>${l.description}</td>
            <td style="text-align:center">${l.quantity}</td>
            <td style="text-align:right">${eur(l.unitPriceHT)}</td>
            <td style="text-align:right"><b>${eur(l.totalHT)}</b></td>
           </tr>`,
    )
    .join('');

  if (alreadySigned) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
      <title>Signature</title>
      <style>body{font-family:-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0f9f0;}
      .card{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1);}
      .icon{font-size:64px;margin-bottom:16px;}</style>
    </head><body>
      <div class="card">
        <div class="icon">✅</div>
        <h2 style="color:#1a7f45">Devis signé !</h2>
        <p>Le devis <b>${quoteData.number}</b> a été signé avec succès.</p>
        <p style="color:#666;font-size:14px">Vous pouvez fermer cette fenêtre.</p>
      </div>
    </body></html>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Signature — ${quoteData.number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7fa; color: #1a1d21; }

    .header { background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%); color: #fff; padding: 20px 24px; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header p { font-size: 13px; opacity: 0.85; margin-top: 4px; }

    .section { background: #fff; margin: 12px 16px; border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .section h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #0d47a1; margin-bottom: 12px; }

    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
    .info-label { color: #666; }
    .info-val { font-weight: 600; }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f0f4ff; color: #0d47a1; font-weight: 600; padding: 8px; text-align: left; border-radius: 6px; }
    td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
    tr.owned td { color: #999; }

    .totals { margin-top: 12px; border-top: 1px solid #e0e0e0; padding-top: 12px; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
    .total-final { font-size: 18px; font-weight: 700; color: #0d47a1; margin-top: 8px; }

    .cgv-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; max-height: 180px; overflow-y: auto; font-size: 12px; line-height: 1.6; color: #444; }
    .cgv-toggle { font-size: 13px; color: #0d47a1; cursor: pointer; margin-bottom: 8px; user-select: none; }

    .checkbox-row { display: flex; align-items: flex-start; gap: 12px; margin-top: 16px; }
    .checkbox-row input[type=checkbox] { width: 22px; height: 22px; margin-top: 2px; accent-color: #0d47a1; flex-shrink: 0; }
    .checkbox-row label { font-size: 14px; line-height: 1.4; }

    .sig-section { margin: 12px 16px 0; }
    .sig-label { font-size: 13px; font-weight: 700; color: #0d47a1; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
    .sig-container { position: relative; background: #fff; border: 2px solid #0d47a1; border-radius: 12px; overflow: hidden; touch-action: none; }
    #sigCanvas { display: block; width: 100%; cursor: crosshair; }
    .sig-hint { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: #bbb; font-size: 14px; pointer-events: none; text-align: center; line-height: 1.5; }
    .sig-clear { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,.9); border: 1px solid #ddd; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }

    .submit-bar { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e0e0e0; padding: 16px; margin-top: 16px; }
    #submitBtn { width: 100%; background: #0d47a1; color: #fff; border: none; border-radius: 12px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; opacity: .5; transition: opacity .2s; }
    #submitBtn.ready { opacity: 1; }
    #submitBtn:active { opacity: .8; }

    .spinner { display: none; text-align: center; padding: 20px; }
    .spinner.show { display: block; }
  </style>
</head>
<body>

<div class="header">
  <h1>Devis ${quoteData.number}</h1>
  <p>${clientName} — ${quoteData.project?.name ?? ''}</p>
</div>

<div class="section">
  <h2>Récapitulatif</h2>
  <div class="info-row"><span class="info-label">Client</span><span class="info-val">${clientName}</span></div>
  <div class="info-row"><span class="info-label">Date</span><span class="info-val">${fmtDate(quoteData.createdAt)}</span></div>
  ${quoteData.validUntil ? `<div class="info-row"><span class="info-label">Valide jusqu'au</span><span class="info-val">${fmtDate(quoteData.validUntil)}</span></div>` : ''}

  <table style="margin-top:12px">
    <thead><tr><th>Description</th><th style="text-align:center">Qté</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Total HT</th></tr></thead>
    <tbody>${linesHtml}</tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Total HT</span><span>${eur(quoteData.totalHT)}</span></div>
    <div class="total-row"><span>TVA</span><span>${eur(quoteData.totalTVA)}</span></div>
    <div class="total-row total-final"><span>Total TTC</span><span>${eur(quoteData.totalTTC)}</span></div>
  </div>
</div>

<div class="section">
  <h2>Conditions Générales de Vente</h2>
  <div class="cgv-toggle" onclick="toggleCgv(this)">▶ Lire les CGV complètes</div>
  <div id="cgvBox" class="cgv-box" style="display:none">${CGV_SHORT}</div>

  <div class="checkbox-row">
    <input type="checkbox" id="cgvCheck" onchange="checkReady()">
    <label for="cgvCheck">J'ai lu et j'accepte les Conditions Générales de Vente et d'Utilisation. Je reconnais avoir pris connaissance du devis N° <b>${quoteData.number}</b> d'un montant total TTC de <b>${eur(quoteData.totalTTC)}</b> et l'approuve sans réserve.</label>
  </div>
</div>

<div class="sig-section">
  <div class="sig-label">Signature du client</div>
  <div class="sig-container" style="height:180px">
    <canvas id="sigCanvas" height="180"></canvas>
    <div id="sigHint" class="sig-hint">✍️<br>Signez ici avec le doigt</div>
    <button class="sig-clear" onclick="clearSig()">Effacer</button>
  </div>
</div>

<div class="submit-bar">
  <button id="submitBtn" onclick="submit()" disabled>Valider et signer le devis</button>
</div>

<div id="spinner" class="spinner">
  <p style="color:#0d47a1;font-weight:600">Enregistrement de la signature…</p>
</div>

<script>
  // ---- Canvas setup ----
  const canvas = document.getElementById('sigCanvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasSig = false;

  function resizeCanvas() {
    const container = canvas.parentElement;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * ratio;
    canvas.height = 180 * ratio;
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = '180px';
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#1a1d21';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  resizeCanvas();

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); markSig(); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); drawing = false; }, { passive: false });
  canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); markSig(); });
  canvas.addEventListener('mouseup', () => drawing = false);
  canvas.addEventListener('mouseleave', () => drawing = false);

  function markSig() {
    if (!hasSig) { hasSig = true; document.getElementById('sigHint').style.display = 'none'; checkReady(); }
  }

  function clearSig() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSig = false;
    document.getElementById('sigHint').style.display = '';
    checkReady();
  }

  function checkReady() {
    const btn = document.getElementById('submitBtn');
    const ok = hasSig && document.getElementById('cgvCheck').checked;
    btn.disabled = !ok;
    btn.classList.toggle('ready', ok);
  }

  function toggleCgv(el) {
    const box = document.getElementById('cgvBox');
    const open = box.style.display !== 'none';
    box.style.display = open ? 'none' : 'block';
    el.textContent = (open ? '▶' : '▼') + ' ' + (open ? 'Lire les CGV complètes' : 'Réduire les CGV');
  }

  async function submit() {
    if (!hasSig || !document.getElementById('cgvCheck').checked) return;
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('spinner').classList.add('show');

    const signatureData = canvas.toDataURL('image/png');
    try {
      const resp = await fetch('/signer/${signatureRequestId}/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureData }),
      });
      if (resp.ok) {
        window.location.href = '/signer/${signatureRequestId}/success';
      } else {
        alert('Erreur lors de la sauvegarde. Réessayez.');
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('spinner').classList.remove('show');
      }
    } catch(e) {
      alert('Erreur réseau. Vérifiez la connexion.');
      document.getElementById('submitBtn').disabled = false;
      document.getElementById('spinner').classList.remove('show');
    }
  }
</script>
</body>
</html>`;
}

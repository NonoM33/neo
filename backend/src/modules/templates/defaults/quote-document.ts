import type { TemplateDefinition } from '../types';

/**
 * Default "Devis" document — a standalone A4 HTML page printed to PDF.
 * Designed to look premium: gradient brand band, clean line-item table,
 * a highlighted TTC total card and a legal footer.
 */
const html = String.raw`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    font-size: 12px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { padding: 0 0 96px; position: relative; min-height: 297mm; }
  .band {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #fff;
    padding: 36px 44px 30px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .band .brand { font-size: 22px; font-weight: 800; letter-spacing: .3px; }
  .band .brand small { display:block; font-size: 11px; font-weight: 500; opacity: .85; margin-top: 4px; }
  .band .doc-type { text-align: right; }
  .band .doc-type .label { font-size: 30px; font-weight: 800; letter-spacing: 2px; }
  .band .doc-type .num { font-size: 13px; opacity: .9; margin-top: 2px; }
  .content { padding: 28px 44px 0; }
  .meta {
    display: flex;
    gap: 16px;
    margin-bottom: 26px;
  }
  .meta .box {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    border-radius: 12px;
    padding: 14px 16px;
  }
  .meta .box h4 {
    margin: 0 0 8px;
    font-size: 10px;
    letter-spacing: .8px;
    text-transform: uppercase;
    color: #6366f1;
    font-weight: 700;
  }
  .meta .box .strong { font-weight: 700; font-size: 13px; }
  .meta .box .muted { color: #64748b; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  table.items thead th {
    background: #1e1b4b;
    color: #fff;
    font-size: 10px;
    letter-spacing: .5px;
    text-transform: uppercase;
    text-align: left;
    padding: 10px 12px;
  }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 11px 12px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
  table.items tbody tr:nth-child(even) td { background: #fbfbfe; }
  table.items td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .items .desc-main { font-weight: 600; }
  .items .desc-tag { display:inline-block; margin-top: 3px; font-size: 10px; color: #94a3b8; font-style: italic; }
  .summary { display: flex; justify-content: flex-end; }
  .summary .totals { width: 280px; }
  .summary .row { display: flex; justify-content: space-between; padding: 7px 14px; color: #475569; }
  .summary .row.discount { color: #16a34a; }
  .summary .ttc {
    margin-top: 8px;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #fff;
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .summary .ttc .lbl { font-size: 12px; opacity: .9; text-transform: uppercase; letter-spacing: .5px; }
  .summary .ttc .val { font-size: 22px; font-weight: 800; }
  .notes {
    margin-top: 26px;
    background: #f8fafc;
    border-left: 4px solid #6366f1;
    border-radius: 8px;
    padding: 14px 18px;
    color: #475569;
  }
  .notes h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #1e293b; }
  .footer {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 16px 44px;
    border-top: 1px solid #eef2f7;
    color: #94a3b8;
    font-size: 10px;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="band">
      <div class="brand">{{company.name}}<small>{{company.address}}</small></div>
      <div class="doc-type">
        <div class="label">DEVIS</div>
        <div class="num">N° {{quote.number}}</div>
      </div>
    </div>

    <div class="content">
      <div class="meta">
        <div class="box">
          <h4>Client</h4>
          <div class="strong">{{client.fullName}}</div>
          {{#if client.address}}<div class="muted">{{client.address}}</div>{{/if}}
          {{#if client.cityLine}}<div class="muted">{{client.cityLine}}</div>{{/if}}
          {{#if client.email}}<div class="muted">{{client.email}}</div>{{/if}}
        </div>
        <div class="box">
          <h4>Détails</h4>
          <div><span class="muted">Date : </span><span class="strong">{{quote.date}}</span></div>
          {{#if quote.validUntil}}<div><span class="muted">Validité : </span>{{quote.validUntil}}</div>{{/if}}
          {{#if project.name}}<div><span class="muted">Chantier : </span>{{project.name}}</div>{{/if}}
        </div>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th>Désignation</th>
            <th class="num">Qté</th>
            <th class="num">PU HT</th>
            <th class="num">TVA</th>
            <th class="num">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {{#each lines}}
          <tr>
            <td>
              <div class="desc-main">{{this.description}}</div>
              {{#if this.clientOwned}}<span class="desc-tag">Fourni par le client</span>{{/if}}
            </td>
            <td class="num">{{this.quantity}}</td>
            <td class="num">{{this.unitPrice}}</td>
            <td class="num">{{this.tvaRate}}</td>
            <td class="num">{{this.total}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <div class="summary">
        <div class="totals">
          <div class="row"><span>Sous-total HT</span><span>{{totals.subtotalHT}}</span></div>
          {{#if totals.hasDiscount}}<div class="row discount"><span>Remise</span><span>- {{totals.discountAmount}}</span></div>{{/if}}
          <div class="row"><span>TVA</span><span>{{totals.tva}}</span></div>
          <div class="ttc"><span class="lbl">Total TTC</span><span class="val">{{totals.ttc}}</span></div>
        </div>
      </div>

      {{#if quote.notes}}
      <div class="notes">
        <h4>Notes</h4>
        <div>{{quote.notes}}</div>
      </div>
      {{/if}}
    </div>

    <div class="footer">{{company.footer}}</div>
  </div>
</body>
</html>`;

export const quoteDocumentTemplate: TemplateDefinition = {
  key: 'quote-document',
  kind: 'document',
  name: 'Devis (PDF)',
  description: 'Document PDF envoyé au client et joint à l’email de devis.',
  html,
  variables: [
    { token: 'company.name', label: 'Nom société' },
    { token: 'company.address', label: 'Adresse société' },
    { token: 'company.footer', label: 'Pied de page légal' },
    { token: 'quote.number', label: 'Numéro de devis' },
    { token: 'quote.date', label: 'Date' },
    { token: 'quote.validUntil', label: 'Validité' },
    { token: 'quote.notes', label: 'Notes' },
    { token: 'client.fullName', label: 'Client (nom complet)' },
    { token: 'client.address', label: 'Adresse client' },
    { token: 'client.cityLine', label: 'CP + ville client' },
    { token: 'client.email', label: 'Email client' },
    { token: 'project.name', label: 'Nom du chantier' },
    { token: 'lines', label: 'Lignes (boucle)', hint: '{{#each lines}} … {{/each}}' },
    { token: 'this.description', label: '↳ Désignation', hint: 'dans la boucle lignes' },
    { token: 'this.quantity', label: '↳ Quantité', hint: 'dans la boucle lignes' },
    { token: 'this.unitPrice', label: '↳ Prix unitaire HT', hint: 'dans la boucle lignes' },
    { token: 'this.tvaRate', label: '↳ TVA', hint: 'dans la boucle lignes' },
    { token: 'this.total', label: '↳ Total HT', hint: 'dans la boucle lignes' },
    { token: 'totals.subtotalHT', label: 'Sous-total HT' },
    { token: 'totals.discountAmount', label: 'Montant remise' },
    { token: 'totals.tva', label: 'TVA' },
    { token: 'totals.ttc', label: 'Total TTC' },
  ],
  sampleData: {
    company: {
      name: 'Neo Domotique',
      address: '12 rue des Lilas, 75011 Paris',
      footer: 'Neo Domotique — 12 rue des Lilas, 75011 Paris — SIRET 000 000 000 00000 — TVA FR00000000000',
    },
    quote: {
      number: 'DEV-2026-0042',
      date: '5 juin 2026',
      validUntil: '5 juillet 2026',
      notes: 'Installation prévue sous 3 semaines après acceptation du devis.',
    },
    client: {
      fullName: 'Marie Dupont',
      address: '8 avenue Victor Hugo',
      cityLine: '69002 Lyon',
      email: 'marie.dupont@email.fr',
    },
    project: { name: 'Maison connectée — Lyon 2e' },
    lines: [
      { description: 'Box domotique Neo Hub', quantity: 1, unitPrice: '249,00 €', tvaRate: '20 %', total: '249,00 €', clientOwned: false },
      { description: 'Capteur d’ouverture (lot de 4)', quantity: 2, unitPrice: '39,00 €', tvaRate: '20 %', total: '78,00 €', clientOwned: false },
      { description: 'Thermostat connecté', quantity: 1, unitPrice: '129,00 €', tvaRate: '20 %', total: '129,00 €', clientOwned: true },
    ],
    totals: { subtotalHT: '327,00 €', hasDiscount: true, discountAmount: '16,35 €', tva: '62,13 €', ttc: '372,78 €' },
  },
};

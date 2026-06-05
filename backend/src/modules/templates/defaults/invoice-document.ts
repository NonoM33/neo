import type { TemplateDefinition } from '../types';

/**
 * Default "Facture" document — standalone A4 HTML printed to PDF.
 * Same visual language as the quote, with an "À payer" emphasis, payment
 * terms / bank details block and mandatory legal mentions.
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
    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
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
  .meta { display: flex; gap: 16px; margin-bottom: 26px; }
  .meta .box { flex: 1; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 12px; padding: 14px 16px; }
  .meta .box h4 { margin: 0 0 8px; font-size: 10px; letter-spacing: .8px; text-transform: uppercase; color: #475569; font-weight: 700; }
  .meta .box .strong { font-weight: 700; font-size: 13px; }
  .meta .box .muted { color: #64748b; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
  table.items thead th { background: #0f172a; color: #fff; font-size: 10px; letter-spacing: .5px; text-transform: uppercase; text-align: left; padding: 10px 12px; }
  table.items thead th.num { text-align: right; }
  table.items tbody td { padding: 11px 12px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
  table.items tbody tr:nth-child(even) td { background: #fbfbfe; }
  table.items td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .items .desc-main { font-weight: 600; }
  .items .desc-ref { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .summary { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .pay {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #eef2f7;
    border-radius: 12px;
    padding: 14px 16px;
    color: #475569;
  }
  .pay h4 { margin: 0 0 8px; font-size: 10px; letter-spacing: .8px; text-transform: uppercase; color: #475569; font-weight: 700; }
  .pay .line { margin-bottom: 3px; }
  .pay .iban { font-variant-numeric: tabular-nums; font-weight: 600; color: #1e293b; }
  .totals { width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 7px 14px; color: #475569; }
  .totals .due {
    margin-top: 8px;
    background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
    color: #fff;
    border-radius: 12px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .totals .due .lbl { font-size: 12px; opacity: .95; text-transform: uppercase; letter-spacing: .5px; }
  .totals .due .val { font-size: 22px; font-weight: 800; }
  .legal { margin-top: 22px; color: #94a3b8; font-size: 10px; line-height: 1.5; }
  .footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px 44px; border-top: 1px solid #eef2f7; color: #94a3b8; font-size: 10px; text-align: center; }
</style>
</head>
<body>
  <div class="page">
    <div class="band">
      <div class="brand">{{company.name}}<small>{{company.address}}</small></div>
      <div class="doc-type">
        <div class="label">FACTURE</div>
        <div class="num">N° {{invoice.number}}</div>
      </div>
    </div>

    <div class="content">
      <div class="meta">
        <div class="box">
          <h4>Facturé à</h4>
          <div class="strong">{{client.fullName}}</div>
          {{#if client.address}}<div class="muted">{{client.address}}</div>{{/if}}
          {{#if client.cityLine}}<div class="muted">{{client.cityLine}}</div>{{/if}}
          {{#if client.email}}<div class="muted">{{client.email}}</div>{{/if}}
        </div>
        <div class="box">
          <h4>Détails</h4>
          <div><span class="muted">Date : </span><span class="strong">{{invoice.date}}</span></div>
          {{#if invoice.dueDate}}<div><span class="muted">Échéance : </span>{{invoice.dueDate}}</div>{{/if}}
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
              {{#if this.reference}}<div class="desc-ref">Réf. {{this.reference}}</div>{{/if}}
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
        <div class="pay">
          <h4>Règlement</h4>
          {{#if invoice.paymentTerms}}<div class="line">Conditions : {{invoice.paymentTerms}}</div>{{/if}}
          {{#if company.iban}}<div class="line">IBAN : <span class="iban">{{company.iban}}</span></div>{{/if}}
          {{#if company.bic}}<div class="line">BIC : {{company.bic}}</div>{{/if}}
        </div>
        <div class="totals">
          <div class="row"><span>Sous-total HT</span><span>{{totals.subtotalHT}}</span></div>
          <div class="row"><span>TVA</span><span>{{totals.tva}}</span></div>
          <div class="due"><span class="lbl">À payer</span><span class="val">{{totals.ttc}}</span></div>
        </div>
      </div>

      {{#if invoice.legalMentions}}<div class="legal">{{invoice.legalMentions}}</div>{{/if}}
    </div>

    <div class="footer">{{company.footer}}</div>
  </div>
</body>
</html>`;

export const invoiceDocumentTemplate: TemplateDefinition = {
  key: 'invoice-document',
  kind: 'document',
  name: 'Facture (PDF)',
  description: 'Document PDF envoyé au client et joint à l’email de facture.',
  html,
  variables: [
    { token: 'company.name', label: 'Nom société' },
    { token: 'company.address', label: 'Adresse société' },
    { token: 'company.iban', label: 'IBAN' },
    { token: 'company.bic', label: 'BIC' },
    { token: 'company.footer', label: 'Pied de page légal' },
    { token: 'invoice.number', label: 'Numéro de facture' },
    { token: 'invoice.date', label: 'Date' },
    { token: 'invoice.dueDate', label: 'Échéance' },
    { token: 'invoice.paymentTerms', label: 'Conditions de règlement' },
    { token: 'invoice.legalMentions', label: 'Mentions légales' },
    { token: 'client.fullName', label: 'Client (nom complet)' },
    { token: 'client.address', label: 'Adresse client' },
    { token: 'client.cityLine', label: 'CP + ville client' },
    { token: 'client.email', label: 'Email client' },
    { token: 'project.name', label: 'Nom du chantier' },
    { token: 'lines', label: 'Lignes (boucle)', hint: '{{#each lines}} … {{/each}}' },
    { token: 'this.description', label: '↳ Désignation', hint: 'dans la boucle lignes' },
    { token: 'this.reference', label: '↳ Référence', hint: 'dans la boucle lignes' },
    { token: 'this.quantity', label: '↳ Quantité', hint: 'dans la boucle lignes' },
    { token: 'this.unitPrice', label: '↳ Prix unitaire HT', hint: 'dans la boucle lignes' },
    { token: 'this.tvaRate', label: '↳ TVA', hint: 'dans la boucle lignes' },
    { token: 'this.total', label: '↳ Total HT', hint: 'dans la boucle lignes' },
    { token: 'totals.subtotalHT', label: 'Sous-total HT' },
    { token: 'totals.tva', label: 'TVA' },
    { token: 'totals.ttc', label: 'Total TTC (à payer)' },
  ],
  sampleData: {
    company: {
      name: 'Neo Domotique',
      address: '12 rue des Lilas, 75011 Paris',
      iban: 'FR76 3000 1007 9412 3456 7890 185',
      bic: 'BNPAFRPP',
      footer: 'Neo Domotique — 12 rue des Lilas, 75011 Paris — SIRET 000 000 000 00000 — TVA FR00000000000',
    },
    invoice: {
      number: 'FAC-2026-0042',
      date: '5 juin 2026',
      dueDate: '5 juillet 2026',
      paymentTerms: '30 jours',
      legalMentions:
        'En cas de retard de paiement, application d’une pénalité de 3 fois le taux d’intérêt légal et d’une indemnité forfaitaire de recouvrement de 40 €. Pas d’escompte pour paiement anticipé.',
    },
    client: {
      fullName: 'Marie Dupont',
      address: '8 avenue Victor Hugo',
      cityLine: '69002 Lyon',
      email: 'marie.dupont@email.fr',
    },
    project: { name: 'Maison connectée — Lyon 2e' },
    lines: [
      { description: 'Box domotique Neo Hub', reference: 'NEO-HUB-01', quantity: 1, unitPrice: '249,00 €', tvaRate: '20 %', total: '249,00 €' },
      { description: 'Pose et configuration', reference: '', quantity: 1, unitPrice: '150,00 €', tvaRate: '20 %', total: '150,00 €' },
    ],
    totals: { subtotalHT: '399,00 €', tva: '79,80 €', ttc: '478,80 €' },
  },
};

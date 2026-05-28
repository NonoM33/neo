/**
 * Contract PDF generator — produces a 2-page A4 contract from quote data:
 *   - Page 1: header + client/project block + line items + totals + notes
 *   - Page 2: CGV (full), CGU (summary), signature block
 *
 * This module is provider-agnostic: it is consumed by signature flows
 * (DocuSeal remote signing, direct in-person signing) and by the
 * /contrat.pdf preview endpoint. No external dependencies beyond pdf-lib.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuoteDataForPdf {
  number: string;
  createdAt: Date | null;
  validUntil: Date | null;
  notes: string | null;
  totalHT: string | null;
  totalTVA: string | null;
  totalTTC: string | null;
  discount: string | null;
  project: {
    name: string;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  } | null;
  client: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
  } | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceHT: string | null;
    tvaRate: string | null;
    totalHT: string | null;
    clientOwned: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// CGV / CGU text
// ---------------------------------------------------------------------------

const CGV_TEXT = `CONDITIONS GÉNÉRALES DE VENTE — NEO DOMOTIQUE

Article 1 — Objet
Les présentes CGV régissent les relations contractuelles entre NEO Domotique (ci-après « l'Entreprise ») et tout client (ci-après « le Client ») dans le cadre de la fourniture et de l'installation de systèmes domotiques.

Article 2 — Formation du contrat
Le contrat est formé à la date de signature du devis par le Client. Toute commande implique l'acceptation pleine et entière des présentes CGV.

Article 3 — Prix et paiement
Les prix sont exprimés en euros HT. La TVA applicable est celle en vigueur à la date de facturation. Sauf accord contraire, le paiement s'effectue : 30 % à la commande, 40 % à la livraison du matériel, 30 % à la réception des travaux. Tout retard de paiement entraîne des pénalités de 3 fois le taux d'intérêt légal.

Article 4 — Délais d'exécution
Les délais sont donnés à titre indicatif. Un retard dans l'exécution ne peut donner lieu à dommages-intérêts, sauf faute prouvée de l'Entreprise. En cas de force majeure (intempéries, grèves, pénurie de matériel), les délais sont automatiquement prolongés.

Article 5 — Réserve de propriété
Le matériel fourni reste propriété de l'Entreprise jusqu'au paiement intégral du prix. Le risque est transféré au Client dès la livraison.

Article 6 — Garanties
Le matériel bénéficie de la garantie constructeur. La main-d'œuvre est garantie 1 an à compter de la date de réception des travaux. La garantie ne couvre pas les dommages résultant d'une mauvaise utilisation, d'une modification non autorisée ou d'une cause extérieure.

Article 7 — Droit de rétractation
Conformément à l'article L.221-18 du Code de la consommation, pour les contrats conclus hors établissement, le Client dispose d'un délai de 14 jours pour exercer son droit de rétractation, sauf si les travaux ont débuté avec son accord exprès.

Article 8 — Responsabilité
La responsabilité de l'Entreprise est limitée au montant du devis. Elle ne saurait être tenue responsable des dommages indirects ou immatériels.

Article 9 — Propriété intellectuelle
Les schémas, plans, études et configurations livrés au Client restent la propriété intellectuelle de l'Entreprise jusqu'au paiement complet.

Article 10 — Litiges
En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire. À défaut, le Tribunal de Commerce compétent sera seul compétent.`;

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatEur(value: string | null): string {
  if (!value) return '0,00 €';
  return `${parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
}

async function writeParagraph(
  page: PDFPage,
  text: string,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  x: number,
  y: number,
  fontSize: number,
  maxWidth: number,
  lineHeight: number,
): Promise<number> {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
    currentY -= lineHeight;
  }
  return currentY;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export async function generateContractPdf(quoteData: QuoteDataForPdf): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  // =========================================================================
  // PAGE 1 — DEVIS
  // =========================================================================
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // ---- Header bar ----
  page1.drawRectangle({
    x: 0,
    y: pageHeight - 80,
    width: pageWidth,
    height: 80,
    color: rgb(0.05, 0.25, 0.55),
  });
  page1.drawText('NEO DOMOTIQUE', {
    x: margin,
    y: pageHeight - 45,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page1.drawText('Solution Domotique Intelligente', {
    x: margin,
    y: pageHeight - 65,
    size: 10,
    font: fontRegular,
    color: rgb(0.8, 0.9, 1),
  });

  y = pageHeight - 100;

  // ---- Title ----
  page1.drawText(`DEVIS N° ${quoteData.number}`, {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.05, 0.25, 0.55),
  });
  y -= 20;
  page1.drawText(`Date : ${formatDate(quoteData.createdAt)}`, {
    x: margin, y, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4),
  });
  if (quoteData.validUntil) {
    page1.drawText(`Valide jusqu'au : ${formatDate(quoteData.validUntil)}`, {
      x: margin + 180, y, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4),
    });
  }
  y -= 30;

  // ---- Client & Projet ----
  const colLeft = margin;
  const colRight = margin + contentWidth / 2 + 10;
  const boxTop = y;

  // Client box
  page1.drawRectangle({ x: colLeft, y: boxTop - 90, width: contentWidth / 2 - 10, height: 90, color: rgb(0.96, 0.97, 0.99) });
  page1.drawText('CLIENT', { x: colLeft + 10, y: boxTop - 18, size: 9, font: fontBold, color: rgb(0.05, 0.25, 0.55) });
  const clientName = quoteData.client ? `${quoteData.client.firstName} ${quoteData.client.lastName}` : '-';
  page1.drawText(clientName, { x: colLeft + 10, y: boxTop - 34, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  if (quoteData.client?.address) {
    page1.drawText(quoteData.client.address, { x: colLeft + 10, y: boxTop - 48, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  }
  const clientCity = quoteData.client ? `${quoteData.client.postalCode ?? ''} ${quoteData.client.city ?? ''}`.trim() : '';
  if (clientCity) {
    page1.drawText(clientCity, { x: colLeft + 10, y: boxTop - 62, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  }
  if (quoteData.client?.email) {
    page1.drawText(quoteData.client.email, { x: colLeft + 10, y: boxTop - 76, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  }

  // Projet box
  page1.drawRectangle({ x: colRight, y: boxTop - 90, width: contentWidth / 2 - 10, height: 90, color: rgb(0.96, 0.97, 0.99) });
  page1.drawText('PROJET', { x: colRight + 10, y: boxTop - 18, size: 9, font: fontBold, color: rgb(0.05, 0.25, 0.55) });
  page1.drawText(quoteData.project?.name ?? '-', { x: colRight + 10, y: boxTop - 34, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  if (quoteData.project?.address) {
    page1.drawText(quoteData.project.address, { x: colRight + 10, y: boxTop - 48, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  }
  const projCity = quoteData.project ? `${quoteData.project.postalCode ?? ''} ${quoteData.project.city ?? ''}`.trim() : '';
  if (projCity) {
    page1.drawText(projCity, { x: colRight + 10, y: boxTop - 62, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  }

  y = boxTop - 100;

  // ---- Table header ----
  const colX = [margin, margin + 240, margin + 290, margin + 360, margin + 410];
  const headers = ['Description', 'Qté', 'P.U. HT', 'TVA', 'Total HT'];

  page1.drawRectangle({ x: margin, y: y - 20, width: contentWidth, height: 20, color: rgb(0.05, 0.25, 0.55) });
  headers.forEach((h, i) => {
    page1.drawText(h, { x: colX[i]! + 4, y: y - 14, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  });
  y -= 20;

  // ---- Table rows ----
  quoteData.lines.forEach((line, idx) => {
    const rowHeight = 22;
    const bg = idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.97, 0.97);
    page1.drawRectangle({ x: margin, y: y - rowHeight, width: contentWidth, height: rowHeight, color: bg });

    // Description (truncate if needed)
    const desc = line.clientOwned ? `[Client] ${line.description}` : line.description;
    const maxDescLen = 55;
    const truncDesc = desc.length > maxDescLen ? `${desc.substring(0, maxDescLen)}...` : desc;
    page1.drawText(truncDesc, { x: colX[0]! + 4, y: y - 15, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

    if (!line.clientOwned) {
      page1.drawText(String(line.quantity), { x: colX[1]! + 4, y: y - 15, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page1.drawText(formatEur(line.unitPriceHT), { x: colX[2]! + 4, y: y - 15, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page1.drawText(`${parseFloat(line.tvaRate ?? '20').toFixed(0)}%`, { x: colX[3]! + 4, y: y - 15, size: 8.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page1.drawText(formatEur(line.totalHT), { x: colX[4]! + 4, y: y - 15, size: 8.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    } else {
      page1.drawText('(déjà possédé)', { x: colX[1]! + 4, y: y - 15, size: 7.5, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    }
    y -= rowHeight;
  });

  // ---- Totals ----
  y -= 10;
  const totalsX = margin + contentWidth - 200;
  const drawTotal = (label: string, value: string, isBold = false) => {
    page1.drawText(label, { x: totalsX, y, size: 9, font: isBold ? fontBold : fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page1.drawText(value, { x: totalsX + 130, y, size: 9, font: isBold ? fontBold : fontRegular, color: rgb(0.1, 0.1, 0.1) });
    y -= 16;
  };

  if (quoteData.discount && parseFloat(quoteData.discount) > 0) {
    drawTotal('Remise :', `-${parseFloat(quoteData.discount).toFixed(1)}%`);
  }
  drawTotal('Total HT :', formatEur(quoteData.totalHT));
  drawTotal('TVA :', formatEur(quoteData.totalTVA));
  y -= 4;
  page1.drawLine({ start: { x: totalsX, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.05, 0.25, 0.55) });
  y -= 6;
  drawTotal('TOTAL TTC :', formatEur(quoteData.totalTTC), true);

  // ---- Notes ----
  if (quoteData.notes) {
    y -= 20;
    page1.drawText('Notes :', { x: margin, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    y -= 14;
    y = await writeParagraph(page1, quoteData.notes, fontRegular, margin, y, 9, contentWidth, 13);
  }

  // ---- Footer ----
  page1.drawText('Page 1/2 — Signature au verso', {
    x: margin,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6),
  });

  // =========================================================================
  // PAGE 2 — CGV / CGU / SIGNATURE
  // =========================================================================
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y2 = pageHeight - margin;

  // Header bar
  page2.drawRectangle({ x: 0, y: pageHeight - 50, width: pageWidth, height: 50, color: rgb(0.05, 0.25, 0.55) });
  page2.drawText('CONDITIONS GÉNÉRALES & SIGNATURE', {
    x: margin,
    y: pageHeight - 32,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  y2 = pageHeight - 65;

  // CGV title
  page2.drawText('CONDITIONS GÉNÉRALES DE VENTE', {
    x: margin, y: y2, size: 9, font: fontBold, color: rgb(0.05, 0.25, 0.55),
  });
  y2 -= 14;

  const cgvLines = CGV_TEXT.split('\n');
  for (const line of cgvLines) {
    if (line.startsWith('Article')) {
      page2.drawText(line, { x: margin, y: y2, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      y2 -= 10;
    } else if (line.trim() === '') {
      y2 -= 4;
    } else {
      y2 = await writeParagraph(page2, line, fontRegular, margin, y2, 7, contentWidth, 10);
    }
    if (y2 < 280) break; // leave room for CGU summary and signature
  }

  y2 -= 8;
  // CGU summary (brief)
  page2.drawText('CONDITIONS GÉNÉRALES D\'UTILISATION', {
    x: margin, y: y2, size: 9, font: fontBold, color: rgb(0.05, 0.25, 0.55),
  });
  y2 -= 12;
  const cguSummary = "En signant ce devis, le Client accepte également les Conditions Générales d'Utilisation de la plateforme NEO Domotique, disponibles intégralement sur demande ou à l'adresse neo-domotique.fr/cgu.";
  y2 = await writeParagraph(page2, cguSummary, fontRegular, margin, y2, 7.5, contentWidth, 11);

  // ---- Signature block ----
  y2 = Math.min(y2 - 20, 240);
  page2.drawLine({ start: { x: margin, y: y2 }, end: { x: pageWidth - margin, y: y2 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y2 -= 18;

  page2.drawText('SIGNATURE DU CLIENT', {
    x: margin, y: y2, size: 10, font: fontBold, color: rgb(0.05, 0.25, 0.55),
  });
  y2 -= 14;

  const clientFullName = quoteData.client
    ? `${quoteData.client.firstName} ${quoteData.client.lastName}`
    : 'Le Client';
  page2.drawText(`Je soussigné(e) ${clientFullName}, reconnais avoir pris connaissance des présentes conditions et accepte le devis N° ${quoteData.number} d'un montant total TTC de ${formatEur(quoteData.totalTTC)}.`, {
    x: margin, y: y2, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2),
  });
  y2 -= 10;
  page2.drawText(`Fait le ${formatDate(new Date())}`, {
    x: margin, y: y2, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4),
  });
  y2 -= 50;

  // Signature box
  page2.drawRectangle({ x: margin, y: y2 - 60, width: 220, height: 60, borderColor: rgb(0.4, 0.4, 0.7), borderWidth: 1, color: rgb(0.98, 0.98, 1) });
  page2.drawText('Signature :', { x: margin + 5, y: y2 - 14, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  page2.drawText('(précédé de « Lu et approuvé »)', { x: margin + 5, y: y2 - 75, size: 7, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

  // Footer
  page2.drawText('Page 2/2', { x: margin, y: 30, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
  page2.drawText(`Devis ${quoteData.number} — NEO Domotique`, { x: pageWidth / 2 - 60, y: 30, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

  return pdfDoc.save();
}

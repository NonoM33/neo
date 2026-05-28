/**
 * Invoice PDF generator using pdf-lib.
 *
 * Same visual language as quote-pdf.service.ts (brand purple accent,
 * Helvetica, soft slate palette) but tailored for an invoice:
 *   - "FACTURE" badge instead of "DEVIS"
 *   - "À payer" total in accent color, prominent
 *   - Due date + payment terms + payment instructions block
 *   - Legal mentions footer (penalty rate, recovery fee, etc.)
 *
 * Inputs are intentionally permissive (string | null | undefined) because
 * the Drizzle joined query types are. See the analogous pdfSafe() trick
 * to keep WinAnsi encoding happy with French Intl currency output.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { env } from '../../config/env';

// ─── Types ──────────────────────────────────────────────────────────────

export interface InvoicePdfInput {
  invoice: {
    number: string | undefined;
    createdAt: Date | null | undefined;
    dueDate: Date | null | undefined;
    totalHT: string | null | undefined;
    totalTVA: string | null | undefined;
    totalTTC: string | null | undefined;
    paymentTerms: string | null | undefined;
    legalMentions: string | null | undefined;
    notes: string | null | undefined;
  };
  client: {
    firstName: string | undefined;
    lastName: string | undefined;
    email: string | null | undefined;
    address: string | null | undefined;
    postalCode: string | null | undefined;
    city: string | null | undefined;
  };
  project: {
    name: string | undefined;
    address: string | null | undefined;
    city: string | null | undefined;
    postalCode: string | null | undefined;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPriceHT: string;
    tvaRate: string;
    totalHT: string;
    reference?: string | null;
  }>;
  /** Optional IBAN/BIC block for wire transfer instructions. */
  payment?: {
    iban?: string;
    bic?: string;
    bankName?: string;
  };
}

// ─── Layout constants (mirror quote-pdf for visual consistency) ─────────

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 40;
const MARGIN_BOTTOM = 60;
const ACCENT = rgb(99 / 255, 102 / 255, 241 / 255);
const ACCENT_WARN = rgb(220 / 255, 38 / 255, 38 / 255); // red for "À payer"
const TEXT = rgb(0.118, 0.137, 0.196);
const MUTED = rgb(0.392, 0.455, 0.545);
const SOFT_BG = rgb(0.973, 0.980, 0.988);
const ROW_BORDER = rgb(0.886, 0.910, 0.941);

const COLS = {
  description: { x: MARGIN_X, w: 240 },
  reference: { x: MARGIN_X + 240, w: 70 },
  quantity: { x: MARGIN_X + 310, w: 40 },
  unitPriceHT: { x: MARGIN_X + 350, w: 65 },
  tvaRate: { x: MARGIN_X + 415, w: 35 },
  totalHT: { x: MARGIN_X + 450, w: 65 },
};

// ─── Helpers ────────────────────────────────────────────────────────────

function pdfSafe(s: string): string {
  return s
    // Non-breaking, thin and narrow no-break spaces (incl. U+202F, U+00A0,
    // U+2009, U+2007) that Intl.NumberFormat slips into currency output.
    .replace(/[\u00A0\u2007\u2008\u2009\u200A\u202F\u205F]/g, ' ')
    .replace(/[\u2013\u2014]/g, '-') // en/em dashes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*') // bullet
    .replace(/\u00B7/g, '-'); // middle dot
}

function fmtEUR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return pdfSafe(
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(isFinite(n) ? n : 0),
  );
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface DrawTextOpts {
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  maxWidth?: number;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  opts: DrawTextOpts,
) {
  page.drawText(pdfSafe(text), {
    x,
    y,
    font: opts.font,
    size: opts.size,
    color: opts.color ?? TEXT,
    maxWidth: opts.maxWidth,
  });
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const safe = pdfSafe(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Page sections ──────────────────────────────────────────────────────

function drawHeader(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }) {
  // Purple accent bar
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 6,
    width: PAGE_W,
    height: 6,
    color: ACCENT,
  });

  drawText(page, env.COMPANY_NAME.toUpperCase(), MARGIN_X, PAGE_H - 38, {
    font: fonts.bold,
    size: 16,
    color: ACCENT,
  });

  if (env.COMPANY_ADDRESS) {
    drawText(page, env.COMPANY_ADDRESS, MARGIN_X, PAGE_H - 54, {
      font: fonts.regular,
      size: 9,
      color: MUTED,
    });
  }

  // "FACTURE" badge top-right
  drawText(page, 'FACTURE', PAGE_W - MARGIN_X - 100, PAGE_H - 50, {
    font: fonts.bold,
    size: 24,
    color: TEXT,
  });
}

function drawMetadata(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  input: InvoicePdfInput,
  topY: number,
): number {
  let y = topY;

  // Left column: client
  drawText(page, 'FACTURE À', MARGIN_X, y, {
    font: fonts.bold,
    size: 9,
    color: MUTED,
  });
  y -= 14;
  drawText(
    page,
    `${input.client.firstName ?? ''} ${input.client.lastName ?? ''}`.trim() || '-',
    MARGIN_X,
    y,
    { font: fonts.bold, size: 11 },
  );
  y -= 14;
  if (input.client.address) {
    drawText(page, input.client.address, MARGIN_X, y, {
      font: fonts.regular,
      size: 10,
    });
    y -= 12;
  }
  const cityLine = [input.client.postalCode, input.client.city]
    .filter(Boolean)
    .join(' ');
  if (cityLine) {
    drawText(page, cityLine, MARGIN_X, y, {
      font: fonts.regular,
      size: 10,
    });
    y -= 12;
  }
  if (input.client.email) {
    drawText(page, input.client.email, MARGIN_X, y, {
      font: fonts.regular,
      size: 9,
      color: MUTED,
    });
    y -= 12;
  }

  // Right column: invoice metadata
  let rightY = topY;
  const rightX = MARGIN_X + 300;
  drawText(page, `Facture N° ${input.invoice.number ?? '-'}`, rightX, rightY, {
    font: fonts.bold,
    size: 12,
  });
  rightY -= 16;
  drawText(
    page,
    `Émise le : ${fmtDate(input.invoice.createdAt)}`,
    rightX,
    rightY,
    { font: fonts.regular, size: 10 },
  );
  rightY -= 14;
  if (input.invoice.dueDate) {
    drawText(
      page,
      `Échéance : ${fmtDate(input.invoice.dueDate)}`,
      rightX,
      rightY,
      { font: fonts.bold, size: 10, color: ACCENT_WARN },
    );
    rightY -= 14;
  }
  if (input.invoice.paymentTerms) {
    drawText(
      page,
      `Conditions : ${input.invoice.paymentTerms}`,
      rightX,
      rightY,
      { font: fonts.regular, size: 10 },
    );
    rightY -= 14;
  }
  if (input.project.name) {
    drawText(page, `Chantier : ${input.project.name}`, rightX, rightY, {
      font: fonts.regular,
      size: 10,
      maxWidth: 220,
    });
    rightY -= 14;
  }

  return Math.min(y, rightY) - 16;
}

function drawTableHeader(page: PDFPage, font: PDFFont, y: number): number {
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 18,
    width: PAGE_W - 2 * MARGIN_X,
    height: 22,
    color: SOFT_BG,
  });
  drawText(page, 'Désignation', COLS.description.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  drawText(page, 'Réf.', COLS.reference.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  drawText(page, 'Qté', COLS.quantity.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  drawText(page, 'PU HT', COLS.unitPriceHT.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  drawText(page, 'TVA', COLS.tvaRate.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  drawText(page, 'Total HT', COLS.totalHT.x + 6, y - 13, {
    font, size: 9, color: MUTED,
  });
  return y - 22;
}

function drawLineRow(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  line: InvoicePdfInput['lines'][number],
  y: number,
): number {
  const descLines = wrapText(
    line.description,
    fonts.regular,
    10,
    COLS.description.w - 12,
  );
  const rowHeight = Math.max(20, descLines.length * 12 + 8);
  const baseY = y - rowHeight + 6;

  let descY = y - 12;
  for (const l of descLines) {
    drawText(page, l, COLS.description.x + 6, descY, {
      font: fonts.regular,
      size: 10,
    });
    descY -= 12;
  }

  if (line.reference) {
    drawText(page, line.reference, COLS.reference.x + 6, y - 12, {
      font: fonts.regular,
      size: 9,
      color: MUTED,
    });
  }
  drawText(page, `${line.quantity}`, COLS.quantity.x + 6, y - 12, {
    font: fonts.regular,
    size: 10,
  });
  drawText(page, fmtEUR(line.unitPriceHT), COLS.unitPriceHT.x + 6, y - 12, {
    font: fonts.regular,
    size: 10,
  });
  drawText(
    page,
    `${parseFloat(line.tvaRate).toFixed(0)} %`,
    COLS.tvaRate.x + 6,
    y - 12,
    { font: fonts.regular, size: 10 },
  );
  drawText(page, fmtEUR(line.totalHT), COLS.totalHT.x + 6, y - 12, {
    font: fonts.bold,
    size: 10,
  });

  page.drawLine({
    start: { x: MARGIN_X, y: baseY },
    end: { x: PAGE_W - MARGIN_X, y: baseY },
    color: ROW_BORDER,
    thickness: 0.5,
  });

  return baseY;
}

function drawTotals(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  input: InvoicePdfInput,
  y: number,
): number {
  const labelX = MARGIN_X + 300;
  const valueX = PAGE_W - MARGIN_X;
  let currentY = y - 20;
  const writeLine = (
    label: string,
    value: string,
    opts?: { bold?: boolean; warn?: boolean },
  ) => {
    const font = opts?.bold ? fonts.bold : fonts.regular;
    const color = opts?.warn ? ACCENT_WARN : TEXT;
    const size = opts?.bold ? 13 : 10;
    drawText(page, label, labelX, currentY, { font, size, color });
    const valWidth = font.widthOfTextAtSize(pdfSafe(value), size);
    drawText(page, value, valueX - valWidth, currentY, {
      font,
      size,
      color,
    });
    currentY -= opts?.bold ? 20 : 14;
  };

  writeLine('Sous-total HT', fmtEUR(input.invoice.totalHT));
  writeLine('TVA', fmtEUR(input.invoice.totalTVA));

  page.drawLine({
    start: { x: labelX, y: currentY + 6 },
    end: { x: valueX, y: currentY + 6 },
    color: ROW_BORDER,
    thickness: 0.5,
  });
  currentY -= 4;

  writeLine('À PAYER (TTC)', fmtEUR(input.invoice.totalTTC), {
    bold: true,
    warn: true,
  });
  return currentY;
}

function drawPaymentBlock(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  input: InvoicePdfInput,
  y: number,
): number {
  if (!input.payment?.iban) return y;
  let currentY = y - 8;
  page.drawRectangle({
    x: MARGIN_X,
    y: currentY - 60,
    width: PAGE_W - 2 * MARGIN_X,
    height: 60,
    color: SOFT_BG,
  });

  drawText(page, 'COORDONNÉES BANCAIRES', MARGIN_X + 10, currentY - 14, {
    font: fonts.bold,
    size: 9,
    color: ACCENT,
  });
  currentY -= 28;
  if (input.payment.bankName) {
    drawText(page, input.payment.bankName, MARGIN_X + 10, currentY, {
      font: fonts.regular,
      size: 9,
    });
    currentY -= 12;
  }
  drawText(page, `IBAN : ${input.payment.iban}`, MARGIN_X + 10, currentY, {
    font: fonts.bold,
    size: 9,
  });
  currentY -= 12;
  if (input.payment.bic) {
    drawText(page, `BIC : ${input.payment.bic}`, MARGIN_X + 10, currentY, {
      font: fonts.regular,
      size: 9,
    });
    currentY -= 12;
  }
  return currentY - 16;
}

function drawNotesAndFooter(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  input: InvoicePdfInput,
  y: number,
) {
  let currentY = y - 8;

  if (input.invoice.notes && input.invoice.notes.trim()) {
    drawText(page, 'Notes', MARGIN_X, currentY, { font: fonts.bold, size: 10 });
    currentY -= 14;
    const lines = wrapText(
      input.invoice.notes,
      fonts.regular,
      9,
      PAGE_W - 2 * MARGIN_X,
    );
    for (const l of lines) {
      drawText(page, l, MARGIN_X, currentY, { font: fonts.regular, size: 9 });
      currentY -= 11;
    }
  }

  // Legal block: mandatory mentions + custom legal mentions
  const legalMentions = input.invoice.legalMentions ??
    'Conformément à la loi, tout retard de paiement entraîne des pénalités au taux de 3 fois le taux d\'intérêt légal et une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).';

  currentY -= 8;
  const legalLines = wrapText(legalMentions, fonts.regular, 7.5, PAGE_W - 2 * MARGIN_X);
  for (const l of legalLines) {
    drawText(page, l, MARGIN_X, currentY, {
      font: fonts.regular,
      size: 7.5,
      color: MUTED,
    });
    currentY -= 10;
  }

  // Company footer
  const footerParts = [
    env.COMPANY_NAME,
    env.COMPANY_ADDRESS,
    env.COMPANY_SIRET ? `SIRET ${env.COMPANY_SIRET}` : null,
    env.COMPANY_TVA ? `TVA ${env.COMPANY_TVA}` : null,
  ].filter(Boolean);
  if (footerParts.length) {
    drawText(page, footerParts.join(' - '), MARGIN_X, MARGIN_BOTTOM - 20, {
      font: fonts.regular,
      size: 8,
      color: MUTED,
      maxWidth: PAGE_W - 2 * MARGIN_X,
    });
  }
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function generateInvoicePdf(
  input: InvoicePdfInput,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Facture ${input.invoice.number ?? ''}`);
  doc.setSubject(`Facture ${env.COMPANY_NAME}`);
  doc.setCreator(env.COMPANY_NAME);
  doc.setProducer(env.COMPANY_NAME);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);

  drawHeader(page, { regular, bold });
  let cursorY = drawMetadata(page, { regular, bold }, input, PAGE_H - 110);

  cursorY = drawTableHeader(page, bold, cursorY);

  for (const line of input.lines) {
    if (cursorY < MARGIN_BOTTOM + 140) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      drawHeader(page, { regular, bold });
      cursorY = PAGE_H - 80;
      cursorY = drawTableHeader(page, bold, cursorY);
    }
    cursorY = drawLineRow(page, { regular, bold }, line, cursorY);
  }

  cursorY = drawTotals(page, { regular, bold }, input, cursorY);
  cursorY = drawPaymentBlock(page, { regular, bold }, input, cursorY);
  drawNotesAndFooter(page, { regular, bold }, input, cursorY);

  return await doc.save();
}

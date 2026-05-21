/**
 * Quote PDF generator using pdf-lib.
 *
 * Produces a clean, professional A4 PDF with:
 *  - Company branded header (purple accent matching the dashboard)
 *  - Client / quote metadata block
 *  - Line items table with HT / TVA / Total
 *  - Totals breakdown (HT, discount, TVA, TTC)
 *  - Optional notes
 *  - Legal footer (SIRET, TVA intracom, etc.)
 *
 * No external assets required — standard PDF fonts only. Returns a raw
 * Uint8Array ready to be served or attached to an email.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { env } from '../../config/env';

// ─── Types ──────────────────────────────────────────────────────────────

/** All fields here accept `null` and `undefined` to keep callers free of
 * coercion noise — Drizzle returns `string | undefined` on joined columns
 * even when the column is NOT NULL in the schema. */
export interface QuotePdfInput {
  quote: {
    number: string | undefined;
    createdAt: Date | null | undefined;
    validUntil: Date | null | undefined;
    totalHT: string | null | undefined;
    totalTVA: string | null | undefined;
    totalTTC: string | null | undefined;
    discount: string | null | undefined;
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
    clientOwned?: boolean | null;
  }>;
}

// ─── Layout constants ───────────────────────────────────────────────────

const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN_X = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 60;
const ACCENT = rgb(99 / 255, 102 / 255, 241 / 255); // #6366f1 (brand purple)
const TEXT = rgb(0.118, 0.137, 0.196); // slate-800
const MUTED = rgb(0.392, 0.455, 0.545); // slate-500
const SOFT_BG = rgb(0.973, 0.980, 0.988); // slate-50
const ROW_BORDER = rgb(0.886, 0.910, 0.941); // slate-200

const COLS = {
  description: { x: MARGIN_X, w: 270 },
  quantity: { x: MARGIN_X + 270, w: 50 },
  unitPriceHT: { x: MARGIN_X + 320, w: 70 },
  tvaRate: { x: MARGIN_X + 390, w: 40 },
  totalHT: { x: MARGIN_X + 430, w: 85 },
};

// ─── Helpers ────────────────────────────────────────────────────────────

/** Replace unicode characters that the standard PDF fonts (WinAnsi) can't
 * encode. Intl.NumberFormat in particular slips in narrow no-break spaces
 * around the currency symbol — those would crash pdf-lib otherwise. */
function pdfSafe(s: string): string {
  return s
    .replace(/[   ]/g, ' ') // various non-breaking spaces
    .replace(/[–—]/g, '-') // en/em dashes
    .replace(/[‘’]/g, "'") // smart single quotes
    .replace(/[“”]/g, '"') // smart double quotes
    .replace(/…/g, '...')
    .replace(/•/g, '*')
    .replace(/·/g, '-'); // middle dot
}

function fmtEUR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  const raw = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(isFinite(n) ? n : 0);
  return pdfSafe(raw);
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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
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

  // Right side : "DEVIS" badge
  const badgeY = PAGE_H - 50;
  drawText(page, 'DEVIS', PAGE_W - MARGIN_X - 80, badgeY, {
    font: fonts.bold,
    size: 24,
    color: TEXT,
  });
}

function drawMetadata(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  input: QuotePdfInput,
  topY: number,
): number {
  let y = topY;

  // Two columns: left = client, right = quote info
  // Client block
  drawText(page, 'CLIENT', MARGIN_X, y, {
    font: fonts.bold,
    size: 9,
    color: MUTED,
  });
  y -= 14;
  drawText(
    page,
    `${input.client.firstName} ${input.client.lastName}`.trim(),
    MARGIN_X,
    y,
    { font: fonts.bold, size: 11 },
  );
  y -= 14;
  if (input.client.address) {
    drawText(page, input.client.address, MARGIN_X, y, {
      font: fonts.regular,
      size: 10,
      color: TEXT,
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
      color: TEXT,
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

  // Right block: quote metadata
  let rightY = topY;
  const rightX = MARGIN_X + 300;
  drawText(page, `Devis N° ${input.quote.number}`, rightX, rightY, {
    font: fonts.bold,
    size: 12,
  });
  rightY -= 16;
  drawText(
    page,
    `Date : ${fmtDate(input.quote.createdAt)}`,
    rightX,
    rightY,
    { font: fonts.regular, size: 10, color: TEXT },
  );
  rightY -= 14;
  if (input.quote.validUntil) {
    drawText(
      page,
      `Validité : ${fmtDate(input.quote.validUntil)}`,
      rightX,
      rightY,
      { font: fonts.regular, size: 10, color: TEXT },
    );
    rightY -= 14;
  }
  if (input.project.name) {
    drawText(page, `Chantier : ${input.project.name}`, rightX, rightY, {
      font: fonts.regular,
      size: 10,
      color: TEXT,
      maxWidth: 220,
    });
    rightY -= 14;
  }

  return Math.min(y, rightY) - 16;
}

function drawTableHeader(
  page: PDFPage,
  font: PDFFont,
  y: number,
): number {
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 18,
    width: PAGE_W - 2 * MARGIN_X,
    height: 22,
    color: SOFT_BG,
  });
  drawText(page, 'Désignation', COLS.description.x + 6, y - 13, {
    font,
    size: 9,
    color: MUTED,
  });
  drawText(page, 'Qté', COLS.quantity.x + 6, y - 13, {
    font,
    size: 9,
    color: MUTED,
  });
  drawText(page, 'PU HT', COLS.unitPriceHT.x + 6, y - 13, {
    font,
    size: 9,
    color: MUTED,
  });
  drawText(page, 'TVA', COLS.tvaRate.x + 6, y - 13, {
    font,
    size: 9,
    color: MUTED,
  });
  drawText(page, 'Total HT', COLS.totalHT.x + 6, y - 13, {
    font,
    size: 9,
    color: MUTED,
  });
  return y - 22;
}

function drawLineRow(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont },
  line: QuotePdfInput['lines'][number],
  y: number,
): number {
  const descLines = wrapText(
    line.description,
    fonts.regular,
    10,
    COLS.description.w - 12,
  );
  // Reserve an extra line for the "(fourni par le client)" tag if any.
  const tagLines = line.clientOwned ? 1 : 0;
  const rowHeight = Math.max(20, (descLines.length + tagLines) * 12 + 8);
  const baseY = y - rowHeight + 6;

  // Description (possibly wrapped)
  let descY = y - 12;
  for (const l of descLines) {
    drawText(page, l, COLS.description.x + 6, descY, {
      font: fonts.regular,
      size: 10,
    });
    descY -= 12;
  }

  // "Fourni par le client" tag for clientOwned lines
  if (line.clientOwned) {
    drawText(page, '(fourni par le client)', COLS.description.x + 6, descY, {
      font: fonts.italic,
      size: 8,
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
  const tvaStr = line.clientOwned
    ? '-'
    : `${parseFloat(line.tvaRate).toFixed(0)} %`;
  drawText(page, tvaStr, COLS.tvaRate.x + 6, y - 12, {
    font: fonts.regular,
    size: 10,
  });
  const totalHTStr = line.clientOwned ? '-' : fmtEUR(line.totalHT);
  drawText(page, totalHTStr, COLS.totalHT.x + 6, y - 12, {
    font: fonts.bold,
    size: 10,
  });

  // Bottom border
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
  input: QuotePdfInput,
  y: number,
): number {
  const labelX = MARGIN_X + 300;
  const valueX = PAGE_W - MARGIN_X;
  let currentY = y - 20;
  const writeLine = (label: string, value: string, opts?: { bold?: boolean; accent?: boolean }) => {
    const font = opts?.bold ? fonts.bold : fonts.regular;
    const color = opts?.accent ? ACCENT : TEXT;
    drawText(page, label, labelX, currentY, { font, size: opts?.bold ? 12 : 10, color });
    const valWidth = font.widthOfTextAtSize(value, opts?.bold ? 12 : 10);
    drawText(page, value, valueX - valWidth, currentY, {
      font,
      size: opts?.bold ? 12 : 10,
      color,
    });
    currentY -= opts?.bold ? 18 : 14;
  };

  const discount = parseFloat(input.quote.discount ?? '0');
  writeLine('Sous-total HT', fmtEUR(input.quote.totalHT));
  if (discount > 0) {
    writeLine('Remise HT', `- ${fmtEUR(discount)}`);
  }
  writeLine('TVA', fmtEUR(input.quote.totalTVA));

  // Separator
  page.drawLine({
    start: { x: labelX, y: currentY + 6 },
    end: { x: valueX, y: currentY + 6 },
    color: ROW_BORDER,
    thickness: 0.5,
  });
  currentY -= 4;

  writeLine('Total TTC', fmtEUR(input.quote.totalTTC), {
    bold: true,
    accent: true,
  });
  return currentY;
}

function drawNotesAndFooter(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  notes: string | null | undefined,
  y: number,
) {
  let currentY = y - 8;
  if (notes && notes.trim()) {
    drawText(page, 'Notes', MARGIN_X, currentY, {
      font: fonts.bold,
      size: 10,
    });
    currentY -= 14;
    const lines = wrapText(notes, fonts.regular, 9, PAGE_W - 2 * MARGIN_X);
    for (const l of lines) {
      drawText(page, l, MARGIN_X, currentY, {
        font: fonts.regular,
        size: 9,
        color: TEXT,
      });
      currentY -= 11;
    }
  }

  // Footer (always at the bottom)
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

export async function generateQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Devis ${input.quote.number}`);
  doc.setSubject(`Devis ${env.COMPANY_NAME}`);
  doc.setCreator(env.COMPANY_NAME);
  doc.setProducer(env.COMPANY_NAME);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  let page = doc.addPage([PAGE_W, PAGE_H]);

  drawHeader(page, { regular, bold });
  let cursorY = drawMetadata(page, { regular, bold }, input, PAGE_H - 110);

  cursorY = drawTableHeader(page, bold, cursorY);

  for (const line of input.lines) {
    // Page break if line won't fit
    if (cursorY < MARGIN_BOTTOM + 120) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      drawHeader(page, { regular, bold });
      cursorY = PAGE_H - 80;
      cursorY = drawTableHeader(page, bold, cursorY);
    }
    cursorY = drawLineRow(page, { regular, bold, italic }, line, cursorY);
  }

  cursorY = drawTotals(page, { regular, bold }, input, cursorY);
  drawNotesAndFooter(page, { regular, bold }, input.quote.notes, cursorY);

  return await doc.save();
}

/**
 * High-level rendering for business documents and emails.
 *
 * Builds the Handlebars data context from existing domain inputs, renders the
 * (editable) template and produces either an A4 PDF (via Playwright) or the
 * email subject/html. PDF rendering falls back to the legacy pdf-lib generator
 * if the headless browser is unavailable, so sending never fully breaks.
 */

import { CONTACT_PHONE } from '../../config/contact';
import { env } from '../../config/env';
import { renderTemplateHtml, renderEmailTemplate } from './templates.service';
import { htmlToPdf } from './html-pdf.service';
import { generateQuotePdf, type QuotePdfInput } from '../quotes/quote-pdf.service';
import { generateInvoicePdf, type InvoicePdfInput } from '../invoices/invoice-pdf.service';
import type { QuoteSentEmailVars } from '../email/templates/quote-sent';
import type { InvoiceSentEmailVars } from '../email/templates/invoice-sent';
import type { BookingConfirmationEmailVars } from '../email/templates/booking-confirmation';
import type { AccountWelcomeEmailVars } from '../email/templates/account-welcome';

// ─── Formatting helpers ──────────────────────────────────────────────────

function fmtEUR(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    Number.isFinite(n) ? (n as number) : 0,
  );
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtDateStr(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function cityLine(postalCode?: string | null, city?: string | null): string {
  return [postalCode, city].filter(Boolean).join(' ');
}

function companyContext() {
  const parts = [
    env.COMPANY_NAME,
    env.COMPANY_ADDRESS,
    `Tél. ${CONTACT_PHONE}`,
    env.COMPANY_SIRET ? `SIRET ${env.COMPANY_SIRET}` : '',
    env.COMPANY_TVA ? `TVA ${env.COMPANY_TVA}` : '',
  ].filter(Boolean);
  return {
    name: env.COMPANY_NAME,
    address: env.COMPANY_ADDRESS || '',
    phone: CONTACT_PHONE,
    siret: env.COMPANY_SIRET || '',
    tva: env.COMPANY_TVA || '',
    iban: env.COMPANY_IBAN || '',
    bic: env.COMPANY_BIC || '',
    footer: parts.join(' — '),
  };
}

// ─── Document contexts ─────────────────────────────────────────────────────

export function buildQuoteContext(input: QuotePdfInput): Record<string, unknown> {
  const discountPercent = parseFloat(input.quote.discount ?? '0') || 0;
  const netHT = parseFloat(input.quote.totalHT ?? '0') || 0;
  const grossHT =
    discountPercent > 0 && discountPercent < 100 ? netHT / (1 - discountPercent / 100) : netHT;
  const discountAmount = grossHT - netHT;

  return {
    company: companyContext(),
    quote: {
      number: input.quote.number ?? '',
      date: fmtDate(input.quote.createdAt),
      validUntil: fmtDate(input.quote.validUntil),
      notes: input.quote.notes ?? '',
    },
    client: {
      fullName: `${input.client.firstName ?? ''} ${input.client.lastName ?? ''}`.trim(),
      address: input.client.address ?? '',
      cityLine: cityLine(input.client.postalCode, input.client.city),
      email: input.client.email ?? '',
    },
    project: { name: input.project.name ?? '' },
    lines: input.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: fmtEUR(l.unitPriceHT),
      tvaRate: l.clientOwned ? '—' : `${(parseFloat(l.tvaRate) || 0).toFixed(0)} %`,
      total: l.clientOwned ? '—' : fmtEUR(l.totalHT),
      clientOwned: Boolean(l.clientOwned),
    })),
    totals: {
      subtotalHT: fmtEUR(grossHT),
      hasDiscount: discountPercent > 0,
      discountAmount: fmtEUR(discountAmount),
      tva: fmtEUR(input.quote.totalTVA),
      ttc: fmtEUR(input.quote.totalTTC),
    },
  };
}

export function buildInvoiceContext(input: InvoicePdfInput): Record<string, unknown> {
  const company = companyContext();
  return {
    company: {
      ...company,
      iban: input.payment?.iban || company.iban,
      bic: input.payment?.bic || company.bic,
    },
    invoice: {
      number: input.invoice.number ?? '',
      date: fmtDate(input.invoice.createdAt),
      dueDate: fmtDate(input.invoice.dueDate),
      paymentTerms: input.invoice.paymentTerms ?? '',
      legalMentions: input.invoice.legalMentions ?? '',
    },
    client: {
      fullName: `${input.client.firstName ?? ''} ${input.client.lastName ?? ''}`.trim(),
      address: input.client.address ?? '',
      cityLine: cityLine(input.client.postalCode, input.client.city),
      email: input.client.email ?? '',
    },
    project: { name: input.project.name ?? '' },
    lines: input.lines.map((l) => ({
      description: l.description,
      reference: l.reference ?? '',
      quantity: l.quantity,
      unitPrice: fmtEUR(l.unitPriceHT),
      tvaRate: `${(parseFloat(l.tvaRate) || 0).toFixed(0)} %`,
      total: fmtEUR(l.totalHT),
    })),
    totals: {
      subtotalHT: fmtEUR(input.invoice.totalHT),
      tva: fmtEUR(input.invoice.totalTVA),
      ttc: fmtEUR(input.invoice.totalTTC),
    },
  };
}

// ─── Document PDF rendering (template → Playwright, legacy fallback) ────────

export async function renderQuoteDocumentPdf(input: QuotePdfInput): Promise<Uint8Array> {
  try {
    const html = await renderTemplateHtml('quote-document', buildQuoteContext(input));
    return await htmlToPdf(html);
  } catch (err) {
    console.error('[templates] quote PDF render failed, falling back to pdf-lib:', err);
    return generateQuotePdf(input);
  }
}

export async function renderInvoiceDocumentPdf(input: InvoicePdfInput): Promise<Uint8Array> {
  try {
    const html = await renderTemplateHtml('invoice-document', buildInvoiceContext(input));
    return await htmlToPdf(html);
  } catch (err) {
    console.error('[templates] invoice PDF render failed, falling back to pdf-lib:', err);
    return generateInvoicePdf(input);
  }
}

// ─── Email rendering ───────────────────────────────────────────────────────

export async function renderQuoteEmail(
  v: QuoteSentEmailVars,
): Promise<{ subject: string; html: string }> {
  return renderEmailTemplate('quote-sent', {
    company: companyContext(),
    client: { firstName: v.clientFirstName, lastName: v.clientLastName },
    quote: {
      number: v.quoteNumber,
      totalTTC: fmtEUR(v.totalTTC),
      validUntil: fmtDate(v.validUntil),
    },
    customMessage: v.customMessage ?? '',
    salesPersonName: v.salesPersonName ?? '',
    publicQuoteUrl: v.publicQuoteUrl ?? '',
  });
}

export async function renderInvoiceEmail(
  v: InvoiceSentEmailVars,
): Promise<{ subject: string; html: string }> {
  return renderEmailTemplate('invoice-sent', {
    company: companyContext(),
    client: { firstName: v.clientFirstName, lastName: v.clientLastName },
    invoice: {
      number: v.invoiceNumber,
      totalTTC: fmtEUR(v.totalTTC),
      dueDate: fmtDate(v.dueDate),
    },
    customMessage: v.customMessage ?? '',
    salesPersonName: v.salesPersonName ?? '',
  });
}

export async function renderBookingEmail(
  v: BookingConfirmationEmailVars,
): Promise<{ subject: string; html: string }> {
  return renderEmailTemplate('booking-confirmation', {
    company: companyContext(),
    booking: {
      clientFirstName: v.clientFirstName,
      typeLabel: v.typeLabel,
      dateLabel: fmtDateStr(v.date),
      startTime: v.startTime,
      address: v.address,
      assignedToName: v.assignedToName ?? '',
      manageUrl: v.manageUrl ?? '',
    },
  });
}

export async function renderAccountWelcomeEmail(
  v: AccountWelcomeEmailVars,
): Promise<{ subject: string; html: string }> {
  return renderEmailTemplate('account-welcome', {
    company: companyContext(),
    account: {
      clientFirstName: v.clientFirstName,
      email: v.email,
      tempPassword: v.tempPassword,
      loginUrl: v.loginUrl,
    },
  });
}

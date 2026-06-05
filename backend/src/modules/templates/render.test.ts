import { describe, expect, it } from 'bun:test';
import Handlebars from 'handlebars';
import { buildQuoteContext, buildInvoiceContext } from './render';
import { DEFAULT_LIST, getDefaultTemplate } from './defaults';
import type { QuotePdfInput } from '../quotes/quote-pdf.service';
import type { InvoicePdfInput } from '../invoices/invoice-pdf.service';

const quoteInput: QuotePdfInput = {
  quote: {
    number: 'DEV-2026-001',
    createdAt: new Date('2026-06-01T00:00:00'),
    validUntil: new Date('2026-06-30T00:00:00'),
    totalHT: '900',
    totalTVA: '180',
    totalTTC: '1080',
    discount: '10',
    notes: 'Merci de votre confiance.',
  },
  client: {
    firstName: 'Camille',
    lastName: 'Durand',
    email: 'camille@example.com',
    address: '12 rue des Lilas',
    postalCode: '75011',
    city: 'Paris',
  },
  project: { name: 'Maison connectée', address: null, city: null, postalCode: null },
  lines: [
    {
      description: 'Box domotique',
      quantity: 1,
      unitPriceHT: '500',
      tvaRate: '20',
      totalHT: '500',
      clientOwned: false,
    },
    {
      description: 'Capteur (fourni client)',
      quantity: 2,
      unitPriceHT: '0',
      tvaRate: '20',
      totalHT: '0',
      clientOwned: true,
    },
  ],
};

describe('buildQuoteContext', () => {
  it('reconstruit le sous-total brut et le montant de remise depuis le net + %', () => {
    const ctx = buildQuoteContext(quoteInput) as any;
    // netHT = 900, remise 10% → brut = 900 / 0.9 = 1000, remise = 100
    expect(ctx.totals.subtotalHT).toContain('1 000,00');
    expect(ctx.totals.hasDiscount).toBe(true);
    expect(ctx.totals.discountAmount).toContain('100,00');
  });

  it('marque les lignes fournies par le client avec un tiret', () => {
    const ctx = buildQuoteContext(quoteInput) as any;
    expect(ctx.lines[1].clientOwned).toBe(true);
    expect(ctx.lines[1].total).toBe('—');
    expect(ctx.lines[1].tvaRate).toBe('—');
    expect(ctx.lines[0].clientOwned).toBe(false);
  });

  it('sans remise, le sous-total égale le net et hasDiscount est faux', () => {
    const ctx = buildQuoteContext({
      ...quoteInput,
      quote: { ...quoteInput.quote, discount: '0' },
    }) as any;
    expect(ctx.totals.hasDiscount).toBe(false);
    expect(ctx.totals.subtotalHT).toContain('900,00');
  });
});

const invoiceInput: InvoicePdfInput = {
  invoice: {
    number: 'FAC-2026-001',
    createdAt: new Date('2026-06-01T00:00:00'),
    dueDate: new Date('2026-06-30T00:00:00'),
    totalHT: '1000',
    totalTVA: '200',
    totalTTC: '1200',
    paymentTerms: '30 jours',
    legalMentions: 'TVA non applicable, art. 293 B.',
    notes: null,
  },
  client: {
    firstName: 'Camille',
    lastName: 'Durand',
    email: 'camille@example.com',
    address: '12 rue des Lilas',
    postalCode: '75011',
    city: 'Paris',
  },
  project: { name: 'Maison connectée', address: null, city: null, postalCode: null },
  lines: [
    {
      description: 'Box domotique',
      quantity: 1,
      unitPriceHT: '1000',
      tvaRate: '20',
      totalHT: '1000',
      reference: 'BOX-01',
    },
  ],
  payment: { iban: 'FR76 1234', bic: 'ABCDEFGH' },
};

describe('buildInvoiceContext', () => {
  it('utilise l’IBAN/BIC du paiement quand fournis', () => {
    const ctx = buildInvoiceContext(invoiceInput) as any;
    expect(ctx.company.iban).toBe('FR76 1234');
    expect(ctx.company.bic).toBe('ABCDEFGH');
  });

  it('expose la référence des lignes', () => {
    const ctx = buildInvoiceContext(invoiceInput) as any;
    expect(ctx.lines[0].reference).toBe('BOX-01');
  });
});

describe('templates par défaut', () => {
  it('chaque template se compile et se rend sans token Handlebars résiduel', () => {
    for (const def of DEFAULT_LIST) {
      const html = Handlebars.compile(def.html)(def.sampleData);
      expect(html.length).toBeGreaterThan(0);
      expect(html).not.toContain('{{');
      if (def.subject) {
        const subject = Handlebars.compile(def.subject)(def.sampleData);
        expect(subject).not.toContain('{{');
      }
    }
  });

  it('le template devis déroule la boucle des lignes', () => {
    const def = getDefaultTemplate('quote-document');
    const ctx = buildQuoteContext(quoteInput);
    const html = Handlebars.compile(def.html)(ctx);
    expect(html).toContain('Box domotique');
    expect(html).toContain('Capteur (fourni client)');
  });

  it('échappe le HTML des données client (anti-XSS)', () => {
    const def = getDefaultTemplate('quote-document');
    const ctx = buildQuoteContext({
      ...quoteInput,
      quote: { ...quoteInput.quote, notes: '<script>alert(1)</script>' },
    });
    const html = Handlebars.compile(def.html)(ctx);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

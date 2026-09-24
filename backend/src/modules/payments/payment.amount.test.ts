import { describe, expect, it } from 'bun:test';
import { computeAmountCents, DEFAULT_DEPOSIT_PERCENT } from './payment.amount';

describe('computeAmountCents', () => {
  it('charges the full TTC for an invoice', () => {
    expect(computeAmountCents({ targetType: 'invoice', totalTTC: '1234.56' })).toBe(123456);
  });

  it('charges the full TTC for an order (number input)', () => {
    expect(computeAmountCents({ targetType: 'order', totalTTC: 99.9 })).toBe(9990);
  });

  it('applies the default 30% deposit for a quote', () => {
    expect(DEFAULT_DEPOSIT_PERCENT).toBe(30);
    // 1000 * 0.30 = 300.00 € → 30000 cents
    expect(computeAmountCents({ targetType: 'quote_deposit', totalTTC: '1000.00' })).toBe(30000);
  });

  it('applies a custom deposit percent', () => {
    expect(
      computeAmountCents({ targetType: 'quote_deposit', totalTTC: '1000', depositPercent: 50 })
    ).toBe(50000);
  });

  it('rounds to the nearest cent', () => {
    // 33.333 € deposit of 10% on 333.33 → 33.333 → 3333 cents
    expect(
      computeAmountCents({ targetType: 'quote_deposit', totalTTC: '333.33', depositPercent: 10 })
    ).toBe(3333);
  });

  it('rejects a zero or negative total', () => {
    expect(() => computeAmountCents({ targetType: 'invoice', totalTTC: '0' })).toThrow();
    expect(() => computeAmountCents({ targetType: 'invoice', totalTTC: '-5' })).toThrow();
  });

  it('rejects a non-numeric total', () => {
    expect(() => computeAmountCents({ targetType: 'invoice', totalTTC: 'abc' })).toThrow();
  });

  it('rejects an out-of-range deposit percent', () => {
    expect(() =>
      computeAmountCents({ targetType: 'quote_deposit', totalTTC: '1000', depositPercent: 0 })
    ).toThrow();
    expect(() =>
      computeAmountCents({ targetType: 'quote_deposit', totalTTC: '1000', depositPercent: 150 })
    ).toThrow();
  });
});

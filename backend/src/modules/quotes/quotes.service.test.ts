import { describe, expect, it } from 'bun:test';
import { stripQuoteCostFields } from './quotes.service';

describe('stripQuoteCostFields', () => {
  it('removes cost and margin fields from the quote root', () => {
    const safe = stripQuoteCostFields({
      id: 'q1',
      number: 'DEV-2026-0001',
      totalTTC: '1200.00',
      totalCostHT: '600.00',
      totalMarginHT: '400.00',
      marginPercent: '40.00',
    });

    expect(safe).not.toHaveProperty('totalCostHT');
    expect(safe).not.toHaveProperty('totalMarginHT');
    expect(safe).not.toHaveProperty('marginPercent');
    expect(safe.id).toBe('q1');
    expect(safe.totalTTC).toBe('1200.00');
  });

  it('removes unitCostHT from each line', () => {
    const safe = stripQuoteCostFields({
      id: 'q1',
      lines: [
        { id: 'l1', description: 'Hub', unitPriceHT: '100', unitCostHT: '50' },
        { id: 'l2', description: 'Capteur', unitPriceHT: '30', unitCostHT: '12' },
      ],
    });

    expect(safe.lines).toHaveLength(2);
    for (const line of safe.lines as Record<string, unknown>[]) {
      expect(line).not.toHaveProperty('unitCostHT');
    }
    expect((safe.lines as Record<string, unknown>[])[0]!.description).toBe('Hub');
  });

  it('is a no-op shape when there are no lines', () => {
    const safe = stripQuoteCostFields({ id: 'q1', number: 'DEV-2026-0002' });
    expect(safe).toEqual({ id: 'q1', number: 'DEV-2026-0002' });
  });
});

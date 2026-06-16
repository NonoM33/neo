import { describe, it, expect } from 'bun:test';
import { signatureFilterSchema } from './signatures.schema';

describe('signatureFilterSchema', () => {
  it('applies defaults when nothing is provided', () => {
    const result = signatureFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.status).toBeUndefined();
    expect(result.mode).toBeUndefined();
  });

  it('treats empty status/mode strings as no filter', () => {
    const result = signatureFilterSchema.parse({ status: '', mode: '' });
    expect(result.status).toBeUndefined();
    expect(result.mode).toBeUndefined();
  });

  it('keeps a valid status', () => {
    const result = signatureFilterSchema.parse({ status: 'signed' });
    expect(result.status).toBe('signed');
  });

  it('rejects an invalid status', () => {
    expect(() => signatureFilterSchema.parse({ status: 'bogus' })).toThrow();
  });

  it('keeps a valid mode', () => {
    const result = signatureFilterSchema.parse({ mode: 'direct' });
    expect(result.mode).toBe('direct');
  });

  it('rejects an invalid mode', () => {
    expect(() => signatureFilterSchema.parse({ mode: 'carrier-pigeon' })).toThrow();
  });

  it('coerces page/pageSize from query strings', () => {
    const result = signatureFilterSchema.parse({ page: '3', pageSize: '50' });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it('rejects a pageSize above the cap', () => {
    expect(() => signatureFilterSchema.parse({ pageSize: '500' })).toThrow();
  });

  it('rejects page below 1', () => {
    expect(() => signatureFilterSchema.parse({ page: '0' })).toThrow();
  });
});

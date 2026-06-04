import { describe, expect, it } from 'bun:test';
import { parseSlotRows } from './availability-form';

describe('parseSlotRows', () => {
  it('zips parallel arrays into slots', () => {
    const slots = parseSlotRows(
      ['lundi', 'mardi'],
      ['09:00', '14:00'],
      ['12:00', '18:00']
    );
    expect(slots).toEqual([
      { dayOfWeek: 'lundi', startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 'mardi', startTime: '14:00', endTime: '18:00' },
    ]);
  });

  it('handles a single (non-array) row', () => {
    expect(parseSlotRows('lundi', '09:00', '12:00')).toEqual([
      { dayOfWeek: 'lundi', startTime: '09:00', endTime: '12:00' },
    ]);
  });

  it('returns an empty list when nothing is submitted', () => {
    expect(parseSlotRows(undefined, undefined, undefined)).toEqual([]);
  });

  it('drops rows with an unknown day', () => {
    expect(parseSlotRows(['funday'], ['09:00'], ['12:00'])).toEqual([]);
  });

  it('drops rows with malformed times', () => {
    expect(parseSlotRows(['lundi'], ['9h'], ['12:00'])).toEqual([]);
    expect(parseSlotRows(['lundi'], ['09:00'], [''])).toEqual([]);
  });

  it('drops rows where start is not before end', () => {
    expect(parseSlotRows(['lundi'], ['12:00'], ['12:00'])).toEqual([]);
    expect(parseSlotRows(['lundi'], ['18:00'], ['09:00'])).toEqual([]);
  });

  it('keeps only the valid rows from a mixed submission', () => {
    const slots = parseSlotRows(
      ['lundi', 'mardi', 'mercredi'],
      ['09:00', 'bad', '14:00'],
      ['12:00', '18:00', '17:00']
    );
    expect(slots).toEqual([
      { dayOfWeek: 'lundi', startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: 'mercredi', startTime: '14:00', endTime: '17:00' },
    ]);
  });
});

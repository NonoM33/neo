import { dayOfWeekValues, type DayOfWeek } from './appointments.schema';

export interface ParsedSlot {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

const HHMM = /^\d{2}:\d{2}$/;

function toArray(input: unknown): unknown[] {
  if (input === undefined || input === null) return [];
  return Array.isArray(input) ? input : [input];
}

function isDayOfWeek(value: unknown): value is DayOfWeek {
  return typeof value === 'string' && (dayOfWeekValues as readonly string[]).includes(value);
}

/**
 * Zip the parallel checkbox/time arrays a weekly-availability form submits into
 * clean, validated slots. Rows with an unknown day, malformed time, or a start
 * that is not strictly before the end are dropped. Pure — safe to unit-test.
 *
 * Times are "HH:MM" (zero-padded 24h), so lexical comparison orders them.
 */
export function parseSlotRows(days: unknown, starts: unknown, ends: unknown): ParsedSlot[] {
  const dayList = toArray(days);
  const startList = toArray(starts);
  const endList = toArray(ends);

  const slots: ParsedSlot[] = [];
  for (let i = 0; i < dayList.length; i++) {
    const day = dayList[i];
    const start = startList[i];
    const end = endList[i];

    if (!isDayOfWeek(day)) continue;
    if (typeof start !== 'string' || typeof end !== 'string') continue;
    if (!HHMM.test(start) || !HHMM.test(end)) continue;
    if (start >= end) continue;

    slots.push({ dayOfWeek: day, startTime: start, endTime: end });
  }
  return slots;
}

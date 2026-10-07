import { describe, expect, it } from 'vitest';
import {
  averageOf,
  formatByteRate as formatByteRateRaw,
  formatPercent as formatPercentRaw,
} from './metricFormat';

// ICU separates number and unit with whichever no-break space it prefers.
const plainSpaces = (text: string) => text.replace(/\s/g, ' ');
const formatByteRate = (value: number, locale: string) =>
  plainSpaces(formatByteRateRaw(value, locale));
const formatPercent = (value: number, locale: string) =>
  plainSpaces(formatPercentRaw(value, locale));

describe('formatByteRate', () => {
  it('picks the largest unit that keeps the number at or above one', () => {
    expect(formatByteRate(512, 'en')).toBe('512 byte/s');
    expect(formatByteRate(1_500, 'en')).toBe('1.5 kB/s');
    expect(formatByteRate(23_400_000, 'en')).toBe('23 MB/s');
  });

  it('moves up a unit when rounding would otherwise show 1,000 of the smaller one', () => {
    expect(formatByteRate(999_700, 'en')).toBe('1 MB/s');
    expect(formatByteRate(999.7, 'en')).toBe('1 kB/s');
  });

  it('stops at gigabytes however large the rate', () => {
    expect(formatByteRate(4_000_000_000_000, 'en')).toBe('4,000 GB/s');
  });

  it('formats in the given locale', () => {
    expect(formatByteRate(1_500, 'de')).toBe('1,5 kB/s');
  });
});

describe('formatPercent', () => {
  it('keeps one decimal at most', () => {
    expect(formatPercent(37.46, 'en')).toBe('37.5%');
    expect(formatPercent(150, 'de')).toBe('150 %');
  });
});

describe('averageOf', () => {
  it('leaves gaps out of the mean', () => {
    expect(averageOf([10, null, 20])).toBe(15);
  });

  it('has no mean without a single measurement', () => {
    expect(averageOf([null, null])).toBeNull();
    expect(averageOf([])).toBeNull();
  });
});

const BYTE_UNITS = [
  'byte-per-second',
  'kilobyte-per-second',
  'megabyte-per-second',
  'gigabyte-per-second',
] as const;
const BYTES_PER_UNIT_STEP = 1000;

/** A transfer rate in the largest decimal unit that keeps the number at or above one. */
export function formatByteRate(bytesPerSecond: number, locale: string) {
  let value = bytesPerSecond;
  let unitIndex = 0;
  while (value >= BYTES_PER_UNIT_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT_STEP;
    unitIndex++;
  }

  return value.toLocaleString(locale, {
    style: 'unit',
    unit: BYTE_UNITS[unitIndex],
    maximumFractionDigits: value < 10 ? 1 : 0,
  });
}

export function formatPercent(percent: number, locale: string) {
  return percent.toLocaleString(locale, {
    style: 'unit',
    unit: 'percent',
    maximumFractionDigits: 1,
  });
}

/** The mean of the measured values, leaving gaps out; `null` without any. */
export function averageOf(values: readonly (number | null)[]) {
  let sum = 0;
  let count = 0;
  for (const value of values) {
    if (value === null) continue;
    sum += value;
    count++;
  }
  return count ? sum / count : null;
}

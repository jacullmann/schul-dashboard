const BYTE_UNITS = [
  'byte-per-second',
  'kilobyte-per-second',
  'megabyte-per-second',
  'gigabyte-per-second',
] as const;
const BYTES_PER_UNIT_STEP = 1000;

const fractionDigitsOf = (value: number) => (value < 10 ? 1 : 0);

/** The value as it will be shown, so a unit is chosen by what the reader sees. */
const shownValue = (value: number) => {
  const scale = 10 ** fractionDigitsOf(value);
  return Math.round(value * scale) / scale;
};

/** A transfer rate in the largest decimal unit that keeps the shown number below 1000. */
export function formatByteRate(bytesPerSecond: number, locale: string) {
  const lastUnit = BYTE_UNITS.length - 1;
  let unitIndex = 0;
  while (
    unitIndex < lastUnit &&
    shownValue(bytesPerSecond / BYTES_PER_UNIT_STEP ** unitIndex) >=
      BYTES_PER_UNIT_STEP
  ) {
    unitIndex++;
  }

  const value = bytesPerSecond / BYTES_PER_UNIT_STEP ** unitIndex;
  return value.toLocaleString(locale, {
    style: 'unit',
    unit: BYTE_UNITS[unitIndex],
    maximumFractionDigits: fractionDigitsOf(value),
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

/**
 * Display formatting. Pure and testable, kept apart from calc.js because these
 * decisions are about legibility rather than arithmetic.
 */

const SCALES = [
  { value: 1e15, word: 'quadrillion' },
  { value: 1e12, word: 'trillion' },
  { value: 1e9, word: 'billion' },
  { value: 1e6, word: 'million' },
  { value: 1e3, word: 'thousand' },
];

const groups = new Intl.NumberFormat('en-US');

/** Full precision with thousands separators: 40,041,666,667 */
export function formatExact(n) {
  return groups.format(Math.round(n));
}

/** The version a human can hold in their head: "40.0 billion" */
export function formatWords(n) {
  const abs = Math.abs(n);
  const scale = SCALES.find((s) => abs >= s.value);
  if (!scale) return formatExact(n);
  const scaled = n / scale.value;
  const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(decimals)} ${scale.word}`;
}

/** Masses span grams to gigatonnes, so pick a unit rather than pad zeroes. */
export function formatMass(kg) {
  if (kg >= 1e9) return `${formatWords(kg / 1000)} tonnes`;
  if (kg >= 1000) return `${formatExact(kg / 1000)} tonnes`;
  return `${kg.toFixed(1)} kg`;
}

export function formatMoney(usd) {
  if (usd === null) return 'unknown';
  if (usd >= 1e6) return `$${formatWords(usd)}`;
  return `$${formatExact(usd)}`;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;

/** Coarse duration: the leading unit is the only one anybody reads. */
export function formatDuration(seconds) {
  if (seconds >= YEAR) {
    const years = seconds / YEAR;
    return `${years >= 1e6 ? formatWords(years) : formatExact(years)} years`;
  }
  if (seconds >= DAY) return `${formatExact(seconds / DAY)} days`;
  if (seconds >= HOUR) return `${formatExact(seconds / HOUR)} hours`;
  if (seconds >= MINUTE) return `${formatExact(seconds / MINUTE)} minutes`;
  return `${seconds.toFixed(0)} seconds`;
}

/** Millimetre pitches: trim trailing zeroes so 9.60 reads as 9.6. */
export function formatMm(mm) {
  return `${Number(mm.toFixed(2))} mm`;
}

export function formatKm(km) {
  return `${groups.format(Math.round(km))} km`;
}

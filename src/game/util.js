// Small helpers shared by the game model. Randomness goes through Math.random so tests can seed it.
export const rand = () => Math.random();
export const randInt = (a, b) => Math.floor(a + rand() * (b - a + 1));
export const pick = arr => arr[Math.floor(rand() * arr.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Compact number format: 9999, 12.3K, 4.5M ...
export function fmt(n) {
  n = Math.round(n);
  const a = Math.abs(n);
  if (a < 10000) return String(n);
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let i = -1, v = a;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return (n < 0 ? '-' : '') + (v < 100 ? v.toFixed(1) : Math.round(v)) + units[i];
}

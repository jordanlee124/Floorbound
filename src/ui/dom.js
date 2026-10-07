// DOM helpers shared by the views.
export const $ = sel => document.querySelector(sel);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const rarityClass = rar => `r${rar}`;
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

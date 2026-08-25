const NAMED_VK = {
  enter: 0x0d, tab: 0x09, esc: 0x1b, escape: 0x1b, backspace: 0x08,
  space: 0x20, del: 0x2e, delete: 0x2e, up: 0x26, down: 0x28, left: 0x25,
  right: 0x27, home: 0x24, end: 0x23, pgup: 0x21, pageup: 0x21,
  pgdn: 0x22, pagedown: 0x22, printscreen: 0x2c,
};
const F_KEYS = Array.from({ length: 12 }, (_, i) => 0x70 + i);

export function parseCombo(comboRaw) {
  if (typeof comboRaw !== 'string') return null;
  const combo = comboRaw.trim();
  if (!combo || combo.includes(',')) return null;
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const mods = { ctrl: false, alt: false, shift: false, win: false };
  const keyParts = [];
  for (const raw of parts) {
    const p = raw.toLowerCase();
    if (p === 'ctrl' || p === 'control') mods.ctrl = true;
    else if (p === 'alt') mods.alt = true;
    else if (p === 'shift') mods.shift = true;
    else if (p === 'win' || p === 'meta') mods.win = true;
    else keyParts.push(raw);
  }
  if (keyParts.length !== 1) return null;
  const keyRaw = keyParts[0];
  const key = keyRaw.toLowerCase();
  if (/^[a-z]$/.test(key)) return { mods, key, vk: key.toUpperCase().charCodeAt(0), code: `VK_${key.toUpperCase()}` };
  if (/^[0-9]$/.test(key)) return { mods, key, vk: 0x30 + Number(key), code: `VK_0${key}` };
  if (key in NAMED_VK) {
    const vk = NAMED_VK[key];
    return { mods, key, vk, code: `VK_${vk.toString(16).toUpperCase().padStart(2, '0')}`, named: true };
  }
  if (/^f[1-9]$/.test(key) || /^f1[0-2]$/.test(key)) {
    const n = Number(key.slice(1));
    return { mods, key, vk: F_KEYS[n - 1], code: `VK_${key.slice(1)}`, named: true };
  }
  return null;
}

import { forAction, decodeError, createLogger } from '../util.js';
import { COLORS, createKeyPainter, icon, registerKeyFace, textSvg, wrapText } from '../keyimg.js';

// Binding ayarı boşsa plugin geneli ayarlara düşer (eski kurulumlar için).
async function hotkeySettings(client, id) {
  let settings = await client.getSettings(id).catch(() => ({}));
  if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
    const p = await client.getSettings().catch(() => ({}));
    if (p && typeof p === 'object' && Object.keys(p).length) settings = p;
  }
  return settings && typeof settings === 'object' ? settings : {};
}

export function resolveCombo(settings) {
  let combo = typeof settings?.combo === 'string' ? String(settings.combo).trim() : '';
  if (!combo) {
    const mods = typeof settings?.mods === 'string' ? String(settings.mods).trim() : '';
    const key = typeof settings?.key === 'string' ? String(settings.key).trim() : '';
    if (key && mods && mods !== 'none') combo = `${mods}+${key}`;
    else if (key) combo = key;
  }
  if (!combo) {
    combo = [settings?.hotkey, settings?.shortcut, settings?.value, settings?.preset]
      .map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)[0] ?? '';
  }
  return combo;
}

const KEY_LABELS = { escape: 'Esc', esc: 'Esc', delete: 'Del', del: 'Del', pageup: 'PgUp', pgup: 'PgUp', pagedown: 'PgDn', pgdn: 'PgDn', printscreen: 'PrtSc', backspace: '⌫', enter: '⏎', space: 'Space', up: '↑', down: '↓', left: '←', right: '→' };

export function keyLabel(raw) {
  const key = String(raw).trim();
  const named = KEY_LABELS[key.toLowerCase()];
  if (named) return named;
  return key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}

export function hotkeyView(settings) {
  const combo = resolveCombo(settings);
  if (!combo) return { label: 'KISAYOL', body: icon('type', 72, 74, 40, COLORS.track), sub: 'ayarlanmadı', title: 'Kısayol' };
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  const key = keyLabel(parts.pop() ?? '');
  const mods = parts.map(keyLabel).join(' + ');
  const top = mods ? 68 : 50;
  const keycap = `<rect x="30" y="${top}" width="84" height="${mods ? 46 : 58}" rx="11" fill="#161a22" stroke="${COLORS.track}" stroke-width="2"/>`
    + textSvg(key, { x: 72, y: top + (mods ? 33 : 40), size: mods ? 28 : 34, fill: COLORS.value, weight: 700, maxWidth: 74 });
  return {
    label: 'KISAYOL',
    body: (mods ? textSvg(mods, { x: 72, y: 56, size: 15, fill: COLORS.accent, maxWidth: 124 }) : '') + keycap,
    title: combo,
  };
}

export function typeTextView(settings) {
  const text = String(settings?.text ?? '').trim();
  const corner = settings?.pasteMode === false ? 'YAZ' : 'YAPIŞTIR';
  if (!text) return { label: 'METİN', corner, body: icon('type', 72, 74, 40, COLORS.track), sub: 'metin girilmedi', title: 'Metin' };
  const lines = wrapText(text, 13, 3);
  const first = 80 - (lines.length - 1) * 11;
  const body = lines.map((line, i) => textSvg(line, { x: 72, y: first + i * 22, size: 17, fill: COLORS.value, maxWidth: 124 })).join('');
  return { label: 'METİN', corner, body, sub: `${text.length} karakter`, title: text };
}

// win: windows.js katmanı (runtime ilk kullanımda tembel yükler; testler sahte verir).
export function registerHotkey(client, { win, png, log = createLogger(), painter = createKeyPainter(client, { png, log }) }) {
  registerKeyFace(client, 'send-hotkey', {
    view: hotkeyView, painter, log,
    loadSettings: (event) => hotkeySettings(client, event.context.bindingInstanceId),
  });
  registerKeyFace(client, 'type-text', { view: typeTextView, painter, log });

  const hotkeyDown = forAction('send-hotkey')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await hotkeySettings(client, id);
      const combo = resolveCombo(settings);
      if (!combo) {
        log('hotkey:settings', `settings keys: ${Object.keys(settings).join(',') || 'BOŞ'}`);
        await client.showError(id);
        return;
      }
      const ok = await win.sendCombo(combo);
      if (ok) await client.showSuccess(id); else await client.showError(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      log('hotkey', err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  const typeDown = forAction('type-text')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      const text = String(settings?.text ?? '');
      if (!text) { await client.showError(id); return; }
      const direct = settings?.pasteMode === false;
      const ok = await win.typeText(text, { direct });
      if (ok) await client.showSuccess(id); else await client.showError(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      log('type-text', err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  client.on('action.keyDown', hotkeyDown);
  client.on('action.keyDown', typeDown);
}

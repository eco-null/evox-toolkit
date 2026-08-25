import { forAction, decodeError } from '../util.js';
import { createWindowsLayer } from '../windows.js';

export function registerHotkey(client, { win = createWindowsLayer() } = {}) {
  const hotkeyDown = forAction('send-hotkey')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      let settings = await client.getSettings(id).catch(() => ({}));
      if (!settings || typeof settings !== 'object' || !Object.keys(settings).length) {
        const p = await client.getSettings().catch(() => ({}));
        if (p && typeof p === 'object' && Object.keys(p).length) settings = p;
      }
      let combo = typeof settings?.combo === 'string' ? String(settings.combo).trim() : '';
      if (!combo) {
        const mods = typeof settings?.mods === 'string' ? String(settings.mods).trim() : '';
        const key = typeof settings?.key === 'string' ? String(settings.key).trim() : '';
        if (key && mods && mods !== 'none') combo = `${mods}+${key}`;
        else if (key) combo = key;
      }
      if (!combo) {
        combo = [settings.hotkey, settings.shortcut, settings.value, settings.preset]
          .map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)[0] ?? '';
      }
      if (!combo) {
        console.error('[hotkey] settings keys:', Object.keys(settings || {}).length ? Object.keys(settings).join(',') : 'BOŞ');
        await client.showError(id);
        return;
      }
      const ok = await win.sendCombo(combo);
      if (ok) await client.showSuccess(id); else await client.showError(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[hotkey]', err?.message || err);
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
      console.error('[type-text]', err?.message || err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  client.on('action.keyDown', hotkeyDown);
  client.on('action.keyDown', typeDown);
}

import { forAction, decodeError } from '../util.js';
import { createWindowsLayer } from '../windows.js';

export function registerHotkey(client, { win = createWindowsLayer() } = {}) {
  const hotkeyDown = forAction('hotkey')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      const combo = String((settings?.combo ?? '').trim() || settings?.preset || settings?.hotkey || '');
      if (!combo) { await client.showError(id); return; }
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

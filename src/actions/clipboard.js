import { forAction, decodeError } from '../util.js';
import { createWindowsLayer } from '../windows.js';

export function registerClipboard(client, { win = createWindowsLayer() } = {}) {
  const values = new Map();

  const handler = forAction('clipboard')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      if (settings?.mode === 'paste') {
        const v = values.get(id);
        if (!v) { await client.showError(id); return; }
        const ok = (await win.setClipboard(v)) && (await win.sendCombo('Ctrl+V'));
        if (ok) await client.showSuccess(id); else await client.showError(id);
        return;
      }
      const v = await win.getClipboard();
      values.set(id, v);
      const preview = settings?.preview !== false;
      await client.setTitle(id, preview ? (v.length > 12 ? v.slice(0, 12) + '…' : v) : 'Kopyalandı');
      await client.showSuccess(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[clipboard]', err?.message || err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  const onGone = forAction('clipboard')((event) => values.delete(event.context.bindingInstanceId));
  client.on('action.keyDown', handler);
  client.on('action.willDisappear', onGone);
}

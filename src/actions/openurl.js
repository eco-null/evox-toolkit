import { forAction, decodeError } from '../util.js';

export function registerOpenUrl(client, { win } = {}) {
  const handler = forAction('open-url')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      const url = String(settings?.url ?? '');
      const ok = url ? await win.openExternal(url) : false;
      if (ok) await client.showSuccess(id); else await client.showError(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[open-url]', err?.message || err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });
  client.on('action.keyDown', handler);
}

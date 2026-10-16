import { forAction, decodeError, createLogger } from '../util.js';

// win: windows.js katmanı (runtime ilk kullanımda tembel yükler; testler sahte verir).
export function registerOpenUrl(client, { win, log = createLogger() }) {
  const handler = forAction('open-url')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      const url = String(settings?.url ?? '');
      const ok = url ? await win.openExternal(url) : false;
      if (ok) await client.showSuccess(id); else await client.showError(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      log('open-url', err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });
  client.on('action.keyDown', handler);
}

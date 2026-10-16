import { forAction, decodeError, createLogger } from '../util.js';
import { COLORS, createKeyPainter, icon, registerKeyFace } from '../keyimg.js';

export function urlHost(value) {
  try {
    return new URL(String(value ?? '').trim()).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function openUrlView(settings) {
  const host = urlHost(settings?.url);
  return {
    label: 'URL',
    body: icon('link', 72, 72, 40, host ? COLORS.accent : COLORS.track),
    sub: host || 'adres girilmedi',
    subColor: host ? COLORS.value : COLORS.label,
    title: host || 'URL',
  };
}

// win: windows.js katmanı (runtime ilk kullanımda tembel yükler; testler sahte verir).
export function registerOpenUrl(client, { win, png, log = createLogger(), painter = createKeyPainter(client, { png, log }) }) {
  registerKeyFace(client, 'open-url', { view: openUrlView, painter, log });

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

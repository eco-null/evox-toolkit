import { forAction, decodeError, createLogger } from '../util.js';
import { COLORS, createKeyPainter, icon, registerKeyFace, textSvg, wrapText } from '../keyimg.js';

export function clipboardView(settings, value) {
  const paste = settings?.mode === 'paste';
  const corner = paste ? 'YAPIŞTIR' : 'KOPYALA';
  if (!value) {
    return {
      label: 'PANO', corner, cornerColor: paste ? COLORS.accent : COLORS.label,
      body: icon('clipboard', 72, 74, 42, COLORS.track),
      sub: paste ? 'önce kopyala' : 'kopyalamak için bas',
      title: paste ? 'Yapıştır' : 'Kopyala',
    };
  }
  const body = settings?.preview === false
    ? icon('clipboard', 72, 74, 42, COLORS.ok)
    : wrapText(value, 13, 3).map((line, i, lines) => textSvg(line, {
      x: 72, y: 80 - (lines.length - 1) * 11 + i * 22, size: 17, fill: COLORS.value, maxWidth: 124,
    })).join('');
  return {
    label: 'PANO', corner, cornerColor: paste ? COLORS.accent : COLORS.label,
    body,
    sub: `${value.length} karakter`,
    title: settings?.preview === false ? 'Kopyalandı' : (value.length > 12 ? `${value.slice(0, 12)}…` : value),
  };
}

// win: windows.js katmanı (runtime ilk kullanımda tembel yükler; testler sahte verir).
export function registerClipboard(client, { win, png, log = createLogger(), painter = createKeyPainter(client, { png, log }) }) {
  const values = new Map();
  const repaint = registerKeyFace(client, 'clipboard', {
    view: (settings, id) => clipboardView(settings, values.get(id)), painter, log,
  });

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
      await repaint(id, settings);
      await client.showSuccess(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      log('clipboard', err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  const onGone = forAction('clipboard')((event) => values.delete(event.context.bindingInstanceId));
  client.on('action.keyDown', handler);
  client.on('action.willDisappear', onGone);
}

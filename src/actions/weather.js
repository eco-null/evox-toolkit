import { forAction, decodeError } from '../util.js';

export function registerWeather(client, { fetchImpl = globalThis.fetch } = {}) {
  const render = forAction('weather')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const settings = await client.getSettings(id);
      const city = String(settings?.city ?? '').trim();
      if (!city) { await client.setTitle(id, 'Şehir seçin'); return; }
      const res = await fetchImpl(`https://wttr.in/${encodeURIComponent(city)}?format=%t|%h`);
      if (!res.ok) throw new Error('weather fetch failed');
      const text = String(await res.text()).trim();
      const [temp, humidity] = text.split('|').map((s) => s.trim());
      await client.setTitle(id, `${temp || city}\n${humidity || ''}`.trim());
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[weather]', err?.message || err);
      try { await client.setTitle(id, '—'); await client.showError(id); } catch { /* ignore */ }
    }
  });

  client.on('action.willAppear', render);
  client.on('action.keyDown', render);
  client.on('action.settingsChanged', render);
}

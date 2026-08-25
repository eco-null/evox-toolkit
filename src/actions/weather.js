import { forAction, decodeError } from '../util.js';
import { renderKey } from '../keyimg.js';

export function registerWeather(client, { fetchImpl = globalThis.fetch, png } = {}) {
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
      const rows = [{ text: temp || '°', color: '#9adcff', size: 34 }];
      if (humidity) rows.push({ text: humidity, size: 26 });
      await renderKey(client, id, rows, png ? { png } : {});
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

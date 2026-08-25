import { forAction, decodeError, timedTask, clamp } from '../util.js';
import { renderKey } from '../keyimg.js';

export function registerWeather(client, { fetchImpl = globalThis.fetch, png } = {}) {
  const tasks = new Map();

  const stopBind = (id) => {
    const t = tasks.get(id);
    if (t) { t.stop(); tasks.delete(id); }
  };

  const startBind = async (event) => {
    const id = event.context.bindingInstanceId;
    stopBind(id);
    const b = { lastFetch: 0, rows: null, intervalMs: 30 * 60 * 1000 };

    const tick = async () => {
      const settings = await client.getSettings(id).catch(() => ({}));
      const city = String(settings?.city ?? '').trim();
      b.intervalMs = (clamp(Number(settings?.interval) || 30, 1, 24 * 60)) * 60 * 1000;
      if (!city) {
        b.rows = null;
        await client.setTitle(id, 'Şehir seçin');
        return;
      }
      if (Date.now() - b.lastFetch >= b.intervalMs) {
        try {
          const res = await fetchImpl(`https://wttr.in/${encodeURIComponent(city)}?format=%t|%h`);
          if (!res.ok) throw new Error('weather fetch failed');
          const text = String(await res.text()).trim();
          const [temp, humidity] = text.split('|').map((s) => s.trim());
          b.rows = [{ text: temp || '°', color: '#9adcff', size: 34 }];
          if (humidity) b.rows.push({ text: humidity, size: 26 });
          b.lastFetch = Date.now();
        } catch (err) {
          b.rows = null;
          try { await client.setTitle(id, '—'); await client.showError(id); } catch { /* ignore */ }
          if (decodeError(err).silent) return;
          throw err;
        }
      }
      if (b.rows) await renderKey(client, id, b.rows, png ? { png } : {});
    };

    try { await tick(); } catch (err) { console.error('[weather]', String(err?.message || err)); }
    const task = timedTask(tick, 5000);
    task.start();
    tasks.set(id, task);
  };

  client.on('action.willAppear', forAction('weather')(startBind));
  client.on('action.keyDown', forAction('weather')(startBind));
  client.on('action.settingsChanged', forAction('weather')(startBind));
  client.on('action.willDisappear', forAction('weather')((event) => stopBind(event.context.bindingInstanceId)));
}

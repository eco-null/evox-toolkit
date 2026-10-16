// Hava: wttr.in'den sıcaklık + nem. Tuş göründüğünde ve ayar aralığında (dk) bir kez çeker,
// basınca hemen yeniler. Tuş kaybolunca (CONTEXT_EXPIRED dahil) zamanlayıcı kalkar.
import { forAction, decodeError, clamp, createLogger } from '../util.js';
import { renderKey } from '../keyimg.js';

const FETCH_TIMEOUT_MS = 10_000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function intervalMinutes(settings) {
  return clamp(Number(settings?.interval) || 30, 1, 24 * 60);
}

export function weatherRows(text) {
  const [temp, humidity] = String(text).trim().split('|').map((s) => s.trim());
  const rows = [{ text: temp || '°', color: '#9adcff', size: 34 }];
  if (humidity) rows.push({ text: humidity, size: 26 });
  return rows;
}

export function registerWeather(client, { fetchImpl = globalThis.fetch, png, log = createLogger() } = {}) {
  const bindings = new Map();

  const stop = (id) => {
    const b = bindings.get(id);
    if (!b) return;
    b.stopped = true;
    clearInterval(b.timer);
    bindings.delete(id);
  };

  const title = async (b, text) => {
    await client.setTitle(b.id, text);
    b.titled = text !== '';
  };

  async function refresh(b) {
    if (b.busy || b.stopped) return;
    b.busy = true;
    try {
      if (!b.city) { await title(b, 'Şehir seçin'); return; }
      let rows;
      try {
        const res = await fetchImpl(`https://wttr.in/${encodeURIComponent(b.city)}?format=%t|%h`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
        rows = weatherRows(await res.text());
      } catch (err) {
        log('weather:fetch', err);
        if (b.stopped) return;
        await title(b, '—');
        await client.showError(b.id);
        return;
      }
      if (b.stopped) return;
      if (await renderKey(client, b.id, rows, png ? { png } : {})) {
        if (b.titled) await title(b, '');
      } else {
        b.titled = true;
      }
    } catch (err) {
      if (decodeError(err).silent) stop(b.id);
      else log('weather', err);
    } finally {
      b.busy = false;
    }
  }

  async function start(event) {
    const id = event.context.bindingInstanceId;
    stop(id);
    const b = { id, city: '', timer: null, busy: false, stopped: false, titled: false };
    bindings.set(id, b);
    let settings = event.payload?.settings;
    if (!isPlainObject(settings)) settings = await client.getSettings(id).catch(() => ({}));
    if (b.stopped) return;
    b.city = String(settings?.city ?? '').trim();
    b.timer = setInterval(() => { void refresh(b); }, intervalMinutes(settings) * 60 * 1000);
    await refresh(b);
  }

  client.on('action.willAppear', forAction('weather')(start));
  client.on('action.keyDown', forAction('weather')(start));
  client.on('action.settingsChanged', forAction('weather')(start));
  client.on('action.willDisappear', forAction('weather')((event) => stop(event.context.bindingInstanceId)));

  return { bindings, stopAll() { for (const id of [...bindings.keys()]) stop(id); } };
}

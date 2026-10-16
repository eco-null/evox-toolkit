// Hava: wttr.in JSON (j1) — sıcaklık, nem, günün en düşük/en yüksek değeri ve hava kodundan
// ikon. Tuş göründüğünde ve ayar aralığında (dk) bir kez çeker, basınca hemen yeniler.
// Tuş kaybolunca (CONTEXT_EXPIRED dahil) zamanlayıcı kalkar.
import { forAction, decodeError, clamp, createLogger } from '../util.js';
import { COLORS, createKeyPainter, icon, textSvg } from '../keyimg.js';

const FETCH_TIMEOUT_MS = 10_000;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function intervalMinutes(settings) {
  return clamp(Number(settings?.interval) || 30, 1, 24 * 60);
}

// WorldWeatherOnline hava kodları → ikon türü.
const KIND_BY_CODE = new Map([
  [[113], 'clear'],
  [[116], 'partly'],
  [[119, 122], 'cloud'],
  [[143, 248, 260], 'fog'],
  [[200, 386, 389, 392, 395], 'thunder'],
  [[176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 353, 356, 359], 'rain'],
  [[179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377], 'snow'],
].flatMap(([codes, kind]) => codes.map((code) => [code, kind])));

export function weatherKind(code) {
  return KIND_BY_CODE.get(Number(code)) ?? 'cloud';
}

// "07:17 AM" → gün içindeki dakika.
export function clockMinutes(value) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(value ?? '').trim());
  if (!m) return null;
  const hours = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return hours * 60 + Number(m[2]);
}

function num(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// Gece/gündüz ayrımı bilgisayarın yerel saatiyle yapılır; şehir aynı saat dilimindeyse doğrudur.
export function parseWeather(json, now = new Date()) {
  const current = json?.current_condition?.[0];
  if (!current) throw new Error('wttr.in yanıtında güncel hava yok');
  const today = json.weather?.[0];
  const astronomy = today?.astronomy?.[0];
  const rise = clockMinutes(astronomy?.sunrise);
  const set = clockMinutes(astronomy?.sunset);
  const minute = now.getHours() * 60 + now.getMinutes();
  return {
    temp: num(current.temp_C),
    feels: num(current.FeelsLikeC),
    humidity: num(current.humidity),
    min: num(today?.mintempC),
    max: num(today?.maxtempC),
    kind: weatherKind(current.weatherCode),
    night: rise != null && set != null ? minute < rise || minute >= set : false,
  };
}

const ICON_COLORS = Object.freeze({
  sun: '#fbbf24', moon: '#c4b5fd', cloud: '#9aa4b8', rain: '#60a5fa', snow: '#e0f2fe', thunder: '#fbbf24', fog: '#8b93a7',
});

function weatherIcon(kind, night, cx, cy, size) {
  const sky = night ? 'moon' : 'sun';
  if (kind === 'clear') return icon(sky, cx, cy, size, ICON_COLORS[sky]);
  if (kind === 'partly') {
    return icon(sky, cx - size * 0.2, cy - size * 0.2, size * 0.62, ICON_COLORS[sky])
      + icon('cloud', cx + size * 0.08, cy + size * 0.1, size * 0.82, ICON_COLORS.cloud);
  }
  return icon(kind, cx, cy, size, ICON_COLORS[kind] ?? ICON_COLORS.cloud);
}

function degrees(value) {
  return value == null ? '—' : `${Math.round(value)}°`;
}

export function tempColor(celsius) {
  if (celsius == null) return COLORS.value;
  if (celsius >= 30) return COLORS.hot;
  if (celsius >= 24) return COLORS.warn;
  if (celsius <= 5) return COLORS.accent;
  return COLORS.value;
}

export function weatherView(city, w) {
  const label = String(city).toLocaleUpperCase('tr-TR');
  const humidity = w.humidity == null ? '' : `${Math.round(w.humidity)}%`;
  const body = weatherIcon(w.kind, w.night, 42, 76, 48)
    + textSvg(degrees(w.temp), { x: 104, y: 88, size: 34, fill: tempColor(w.temp), weight: 700, maxWidth: 66 })
    // Damla, sağa yaslı nem metninin hemen soluna (yaklaşık glif genişliği 14px * 0.58).
    + (humidity ? icon('drop', 132 - humidity.length * 8.1 - 9, 19, 13, COLORS.accent) : '');
  return {
    label,
    corner: humidity,
    cornerColor: COLORS.accent,
    body,
    // Günün en düşük / en yüksek değeri. Oklar küçük puntoda "1" gibi okunduğu için kullanılmaz.
    sub: w.min != null && w.max != null ? `${degrees(w.min)} / ${degrees(w.max)}` : '',
    title: [city, degrees(w.temp), humidity].filter(Boolean).join('\n'),
  };
}

export function messageView(city, message) {
  return {
    label: city ? String(city).toLocaleUpperCase('tr-TR') : 'HAVA',
    body: icon('cloud', 72, 74, 44, COLORS.track),
    sub: message,
    title: message,
  };
}

export function registerWeather(client, { fetchImpl = globalThis.fetch, png, log = createLogger(), painter = createKeyPainter(client, { png, log }), now = () => new Date() } = {}) {
  const bindings = new Map();

  const stop = (id) => {
    const b = bindings.get(id);
    if (!b) return;
    b.stopped = true;
    clearInterval(b.timer);
    bindings.delete(id);
  };

  async function refresh(b) {
    if (b.busy || b.stopped) return;
    b.busy = true;
    try {
      if (!b.city) { await painter.paint(b.id, messageView('', 'Şehir seçin')); return; }
      let weather;
      try {
        const res = await fetchImpl(`https://wttr.in/${encodeURIComponent(b.city)}?format=j1`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
        weather = parseWeather(await res.json(), now());
      } catch (err) {
        log('weather:fetch', err);
        if (b.stopped) return;
        await painter.paint(b.id, messageView(b.city, 'bağlantı yok'));
        await client.showError(b.id);
        return;
      }
      if (!b.stopped) await painter.paint(b.id, weatherView(b.city, weather));
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
    const b = { id, city: '', timer: null, busy: false, stopped: false };
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
  client.on('action.willDisappear', forAction('weather')((event) => {
    stop(event.context.bindingInstanceId);
    painter.forget(event.context.bindingInstanceId);
  }));

  return { bindings, stopAll() { for (const id of [...bindings.keys()]) stop(id); } };
}

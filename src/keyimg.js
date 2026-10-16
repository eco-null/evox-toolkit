// Tuş kartı: evox-sysmon ile aynı 144x144 düzen. Sol üstte etiket, sağ üstte küçük bilgi,
// ortada gövde (büyük değer ya da aksiyonun çizdiği içerik), altta alt satır. SVG → PNG.
import { decodeError, escapeXml, forAction } from './util.js';
import { iconSvg } from './icons.js';

export const KEY_SIZE = 144;

export const COLORS = Object.freeze({
  background: '#0d0f14',
  track: '#1f2430',
  label: '#8b93a7',
  value: '#f3f4f6',
  accent: '#9adcff',
  ok: '#34d399',
  warn: '#fbbf24',
  hot: '#f87171',
});

// Metni verilen genişliğe sığdırmak için yazı boyutunu küçültür (yaklaşık glif genişliği).
function fitSize(value, size, maxWidth) {
  const estimate = String(value).length * size * 0.58;
  return estimate > maxWidth ? Math.max(9, Math.floor((size * maxWidth) / estimate)) : size;
}

export function textSvg(value, { x, y, size, fill, anchor = 'middle', weight = 600, maxWidth = 124 }) {
  if (value === undefined || value === null || value === '') return '';
  const fitted = fitSize(value, size, maxWidth);
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Segoe UI, Arial, sans-serif" font-size="${fitted}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;
}

// Önizleme metnini en fazla `maxLines` satıra böler; sığmayan son satır "…" ile biter.
export function wrapText(value, maxChars, maxLines) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (let word of words) {
    while (word.length > maxChars) {
      if (line) { lines.push(line); line = ''; }
      lines.push(word.slice(0, maxChars));
      word = word.slice(maxChars);
    }
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, maxChars - 1)}…`;
  return kept;
}

export function icon(name, cx, cy, size, color) {
  return iconSvg(name, { cx, cy, size, color });
}

/**
 * view: { label, corner?, cornerColor?, body?, value?, valueSize?, valueColor?, sub?, subColor?, title? }
 * `body` aksiyonun çizdiği hazır SVG parçasıdır; yoksa `value` ortada büyük yazılır.
 * `title` görsel çizilemezse tuşa yazılacak metindir.
 */
export function buildKeySvg(view) {
  const s = KEY_SIZE;
  const body = view.body ?? textSvg(view.value || '—', {
    x: s / 2, y: 88, size: view.valueSize || 40, fill: view.valueColor || COLORS.value, weight: 700, maxWidth: 120,
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">`,
    `<rect width="${s}" height="${s}" rx="18" fill="${COLORS.background}"/>`,
    textSvg(view.label, { x: 12, y: 24, size: 15, fill: COLORS.label, anchor: 'start', weight: 700, maxWidth: view.corner ? 70 : 120 }),
    textSvg(view.corner, { x: s - 12, y: 24, size: 14, fill: view.cornerColor || COLORS.label, anchor: 'end', maxWidth: 60 }),
    body,
    textSvg(view.sub, { x: s / 2, y: 132, size: 15, fill: view.subColor || COLORS.label, maxWidth: 126 }),
    '</svg>',
  ].join('');
}

// Görsel çizilemezse tuşa yazılacak kısa metin (host başlığı en fazla 120 karakter).
export function viewText(view) {
  const text = view.title ?? [view.label, view.value, view.sub].filter(Boolean).join('\n');
  return String(text || '—').slice(0, 120);
}

// sharp native modül; host handshake'ini (5 sn) bekletmemek için ilk çizimde yüklenir.
let sharpModule = null;
export async function svgToPng(svg) {
  sharpModule ??= import('sharp').then((m) => m.default);
  const sharp = await sharpModule;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

// 'image': görsel gönderildi; 'title': metin başlığa düştü; 'skipped': host hız sınırında.
// Bağlam gittiyse (CONTEXT_EXPIRED / PLUGIN_DISABLED) hata çağırana döner.
export async function renderKey(client, contextId, view, { png = svgToPng, svg = buildKeySvg(view) } = {}) {
  try {
    const buf = await png(svg);
    await client.setImage(contextId, { kind: 'raster', mimeType: 'image/png', dataBase64: buf.toString('base64') });
    return 'image';
  } catch (err) {
    if (decodeError(err).silent) throw err;
    if (err?.code === 'RATE_LIMITED') return 'skipped';
  }
  await client.setTitle(contextId, viewText(view));
  return 'title';
}

// Tuş başına son kartı hatırlar: aynı kart tekrar gönderilmez, görsel geri gelince metin
// başlığı temizlenir. Host hataları burada kalır; yalnız bağlam kaybı çağırana iletilir.
export function createKeyPainter(client, { png, log = () => {} } = {}) {
  const keys = new Map();
  const options = png ? { png } : {};
  return {
    async paint(id, view) {
      const svg = buildKeySvg(view);
      const state = keys.get(id) ?? { svg: null, titled: false };
      keys.set(id, state);
      if (state.svg === svg) return;
      try {
        const result = await renderKey(client, id, view, { ...options, svg });
        if (result === 'image') {
          state.svg = svg;
          if (state.titled) { state.titled = false; await client.setTitle(id, ''); }
        } else if (result === 'title') {
          state.svg = null;
          state.titled = true;
          log('image', new Error('kart çizilemedi, metin gösteriliyor'));
        }
      } catch (err) {
        if (decodeError(err).silent) { keys.delete(id); throw err; }
        log('paint', err);
      }
    },
    invalidate(id) {
      const state = keys.get(id);
      if (state) state.svg = null;
    },
    forget(id) {
      keys.delete(id);
    },
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Basınca çalışan aksiyonların duran yüzü: tuş göründüğünde ve ayarı değiştiğinde
// `view(settings, id)` kartını çizer. Döndürdüğü fonksiyon kartı elle yeniden çizer.
export function registerKeyFace(client, actionId, { view, painter, log = () => {}, loadSettings }) {
  const load = loadSettings ?? (async (event) => {
    const provided = event.payload?.settings;
    if (isPlainObject(provided)) return provided;
    return client.getSettings(event.context.bindingInstanceId).catch(() => ({}));
  });
  const repaint = async (id, settings) => {
    try {
      await painter.paint(id, view(isPlainObject(settings) ? settings : {}, id));
    } catch (err) {
      if (!decodeError(err).silent) log(`face:${actionId}`, err);
    }
  };
  const onShow = forAction(actionId)(async (event) => repaint(event.context.bindingInstanceId, await load(event)));
  client.on('action.willAppear', onShow);
  client.on('action.settingsChanged', onShow);
  client.on('action.willDisappear', forAction(actionId)((event) => painter.forget(event.context.bindingInstanceId)));
  return repaint;
}

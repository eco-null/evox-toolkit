import { decodeError, escapeXml } from './util.js';

export function buildKeySvg(rows) {
  const items = (Array.isArray(rows) && rows.length ? rows : [{ text: '—' }])
    .slice(0, 2)
    .map((r) => ({ text: String(r.text ?? ''), color: r.color ?? '#ffffff', size: r.size ?? 34 }));
  if (items.length === 1 && items[0].text === '') items[0].text = '—';
  const parts = ['<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">',
    '<rect width="128" height="128" rx="12" fill="#101014"/>'];
  if (items.length === 1) {
    parts.push(textSvg(items[0], 64, 80));
  } else {
    parts.push(textSvg(items[0], 64, 52));
    parts.push(textSvg(items[1], 64, 96));
  }
  parts.push('</svg>');
  return parts.join('');
}

function textSvg(item, x, y) {
  const est = String(item.text).length * item.size * 0.56;
  const size = est > 116 ? Math.floor(item.size * 116 / est) : item.size;
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-family="Segoe UI, Arial, sans-serif" fill="${item.color}">${escapeXml(item.text)}</text>`;
}

// sharp native modül; host handshake'ini (5 sn) bekletmemek için ilk çizimde yüklenir.
let sharpModule = null;
export async function svgToPng(svg) {
  sharpModule ??= import('sharp').then((m) => m.default);
  const sharp = await sharpModule;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// true: görsel gönderildi. Bağlam gittiyse (CONTEXT_EXPIRED) hata çağırana döner; host hız
// sınırındaysa (RATE_LIMITED) bu adım atlanır; diğer hatalarda metin başlığa düşer.
export async function renderKey(client, contextId, rows, { png = svgToPng } = {}) {
  try {
    const buf = await png(buildKeySvg(rows));
    await client.setImage(contextId, { kind: 'raster', mimeType: 'image/png', dataBase64: buf.toString('base64') });
    return true;
  } catch (err) {
    if (decodeError(err).silent) throw err;
    if (err?.code === 'RATE_LIMITED') return false;
  }
  const text = (Array.isArray(rows) ? rows : []).map((r) => r.text).join('\n');
  await client.setTitle(contextId, text);
  return false;
}

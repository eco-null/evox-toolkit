import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKeySvg, createKeyPainter, registerKeyFace, renderKey, svgToPng, viewText, wrapText } from '../src/keyimg.js';
import { ICON_NAMES, iconSvg } from '../src/icons.js';
import { hotkeyView, keyLabel, typeTextView } from '../src/actions/hotkey.js';
import { openUrlView, urlHost } from '../src/actions/openurl.js';
import { clipboardView } from '../src/actions/clipboard.js';
import { makeFakeClient } from './helpers/fake-client.js';

const png = async (svg) => Buffer.from(svg);
const gone = () => Object.assign(new Error('gone'), { code: 'CONTEXT_EXPIRED' });

test('kart etiket, köşe, değer ve alt satırı çizer; metin kaçışlıdır', () => {
  const svg = buildKeySvg({ label: 'SAYAÇ', corner: '67%', value: 'A<B&C', sub: 'alt' });
  for (const part of ['width="144"', 'SAYAÇ', '67%', 'A&lt;B&amp;C', 'alt']) assert.ok(svg.includes(part), part);
});

test('değer yoksa tire, body verilirse değerin yerine geçer', () => {
  assert.ok(buildKeySvg({ label: 'X' }).includes('—'));
  const svg = buildKeySvg({ label: 'X', value: 'gizli', body: '<circle r="1"/>' });
  assert.ok(svg.includes('<circle r="1"/>') && !svg.includes('gizli'));
});

test('viewText title varsa onu, yoksa etiket/değer/alt satırı kullanır', () => {
  assert.equal(viewText({ label: 'CPU', value: '12%', sub: 'x' }), 'CPU\n12%\nx');
  assert.equal(viewText({ label: 'CPU', title: '12' }), '12');
});

test('wrapText satırlara böler, uzun kelimeyi keser, fazlasını … ile bitirir', () => {
  assert.deepEqual(wrapText('merhaba dünya nasılsın', 13, 3), ['merhaba dünya', 'nasılsın']);
  assert.deepEqual(wrapText('0123456789ABCDEF', 13, 3), ['0123456789ABC', 'DEF']);
  assert.deepEqual(wrapText('a b c d e f g', 3, 2), ['a b', 'c …']);
});

test('tüm ikonlar geçerli SVG grubu üretir', () => {
  for (const name of ICON_NAMES) assert.match(iconSvg(name, { cx: 72, cy: 72, size: 40, color: '#fff' }), /^<g .*<\/g>$/);
  assert.equal(iconSvg('yok', { cx: 0, cy: 0, size: 1, color: '#fff' }), '');
});

test('renderKey PNG gönderir; çizim olmazsa başlığa düşer; hız sınırında atlar', async () => {
  const client = makeFakeClient();
  assert.equal(await renderKey(client, 'b1', { value: '1' }, { png }), 'image');
  assert.equal(client.calls.setImage[0][1].mimeType, 'image/png');
  assert.equal(await renderKey(client, 'b1', { label: 'A', value: '1' }, { png: async () => { throw new Error('sharp yok'); } }), 'title');
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'A\n1']);
  client.setImage = async () => { throw Object.assign(new Error('slow'), { code: 'RATE_LIMITED' }); };
  assert.equal(await renderKey(client, 'b1', { value: '1' }, { png }), 'skipped');
  client.setImage = async () => { throw gone(); };
  await assert.rejects(renderKey(client, 'b1', { value: '1' }, { png }), { code: 'CONTEXT_EXPIRED' });
});

test('çizici aynı kartı tekrar göndermez, görsel dönünce başlığı temizler', async () => {
  const client = makeFakeClient();
  let fail = true;
  const painter = createKeyPainter(client, { png: async (svg) => { if (fail) throw new Error('x'); return Buffer.from(svg); } });
  await painter.paint('b1', { value: '1' });
  assert.deepEqual(client.calls.setTitle, [['b1', '1']]);
  fail = false;
  await painter.paint('b1', { value: '1' });
  await painter.paint('b1', { value: '1' });
  assert.equal(client.calls.setImage.length, 1);
  assert.deepEqual(client.calls.setTitle.at(-1), ['b1', '']);
  painter.invalidate('b1');
  await painter.paint('b1', { value: '1' });
  assert.equal(client.calls.setImage.length, 2);
});

test('çizici bağlam kaybını iletir, diğer hataları loglar', async () => {
  const client = makeFakeClient();
  const logged = [];
  const painter = createKeyPainter(client, { png, log: (key) => logged.push(key) });
  client.setImage = async () => { throw gone(); };
  await assert.rejects(painter.paint('b1', { value: '1' }), { code: 'CONTEXT_EXPIRED' });
  client.setImage = async () => { throw new Error('beklenmedik'); };
  client.setTitle = async () => { throw new Error('beklenmedik'); };
  await painter.paint('b1', { value: '2' });
  assert.deepEqual(logged, ['paint']);
});

test('tuş yüzü görünüşte ve ayar değişince çizilir, olay ayarlarını kullanır', async () => {
  const client = makeFakeClient();
  const painter = createKeyPainter(client, { png });
  registerKeyFace(client, 'open-url', { view: openUrlView, painter });
  const context = { actionId: 'open-url', bindingInstanceId: 'b1' };
  await client.emit('action.willAppear', { context, payload: { settings: { url: 'https://www.github.com/x' } } });
  await client.emit('action.settingsChanged', { context, payload: { settings: { url: 'https://evox.app' } } });
  const svgs = client.calls.setImage.map(([, img]) => Buffer.from(img.dataBase64, 'base64').toString('utf8'));
  assert.ok(svgs[0].includes('github.com') && svgs[1].includes('evox.app'));
  await client.emit('action.willAppear', { context: { actionId: 'counter', bindingInstanceId: 'b2' } });
  assert.equal(client.calls.setImage.length, 2);
});

test('kısayol kartı modifier satırı ve tuş kapağı çizer', () => {
  const view = hotkeyView({ mods: 'Ctrl+Shift', key: 'd' });
  assert.ok(view.body.includes('Ctrl + Shift') && view.body.includes('>D<') && view.body.includes('<rect'));
  assert.equal(view.title, 'Ctrl+Shift+d');
  assert.ok(hotkeyView({ mods: 'none', key: 'F5' }).body.includes('>F5<'));
  assert.equal(hotkeyView({}).sub, 'ayarlanmadı');
  assert.equal(keyLabel('escape'), 'Esc');
  assert.equal(keyLabel('tab'), 'Tab');
});

test('metin, pano ve URL kartları içeriği özetler', () => {
  const typed = typeTextView({ text: 'merhaba dünya', pasteMode: false });
  assert.equal(typed.corner, 'YAZ');
  assert.ok(typed.body.includes('merhaba dünya') && typed.sub === '13 karakter');
  assert.equal(typeTextView({}).sub, 'metin girilmedi');
  assert.equal(clipboardView({ mode: 'paste' }, undefined).sub, 'önce kopyala');
  assert.equal(clipboardView({ preview: false }, 'gizli').title, 'Kopyalandı');
  assert.ok(!buildKeySvg(clipboardView({ preview: false }, 'gizli')).includes('gizli'));
  assert.equal(urlHost('https://www.youtube.com/watch?v=1'), 'youtube.com');
  assert.equal(urlHost('bozuk'), '');
  assert.equal(openUrlView({}).sub, 'adres girilmedi');
});

test('gerçek PNG host sınırları içinde (<=128 KiB, 144x144)', async () => {
  const buf = await svgToPng(buildKeySvg(hotkeyView({ combo: 'Ctrl+Alt+Delete' })));
  assert.ok(buf.length > 0 && buf.length <= 128 * 1024);
  assert.equal(buf.readUInt32BE(16), 144);
  assert.equal(buf.readUInt32BE(20), 144);
});

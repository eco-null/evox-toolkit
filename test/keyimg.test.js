import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKeySvg, renderKey } from '../src/keyimg.js';
import { makeFakeClient } from './helpers/fake-client.js';

test('buildKeySvg renders two rows with text', () => {
  const svg = buildKeySvg([{ text: '74°C', color: '#9adcff', size: 34 }, { text: '62%' }]);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('74°C'));
  assert.ok(svg.includes('62%'));
  assert.ok(svg.includes('font-size="34"'));
});

test('buildKeySvg single row big', () => {
  const svg = buildKeySvg([{ text: '12.9/32GB' }]);
  assert.ok(svg.includes('12.9/32GB'));
  assert.ok(svg.match(/font-size="\d+"/));
});

test('buildKeySvg escapes xml', () => {
  const svg = buildKeySvg([{ text: 'A<B&C' }]);
  assert.ok(svg.includes('A&lt;B&amp;C'));
});

test('buildKeySvg empty shows dash', () => {
  assert.ok(buildKeySvg([]).includes('—'));
});

test('renderKey sends png raster image via setImage', async () => {
  const client = makeFakeClient();
  const ok = await renderKey(client, 'b1', [{ text: '74°C' }], {
    png: async (svg) => Buffer.from(svg),
  });
  assert.equal(ok, true);
  assert.equal(client.calls.setImage.length, 1);
  assert.equal(client.calls.setImage[0][0], 'b1');
  assert.equal(client.calls.setImage[0][1].mimeType, 'image/png');
  assert.ok(client.calls.setImage[0][1].dataBase64.length > 0);
});

test('renderKey falls back to title on png failure', async () => {
  const client = makeFakeClient();
  const ok = await renderKey(client, 'b1', [{ text: '74°C', size: 34 }, { text: '62%' }], {
    png: async () => { throw new Error('sharp yok'); },
  });
  assert.equal(ok, false);
  assert.deepEqual(client.calls.setTitle[0], ['b1', '74°C\n62%']);
});

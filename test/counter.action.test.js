import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerCounter } from '../src/actions/counter.js';

const png = async (svg) => Buffer.from(svg);
const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
// Son kartta büyük yazılan sayı.
const shown = (client) => {
  const svg = Buffer.from(client.calls.setImage.at(-1)[1].dataBase64, 'base64').toString('utf8');
  return /font-weight="700" fill="[^"]+">(\d+)</.exec(svg)?.[1];
};

test('her basış sayıyı kartta artırır, başarı işareti göstermez', async () => {
  const client = makeFakeClient();
  registerCounter(client, { png });
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(shown(client), '1');
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(shown(client), '2');
  assert.equal(client.calls.showSuccess.length, 0);
  assert.equal(client.calls.showError.length, 0);
  await client.emit('action.willDisappear', { context: ctx });
});

test('başka aksiyonları yok sayar', async () => {
  const client = makeFakeClient();
  registerCounter(client, { png });
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'x' } });
  assert.equal(client.calls.setImage.length + client.calls.setTitle.length, 0);
});

test('uzun basış sıfırlar', async () => {
  const client = makeFakeClient();
  registerCounter(client, { png });
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(shown(client), '1');
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(shown(client), '0');
  await client.emit('action.keyUp', { context: ctx });
  await client.emit('action.willDisappear', { context: ctx });
});

test('kısa basış sıfırlamaz', async () => {
  const client = makeFakeClient();
  registerCounter(client, { png });
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyUp', { context: ctx });
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(shown(client), '1');
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(shown(client), '2');
  await client.emit('action.willDisappear', { context: ctx });
});

test('host hataları handler\'ı reddettirmez', async () => {
  const client = makeFakeClient();
  const logged = [];
  client.setImage = async () => { throw Object.assign(new Error('x'), { code: 'RATE_LIMITED' }); };
  registerCounter(client, { png, log: (key) => logged.push(key) });
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyUp', { context: ctx });
  client.setImage = async () => { throw Object.assign(new Error('x'), { code: 'CONTEXT_EXPIRED' }); };
  await client.emit('action.keyDown', { context: ctx });
  await new Promise((r) => setTimeout(r, 800)); // tutma zamanlayıcısı da çizer ve reddedilir
  assert.deepEqual(logged, []);
});

test('tuş yeniden görünce son sayı çizilir; ilk görünüşte 0', async () => {
  const client = makeFakeClient();
  registerCounter(client, { png });
  await client.emit('action.willAppear', { context: ctx });
  assert.equal(shown(client), '0');
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.willDisappear', { context: ctx });
  await client.emit('action.willAppear', { context: ctx });
  assert.equal(shown(client), '2');
  await client.emit('action.willDisappear', { context: ctx });
});

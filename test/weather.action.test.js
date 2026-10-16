import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerWeather } from '../src/actions/weather.js';

test('renders temp and humidity as image rows on willAppear', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Istanbul', interval: 30 });
  registerWeather(client, {
    fetchImpl: async () => ({ ok: true, text: async () => '+29°C|50%' }),
    png: async (svg) => Buffer.from(svg, 'utf8'),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.setImage.length, 1);
  assert.equal(client.calls.setImage[0][0], 'b1');
  assert.ok(Buffer.from(client.calls.setImage[0][1].dataBase64, 'base64').toString('utf8').includes('+29°C'));
  assert.ok(Buffer.from(client.calls.setImage[0][1].dataBase64, 'base64').toString('utf8').includes('50%'));
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('caches fetch per interval', async () => {
  let fetches = 0;
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Istanbul', interval: 30 });
  registerWeather(client, {
    fetchImpl: async () => { fetches++; return { ok: true, text: async () => '+29°C|50%' }; },
    png: async () => Buffer.from('x'),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fetches, 1);
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('renders title fallback when png fails', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Ankara', interval: 30 });
  registerWeather(client, {
    fetchImpl: async () => ({ ok: true, text: async () => '+15°C|20%' }),
    png: async () => { throw new Error('no'); },
  });
  await client.emit('action.keyDown', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', '+15°C\n20%']);
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('empty city shows hint', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: '' });
  registerWeather(client, { fetchImpl: async () => { throw new Error('x'); } });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'Şehir seçin']);
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('fetch failure shows dash + showError', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir', interval: 30 });
  registerWeather(client, { fetchImpl: async () => { throw new Error('fail'); } });
  await client.emit('action.keyDown', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', '—']);
  assert.equal(client.calls.showError.length, 1);
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('uses settings from the event payload without asking the host', async () => {
  const client = makeFakeClient();
  let asked = 0;
  client.getSettings = async () => { asked++; return {}; };
  const urls = [];
  registerWeather(client, {
    fetchImpl: async (url) => { urls.push(url); return { ok: true, text: async () => '+5°C|90%' }; },
    png: async (svg) => Buffer.from(svg),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' }, payload: { settings: { city: 'Kars' } } });
  assert.equal(asked, 0);
  assert.deepEqual(urls, ['https://wttr.in/Kars?format=%t|%h']);
  await client.emit('action.willDisappear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
});

test('CONTEXT_EXPIRED stops the binding instead of throwing', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  client.setImage = async () => { throw Object.assign(new Error('gone'), { code: 'CONTEXT_EXPIRED' }); };
  const logged = [];
  const weather = registerWeather(client, {
    fetchImpl: async () => ({ ok: true, text: async () => '+20°C|40%' }),
    png: async (svg) => Buffer.from(svg),
    log: (key) => logged.push(key),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.equal(weather.bindings.size, 0);
  assert.deepEqual(logged, []);
});

test('RATE_LIMITED frame is skipped and logged nowhere', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  client.setImage = async () => { throw Object.assign(new Error('slow'), { code: 'RATE_LIMITED' }); };
  const logged = [];
  const weather = registerWeather(client, {
    fetchImpl: async () => ({ ok: true, text: async () => '+20°C|40%' }),
    png: async (svg) => Buffer.from(svg),
    log: (key) => logged.push(key),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.equal(weather.bindings.size, 1);
  assert.deepEqual(logged, []);
  weather.stopAll();
  assert.equal(weather.bindings.size, 0);
});

test('does nothing for unknown actionId', async () => {
  const client = makeFakeClient();
  registerWeather(client, { fetchImpl: async () => ({}) });
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.setTitle.length, 0);
});

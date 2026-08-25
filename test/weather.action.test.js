import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerWeather } from '../src/actions/weather.js';

test('renders city + temp on willAppear', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Istanbul' });
  registerWeather(client, {
    fetchImpl: async () => ({ ok: true, text: async () => '+29°C' }),
  });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'Istanbul\n+29°C']);
});

test('empty city shows hint', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: '' });
  registerWeather(client, { fetchImpl: async () => { throw new Error('x'); } });
  await client.emit('action.willAppear', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'Şehir seçin']);
});

test('fetch failure shows Hata + showError', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  registerWeather(client, { fetchImpl: async () => { throw new Error('fail'); } });
  await client.emit('action.keyDown', { context: { actionId: 'weather', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'Hata']);
  assert.equal(client.calls.showError.length, 1);
});

test('does nothing for unknown actionId', async () => {
  const client = makeFakeClient();
  registerWeather(client, { fetchImpl: async () => ({}) });
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.setTitle.length, 0);
});

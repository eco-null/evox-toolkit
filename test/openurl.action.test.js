import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerOpenUrl } from '../src/actions/openurl.js';

test('valid url opens and shows success', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ url: 'https://example.com' });
  const opened = [];
  registerOpenUrl(client, { win: { openExternal: async (u) => { opened.push(u); return true; } } });
  await client.emit('action.keyDown', { context: { actionId: 'open-url', bindingInstanceId: 'b1' } });
  assert.deepEqual(opened, ['https://example.com']);
  assert.equal(client.calls.showSuccess.length, 1);
});

test('invalid url shows error', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ url: 'file:///C:/' });
  registerOpenUrl(client, { win: { openExternal: async (u) => u.startsWith('https://') } });
  await client.emit('action.keyDown', { context: { actionId: 'open-url', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.showError.length, 1);
});

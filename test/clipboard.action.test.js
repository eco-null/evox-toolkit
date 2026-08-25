import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerClipboard } from '../src/actions/clipboard.js';

test('copy stores clipboard and shows preview', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ mode: 'copy', preview: true });
  registerClipboard(client, { win: { getClipboard: async () => '0123456789ABCDEF', setClipboard: async () => true, sendCombo: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'clipboard', bindingInstanceId: 'b1' } });
  assert.deepEqual(client.calls.setTitle[0], ['b1', '0123456789AB…']);
  assert.equal(client.calls.showSuccess.length, 1);
});

test('paste with empty store shows error', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ mode: 'paste', preview: true });
  registerClipboard(client, { win: { getClipboard: async () => 'hello', setClipboard: async () => true, sendCombo: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'clipboard', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.showError.length, 1);
});

test('copy then paste roundtrip', async () => {
  const client = makeFakeClient();
  const settings = { mode: 'copy', preview: true };
  client.getSettings = async () => settings;
  const ops = [];
  registerClipboard(client, { win: { getClipboard: async () => 'data', setClipboard: async (v) => { ops.push(['set', v]); return true; }, sendCombo: async (c) => { ops.push(['paste', c]); return true; } } });
  await client.emit('action.keyDown', { context: { actionId: 'clipboard', bindingInstanceId: 'b1' } });
  settings.mode = 'paste';
  settings.preview = false;
  await client.emit('action.keyDown', { context: { actionId: 'clipboard', bindingInstanceId: 'b1' } });
  assert.deepEqual(ops[0], ['set', 'data']);
  assert.deepEqual(ops[1], ['paste', 'Ctrl+V']);
  assert.equal(client.calls.showSuccess.length, 2);
});

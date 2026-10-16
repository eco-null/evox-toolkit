import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerClipboard } from '../src/actions/clipboard.js';

test('copy stores clipboard and shows preview', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ mode: 'copy', preview: true });
  registerClipboard(client, { png: async (svg) => Buffer.from(svg), win: { getClipboard: async () => '0123456789ABCDEF', setClipboard: async () => true, sendCombo: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'clipboard', bindingInstanceId: 'b1' } });
  const svg = Buffer.from(client.calls.setImage[0][1].dataBase64, 'base64').toString('utf8');
  assert.ok(svg.includes('>0123456789ABC<') && svg.includes('>DEF<') && svg.includes('16 karakter'), svg);
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

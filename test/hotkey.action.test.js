import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerHotkey } from '../src/actions/hotkey.js';

test('hotkey manual combo sends combo and shows success', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ combo: 'Ctrl+Shift+D' });
  const sent = [];
  registerHotkey(client, { win: { sendCombo: async (c) => { sent.push(c); return true; }, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.deepEqual(sent, ['Ctrl+Shift+D']);
  assert.equal(client.calls.showSuccess.length, 1);
});

test('hotkey combines modifier dropdown with typed key', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ mods: 'Ctrl+Shift', key: 'D' });
  const sent = [];
  registerHotkey(client, { win: { sendCombo: async (c) => { sent.push(c); return true; }, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.deepEqual(sent, ['Ctrl+Shift+D']);
  assert.equal(client.calls.showSuccess.length, 1);
});

test('hotkey simple key without modifier', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ mods: 'none', key: 'F5' });
  const sent = [];
  registerHotkey(client, { win: { sendCombo: async (c) => { sent.push(c); return true; }, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.deepEqual(sent, ['F5']);
});

test('hotkey reads combo from alternative key names', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ value: 'Alt+Tab' });
  const sent = [];
  registerHotkey(client, { win: { sendCombo: async (c) => { sent.push(c); return true; }, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.deepEqual(sent, ['Alt+Tab']);
});

test('hotkey falls back to legacy preset/combo field', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ preset: 'Win+V' });
  const sent = [];
  registerHotkey(client, { win: { sendCombo: async (c) => { sent.push(c); return true; }, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.deepEqual(sent, ['Win+V']);
});

test('hotkey with no combo shows error', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({});
  registerHotkey(client, { win: { sendCombo: async () => true, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'send-hotkey', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.showError.length, 1);
});

test('type-text writes via typeText and success', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ text: 'selam', pasteMode: true });
  const written = [];
  registerHotkey(client, { win: { sendCombo: async () => true, typeText: async (t, o) => { written.push([t, o]); return true; } } });
  await client.emit('action.keyDown', { context: { actionId: 'type-text', bindingInstanceId: 'b1' } });
  assert.deepEqual(written, [['selam', { direct: false }]]);
  assert.equal(client.calls.showSuccess.length, 1);
});

test('type-text no text shows error', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ text: '', pasteMode: true });
  registerHotkey(client, { win: { sendCombo: async () => true, typeText: async () => true } });
  await client.emit('action.keyDown', { context: { actionId: 'type-text', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.showError.length, 1);
});

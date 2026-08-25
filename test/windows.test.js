import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindowsLayer } from '../src/windows.js';

test('sendCombo invokes exec with SendInput source for valid combo and returns true', async () => {
  const calls = [];
  const layer = createWindowsLayer({ exec: async (script) => { calls.push(script); return 'ok'; } });
  const ok = await layer.sendCombo('Ctrl+Shift+S');
  assert.equal(ok, true);
  assert.ok(calls[0].includes('SendInput'));
});

test('sendCombo returns false for invalid combo without exec', async () => {
  let called = false;
  const layer = createWindowsLayer({ exec: async () => { called = true; return 'ok'; } });
  assert.equal(await layer.sendCombo('Bad!Combo'), false);
  assert.equal(called, false);
});

test('openExternal rejects non-http schemes', async () => {
  const layer = createWindowsLayer({ exec: async () => 'ok' });
  assert.equal(await layer.openExternal('file:///C:/'), false);
});

test('openExternal accepts https and passes url to exec', async () => {
  const calls = [];
  const layer = createWindowsLayer({ exec: async (s) => { calls.push(s); return 'ok'; } });
  const ok = await layer.openExternal('https://example.com/x?q=1');
  assert.equal(ok, true);
  assert.ok(calls[0].includes('example.com'));
  assert.ok(calls[0].includes('Start-Process'));
});

test('setClipboard passes base64, never raw text', async () => {
  const calls = [];
  const layer = createWindowsLayer({ exec: async (s) => { calls.push(s); return 'ok'; } });
  await layer.setClipboard('hello\nworld');
  assert.equal(calls[0].includes('aGVsbG8Kd29ybGQ='), true);
});

test('typeText direct rejects non-ascii and falls to clipboard path', async () => {
  const calls = [];
  const layer = createWindowsLayer({
    exec: async (s) => { calls.push(s); return 'ok'; },
  });
  const ok = await layer.typeText('ğüç', { direct: true });
  assert.equal(ok, true);
  assert.equal(calls.some((s) => s.includes('Set-Clipboard')), true);
});

test('getClipboard reads raw', async () => {
  const layer = createWindowsLayer({ exec: async () => 'content' });
  assert.equal(await layer.getClipboard(), 'content');
});

test('sendCombo returns false when exec resolves null', async () => {
  const layer = createWindowsLayer({ exec: async () => null });
  assert.equal(await layer.sendCombo('Ctrl+Shift+S'), false);
});

test('setClipboard returns false when exec resolves null', async () => {
  const layer = createWindowsLayer({ exec: async () => null });
  assert.equal(await layer.setClipboard('hello'), false);
});

test('openExternal returns false when exec resolves null', async () => {
  const layer = createWindowsLayer({ exec: async () => null });
  assert.equal(await layer.openExternal('https://example.com'), false);
});

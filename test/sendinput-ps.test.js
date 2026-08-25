import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSendInputSource } from '../src/sendinput-ps.js';

test('builds SendInput source for Ctrl+Shift+S (hex VKs, ordered)', () => {
  const src = buildSendInputSource({ mods: { ctrl: true, alt: false, shift: true, win: false }, vk: 0x53 });
  assert.ok(src.includes('SendInput'));
  assert.ok(src.includes('KEYBDINPUT'));
  assert.match(src, /vk = 0x53/);
  assert.match(src, /vk = 0x11/);
  assert.match(src, /vk = 0x10/);
});

test('builds SendInput source with Win modifier', () => {
  const src = buildSendInputSource({ mods: { ctrl: false, alt: false, shift: false, win: true }, vk: 0x56 });
  assert.match(src, /vk = 0x5B/);
  assert.match(src, /vk = 0x56/);
  assert.ok(src.includes('0x5B'));
});

test('emits KEYEVENTF_KEYUP for releases', () => {
  const src = buildSendInputSource({ mods: { ctrl: true, alt: false, shift: false, win: false }, vk: 0x41 });
  assert.ok(src.includes('dwFlags = 2'));
  assert.ok(src.indexOf('0x11') < src.indexOf('0x41'));
});

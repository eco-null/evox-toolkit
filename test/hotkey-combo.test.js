import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCombo } from '../src/hotkey-combo.js';

test('parses Ctrl+Shift+S', () => {
  const c = parseCombo('Ctrl+Shift+S');
  assert.equal(c.mods.ctrl, true);
  assert.equal(c.mods.shift, true);
  assert.equal(c.key, 's');
  assert.equal(c.vk, 0x53);
});

test('parses Win+Shift+S case-insensitive and meta alias', () => {
  const a = parseCombo('win+shift+s');
  const b = parseCombo('Meta+Shift+S');
  assert.equal(a.mods.win, true);
  assert.equal(b.mods.win, true);
  assert.equal(a.key, 's');
});

test('parses named keys and F keys', () => {
  assert.equal(parseCombo('F5').vk, 0x74);
  assert.equal(parseCombo('Alt+Tab').vk, 0x09);
  assert.equal(parseCombo('PrintScreen').vk, 0x2C);
  assert.equal(parseCombo('Ctrl+Home').vk, 0x24);
});

test('parses digits', () => {
  assert.equal(parseCombo('Ctrl+2').vk, 0x32);
});

test('invalid combos return null', () => {
  assert.equal(parseCombo(''), null);
  assert.equal(parseCombo('Ctrl+'), null);
  assert.equal(parseCombo('+Ctrl'), null);
  assert.equal(parseCombo('Ctrl'), null);
  assert.equal(parseCombo('Ctrl+Shift'), null);
  assert.equal(parseCombo('Foo+Bar+Z'), null);
});

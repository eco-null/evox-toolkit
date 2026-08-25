import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCpuPanel, drawGpuPanel, drawRamPanel, drawDiskPanel, pickDiskRotation } from '../src/actions/sysmon.js';

test('drawCpuPanel big two values with temp', () => {
  assert.equal(drawCpuPanel({ load: 61, temp: 74 }), '74°C\n61%');
});

test('drawCpuPanel without temp shows load only', () => {
  assert.equal(drawCpuPanel({ load: 61, temp: null }), '61%');
});

test('drawCpuPanel no data shows dash', () => {
  assert.equal(drawCpuPanel({ load: null, temp: null }), '—');
});

test('drawGpuPanel big two values', () => {
  assert.equal(drawGpuPanel({ util: 12, temp: 62 }), '62°C\n12%');
});

test('drawGpuPanel fallback', () => {
  assert.equal(drawGpuPanel({ util: null, temp: null }), '—');
});

test('drawRamPanel used/total compact', () => {
  assert.equal(drawRamPanel({ used: 12.9 * 1024 ** 3, total: 32 * 1024 ** 3 }), '12.9/32GB');
});

test('drawRamPanel invalid shows dash', () => {
  assert.equal(drawRamPanel({ used: null, total: null }), '—');
});

test('drawDiskPanel free space only GB', () => {
  assert.equal(drawDiskPanel({ fs: 'C:', freeB: 166 * 1024 ** 3 }), 'C: 166GB');
});

test('drawDiskPanel free space TB', () => {
  assert.equal(drawDiskPanel({ fs: 'P:', freeB: 1.34 * 1024 ** 4 }), 'P: 1.3TB');
});

test('pickDiskRotation rotates', () => {
  const drives = [{ fs: 'C:' }, { fs: 'D:' }];
  assert.equal(pickDiskRotation(drives, 0).fs, 'C:');
  assert.equal(pickDiskRotation(drives, 1).fs, 'D:');
  assert.equal(pickDiskRotation([], 0), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCpuPanel, drawGpuPanel, drawRamPanel, drawDiskPanel, pickDiskRotation } from '../src/actions/sysmon.js';

test('drawCpuPanel with temp', () => {
  assert.equal(drawCpuPanel({ load: 61, temp: 74 }), 'CPU\n61% · 74°C');
});

test('drawCpuPanel without temp shows dash', () => {
  assert.equal(drawCpuPanel({ load: 61, temp: null }), 'CPU\n61% · —');
});

test('drawGpuPanel fallback', () => {
  assert.equal(drawGpuPanel({ util: null, temp: null }), 'GPU\n—');
});

test('drawRamPanel', () => {
  assert.equal(drawRamPanel({ used: 16.25 * 1024 ** 3, total: 32 * 1024 ** 3 }), 'RAM\n16.3 GB / 32.0 GB\n51%');
});

test('drawDiskPanel single with extra', () => {
  assert.equal(drawDiskPanel({ fs: 'C:', usedB: 420 * 1024 ** 3, totalB: 950 * 1024 ** 3, extra: 0 }), 'C:\\ 420.0 GB / 950.0 GB\n44%');
  assert.equal(drawDiskPanel({ fs: 'C:', usedB: 420 * 1024 ** 3, totalB: 950 * 1024 ** 3, extra: 2 }), 'C:\\ 420.0 GB / 950.0 GB\n+2 sürücü');
});

test('pickDiskRotation rotates', () => {
  const drives = [{ fs: 'C:' }, { fs: 'D:' }];
  assert.equal(pickDiskRotation(drives, 0).fs, 'C:');
  assert.equal(pickDiskRotation(drives, 1).fs, 'D:');
  assert.equal(pickDiskRotation([], 0), null);
});

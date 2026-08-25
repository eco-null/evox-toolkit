import test from 'node:test';
import assert from 'node:assert/strict';
import {
  layoutCpuPanel, layoutGpuPanel, layoutRamPanel, layoutDiskPanel, pickDiskRotation,
  parseLhm, parseLhmValue,
} from '../src/actions/sysmon.js';

test('layoutCpuPanel stacked temp+load', () => {
  const rows = layoutCpuPanel({ load: 61, temp: 74 });
  assert.deepEqual(rows, [{ text: '74°C', color: '#9adcff', size: 34 }, { text: '61%' }]);
});

test('layoutCpuPanel without temp shows load only', () => {
  assert.deepEqual(layoutCpuPanel({ load: 61, temp: null }), [{ text: '61%' }]);
});

test('layoutCpuPanel no data shows dash', () => {
  assert.deepEqual(layoutCpuPanel({ load: null, temp: null }), [{ text: '—' }]);
});

test('layoutGpuPanel stacked temp+util', () => {
  assert.deepEqual(layoutGpuPanel({ util: 12, temp: 62 }), [{ text: '62°C', color: '#9adcff', size: 34 }, { text: '12%' }]);
});

test('layoutGpuPanel fallback', () => {
  assert.deepEqual(layoutGpuPanel({ util: null, temp: null }), [{ text: '—' }]);
});

test('layoutRamPanel used over total two lines', () => {
  assert.deepEqual(layoutRamPanel({ used: 12.9 * 1024 ** 3, total: 32 * 1024 ** 3 }), [
    { text: '12.9GB', color: '#9adcff', size: 34 },
    { text: 'toplam 32GB', size: 20 },
  ]);
});

test('layoutRamPanel invalid shows dash', () => {
  assert.deepEqual(layoutRamPanel({ used: null, total: null }), [{ text: '—' }]);
});

test('layoutDiskPanel drive letter over free space', () => {
  assert.deepEqual(layoutDiskPanel({ fs: 'C:', freeB: 166 * 1024 ** 3 }), [
    { text: 'C:', color: '#9adcff', size: 34 },
    { text: '166GB', size: 26 },
  ]);
});

test('layoutDiskPanel TB free', () => {
  assert.deepEqual(layoutDiskPanel({ fs: 'P:', freeB: 1.34 * 1024 ** 4 }), [
    { text: 'P:', color: '#9adcff', size: 34 },
    { text: '1.3TB', size: 26 },
  ]);
});

test('pickDiskRotation rotates', () => {
  const drives = [{ fs: 'C:' }, { fs: 'D:' }];
  assert.equal(pickDiskRotation(drives, 0).fs, 'C:');
  assert.equal(pickDiskRotation(drives, 1).fs, 'D:');
  assert.equal(pickDiskRotation([], 0), null);
});

test('parseLhmValue handles comma decimals and units', () => {
  assert.equal(parseLhmValue('63,0 °C'), 63);
  assert.equal(parseLhmValue('7,5 %'), 7.5);
  assert.equal(parseLhmValue(61.2), 61.2);
  assert.equal(parseLhmValue(''), null);
  assert.equal(parseLhmValue(undefined), null);
});

test('parseLhm extracts amdcpu tctl and nvidia gpu', () => {
  const tree = {
    Text: 'root', Children: [
      {
        Text: 'AMD Ryzen', Children: [
          { Text: 'Temperatures', Children: [
            { Text: 'Core (Tctl/Tdie)', Value: '89,1 °C', Type: 'Temperature', SensorId: '/amdcpu/0/temperature/2' },
            { Text: 'CCD1 (Tdie)', Value: '95,0 °C', Type: 'Temperature', SensorId: '/amdcpu/0/temperature/3' },
          ] },
        ],
      },
      {
        Text: 'NVIDIA RTX', Children: [
          { Text: 'Temperatures', Children: [
            { Text: 'GPU Core', Value: '60,4 °C', Type: 'Temperature', SensorId: '/gpu-nvidia/0/temperature/0' },
          ] },
          { Text: 'Load', Children: [
            { Text: 'GPU Core', Value: '7,0 %', Type: 'Load', SensorId: '/gpu-nvidia/0/load/0' },
          ] },
        ],
      },
    ],
  };
  const out = parseLhm(tree);
  assert.equal(out.cpuTemp, 89);
  assert.equal(out.gpuTemp, 60);
  assert.equal(out.gpuUtil, 7);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, fmtBytes, safeTitle, decodeError, forAction, timedTask } from '../src/util.js';

test('clamp bounds', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
});

test('fmtBytes units', () => {
  assert.equal(fmtBytes(512), '512 B');
  assert.equal(fmtBytes(2048), '2.0 KB');
  assert.equal(fmtBytes(16 * 1024 ** 2), '16.0 MB');
  assert.equal(fmtBytes(16.25 * 1024 ** 3), '16.3 GB');
  assert.equal(fmtBytes(-5), '—');
});

test('safeTitle preserves newlines and truncates', () => {
  assert.equal(safeTitle('a\nb'), 'a\nb');
  assert.equal(safeTitle('x'.repeat(70)).length, 61);
  assert.equal(safeTitle('x'.repeat(70)).endsWith('…'), true);
});

test('decodeError silent for expired codes', () => {
  assert.equal(decodeError({ code: 'CONTEXT_EXPIRED' }).silent, true);
  assert.equal(decodeError(new Error('boom')).silent, false);
  assert.equal(decodeError(undefined).silent, false);
});

test('forAction filters by actionId', async () => {
  let calls = 0;
  const handler = forAction('counter')(async () => { calls++; });
  await handler({ context: { actionId: 'counter' } });
  await handler({ context: { actionId: 'other' } });
  assert.equal(calls, 1);
});

test('timedTask stops on stop()', async () => {
  let calls = 0;
  const task = timedTask(async () => { calls++; }, 20);
  task.start();
  await new Promise((r) => setTimeout(r, 90));
  task.stop();
  const n = calls;
  assert.ok(n >= 2);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls, n);
});

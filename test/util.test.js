import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, createLogger, decodeError, forAction } from '../src/util.js';

test('clamp bounds', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
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

test('createLogger writes each key at most once per minute and caps line length', () => {
  const lines = [];
  let clock = 0;
  const log = createLogger((line) => lines.push(line), () => clock);
  log('sdk', { code: 'RATE_LIMITED', message: 'slow down' });
  log('sdk', new Error('again'));
  log('weather', new Error('x'.repeat(1000)));
  assert.equal(lines.length, 2);
  assert.match(lines[0], /\[toolkit\] sdk: RATE_LIMITED slow down/);
  assert.ok(lines[1].length <= 300);
  clock = 60_000;
  log('sdk', new Error('later'));
  assert.equal(lines.length, 3);
});

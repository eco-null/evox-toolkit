import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerCounter } from '../src/actions/counter.js';

test('keyDown increments and writes title', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  assert.deepEqual(client.calls.setTitle[0], ['b1', '1']);
  assert.deepEqual(client.calls.setTitle[1], ['b1', '2']);
});

test('ignores other actionIds', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'x' } });
  assert.equal(client.calls.setTitle.length, 0);
});

test('long press resets', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(client.calls.setTitle.at(-1)[1], '2');
  await new Promise((r) => setTimeout(r, 750));
  await client.emit('action.keyUp', { context: ctx });
  assert.equal(client.calls.setTitle.at(-1)[1], '0');
});

test('quick tap does not reset', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyUp', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(client.calls.setTitle.at(-1)[1], '2');
});

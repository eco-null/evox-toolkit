import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerCounter } from '../src/actions/counter.js';

test('keyDown increments and writes title without showSuccess', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  assert.deepEqual(client.calls.setTitle[0], ['b1', '1']);
  assert.deepEqual(client.calls.setTitle[1], ['b1', '2']);
  assert.equal(client.calls.showSuccess.length, 0);
  assert.equal(client.calls.showError.length, 0);
  await client.emit('action.willDisappear', { context: ctx });
});

test('ignores other actionIds', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'x' } });
  assert.equal(client.calls.setTitle.length, 0);
});

test('long press resets via hold timer', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(client.calls.setTitle.at(-1)[1], '1');
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(client.calls.setTitle.at(-1)[1], '0');
  await client.emit('action.keyUp', { context: ctx });
  await client.emit('action.willDisappear', { context: ctx });
});

test('quick tap does not reset', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyUp', { context: ctx });
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(client.calls.setTitle.at(-1)[1], '1');
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(client.calls.setTitle.at(-1)[1], '2');
  await client.emit('action.willDisappear', { context: ctx });
});

test('willAppear restores last count and loop stops on disappear', async () => {
  const client = makeFakeClient();
  registerCounter(client);
  const ctx = { actionId: 'counter', bindingInstanceId: 'b1' };
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  await client.emit('action.willDisappear', { context: ctx });
  await client.emit('action.willAppear', { context: ctx });
  assert.deepEqual(client.calls.setTitle.at(-1), ['b1', '2']);
  await client.emit('action.willDisappear', { context: ctx });
});

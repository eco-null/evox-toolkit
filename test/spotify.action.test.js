import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { registerSpotify, fetchArtwork } from '../src/actions/spotify.js';

function makeApi(callLog, override = {}) {
  return {
    callApi: async (m, p, o) => {
      callLog.push([m, p, o]);
      return override[`${m} ${p}`] ?? { ok: true, status: 200, json: {} };
    },
    getToken: async () => 'tok',
    normalizeTrack: (t) => t,
  };
}

test('toggle-play calls API and shows success', async () => {
  const client = makeFakeClient();
  const log = [];
  client.getSettings = async () => ({ mode: 'toggle-play', refreshToken: 'rt' });
  registerSpotify(client, {
    makeClient: () => makeApi(log),
    fetchImpl: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([0]) }),
    resize: async (b) => ({ mimeType: 'image/jpeg', dataBase64: Buffer.from(b).toString('base64') }),
  });
  await client.emit('action.keyDown', { context: { actionId: 'spotify', bindingInstanceId: 'b1' } });
  assert.equal(log.length >= 2, true);
  assert.ok(log.some(([m, p]) => p.includes('me/player')));
  assert.equal(client.calls.showSuccess.length, 1);
});

test('knob volume clamps and writes %title', async () => {
  const client = makeFakeClient();
  const log = [];
  client.getSettings = async () => ({ refreshToken: 'rt' });
  registerSpotify(client, {
    makeClient: () => makeApi(log),
    fetchImpl: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([0]) }),
    resize: async (b) => ({ mimeType: 'image/jpeg', dataBase64: 'x' }),
  });
  const ctx = { actionId: 'spotify-volume', bindingInstanceId: 'b1' };
  await client.emit('action.dialRotate', { context: ctx, payload: { delta: 10 } });
  assert.ok(client.calls.setTitle.length >= 1);
  assert.ok(log.some(([m, p]) => p.includes('volume')));
  assert.deepEqual(client.calls.setTitle.at(-1), ['b1', '%10']);
});

test('fetchArtwork returns null on failure', async () => {
  const art = await fetchArtwork('https://example.com/cover.jpg', {
    fetchImpl: async () => { throw new Error('no'); },
    resize: async () => null,
  });
  assert.equal(art, null);
});

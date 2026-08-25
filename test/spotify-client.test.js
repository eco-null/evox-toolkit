import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotifyClient } from '../src/spotify-client.js';

function mockFetch(handler) {
  return async (url, init = {}) => {
    const res = await handler(url, init);
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      headers: { get: (k) => (res.headers || {})[k?.toLowerCase()] ?? null },
      json: async () => res.body,
      text: async () => (typeof res.body === 'string' ? res.body : JSON.stringify(res.body)),
    };
  };
}

test('getToken refreshes once and caches', async () => {
  let tokenCalls = 0;
  const client = createSpotifyClient({
    clientId: 'id', clientSecret: 'secret', refreshToken: 'rt',
    fetchImpl: mockFetch(async () => { tokenCalls++; return { status: 200, body: { access_token: 'tok1', expires_in: 3600 } }; }),
  });
  const t1 = await client.getToken();
  const t2 = await client.getToken();
  assert.equal(t1, 'tok1');
  assert.equal(t2, 'tok1');
  assert.equal(tokenCalls, 1);
});

test('callApi attaches Bearer token', async () => {
  const seen = [];
  const client = createSpotifyClient({
    clientId: 'id', clientSecret: 's', refreshToken: 'rt',
    fetchImpl: mockFetch(async (url, init) => {
      if (url.includes('accounts.spotify.com')) return { status: 200, body: { access_token: 'abc', expires_in: 3600 } };
      seen.push({ auth: init.headers['Authorization'] });
      return { status: 200, body: { ok: true } };
    }),
  });
  const r = await client.callApi('GET', '/me/player');
  assert.equal(r.ok, true);
  assert.ok(seen[0].auth.startsWith('Bearer '));
});
test('callApi refreshes once on 401 and retries', async () => {
  let apiCalls = 0;
  const client = createSpotifyClient({
    clientId: 'id', clientSecret: 's', refreshToken: 'rt',
    fetchImpl: mockFetch(async (url) => {
      if (url.includes('accounts.spotify.com')) return { status: 200, body: { access_token: 'new', expires_in: 3600 } };
      apiCalls++;
      return { status: apiCalls === 1 ? 401 : 200, body: { state: apiCalls === 1 ? {} : 'playing' } };
    }),
  });
  const r = await client.callApi('GET', '/me/player');
  assert.equal(r.ok, true);
  assert.equal(apiCalls, 2);
});

test('accessToken option is used without refresh', async () => {
  let tokenCalls = 0;
  const client = createSpotifyClient({
    clientId: 'id', clientSecret: 's', refreshToken: 'rt', accessToken: 'fresh',
    fetchImpl: mockFetch(async (url) => {
      if (url.includes('accounts.spotify.com')) { tokenCalls++; return { status: 200, body: { access_token: 'x', expires_in: 3600 } }; }
      return { status: 200, body: { ok: true } };
    }),
  });
  const r = await client.callApi('GET', '/me/player');
  assert.equal(r.ok, true);
  assert.equal(tokenCalls, 0);
  assert.equal(await client.getToken(), 'fresh');
});

test('normalizeTrack extracts album art + name', () => {
  const client = createSpotifyClient({ clientId: 'i', clientSecret: 's', refreshToken: 'r', fetchImpl: async () => { throw new Error('no net'); } });
  const t = client.normalizeTrack({
    name: 'Song', uri: 'spotify:track:1',
    artists: [{ name: 'Artist A' }, { name: 'B' }],
    album: { images: [{ url: 'big' }, { url: 'med' }, { url: 'small' }] },
  });
  assert.equal(t.name, 'Song');
  assert.equal(t.artUrl, 'small');
  assert.equal(t.artists, 'Artist A, B');
});

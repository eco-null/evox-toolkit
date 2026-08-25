import { forAction, decodeError, timedTask, clamp, safeTitle } from '../util.js';
import { createSpotifyClient } from '../spotify-client.js';

export async function lazySharpResize(buf) {
  try {
    const sharp = (await import('sharp')).default;
    const jpeg = await sharp(buf).resize(128, 128, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
    return { mimeType: 'image/jpeg', dataBase64: jpeg.toString('base64') };
  } catch {
    try {
      return { mimeType: 'image/jpeg', dataBase64: Buffer.from(buf).toString('base64') };
    } catch {
      return null;
    }
  }
}

export async function fetchArtwork(imageUrl, { fetchImpl = globalThis.fetch, resize = lazySharpResize } = {}) {
  if (!imageUrl) return null;
  try {
    const res = await fetchImpl(imageUrl);
    if (!res.ok) return null;
    return await resize(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

const MODE_ACTIONS = {
  'toggle-play': async (api) => {
    const r = await api.callApi('GET', '/me/player');
    const playing = !!r.json?.is_playing;
    return api.callApi('POST', playing ? '/me/player/pause' : '/me/player/play');
  },
  next: (api) => api.callApi('POST', '/me/player/next'),
  prev: (api) => api.callApi('POST', '/me/player/previous'),
  like: (api) => api.callApi('PUT', '/me/tracks', {}),
  mute: (api) => api.callApi('PUT', '/me/player/volume', { query: { volume_percent: 0 } }),
};

export function registerSpotify(
  client,
  { makeClient = createSpotifyClient, fetchImpl = globalThis.fetch, resize = undefined, pollMs = 15000 } = {},
) {
  const timers = new Map();
  const covers = new Map();

  const settingsFor = (id) => client.getSettings(id);
  const buildClient = (s) => makeClient({
    clientId: s?.clientId, clientSecret: s?.clientSecret, refreshToken: s?.refreshToken, fetchImpl,
  });

  async function runningState(id) {
    const s = await settingsFor(id);
    const api = buildClient(s);
    const r = await api.callApi('GET', '/me/player/currently-playing');
    if (!r.ok || !r.json?.item) { await client.setTitle(id, '—'); return null; }
    const t = api.normalizeTrack(r.json.item);
    if (t.artUrl) {
      let cover = covers.get(t.uri);
      if (!cover) {
        cover = await fetchArtwork(t.artUrl, { fetchImpl, resize });
        if (cover) covers.set(t.uri, cover);
      }
      if (cover) await client.setImage(id, { kind: 'raster', mimeType: cover.mimeType, dataBase64: cover.dataBase64 }).catch(() => {});
    }
    await client.setTitle(id, safeTitle(`${r.json.is_playing ? '▶' : '♪'} ${t.name}`.slice(0, 32)));
  }

  const pollBinding = (id) => {
    const existing = timers.get(id);
    if (existing) existing.stop();
    const task = timedTask(async () => { await runningState(id); }, pollMs);
    task.start();
    timers.set(id, task);
  };
  const stopPoll = (id) => {
    const t = timers.get(id);
    if (t) { t.stop(); timers.delete(id); }
  };

  const spotifyDown = forAction('spotify')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const s = await settingsFor(id);
      const api = buildClient(s);
      const mode = s?.mode ?? 'toggle-play';
      const run = MODE_ACTIONS[mode];
      if (!run) { await client.showError(id); return; }
      await run(api);
      if (mode === 'toggle-play') await runningState(id);
      await client.showSuccess(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[spotify]', err?.message || err?.code || err);
      try { await client.setTitle(id, '—'); await client.showError(id); } catch { /* ignore */ }
    }
  });

  const knobRotate = forAction('spotify-volume')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const delta = Number(event.payload?.delta) || (event.payload?.direction === 'LEFT' ? -10 : 10);
      const s = await settingsFor(id);
      const api = buildClient(s);
      const r = await api.callApi('GET', '/me/player');
      const cur = Number(r.json?.device?.volume_percent) || 0;
      const v = clamp(cur + delta, 0, 100);
      await api.callApi('PUT', '/me/player/volume', { query: { volume_percent: v } });
      await client.setTitle(id, `%${v}`);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[spotify-volume]', err?.message || err?.code || err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  const knobDown = forAction('spotify-volume')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const s = await settingsFor(id);
      const api = buildClient(s);
      const r = await api.callApi('GET', '/me/player');
      const muted = !!(r.json?.device?.is_muted);
      await api.callApi('PUT', '/me/player/mute', { query: { state: String(!muted) } });
      await client.showSuccess(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[spotify-mute]', err?.message || err?.code || err);
      try { await client.showError(id); } catch { /* ignore */ }
    }
  });

  client.on('action.willAppear', forAction('spotify')((event) => pollBinding(event.context.bindingInstanceId)));
  client.on('action.keyDown', spotifyDown);
  client.on('action.willDisappear', forAction('spotify')((event) => stopPoll(event.context.bindingInstanceId)));
  client.on('action.dialRotate', knobRotate);
  client.on('action.dialDown', knobDown);
}

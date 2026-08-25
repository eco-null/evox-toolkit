import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forAction, decodeError, timedTask, clamp, safeTitle } from '../util.js';
import { createSpotifyClient } from '../spotify-client.js';

const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'config.json');
let fileCfgPromise = null;
async function fileConfig() {
  if (!fileCfgPromise) {
    fileCfgPromise = readFile(CONFIG_PATH, 'utf8')
      .then((raw) => { try { return JSON.parse(raw) ?? {}; } catch { return {}; } })
      .catch(() => ({}));
  }
  return fileCfgPromise;
}

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

async function muteToggle(api, id, store) {
  const r = await api.callApi('GET', '/me/player');
  const cur = Number(r.json?.device?.volume_percent) || 0;
  const volume = cur > 0 ? 0 : (store.get(id) ?? 50);
  if (cur > 0) store.set(id, cur);
  const res = await api.callApi('PUT', '/me/player/volume', { query: { volume_percent: volume } });
  return { volume, res };
}

const spotifyError = () => Object.assign(new Error('spotify isteği başarısız'), { code: 'SPOTIFY' });

const MODE_ACTIONS = {
  'toggle-play': async (api) => {
    const r = await api.callApi('GET', '/me/player');
    const playing = !!(r.ok && r.json?.is_playing);
    return api.callApi('POST', playing ? '/me/player/pause' : '/me/player/play');
  },
  next: (api) => api.callApi('POST', '/me/player/next'),
  prev: (api) => api.callApi('POST', '/me/player/previous'),
  like: async (api) => {
    const r = await api.callApi('GET', '/me/player/currently-playing');
    const trackId = r.json?.item?.id;
    if (!trackId) throw Object.assign(new Error('çalınan parça yok'), { code: 'SPOTIFY' });
    return api.callApi('PUT', '/me/tracks', { query: { ids: trackId } });
  },
  mute: async (api, { id, client, muteVolumes }) => {
    const { volume, res } = await muteToggle(api, id, muteVolumes);
    if (res.ok) await client.setTitle(id, volume === 0 ? 'Sessiz' : `%${volume}`);
    return res;
  },
};

export function registerSpotify(
  client,
  { makeClient = createSpotifyClient, fetchImpl = globalThis.fetch, resize = undefined, pollMs = 15000 } = {},
) {
  const timers = new Map();
  const covers = new Map();
  const muteVolumes = new Map();

  const settingsFor = async (id) => {
    const [s, f] = await Promise.all([
      client.getSettings(id).catch(() => null),
      fileConfig().catch(() => ({})),
    ]);
    const fileSpotify = f?.spotify && typeof f.spotify === 'object' ? f.spotify : {};
    const bound = s && typeof s === 'object' ? s : {};
    const keys = ['clientId', 'clientSecret', 'refreshToken', 'accessToken'];
    const merged = { ...bound };
    for (const k of keys) {
      if ((merged[k] == null || merged[k] === '') && fileSpotify[k] != null) merged[k] = fileSpotify[k];
    }
    if (!Object.keys(bound).length) {
      const p = await client.getSettings().catch(() => null);
      if (p && typeof p === 'object') {
        for (const k of keys) {
          if (p[k] != null && p[k] !== '' && (merged[k] == null || merged[k] === '')) merged[k] = p[k];
        }
      }
    }
    return merged;
  };
  const buildClient = (s) => makeClient({
    clientId: s?.clientId, clientSecret: s?.clientSecret, refreshToken: s?.refreshToken, accessToken: s?.accessToken, fetchImpl,
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
      const res = await run(api, { id, client, muteVolumes });
      if (!res.ok) throw spotifyError();
      if (mode === 'toggle-play') await runningState(id);
      await client.showSuccess(id);
    } catch (err) {
      if (decodeError(err).silent) return;
      console.error('[spotify]', err?.message || err?.code || err);
      const sk = await settingsFor(id).catch(() => ({}));
      console.error('[spotify] settings keys:', Object.keys(sk).length ? Object.keys(sk).join(',') : 'BOŞ');
      try { await client.setTitle(id, '—'); await client.showError(id); } catch { /* ignore */ }
    }
  });

  const knobRotate = forAction('spotify-volume')(async (event) => {
    const id = event.context.bindingInstanceId;
    try {
      const delta = Number(event.payload?.delta) || (event.payload?.direction === 'LEFT' ? -10 : 10);
      const s = await settingsFor(id);
      const api = buildClient(s);
      let r = await api.callApi('GET', '/me/player');
      if (!r.ok || !r.json?.device) {
        const dev = await api.callApi('GET', '/me/player/devices');
        const deviceId = dev.json?.devices?.[0]?.id;
        if (dev.ok && deviceId) {
          await api.callApi('POST', '/me/player/transfer-playback', { body: { device_ids: [deviceId], play: false } });
          r = await api.callApi('GET', '/me/player');
        }
      }
      if (!r.ok || !r.json?.device) throw Object.assign(new Error('etkin cihaz yok'), { code: 'SPOTIFY' });
      const cur = Number(r.json.device.volume_percent) || 0;
      const v = clamp(cur + delta, 0, 100);
      const put = await api.callApi('PUT', '/me/player/volume', { query: { volume_percent: v } });
      if (!put.ok) throw spotifyError();
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
      const { volume, res } = await muteToggle(api, id, muteVolumes);
      if (!res.ok) throw spotifyError();
      await client.setTitle(id, volume === 0 ? 'Sessiz' : `%${volume}`);
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

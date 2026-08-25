const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const REFRESH_WINDOW_MS = 30 * 60 * 1000;

export function createSpotifyClient({ clientId, clientSecret, refreshToken, accessToken, fetchImpl = globalThis.fetch }) {
  let accessTokenCache = accessToken ?? null;
  let expiresAt = accessToken ? Date.now() + 55 * 60 * 1000 : 0;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  async function refresh() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
      const res = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basic}`,
        },
        body: body.toString(),
        signal: controller.signal,
      });
      if (!res.ok) throw Object.assign(new Error(`token refresh failed (${res.status}) secret:${Boolean(clientSecret).toString()} token:${Boolean(refreshToken).toString()}`), { code: 'TOKEN' });
      const data = await res.json();
      accessTokenCache = data.access_token;
      expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
      return true;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getToken() {
    if (!accessTokenCache || Date.now() >= expiresAt - REFRESH_WINDOW_MS) {
      if (!refreshToken) throw Object.assign(new Error('expired accessToken & no refresh token'), { code: 'TOKEN' });
      await refresh();
    }
    return accessTokenCache;
  }

  async function rawCall(method, path, { body, query } = {}) {
    const token = await getToken();
    const url = `https://api.spotify.com/v1${path}${query ? '?' + new URLSearchParams(query).toString() : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      let json = null;
      try { json = await res.json(); } catch { /* ignore */ }
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      throw Object.assign(err, { code: 'NETWORK' });
    } finally {
      clearTimeout(timer);
    }
  }

  async function callApi(method, path, opts = {}) {
    const r = await rawCall(method, path, opts);
    if (r.status === 401) {
      accessTokenCache = null;
      await refresh();
      return rawCall(method, path, opts);
    }
    return r;
  }

  function normalizeTrack(t) {
    if (!t) return null;
    const images = Array.isArray(t.album?.images) ? t.album.images : [];
    return {
      uri: t.uri ?? '',
      name: t.name ?? '',
      artUrl: images.length ? images[images.length - 1].url : null,
      artists: (t.artists ?? []).map((a) => a.name).join(', '),
      isPlaying: true,
    };
  }

  return { getToken, callApi, refresh, normalizeTrack };
}

export function validateExternalUrl(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: 'url type invalid' };
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: 'empty url' };
  let u;
  try { u = new URL(trimmed); } catch { return { ok: false, reason: 'bad url format' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'only http/https' };
  if (!u.hostname) return { ok: false, reason: 'no hostname' };
  if (u.username || u.password) return { ok: false, reason: 'credentials not allowed' };
  return { ok: true, url: u.href };
}

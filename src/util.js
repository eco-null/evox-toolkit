export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Bağlam (tuş) artık yok ya da plugin kapatılıyor: hata değil, sessizce bırak.
export function decodeError(err) {
  const code = err?.code;
  if (code === 'CONTEXT_EXPIRED' || code === 'PLUGIN_DISABLED') return { silent: true };
  return { silent: false };
}

export function forAction(actionId) {
  return (fn) => async (event) => {
    if (event?.context?.actionId !== actionId) return;
    await fn(event);
  };
}

// Aynı anahtarlı hatayı dakikada bir kez yazar; host log hızı 1 MiB/dk'yı aşan plugini kapatır.
export function createLogger(write = (line) => console.error(line), now = Date.now) {
  const seen = new Map();
  return (key, error) => {
    const at = now();
    if (at - (seen.get(key) ?? -Infinity) < 60_000) return;
    seen.set(key, at);
    write(`[toolkit] ${key}: ${String(error?.code || '')} ${String(error?.message || error || '')}`.slice(0, 300));
  };
}

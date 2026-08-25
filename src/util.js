export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function fmtBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function safeTitle(text, maxLen = 60) {
  const s = String(text ?? '');
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + '…';
}

export function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

export function timedTask(fn, intervalMs, { cooldownMs = 60000, maxFail = 3 } = {}) {
  let timer = null;
  let failing = 0;
  let cooling = false;
  const tick = async () => {
    if (cooling) return;
    try {
      await fn();
      failing = 0;
    } catch (err) {
      if (decodeError(err).silent) return;
      failing += 1;
      if (failing >= maxFail) {
        cooling = true;
        failing = 0;
        setTimeout(() => { cooling = false; }, cooldownMs);
      }
    }
  };
  return {
    start() { if (!timer) { timer = setInterval(tick, intervalMs); } },
    stop() { if (timer) { clearInterval(timer); timer = null; } },
  };
}

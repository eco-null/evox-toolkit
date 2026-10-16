import { forAction, decodeError, createLogger } from '../util.js';

const LONG_PRESS_MS = 700;

export function registerCounter(client, { log = createLogger() } = {}) {
  const counts = new Map();
  const holdTimers = new Map();

  // Zamanlayıcıdan da çağrılır; host hatası hiçbir zaman yakalanmamış ret olarak kalmaz.
  const show = (id, n) => client.setTitle(id, String(n)).catch((err) => {
    if (!decodeError(err).silent) log('counter', err);
  });

  const cancelHold = (id) => {
    const t = holdTimers.get(id);
    if (t) { clearTimeout(t); holdTimers.delete(id); }
  };

  const onDown = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    cancelHold(id);
    const n = Math.min((counts.get(id) ?? 0) + 1, 9999);
    counts.set(id, n);
    holdTimers.set(id, setTimeout(() => {
      holdTimers.delete(id);
      counts.set(id, 0);
      void show(id, 0);
    }, LONG_PRESS_MS));
    await show(id, n);
  });

  const onUp = forAction('counter')((event) => {
    cancelHold(event.context.bindingInstanceId);
  });

  const onAppear = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    const n = counts.get(id);
    if (n != null) await show(id, n);
  });

  const onGone = forAction('counter')((event) => {
    cancelHold(event.context.bindingInstanceId);
  });

  client.on('action.keyDown', onDown);
  client.on('action.keyUp', onUp);
  client.on('action.willAppear', onAppear);
  client.on('action.willDisappear', onGone);

  return { stopAll() { for (const id of [...holdTimers.keys()]) cancelHold(id); } };
}

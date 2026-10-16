// Sayaç: her basış +1, uzun basış (700 ms) sıfırlar. Sayı tuş kartında büyük gösterilir.
import { forAction, decodeError, createLogger } from '../util.js';
import { COLORS, createKeyPainter } from '../keyimg.js';

const LONG_PRESS_MS = 700;
const MAX_COUNT = 9999;

export function counterView(n) {
  return {
    label: 'SAYAÇ',
    value: String(n),
    valueSize: n >= 1000 ? 44 : 56,
    valueColor: n > 0 ? COLORS.value : COLORS.label,
    sub: 'uzun bas: sıfırla',
    title: String(n),
  };
}

export function registerCounter(client, { png, log = createLogger(), painter = createKeyPainter(client, { png, log }) } = {}) {
  const counts = new Map();
  const holdTimers = new Map();

  // Zamanlayıcıdan da çağrılır; host hatası hiçbir zaman yakalanmamış ret olarak kalmaz.
  const show = (id, n) => painter.paint(id, counterView(n)).catch((err) => {
    if (!decodeError(err).silent) log('counter', err);
  });

  const cancelHold = (id) => {
    const t = holdTimers.get(id);
    if (t) { clearTimeout(t); holdTimers.delete(id); }
  };

  const onDown = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    cancelHold(id);
    const n = Math.min((counts.get(id) ?? 0) + 1, MAX_COUNT);
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
    await show(id, counts.get(id) ?? 0);
  });

  const onGone = forAction('counter')((event) => {
    const id = event.context.bindingInstanceId;
    cancelHold(id);
    painter.forget(id);
  });

  client.on('action.keyDown', onDown);
  client.on('action.keyUp', onUp);
  client.on('action.willAppear', onAppear);
  client.on('action.willDisappear', onGone);

  return { stopAll() { for (const id of [...holdTimers.keys()]) cancelHold(id); } };
}

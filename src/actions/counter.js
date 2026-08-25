import { forAction, timedTask } from '../util.js';

const LONG_PRESS_MS = 700;

export function registerCounter(client) {
  const counts = new Map();
  const holdTimers = new Map();
  const loops = new Map();

  const stopLoop = (id) => {
    const t = loops.get(id);
    if (t) { t.stop(); loops.delete(id); }
  };

  const startLoop = (id) => {
    stopLoop(id);
    const loop = timedTask(async () => {
      const n = counts.get(id);
      if (n != null) await client.setTitle(id, String(n));
    }, 4000);
    loop.start();
    loops.set(id, loop);
  };

  const cancelHold = (id) => {
    const t = holdTimers.get(id);
    if (t) { clearTimeout(t); holdTimers.delete(id); }
  };

  const onDown = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    cancelHold(id);
    const n = Math.min((counts.get(id) ?? 0) + 1, 9999);
    counts.set(id, n);
    await client.setTitle(id, String(n));
    const hold = setTimeout(() => {
      if (counts.get(id) !== null) {
        counts.set(id, 0);
        client.setTitle(id, '0').catch(() => {});
      }
      holdTimers.delete(id);
    }, LONG_PRESS_MS);
    holdTimers.set(id, hold);
    startLoop(id);
  });

  const onUp = forAction('counter')((event) => {
    cancelHold(event.context.bindingInstanceId);
  });

  const onAppear = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    const n = counts.get(id);
    if (n != null) await client.setTitle(id, String(n));
    startLoop(id);
  });

  const onGone = forAction('counter')((event) => {
    const id = event.context.bindingInstanceId;
    stopLoop(id);
    cancelHold(id);
  });

  client.on('action.keyDown', onDown);
  client.on('action.keyUp', onUp);
  client.on('action.willAppear', onAppear);
  client.on('action.willDisappear', onGone);
}

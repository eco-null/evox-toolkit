import { forAction, timedTask } from '../util.js';

export function registerCounter(client) {
  const counts = new Map();
  const pressedAt = new Map();
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

  const onDown = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    pressedAt.set(id, Date.now());
    const n = Math.min((counts.get(id) ?? 0) + 1, 9999);
    counts.set(id, n);
    await client.setTitle(id, String(n));
    startLoop(id);
  });

  const onUp = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    const t0 = pressedAt.get(id);
    pressedAt.delete(id);
    if (t0 != null && Date.now() - t0 > 700) {
      counts.set(id, 0);
      await client.setTitle(id, '0');
    }
  });

  const onAppear = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    const n = counts.get(id);
    if (n != null) await client.setTitle(id, String(n));
    startLoop(id);
  });

  const onGone = forAction('counter')((event) => {
    stopLoop(event.context.bindingInstanceId);
    pressedAt.delete(event.context.bindingInstanceId);
  });

  client.on('action.keyDown', onDown);
  client.on('action.keyUp', onUp);
  client.on('action.willAppear', onAppear);
  client.on('action.willDisappear', onGone);
}

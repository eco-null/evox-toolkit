import { forAction } from '../util.js';

export function registerCounter(client) {
  const counts = new Map();
  const pressedAt = new Map();

  const onDown = forAction('counter')(async (event) => {
    const id = event.context.bindingInstanceId;
    pressedAt.set(id, Date.now());
    const n = Math.min((counts.get(id) ?? 0) + 1, 9999);
    counts.set(id, n);
    await client.setTitle(id, String(n));
    await client.showSuccess(id);
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

  const onGone = forAction('counter')((event) => {
    const id = event.context.bindingInstanceId;
    counts.delete(id);
    pressedAt.delete(id);
  });

  client.on('action.keyDown', onDown);
  client.on('action.keyUp', onUp);
  client.on('action.willDisappear', onGone);
}

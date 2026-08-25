export function makeFakeClient() {
  const handlers = {};
  const calls = { setTitle: [], showSuccess: [], showError: [], setImage: [] };
  const client = {
    handlers,
    calls,
    on(name, fn) {
      if (!handlers[name]) handlers[name] = [];
      handlers[name].push(fn);
    },
    async emit(name, payload) {
      for (const fn of handlers[name] ?? []) await fn(payload);
    },
    setTitle(c, t) { calls.setTitle.push([c, t]); return Promise.resolve(); },
    showSuccess(c) { calls.showSuccess.push(c); return Promise.resolve(); },
    showError(c) { calls.showError.push(c); return Promise.resolve(); },
    setImage(c, img) { calls.setImage.push([c, img]); return Promise.resolve(); },
    async getSettings() { return {}; },
    async patchSettings(s) { return {}; },
    async request() { return { ok: true, json: {} }; },
    dispose() {},
  };
  return client;
}

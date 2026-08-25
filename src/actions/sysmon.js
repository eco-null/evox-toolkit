import { forAction, timedTask, clamp, decodeError } from '../util.js';
import { execPs } from '../windows.js';

let siCache = null;
async function moduleSi() {
  if (!siCache) siCache = await import('systeminformation');
  return siCache;
}

export function defaultSi() {
  const api = {
    currentLoad: async () => {
      try { return await (await moduleSi()).currentLoad(); }
      catch { return { currentLoad: null }; }
    },
    cpuTemperature: async () => {
      try {
        const r = await (await moduleSi()).cpuTemperature();
        return r?.main > 0 && r?.main < 200 ? r : null;
      } catch { return null; }
    },
    wmiTemp: async () => {
      const out = await execPs("Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature | Select-Object -First 1 -ExpandProperty CurrentTemperature");
      const val = parseInt(String(out).trim(), 10);
      if (Number.isFinite(val) && val !== 0xFFFFFFFF && val > 100) return { main: (val / 10.0) - 273.15 };
      return null;
    },
    lhmTemp: async (url) => {
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const sensors = Array.isArray(data) ? data : (data?.Sensors ?? []);
        const hit = sensors.find((s) => {
          const name = String(s?.Name ?? '').toLowerCase();
          return name.includes('cpu package') || name.includes('cpu temperature');
        });
        const v = Number(hit?.Value);
        if (Number.isFinite(v) && v > 0 && v < 130) return { main: v };
        return null;
      } catch { return null; }
    },
    gpuInfo: async () => {
      try {
        const out = await execPs('nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader');
        const line = String(out).split(',').map((s) => s.trim());
        const u = Number.parseFloat(line[0]);
        const t = Number.parseFloat(line[1]);
        if (Number.isFinite(u) && u >= 0) {
          return { util: u, temp: Number.isFinite(t) && t > 0 && t < 130 ? t : null };
        }
      } catch { /* fallback */ }
      try {
        const g = await (await moduleSi()).graphics();
        const c = (g?.controllers ?? []).find((c) => c?.utilizationGpu != null || c?.temperatureGpu != null);
        return { util: c?.utilizationGpu ?? null, temp: c?.temperatureGpu ?? null };
      } catch { return { util: null, temp: null }; }
    },
    mem: async () => {
      try {
        const m = await (await moduleSi()).mem();
        return { used: m.used, total: m.total };
      } catch { return { used: null, total: null }; }
    },
    fsAll: async () => {
      try { return await (await moduleSi()).fsSize(); }
      catch { return []; }
    },
  };
  return api;
}

function fmtGbOne(v) {
  const g = v / 1024 ** 3;
  if (g >= 100) return String(Math.round(g));
  return String(Math.round(g * 10) / 10);
}

function fmtFreeGb(v) {
  const g = v / 1024 ** 3;
  if (g >= 1000) return `${(g / 1024).toFixed(1)}TB`;
  return `${Math.round(g)}GB`;
}

export function drawCpuPanel({ load, temp }) {
  const l = typeof load === 'number' && Number.isFinite(load) ? clamp(Math.round(load), 0, 100) : null;
  const t = typeof temp === 'number' && temp > 0 && temp < 130 ? Math.round(temp) : null;
  if (t == null && l == null) return '—';
  if (t == null) return `${l}%`;
  if (l == null) return `${t}°C`;
  return `${t}°C\n${l}%`;
}

export function drawGpuPanel({ util, temp }) {
  const u = typeof util === 'number' && util >= 0 ? clamp(Math.round(util), 0, 100) : null;
  const t = typeof temp === 'number' && temp > 0 && temp < 130 ? Math.round(temp) : null;
  if (u == null && t == null) return '—';
  if (t == null) return `${u}%`;
  if (u == null) return `${t}°C`;
  return `${t}°C\n${u}%`;
}

export function drawRamPanel({ used, total }) {
  if (typeof used !== 'number' || used < 0 || typeof total !== 'number' || total <= 0) return '—';
  return `${fmtGbOne(used)}/${fmtGbOne(total)}GB`;
}

export function drawDiskPanel({ fs, freeB }) {
  if (!fs || typeof freeB !== 'number' || !Number.isFinite(freeB) || freeB < 0) return '—';
  const label = String(fs).replace(/:$/, ':');
  return `${label} ${fmtFreeGb(freeB)}`;
}

export function pickDiskRotation(fsArr, tick) {
  if (!Array.isArray(fsArr) || fsArr.length === 0) return null;
  return fsArr[tick % fsArr.length];
}

async function snapshotFor(panelId, si, cfg) {
  switch (panelId) {
    case 'sys-cpu': {
      const [load, temp] = await Promise.all([si.currentLoad().catch(() => null), si.cpuTemperature().catch(() => null)]);
      let t = temp?.main ?? null;
      if (!(typeof t === 'number' && t > 0)) t = (await si.wmiTemp())?.main ?? null;
      if (!(typeof t === 'number' && t > 0) && cfg?.lhmUrl) t = (await si.lhmTemp(cfg.lhmUrl)) ?? null;
      return { load: load && typeof load === 'object' ? load.currentLoad : null, temp: t };
    }
    case 'sys-gpu': return si.gpuInfo();
    case 'sys-ram': return si.mem();
    case 'sys-disk': return si.fsAll();
    default: return null;
  }
}

export function registerSysmon(client, { siImpl } = {}) {
  const si = siImpl ?? defaultSi();
  const state = new Map();

  const stopBind = (id) => {
    const s = state.get(id);
    if (s) { s.task.stop(); state.delete(id); }
  };

  const startBind = async (panelId, event) => {
    const id = event.context.bindingInstanceId;
    stopBind(id);
    const settings = await client.getSettings(id).catch(() => ({}));
    const intervalSec = clamp(Number(settings?.interval) || 3, 1, 60);
    const cfg = { lhmUrl: String(settings?.lhmUrl ?? '').trim() };
    let tick = 0;
    const task = timedTask(async () => {
      const snap = await snapshotFor(panelId, si, cfg);
      let title;
      switch (panelId) {
        case 'sys-cpu': title = drawCpuPanel(snap); break;
        case 'sys-gpu': title = drawGpuPanel(snap); break;
        case 'sys-ram': title = drawRamPanel(snap); break;
        default: {
          const drives = Array.isArray(snap) ? snap : [];
          const drive = pickDiskRotation(drives, tick);
          if (!drive) { title = '—'; break; }
          if (drives.length > 1) tick++;
          title = drawDiskPanel({ fs: drive.fs, freeB: drive.available ?? (drive.size - drive.used) });
        }
      }
      await client.setTitle(id, title);
    }, intervalSec * 1000);
    task.start();
    state.set(id, { task });
  };

  for (const panelId of ['sys-cpu', 'sys-gpu', 'sys-ram', 'sys-disk']) {
    client.on('action.willAppear', forAction(panelId)((event) => startBind(panelId, event)));
    client.on('action.willDisappear', forAction(panelId)((event) => stopBind(event.context.bindingInstanceId)));
    client.on('action.settingsChanged', forAction(panelId)((event) => startBind(panelId, event)));
  }
}

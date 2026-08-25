import { forAction, timedTask, fmtBytes, clamp, decodeError } from '../util.js';
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
    gpuInfo: async () => {
      try {
        const out = await execPs('nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader');
        const line = String(out).split(',').map((s) => s.trim());
        if (line.length >= 2 && Number.isFinite(Number(line[0]))) {
          return { util: Number(line[0]), temp: Number(line[1]) || null };
        }
      } catch { /* fallback */ }
      try {
        const g = await (await moduleSi()).graphics();
        const c = g?.controllers?.[0];
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

export function drawCpuPanel({ load, temp }) {
  const l = typeof load === 'number' && Number.isFinite(load) ? clamp(Math.round(load), 0, 100) : null;
  const t = typeof temp === 'number' && temp > 0 && temp < 130 ? Math.round(temp) : null;
  return `CPU\n${l == null ? '—' : l + '%'} · ${t == null ? '—' : t + '°C'}`;
}

export function drawGpuPanel({ util, temp }) {
  const u = typeof util === 'number' && util >= 0 ? Math.round(util) : null;
  const t = typeof temp === 'number' && temp > 0 ? Math.round(temp) : null;
  if (u == null && t == null) return 'GPU\n—';
  return `GPU\n${u == null ? '—' : u + '%'} · ${t == null ? '—' : t + '°C'}`;
}

export function drawRamPanel({ used, total }) {
  if (typeof used !== 'number' || used < 0 || typeof total !== 'number' || total <= 0) return 'RAM\n—';
  return `RAM\n${fmtBytes(used)} / ${fmtBytes(total)}\n${Math.round((used / total) * 100)}%`;
}

export function drawDiskPanel({ fs, usedB, totalB, extra = 0 }) {
  const label = fs ? String(fs).replace(/:$/, ':\\') : null;
  const header = label ? `${label} ${fmtBytes(usedB)} / ${fmtBytes(totalB)}` : '—';
  const pct = totalB > 0 ? Math.round((usedB / totalB) * 100) : null;
  const line2 = extra > 0 ? `+${extra} sürücü` : (pct == null ? '—' : pct + '%');
  return `${header}\n${line2}`;
}

export function pickDiskRotation(fsArr, tick) {
  if (!Array.isArray(fsArr) || fsArr.length === 0) return null;
  return fsArr[tick % fsArr.length];
}

async function snapshotFor(panelId, si) {
  switch (panelId) {
    case 'sys-cpu': {
      const [load, temp] = await Promise.all([si.currentLoad().catch(() => null), si.cpuTemperature().catch(() => null)]);
      const t = temp?.main ?? (await si.wmiTemp())?.main ?? null;
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
    let tick = 0;
    const task = timedTask(async () => {
      const snap = await snapshotFor(panelId, si);
      let title;
      switch (panelId) {
        case 'sys-cpu': title = drawCpuPanel(snap); break;
        case 'sys-gpu': title = drawGpuPanel(snap); break;
        case 'sys-ram': title = drawRamPanel(snap); break;
        default: {
          const drives = Array.isArray(snap) ? snap : [];
          const drive = pickDiskRotation(drives, tick);
          if (!drive) { title = 'Disk\n—'; break; }
          if (drives.length > 1) tick++;
          title = drawDiskPanel({ fs: drive.fs, usedB: drive.used, totalB: drive.size, extra: drives.length - 1 });
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

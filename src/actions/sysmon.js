import { forAction, timedTask, clamp, decodeError } from '../util.js';
import { execPs } from '../windows.js';
import { renderKey } from '../keyimg.js';

const DEFAULT_LHM_URL = 'http://localhost:8085/data.json';

let siCache = null;
async function moduleSi() {
  if (!siCache) siCache = await import('systeminformation');
  return siCache;
}

export function parseLhmValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseLhm(root) {
  const out = { cpuTemp: null, gpuTemp: null, gpuUtil: null };
  const all = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    all.push(n);
    if (Array.isArray(n.Children)) n.Children.forEach(walk);
  })(root);
  for (const node of all) {
    const sensorId = String(node.SensorId ?? '');
    const type = String(node.Type ?? '');
    const text = String(node.Text ?? '');
    const v = parseLhmValue(node.Value);
    if (v == null || v <= 0) continue;
    if (sensorId.startsWith('/amdcpu')) {
      if (type === 'Temperature') {
        if (text.includes('Tctl') || (out.cpuTemp == null && text.includes('CCDs Max')) || (out.cpuTemp == null && text.startsWith('CCD'))) {
          out.cpuTemp = Math.round(v);
        }
      }
    } else if (sensorId.startsWith('/gpu-nvidia')) {
      if (type === 'Temperature' && out.gpuTemp == null) out.gpuTemp = Math.round(v);
      if (type === 'Load' && text === 'GPU Core' && out.gpuUtil == null) out.gpuUtil = Math.round(v);
    }
  }
  return out;
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
    lhmInfo: async (url) => {
      try {
        const target = String(url ?? '').trim() || DEFAULT_LHM_URL;
        const res = await fetch(target);
        if (!res.ok) return null;
        return parseLhm(await res.json());
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

export function layoutCpuPanel({ load, temp }) {
  const l = typeof load === 'number' && Number.isFinite(load) ? clamp(Math.round(load), 0, 100) : null;
  const t = typeof temp === 'number' && temp > 0 && temp < 130 ? Math.round(temp) : null;
  const rows = [];
  if (t != null) rows.push({ text: `${t}°C`, color: '#9adcff', size: 34 });
  if (l != null) rows.push({ text: `${l}%` });
  return rows.length ? rows : [{ text: '—' }];
}

export function layoutGpuPanel({ util, temp }) {
  const u = typeof util === 'number' && util >= 0 ? clamp(Math.round(util), 0, 100) : null;
  const t = typeof temp === 'number' && temp > 0 && temp < 130 ? Math.round(temp) : null;
  const rows = [];
  if (t != null) rows.push({ text: `${t}°C`, color: '#9adcff', size: 34 });
  if (u != null) rows.push({ text: `${u}%` });
  return rows.length ? rows : [{ text: '—' }];
}

export function layoutRamPanel({ used, total }) {
  if (typeof used !== 'number' || used < 0 || typeof total !== 'number' || total <= 0) return [{ text: '—' }];
  return [
    { text: `${fmtGbOne(used)}GB`, color: '#9adcff', size: 34 },
    { text: `toplam ${fmtGbOne(total)}GB`, size: 20 },
  ];
}

export function layoutDiskPanel({ fs, freeB }) {
  if (!fs || typeof freeB !== 'number' || !Number.isFinite(freeB) || freeB < 0) return [{ text: '—' }];
  const label = String(fs).replace(/:$/, ':');
  return [
    { text: label, color: '#9adcff', size: 34 },
    { text: fmtFreeGb(freeB), size: 26 },
  ];
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
      if (!(typeof t === 'number' && t > 0)) {
        const lhm = await si.lhmInfo(cfg.lhmUrl).catch(() => null);
        if (lhm?.cpuTemp) t = lhm.cpuTemp;
      }
      return { load: load && typeof load === 'object' ? load.currentLoad : null, temp: t };
    }
    case 'sys-gpu': {
      const g = await si.gpuInfo().catch(() => ({ util: null, temp: null }));
      if (g && g.util != null) return g;
      const lhm = await si.lhmInfo(cfg.lhmUrl).catch(() => null);
      if (lhm && (lhm.gpuUtil != null || lhm.gpuTemp != null)) {
        return { util: lhm.gpuUtil ?? g.util, temp: lhm.gpuTemp ?? g.temp };
      }
      return g ?? { util: null, temp: null };
    }
    case 'sys-ram': return si.mem();
    case 'sys-disk': return si.fsAll();
    case 'sys-disk-pick': return si.fsAll();
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
    const cfg = { lhmUrl: String(settings?.lhmUrl ?? '').trim(), drive: String(settings?.drive ?? '').trim() };
    let tick = 0;
    const task = timedTask(async () => {
      const snap = await snapshotFor(panelId, si, cfg);
      let rows;
      switch (panelId) {
        case 'sys-cpu': rows = layoutCpuPanel(snap); break;
        case 'sys-gpu': rows = layoutGpuPanel(snap); break;
        case 'sys-ram': rows = layoutRamPanel(snap); break;
        case 'sys-disk-pick': {
          const drives = Array.isArray(snap) ? snap : [];
          const prefix = cfg.drive ? cfg.drive.toUpperCase().replace(/:$/, '') : null;
          const matched = prefix ? drives.filter((d) => String(d.fs).toUpperCase().startsWith(prefix)) : drives;
          const drive = pickDiskRotation(matched, tick);
          if (!drive) { rows = [{ text: cfg.drive ? `${cfg.drive} —` : '—' }]; break; }
          if (matched.length > 1) tick++;
          rows = layoutDiskPanel({ fs: drive.fs, freeB: drive.available ?? (drive.size - drive.used) });
          break;
        }
        default: {
          const drives = Array.isArray(snap) ? snap : [];
          const drive = pickDiskRotation(drives, tick);
          if (!drive) { rows = [{ text: '—' }]; break; }
          if (drives.length > 1) tick++;
          rows = layoutDiskPanel({ fs: drive.fs, freeB: drive.available ?? (drive.size - drive.used) });
        }
      }
      await renderKey(client, id, rows);
    }, intervalSec * 1000);
    task.start();
    state.set(id, { task });
  };

  for (const panelId of ['sys-cpu', 'sys-gpu', 'sys-ram', 'sys-disk', 'sys-disk-pick']) {
    client.on('action.willAppear', forAction(panelId)((event) => startBind(panelId, event)));
    client.on('action.willDisappear', forAction(panelId)((event) => stopBind(event.context.bindingInstanceId)));
    client.on('action.settingsChanged', forAction(panelId)((event) => startBind(panelId, event)));
  }
}

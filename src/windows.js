import { spawn } from 'node:child_process';
import { parseCombo } from './hotkey-combo.js';
import { buildSendInputSource } from './sendinput-ps.js';
import { validateExternalUrl } from './url-guard.js';

const PS_TIMEOUT = 5000;

export function execPs(script, { inputBase64 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], { windowsHide: true });
    let out = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    const kill = setTimeout(() => { try { child.kill(); } catch {} resolve(null); }, PS_TIMEOUT);
    child.on('close', (code) => { clearTimeout(kill); resolve(code === 0 ? out : null); });
    child.on('error', () => { clearTimeout(kill); resolve(null); });
    // PowerShell erken kapanırsa stdin EPIPE verir; dinleyicisiz 'error' süreci düşürür.
    child.stdin.on('error', () => {});
    if (inputBase64 != null) {
      child.stdin.write(`$in = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${inputBase64}'))\n`);
    }
    child.stdin.write(`${script}\n`);
    child.stdin.end();
  });
}

export function createWindowsLayer({ exec = execPs } = {}) {
  const sendCombo = async (combo) => {
    const parsed = parseCombo(combo);
    if (!parsed) return false;
    const src = buildSendInputSource({ mods: parsed.mods, vk: parsed.vk });
    const out = await exec(src);
    return typeof out === 'string';
  };

  const getClipboard = async () => {
    const out = await exec("Get-Clipboard -Raw");
    return out ?? '';
  };

  const setClipboard = async (text) => {
    const b64 = Buffer.from(String(text ?? ''), 'utf8').toString('base64');
    const src = `$t = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}')); Set-Clipboard -Value $t`;
    return (await exec(src)) !== null;
  };

  const typeText = async (text, { direct = false } = {}) => {
    const s = String(text ?? '');
    if (!s) return false;
    if (direct && /^[A-Za-z0-9 ]*$/.test(s)) {
      for (const ch of s) {
        const ok = await sendCombo(ch === ' ' ? 'Space' : ch);
        if (!ok) return false;
      }
      return true;
    }
    if (await setClipboard(s)) return sendCombo('Ctrl+V');
    return false;
  };

  const openExternal = async (rawUrl) => {
    const v = validateExternalUrl(rawUrl);
    if (!v.ok) return false;
    const safe = v.url.replace(/'/g, "''");
    const out = await exec(`Start-Process -FilePath '${safe}'`);
    return typeof out === 'string';
  };

  return { sendCombo, getClipboard, setClipboard, typeText, openExternal };
}

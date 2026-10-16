// evoX Toolkit — T1 (trusted-node) giriş noktası.
// Host bu dosyayı fork eder ve 5 sn içinde handshake bekler; bu yüzden burada yalnız hafif
// modüller yüklenir. sharp ilk tuş çiziminde, PowerShell/SendInput katmanı ilk basışta yüklenir.
import { readFileSync } from 'node:fs';
import { EvoxPluginClient } from '@evoxapp/plugin-sdk';
import { createNodeProcessIpcPluginTransport } from '@evoxapp/plugin-sdk/node';
import { createLogger } from './src/util.js';
import { registerCounter } from './src/actions/counter.js';
import { registerWeather } from './src/actions/weather.js';
import { registerHotkey } from './src/actions/hotkey.js';
import { registerClipboard } from './src/actions/clipboard.js';
import { registerOpenUrl } from './src/actions/openurl.js';

const manifest = JSON.parse(readFileSync(new URL('./manifest.json', import.meta.url), 'utf8'));

const log = createLogger();
// Yakalanmamış bir ret süreci düşürür ve host'un çökme bütçesini (5 dk'da 3) harcar; kaydedip devam et.
process.on('unhandledRejection', (error) => log('unhandledRejection', error));

const client = new EvoxPluginClient(createNodeProcessIpcPluginTransport(), {
  // Manifestteki sdkVersion ile birebir aynı olmalı; host handshake'te karşılaştırır.
  sdkVersion: manifest.sdkVersion,
  onError: (error) => log('sdk', error),
});

let windowsLayer = null;
const loadWindows = () => (windowsLayer ??= import('./src/windows.js')
  .then((m) => m.createWindowsLayer())
  .catch((error) => { windowsLayer = null; throw error; }));
const win = Object.fromEntries(['sendCombo', 'getClipboard', 'setClipboard', 'typeText', 'openExternal']
  .map((name) => [name, async (...args) => (await loadWindows())[name](...args)]));

const counter = registerCounter(client, { log });
const weather = registerWeather(client, { log });
registerHotkey(client, { win, log });
registerClipboard(client, { win, log });
registerOpenUrl(client, { win, log });

let stopped = false;
client.on('plugin.stop', () => {
  if (stopped) return;
  stopped = true;
  counter.stopAll();
  weather.stopAll();
  client.dispose();
});

await client.start();

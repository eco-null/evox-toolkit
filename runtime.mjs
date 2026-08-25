import { EvoxPluginClient } from '@evoxapp/plugin-sdk';
import { createNodeProcessIpcPluginTransport } from '@evoxapp/plugin-sdk/node';
import { registerCounter } from './src/actions/counter.js';
import { registerWeather } from './src/actions/weather.js';
import { registerSysmon } from './src/actions/sysmon.js';
import { registerHotkey } from './src/actions/hotkey.js';
import { registerClipboard } from './src/actions/clipboard.js';
import { registerOpenUrl } from './src/actions/openurl.js';
import { registerSpotify } from './src/actions/spotify.js';

const client = new EvoxPluginClient(createNodeProcessIpcPluginTransport(), {
  sdkVersion: '0.1.0',
  onError: (error) => console.error('[sdk]', String(error?.message || error?.code || 'Bilinmeyen hata')),
});

registerCounter(client);
registerWeather(client);
registerSysmon(client);
registerHotkey(client);
registerClipboard(client);
registerOpenUrl(client);
registerSpotify(client);

let stopped = false;
client.on('plugin.stop', async () => {
  if (stopped) return;
  stopped = true;
  try { client.dispose(); } catch { /* ignore */ }
});

await client.start();

import { EvoxPluginClient } from '@evoxapp/plugin-sdk';
import { createNodeProcessIpcPluginTransport } from '@evoxapp/plugin-sdk/node';

const client = new EvoxPluginClient(createNodeProcessIpcPluginTransport(), {
  sdkVersion: '0.1.0',
  onError: (error) => console.error('[sdk] ' + String(error?.message || error?.code || 'Bilinmeyen hata')),
});

client.on('action.willAppear', async (event) => {
  if (event.context?.actionId !== 'hello') return;
  await client.setTitle(event.context.bindingInstanceId, 'Merhaba');
});

client.on('action.keyDown', async (event) => {
  if (event.context?.actionId !== 'hello') return;
  await client.setTitle(event.context.bindingInstanceId, new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  await client.showSuccess(event.context.bindingInstanceId);
});

await client.start();

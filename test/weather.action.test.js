import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFakeClient } from './helpers/fake-client.js';
import { clockMinutes, parseWeather, registerWeather, weatherKind, weatherView } from '../src/actions/weather.js';

function j1({ temp = '14', humidity = '67', code = '113', min = '13', max = '19', sunrise = '07:17 AM', sunset = '06:22 PM' } = {}) {
  return {
    current_condition: [{ temp_C: temp, FeelsLikeC: '12', humidity, weatherCode: code }],
    weather: [{ mintempC: min, maxtempC: max, astronomy: [{ sunrise, sunset }] }],
  };
}
const respond = (body) => async () => ({ ok: true, json: async () => body });
const svgOf = (client, i = 0) => Buffer.from(client.calls.setImage[i][1].dataBase64, 'base64').toString('utf8');
const ctx = { actionId: 'weather', bindingInstanceId: 'b1' };
const noon = () => new Date(2026, 9, 16, 12, 0);

test('kart sıcaklık, nem, şehir ve en düşük/en yüksek değeri gösterir', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Istanbul', interval: '30' });
  const weather = registerWeather(client, { fetchImpl: respond(j1()), png: async (svg) => Buffer.from(svg), now: noon });
  await client.emit('action.willAppear', { context: ctx });
  const svg = svgOf(client);
  for (const part of ['ISTANBUL', '14°', '67%', '13° / 19°']) assert.ok(svg.includes(part), part);
  assert.ok(svg.includes('#fbbf24'), 'gündüz açık havada güneş');
  weather.stopAll();
});

test('wttr.in JSON (j1) adresi kullanılır, olay ayarları host sorulmadan okunur', async () => {
  const client = makeFakeClient();
  let asked = 0;
  client.getSettings = async () => { asked++; return {}; };
  const urls = [];
  const weather = registerWeather(client, {
    fetchImpl: async (url) => { urls.push(url); return { ok: true, json: async () => j1() }; },
    png: async (svg) => Buffer.from(svg),
  });
  await client.emit('action.willAppear', { context: ctx, payload: { settings: { city: 'Kars' } } });
  assert.equal(asked, 0);
  assert.deepEqual(urls, ['https://wttr.in/Kars?format=j1']);
  weather.stopAll();
});

test('aynı veri tekrar çizilmez, basış veriyi yeniden çeker', async () => {
  let fetches = 0;
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Istanbul' });
  const weather = registerWeather(client, {
    fetchImpl: async () => { fetches++; return { ok: true, json: async () => j1() }; },
    png: async (svg) => Buffer.from(svg),
    now: noon,
  });
  await client.emit('action.willAppear', { context: ctx });
  await client.emit('action.keyDown', { context: ctx });
  assert.equal(fetches, 2);
  assert.equal(client.calls.setImage.length, 1);
  weather.stopAll();
});

test('görsel çizilemezse metin başlığa düşer', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Ankara' });
  const weather = registerWeather(client, {
    fetchImpl: respond(j1({ temp: '15', humidity: '20' })),
    png: async () => { throw new Error('no'); },
  });
  await client.emit('action.keyDown', { context: ctx });
  assert.deepEqual(client.calls.setTitle[0], ['b1', 'Ankara\n15°\n20%']);
  weather.stopAll();
});

test('şehir boşsa kartta ipucu gösterilir', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: '' });
  const weather = registerWeather(client, { fetchImpl: async () => { throw new Error('x'); }, png: async (svg) => Buffer.from(svg) });
  await client.emit('action.willAppear', { context: ctx });
  assert.ok(svgOf(client).includes('Şehir seçin'));
  weather.stopAll();
});

test('bağlantı hatasında kart + showError', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  const weather = registerWeather(client, { fetchImpl: async () => { throw new Error('fail'); }, png: async (svg) => Buffer.from(svg), log: () => {} });
  await client.emit('action.keyDown', { context: ctx });
  assert.ok(svgOf(client).includes('bağlantı yok'));
  assert.equal(client.calls.showError.length, 1);
  weather.stopAll();
});

test('CONTEXT_EXPIRED tuşu durdurur, hata fırlatmaz', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  client.setImage = async () => { throw Object.assign(new Error('gone'), { code: 'CONTEXT_EXPIRED' }); };
  const logged = [];
  const weather = registerWeather(client, { fetchImpl: respond(j1()), png: async (svg) => Buffer.from(svg), log: (key) => logged.push(key) });
  await client.emit('action.willAppear', { context: ctx });
  assert.equal(weather.bindings.size, 0);
  assert.deepEqual(logged, []);
});

test('RATE_LIMITED kare atlanır ve loglanmaz', async () => {
  const client = makeFakeClient();
  client.getSettings = async () => ({ city: 'Izmir' });
  client.setImage = async () => { throw Object.assign(new Error('slow'), { code: 'RATE_LIMITED' }); };
  const logged = [];
  const weather = registerWeather(client, { fetchImpl: respond(j1()), png: async (svg) => Buffer.from(svg), log: (key) => logged.push(key) });
  await client.emit('action.willAppear', { context: ctx });
  assert.equal(weather.bindings.size, 1);
  assert.deepEqual(logged, []);
  weather.stopAll();
  assert.equal(weather.bindings.size, 0);
});

test('tanınmayan aksiyon yok sayılır', async () => {
  const client = makeFakeClient();
  registerWeather(client, { fetchImpl: async () => ({}) });
  await client.emit('action.keyDown', { context: { actionId: 'other', bindingInstanceId: 'b1' } });
  assert.equal(client.calls.setTitle.length + client.calls.setImage.length, 0);
});

test('hava kodu ikon türüne, saat gece/gündüze çevrilir', () => {
  assert.equal(weatherKind('113'), 'clear');
  assert.equal(weatherKind(116), 'partly');
  assert.equal(weatherKind('353'), 'rain');
  assert.equal(weatherKind('338'), 'snow');
  assert.equal(weatherKind('389'), 'thunder');
  assert.equal(weatherKind('248'), 'fog');
  assert.equal(weatherKind('999'), 'cloud');
  assert.equal(clockMinutes('07:17 AM'), 437);
  assert.equal(clockMinutes('12:05 AM'), 5);
  assert.equal(clockMinutes('06:22 PM'), 1102);
  assert.equal(parseWeather(j1(), new Date(2026, 9, 16, 12, 0)).night, false);
  assert.equal(parseWeather(j1(), new Date(2026, 9, 16, 19, 5)).night, true);
  assert.equal(parseWeather(j1(), new Date(2026, 9, 16, 5, 0)).night, true);
});

test('gece açık havada ay çizilir', () => {
  const view = weatherView('Kars', parseWeather(j1(), new Date(2026, 9, 16, 23, 0)));
  assert.ok(view.body.includes('#c4b5fd'));
  assert.ok(!view.body.includes('#fbbf24'));
});

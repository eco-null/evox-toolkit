import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePluginManifest } from '@evoxapp/plugin-sdk';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));

test('manifest passes the SDK schema and its sdkVersion matches the installed SDK', () => {
  parsePluginManifest(manifest);
  const sdk = JSON.parse(readFileSync(new URL('node_modules/@evoxapp/plugin-sdk/package.json', root), 'utf8'));
  assert.equal(manifest.sdkVersion, sdk.version);
});

test('manifest keeps the toolkit actions and leaves monitoring to evox-sysmon', () => {
  assert.deepEqual(manifest.actions.map((a) => a.id), ['counter', 'weather', 'send-hotkey', 'type-text', 'clipboard', 'open-url']);
});

// Host handshake'i 5 sn bekler: runtime.mjs'in statik import ağacında native/süreç başlatan modül olmamalı.
test('runtime static import graph stays light (no sharp, no PowerShell layer)', () => {
  const seen = new Set();
  const external = new Set();
  const visit = (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = readFileSync(url, 'utf8');
    for (const [, spec] of source.matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)) {
      if (spec.startsWith('.')) visit(new URL(spec, url));
      else external.add(spec);
    }
  };
  visit(new URL('runtime.mjs', root));
  const local = [...seen].map((href) => href.slice(root.href.length));
  assert.ok(!local.includes('src/windows.js'), local.join(', '));
  assert.deepEqual([...external].sort(), ['@evoxapp/plugin-sdk', '@evoxapp/plugin-sdk/node', 'node:fs']);
});

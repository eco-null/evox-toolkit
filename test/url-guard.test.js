import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExternalUrl } from '../src/url-guard.js';

test('accepted http/https', () => {
  assert.equal(validateExternalUrl('https://example.com').ok, true);
  assert.equal(validateExternalUrl('https://example.com/path?q=1').ok, true);
  assert.equal(validateExternalUrl('  http://localhost:8080  ').ok, true);
});

test('rejected schemes and junk', () => {
  assert.equal(validateExternalUrl('file:///C:/Windows').ok, false);
  assert.equal(validateExternalUrl('javascript:alert(1)').ok, false);
  assert.equal(validateExternalUrl('cmd /c calc').ok, false);
  assert.equal(validateExternalUrl('notaurl').ok, false);
  assert.equal(validateExternalUrl('').ok, false);
});

test('rejected embedded credentials', () => {
  assert.equal(validateExternalUrl('https://user:pass@example.com').ok, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
const window = new Window();
for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'Element', 'Document', 'CSSStyleSheet', 'ShadowRoot', 'CustomEvent', 'Event']) globalThis[key] = window[key];
globalThis.__VERSION__ = 'test';
await import('../src/smart-fan-2-card.js');

test('scene follows reported speed, pauses on visibility changes, and cleans up on reconnect', async () => {
  let callback, disconnected = 0, observations = 0;
  window.IntersectionObserver = class {
    constructor(fn) { callback = fn; }
    observe() { observations++; }
    disconnect() { disconnected++; }
  };
  const card = document.createElement('smart-fan-2-card');
  card.setConfig({ entity: 'fan.test' });
  card.hass = { states: { 'fan.test': { state: 'on', attributes: { supported_features: 1, percentage: 66 } } } };
  document.body.append(card);
  await card.updateComplete;
  const frame = card.shadowRoot.querySelector('ha-card');
  assert.equal(frame.dataset.animate, 'false');
  callback([{ isIntersecting: true }]);
  await card.updateComplete;
  assert.equal(frame.dataset.animate, 'true');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  await card.updateComplete;
  assert.equal(frame.dataset.animate, 'false');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new Event('visibilitychange'));
  await card.updateComplete;
  assert.equal(frame.dataset.animate, 'true');
  card.setConfig({ entity: 'fan.test', animate_scene: false, show_summary: false });
  await card.updateComplete;
  assert.equal(frame.dataset.animate, 'false');
  assert.equal(card.shadowRoot.querySelector('.summary'), null);
  card.setConfig({ entity: 'fan.test' });
  card.hass.states['fan.test'].attributes.percentage = null;
  card.hass = card.hass;
  await card.updateComplete;
  assert.equal(card.shadowRoot.querySelector('.value').textContent, '—');
  assert.equal(frame.dataset.moving, 'false');
  card.hass.states['fan.test'].attributes.percentage = 100;
  card.hass.states['fan.test'].state = 'off';
  card.hass = card.hass;
  await card.updateComplete;
  assert.equal(frame.dataset.moving, 'false');
  card.remove();
  assert.equal(disconnected, 1);
  document.body.append(card);
  await card.updateComplete;
  assert.equal(observations, 2);
  card.remove();
  assert.equal(disconnected, 2);
});

test('service completion does not manufacture a new reported speed or mode', async () => {
  const card = document.createElement('smart-fan-2-card');
  card.setConfig({ entity: 'fan.test' });
  let resolve;
  card.hass = { states: { 'fan.test': { state: 'on', attributes: { supported_features: 9, percentage: 33, preset_modes: ['normal', 'nature'], preset_mode: 'normal' } } }, callService: () => new Promise(done => { resolve = done; }) };
  document.body.append(card);
  await card.updateComplete;
  const command = card._call('set_percentage', { percentage: 100 });
  await card.updateComplete;
  assert.match(card.shadowRoot.querySelector('.status').textContent, /Sending/);
  assert.match(card.shadowRoot.querySelector('.value').textContent, /33/);
  resolve();
  await command;
  await card.updateComplete;
  assert.match(card.shadowRoot.querySelector('.value').textContent, /33/);
  assert.match(card.shadowRoot.querySelector('.summary').textContent, /Normal/);
  card.remove();
});

test('reduced motion disables airflow even when the visible card is running', async () => {
  window.happyDOM.settings.device.prefersReducedMotion = 'reduce';
  const card = document.createElement('smart-fan-2-card');
  card.setConfig({ entity: 'fan.test' });
  card.hass = { states: { 'fan.test': { state: 'on', attributes: { supported_features: 1, percentage: 66 } } } };
  document.body.append(card);
  card._visible = true;
  await card.updateComplete;
  assert.equal(window.matchMedia('(prefers-reduced-motion: reduce)').matches, true);
  assert.equal(window.getComputedStyle(card.shadowRoot.querySelector('.flow')).getPropertyValue('animation'), 'none');
  card.remove();
  window.happyDOM.settings.device.prefersReducedMotion = 'no-preference';
});

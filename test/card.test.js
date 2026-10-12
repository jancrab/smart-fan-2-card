import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { fanView, validateConfig, naturalModes, nextStrength } from '../src/fan.js';

const window = new Window();
for (const key of ['window', 'document', 'customElements', 'HTMLElement', 'Element', 'Document', 'CSSStyleSheet', 'ShadowRoot', 'CustomEvent', 'Event']) globalThis[key] = window[key];
globalThis.__VERSION__ = 'test';
before(async () => { await import('../src/smart-fan-2-card.js'); });
const state = (overrides = {}) => ({ state: 'on', attributes: { friendly_name: 'Smartmi', supported_features: 59, percentage: 33, oscillating: true, preset_modes: ['Straight Wind', 'Natural Wind'], preset_mode: 'Straight Wind' }, ...overrides });
async function fixture(entity = state(), config = {}) {
  const calls = [];
  const card = document.createElement('smart-fan-2-card');
  card.setConfig({ entity: 'fan.test', ...config });
  card.hass = { states: { 'fan.test': entity, 'button.left': { state: 'unknown' }, 'script.left': { state: 'off' } }, callService: async (...args) => calls.push(args) };
  document.body.append(card);
  await card.updateComplete;
  return { card, calls, root: card.shadowRoot };
}

test('rejects other domains and invalid layouts', () => {
  assert.throws(() => validateConfig({ entity: 'light.test' }));
  assert.throws(() => validateConfig({ entity: 'fan.test', layout: 'bad' }));
  assert.throws(() => validateConfig({ entity: 'fan.test', left_entity: 'number.left' }));
});
test('handles unavailable states and hides unsupported capabilities', () => {
  assert.equal(fanView(undefined).available, false);
  assert.equal(fanView(state({ state: 'unavailable' })).available, false);
  assert.equal(fanView({ state: 'on', attributes: {} }).speed, false);
});
test('recognizes Natural and Straight Wind; requires explicit mapping for ambiguous names', () => {
  assert.equal(naturalModes(['Straight Wind', 'Natural Wind']).supported, true);
  assert.equal(naturalModes(['sleep', 'auto']).supported, false);
  assert.equal(naturalModes(['a', 'b'], { normal_preset: 'a', natural_preset: 'b' }).supported, true);
});
test('strength cycles through exact 33, 66, 100 percentages', () => {
  assert.deepEqual([0, 33, 66, 100].map(value => nextStrength(value).percentage), [33, 66, 100, 33]);
});
test('actual buttons send correct fan services and target', async () => {
  const { card, root, calls } = await fixture();
  root.querySelector('.natural').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  await card.updateComplete;
  assert.deepEqual(calls[0], ['fan', 'set_preset_mode', { preset_mode: 'Natural Wind', entity_id: 'fan.test' }]);
  root.querySelector('.strength').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  await card.updateComplete;
  assert.deepEqual(calls[1], ['fan', 'set_percentage', { percentage: 66, entity_id: 'fan.test' }]);
  root.querySelector('.power').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  await card.updateComplete;
  assert.deepEqual(calls[2], ['fan', 'turn_off', { entity_id: 'fan.test' }]);
});
test('Cycling stops oscillation before running the left action', async () => {
  const { card, calls } = await fixture(state(), { left_entity: 'script.left' });
  await card._cycleLeft();
  assert.deepEqual(calls, [['fan', 'oscillate', { entity_id: 'fan.test', oscillating: false }], ['script', 'turn_on', { entity_id: 'script.left' }]]);
});
test('a button with no previous press remains usable', async () => {
  const { card, root, calls } = await fixture(state(), { left_entity: 'button.left' });
  assert.equal(root.querySelector('.cycling').disabled, false);
  await card._cycleLeft();
  assert.deepEqual(calls[1], ['button', 'press', { entity_id: 'button.left' }]);
});
test('Cycling does not move if stopping oscillation fails', async () => {
  const { card, calls } = await fixture(state(), { left_entity: 'script.left' });
  card.hass.callService = async (...args) => { calls.push(args); throw new Error('offline'); };
  await card._cycleLeft();
  await card.updateComplete;
  assert.equal(calls.length, 1);
  assert.equal(card.shadowRoot.querySelector('[role=alert]').textContent, 'offline');
});
test('unavailable fan cannot trigger services', async () => {
  const { card, root, calls } = await fixture(state({ state: 'unavailable' }));
  assert.equal(root.querySelector('.power').disabled, true);
  await card._call('turn_on');
  assert.equal(calls.length, 0);
});
test('wide layout and escaped names render safely', async () => {
  const { root } = await fixture(state(), { layout: 'wide', name: '<img src=x onerror=alert(1)>' });
  assert.ok(root.querySelector('ha-card.wide'));
  assert.equal(root.querySelector('img'), null);
  assert.ok(root.querySelector('h2').textContent.includes('<img'));
});
test('editor filters selectable entities to fan domain and emits preserved configuration', async () => {
  const editor = document.createElement('smart-fan-2-card-editor');
  editor.setConfig({ type: 'custom:smart-fan-2-card', entity: 'fan.test', layout: 'wide' });
  editor.hass = { states: {} };
  document.body.append(editor);
  await editor.updateComplete;
  const form = editor.shadowRoot.querySelector('ha-form');
  assert.equal(form.schema[0].selector.entity.domain, 'fan');
  let result;
  editor.addEventListener('config-changed', event => { result = event.detail.config; });
  form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { entity: 'fan.other' } } }));
  assert.equal(result.entity, 'fan.other');
  assert.equal(result.layout, 'wide');
});

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { fanView, validateConfig, naturalModes, nextStrength, resolveAngleEntity } from '../src/fan.js';

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
  assert.deepEqual(calls[1], ['homeassistant', 'update_entity', { entity_id: 'fan.test' }]);
  assert.deepEqual(calls[2], ['fan', 'set_percentage', { percentage: 66, entity_id: 'fan.test' }]);
  root.querySelector('.power').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  await card.updateComplete;
  assert.deepEqual(calls[3], ['fan', 'turn_off', { entity_id: 'fan.test' }]);
});
test('Set applies configured profile, sets maximum sweep, and Lock stops before profile commands', async () => {
  const { card, root, calls } = await fixture(state(), { cycling_preset: 'normal', cycling_percentage: 72 });
  card.hass.states['number.test_oscillation_angle'] = { state: '30', attributes: { min: 1, max: 120, step: 1 } };
  await card._cycleLeft();
  await card.updateComplete;
  assert.equal(root.querySelector('.cycling span').textContent, 'Lock');
  assert.deepEqual(calls.map(call => [call[0], call[1], call[2]]), [
    ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: false }],
    ['fan', 'set_preset_mode', { entity_id: 'fan.test', preset_mode: 'Straight Wind' }],
    ['homeassistant', 'update_entity', { entity_id: 'fan.test' }],
    ['fan', 'set_percentage', { entity_id: 'fan.test', percentage: 72 }],
    ['number', 'set_value', { entity_id: 'number.test_oscillation_angle', value: 120 }],
    ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: true }],
  ]);
  calls.length = 0;
  await card._cycleLeft();
  assert.deepEqual(calls[0], ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: false }]);
  assert.equal(calls.at(-1)[2].percentage, 72);
  card.hass.states['fan.test'].attributes = { ...card.hass.states['fan.test'].attributes, percentage: 72, oscillating: false };
  card.hass = card.hass;
  await card.updateComplete;
  assert.equal(root.querySelector('.natural').disabled, true);
  assert.equal(root.querySelector('.strength').disabled, true);
  assert.equal(root.querySelector('.speed input').disabled, true);
  assert.match(root.querySelector('.status').textContent, /locked/);
  await card._cycleLeft();
  await card.updateComplete;
  assert.equal(root.querySelector('.strength').disabled, false);
});

test('missing sweep disables Set but never prevents Lock from stopping', async () => {
  const { card, root, calls } = await fixture();
  assert.equal(root.querySelector('.cycling').disabled, true);
  await card._cycleLeft();
  assert.equal(calls.length, 0);
  card._cycling = true;
  await card.updateComplete;
  assert.equal(root.querySelector('.cycling').disabled, false);
  await card._cycleLeft();
  assert.equal(calls[0][2].oscillating, false);
});

test('failed sweep setup never starts oscillation; failed stop stays retryable', async () => {
  const { card, calls } = await fixture();
  card.hass.states['number.test_oscillation_angle'] = { state: '30', attributes: { min: 1, max: 120 } };
  card.hass.callService = async (...args) => { calls.push(args); if (args[1] === 'set_value') throw new Error('offline'); };
  await card._cycleLeft();
  assert.equal(!!card._cycling, false);
  assert.ok(!calls.some(call => call[2].oscillating === true));
  card._cycling = true;
  card.hass.callService = async () => { throw new Error('stop failed'); };
  await card._cycleLeft();
  assert.equal(card._cycling, true);
  await card.updateComplete;
  assert.equal(card.shadowRoot.querySelector('[role=alert]').textContent, 'stop failed');
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
  assert.deepEqual(form.schema.map(field => field.name), ['entity', 'layout']);
  let result;
  editor.addEventListener('config-changed', event => { result = event.detail.config; });
  form.dispatchEvent(new CustomEvent('value-changed', { detail: { value: { entity: 'fan.other' } } }));
  assert.equal(result.entity, 'fan.other');
  assert.equal(result.layout, 'wide');
  editor.setConfig(result);
  await editor.updateComplete;
  const schemas = [...editor.shadowRoot.querySelectorAll('ha-form')].flatMap(item => item.schema);
  assert.equal(schemas.find(field => field.name === 'cycling_preset').selector.select.options[0].value, 'nature');
  assert.equal(schemas.find(field => field.name === 'cycling_percentage').selector.number.max, 100);
  assert.equal(schemas.some(field => field.name === 'position_entity'), false);
  assert.equal(editor.shadowRoot.querySelector('.setup-script'), null);
});

test('Xiaomi nature/normal modes override stale mappings and toggle in both directions', async () => {
  const entity = state();
  entity.attributes = { ...entity.attributes, supported_features: 63, preset_modes: ['nature', 'normal'], preset_mode: 'nature' };
  const { card, root, calls } = await fixture(entity, { natural_preset: 'Natural Wind', normal_preset: 'Straight Wind' });
  assert.equal(root.querySelector('.natural').disabled, false);
  assert.equal(root.querySelector('.natural').getAttribute('aria-pressed'), 'true');
  root.querySelector('.natural').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls[0][2].preset_mode, 'normal');
  card.hass = { ...card.hass, states: { ...card.hass.states, 'fan.test': { ...entity, attributes: { ...entity.attributes, preset_mode: 'normal' } } } };
  await card.updateComplete;
  root.querySelector('.natural').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls.filter(call => call[1] === 'set_preset_mode')[1][2].preset_mode, 'nature');
});

test('optional sweep slider discovers the fan angle and targets the number service', async () => {
  const { card, root, calls } = await fixture(state(), { show_angle_slider: true });
  card.hass = { ...card.hass, states: { ...card.hass.states, 'number.test_oscillation_angle': { state: '53', attributes: { min: 1, max: 120, step: 1 } } } };
  await card.updateComplete;
  const slider = root.querySelector('.angle input');
  assert.equal(slider.value, '53');
  assert.equal(slider.max, '120');
  slider.value = '90';
  slider.dispatchEvent(new Event('change'));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(calls[0], ['number', 'set_value', { value: 90, entity_id: 'number.test_oscillation_angle' }]);
  const withOscillation = oscillating => ({ ...card.hass, states: { ...card.hass.states, 'fan.test': { ...card.hass.states['fan.test'], attributes: { ...card.hass.states['fan.test'].attributes, oscillating } } } });
  card.hass = withOscillation(false);
  await card.updateComplete;
  assert.equal(root.querySelector('.angle'), null);
  card.hass = withOscillation(true);
  await card.updateComplete;
  assert.equal(root.querySelector('.angle input').value, '53');
  assert.equal(calls.length, 1, 'visibility changes must not send commands');
  assert.equal(resolveAngleEntity({ states: { 'number.other_oscillation_angle': {} } }, { entity: 'fan.test' }), undefined);
});

test('editor factory loads native HA form before returning an editor on a fresh dashboard', async () => {
  assert.equal(customElements.get('ha-form'), undefined);
  let loads = 0;
  window.loadCardHelpers = async () => ({
    createCardElement: config => {
      assert.deepEqual(config, { type: 'entities', entities: [] });
      return { constructor: { getConfigElement: async () => {
        loads++;
        await Promise.resolve();
        customElements.define('ha-form', class extends HTMLElement {});
      } } };
    },
  });
  const Card = customElements.get('smart-fan-2-card');
  const editor = await Card.getConfigElement();
  assert.ok(customElements.get('ha-form'), 'ha-form must be registered before the custom editor opens');
  assert.equal(editor.localName, 'smart-fan-2-card-editor');
  await Card.getConfigElement();
  assert.equal(loads, 1, 'already loaded HA components must be reused');
  delete window.loadCardHelpers;
});

test('Natural button refreshes when HA assigns an updated but reused hass object', async () => {
  const entity = state();
  entity.attributes = { ...entity.attributes, preset_modes: ['nature', 'normal'], preset_mode: 'normal' };
  const { card, root } = await fixture(entity);
  assert.equal(root.querySelector('.natural').getAttribute('aria-pressed'), 'false');
  card.hass.states['fan.test'] = { ...entity, attributes: { ...entity.attributes, preset_mode: 'nature' } };
  card.hass = card.hass;
  await card.updateComplete;
  assert.equal(root.querySelector('.natural').getAttribute('aria-pressed'), 'true');
  assert.equal(root.querySelector('.natural ha-icon').getAttribute('icon'), 'mdi:leaf');
});

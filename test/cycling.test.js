import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runPositionCycle } from '../src/cycling.js';
import { validateConfig } from '../src/fan.js';

const config = { entity: 'fan.test', cycling_mode: 'position', angle_entity: 'number.sweep', position_entity: 'sensor.position', target_angle: -60 };
function fixture() {
  const calls = [];
  const hass = { states: { 'fan.test': { state: 'on' }, 'number.sweep': { state: '30', attributes: { min: 1, max: 120, step: 1 } }, 'sensor.position': { state: '0' } }, callService: async (...args) => calls.push(args) };
  return { calls, hass, abort: new AbortController() };
}
test('position mode rejects sweep width used as feedback', () => {
  assert.throws(() => validateConfig({ ...config, position_entity: 'number.sweep' }), /getrennte/);
  assert.throws(() => validateConfig({ ...config, target_angle: undefined }), /Zielwinkel/);
});
test('sets maximum sweep then stops when target is crossed between updates', async () => {
  const { hass, calls, abort } = fixture();
  const done = runPositionCycle(() => hass, config, abort.signal);
  setTimeout(() => { hass.states['sensor.position'] = { state: '-70' }; }, 10);
  await done;
  assert.deepEqual(calls, [
    ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: false }],
    ['number', 'set_value', { entity_id: 'number.sweep', value: 120 }],
    ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: true }],
    ['fan', 'oscillate', { entity_id: 'fan.test', oscillating: false }],
  ]);
});
test('missing feedback and invalid maximum prevent movement', async () => {
  const { hass, calls, abort } = fixture();
  await assert.rejects(runPositionCycle(() => hass, { ...config, cycling_max_angle: 200 }, abort.signal), /außerhalb/);
  hass.states['sensor.position'].state = 'unavailable';
  await assert.rejects(runPositionCycle(() => hass, config, abort.signal), /nicht verfügbar/);
  assert.equal(calls.length, 0);
});
test('lost position feedback stops oscillation', async () => {
  const { hass, calls, abort } = fixture();
  const done = runPositionCycle(() => hass, config, abort.signal);
  setTimeout(() => { hass.states['sensor.position'].state = 'unavailable'; }, 10);
  await assert.rejects(done, /nicht verfügbar/);
  assert.equal(calls.at(-1)[2].oscillating, false);
});
test('cancel during setup prevents starting oscillation', async () => {
  const { hass, calls, abort } = fixture();
  hass.callService = async (...args) => { calls.push(args); if (args[0] === 'number') abort.abort(); };
  await assert.rejects(runPositionCycle(() => hass, config, abort.signal), /abgebrochen/);
  assert.ok(!calls.some(call => call[2].oscillating === true));
  assert.equal(calls.at(-1)[2].oscillating, false);
});
test('unchanging feedback times out and stops', async () => {
  const { hass, calls, abort } = fixture();
  await assert.rejects(runPositionCycle(() => hass, { ...config, cycling_timeout: 1 }, abort.signal), /nicht rechtzeitig/);
  assert.equal(calls.at(-1)[2].oscillating, false);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFanProfile, profileSettings } from '../src/profiles.js';

function fixture() {
  const calls = [];
  const config = { entity: 'fan.smartmi' };
  const hass = { states: {
    'fan.smartmi': { state: 'on', attributes: { supported_features: 63, preset_modes: ['nature', 'normal'] } },
    'number.smartmi_oscillation_angle': { state: '53', attributes: { min: 1, max: 120, step: 1 } },
  }, callService: async (...args) => calls.push(args) };
  return { hass, config, calls };
}

test('everyday sends exact Natural/66/30 and enables oscillation last', async () => {
  const { hass, config, calls } = fixture();
  await applyFanProfile(hass, config, 'everyday');
  assert.deepEqual(calls.map(call => [call[1], call[2]]), [
    ['oscillate', { entity_id: config.entity, oscillating: false }],
    ['set_preset_mode', { entity_id: config.entity, preset_mode: 'nature' }],
    ['update_entity', { entity_id: config.entity }],
    ['set_percentage', { entity_id: config.entity, percentage: 66 }],
    ['set_value', { entity_id: 'number.smartmi_oscillation_angle', value: 30 }],
    ['oscillate', { entity_id: config.entity, oscillating: true }],
  ]);
});

test('cycling defaults to nature/100 and does not claim to move the head', async () => {
  const { hass, config, calls } = fixture();
  await applyFanProfile(hass, config, 'cycling');
  assert.equal(calls[0][2].oscillating, false);
  assert.equal(calls[1][2].preset_mode, 'nature');
  assert.equal(calls[2][0], 'homeassistant');
  assert.equal(calls[3][2].percentage, 100);
  assert.equal(calls.length, 4);
});

test('profiles honor custom Normal mode and reject impossible angles before commands', async () => {
  const { hass, config, calls } = fixture();
  assert.equal(profileSettings(hass, { ...config, everyday_preset: 'normal', everyday_percentage: 45 }, 'everyday').mode, 'normal');
  await assert.rejects(applyFanProfile(hass, { ...config, everyday_angle: 200 }, 'everyday'));
  assert.equal(calls.length, 0);
  hass.callService = async (...args) => { calls.push(args); if (args[1] === 'set_value') throw new Error('number failed'); };
  await assert.rejects(applyFanProfile(hass, config, 'everyday'));
  assert.ok(!calls.some(call => call[2].oscillating === true));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cyclingSettings } from '../src/cycling.js';

test('uses actual entity maximum, auto-detects sweep and ignores obsolete target settings', () => {
  const hass = { states: { 'number.test_oscillation_angle': { state: '53', attributes: { min: 1, max: 120 } } } };
  assert.deepEqual(cyclingSettings(hass, { entity: 'fan.test', cycling_max_angle: 60, position_entity: 'sensor.missing' }), { angleEntity: 'number.test_oscillation_angle', maximum: 120 });
  assert.throws(() => cyclingSettings(hass, { entity: 'fan.other' }));
  hass.states['number.test_oscillation_angle'].state = 'unavailable';
  assert.throws(() => cyclingSettings(hass, { entity: 'fan.test' }));
});

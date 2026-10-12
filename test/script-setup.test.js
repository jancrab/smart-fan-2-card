import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPositionScript } from '../src/script-setup.js';

const config = { entity: 'fan.test', cycling_mode: 'position', angle_entity: 'number.sweep', position_entity: 'sensor.position', target_angle: -60 };
const id = `smart_fan_2_${'a'.repeat(32)}`;
function fixture() {
  const writes = [];
  const hass = { user: { is_admin: true }, states: {
    'fan.test': { state: 'on', attributes: {} },
    'number.sweep': { state: '30', attributes: { min: 1, max: 120 } },
    'sensor.position': { state: '0' },
  }, callApi: async (...args) => writes.push(args), callWS: async () => [{ platform: 'script', unique_id: id, entity_id: 'script.cycling_position' }] };
  return { hass, writes };
}

test('script setup saves config without running it and resolves actual script entity', async () => {
  const { hass, writes } = fixture();
  const result = await createPositionScript(hass, config, id);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], 'POST');
  assert.equal(writes[0][1], `config/script/config/${id}`);
  assert.equal(writes[0][2].sequence[0].variables.target_position, -60);
  assert.equal(result.entityId, 'script.cycling_position');
});

test('script setup rejects missing feedback, sweep used as position and non-admin users before saving', async () => {
  const { hass, writes } = fixture();
  await assert.rejects(createPositionScript(hass, { ...config, position_entity: 'number.sweep' }, id));
  await assert.rejects(createPositionScript(hass, { ...config, position_entity: 'sensor.missing' }, id));
  hass.user.is_admin = false;
  await assert.rejects(createPositionScript(hass, config, id), /Administrator/);
  assert.equal(writes.length, 0);
});

test('saved script stays reported as saved if entity registry cannot be read', async () => {
  const { hass, writes } = fixture();
  hass.callWS = async () => { throw new Error('registry unavailable'); };
  assert.deepEqual(await createPositionScript(hass, config, id), { scriptId: id });
  assert.equal(writes.length, 1);
});

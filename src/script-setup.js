import { validateConfig } from './fan.js';
import { cyclingSettings } from './cycling.js';

export function positionScript(hass, config) {
  validateConfig({ ...config, cycling_mode: 'position' });
  const settings = cyclingSettings(hass, config);
  return {
    alias: `${hass.states[config.entity]?.attributes?.friendly_name || 'Ventilator'} – Cycling-Position`,
    description: 'Von Smart Fan 2 Card erstellt. Benötigt echte Positionsrückmeldung; Schwenkbereich ist keine Kopfposition.',
    mode: 'single',
    sequence: [
      { variables: { fan_entity: config.entity, sweep_entity: config.angle_entity, position_entity: config.position_entity, target_position: settings.target, allowed_error: settings.tolerance } },
      { if: [{ condition: 'template', value_template: "{{ position_entity == sweep_entity or not is_number(states(position_entity)) or not is_number(states(sweep_entity)) or not is_number(state_attr(sweep_entity, 'max')) or states(fan_entity) not in ['on', 'off'] }}" }], then: [{ stop: 'Echte Positionsrückmeldung oder Schwenkbereich fehlt.', error: true }] },
      { action: 'fan.turn_on', target: { entity_id: config.entity } },
      { action: 'fan.oscillate', target: { entity_id: config.entity }, data: { oscillating: false } },
      { variables: { start_position: '{{ states(position_entity) | float }}' } },
      { if: [{ condition: 'template', value_template: '{{ (start_position | float - target_position | float) | abs <= allowed_error | float }}' }], then: [{ stop: 'Ziel bereits erreicht.' }] },
      { action: 'number.set_value', target: { entity_id: config.angle_entity }, data: { value: settings.maximum } },
      { action: 'fan.oscillate', target: { entity_id: config.entity }, data: { oscillating: true } },
      { wait_template: "{% set position = states(position_entity) %}{{ not is_number(position) or not is_state(fan_entity, 'on') or (position | float(0) - target_position | float) | abs <= allowed_error | float or (start_position | float < target_position | float and position | float(0) >= target_position | float) or (start_position | float > target_position | float and position | float(0) <= target_position | float) }}", timeout: { seconds: settings.timeout / 1000 }, continue_on_timeout: true },
      { action: 'fan.oscillate', target: { entity_id: config.entity }, data: { oscillating: false } },
      { if: [{ condition: 'template', value_template: "{{ not wait.completed or not is_number(states(position_entity)) or not is_state(fan_entity, 'on') }}" }], then: [{ stop: 'Ziel nicht bestätigt: Zeitlimit oder Rückmeldung verloren.', error: true }] },
    ],
  };
}

export async function createPositionScript(hass, config, scriptId) {
  if (!hass.user?.is_admin) throw new Error('Script-Erstellung benötigt Administratorrechte.');
  const script = positionScript(hass, config);
  if (!/^smart_fan_2_[a-f0-9]{32}$/.test(scriptId)) throw new Error('Ungültige Script-ID.');
  await hass.callApi('POST', `config/script/config/${scriptId}`, script);
  // Saving through HA's script config API reloads scripts; resolve the actual
  // entity_id via unique_id, since HA can derive it from the alias instead.
  try {
    const entities = await hass.callWS({ type: 'config/entity_registry/list' });
    const entity = entities.find(item => item.platform === 'script' && item.unique_id === scriptId);
    return { scriptId, entityId: entity?.entity_id };
  } catch {
    // The script was saved; keep its edit link instead of retrying creation.
    return { scriptId };
  }
}

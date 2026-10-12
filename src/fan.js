export const FEATURES = { SPEED: 1, OSCILLATE: 2, PRESET: 8, OFF: 32, ON: 16 };

export function validateConfig(config) {
  if (!config || typeof config.entity !== 'string' || !/^fan\.[a-z0-9_]+$/.test(config.entity)) {
    throw new Error('Bitte eine gültige fan-Entität angeben.');
  }
  for (const key of ['name', 'subtitle']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} muss Text sein.`);
  }
  if (config.layout !== undefined && !['compact', 'wide'].includes(config.layout)) throw new Error('layout muss compact oder wide sein.');
  if (config.cycling_mode !== undefined && !['action', 'position'].includes(config.cycling_mode)) throw new Error('Cycling-Modus muss action oder position sein.');
  if (config.cycling_mode === 'position') {
    if (!/^number\.[a-z0-9_]+$/.test(config.angle_entity || '')) throw new Error('Eine number-Entität für den Schwenkbereich auswählen.');
    if (!/^(sensor|number)\.[a-z0-9_]+$/.test(config.position_entity || '')) throw new Error('Eine Entität für die tatsächliche Kopfposition auswählen.');
    if (config.angle_entity === config.position_entity) throw new Error('Schwenkbereich und Positionsrückmeldung müssen getrennte Entitäten sein.');
    if (config.target_angle === undefined || config.target_angle === '' || !Number.isFinite(Number(config.target_angle))) throw new Error('Cycling-Zielwinkel angeben.');
    for (const [key, min, max] of [['target_tolerance', 0, 20], ['cycling_timeout', 1, 120]]) {
      if (config[key] !== undefined && (!Number.isFinite(Number(config[key])) || Number(config[key]) < min || Number(config[key]) > max)) throw new Error(`${key}: gültiger Bereich ${min}–${max}.`);
    }
    if (config.cycling_max_angle !== undefined && !Number.isFinite(Number(config.cycling_max_angle))) throw new Error('Maximalen Schwenkbereich als Zahl angeben.');
  }
  if (config.left_entity && !/^(button|script|number|select)\.[a-z0-9_]+$/.test(config.left_entity)) throw new Error('Links-Aktion benötigt button, script, number oder select.');
  if (config.left_entity?.startsWith('number.') && (config.left_value === '' || !Number.isFinite(Number(config.left_value)))) throw new Error('Für number muss left_value eine Zahl sein.');
  if (config.left_entity?.startsWith('select.') && !config.left_value) throw new Error('Für select muss left_value eine Option sein.');
  return { layout: 'compact', ...config };
}

export function fanView(state) {
  const features = Number(state?.attributes?.supported_features) || 0;
  const percentage = Number(state?.attributes?.percentage);
  const step = Number(state?.attributes?.percentage_step);
  return {
    available: !!state && !['unknown', 'unavailable'].includes(state.state),
    on: state?.state === 'on',
    percentage: Number.isFinite(percentage) ? Math.max(0, Math.min(100, percentage)) : 0,
    step: Number.isFinite(step) && step > 0 && step <= 100 ? step : 1,
    speed: !!(features & FEATURES.SPEED),
    oscillate: !!(features & FEATURES.OSCILLATE),
    presets: features & FEATURES.PRESET && Array.isArray(state?.attributes?.preset_modes) ? state.attributes.preset_modes.filter(x => typeof x === 'string') : [],
  };
}

export function naturalModes(presets, config = {}) {
  const natural = presets.includes(config.natural_preset) ? config.natural_preset : presets.find(mode => /natural|nature|natürlich|自然/i.test(mode));
  const normal = presets.includes(config.normal_preset) ? config.normal_preset : presets.find(mode => /normal|straight|direct|standard|直吹/i.test(mode));
  return { natural, normal, supported: !!natural && !!normal && presets.includes(natural) && presets.includes(normal) };
}

export function resolveAngleEntity(hass, config) {
  if (config.angle_entity) return config.angle_entity;
  const fanDevice = hass.entities?.[config.entity]?.device_id;
  const candidates = Object.keys(hass.states || {}).filter(id => id.startsWith('number.') && /(?:oscillation|swing)_angle$/.test(id));
  const related = fanDevice ? candidates.filter(id => hass.entities?.[id]?.device_id === fanDevice) : [];
  if (related.length === 1) return related[0];
  const conventional = `number.${config.entity.split('.')[1]}_oscillation_angle`;
  return candidates.includes(conventional) ? conventional : undefined;
}

export function nextStrength(percentage) {
  return percentage < 33 ? { level: 1, percentage: 33 } : percentage < 66 ? { level: 2, percentage: 66 } : percentage < 100 ? { level: 3, percentage: 100 } : { level: 1, percentage: 33 };
}

export function leftAction(config) {
  if (!config.left_entity) return null;
  const domain = config.left_entity.split('.')[0];
  const service = { button: 'press', script: 'turn_on', number: 'set_value', select: 'select_option' }[domain];
  const data = { entity_id: config.left_entity };
  if (domain === 'number') data.value = Number(config.left_value);
  if (domain === 'select') data.option = config.left_value;
  return { domain, service, data };
}

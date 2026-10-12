export const FEATURES = { SPEED: 1, OSCILLATE: 2, PRESET: 8, OFF: 32, ON: 16 };

export function validateConfig(config) {
  if (!config || typeof config.entity !== 'string' || !/^fan\.[a-z0-9_]+$/.test(config.entity)) {
    throw new Error('Bitte eine gültige fan-Entität angeben.');
  }
  for (const key of ['name', 'subtitle']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} muss Text sein.`);
  }
  if (config.layout !== undefined && !['compact', 'wide'].includes(config.layout)) throw new Error('layout muss compact oder wide sein.');
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
  const natural = config.natural_preset || presets.find(mode => /natural|nature|natürlich|自然/i.test(mode));
  const normal = config.normal_preset || presets.find(mode => /normal|straight|direct|standard|直吹/i.test(mode));
  return { natural, normal, supported: !!natural && !!normal && presets.includes(natural) && presets.includes(normal) };
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

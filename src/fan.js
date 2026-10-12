export const FEATURES = { SPEED: 1, OSCILLATE: 2, PRESET: 8, OFF: 32, ON: 16 };

export function validateConfig(config) {
  if (!config || typeof config.entity !== 'string' || !/^fan\.[a-z0-9_]+$/.test(config.entity)) {
    throw new Error('Select a valid fan entity.');
  }
  for (const key of ['name', 'subtitle']) {
    if (config[key] !== undefined && typeof config[key] !== 'string') throw new Error(`${key} must be text.`);
  }
  if (config.layout !== undefined && !['compact', 'wide'].includes(config.layout)) throw new Error('layout must be compact or wide.');
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

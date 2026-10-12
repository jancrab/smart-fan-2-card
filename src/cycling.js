import { resolveAngleEntity } from './fan.js';

export function cyclingSettings(hass, config) {
  const angleEntity = resolveAngleEntity(hass, config);
  const angle = hass?.states[angleEntity];
  const maximum = Number(angle?.attributes?.max);
  const minimum = Number(angle?.attributes?.min);
  if (!angle || ['', 'unknown', 'unavailable'].includes(angle.state) || !Number.isFinite(Number(angle.state)) || !Number.isFinite(maximum) || !Number.isFinite(minimum) || maximum <= minimum) {
    throw new Error('Cycling requires an available sweep angle entity with valid limits.');
  }
  return { angleEntity, maximum };
}

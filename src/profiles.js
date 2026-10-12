import { fanView, naturalModes, resolveAngleEntity } from './fan.js';

export function profileSettings(hass, config, kind) {
  const view = fanView(hass.states[config.entity]);
  const modes = naturalModes(view.presets, config);
  const preset = config[`${kind}_preset`] ?? 'nature';
  if (!['nature', 'normal'].includes(preset)) throw new Error('Profil-Modus muss Natural oder Normal sein.');
  const percentage = Number(config[`${kind}_percentage`] ?? (kind === 'everyday' ? 66 : 100));
  const mode = preset === 'nature' ? modes.natural : modes.normal;
  if (!view.available || !view.speed || !view.oscillate || !mode || !view.presets.includes(mode)) throw new Error('Profil benötigt Geschwindigkeit, Schwenken und einen passenden Modus.');
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) throw new Error('Profil-Leistung muss zwischen 1 und 100 % liegen.');
  const result = { mode, percentage, on: view.on };
  if (kind === 'everyday') {
    result.angleEntity = resolveAngleEntity(hass, config);
    const angle = hass.states[result.angleEntity];
    result.angle = Number(config.everyday_angle ?? 30);
    const min = Number(angle?.attributes?.min), max = Number(angle?.attributes?.max), step = Number(angle?.attributes?.step);
    if (!angle || ['', 'unknown', 'unavailable'].includes(angle.state) || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(result.angle) || result.angle < min || result.angle > max || (step > 0 && Math.abs((result.angle - min) / step - Math.round((result.angle - min) / step)) > 1e-6)) throw new Error('Alltagsprofil: gültigen Schwenkbereich und verfügbare Winkel-Entität auswählen.');
  }
  return result;
}

export async function applyFanProfile(hass, config, kind, signal) {
  const profile = profileSettings(hass, config, kind);
  const call = async (domain, service, data) => {
    if (signal?.aborted) throw new Error('Profil abgebrochen.');
    await hass.callService(domain, service, data);
  };
  const fan = { entity_id: config.entity };
  if (!profile.on) await call('fan', 'turn_on', fan);
  await call('fan', 'oscillate', { ...fan, oscillating: false });
  await call('fan', 'set_preset_mode', { ...fan, preset_mode: profile.mode });
  // Polling integrations can still report/use the old mode until refreshed.
  await call('homeassistant', 'update_entity', fan);
  await call('fan', 'set_percentage', { ...fan, percentage: profile.percentage });
  if (kind === 'everyday') {
    await call('number', 'set_value', { entity_id: profile.angleEntity, value: profile.angle });
    await call('fan', 'oscillate', { ...fan, oscillating: true });
  }
}

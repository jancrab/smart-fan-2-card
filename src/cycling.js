function numericState(state) {
  if (!state || ['unknown', 'unavailable', ''].includes(state.state)) return null;
  const value = Number(state.state);
  return Number.isFinite(value) ? value : null;
}

export function cyclingSettings(hass, config) {
  const angle = hass?.states[config.angle_entity];
  const position = numericState(hass?.states[config.position_entity]);
  const maximum = Number(config.cycling_max_angle ?? angle?.attributes.max);
  const minimum = Number(angle?.attributes.min);
  const limit = Number(angle?.attributes.max);
  if (numericState(angle) === null || position === null) throw new Error('Schwenkbereich oder Positionsrückmeldung nicht verfügbar.');
  if (!Number.isFinite(maximum) || !Number.isFinite(minimum) || !Number.isFinite(limit) || maximum < minimum || maximum > limit) throw new Error('Maximalwinkel liegt außerhalb des Bereichs der Winkel-Entität.');
  return { maximum, position, target: Number(config.target_angle), tolerance: Number(config.target_tolerance ?? 2), timeout: Number(config.cycling_timeout ?? 30) * 1000 };
}

// Reads HA state updates; never interprets the configured sweep width as a position.
export async function runPositionCycle(getHass, config, signal) {
  const settings = cyclingSettings(getHass(), config);
  const serviceHass = getHass();
  const oscillate = value => serviceHass.callService('fan', 'oscillate', { entity_id: config.entity, oscillating: value });
  const checkAbort = () => { if (signal.aborted) throw new Error('Cycling abgebrochen.'); };
  checkAbort();
  // Serialize setup and stopping so cancel during setup cannot leave oscillation running.
  await oscillate(false);
  try {
    checkAbort();
    if (Math.abs(settings.position - settings.target) <= settings.tolerance) return;
    await serviceHass.callService('number', 'set_value', { entity_id: config.angle_entity, value: settings.maximum });
    checkAbort();
    await oscillate(true);
    checkAbort();
    await new Promise((resolve, reject) => {
      let previous = settings.position;
      const deadline = Date.now() + settings.timeout;
      const finish = error => {
        clearInterval(timer);
        signal.removeEventListener('abort', cancel);
        error ? reject(error) : resolve();
      };
      const cancel = () => finish(new Error('Cycling abgebrochen.'));
      const timer = setInterval(() => {
        const hass = getHass();
        const position = numericState(hass?.states[config.position_entity]);
        if (position === null || !hass?.states[config.entity] || ['unknown', 'unavailable', 'off'].includes(hass.states[config.entity].state)) return finish(new Error('Cycling gestoppt: Positionsrückmeldung oder Ventilator nicht verfügbar.'));
        if (Math.abs(position - settings.target) <= settings.tolerance || (previous < settings.target && position >= settings.target) || (previous > settings.target && position <= settings.target)) return finish();
        if (Date.now() >= deadline) return finish(new Error('Cycling gestoppt: Zielwinkel nicht rechtzeitig erreicht.'));
        previous = position;
      }, 100);
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
    });
  } finally {
    await oscillate(false);
  }
}

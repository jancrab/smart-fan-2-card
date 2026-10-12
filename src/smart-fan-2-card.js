import { LitElement, html, nothing } from 'lit';
import { cardStyles } from './styles.js';
import { fanView, validateConfig, naturalModes, nextStrength, leftAction } from './fan.js';
import { cyclingSettings, runPositionCycle } from './cycling.js';

export class SmartFan2Card extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _pending: { state: true },
    _error: { state: true },
    _cycling: { state: true },
  };

  setConfig(config) { this._cycleAbort?.abort(); this._config = validateConfig(config); }
  disconnectedCallback() { this._cycleAbort?.abort(); super.disconnectedCallback(); }
  static getStubConfig(hass) {
    return { entity: Object.keys(hass?.states || {}).find(id => id.startsWith('fan.')) || 'fan.smart_fan_2' };
  }
  static getConfigElement() { return document.createElement('smart-fan-2-card-editor'); }
  getCardSize() { return this._config?.layout === 'wide' ? 3 : 4; }
  getGridOptions() { return { columns: this._config?.layout === 'wide' ? 12 : 6, min_columns: 6 }; }

  async _cycleLeft() {
    if (this._cycling) { this._cycleAbort?.abort(); return; }
    if (this._config.cycling_mode === 'position') {
      const view = fanView(this.hass?.states[this._config.entity]);
      if (this._pending || !view.available || !view.on || !view.oscillate) return;
      this._cycleAbort = new AbortController();
      this._cycling = true;
      this._pending = true;
      this._error = '';
      const config = { ...this._config };
      try { await runPositionCycle(() => this.hass, config, this._cycleAbort.signal); }
      catch (error) { this._error = error?.message || 'Cycling fehlgeschlagen.'; }
      finally { this._cycling = false; this._pending = false; }
      return;
    }
    const action = leftAction(this._config);
    const view = fanView(this.hass?.states[this._config.entity]);
    const target = this.hass?.states[this._config.left_entity];
    if (!action || !view.available || !view.on || !view.oscillate || !target || target.state === 'unavailable' || (['number', 'select'].includes(action.domain) && target.state === 'unknown') || this._pending) return;
    this._pending = true;
    this._error = '';
    try {
      // Stop the automatic sweep before moving the physical head.
      await this.hass.callService('fan', 'oscillate', { entity_id: this._config.entity, oscillating: false });
      await this.hass.callService(action.domain, action.service, action.data);
    } catch (error) {
      this._error = error?.message || 'Linksbewegung fehlgeschlagen.';
    } finally { this._pending = false; }
  }

  async _call(service, data = {}) {
    const state = this.hass?.states[this._config?.entity];
    if (this._pending || !fanView(state).available) return;
    this._pending = true;
    this._error = '';
    try {
      await this.hass.callService('fan', service, { ...data, entity_id: this._config.entity });
    } catch (error) {
      this._error = error?.message || 'Befehl fehlgeschlagen. Bitte erneut versuchen.';
    } finally { this._pending = false; }
  }

  render() {
    if (!this._config || !this.hass) return nothing;
    const state = this.hass.states[this._config.entity];
    const view = fanView(state);
    const disabled = !view.available || !!this._pending;
    const modes = naturalModes(view.presets, this._config);
    const natural = modes.supported && state.attributes.preset_mode === modes.natural;
    const strength = view.percentage <= 33 ? 1 : view.percentage <= 66 ? 2 : 3;
    const target = this.hass.states[this._config.left_entity];
    const canMoveLeft = !!target && target.state !== 'unavailable' && (!['number', 'select'].includes(this._config.left_entity?.split('.')[0]) || target.state !== 'unknown');
    let canCyclePosition = false;
    if (this._config.cycling_mode === 'position') {
      try { cyclingSettings(this.hass, this._config); canCyclePosition = true; } catch { /* Missing feedback keeps the button disabled. */ }
    }
    const canCycle = this._config.cycling_mode === 'position' ? canCyclePosition : canMoveLeft;
    const status = !state ? 'Entität nicht gefunden' : !view.available ? 'Nicht verfügbar' : view.on ? 'Läuft' : 'Aus';
    const moreInfo = () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    const cyclingLabel = this._cycling ? 'Cycling stoppen' : this._config.cycling_mode === 'position' ? `Cycling: bis ${this._config.target_angle}° schwenken` : 'Cycling: ganz nach links';
    return html`
      <ha-card class=${this._config.layout} aria-busy=${!!this._pending}>
        <header>
          <div class=${`fan ${view.on && view.available ? 'running' : ''}`} aria-hidden="true"><ha-icon icon="mdi:fan"></ha-icon></div>
          <button class="details" @click=${moreInfo} title="Gerätedetails öffnen" aria-label="Gerätedetails öffnen">
            <h2>${this._config.name || state?.attributes.friendly_name || 'Ventilator'}</h2>
            <span class="status" role="status">${this._cycling ? 'Positioniert …' : this._pending ? 'Wird gesendet …' : this._config.subtitle ? `${this._config.subtitle} · ${status}` : status}</span>
          </button>
          <button class="power" title=${view.on ? 'Ausschalten' : 'Einschalten'} aria-label=${view.on ? 'Ausschalten' : 'Einschalten'} aria-pressed=${view.on} ?disabled=${disabled}
            @click=${() => this._call(view.on ? 'turn_off' : 'turn_on')}><ha-icon icon="mdi:power"></ha-icon></button>
        </header>
        <div class="settings">
        ${view.speed ? html`<label class="speed"><ha-icon icon="mdi:weather-windy" aria-hidden="true"></ha-icon>
          <input type="range" min="0" max="100" step="1" .value=${String(view.on ? view.percentage : 0)} aria-label="Geschwindigkeit" ?disabled=${disabled}
            @input=${event => { this.renderRoot.querySelector('output').value = `${event.target.value} %`; }}
            @change=${event => this._call('set_percentage', { percentage: Math.max(0, Math.min(100, Number(event.target.value))) })}>
          <output>${view.available ? `${view.on ? Math.round(view.percentage) : 0} %` : '—'}</output>
        </label>` : nothing}
        <div class="controls">
          <div class="quick-controls">
            <button class=${`natural ${natural ? 'enabled' : ''}`} ?disabled=${disabled || !view.on || !modes.supported} aria-pressed=${natural}
              aria-label=${natural ? 'Natural aktiv, zu Normal wechseln' : 'Normal aktiv, zu Natural wechseln'}
              title=${modes.supported ? natural ? 'Natural · zu Normal wechseln' : 'Normal · zu Natural wechseln' : 'Natural: Modi im Editor zuordnen'}
              @click=${() => this._call('set_preset_mode', { preset_mode: natural ? modes.normal : modes.natural })}><ha-icon icon=${natural ? 'mdi:leaf' : 'mdi:weather-windy'}></ha-icon></button>
            ${view.speed ? html`<button class="strength" ?disabled=${disabled} aria-label=${`Stärke ${strength}, nächste Stufe wählen`}
              title=${`Stärke ${strength} · 33 / 66 / 100 %`} @click=${() => this._call('set_percentage', { percentage: nextStrength(view.percentage).percentage })}><ha-icon icon=${`mdi:numeric-${view.on ? strength : 0}-circle-outline`}></ha-icon></button>` : nothing}
            ${view.oscillate ? html`<button class="oscillate" ?disabled=${disabled || !view.on} aria-label=${state.attributes.oscillating ? 'Schwenken ausschalten' : 'Schwenken einschalten'} title=${state.attributes.oscillating ? 'Schwenken an' : 'Schwenken aus'} aria-pressed=${!!state.attributes.oscillating}
              @click=${() => this._call('oscillate', { oscillating: !state.attributes.oscillating })}><ha-icon icon="mdi:arrow-left-right"></ha-icon></button>` : nothing}
            <button class="cycling" ?disabled=${!this._cycling && (disabled || !view.on || !view.oscillate || !canCycle)} aria-label=${cyclingLabel} aria-pressed=${!!this._cycling} title=${canCycle ? cyclingLabel : 'Cycling im Editor konfigurieren'}
              @click=${() => this._cycleLeft()}><ha-icon icon=${this._cycling ? 'mdi:stop' : 'mdi:rotate-left'}></ha-icon></button>
          </div>
          ${view.presets.length && !(modes.supported && view.presets.length === 2) ? html`<label class="preset"><ha-icon icon="mdi:tune-variant" aria-hidden="true"></ha-icon><select aria-label="Modus" ?disabled=${disabled || !view.on}
            @change=${event => this._call('set_preset_mode', { preset_mode: event.target.value })}>
              <option value="" ?selected=${!view.presets.includes(state.attributes.preset_mode)} disabled>Modus wählen</option>
              ${view.presets.map(mode => html`<option .value=${mode} ?selected=${mode === state.attributes.preset_mode}>${mode}</option>`)}
            </select></label>` : nothing}
        </div>
        </div>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
      </ha-card>`;
  }

  static styles = cardStyles;
}

class SmartFan2CardEditor extends LitElement {
  static properties = { hass: { attribute: false }, _config: { state: true } };
  setConfig(config) { this._config = { ...config }; }
  render() {
    if (!this.hass || !this._config) return nothing;
    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${[
      { name: 'entity', required: true, selector: { entity: { domain: 'fan' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'subtitle', selector: { text: {} } },
      { name: 'layout', selector: { select: { options: [{ value: 'compact', label: 'Schmal · Dashboard' }, { value: 'wide', label: 'Breit · Web UI' }] } } },
      { name: 'natural_preset', selector: { text: {} } },
      { name: 'normal_preset', selector: { text: {} } },
      { name: 'cycling_mode', selector: { select: { options: [{ value: 'action', label: 'Oszillation aus → Links-Aktion' }, { value: 'position', label: 'Maximal schwenken → am Zielwinkel stoppen' }] } } },
      { name: 'angle_entity', selector: { entity: { domain: 'number' } } },
      { name: 'position_entity', selector: { entity: { domain: ['sensor', 'number'] } } },
      { name: 'target_angle', selector: { number: { min: -360, max: 360, step: 1, mode: 'box', unit_of_measurement: '°' } } },
      { name: 'cycling_max_angle', selector: { number: { min: 0, max: 360, step: 1, mode: 'box', unit_of_measurement: '°' } } },
      { name: 'target_tolerance', selector: { number: { min: 0, max: 20, step: 1, mode: 'box', unit_of_measurement: '°' } } },
      { name: 'cycling_timeout', selector: { number: { min: 1, max: 120, step: 1, mode: 'box', unit_of_measurement: 's' } } },
      { name: 'left_entity', selector: { entity: { domain: ['button', 'script', 'number', 'select'] } } },
      { name: 'left_value', selector: { text: {} } },
    ]} .computeLabel=${field => ({ entity: 'Ventilator', name: 'Name', subtitle: 'Untertitel', layout: 'Layout', natural_preset: 'Natural-Modus (optional: exakter Preset-Name)', normal_preset: 'Normal-Modus (optional: exakter Preset-Name)', cycling_mode: 'Cycling: Ablauf', angle_entity: 'Cycling: Schwenkbereich-Entität', position_entity: 'Cycling: tatsächliche Kopfposition (Live-Rückmeldung)', target_angle: 'Cycling: Zielwinkel', cycling_max_angle: 'Cycling: maximaler Schwenkbereich (leer = Entitätsmaximum)', target_tolerance: 'Cycling: Zieltoleranz (Standard 2°)', cycling_timeout: 'Cycling: Zeitlimit (Standard 30 s)', left_entity: 'Cycling: Aktion für ganz links', left_value: 'Cycling: Zielwert für number/select' })[field.name]}
    .computeHelper=${field => field.name === 'position_entity' ? 'Muss sich während der Bewegung ändern. oscillation_angle ist der eingestellte Schwenkbereich und keine Positionsrückmeldung.' : field.name === 'cycling_mode' ? 'Zielwinkel-Steuerung läuft im geöffneten Browser. Für unbeaufsichtigten Betrieb ein Home-Assistant-Script als Links-Aktion verwenden.' : undefined}
    @value-changed=${event => this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._config, ...event.detail.value } }, bubbles: true, composed: true }))}></ha-form>`;
  }
}

if (!customElements.get('smart-fan-2-card')) customElements.define('smart-fan-2-card', SmartFan2Card);
if (!customElements.get('smart-fan-2-card-editor')) customElements.define('smart-fan-2-card-editor', SmartFan2CardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'smart-fan-2-card')) window.customCards.push({
  type: 'smart-fan-2-card', name: 'Smart Fan 2 Card', preview: true,
  description: 'Steuerung für Smart Fan 2 und kompatible fan-Entitäten.',
});
console.info(`SMART FAN 2 CARD ${__VERSION__}`);

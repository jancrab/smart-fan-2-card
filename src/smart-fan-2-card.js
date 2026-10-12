import { LitElement, html, nothing, css } from 'lit';
import { cardStyles } from './styles.js';
import { fanView, validateConfig, naturalModes, nextStrength, leftAction, resolveAngleEntity } from './fan.js';
import { cyclingSettings, runPositionCycle } from './cycling.js';
import { profileSettings, applyFanProfile } from './profiles.js';

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
      if (this._pending || !view.available || !view.oscillate) return;
      this._cycleAbort = new AbortController();
      this._cycling = true;
      this._pending = true;
      this._error = '';
      const config = { ...this._config };
      try {
        cyclingSettings(this.hass, config);
        await applyFanProfile(this.hass, config, 'cycling', this._cycleAbort.signal);
        await runPositionCycle(() => this.hass, config, this._cycleAbort.signal);
      }
      catch (error) { this._error = error?.message || 'Cycling fehlgeschlagen.'; }
      finally { this._cycling = false; this._pending = false; }
      return;
    }
    const action = leftAction(this._config);
    const view = fanView(this.hass?.states[this._config.entity]);
    const target = this.hass?.states[this._config.left_entity];
    if (!action || !view.available || !view.oscillate || !target || target.state === 'unavailable' || (['number', 'select'].includes(action.domain) && target.state === 'unknown') || this._pending) return;
    this._pending = true;
    this._error = '';
    try {
      // Stop the automatic sweep before moving the physical head.
      await applyFanProfile(this.hass, this._config, 'cycling');
      await this.hass.callService(action.domain, action.service, action.data);
    } catch (error) {
      this._error = error?.message || 'Linksbewegung fehlgeschlagen.';
    } finally { this._pending = false; }
  }

  async _everyday() {
    if (this._pending) return;
    this._pending = true;
    this._error = '';
    try { await applyFanProfile(this.hass, this._config, 'everyday'); }
    catch (error) { this._error = error?.message || 'Alltagsprofil fehlgeschlagen.'; }
    finally { this._pending = false; }
  }

  async _call(service, data = {}, domain = 'fan', entityId = this._config.entity) {
    const state = this.hass?.states[this._config?.entity];
    if (this._pending || !fanView(state).available) return;
    this._pending = true;
    this._error = '';
    try {
      await this.hass.callService(domain, service, { ...data, entity_id: entityId });
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
    const angleEntity = resolveAngleEntity(this.hass, this._config);
    const angleState = this.hass.states[angleEntity];
    const angle = Number(angleState?.state);
    const angleMin = Number(angleState?.attributes?.min);
    const angleMax = Number(angleState?.attributes?.max);
    const angleStep = Number(angleState?.attributes?.step);
    const angleAvailable = !!angleState && !['unknown', 'unavailable', ''].includes(angleState.state) && Number.isFinite(angle) && Number.isFinite(angleMin) && Number.isFinite(angleMax) && angleMax > angleMin;
    const target = this.hass.states[this._config.left_entity];
    const canMoveLeft = !!target && target.state !== 'unavailable' && (!['number', 'select'].includes(this._config.left_entity?.split('.')[0]) || target.state !== 'unknown');
    let canCyclePosition = false;
    if (this._config.cycling_mode === 'position') {
      try { cyclingSettings(this.hass, this._config); canCyclePosition = true; } catch { /* Missing feedback keeps the button disabled. */ }
    }
    const canCycle = this._config.cycling_mode === 'position' ? canCyclePosition : canMoveLeft;
    let everydayProfile;
    try { everydayProfile = profileSettings(this.hass, this._config, 'everyday'); } catch { /* Missing capabilities disable the profile. */ }
    const everydayActive = !!everydayProfile && view.on && state.attributes.preset_mode === everydayProfile.mode && Math.abs(view.percentage - everydayProfile.percentage) < 1 && state.attributes.oscillating === true && angle === everydayProfile.angle;
    const status = !state ? 'Entität nicht gefunden' : !view.available ? 'Nicht verfügbar' : view.on ? 'Läuft' : 'Aus';
    const moreInfo = () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    const cyclingLabel = this._cycling ? 'Cycling stoppen' : this._config.cycling_mode === 'position' ? `Cycling: bis ${this._config.target_angle}° schwenken` : 'Cycling: ganz nach links';
    return html`
      <ha-card class=${this._config.layout} aria-busy=${!!this._pending}>
        <header>
          <button class=${`fan power ${view.on && view.available ? 'running' : ''}`} title=${view.on ? 'Ausschalten' : 'Einschalten'} aria-label=${view.on ? 'Ausschalten' : 'Einschalten'} aria-pressed=${view.on} ?disabled=${disabled}
            @click=${() => this._call(view.on ? 'turn_off' : 'turn_on')}><ha-icon icon="mdi:fan" aria-hidden="true"></ha-icon></button>
          <button class="details" @click=${moreInfo} title="Gerätedetails öffnen" aria-label="Gerätedetails öffnen">
            <h2>${this._config.name || state?.attributes.friendly_name || 'Ventilator'}</h2>
            <span class="status" role="status">${this._cycling ? 'Positioniert …' : this._pending ? 'Wird gesendet …' : this._config.subtitle ? `${this._config.subtitle} · ${status}` : status}</span>
          </button>
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
            <button class="everyday" ?disabled=${disabled || !everydayProfile} aria-label="Alltagsprofil aktivieren" aria-pressed=${everydayActive} title="Alltagsprofil: Modus, Leistung und Schwenken" @click=${() => this._everyday()}><ha-icon icon="mdi:sofa-outline"></ha-icon></button>
            <button class="cycling" ?disabled=${!this._cycling && (disabled || !view.oscillate || !canCycle)} aria-label=${cyclingLabel} aria-pressed=${!!this._cycling} title=${canCycle ? cyclingLabel : 'Cycling benötigt eine Positionsrückmeldung oder ein Positionierungs-Script'}
              @click=${() => this._cycleLeft()}>${this._cycling ? html`<ha-icon icon="mdi:stop"></ha-icon>` : html`<svg class="time-trial" viewBox="0 0 32 26" aria-hidden="true" focusable="false">
                <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="6.5" cy="19" r="5.2"/><circle cx="25.5" cy="19" r="5.2"/>
                  <path d="M6.5 19 12 10 19 19H6.5M12 10h10l3.5 9M19 19l3-9V8h3M10 10h4"/>
                  <path d="M13 5.5h7l3 2h4M13 5.5l-2 5 5 3-2 5" stroke-width="2"/>
                </g><path d="M20.2 2.7c0-1.2 1-2.2 2.3-2.2 1.4 0 2.7.9 3.1 2.1l-2.8 1.4c-1.4.6-2.6-.1-2.6-1.3Z" fill="currentColor"/>
              </svg>`}</button>
          </div>
          ${this._config.show_angle_slider ? angleAvailable ? html`<label class="speed angle"><span class="angle-label">Schwenkbereich</span>
            <input type="range" min=${angleMin} max=${angleMax} step=${angleStep > 0 ? angleStep : 1} .value=${String(angle)} aria-label="Schwenkbereich" ?disabled=${disabled || !view.on}
              @input=${event => { this.renderRoot.querySelector('.angle output').value = `${event.target.value}°`; }}
              @change=${event => this._call('set_value', { value: Math.max(angleMin, Math.min(angleMax, Number(event.target.value))) }, 'number', angleEntity)}>
            <output>${angle}°</output></label>` : html`<p class="hint">Schwenkbereich nicht verfügbar. Winkel-Entität unter „Darstellung“ auswählen.</p>` : nothing}
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
  _changed(event) {
    event.stopPropagation();
    this._config = { ...this._config, ...event.detail.value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return nothing;
    const fields = [
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
    ];
    const modes = naturalModes(fanView(this.hass.states[this._config.entity]).presets);
    const profileFields = kind => [
      { name: `${kind}_preset`, selector: { select: { options: [{ value: 'nature', label: 'Natural' }, { value: 'normal', label: 'Normal' }] } } },
      { name: `${kind}_percentage`, selector: { number: { min: 1, max: 100, step: 1, mode: 'slider', unit_of_measurement: '%' } } },
      ...(kind === 'everyday' ? [{ name: 'everyday_angle', selector: { number: { min: 1, max: 360, step: 1, mode: 'box', unit_of_measurement: '°' } } }] : []),
    ];
    const labels = { entity: 'Ventilator', name: 'Name (optional)', subtitle: 'Untertitel (optional)', layout: 'Layout', show_angle_slider: 'Schwenkbereich-Slider anzeigen', natural_preset: 'Natural-Modus', normal_preset: 'Normal-Modus', cycling_mode: 'Cycling: Ablauf', angle_entity: 'Schwenkbereich-Entität (automatisch erkannt, falls leer)', position_entity: 'Tatsächliche Kopfposition (Live-Rückmeldung)', target_angle: 'Zielwinkel', cycling_max_angle: 'Maximaler Schwenkbereich (leer = Entitätsmaximum)', target_tolerance: 'Zieltoleranz (Standard 2°)', cycling_timeout: 'Zeitlimit (Standard 30 s)', left_entity: 'Aktion für ganz links', left_value: 'Zielwert für number/select' };
    Object.assign(labels, { everyday_preset: 'Modus', everyday_percentage: 'Leistung', everyday_angle: 'Schwenkbereich (Standard 30°)', cycling_preset: 'Modus', cycling_percentage: 'Leistung' });
    const form = schema => html`<ha-form .hass=${this.hass} .data=${{ layout: 'compact', everyday_preset: 'nature', everyday_percentage: 66, everyday_angle: 30, cycling_preset: 'nature', cycling_percentage: 100, ...this._config }} .schema=${schema} .computeLabel=${field => labels[field.name]}
    .computeHelper=${field => field.name === 'position_entity' ? 'Muss sich während der Bewegung ändern. oscillation_angle ist der eingestellte Schwenkbereich und keine Positionsrückmeldung.' : field.name === 'cycling_mode' ? 'Zielwinkel-Steuerung läuft im geöffneten Browser. Für unbeaufsichtigten Betrieb ein Home-Assistant-Script als Links-Aktion verwenden.' : undefined}
    @value-changed=${event => this._changed(event)}></ha-form>`;
    return html`${form(fields.filter(field => ['entity', 'layout'].includes(field.name)))}
      <p>Name, Geschwindigkeit, Schwenken und Modi werden vom Ventilator übernommen.</p>
      <details><summary>Darstellung (optional)</summary>${form([
        ...fields.filter(field => ['name', 'subtitle'].includes(field.name)),
        { name: 'show_angle_slider', selector: { boolean: {} } },
        ...(this._config.show_angle_slider ? fields.filter(field => field.name === 'angle_entity') : []),
      ])}</details>
      ${!modes.supported ? html`<details><summary>Modi zuordnen (optional)</summary>${form(fields.filter(field => ['natural_preset', 'normal_preset'].includes(field.name)))}</details>` : nothing}
      <details><summary>Alltagsprofil</summary>${form(profileFields('everyday'))}<p>Aktiviert Schwenken mit dem eingestellten Schwenkbereich.</p></details>
      <details><summary>Cycling</summary>${form(profileFields('cycling'))}<p>Eine feste Kopfposition benötigt echte Positionsrückmeldung oder eine passende Positionierungs-Aktion. Der Schwenkbereich allein reicht nicht. <a href="https://github.com/jancrab/smart-fan-2-card/blob/main/docs/cycling-script.md" target="_blank" rel="noopener noreferrer">Script-Vorlage und Anleitung öffnen</a>.</p>${form(fields.filter(field => {
        if (field.name === 'cycling_mode') return true;
        if (this._config.cycling_mode === 'position') return ['angle_entity', 'position_entity', 'target_angle', 'cycling_max_angle', 'target_tolerance', 'cycling_timeout'].includes(field.name);
        return field.name === 'left_entity' || (field.name === 'left_value' && /^(number|select)\./.test(this._config.left_entity || ''));
      }))}</details>`;
  }
  static styles = css`p { color: var(--secondary-text-color); font-size: 13px; } details { border-top: 1px solid var(--divider-color); padding: 12px 0; } summary { cursor: pointer; padding: 4px 0; }`;
}

if (!customElements.get('smart-fan-2-card')) customElements.define('smart-fan-2-card', SmartFan2Card);
if (!customElements.get('smart-fan-2-card-editor')) customElements.define('smart-fan-2-card-editor', SmartFan2CardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'smart-fan-2-card')) window.customCards.push({
  type: 'smart-fan-2-card', name: 'Smart Fan 2 Card', preview: true,
  description: 'Steuerung für Smart Fan 2 und kompatible fan-Entitäten.',
});
console.info(`SMART FAN 2 CARD ${__VERSION__}`);

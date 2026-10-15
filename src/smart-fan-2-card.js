import { LitElement, html, nothing, css } from 'lit';
import { cardStyles } from './styles.js';
import { fanView, validateConfig, naturalModes, nextStrength, resolveAngleEntity } from './fan.js';
import { cyclingSettings } from './cycling.js';
import { profileSettings, applyFanProfile } from './profiles.js';

export class SmartFan2Card extends LitElement {
  static properties = {
    hass: { attribute: false, hasChanged: () => true },
    _config: { state: true },
    _pending: { state: true },
    _error: { state: true },
    _cycling: { state: true },
    _locked: { state: true },
    _visible: { state: true },
    _tabVisible: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this._visibilityChanged = () => { this._tabVisible = !this.ownerDocument.hidden; };
    this._visibilityChanged();
    this.ownerDocument.addEventListener('visibilitychange', this._visibilityChanged);
    const Observer = this.ownerDocument.defaultView.IntersectionObserver;
    this._visible = !Observer;
    if (Observer) {
      this._observer = new Observer(entries => { this._visible = entries.some(entry => entry.isIntersecting); });
      this._observer.observe(this);
    }
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    this._observer = undefined;
    this.ownerDocument.removeEventListener('visibilitychange', this._visibilityChanged);
    super.disconnectedCallback();
  }

  setConfig(config) {
    if (this._config?.entity !== config?.entity) { this._cycling = false; this._locked = false; }
    this._config = validateConfig(config);
  }
  static getStubConfig(hass) {
    return { entity: Object.keys(hass?.states || {}).find(id => id.startsWith('fan.')) || 'fan.smart_fan_2' };
  }
  static async getConfigElement() {
    if (!customElements.get('ha-form')) {
      // Native form/selector components are lazy-loaded by HA's built-in editor.
      const helpers = await window.loadCardHelpers();
      const nativeCard = helpers.createCardElement({ type: 'entities', entities: [] });
      await nativeCard.constructor.getConfigElement();
    }
    return document.createElement('smart-fan-2-card-editor');
  }
  getCardSize() { return this._config?.layout === 'wide' ? 4 : this._config?.show_angle_slider ? 8 : 7; }
  getGridOptions() { return { columns: this._config?.layout === 'wide' ? 12 : 6, min_columns: 6 }; }

  async _cycleLeft() {
    const view = fanView(this.hass?.states[this._config.entity]);
    if (this._pending || !view.available || !view.oscillate) return;
    const locking = !!this._cycling;
    this._pending = true;
    this._error = '';
    try {
      if (locking) {
        // Stop immediately, before applying or refreshing the profile.
        await this.hass.callService('fan', 'oscillate', { entity_id: this._config.entity, oscillating: false });
        this._cycling = false;
        await applyFanProfile(this.hass, this._config, 'cycling');
        this._locked = true;
      } else {
        const settings = cyclingSettings(this.hass, this._config);
        profileSettings(this.hass, this._config, 'cycling');
        this._locked = false;
        await applyFanProfile(this.hass, this._config, 'cycling');
        await this.hass.callService('number', 'set_value', { entity_id: settings.angleEntity, value: settings.maximum });
        await this.hass.callService('fan', 'oscillate', { entity_id: this._config.entity, oscillating: true });
        this._cycling = true;
      }
    } catch (error) { this._error = error?.message || 'Cycling failed. Please try again.'; }
    finally { this._pending = false; }
  }

  async _everyday() {
    if (this._pending) return;
    this._pending = true;
    this._error = '';
    try { await applyFanProfile(this.hass, this._config, 'everyday'); this._locked = false; this._cycling = false; }
    catch (error) { this._error = error?.message || 'Everyday profile failed.'; }
    finally { this._pending = false; }
  }

  async _call(service, data = {}, domain = 'fan', entityId = this._config.entity) {
    const state = this.hass?.states[this._config?.entity];
    if (this._pending || !fanView(state).available) return;
    this._pending = true;
    this._error = '';
    try {
      await this.hass.callService(domain, service, { ...data, entity_id: entityId });
      if (service === 'turn_off' || service === 'oscillate') { this._locked = false; this._cycling = false; }
      if (domain === 'fan' && service === 'set_preset_mode') {
        await this.hass.callService('homeassistant', 'update_entity', { entity_id: entityId });
      }
    } catch (error) {
      this._error = error?.message || 'Command failed. Please try again.';
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
    let canCycle = false;
    try { cyclingSettings(this.hass, this._config); profileSettings(this.hass, this._config, 'cycling'); canCycle = true; } catch { /* Unavailable sweep or profile. */ }
    let cyclingProfile;
    try { cyclingProfile = profileSettings(this.hass, this._config, 'cycling'); } catch { /* Unsupported profile. */ }
    const locked = !!this._locked && !!cyclingProfile && view.on && state.attributes.oscillating === false && state.attributes.preset_mode === cyclingProfile.mode && Math.abs(view.percentage - cyclingProfile.percentage) < 1;
    const profileDisabled = disabled || locked;
    let everydayProfile;
    try { everydayProfile = profileSettings(this.hass, this._config, 'everyday'); } catch { /* Missing capabilities disable the profile. */ }
    const everydayActive = !!everydayProfile && view.on && state.attributes.preset_mode === everydayProfile.mode && Math.abs(view.percentage - everydayProfile.percentage) < 1 && state.attributes.oscillating === true && angle === everydayProfile.angle;
    const status = !state ? 'Entity not found' : state.state === 'unknown' ? 'Unknown' : !view.available ? 'Unavailable' : view.on ? 'Running' : state.state === 'off' ? 'Off' : 'Unknown';
    const modeLabel = natural ? 'Natural' : state?.attributes.preset_mode === modes.normal && modes.supported ? 'Normal' : state?.attributes.preset_mode || 'No mode reported';
    const moving = view.available && view.on && view.percentageKnown && view.percentage > 0;
    const animate = moving && this._visible && this._tabVisible && this._config.animate_scene !== false;
    const speedValue = view.available && view.percentageKnown ? Math.round(view.percentage) : '—';
    const moreInfo = () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }));
    const cyclingLabel = this._cycling ? 'Lock: stop at the current position' : 'Set: start maximum sweep with the Cycling profile';
    return html`
      <ha-card class=${this._config.layout} data-dark=${!!this.hass.themes?.darkMode} data-moving=${moving} data-animate=${!!animate} data-scene=${this._config.show_scene !== false} aria-busy=${!!this._pending} style=${`--flow-duration: ${14 - (view.percentage / 100) * 8}s`}>
        <div class="scene" aria-hidden="true">
          <svg viewBox="0 0 600 240" preserveAspectRatio="xMidYMid slice"><g class="flow">
            <path d="M-120 178 C80 178 165 24 320 68 S520 208 740 52"/>
            <path d="M-120 202 C80 202 165 48 320 92 S520 232 740 76"/>
            <path d="M-120 226 C80 226 165 72 320 116 S520 256 740 100"/>
            <path d="M-120 250 C80 250 165 96 320 140 S520 280 740 124"/>
          </g></svg>
        </div>
        <div class="overview">
        <header>
          <button class=${`fan power ${view.on && view.available ? 'running' : ''}`} title=${view.on ? 'Turn off' : 'Turn on'} aria-label=${view.on ? 'Turn off' : 'Turn on'} aria-pressed=${view.on} ?disabled=${disabled}
            @click=${() => this._call(view.on ? 'turn_off' : 'turn_on')}><ha-icon icon="mdi:fan" aria-hidden="true"></ha-icon></button>
          <button class="details" @click=${moreInfo} title="Open device details" aria-label="Open device details">
            <h2>${this._config.name || state?.attributes.friendly_name || 'Fan'}</h2>
            <span class="status" role="status">${this._pending ? 'Sending command …' : !view.available ? status : locked ? 'Cycling profile locked' : this._cycling ? 'Sweeping · press Lock to stop' : this._config.subtitle ? `${this._config.subtitle} · ${status}` : status}</span>
          </button>
        </header>
        <div class="reading" aria-label=${view.speed ? `Reported speed: ${speedValue}${speedValue === '—' ? '' : ' percent'}` : status}>
          <div class=${`value ${view.speed ? '' : 'text-value'}`}>${view.speed ? speedValue : status}${view.speed && speedValue !== '—' ? html`<span class="unit">%</span>` : nothing}</div>
          <span class="reading-label">${view.speed ? 'Reported speed' : 'Fan status'}</span>
        </div>
        ${this._config.show_summary !== false ? html`<div class="summary"><span>${view.available ? modeLabel : 'No live data'}</span><span>${view.available && typeof state.attributes.oscillating === 'boolean' && view.oscillate ? state.attributes.oscillating ? angleAvailable ? `Sweep ${angle}°` : 'Oscillating' : 'Fixed' : '—'}</span></div>` : nothing}
        </div>
        <div class="settings">
        ${view.speed ? html`<label class="speed"><ha-icon icon="mdi:weather-windy" aria-hidden="true"></ha-icon>
          <input type="range" min="0" max="100" step="1" .value=${String(view.on ? view.percentage : 0)} aria-label="Speed" aria-valuetext=${view.available && view.percentageKnown ? `${view.on ? view.percentage : 0} percent` : 'No speed reported'} ?disabled=${profileDisabled}
            @input=${event => { this.renderRoot.querySelector('output').value = `${event.target.value} %`; }}
            @change=${event => this._call('set_percentage', { percentage: Math.max(0, Math.min(100, Number(event.target.value))) })}>
          <output>${view.available && view.percentageKnown ? `${view.on ? Math.round(view.percentage) : 0} %` : '—'}</output>
        </label>` : nothing}
        <div class="controls">
          <div class="quick-controls">
            <button class=${`natural ${natural ? 'enabled' : ''}`} ?disabled=${profileDisabled || !view.on || !modes.supported} aria-pressed=${natural}
              aria-label=${natural ? 'Natural active, switch to Normal' : 'Normal active, switch to Natural'}
              title=${modes.supported ? natural ? 'Natural · switch to Normal' : 'Normal · switch to Natural' : 'Natural: map presets in the editor'}
              @click=${() => this._call('set_preset_mode', { preset_mode: natural ? modes.normal : modes.natural })}><ha-icon icon=${natural ? 'mdi:leaf' : 'mdi:weather-windy'}></ha-icon><span>${natural ? 'Natural' : 'Normal'}</span></button>
            ${view.speed ? html`<button class="strength" ?disabled=${profileDisabled} aria-label=${view.percentageKnown ? `Strength ${strength}, select next level` : 'Strength unknown, select 33 percent'}
              title=${view.percentageKnown ? `Strength ${strength} · 33 / 66 / 100 %` : 'Strength unknown · select 33 %'} @click=${() => this._call('set_percentage', { percentage: nextStrength(view.percentage).percentage })}><ha-icon icon=${view.percentageKnown ? `mdi:numeric-${view.on ? strength : 0}-circle-outline` : 'mdi:weather-windy'}></ha-icon><span>Strength</span></button>` : nothing}
            ${view.oscillate ? html`<button class="oscillate" ?disabled=${disabled || !view.on} aria-label=${state.attributes.oscillating ? 'Turn oscillation off' : 'Turn oscillation on'} title=${state.attributes.oscillating ? 'Oscillation on' : 'Oscillation off'} aria-pressed=${!!state.attributes.oscillating}
              @click=${() => this._call('oscillate', { oscillating: !state.attributes.oscillating })}><ha-icon icon="mdi:arrow-left-right"></ha-icon><span>Sweep</span></button>` : nothing}
            <button class="everyday" ?disabled=${disabled || !everydayProfile} aria-label="Activate Everyday profile" aria-pressed=${everydayActive} title="Everyday: mode, speed and oscillation" @click=${() => this._everyday()}><ha-icon icon="mdi:sofa-outline"></ha-icon><span>Everyday</span></button>
            <button class="cycling" ?disabled=${disabled || !view.oscillate || (!this._cycling && !canCycle)} aria-label=${cyclingLabel} aria-pressed=${!!this._cycling || locked} title=${canCycle || this._cycling ? cyclingLabel : 'Cycling needs an available sweep angle and supported profile'}
              @click=${() => this._cycleLeft()}><ha-icon icon=${this._cycling ? 'mdi:lock-outline' : 'mdi:crosshairs'}></ha-icon><span>${this._cycling ? 'Lock' : 'Set'}</span></button>
          </div>
          ${this._config.show_angle_slider && view.available && view.on && view.oscillate && state.attributes.oscillating === true ? angleAvailable ? html`<label class="speed angle"><span class="angle-label">Sweep angle</span>
            <input type="range" min=${angleMin} max=${angleMax} step=${angleStep > 0 ? angleStep : 1} .value=${String(angle)} aria-label="Sweep angle" ?disabled=${disabled || !view.on}
              @input=${event => { this.renderRoot.querySelector('.angle output').value = `${event.target.value}°`; }}
              @change=${event => this._call('set_value', { value: Math.max(angleMin, Math.min(angleMax, Number(event.target.value))) }, 'number', angleEntity)}>
            <output>${angle}°</output></label>` : html`<p class="hint">Sweep angle unavailable. Select its entity under Cycling in the editor.</p>` : nothing}
          ${view.presets.length && !(modes.supported && view.presets.length === 2) ? html`<label class="preset"><ha-icon icon="mdi:tune-variant" aria-hidden="true"></ha-icon><select aria-label="Mode" ?disabled=${profileDisabled || !view.on}
            @change=${event => this._call('set_preset_mode', { preset_mode: event.target.value })}>
              <option value="" ?selected=${!view.presets.includes(state.attributes.preset_mode)} disabled>Select mode</option>
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
  static properties = { hass: { attribute: false, hasChanged: () => true }, _config: { state: true } };
  setConfig(config) { this._config = { ...config }; }
  _changed(event) {
    event.stopPropagation();
    this._config = { ...this._config, ...event.detail.value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return nothing;
    const entity = name => ({ name, selector: { entity: { domain: name === 'entity' ? 'fan' : 'number' } } });
    const text = name => ({ name, selector: { text: {} } });
    const modes = naturalModes(fanView(this.hass.states[this._config.entity]).presets);
    const profileFields = kind => [
      { name: `${kind}_preset`, selector: { select: { options: [{ value: 'nature', label: 'Natural' }, { value: 'normal', label: 'Normal' }] } } },
      { name: `${kind}_percentage`, selector: { number: { min: 1, max: 100, step: 1, mode: 'slider', unit_of_measurement: '%' } } },
      ...(kind === 'everyday' ? [{ name: 'everyday_angle', selector: { number: { min: 1, max: 360, step: 1, mode: 'box', unit_of_measurement: '°' } } }] : []),
    ];
    const labels = { show_scene: 'Show airflow scene', animate_scene: 'Animate airflow while running', show_summary: 'Show mode and sweep summary', entity: 'Fan', name: 'Name (optional)', subtitle: 'Subtitle (optional)', layout: 'Layout', show_angle_slider: 'Show sweep angle slider', angle_entity: 'Sweep angle entity (auto-detected when empty)', natural_preset: 'Natural preset name', normal_preset: 'Normal preset name', everyday_preset: 'Mode', everyday_percentage: 'Speed', everyday_angle: 'Sweep angle (default 30°)', cycling_preset: 'Locked mode', cycling_percentage: 'Locked speed' };
    const form = schema => html`<ha-form .hass=${this.hass} .data=${{ show_scene: true, animate_scene: true, show_summary: true, layout: 'compact', everyday_preset: 'nature', everyday_percentage: 66, everyday_angle: 30, cycling_preset: 'nature', cycling_percentage: 100, ...this._config }} .schema=${schema} .computeLabel=${field => labels[field.name]} @value-changed=${event => this._changed(event)}></ha-form>`;
    return html`${form([{ ...entity('entity'), required: true }, { name: 'layout', selector: { select: { options: [{ value: 'compact', label: 'Compact · Dashboard' }, { value: 'wide', label: 'Wide · Web UI' }] } } }])}
      <p>Name, speed, oscillation and modes come from the fan entity.</p>
      <details><summary>Appearance (optional)</summary>${form([text('name'), text('subtitle'), ...['show_scene', 'animate_scene', 'show_summary'].map(name => ({ name, selector: { boolean: {} } })), { name: 'show_angle_slider', selector: { boolean: {} } }])}</details>
      ${!modes.supported ? html`<details><summary>Preset mapping (optional)</summary>${form([text('natural_preset'), text('normal_preset')])}</details>` : nothing}
      <details><summary>Everyday profile</summary>${form(profileFields('everyday'))}<p>Turns on oscillation at the selected sweep angle.</p></details>
      <details><summary>Cycling · Set / Lock</summary>${form(profileFields('cycling'))}${form([entity('angle_entity')])}
      <p>Press Set to apply this profile and start the maximum sweep supported by the angle entity. Press Lock when the head reaches your preferred position. No position sensor or script is required.</p>
      <p>Lock stops oscillation and reapplies this profile. Speed and mode controls stay locked in this card until you press Set, use Everyday, toggle oscillation or turn off the fan. Other cards and automations can still change the fan. Reloading the page clears the UI lock.</p></details>`;
  }
  static styles = css`p { color: var(--secondary-text-color); font-size: 13px; line-height: 1.5; } details { border-top: 1px solid var(--divider-color); padding: 12px 0; } summary { cursor: pointer; padding: 4px 0; }`;
}

if (!customElements.get('smart-fan-2-card')) customElements.define('smart-fan-2-card', SmartFan2Card);
if (!customElements.get('smart-fan-2-card-editor')) customElements.define('smart-fan-2-card-editor', SmartFan2CardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'smart-fan-2-card')) window.customCards.push({
  type: 'smart-fan-2-card', name: 'Smart Fan 2 Card', preview: true,
  description: 'Controls for Smart Fan 2 and compatible fan entities.',
});
console.info(`SMART FAN 2 CARD ${__VERSION__}`);

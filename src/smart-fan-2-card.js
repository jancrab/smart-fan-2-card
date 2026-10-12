import { LitElement, html, css, nothing } from 'lit';
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
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: this._config?.layout === 'wide' ? 12 : 6 }; }

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
    return html`
      <ha-card class=${this._config.layout}>
        <header>
          <div><p class="eyebrow">${this._config.subtitle || 'SMART FAN 2'}</p><h2>${this._config.name || state?.attributes.friendly_name || 'Ventilator'}</h2></div>
          <button class="power" aria-label=${view.on ? 'Ausschalten' : 'Einschalten'} aria-pressed=${view.on} ?disabled=${disabled}
            @click=${() => this._call(view.on ? 'turn_off' : 'turn_on')}><ha-icon icon="mdi:power"></ha-icon></button>
        </header>
        <div class="instrument">
          <div class=${`fan ${view.on && view.available ? 'running' : ''}`} aria-hidden="true"><ha-icon icon="mdi:fan"></ha-icon></div>
          <div class="reading"><span class="status"><i class=${view.on && view.available ? 'active' : ''}></i>${status}</span>
            <div class="number">${view.available ? view.on ? Math.round(view.percentage) : 0 : '—'}<small>%</small></div>
            <span class="caption">Windstärke</span>
          </div>
        </div>
        <div class="settings">
        ${view.speed ? html`<label class="speed"><span>Geschwindigkeit</span><output>${Math.round(view.percentage)} %</output>
          <input type="range" min="0" max="100" step=${view.step} .value=${String(view.percentage)} aria-label="Geschwindigkeit" ?disabled=${disabled}
            @input=${event => { event.target.previousElementSibling.value = `${event.target.value} %`; }}
            @change=${event => this._call('set_percentage', { percentage: Math.max(0, Math.min(100, Number(event.target.value))) })}>
        </label>` : nothing}
        <div class="controls">
          <div class="quick-controls">
            <button class=${`natural ${natural ? 'enabled' : ''}`} ?disabled=${disabled || !view.on || !modes.supported} aria-pressed=${natural}
              title=${modes.supported ? 'Zwischen Normal und Natural wechseln' : 'Normal- und Natural-Modus im Editor zuordnen'}
              @click=${() => this._call('set_preset_mode', { preset_mode: natural ? modes.normal : modes.natural })}><ha-icon icon="mdi:leaf"></ha-icon><span>${natural ? 'Natural' : 'Normal'}</span></button>
            ${view.speed ? html`<button class="strength" ?disabled=${disabled} aria-label=${`Stärke ${strength}, nächste Stufe wählen`}
              @click=${() => this._call('set_percentage', { percentage: nextStrength(view.percentage).percentage })}><b>${view.on ? strength : '—'}</b><span>Stärke 1–3</span></button>` : nothing}
            <button class="cycling" ?disabled=${!this._cycling && (disabled || !view.on || !view.oscillate || !canCycle)} title=${this._config.cycling_mode === 'position' ? `Schwenken bis ${this._config.target_angle}° mit Positionsrückmeldung` : canMoveLeft ? 'Schwenken stoppen und ganz nach links drehen' : 'Cycling im Editor konfigurieren'}
              @click=${() => this._cycleLeft()}><ha-icon icon="mdi:rotate-left"></ha-icon><span>${this._cycling ? 'Stoppen' : 'Cycling'}</span></button>
          </div>
          ${view.oscillate ? html`<button class="oscillate" ?disabled=${disabled || !view.on} aria-pressed=${!!state.attributes.oscillating}
            @click=${() => this._call('oscillate', { oscillating: !state.attributes.oscillating })}><ha-icon icon="mdi:arrow-left-right"></ha-icon> Schwenken <span>${state.attributes.oscillating ? 'An' : 'Aus'}</span></button>` : nothing}
          ${view.presets.length ? html`<label class="preset">Modus<select aria-label="Modus" ?disabled=${disabled || !view.on}
            @change=${event => this._call('set_preset_mode', { preset_mode: event.target.value })}>
              <option value="" ?selected=${!view.presets.includes(state.attributes.preset_mode)} disabled>Modus wählen</option>
              ${view.presets.map(mode => html`<option .value=${mode} ?selected=${mode === state.attributes.preset_mode}>${mode}</option>`)}
            </select></label>` : nothing}
        </div>
        </div>
        ${this._error ? html`<p class="error" role="alert">${this._error}</p>` : nothing}
        <footer><span>${this._pending ? 'Wird gesendet …' : 'HOME ASSISTANT'}</span><button class="details" @click=${() => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._config.entity }, bubbles: true, composed: true }))}>Details ↗</button></footer>
      </ha-card>`;
  }

  static styles = css`
    :host { display:block; --accent:var(--smart-fan-accent, var(--primary-color, #299781)); --ink:var(--primary-text-color, #203a35); --muted:var(--secondary-text-color, #78867f); --line:var(--divider-color, #dce4dd); --surface:var(--secondary-background-color, #eff3ed); color:var(--ink); font-family:var(--paper-font-body1_-_font-family, 'Aptos', sans-serif); }
    * { box-sizing:border-box; } ha-card { display:block; padding:24px; overflow:hidden; background:var(--ha-card-background, var(--card-background-color, #fafcf8)); border-radius:var(--ha-card-border-radius, 24px); }
    header { display:flex; align-items:center; justify-content:space-between; gap:12px; } h2 { margin:5px 0 0; font-size:22px; font-weight:600; overflow-wrap:anywhere; } .eyebrow { margin:0; color:var(--muted); letter-spacing:.18em; font-size:10px; font-weight:700; }
    button,select,input { font:inherit; accent-color:var(--accent); } button { cursor:pointer; color:var(--ink); border:1px solid var(--line); background:transparent; } button:disabled, input:disabled, select:disabled { opacity:.45; cursor:not-allowed; } button:focus-visible,input:focus-visible,select:focus-visible { outline:3px solid var(--accent); outline-offset:4px; }
    .power { display:grid; place-items:center; flex:0 0 48px; height:48px; border-radius:50%; } .power[aria-pressed=true] { background:var(--accent); color:var(--text-primary-color, #fff); border-color:var(--accent); }
    .instrument { display:flex; align-items:center; gap:28px; padding:30px 0; } .fan { display:grid; place-items:center; flex:0 0 116px; height:116px; border:1px solid var(--line); border-radius:50%; background:var(--surface); } .fan ha-icon { --mdc-icon-size:76px; color:var(--muted); } .running ha-icon { color:var(--accent); animation:spin 5s linear infinite; } .reading { min-width:0; } .status { display:flex; gap:7px; align-items:center; font-size:12px; color:var(--muted); } i { display:inline-block; flex:0 0 6px; height:6px; border-radius:50%; background:var(--muted); } i.active { background:var(--accent); } .number { font-size:60px; line-height:1.1; font-weight:300; letter-spacing:-.06em; font-variant-numeric:tabular-nums; } small { font-size:22px; margin-left:5px; color:var(--muted); } .caption { font-size:11px; color:var(--muted); }
    .speed { display:grid; grid-template-columns:1fr auto; gap:12px; font-size:12px; } output { color:var(--muted); } input { width:100%; grid-column:1/-1; margin:0; height:32px; cursor:pointer; } .controls { display:grid; gap:10px; margin-top:18px; } .oscillate { display:flex; align-items:center; gap:8px; text-align:left; padding:12px; border-radius:12px; font-size:13px; } .oscillate span { margin-left:auto; color:var(--muted); } .oscillate[aria-pressed=true] { border-color:var(--accent); } .preset { display:flex; gap:12px; align-items:center; justify-content:space-between; font-size:12px; padding:4px 0; } select { max-width:70%; padding:9px; border-radius:8px; border:1px solid var(--line); background:var(--surface); color:var(--ink); }
    .quick-controls { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; } .quick-controls button { min-height:66px; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:11px; } .quick-controls b { font-size:22px; font-weight:500; } .natural { --mode-color:var(--smart-fan-normal-color,#2379ca); color:var(--mode-color); border-color:var(--mode-color); background:color-mix(in srgb,var(--mode-color) 10%,transparent); } .natural.enabled { --mode-color:var(--smart-fan-natural-color,#25844c); }
    ha-card.wide { display:grid; grid-template-columns:minmax(180px,.85fr) minmax(220px,1.15fr); column-gap:32px; } .wide header,.wide footer,.wide .error { grid-column:1/-1; } .wide .instrument { align-self:center; } .wide .settings { padding-top:28px; } @media(max-width:560px) { ha-card.wide { display:block; } .wide .settings { padding-top:0; } }
    footer { margin-top:22px; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; gap:8px; color:var(--muted); font-size:9px; letter-spacing:.1em; } .details { border:0; padding:8px 0 8px 8px; color:var(--muted); font-size:11px; } .error { color:var(--error-color, #b52c35); font-size:12px; overflow-wrap:anywhere; }
    @keyframes spin { to { transform:rotate(360deg); } } @media(prefers-reduced-motion:reduce) { .running ha-icon { animation:none; } } @media(max-width:380px) { ha-card { padding:18px; } .instrument { gap:18px; } .fan { flex-basis:88px; height:88px; } .fan ha-icon { --mdc-icon-size:60px; } .number { font-size:48px; } }
  `;
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

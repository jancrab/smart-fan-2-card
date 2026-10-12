import { css } from 'lit';

export const cardStyles = css`
  :host {
    display: block;
    container-type: inline-size;
    --accent: var(--smart-fan-accent, var(--primary-color, #337eab));
    --ink: var(--primary-text-color, #24292e);
    --muted: var(--secondary-text-color, #656e77);
    --line: var(--divider-color, #e3e6e9);
    --surface: var(--secondary-background-color, #f4f5f6);
    --normal: var(--smart-fan-normal-color, #216bb3);
    --natural: var(--smart-fan-natural-color, #247445);
    --focus: var(--primary-color, #216bb3);
    color: var(--ink);
    font-family: var(--paper-font-body1_-_font-family, inherit);
  }
  * { box-sizing: border-box; }
  ha-card {
    display: block;
    padding: 14px;
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--ha-card-border-color, var(--line));
    border-radius: var(--ha-card-border-radius, 16px);
    box-shadow: var(--ha-card-box-shadow, none);
  }
  header { display: flex; align-items: center; gap: 10px; min-width: 0; }
  button, input, select { font: inherit; -webkit-tap-highlight-color: transparent; }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    touch-action: manipulation;
  }
  button:disabled, input:disabled, select:disabled { opacity: .4; cursor: not-allowed; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  @media (hover: hover) { button:not(:disabled):hover { background: var(--surface); } }
  button:not(:disabled):active { filter: brightness(.92); }
  ha-icon { --mdc-icon-size: 22px; pointer-events: none; }
  .fan { display: grid; place-items: center; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 12px; background: var(--surface); color: var(--muted); }
  .fan ha-icon { --mdc-icon-size: 25px; }
  .fan.running ha-icon { animation: fan-spin 2s linear infinite; }
  @keyframes fan-spin { to { transform: rotate(360deg); } }
  .time-trial { width: 28px; height: 24px; pointer-events: none; }
  .running { color: var(--accent); }
  .details { display: block; flex: 1; min-width: 0; text-align: left; border-radius: 4px; }
  h2 { margin: 0 0 3px; font-size: 14px; line-height: 1.35; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
  .status { display: block; font-size: 12px; line-height: 1.3; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .power { flex: 0 0 44px; }
  .power[aria-pressed=true] { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .settings { min-width: 0; }
  .speed { display: flex; align-items: center; gap: 8px; min-height: 44px; margin: 6px 0; color: var(--muted); }
  .speed ha-icon { --mdc-icon-size: 18px; flex: 0 0 18px; }
  .angle { margin: 8px 0 0; }
  .angle-label { font-size: 12px; }
  .hint { color: var(--muted); font-size: 12px; }
  input { accent-color: var(--accent); }
  input[type=range] { width: 0; min-width: 0; flex: 1; margin: 0; height: 44px; cursor: pointer; }
  output { min-width: 43px; text-align: right; font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--ink); }
  .quick-controls { display: flex; align-items: center; gap: 6px; padding-top: 10px; border-top: 1px solid var(--line); }
  .quick-controls button { flex: 1; }
  .everyday[aria-pressed=true] { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .natural { color: var(--normal); background: color-mix(in srgb, var(--normal) 9%, transparent); }
  .natural.enabled { color: var(--natural); background: color-mix(in srgb, var(--natural) 10%, transparent); }
  .oscillate[aria-pressed=true], .cycling[aria-pressed=true] { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .preset { display: flex; align-items: center; gap: 10px; margin-top: 10px; color: var(--muted); }
  select { min-width: 0; width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 8px; padding: 0 8px; color: var(--ink); background: var(--surface); font-size: 12px; }
  .error { margin: 10px 0 0; color: var(--error-color, #b52c35); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
  ha-card.wide { display: grid; grid-template-columns: minmax(150px, .85fr) minmax(244px, 1.15fr); align-items: center; column-gap: 20px; }
  .wide .error { grid-column: 1/-1; }
  .wide .speed { margin-top: 0; }
  @container (max-width: 443px) { ha-card.wide { display: block; } .wide .speed { margin-top: 6px; } }
  @container (max-width: 273px) { .quick-controls { display: grid; grid-template-columns: repeat(3, minmax(44px, 1fr)); } }
  @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } .fan.running ha-icon { animation: none; } }
`;

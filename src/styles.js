import { css } from 'lit';

export const cardStyles = css`
  :host {
    display: block;
    container-type: inline-size;
    --accent: var(--smart-fan-accent, var(--primary-color, #337eab));
    --ink: var(--primary-text-color, #24292e);
    --muted: var(--secondary-text-color, #656e77);
    --line: color-mix(in srgb, var(--ink) 12%, transparent);
    --base: var(--ha-card-background, var(--card-background-color, #fff));
    --surface: color-mix(in srgb, var(--base) 88%, var(--accent));
    --normal: var(--smart-fan-normal-color, #216bb3);
    --natural: var(--smart-fan-natural-color, #247445);
    color: var(--ink);
    font-family: var(--ha-font-family-body, var(--paper-font-body1_-_font-family, inherit));
    font-variant-numeric: tabular-nums;
  }
  * { box-sizing: border-box; }
  ha-card {
    --scene-tint: var(--smart-fan-scene-light, color-mix(in srgb, var(--accent) 14%, var(--base)));
    --flow-color: var(--smart-fan-flow-light, color-mix(in srgb, var(--accent) 24%, transparent));
    position: relative;
    isolation: isolate;
    display: block;
    padding: 16px;
    background: var(--base);
    border: 1px solid var(--ha-card-border-color, var(--line));
    border-radius: var(--ha-card-border-radius, 16px);
    box-shadow: var(--ha-card-box-shadow, none);
  }
  ha-card[data-dark=true] {
    --scene-tint: var(--smart-fan-scene-dark, color-mix(in srgb, var(--accent) 11%, var(--base)));
    --flow-color: var(--smart-fan-flow-dark, color-mix(in srgb, var(--accent) 20%, transparent));
    --normal: var(--smart-fan-normal-color, #80bfff);
    --natural: var(--smart-fan-natural-color, #75d79b);
  }
  .scene { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; z-index: -1; background: radial-gradient(ellipse at 100% 8%, var(--scene-tint), transparent 75%); opacity: .4; transition: opacity 180ms ease; }
  [data-moving=true] .scene { opacity: 1; }
  [data-scene=false] .scene { display: none; }
  .scene svg { position: absolute; width: 100%; height: 100%; right: -12%; top: 0; }
  .flow { fill: none; stroke: var(--flow-color); stroke-width: 1; animation: airflow var(--flow-duration) ease-in-out infinite alternate; animation-play-state: paused; }
  [data-animate=true] .flow { animation-play-state: running; }
  @keyframes airflow { from { transform: translate(-18px, 6px); opacity: .35; } to { transform: translate(24px, -8px); opacity: .85; } }
  header { display: flex; align-items: center; gap: 12px; min-width: 0; }
  button, input, select { font: inherit; -webkit-tap-highlight-color: transparent; }
  button { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 0; border: 0; border-radius: 12px; color: var(--muted); background: transparent; cursor: pointer; touch-action: manipulation; transition: background 180ms ease, color 180ms ease; }
  button:disabled, input:disabled, select:disabled { opacity: .45; cursor: not-allowed; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  @media (hover: hover) { button:not(:disabled):hover { background: var(--surface); } }
  button:not(:disabled):active { background: var(--surface); }
  ha-icon { --mdc-icon-size: 22px; pointer-events: none; }
  .fan { width: 44px; height: 44px; flex: 0 0 44px; background: color-mix(in srgb, var(--base) 70%, transparent); border: 1px solid var(--line); }
  .fan ha-icon { --mdc-icon-size: 26px; }
  .power[aria-pressed=true] { color: var(--accent); background: var(--surface); }
  .details { display: block; flex: 1; min-width: 0; text-align: left; border-radius: 4px; }
  h2 { margin: 0 0 4px; font-size: 14px; line-height: 1.4; font-weight: 500; color: var(--ink); overflow-wrap: anywhere; }
  .status { display: block; font-size: 12px; line-height: 1.4; color: var(--muted); overflow-wrap: anywhere; }
  .reading { margin-top: 16px; }
  .value { font-size: 48px; font-weight: 500; letter-spacing: -.04em; line-height: 1.1; }
  .unit { font-size: 20px; margin-left: 4px; letter-spacing: 0; font-weight: 400; color: var(--muted); }
  .text-value { font-size: 32px; overflow-wrap: anywhere; }
  .reading-label { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; }
  .summary { display: flex; flex-wrap: wrap; gap: 4px 16px; margin-top: 12px; font-size: 12px; line-height: 1.5; color: var(--muted); }
  .summary span { overflow-wrap: anywhere; min-width: 0; }
  .settings { min-width: 0; margin-top: 12px; }
  .speed { display: flex; align-items: center; gap: 8px; min-height: 44px; margin: 0; color: var(--muted); }
  .speed ha-icon { --mdc-icon-size: 18px; flex: 0 0 18px; }
  .angle { margin: 8px 0 0; }
  .angle-label { font-size: 12px; }
  .hint { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
  input { accent-color: var(--accent); }
  input[type=range] { width: 0; min-width: 0; flex: 1; margin: 0; height: 44px; cursor: pointer; }
  output { min-width: 43px; text-align: right; font-size: 13px; font-weight: 500; color: var(--ink); }
  .quick-controls { display: flex; align-items: stretch; gap: 4px; padding-top: 12px; margin-top: 4px; border-top: 1px solid var(--line); }
  .quick-controls button { flex: 1; flex-direction: column; gap: 4px; min-height: 52px; }
  .quick-controls span { font-size: 10px; line-height: 12px; }
  .everyday[aria-pressed=true], .oscillate[aria-pressed=true], .cycling[aria-pressed=true] { color: var(--accent); background: var(--surface); }
  .natural { color: var(--normal); background: color-mix(in srgb, var(--normal) 8%, var(--base)); }
  .natural.enabled { color: var(--natural); background: color-mix(in srgb, var(--natural) 8%, var(--base)); }
  .preset { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: var(--muted); }
  select { min-width: 0; width: 100%; min-height: 44px; border: 1px solid var(--line); border-radius: 12px; padding: 0 8px; color: var(--ink); background: var(--base); font-size: 12px; }
  .error { margin: 12px 0 0; color: var(--error-color, #b52c35); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  ha-card.wide { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); align-items: center; gap: 24px; }
  .wide .settings { margin-top: 0; }
  .wide .error { grid-column: 1/-1; }
  @container (max-width: 559px) { ha-card.wide { display: block; } .wide .settings { margin-top: 12px; } }
  @container (max-width: 279px) { .quick-controls { flex-wrap: wrap; } .quick-controls button { flex: 1 0 28%; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto; } }
`;

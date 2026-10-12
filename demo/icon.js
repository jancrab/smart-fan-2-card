import { mdiFan, mdiPower, mdiLeaf, mdiRotateLeft, mdiArrowLeftRight, mdiWeatherWindy, mdiStop, mdiTuneVariant, mdiNumeric0CircleOutline, mdiNumeric1CircleOutline, mdiNumeric2CircleOutline, mdiNumeric3CircleOutline } from '@mdi/js';

const paths = { 'mdi:fan': mdiFan, 'mdi:power': mdiPower, 'mdi:leaf': mdiLeaf, 'mdi:rotate-left': mdiRotateLeft, 'mdi:arrow-left-right': mdiArrowLeftRight, 'mdi:weather-windy': mdiWeatherWindy, 'mdi:stop': mdiStop, 'mdi:tune-variant': mdiTuneVariant,
  'mdi:numeric-0-circle-outline': mdiNumeric0CircleOutline, 'mdi:numeric-1-circle-outline': mdiNumeric1CircleOutline, 'mdi:numeric-2-circle-outline': mdiNumeric2CircleOutline, 'mdi:numeric-3-circle-outline': mdiNumeric3CircleOutline };
class DemoIcon extends HTMLElement {
  static observedAttributes = ['icon'];
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px)}svg{width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path></path></svg>';
  }
  connectedCallback() { this.attributeChangedCallback(); }
  attributeChangedCallback() { this.shadowRoot.querySelector('path').setAttribute('d', paths[this.getAttribute('icon')] || ''); }
}
customElements.define('ha-icon', DemoIcon);

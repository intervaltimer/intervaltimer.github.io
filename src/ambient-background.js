class AmbientBackground extends HTMLElement {
  constructor() {
    super();
    this._mode = null;
    this._phaseKey = null;

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <link rel="stylesheet" href="./ambient-background.css">
      <div class="ambient-bg-layer"></div>
    `;
    this._layer = shadow.querySelector('.ambient-bg-layer');
  }

  connectedCallback() {
    this.setIdle();
  }

  setIdle() {
    this._mode = 'idle';
    this._phaseKey = null;
    if (!this._layer) return;
    const currentColor = getComputedStyle(this._layer).backgroundColor;
    this._layer.style.setProperty('--ambient-start-color', currentColor);
    this._layer.className = 'ambient-bg-layer ambient-bg-layer--idle';
    this._layer.style.setProperty('--ambient-duration', '5s');
    this._layer.style.animationIterationCount = 'infinite';
    this._layer.style.animationDirection = 'alternate';
    this._layer.style.animationFillMode = 'both';
  }

  setRest(seconds) {
    this._setPhaseMode('rest', seconds);
  }

  setExercise(seconds) {
    this._setPhaseMode('exercise', seconds);
  }

  _setPhaseMode(mode, seconds) {
    this._mode = mode;
    if (!this._layer) return;
    const rawSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 5;
    const safeSeconds = Math.min(rawSeconds, 5);
    const currentColor = getComputedStyle(this._layer).backgroundColor;
    this._layer.style.setProperty('--ambient-start-color', currentColor);
    this._layer.className = `ambient-bg-layer ambient-bg-layer--${mode}`;
    this._layer.style.setProperty('--ambient-duration', `${safeSeconds}s`);
    this._layer.style.animationIterationCount = '1';
    this._layer.style.animationDirection = 'normal';
    this._layer.style.animationFillMode = 'forwards';
  }
}

customElements.define('ambient-background', AmbientBackground);

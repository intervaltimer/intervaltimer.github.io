import './router.js';
import './ambient-background.js';
import './pages/dashboard-page.js';
import './pages/landing-page.js';
import './pages/timer-page.js';
import './pages/customize-page.js';

import { attachRouter } from './router.js';

class AppRoot extends HTMLElement {
  constructor() {
    super();
    this._pageEl = null;
  }

  connectedCallback() {
    this.render();
    attachRouter(this);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // ignore registration errors
      });
    }
  }

  render() {
    this.classList.add('app-shell');
    this.innerHTML = `
      <ambient-background></ambient-background>
      <div class="app-shell__inner">
        <header>
          <h1 class="app-title">Interval Timer</h1>
        </header>
        <main id="app-main"></main>
      </div>
    `;
    this._pageEl = this.querySelector('#app-main');
  }

  setPage(element) {
    if (!this._pageEl) return;
    this._pageEl.innerHTML = '';
    element.classList.add('page-transition');
    this._pageEl.appendChild(element);
  }
}

customElements.define('app-root', AppRoot);

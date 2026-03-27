import './router.js';
import './ambient-background.js';
import './pages/dashboard-page.js';
import './pages/landing-page.js';
import './pages/timer-page.js';
import './pages/customize-page.js';
import './pages/settings-page.js';

import { attachRouter, navigateTo, ROUTES } from './router.js';

class AppRoot extends HTMLElement {
  constructor() {
    super();
    this._pageEl = null;
    this._headerActionEl = null;
    this._headerActionHandler = null;
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
        <header class="app-shell__header">
          <div class="app-shell__header-row">
            <h1 class="app-title">Interval Timer</h1>
            <button class="icon-button app-shell__header-action" type="button" aria-label="Open settings" hidden>
              <span class="icon-feather" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </span>
            </button>
          </div>
        </header>
        <main id="app-main"></main>
      </div>
    `;
    this._pageEl = this.querySelector('#app-main');
    this._headerActionEl = this.querySelector('.app-shell__header-action');
    this._headerActionEl?.addEventListener('click', () => {
      if (typeof this._headerActionHandler === 'function') {
        this._headerActionHandler();
      }
    });
  }

  setPage(element) {
    if (!this._pageEl) return;
    this._pageEl.innerHTML = '';
    element.classList.add('page-transition');
    this._pageEl.appendChild(element);
  }

  setHeader(options = {}) {
    if (!this._headerActionEl) return;

    const { showSettingsButton = false } = options;
    this._headerActionHandler = null;

    if (showSettingsButton) {
      this._headerActionHandler = () => {
        navigateTo(ROUTES.SETTINGS);
      };
      this._headerActionEl.hidden = false;
      return;
    }

    this._headerActionEl.hidden = true;
  }
}

customElements.define('app-root', AppRoot);

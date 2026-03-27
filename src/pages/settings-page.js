import { navigateTo, ROUTES } from '../router.js';
import { VERSION } from '../version.js';

class SettingsPage extends HTMLElement {
  connectedCallback() {
    this.classList.add('app-column', 'settings-page');
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="app-row app-header-row">
        <button class="back-link" id="btn-back-dashboard" aria-label="Back to dashboard">
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </span>
          <span>Dashboard</span>
        </button>
      </div>
      <h2 class="app-page-title">Settings</h2>
      <div class="settings-page__body"></div>
      <div class="settings-page__footer">
        <div class="settings-page__version">v${VERSION}</div>
      </div>
    `;

    const backButton = this.querySelector('#btn-back-dashboard');
    backButton?.addEventListener('click', () => {
      navigateTo(ROUTES.DASHBOARD);
    });
  }
}

customElements.define('settings-page', SettingsPage);
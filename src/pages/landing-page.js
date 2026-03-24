import { navigateTo, ROUTES } from '../router.js';

class LandingPage extends HTMLElement {
  connectedCallback() {
    this.classList.add('landing-page');
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="landing-content">
        <p class="landing-tagline">Create interval workouts that autosave on your device</p>
        <button class="app-button" id="btn-start">Start</button>
        <div class="landing-footer">
          <span>made with</span>
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.8 4.6c-1.5-1.4-3.9-1.4-5.4 0L12 8l-3.4-3.4c-1.5-1.4-3.9-1.4-5.4 0-1.6 1.5-1.6 4 0 5.5L12 21l8.8-10.9c1.6-1.5 1.6-4 0-5.5z"></path>
            </svg>
          </span>
          <span>by the AI next door</span>
        </div>
      </div>
    `;

    const btnStart = this.querySelector('#btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        navigateTo(ROUTES.DASHBOARD);
      });
    }
  }
}

customElements.define('landing-page', LandingPage);

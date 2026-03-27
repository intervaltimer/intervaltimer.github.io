import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize', SETTINGS: 'settings' },
  navigateTo: vi.fn(),
}));

vi.mock('../src/version.js', () => ({
  VERSION: '9.9.9',
}));

const { navigateTo, ROUTES } = await import('../src/router.js');

await import('../src/pages/settings-page.js');

function createElement() {
  const el = document.createElement('settings-page');
  document.body.appendChild(el);
  return el;
}

describe('settings page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should navigate back to the dashboard', () => {
    const el = createElement();

    el.querySelector('#btn-back-dashboard').click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  });

  it('should display the generated app version', () => {
    const el = createElement();

    expect(el.querySelector('.settings-page__version').textContent).toBe('v9.9.9');
  });
});
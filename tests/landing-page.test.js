import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize' },
  navigateTo: vi.fn(),
}));

const { navigateTo, ROUTES } = await import('../src/router.js');

await import('../src/pages/landing-page.js');

function createElement() {
  const el = document.createElement('landing-page');
  document.body.appendChild(el);
  return el;
}

describe('landing page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should navigate to the dashboard when clicking Start', () => {
    const el = createElement();
    const btn = el.querySelector('#btn-start');
    btn.click();
    expect(navigateTo).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  });
});

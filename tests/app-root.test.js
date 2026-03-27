import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize', SETTINGS: 'settings' },
  attachRouter: vi.fn(),
  navigateTo: vi.fn(),
}));

const routerModule = await import('../src/router.js');

await import('../src/main.js');

function createElement() {
  const el = document.createElement('app-root');
  document.body.appendChild(el);
  return el;
}

describe('app root header', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should render the settings cog in the shell header when enabled', () => {
    const el = createElement();

    el.setHeader({ showSettingsButton: true });
    el.querySelector('.app-shell__header-action').click();

    expect(routerModule.navigateTo).toHaveBeenCalledWith(routerModule.ROUTES.SETTINGS);
  });

  it('should hide the settings cog when disabled', () => {
    const el = createElement();

    el.setHeader({ showSettingsButton: false });

    expect(el.querySelector('.app-shell__header-action').hidden).toBe(true);
  });
});
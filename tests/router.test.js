import { describe, it, expect, beforeEach, vi } from 'vitest';

import { attachRouter } from '../src/router.js';

function createAppRoot() {
  const appRoot = document.createElement('div');
  appRoot.setPage = vi.fn();
  appRoot.setHeader = vi.fn();
  return appRoot;
}

describe('router header visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.hash = '';
  });

  it('should hide the shell header on settings', () => {
    const appRoot = createAppRoot();

    window.location.hash = '#/settings';
    attachRouter(appRoot);

    expect(appRoot.classList.contains('app-shell--no-header')).toBe(true);
    expect(appRoot.setHeader).toHaveBeenCalledWith({ showSettingsButton: false });
  });

  it('should show the shell header and settings cog on dashboard', () => {
    const appRoot = createAppRoot();

    window.location.hash = '#/dashboard';
    attachRouter(appRoot);

    expect(appRoot.classList.contains('app-shell--no-header')).toBe(false);
    expect(appRoot.setHeader).toHaveBeenCalledWith({ showSettingsButton: true });
  });
});
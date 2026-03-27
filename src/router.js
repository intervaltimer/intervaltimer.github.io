import { getOrCreateDefaultWorkout } from './storage/workouts.js';

const ROUTES = {
  HOME: 'home',
  DASHBOARD: 'dashboard',
  TIMER: 'timer',
  CUSTOMIZE: 'customize',
  SETTINGS: 'settings',
};

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '');
  const [pathPart, idPart] = raw.split('/').filter(Boolean);
  const page = pathPart || ROUTES.HOME;
  const workoutId = idPart || null;
  return { page, workoutId };
}

export function navigateTo(page, workoutId = null) {
  const hash = workoutId ? `#/${page}/${workoutId}` : `#/${page}`;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}

export function attachRouter(appRoot) {
  function renderFromLocation() {
    const { page, workoutId } = parseHash();

    const showHeader = page === ROUTES.HOME || page === ROUTES.DASHBOARD;
    const lockShell = page === ROUTES.TIMER;

    if (!showHeader) {
      appRoot.classList.add('app-shell--no-header');
    } else {
      appRoot.classList.remove('app-shell--no-header');
    }

    if (typeof appRoot.setHeader === 'function') {
      appRoot.setHeader({
        showSettingsButton: page === ROUTES.DASHBOARD,
      });
    }

    if (lockShell) {
      appRoot.classList.add('app-shell--fixed');
    } else {
      appRoot.classList.remove('app-shell--fixed');
    }

    if (page !== ROUTES.TIMER) {
      const bg = document.querySelector('ambient-background');
      if (bg && typeof bg.setIdle === 'function') {
        bg.setIdle();
      }
    }

    if (page === ROUTES.HOME) {
      const el = document.createElement('landing-page');
      appRoot.setPage(el);
      return;
    }

    if (page === ROUTES.DASHBOARD) {
      const el = document.createElement('dashboard-page');
      appRoot.setPage(el);
      return;
    }

    if (page === ROUTES.TIMER) {
      const params = new URLSearchParams(window.location.search || '');
      const hasShared = !!params.get('w');
      let id = workoutId;
      if (!id && !hasShared) {
        const workout = getOrCreateDefaultWorkout();
        id = workout.id;
        navigateTo(ROUTES.TIMER, id);
      }
      const el = document.createElement('timer-page');
      if (id) {
        el.setAttribute('workout-id', id);
      }
      appRoot.setPage(el);
      return;
    }

    if (page === ROUTES.CUSTOMIZE) {
      let id = workoutId;
      if (!id) {
        const workout = getOrCreateDefaultWorkout();
        id = workout.id;
        navigateTo(ROUTES.CUSTOMIZE, id);
      }
      const el = document.createElement('customize-page');
      el.setAttribute('workout-id', id);
      appRoot.setPage(el);
      return;
    }

    if (page === ROUTES.SETTINGS) {
      const el = document.createElement('settings-page');
      appRoot.setPage(el);
      return;
    }

    // Fallback to dashboard
    navigateTo(ROUTES.DASHBOARD);
  }

  window.addEventListener('hashchange', renderFromLocation);
  renderFromLocation();
}

export { ROUTES };

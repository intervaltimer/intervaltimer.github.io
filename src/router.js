import { getOrCreateDefaultWorkout } from './storage/workouts.js';

const ROUTES = {
  HOME: 'home',
  DASHBOARD: 'dashboard',
  TIMER: 'timer',
  CUSTOMIZE: 'customize',
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

    const hideHeader = page === ROUTES.TIMER || page === ROUTES.CUSTOMIZE;
    const lockShell = page === ROUTES.TIMER;

    if (hideHeader) {
      appRoot.classList.add('app-shell--no-header');
    } else {
      appRoot.classList.remove('app-shell--no-header');
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
      let id = workoutId;
      if (!id) {
        const workout = getOrCreateDefaultWorkout();
        id = workout.id;
        navigateTo(ROUTES.TIMER, id);
      }
      const el = document.createElement('timer-page');
      el.setAttribute('workout-id', id);
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

    // Fallback to dashboard
    navigateTo(ROUTES.DASHBOARD);
  }

  window.addEventListener('hashchange', renderFromLocation);
  renderFromLocation();
}

export { ROUTES };

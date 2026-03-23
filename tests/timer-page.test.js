import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/storage/workouts.js', () => {
  return {
    getWorkout: vi.fn(),
    getOrCreateDefaultWorkout: vi.fn(),
  };
});

vi.mock('../src/audio/speech.js', () => ({
  speak: vi.fn(),
  beepLow: vi.fn(),
  beepHigh: vi.fn(),
}));

// Use real TimerEngine to keep phase logic consistent.
import { TimerEngine } from '../src/timer/engine.js';
vi.mock('../src/timer/engine.js', async () => {
  const actual = await vi.importActual('../src/timer/engine.js');
  return {
    ...actual,
  };
});

vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize' },
  navigateTo: vi.fn(),
}));

import { getWorkout, getOrCreateDefaultWorkout } from '../src/storage/workouts.js';
import { navigateTo, ROUTES } from '../src/router.js';

await import('../src/pages/timer-page.js');

function createTimerPage(attrs = {}) {
  const el = document.createElement('timer-page');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

describe('timer page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should open the timer on a default workout when no workouts are configured', () => {
    getWorkout.mockReturnValue(null);
    const defaultWorkout = {
      id: 'default-id',
      title: 'Default',
      phases: [],
    };
    getOrCreateDefaultWorkout.mockReturnValue(defaultWorkout);

    const el = createTimerPage();
    expect(el.getAttribute('workout-id')).toBe('default-id');
  });

  it('should display the workout title as the header', () => {
    const workout = {
      id: 'w1',
      title: 'Morning Routine',
      phases: [],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const header = el.querySelector('#timer-workout-title');
    expect(header.textContent).toContain('Morning Routine');
  });

  it('should start the prepare phase on clicking the play button', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'exercise', title: 'Work', seconds: 10 },
        { kind: 'rest', seconds: 20 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPlay = el.querySelector('#btn-play');
    btnPlay.click();

    // After starting, we expect the phase label to show Prepare
    const phaseLabel = el.querySelector('#timer-phase-label').textContent;
    expect(phaseLabel).toContain('Prepare');
  });

  it('should navigate back to the dashboard on back button click', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnBack = el.querySelector('#btn-back-dashboard');
    btnBack.click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  });

  it('should change icon to pause icon when clicking the play button', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPlay = el.querySelector('#btn-play');

    const iconPlay = btnPlay.querySelector('#icon-play');
    const iconPause = btnPlay.querySelector('#icon-pause');

    // Initially, play icon visible, pause hidden
    expect(iconPlay.style.display).not.toBe('none');
    expect(iconPause.style.display).toBe('none');

    btnPlay.click();

    // After clicking, pause icon visible, play hidden
    expect(iconPlay.style.display).toBe('none');
    expect(iconPause.style.display).not.toBe('none');
  });

  it('should pause a workout on clicking pause', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPlay = el.querySelector('#btn-play');

    btnPlay.click();
    expect(btnPlay.getAttribute('aria-label')).toBe('Pause');

    const iconPlay = btnPlay.querySelector('#icon-play');
    const iconPause = btnPlay.querySelector('#icon-pause');

    // Currently running: pause icon should be visible
    expect(iconPlay.style.display).toBe('none');
    expect(iconPause.style.display).not.toBe('none');

    btnPlay.click();
    expect(btnPlay.getAttribute('aria-label')).toBe('Play');

    // After pausing: play icon visible again
    expect(iconPlay.style.display).not.toBe('none');
    expect(iconPause.style.display).toBe('none');
  });

  it('should disable the left arrow button if the current phase is 0', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPrev = el.querySelector('#btn-prev');
    expect(btnPrev.disabled).toBe(true);
  });

  it('should disable the right arrow button if the current phase is the last phase', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnNext = el.querySelector('#btn-next');

    // Single exercise + prepare => last phase is exercise after moving once
    // Move to last phase
    btnNext.click();
    expect(btnNext.disabled).toBe(true);
  });

  it('should go back to the previous phase on left arrow click', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'exercise', title: 'Work A', seconds: 10 },
        { kind: 'rest', seconds: 5 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnNext = el.querySelector('#btn-next');
    const btnPrev = el.querySelector('#btn-prev');
    const label = () => el.querySelector('#timer-phase-label').textContent;

    // Move from prepare to first exercise
    btnNext.click();
    expect(label()).toContain('Work A');

    // Back to prepare
    btnPrev.click();
    expect(label()).toContain('Prepare');
  });

  it('should skip to the next phase on right arrow click', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'exercise', title: 'Work A', seconds: 10 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnNext = el.querySelector('#btn-next');
    const label = () => el.querySelector('#timer-phase-label').textContent;

    // From prepare to work
    btnNext.click();
    expect(label()).toContain('Work A');
  });

  it('should navigate to the customize page on customize click with the current workout as state', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnCustomize = el.querySelector('#btn-customize');
    btnCustomize.click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.CUSTOMIZE, 'w1');
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/storage/workouts.js', async (importActual) => {
  const actual = await importActual();
  return {
    ...actual,
    getWorkout: vi.fn(),
    getOrCreateDefaultWorkout: vi.fn(),
    upsertWorkout: vi.fn(),
  };
});

vi.mock('../src/audio/speech.js', () => ({
  speak: vi.fn(),
  beepLow: vi.fn(),
  beepHigh: vi.fn(),
  warmUpSpeech: vi.fn().mockResolvedValue(true),
  ensureAudioReady: vi.fn().mockResolvedValue(true),
  isSpeechSupported: vi.fn().mockReturnValue(true),
  isAudioSupported: vi.fn().mockReturnValue(true),
}));

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
import { upsertWorkout } from '../src/storage/workouts.js';
import { navigateTo, ROUTES } from '../src/router.js';

await import('../src/pages/timer-page.js');

function createTimerPage(attrs = {}) {
  const el = document.createElement('timer-page');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

function flushAsync() {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

  it('should start the prepare phase on clicking the play button', async () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }] },
        { kind: 'rest', seconds: 20 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPlay = el.querySelector('#btn-play');
    expect(btnPlay.getAttribute('aria-label')).toBe('Play');
    btnPlay.click();

    expect(btnPlay.getAttribute('aria-label')).toBe('Loading');

    await flushAsync();

    expect(btnPlay.getAttribute('aria-label')).toBe('Pause');
    expect(btnPlay.disabled).toBe(false);
    // After starting, we expect the phase label to show Prepare
    const phaseLabel = el.querySelector('#timer-phase-label').textContent;
    expect(phaseLabel).toContain('Prepare');
  });

  it('should navigate back to the dashboard on back button click', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }] }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnBack = el.querySelector('#btn-back-dashboard');
    btnBack.click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.DASHBOARD);
  });

  it('should pause a workout on clicking pause', async () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }] }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnPlay = el.querySelector('#btn-play');

    btnPlay.click();

    await flushAsync();

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
      phases: [{ kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }] }],
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
      phases: [{ kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 10 }] }],
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
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work A', seconds: 10 }, { kind: 'rest', seconds: 5 }] },
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
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work A', seconds: 10 }] },
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

  it("should show Rep and Set cards for the current set progress", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        {
          kind: 'set',
          series: 2,
          phases: [
            { kind: 'exercise', title: 'Work A', seconds: 10 },
            { kind: 'rest', seconds: 5 },
            { kind: 'exercise', title: 'Work B', seconds: 10 },
          ],
        },
        {
          kind: 'set',
          series: 3,
          phases: [
            { kind: 'exercise', title: 'Work A2', seconds: 10 },
            { kind: 'rest', seconds: 5 },
            { kind: 'exercise', title: 'Work B2', seconds: 10 },
          ],
        },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnNext = el.querySelector('#btn-next');
    const rep = () => el.querySelector('#timer-rep-progress').textContent;
    const set = () => el.querySelector('#timer-set-progress').textContent;

    expect(el.querySelectorAll('.timer-progress-card').length).toBe(2);
    expect(el.querySelector('.timer-progress-card__label').textContent).toBe('Rep');
    expect(el.querySelectorAll('.timer-progress-card__label')[1].textContent).toBe('Set');
    expect(rep()).toBe('0/4');
    expect(set()).toBe('1/2');

    btnNext.click();
    expect(rep()).toBe('0/4');
    expect(set()).toBe('1/2');

    btnNext.click();
    expect(rep()).toBe('1/4');
    expect(set()).toBe('1/2');
  });

  it("should show Rep and Set cards for the workout's remaining sets", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        {
          kind: 'set',
          series: 1,
          phases: [{ kind: 'exercise', title: 'Work A', seconds: 10 }],
        },
        {
          kind: 'set',
          series: 1,
          phases: [{ kind: 'exercise', title: 'Work B', seconds: 10 }],
        },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    const btnNext = el.querySelector('#btn-next');
    const rep = () => el.querySelector('#timer-rep-progress').textContent;
    const set = () => el.querySelector('#timer-set-progress').textContent;

    expect(rep()).toBe('0/1');
    expect(set()).toBe('1/2');

    btnNext.click();
    expect(rep()).toBe('0/1');
    expect(set()).toBe('1/2');

    btnNext.click();
    expect(rep()).toBe('0/1');
    expect(set()).toBe('2/2');
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

  it('should say Well done after the workout is complete', async () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work', seconds: 1 }] },
        { kind: 'rest', seconds: 20 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createTimerPage({ 'workout-id': 'w1' });
    el.querySelector('#btn-play').click();
    await flushAsync();

    for (let i = 0; i < 10; i += 1) {
      el.engine.tick();
    }
    el.engine.tick();

    expect(el.querySelector('#timer-phase-label').textContent).toBe('Well done!');
    expect(upsertWorkout).toHaveBeenCalledWith(expect.objectContaining({ id: 'w1', completed: 1 }));
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/storage/workouts.js', () => ({
  getWorkout: vi.fn(),
  upsertWorkout: vi.fn(),
  summarizeWorkout: vi.fn(() => ({ names: [], totalSeconds: 0 })),
}));

vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize' },
  navigateTo: vi.fn(),
}));

import { getWorkout, upsertWorkout } from '../src/storage/workouts.js';
import { navigateTo, ROUTES } from '../src/router.js';

await import('../src/pages/customize-page.js');

function createCustomizePage(attrs = {}) {
  const el = document.createElement('customize-page');
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}

describe('customize page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it("should move a standalone rest before a set when clicking the 'move up' button", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1 },
        { kind: 'rest', seconds: 10, ungrouped: true },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const standaloneCard = el.querySelectorAll('.card')[1];
    standaloneCard.querySelector('.phase-menu-button').click();
    standaloneCard.querySelector('.phase-menu-item--move-up').click();

    expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
    expect(el.workout.phases[1]).toEqual({ kind: 'set', series: 1 });
  });

  it("should move a standalone rest after a set when clicking the 'move down' button", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'rest', seconds: 10, ungrouped: true },
        { kind: 'set', series: 1 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const standaloneCard = el.querySelectorAll('.card')[0];
    standaloneCard.querySelector('.phase-menu-button').click();
    standaloneCard.querySelector('.phase-menu-item--move-down').click();

    expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
    expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
  });

  it('should go back to the timer with the current workout as state', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    el.querySelector('#btn-back').click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.TIMER, 'w1');
  });

  it('should go back to the timer from the top back button with the current workout as state', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    el.querySelector('#btn-back-top').click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.TIMER, 'w1');
  });

  describe('standalone rests', () => {
    it('should display the standalone rests', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'rest', seconds: 10, ungrouped: true },
          { kind: 'rest', seconds: 5, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      expect(el.querySelectorAll('.card').length).toBe(2);
    });

    it('should save upon input change to the local storage', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [{ kind: 'rest', seconds: 10, ungrouped: true }],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const titleInput = el.querySelector('#workout-title');
      titleInput.value = 'Updated';
      titleInput.dispatchEvent(new Event('input'));

      expect(upsertWorkout).toHaveBeenCalled();
    });

    it('should create a rest', () => {
      const workout = { id: 'w1', title: 'T', phases: [] };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      el.querySelector('#btn-add-rest').click();

      expect(el.querySelectorAll('.card').length).toBe(1);
    });

    it('should duplicate a rest and send it at the end of the list', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [{ kind: 'rest', seconds: 5, ungrouped: true }],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      el.querySelector('.card .phase-menu-button').click();
      el.querySelector('.card .phase-menu-item--duplicate').click();

      expect(el.querySelectorAll('.card').length).toBe(2);
    });

    it('should delete a rest', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [{ kind: 'rest', seconds: 5, ungrouped: true }],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      el.querySelector('.card .phase-menu-button').click();
      el.querySelector('.card .phase-menu-item--delete').click();

      expect(el.querySelectorAll('.card').length).toBe(0);
    });

    it('should move a rest up and down', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'rest', seconds: 10, ungrouped: true },
          { kind: 'rest', seconds: 5, ungrouped: true },
          { kind: 'rest', seconds: 20, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const middleCard = el.querySelectorAll('.card')[1];
      middleCard.querySelector('.phase-menu-button').click();
      middleCard.querySelector('.phase-menu-item--move-up').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 5, ungrouped: true });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 20, ungrouped: true });

      const firstCard = el.querySelectorAll('.card')[0];
      firstCard.querySelector('.phase-menu-button').click();
      firstCard.querySelector('.phase-menu-item--move-down').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 5, ungrouped: true });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 20, ungrouped: true });
    });

    it('should not move the first rest up', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'rest', seconds: 10, ungrouped: true },
          { kind: 'rest', seconds: 5, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const firstCard = el.querySelectorAll('.card')[0];
      firstCard.querySelector('.phase-menu-button').click();
      firstCard.querySelector('.phase-menu-item--move-up').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 5, ungrouped: true });
    });

    it('should not move the last rest down', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'rest', seconds: 10, ungrouped: true },
          { kind: 'rest', seconds: 5, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const lastCard = el.querySelectorAll('.card')[1];
      lastCard.querySelector('.phase-menu-button').click();
      lastCard.querySelector('.phase-menu-item--move-down').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 5, ungrouped: true });
    });

    it('should move a rest before a set when it is after ', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
          { kind: 'rest', seconds: 10, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const topCards = el.querySelectorAll('.card:not(.card--inner-group)');
      const standaloneCard = topCards[1];
      standaloneCard.querySelector('.phase-menu-button').click();
      standaloneCard.querySelector('.phase-menu-item--move-up').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.workout.phases[1]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[2]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.querySelectorAll('.phase-row--set').length).toBe(1);
      expect(el.querySelectorAll('.card--inner-group').length).toBe(1);
    });

    it('should move a rest after a set when it is before', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          { kind: 'rest', seconds: 10, ungrouped: true },
          { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const topCards = el.querySelectorAll('.card:not(.card--inner-group)');
      const standaloneCard = topCards[0];
      standaloneCard.querySelector('.phase-menu-button').click();
      standaloneCard.querySelector('.phase-menu-item--move-down').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 10, ungrouped: true });
      expect(el.querySelectorAll('.phase-row--set').length).toBe(1);
      expect(el.querySelectorAll('.card--inner-group').length).toBe(1);
    });
  });

  describe('set entries', () => {
    it('should add an exercise to a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [{ kind: 'exercise', title: 'A', seconds: 10 }],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const setCard = el.querySelector('.phase-row--set');
      setCard.querySelector('.phase-menu-button').click();
      setCard.querySelector('.phase-menu-item--add-exercise').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.workout.phases[2]).toEqual({ kind: 'exercise', title: 'Work', seconds: 20 });
    });

    it("should duplicate an exercise within a set and send it at the end of the set's children", () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
          { kind: 'rest', seconds: 20, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[0].querySelector('.phase-menu-button').click();
      innerCards[0].querySelector('.phase-menu-item--duplicate').click();

      expect(el.workout.phases).toEqual([
        { kind: 'set', series: 1 },
        { kind: 'exercise', title: 'A', seconds: 10 },
        { kind: 'rest', seconds: 5 },
        { kind: 'exercise', title: 'A', seconds: 10 },
        { kind: 'rest', seconds: 20, ungrouped: true },
      ]);
    })

    it('should add a rest to a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [{ kind: 'exercise', title: 'A', seconds: 10 }],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const setCard = el.querySelector('.phase-row--set');
      setCard.querySelector('.phase-menu-button').click();
      setCard.querySelector('.phase-menu-item--add-rest').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 20 });
    });

    it('should delete an entry from a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'exercise', title: 'B', seconds: 20 },
            ],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[0].querySelector('.phase-menu-button').click();
      innerCards[0].querySelector('.phase-menu-item--delete').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'B', seconds: 20 });
      expect(el.workout.phases.length).toBe(2);
    });

    it('should move an entry up within a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[1].querySelector('.phase-menu-button').click();
      innerCards[1].querySelector('.phase-menu-item--move-up').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 5 });
      expect(el.workout.phases[2]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
    });

    it('should move an entry down within a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[0].querySelector('.phase-menu-button').click();
      innerCards[0].querySelector('.phase-menu-item--move-down').click();

      expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
      expect(el.workout.phases[1]).toEqual({ kind: 'rest', seconds: 5 });
      expect(el.workout.phases[2]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
    });

    it('should not move the first entry up within a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[0].querySelector('.phase-menu-button').click();
      innerCards[0].querySelector('.phase-menu-item--move-up').click();

      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 5 });
    });

    it('should not move the last entry down within a set', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 1,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const innerCards = el.querySelectorAll('.card--inner-group');
      innerCards[1].querySelector('.phase-menu-button').click();
      innerCards[1].querySelector('.phase-menu-item--move-down').click();

      expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
      expect(el.workout.phases[2]).toEqual({ kind: 'rest', seconds: 5 });
    });

    it('should duplicate a set along with its children', () => {
      const workout = {
        id: 'w1',
        title: 'T',
        phases: [
          {
            kind: 'set',
            series: 2,
            phases: [
              { kind: 'exercise', title: 'A', seconds: 10 },
              { kind: 'rest', seconds: 5 },
            ],
          },
          { kind: 'rest', seconds: 20, ungrouped: true },
        ],
      };
      getWorkout.mockReturnValue(workout);

      const el = createCustomizePage({ 'workout-id': 'w1' });
      const setMenuButton = el.querySelector('.phase-row--set .phase-menu-button');
      setMenuButton.click();
      const duplicateBtn = el.querySelector('.phase-row--set .phase-menu-item--duplicate');
      duplicateBtn.click();

      expect(el.querySelectorAll('.phase-row--set').length).toBe(2);
      expect(el.querySelectorAll('.card--inner-group').length).toBe(4);
    });
  });

  it("should move a set up", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        { kind: 'set', series: 2, phases: [{ kind: 'exercise', title: 'B', seconds: 20 }] },
        { kind: 'rest', seconds: 30, ungrouped: true },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const secondSetButton = el.querySelectorAll('.phase-row--set')[1].querySelector('.phase-menu-button');
    secondSetButton.click();
    el.querySelectorAll('.phase-row--set')[1].querySelector('.phase-menu-item--move-up').click();

    // Expect the whole set (marker + children) to be moved up
    expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 2 });
    expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'B', seconds: 20 });
    expect(el.workout.phases[2]).toEqual({ kind: 'set', series: 1 });
    expect(el.workout.phases[3]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
    expect(el.workout.phases[4]).toEqual({ kind: 'rest', seconds: 30, ungrouped: true });
  });

  it("should move a set down", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        { kind: 'set', series: 2, phases: [{ kind: 'exercise', title: 'B', seconds: 20 }] },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const firstSet = el.querySelectorAll('.phase-row--set')[0];
    firstSet.querySelector('.phase-menu-button').click();
    firstSet.querySelector('.phase-menu-item--move-down').click();

    // Expect the whole set (marker + children) to be moved down
    expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 2 });
    expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'B', seconds: 20 });
    expect(el.workout.phases[2]).toEqual({ kind: 'set', series: 1 });
    expect(el.workout.phases[3]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
  });

  it("should not move the first set up", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        { kind: 'set', series: 2, phases: [{ kind: 'exercise', title: 'B', seconds: 20 }] },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const firstSet = el.querySelectorAll('.phase-row--set')[0];
    firstSet.querySelector('.phase-menu-button').click();
    firstSet.querySelector('.phase-menu-item--move-up').click();

    // The first set should remain the same when trying to move it up
    expect(el.workout.phases[0]).toEqual({ kind: 'set', series: 1 });
    expect(el.workout.phases[1]).toEqual({ kind: 'exercise', title: 'A', seconds: 10 });
  });

  it("should not move the last set down", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        { kind: 'set', series: 2, phases: [{ kind: 'exercise', title: 'B', seconds: 20 }] },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const lastSet = el.querySelectorAll('.phase-row--set')[1];
    lastSet.querySelector('.phase-menu-button').click();
    lastSet.querySelector('.phase-menu-item--move-down').click();

    // The last set is already last; moving it down should be a no-op
    expect(el.workout.phases[2]).toEqual({ kind: 'set', series: 2 });
    expect(el.workout.phases[3]).toEqual({ kind: 'exercise', title: 'B', seconds: 20 });
  });

  it("should delete a set along with its children", () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'A', seconds: 10 }] },
        { kind: 'set', series: 2, phases: [{ kind: 'exercise', title: 'B', seconds: 20 }] },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const secondSet = el.querySelectorAll('.phase-row--set')[1];
    secondSet.querySelector('.phase-menu-button').click();
    secondSet.querySelector('.phase-menu-item--delete').click();

    // Expect deleting a set to remove the set and its children
    expect(el.querySelectorAll('.phase-row--set').length).toBe(1);
    expect(el.querySelectorAll('.card--inner-group').length).toBe(1);
    expect(el.workout.phases).toEqual([
      { kind: 'set', series: 1 },
      { kind: 'exercise', title: 'A', seconds: 10 },
    ]);
  });

  it('should render a saved set with exercise, rest, exercise and rest as one set on the customize page', () => {
    const workout = {
      id: 'w_saved',
      title: 'Saved workout',
      completed: 0,
      phases: [
        {
          kind: 'set',
          series: 1,
          phases: [
            { kind: 'exercise', title: 'Exercise 1', seconds: 10 },
            { kind: 'rest', seconds: 5 },
            { kind: 'exercise', title: 'Exercise 2', seconds: 20 },
            { kind: 'rest', seconds: 8 },
          ],
        },
      ],
    };

    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w_saved' });

    expect(el.querySelectorAll('.phase-row--set')).toHaveLength(1);
    expect(el.querySelectorAll('.card--inner-group')).toHaveLength(4);
  });
});

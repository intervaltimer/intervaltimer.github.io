import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/storage/workouts.js', () => ({
  getWorkout: vi.fn(),
  upsertWorkout: vi.fn(),
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

  it('should display the list of phases', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [
        { kind: 'exercise', title: 'A', seconds: 10 },
        { kind: 'rest', seconds: 5 },
      ],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('should save upon input change to the local storage', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'A', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const titleInput = el.querySelector('#workout-title');
    titleInput.value = 'Updated';
    titleInput.dispatchEvent(new Event('input'));

    expect(upsertWorkout).toHaveBeenCalled();
  });

  it('should add an exercise', () => {
    const workout = { id: 'w1', title: 'T', phases: [] };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const btnAdd = el.querySelector('#btn-add-exercise');
    btnAdd.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  it('should duplicate an exercise and send it at the end of the list', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'A', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const menuButton = el.querySelector('.card .phase-menu-button');
    menuButton.click();
    const duplicateBtn = el.querySelector('.card .phase-menu-item--duplicate');
    duplicateBtn.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('should delete an exercise', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'exercise', title: 'A', seconds: 10 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const menuButton = el.querySelector('.card .phase-menu-button');
    menuButton.click();
    const deleteBtn = el.querySelector('.card .phase-menu-item--delete');
    deleteBtn.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(0);
  });

  it('should create a rest', () => {
    const workout = { id: 'w1', title: 'T', phases: [] };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const btnAdd = el.querySelector('#btn-add-rest');
    btnAdd.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(1);
  });

  it('should duplicate a rest and send it at the end of the list', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'rest', seconds: 5 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const menuButton = el.querySelector('.card .phase-menu-button');
    menuButton.click();
    const copyBtn = el.querySelector('.card .phase-menu-item--duplicate');
    copyBtn.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('should delete a rest', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [{ kind: 'rest', seconds: 5 }],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const menuButton = el.querySelector('.card .phase-menu-button');
    menuButton.click();
    const deleteBtn = el.querySelector('.card .phase-menu-item--delete');
    deleteBtn.click();

    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(0);
  });

  it('should go back to the timer with the current workout as state', () => {
    const workout = {
      id: 'w1',
      title: 'T',
      phases: [],
    };
    getWorkout.mockReturnValue(workout);

    const el = createCustomizePage({ 'workout-id': 'w1' });
    const btnBack = el.querySelector('#btn-back');
    btnBack.click();

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
    const btnBackTop = el.querySelector('#btn-back-top');
    btnBackTop.click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.TIMER, 'w1');
  });
});

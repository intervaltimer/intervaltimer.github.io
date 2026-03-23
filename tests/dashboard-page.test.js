import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock router before importing the component
vi.mock('../src/router.js', () => ({
  ROUTES: { DASHBOARD: 'dashboard', TIMER: 'timer', CUSTOMIZE: 'customize' },
  navigateTo: vi.fn(),
}));

// Mock storage helpers
const workoutsModule = await import('../src/storage/workouts.js');
const { navigateTo, ROUTES } = await import('../src/router.js');

await import('../src/pages/dashboard-page.js');

function createElement() {
  const el = document.createElement('dashboard-page');
  document.body.appendChild(el);
  return el;
}

describe('dashboard page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should list the workouts available (fetched from local storage)', () => {
    vi.spyOn(workoutsModule, 'loadWorkouts').mockReturnValue([
      { id: '1', title: 'A', phases: [] },
      { id: '2', title: 'B', phases: [] },
    ]);
    vi.spyOn(workoutsModule, 'summarizeWorkout').mockReturnValue({ names: [], totalSeconds: 0 });

    const el = createElement();
    const cards = el.querySelectorAll('.card');
    expect(cards.length).toBe(2);
  });

  it('should delete a workout', () => {
    const loadSpy = vi.spyOn(workoutsModule, 'loadWorkouts');
    loadSpy.mockReturnValueOnce([
      { id: '1', title: 'A', phases: [] },
    ]);
    loadSpy.mockReturnValueOnce([]); // after delete
    vi.spyOn(workoutsModule, 'summarizeWorkout').mockReturnValue({ names: [], totalSeconds: 0 });
    const deleteSpy = vi.spyOn(workoutsModule, 'deleteWorkout').mockImplementation(() => {});

    const el = createElement();
    const deleteBtn = el.querySelector('button.app-button:nth-of-type(2)');
    deleteBtn.click();

    expect(deleteSpy).toHaveBeenCalledWith('1');
  });

  it('should open a workout', () => {
    vi.spyOn(workoutsModule, 'loadWorkouts').mockReturnValue([
      { id: '1', title: 'A', phases: [] },
    ]);
    vi.spyOn(workoutsModule, 'summarizeWorkout').mockReturnValue({ names: [], totalSeconds: 0 });

    const el = createElement();
    const openBtn = el.querySelector('button.app-button');
    openBtn.click();

    expect(navigateTo).toHaveBeenCalledWith(ROUTES.TIMER, '1');
  });

  it('should create a workout', () => {
    vi.spyOn(workoutsModule, 'loadWorkouts').mockReturnValue([
      { id: '1', title: 'Existing', phases: [] },
    ]);
    vi.spyOn(workoutsModule, 'summarizeWorkout').mockReturnValue({ names: [], totalSeconds: 0 });
    const upsertSpy = vi.spyOn(workoutsModule, 'upsertWorkout').mockImplementation(() => {});

    const el = createElement();
    const buttons = el.querySelectorAll('button.app-button');
    const createBtn = buttons[buttons.length - 1];

    createBtn.click();

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    const createdWorkout = upsertSpy.mock.calls[0][0];
    expect(createdWorkout).toMatchObject({ title: 'New Workout', phases: [] });
    expect(navigateTo).toHaveBeenCalledWith(ROUTES.CUSTOMIZE, createdWorkout.id);
  });

  it('should redirect to the timer if no workout exists', () => {
    vi.spyOn(workoutsModule, 'loadWorkouts').mockReturnValue([]);
    createElement();
    expect(navigateTo).toHaveBeenCalledWith(ROUTES.TIMER);
  });
});

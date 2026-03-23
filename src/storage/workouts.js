const STORAGE_KEY = 'interval.workouts.v1';

function generateId() {
  return 'w_' + Math.random().toString(36).slice(2, 10);
}

export function loadWorkouts() {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveWorkouts(workouts) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function upsertWorkout(workout) {
  const workouts = loadWorkouts();
  const idx = workouts.findIndex((w) => w.id === workout.id);
  if (idx === -1) {
    workouts.push(workout);
  } else {
    workouts[idx] = workout;
  }
  saveWorkouts(workouts);
}

export function deleteWorkout(id) {
  const workouts = loadWorkouts().filter((w) => w.id !== id);
  saveWorkouts(workouts);
}

export function getWorkout(id) {
  return loadWorkouts().find((w) => w.id === id) || null;
}

export function getOrCreateDefaultWorkout() {
  let workouts = loadWorkouts();
  if (workouts.length > 0) return workouts[0];

  const defaultWorkout = {
    id: generateId(),
    title: 'Default Workout',
    phases: [
      { kind: 'exercise', title: 'Work', seconds: 10 },
      { kind: 'rest', seconds: 20 },
      { kind: 'exercise', title: 'Work', seconds: 10 },
      { kind: 'rest', seconds: 20 },
    ],
  };
  workouts = [defaultWorkout];
  saveWorkouts(workouts);
  return defaultWorkout;
}

export function summarizeWorkout(workout) {
  const counts = new Map();
  workout.phases
    .filter((p) => p.kind === 'exercise')
    .forEach((p) => {
      const title = p.title || 'Exercise';
      counts.set(title, (counts.get(title) || 0) + 1);
    });

  const names = Array.from(counts.entries()).map(([title, count]) => `${title} ${count}x`);
  const totalSeconds = workout.phases.reduce((sum, p) => sum + (p.seconds || 0), 0);
  return {
    names,
    totalSeconds,
  };
}

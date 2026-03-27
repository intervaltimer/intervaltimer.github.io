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
    completed: 0,
    phases: [
      {
        kind: 'set',
        series: 2,
        phases: [
          { kind: 'exercise', title: 'Work', seconds: 10 },
          { kind: 'rest', seconds: 20 },
        ],
      },
    ],
  };
  workouts = [defaultWorkout];
  saveWorkouts(workouts);
  return defaultWorkout;
}
export function expandWorkoutPhases(workout) {
  const phases = Array.isArray(workout && workout.phases) ? workout.phases : [];

  const isSetPhase = (phase) => phase && (phase.kind === 'set' || phase.kind === 'group');

  // Expand sets into repeated child phases based on the `series` value.
  const expandedPhases = [];
  for (let i = 0; i < phases.length; i += 1) {
    const phase = phases[i];
    if (!phase) continue;

    if (isSetPhase(phase)) {
      const rawSeries =
        typeof phase.series === 'number' ? phase.series : parseInt(phase.series, 10);
      const series = Number.isFinite(rawSeries) && rawSeries > 0 ? rawSeries : 1;

      // Only support the nested format where children live inside the set object.
      const children = Array.isArray(phase.phases) ? phase.phases : [];

      for (let s = 0; s < series; s += 1) {
        for (const child of children) {
          expandedPhases.push({ ...child });
        }
      }

      continue;
    }

    expandedPhases.push({ ...phase });
  }

  while (expandedPhases.length > 0 && expandedPhases[expandedPhases.length - 1].kind === 'rest') {
    expandedPhases.pop();
  }

  return expandedPhases;
}

export function summarizeWorkout(workout) {
  const expandedPhases = expandWorkoutPhases(workout);

  const counts = new Map();
  expandedPhases
    .filter((p) => p.kind === 'exercise')
    .forEach((p) => {
      const title = p.title || 'Exercise';
      counts.set(title, (counts.get(title) || 0) + 1);
    });

  const names = Array.from(counts.entries()).map(([title, count]) => `${title} ${count}x`);
  const totalSeconds = expandedPhases.reduce((sum, p) => sum + (p.seconds || 0), 0);
  return {
    names,
    totalSeconds,
  };
}

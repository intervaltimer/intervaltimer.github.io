import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadWorkouts,
  saveWorkouts,
  getOrCreateDefaultWorkout,
  getWorkout,
  deleteWorkout,
  upsertWorkout,
  summarizeWorkout,
} from '../src/storage/workouts.js';

function setupFakeStorage() {
  const store = new Map();
  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe('workouts storage', () => {
  beforeEach(() => {
    setupFakeStorage();
  });

  it('returns empty list when nothing stored', () => {
    expect(loadWorkouts()).toEqual([]);
  });

  it('creates a default workout when none exist', () => {
    const w = getOrCreateDefaultWorkout();
    expect(w.phases).toHaveLength(4);
    expect(loadWorkouts()).toHaveLength(1);
  });

  it('can upsert and retrieve a workout', () => {
    const w = { id: 'id1', title: 'Test', phases: [] };
    upsertWorkout(w);
    expect(getWorkout('id1')).toEqual(w);
  });

  it('can delete a workout', () => {
    const w1 = { id: 'a', title: 'A', phases: [] };
    const w2 = { id: 'b', title: 'B', phases: [] };
    saveWorkouts([w1, w2]);
    deleteWorkout('a');
    expect(loadWorkouts()).toEqual([w2]);
  });

  it('summarizes workout names and total time', () => {
    const workout = {
      id: 'id',
      title: 'T',
      phases: [
        { kind: 'exercise', title: 'One', seconds: 10 },
        { kind: 'rest', seconds: 5 },
        { kind: 'exercise', title: 'Two', seconds: 8 },
      ],
    };
    const summary = summarizeWorkout(workout);
    expect(summary.names).toEqual(['One 1x', 'Two 1x']);
    expect(summary.totalSeconds).toBe(23);
  });
});

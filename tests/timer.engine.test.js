import { describe, it, expect, vi } from 'vitest';
import { TimerEngine } from '../src/timer/engine.js';

const workout = {
  id: 'w1',
  title: 'Test',
  phases: [
    { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 10 }] },
    { kind: 'rest', seconds: 20 },
  ],
};

describe('TimerEngine', () => {
  it('opens default timeline with prepare phase first', () => {
    const engine = TimerEngine.fromWorkout(workout);
    const phase = engine.getCurrentPhase();
    expect(phase.kind).toBe('prepare');
    expect(engine.remainingSeconds).toBe(10);
  });

  it('starts the first exercise phase after the prepare phase', () => {
    const engine = TimerEngine.fromWorkout(workout);
    // 10 ticks to finish prepare
    for (let i = 0; i < 10; i++) engine.tick();
    const phase = engine.getCurrentPhase();
    expect(phase.kind).toBe('exercise');
    expect(phase.title).toBe('Work 1');
  });

  it('starts a rest phase after an exercise phase', () => {
    const engine = TimerEngine.fromWorkout({
      id: 'w1b',
      title: 'TestB',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 10 }, { kind: 'rest', seconds: 5 }, { kind: 'exercise', title: 'Work 2', seconds: 8 }] },
      ],
    });
    // finish prepare
    for (let i = 0; i < 10; i++) engine.tick();
    // finish first exercise (10s)
    for (let i = 0; i < 10; i++) engine.tick();
    const phase = engine.getCurrentPhase();
    expect(phase.kind).toBe('rest');
  });

  it('skips a trailing rest at the end of the workout', () => {
    const engine = TimerEngine.fromWorkout({
      id: 'w3',
      title: 'Test3',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 10 }] },
        { kind: 'rest', seconds: 20 },
      ],
    });

    for (let i = 0; i < 10; i++) engine.tick();
    expect(engine.getCurrentPhase().kind).toBe('exercise');

    for (let i = 0; i < 10; i++) engine.tick();
    expect(engine.getCurrentPhase()).toBeNull();
    expect(engine.isComplete()).toBe(true);
  });

  it('speaks upcoming exercise at beginning of prepare and rest phases', () => {
    const w = {
      id: 'w2',
      title: 'Test2',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 10 }, { kind: 'rest', seconds: 10 }, { kind: 'exercise', title: 'Work 2', seconds: 8 }] },
      ],
    };
    const onSpeak = vi.fn();
    const engine = TimerEngine.fromWorkout(w, { onSpeak });

    // On page load / engine creation, nothing spoken yet
    expect(onSpeak).not.toHaveBeenCalled();

    // When starting the timer (first tick), prepare announcement should play
    engine.tick();
    expect(onSpeak).toHaveBeenCalledWith('Coming up, Work 1 in 10 seconds');

    // Finish prepare (10s), first exercise (10s), and step into the rest phase.
    for (let i = 0; i < 21; i++) engine.tick();

    // On entering rest, announce next exercise
    expect(onSpeak).toHaveBeenCalledWith('Coming up, Work 2 in 10 seconds');
  });

  it('speaks the exercise title 5 seconds before an exercise start', () => {
    const onSpeak = vi.fn();
    const engine = TimerEngine.fromWorkout(workout, { onSpeak });
    // Prepare is 10s: when remainingSeconds===5 before decrement, cue should fire.
    // We call tick 5 times; before the 6th tick, remaining is 5.
    for (let i = 0; i < 5; i++) engine.tick();
    engine.tick();
    expect(onSpeak).toHaveBeenCalledWith('Get ready');
  });

  it('plays low pitched beeping sounds 3,2,1 seconds before the exercise start', () => {
    const onBeepLow = vi.fn();
    const engine = TimerEngine.fromWorkout(workout, { onBeepLow });
    // Run until remainingSeconds will hit 3,2,1
    // Starting from 10, we need to call tick until remaining becomes 3.
    for (let i = 0; i < 7; i++) engine.tick();
    // Now remaining is 3; next three ticks correspond to 3,2,1.
    engine.tick();
    engine.tick();
    engine.tick();
    expect(onBeepLow).toHaveBeenCalledTimes(3);
  });

  it('plays high pitched sound at 0 second before the exercise start and end', () => {
    const onBeepHigh = vi.fn();
    const engine = TimerEngine.fromWorkout(workout, { onBeepHigh });
    // Finish prepare (10s) to reach exercise start
    for (let i = 0; i < 10; i++) engine.tick();
    // One high beep at exercise start
    expect(onBeepHigh).toHaveBeenCalledTimes(1);

    // Finish exercise (10s) to reach exercise end and rest start
    for (let i = 0; i < 10; i++) engine.tick();
    // Expect another two high beeps: one for exercise end, one for next exercise start (if any)
    // In this case, after exercise is rest, so just exercise-end beep.
    expect(onBeepHigh.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('finishes with a completed state when the last phase ends', () => {
    const engine = TimerEngine.fromWorkout({
      id: 'w4',
      title: 'Test4',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 1 }] },
      ],
    });

    for (let i = 0; i < 10; i++) engine.tick();
    engine.tick();

    expect(engine.getCurrentPhase()).toBeNull();
    expect(engine.isComplete()).toBe(true);
  });

  it('speaks well done when the workout completes', () => {
    const onSpeak = vi.fn();
    const engine = TimerEngine.fromWorkout({
      id: 'w5',
      title: 'Test5',
      phases: [
        { kind: 'set', series: 1, phases: [{ kind: 'exercise', title: 'Work 1', seconds: 1 }] },
      ],
    }, { onSpeak });

    for (let i = 0; i < 11; i++) engine.tick();

    expect(onSpeak).toHaveBeenCalledWith('Well done!');
  });
});

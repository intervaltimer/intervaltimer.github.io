import { expandWorkoutPhases } from '../storage/workouts.js';

export class TimerEngine {
  constructor(phases, callbacks = {}) {
    this.phases = phases;
    this.callbacks = callbacks;
    this.currentPhaseIndex = 0;
    this.remainingSeconds = phases[0]?.seconds ?? 0;
    this._hasStarted = false;
  }

  static fromWorkout(workout, callbacks = {}) {
    const preparePhase = { kind: 'prepare', seconds: 10 };
    const phasesFromWorkout = expandWorkoutPhases(workout || { phases: [] });
    const phases = [preparePhase, ...phasesFromWorkout];
    return new TimerEngine(phases, callbacks);
  }

  getCurrentPhase() {
    return this.phases[this.currentPhaseIndex] ?? null;
  }

  isFirstPhase() {
    return this.currentPhaseIndex === 0;
  }

  isLastPhase() {
    return this.currentPhaseIndex === this.phases.length - 1;
  }

  start() {
    if (this._hasStarted) return;
    this._hasStarted = true;
    this.#onPhaseEnter();
    this.#emitPhaseChange();
  }

  goToPhase(index) {
    if (index < 0 || index >= this.phases.length) return;
    this.currentPhaseIndex = index;
    this.remainingSeconds = this.phases[index].seconds ?? 0;
    this.#onPhaseEnter();
    this.#emitPhaseChange();
  }

  previousPhase() {
    if (this.isFirstPhase()) return;
    this.goToPhase(this.currentPhaseIndex - 1);
  }

  nextPhase() {
    if (this.isLastPhase()) return;
    this.goToPhase(this.currentPhaseIndex + 1);
  }

  tick() {
    const phase = this.getCurrentPhase();
    if (!phase || this.remainingSeconds <= 0) {
      return;
    }

    if (!this._hasStarted) {
      this._hasStarted = true;
      this.#onPhaseEnter();
    }

    const nextPhase = this.phases[this.currentPhaseIndex + 1];

    this.remainingSeconds -= 1;

    // Pre-exercise cues based on time remaining AFTER decrement,
    // so they align with the displayed remaining time.
    if (nextPhase && nextPhase.kind === 'exercise') {
      if (this.remainingSeconds === 5 && this.callbacks.onSpeak) {
        const totalSeconds = phase.seconds ?? 0;
        // Say "Get ready" before the low beeps, except for ultra-short rests.
        if (!(phase.kind === 'rest' && totalSeconds < 5)) {
          this.callbacks.onSpeak('Get ready');
        }
      }
      if (this.remainingSeconds === 3 || this.remainingSeconds === 2 || this.remainingSeconds === 1) {
        if (this.callbacks.onBeepLow) this.callbacks.onBeepLow();
      }
    }

    if (this.remainingSeconds <= 0) {
      // End-of-phase handling
      if (phase.kind === 'exercise' && this.callbacks.onBeepHigh) {
        // High beep at exercise end
        this.callbacks.onBeepHigh();
      }

      if (!this.isLastPhase()) {
        this.currentPhaseIndex += 1;
        const newPhase = this.getCurrentPhase();
        this.remainingSeconds = newPhase.seconds ?? 0;

        // High beep at exercise start
        if (newPhase.kind === 'exercise' && this.callbacks.onBeepHigh) {
          this.callbacks.onBeepHigh();
        }

        this.#onPhaseEnter();
        this.#emitPhaseChange();
      }
    }

    this.#emitTick();
  }

  #emitPhaseChange() {
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange({
        phaseIndex: this.currentPhaseIndex,
        phase: this.getCurrentPhase(),
        remainingSeconds: this.remainingSeconds,
      });
    }
  }

  #emitTick() {
    if (this.callbacks.onTick) {
      this.callbacks.onTick({
        phaseIndex: this.currentPhaseIndex,
        phase: this.getCurrentPhase(),
        remainingSeconds: this.remainingSeconds,
      });
    }
  }

  #onPhaseEnter() {
    const phase = this.getCurrentPhase();
    if (!phase || !this.callbacks.onSpeak) return;

    // Do not speak for the initial prepare phase before the timer starts.
    if (!this._hasStarted && phase.kind === 'prepare') {
      return;
    }

    const nextPhase = this.phases[this.currentPhaseIndex + 1];
    if (!nextPhase || nextPhase.kind !== 'exercise') return;

    if (phase.kind === 'prepare' || phase.kind === 'rest') {
      const seconds = phase.seconds ?? 0;

      // Skip "Coming up" if this is a very short rest.
      if (phase.kind === 'rest' && seconds < 8) {
        return;
      }

      const title = nextPhase.title || 'Exercise';
      this.callbacks.onSpeak(`Coming up, ${title} in ${seconds} seconds`);
    }
  }
}

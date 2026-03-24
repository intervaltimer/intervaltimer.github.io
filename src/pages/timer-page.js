import { getWorkout, getOrCreateDefaultWorkout, upsertWorkout } from '../storage/workouts.js';
import { TimerEngine } from '../timer/engine.js';
import { navigateTo, ROUTES } from '../router.js';
import { speak, beepLow, beepHigh, warmUpSpeech } from '../audio/speech.js';

class TimerPage extends HTMLElement {
  constructor() {
    super();
    this.workout = null;
    this.engine = null;
    this.isRunning = false;
    this.isPreparing = false;
    this._intervalId = null;
    this._bgMode = null;
    this._bgPhaseKey = null;
  }

  connectedCallback() {
    this.classList.add('app-column');
    this.#initWorkout();
    this.#createEngine();
    this.#render();
    this.#updateUI();
  }

  disconnectedCallback() {
    this.#stopInterval();
  }

  #initWorkout() {
    // First, check for a shared workout encoded in the URL search params.
    const params = new URLSearchParams(window.location.search || '');
    const shared = params.get('w');
    if (shared) {
      try {
        const parsed = JSON.parse(shared);
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `shared_${Date.now()}`;
        const workout = {
          id,
          title: parsed && typeof parsed.title === 'string' ? parsed.title : 'Shared Workout',
          phases: Array.isArray(parsed && parsed.phases) ? parsed.phases : [],
        };
        upsertWorkout(workout);

        // Clean the URL so reloading doesn't keep re-importing the same workout.
        params.delete('w');
        const newSearch = params.toString();
        const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);

        this.workout = workout;
        this.setAttribute('workout-id', workout.id);
        return;
      } catch (e) {
        // If parsing fails, fall back to normal loading.
        // eslint-disable-next-line no-console
        console.error('Failed to load shared workout from URL', e);
      }
    }

    const id = this.getAttribute('workout-id');
    let workout = id ? getWorkout(id) : null;
    if (!workout) {
      workout = getOrCreateDefaultWorkout();
      this.setAttribute('workout-id', workout.id);
    }
    this.workout = workout;
  }

  #createEngine() {
    this.engine = TimerEngine.fromWorkout(this.workout, {
      onPhaseChange: () => this.#updateUI(),
      onTick: () => this.#updateUI(),
      onSpeak: (text) => {
        if (this.isRunning || this.isPreparing) {
          speak(text);
        }
      },
      onBeepLow: () => beepLow(),
      onBeepHigh: () => beepHigh(),
    });
  }

  #render() {
    this.innerHTML = `
      <div class="app-row app-header-row">
        <button class="back-link" id="btn-back-dashboard" aria-label="Back to dashboard">
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </span>
          <span>Dashboard</span>
        </button>
      </div>
      <h2 class="app-page-title app-page-title--center" id="timer-workout-title"></h2>
      <div class="timer-main-display">
        <div id="timer-phase-label" class="timer-phase-label"></div>
        <div id="timer-time" class="timer-time"></div>
        <div id="timer-coming-up-label" class="timer-coming-up-label"></div>
        <div id="timer-next-phase" class="timer-next-phase"></div>
          <div id="timer-remaining-label" class="timer-remaining-label"></div>
          <div id="timer-remaining-summary" class="timer-remaining-summary"></div>
      </div>
      <div class="app-row app-row--center" id="timer-controls-row">
        <button class="icon-button" id="btn-prev" aria-label="Previous phase">
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </span>
        </button>
        <button class="app-button" id="btn-play" aria-label="Play">
          <span class="icon-feather" aria-hidden="true">
            <svg id="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <svg id="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <span id="icon-spinner" class="play-spinner" style="display: none;"></span>
          </span>
        </button>
        <button class="icon-button" id="btn-next" aria-label="Next phase">
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </button>
      </div>
      <div class="app-row app-row--center app-footer-row">
        <button class="app-button" id="btn-customize">Customize</button>
      </div>
    `;

    this._titleEl = this.querySelector('#timer-workout-title');
    this._timeEl = this.querySelector('#timer-time');
    this._phaseLabelEl = this.querySelector('#timer-phase-label');
    this._comingUpLabelEl = this.querySelector('#timer-coming-up-label');
    this._nextPhaseEl = this.querySelector('#timer-next-phase');
    this._remainingSummaryEl = this.querySelector('#timer-remaining-summary');
      this._remainingLabelEl = this.querySelector('#timer-remaining-label');
    this._btnBackDashboard = this.querySelector('#btn-back-dashboard');
    this._btnPrev = this.querySelector('#btn-prev');
        if (this._btnBackDashboard) {
          this._btnBackDashboard.addEventListener('click', () => {
            navigateTo(ROUTES.DASHBOARD);
          });
        }

    this._btnPlay = this.querySelector('#btn-play');
    this._iconPlay = this.querySelector('#icon-play');
    this._iconPause = this.querySelector('#icon-pause');
    this._iconSpinner = this.querySelector('#icon-spinner');
    this._btnNext = this.querySelector('#btn-next');
    this._btnCustomize = this.querySelector('#btn-customize');

    this._btnPrev.addEventListener('click', () => {
      this.engine.previousPhase();
      this.#updateUI();
    });

    this._btnNext.addEventListener('click', () => {
      this.engine.nextPhase();
      this.#updateUI();
    });

    this._btnPlay.addEventListener('click', async () => {
      if (this.isRunning) {
        this.#pause();
      } else {
        await this.#play();
      }
    });

    this._btnCustomize.addEventListener('click', () => {
      if (this.workout) {
        navigateTo(ROUTES.CUSTOMIZE, this.workout.id);
      }
    });
  }

  async #play() {
    if (this.isRunning || this.isPreparing) return;

    const isFirstStart = this.engine && !this.engine._hasStarted;

    if (isFirstStart) {
      this.isPreparing = true;
      this.#updateUI();
      try {
        await warmUpSpeech();
      } finally {
        this.isPreparing = false;
      }
      if (!this.engine) return;
      this.isRunning = true;
      this.engine.start();
    } else {
      this.isRunning = true;
    }
    if (!this._intervalId) {
      this._intervalId = window.setInterval(() => {
        this.engine.tick();
      }, 1000);
    }
    this.#updateUI();
  }

  #pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.#stopInterval();
    this.#updateUI();
  }

  #stopInterval() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  #formatSeconds(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  #updateUI() {
    if (!this.engine) return;
    const phase = this.engine.getCurrentPhase();
    const remaining = this.engine.remainingSeconds;
    const nextPhase = this.engine.phases[this.engine.currentPhaseIndex + 1] || null;

    if (this._titleEl && this.workout) {
      this._titleEl.textContent = this.workout.title || 'Workout';
    }

    if (this._timeEl) {
      this._timeEl.textContent = this.#formatSeconds(remaining);
    }

    if (this._phaseLabelEl) {
      if (!phase) {
        this._phaseLabelEl.textContent = '';
      } else if (phase.kind === 'prepare') {
        this._phaseLabelEl.textContent = 'Prepare';
      } else if (phase.kind === 'exercise') {
        this._phaseLabelEl.textContent = phase.title || 'Exercise';
      } else if (phase.kind === 'rest') {
        this._phaseLabelEl.textContent = 'Rest';
      }
    }

    if (this._comingUpLabelEl && this._nextPhaseEl) {
      if (!nextPhase) {
        this._comingUpLabelEl.textContent = '';
        this._nextPhaseEl.textContent = '';
      } else {
        this._comingUpLabelEl.textContent = 'Coming up…';
        let label = '';
        if (nextPhase.kind === 'rest') {
          label = `Rest ${nextPhase.seconds ?? 0}s`;
        } else if (nextPhase.kind === 'exercise') {
          const title = nextPhase.title || 'Exercise';
          label = `${title} for ${nextPhase.seconds ?? 0}s`;
        } else if (nextPhase.kind === 'prepare') {
          label = `Prepare ${nextPhase.seconds ?? 0}s`;
        }
        this._nextPhaseEl.textContent = label;
      }
    }

    if (this._remainingSummaryEl) {
      if (this._remainingLabelEl && this._remainingSummaryEl) {
        const summaryText = this.#getRemainingSummary();
        if (summaryText) {
          this._remainingLabelEl.textContent = 'Remaining…';
          this._remainingSummaryEl.textContent = summaryText;
        } else {
          this._remainingLabelEl.textContent = '';
          this._remainingSummaryEl.textContent = '';
        }
      }
    }

    if (this._btnPrev) {
      this._btnPrev.disabled = this.engine.isFirstPhase();
    }

    if (this._btnNext) {
      this._btnNext.disabled = this.engine.isLastPhase();
    }

    if (this._btnPlay) {
      const label = this.isPreparing ? 'Loading' : this.isRunning ? 'Pause' : 'Play';
      this._btnPlay.setAttribute('aria-label', label);
      this._btnPlay.disabled = this.isPreparing;
    }

    if (this._iconPlay && this._iconPause && this._iconSpinner) {
      if (this.isPreparing) {
        this._iconPlay.style.display = 'none';
        this._iconPause.style.display = 'none';
        this._iconSpinner.style.display = '';
      } else if (this.isRunning) {
        this._iconPlay.style.display = 'none';
        this._iconPause.style.display = '';
        this._iconSpinner.style.display = 'none';
      } else {
        this._iconPlay.style.display = '';
        this._iconPause.style.display = 'none';
        this._iconSpinner.style.display = 'none';
      }
    }

    this.#updateBackground();
  }

  #updateBackground() {
    const bg = document.querySelector('ambient-background');
    if (!bg || !this.engine) return;

    const phase = this.engine.getCurrentPhase();
    let mode = 'idle';
    let duration = null;

    if (this.isRunning && phase) {
      if (phase.kind === 'exercise') {
        mode = 'exercise';
        duration = phase.seconds ?? null;
      } else if (phase.kind === 'rest') {
        mode = 'rest';
        duration = phase.seconds ?? null;
      } else {
        mode = 'idle';
      }
    } else {
      mode = 'idle';
    }

    const phaseKey = phase ? `${phase.kind}:${this.engine.currentPhaseIndex}` : 'none';

    if (this._bgMode === mode && this._bgPhaseKey === phaseKey) {
      return;
    }

    this._bgMode = mode;
    this._bgPhaseKey = phaseKey;

    if (mode === 'idle') {
      bg.setIdle();
    } else if (mode === 'exercise') {
      bg.setExercise(duration);
    } else if (mode === 'rest') {
      bg.setRest(duration);
    }
  }

  #getRemainingSummary() {
    if (!this.engine) return '';

    const phases = this.engine.phases || [];
    const currentIndex = this.engine.currentPhaseIndex ?? 0;

    if (!phases.length || currentIndex >= phases.length) {
      return '';
    }

    let remainingSeconds = this.engine.remainingSeconds ?? 0;
    let exercises = 0;
    let rests = 0;

    const currentPhase = this.engine.getCurrentPhase();
    if (currentPhase) {
      if (currentPhase.kind === 'exercise') exercises += 1;
      if (currentPhase.kind === 'rest') rests += 1;
    }

    for (let i = currentIndex + 1; i < phases.length; i += 1) {
      const p = phases[i];
      if (!p) continue;
      remainingSeconds += p.seconds ?? 0;
      if (p.kind === 'exercise') exercises += 1;
      if (p.kind === 'rest') rests += 1;
    }

    if (remainingSeconds <= 0) return '';

    const parts = [];
    if (exercises > 0) {
      parts.push(`${exercises} exercise${exercises === 1 ? '' : 's'}`);
    }
    if (rests > 0) {
      parts.push(`${rests} rest${rests === 1 ? '' : 's'}`);
    }

    const timeText = this.#formatSeconds(remainingSeconds);
    const phasesText = parts.length ? parts.join(' • ') + ' • ' : '';
    return `${phasesText}${timeText}`;
  }
}

customElements.define('timer-page', TimerPage);

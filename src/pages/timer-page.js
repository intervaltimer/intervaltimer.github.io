import { getWorkout, getOrCreateDefaultWorkout, upsertWorkout } from '../storage/workouts.js';
import { TimerEngine } from '../timer/engine.js';
import { navigateTo, ROUTES } from '../router.js';
import {
  speak,
  beepLow,
  beepHigh,
  warmUpSpeech,
  ensureAudioReady,
  isSpeechSupported,
  isAudioSupported,
} from '../audio/speech.js';

class TimerPage extends HTMLElement {
  constructor() {
    super();
    this.workout = null;
    this.engine = null;
    this.isRunning = false;
    this.isPreparing = false;
    this._speechError = false;
    this._audioError = false;
    this._completionPersisted = false;
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
          completed: 0,
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
      <h2 class="app-page-title" id="timer-workout-title"></h2>
      <div class="timer-main-display">
        <div id="timer-phase-label" class="timer-phase-label"></div>
        <div id="timer-time" class="timer-time"></div>
        <div id="timer-coming-up-label" class="timer-coming-up-label"></div>
        <div id="timer-next-phase" class="timer-next-phase"></div>
          <div id="timer-progress-row" class="timer-progress-row">
            <div class="timer-progress-card">
              <div class="timer-progress-card__label">Rep</div>
              <div id="timer-rep-progress" class="timer-progress-card__value"></div>
            </div>
            <div class="timer-progress-card">
              <div class="timer-progress-card__label">Set</div>
              <div id="timer-set-progress" class="timer-progress-card__value"></div>
            </div>
          </div>
      </div>
      <div class="timer-warnings">
        <div id="timer-speech-warning" class="timer-warning-text"></div>
        <div id="timer-beep-warning" class="timer-warning-text"></div>
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
    this._progressRowEl = this.querySelector('#timer-progress-row');
    this._repProgressEl = this.querySelector('#timer-rep-progress');
    this._setProgressEl = this.querySelector('#timer-set-progress');
    this._speechWarningEl = this.querySelector('#timer-speech-warning');
    this._beepWarningEl = this.querySelector('#timer-beep-warning');
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
        const audioOk = await ensureAudioReady();
        const speechOk = await warmUpSpeech();
        this._audioError = !audioOk && isAudioSupported();
        this._speechError = !speechOk && isSpeechSupported();
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
    const isComplete = this.engine.isComplete();

    if (isComplete && !this._completionPersisted && this.workout) {
      const completed = typeof this.workout.completed === 'number' ? this.workout.completed : 0;
      this.workout = {
        ...this.workout,
        completed: completed + 1,
      };
      upsertWorkout(this.workout);
      this._completionPersisted = true;
    }

    if (!isComplete) {
      this._completionPersisted = false;
    }

    if (this._titleEl && this.workout) {
      this._titleEl.textContent = this.workout.title || 'Workout';
    }

    if (this._timeEl) {
      this._timeEl.textContent = this.#formatSeconds(remaining);
    }

    if (this._phaseLabelEl) {
      if (!phase) {
        this._phaseLabelEl.textContent = this.engine.isComplete() ? 'Well done!' : '';
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

    if (this._progressRowEl) {
      const progress = this.#getProgressState();
      if (progress.hasProgress) {
        if (this._repProgressEl) {
          this._repProgressEl.textContent = progress.repText;
        }
        if (this._setProgressEl) {
          this._setProgressEl.textContent = progress.setText;
        }
      } else {
        if (this._repProgressEl) {
          this._repProgressEl.textContent = '';
        }
        if (this._setProgressEl) {
          this._setProgressEl.textContent = '';
        }
      }
    }

    if (this._btnPrev) {
      this._btnPrev.disabled = this.engine.isFirstPhase() || this.engine.isComplete();
    }

    if (this._btnNext) {
      this._btnNext.disabled = this.engine.isLastPhase() || this.engine.isComplete();
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

    if (this._speechWarningEl) {
      const unsupported = !isSpeechSupported();
      if (unsupported || this._speechError) {
        this._speechWarningEl.textContent = 'Voice cues are not supported on this device.';
      } else {
        this._speechWarningEl.textContent = '';
      }
    }

    if (this._beepWarningEl) {
      const unsupported = !isAudioSupported();
      if (unsupported || this._audioError) {
        this._beepWarningEl.textContent = 'Beeping sounds are not supported on this device.';
      } else {
        this._beepWarningEl.textContent = '';
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

  #getProgressState() {
    if (!this.engine || !this.workout) {
      return { hasProgress: false, repText: '', setText: '' };
    }

    const contexts = this.#getPhaseContexts();
    if (!contexts.length) {
      return { hasProgress: false, repText: '', setText: '' };
    }

    const currentPhase = this.engine.getCurrentPhase();
    if (!currentPhase) {
      return { hasProgress: false, repText: '', setText: '' };
    }

    const currentIndex = this.engine.currentPhaseIndex ?? 0;
    const setContexts = contexts.filter((entry) => entry.kind === 'set' && entry.totalExercises > 0);
    const currentContext = currentPhase.kind === 'prepare'
      ? setContexts[0] || null
      : contexts.find((entry) => currentIndex >= entry.startIndex && currentIndex < entry.endIndex) || null;

    const currentSetIndex = currentPhase.kind === 'prepare'
      ? 0
      : setContexts.findIndex((entry) => currentIndex >= entry.startIndex && currentIndex < entry.endIndex);
    const totalSets = setContexts.length;

    if (!currentContext || currentContext.totalExercises <= 0 || currentSetIndex < 0 || totalSets <= 0) {
      return {
        hasProgress: false,
        repText: '',
        setText: '',
      };
    }

    return {
      hasProgress: true,
      repText: `${currentContext.completedExercisesBefore(currentIndex)}/${currentContext.totalExercises}`,
      setText: `${currentSetIndex + 1}/${totalSets}`,
    };
  }

  #getPhaseContexts() {
    const phases = Array.isArray(this.workout?.phases) ? this.workout.phases : [];
    const contexts = [];

    let expandedIndex = 1;

    for (let i = 0; i < phases.length; ) {
      const phase = phases[i];
      if (!phase) {
        i += 1;
        continue;
      }

      if (phase.kind === 'set' || phase.kind === 'group') {
        const rawSeries = typeof phase.series === 'number' ? phase.series : parseInt(phase.series, 10);
        const series = Number.isFinite(rawSeries) && rawSeries > 0 ? rawSeries : 1;
        const children = Array.isArray(phase.phases) ? phase.phases : [];

        const expandedPhases = [];
        for (let repeat = 0; repeat < series; repeat += 1) {
          expandedPhases.push(...children);
        }

        const totalExercises = expandedPhases.filter((child) => child.kind === 'exercise').length;
        const startIndex = expandedIndex;
        const endIndex = expandedIndex + expandedPhases.length;

        contexts.push({
          kind: 'set',
          startIndex,
          endIndex,
          totalExercises,
          completedExercisesBefore: (currentIndex) => {
            const offset = Math.max(0, currentIndex - startIndex);
            return expandedPhases.slice(0, offset).filter((child) => child.kind === 'exercise').length;
          },
        });

        expandedIndex = endIndex;
        i += 1;
        continue;
      }

      const standalone = [];
      let nextIndex = i;
      while (nextIndex < phases.length) {
        const nextPhase = phases[nextIndex];
        if (!nextPhase || nextPhase.kind === 'set' || nextPhase.kind === 'group') break;
        standalone.push(nextPhase);
        nextIndex += 1;
      }

      const totalExercises = standalone.filter((entry) => entry.kind === 'exercise').length;
      const startIndex = expandedIndex;
      const endIndex = expandedIndex + standalone.length;

      contexts.push({
        kind: 'standalone',
        startIndex,
        endIndex,
        totalExercises,
        completedExercisesBefore: (currentIndex) => {
          const offset = Math.max(0, currentIndex - startIndex);
          return standalone.slice(0, offset).filter((entry) => entry.kind === 'exercise').length;
        },
      });

      expandedIndex = endIndex;
      i = nextIndex;
    }

    return contexts;
  }
}

customElements.define('timer-page', TimerPage);

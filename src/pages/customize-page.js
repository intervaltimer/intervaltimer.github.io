import { getWorkout, upsertWorkout, summarizeWorkout } from '../storage/workouts.js';
import { navigateTo, ROUTES } from '../router.js';

class CustomizePage extends HTMLElement {
  constructor() {
    super();
    this.workout = null;
    this._onDocumentClick = this.#handleDocumentClick.bind(this);
  }

  connectedCallback() {
    this.classList.add('app-column');
    this.#initWorkout();
    this.#render();
    this.#renderPhases();
    document.addEventListener('click', this._onDocumentClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocumentClick);
  }

  #initWorkout() {
    const id = this.getAttribute('workout-id');
    const workout = (id && getWorkout(id)) || {
      id: id || 'new',
      title: 'New Workout',
      completed: 0,
      phases: [],
    };
    this.workout = this.#normalizeWorkout(JSON.parse(JSON.stringify(workout)));
  }

  #normalizeWorkout(workout) {
    const normalized = workout || { phases: [] };
    const rawPhases = Array.isArray(normalized.phases) ? normalized.phases : [];
    const nextPhases = [];

    for (const phase of rawPhases) {
      if (!phase) continue;

      // Sets (and legacy "group") are stored with nested child phases.
      if (phase.kind === 'set' || phase.kind === 'group') {
        const rawSeries =
          typeof phase.series === 'number' ? phase.series : parseInt(phase.series, 10);
        const series = Number.isFinite(rawSeries) && rawSeries > 0 ? rawSeries : 1;

        nextPhases.push({ kind: 'set', series });

        const children = Array.isArray(phase.phases) ? phase.phases : [];
        for (const child of children) {
          if (!child) continue;
          if (child.kind === 'exercise' || child.kind === 'rest') {
            const cloned = { ...child };
            delete cloned.ungrouped;
            nextPhases.push(cloned);
          }
        }
        continue;
      }

      // Top-level rests are standalone (outside any set).
      if (phase.kind === 'rest') {
        const rest = { ...phase, ungrouped: true };
        nextPhases.push(rest);
        continue;
      }

      // Bare top-level exercises are wrapped into their own set for editing.
      if (phase.kind === 'exercise') {
        nextPhases.push({ kind: 'set', series: 1 });
        const cloned = { ...phase };
        delete cloned.ungrouped;
        nextPhases.push(cloned);
        continue;
      }

      // Any other phase types are passed through as-is.
      nextPhases.push({ ...phase });
    }

    normalized.phases = nextPhases;
    return normalized;
  }

  #render() {
    this.innerHTML = `
      <div class="app-row app-header-row">
        <button class="back-link" id="btn-back-top" aria-label="Back to timer">
          <span class="icon-feather" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </span>
          <span>Timer</span>
        </button>
      </div>
      <h2 class="app-page-title app-page-title--center">Customize workout</h2>
      <div class="app-column">
        <input id="workout-title" class="app-input" placeholder="Workout title" />
        <div id="phases" class="phases-list"></div>
        <div id="workout-summary" class="card-subtitle"></div>
        <div id="workout-completed" class="card-subtitle workout-stats"></div>
        <div class="app-row app-row--center app-footer-row">
          <button class="app-button" id="btn-add-rest">+ rest</button>
          <button class="app-button" id="btn-add-set">+ set</button>
        </div>
        <div class="app-row app-row--center app-footer-row">
          <button class="app-button" id="btn-back">Back to timer</button>
        </div>
      </div>
    `;

    this._titleInput = this.querySelector('#workout-title');
    this._phasesContainer = this.querySelector('#phases');
    this._summaryEl = this.querySelector('#workout-summary');
    this._completedEl = this.querySelector('#workout-completed');
    this._btnBackTop = this.querySelector('#btn-back-top');
    this._btnAddRest = this.querySelector('#btn-add-rest');
    this._btnAddSet = this.querySelector('#btn-add-set');
    this._btnBack = this.querySelector('#btn-back');
    if (this._btnBackTop) {
      this._btnBackTop.addEventListener('click', () => {
        this.#save();
        navigateTo(ROUTES.TIMER, this.workout.id);
      });
    }


    this._titleInput.value = this.workout.title || '';
    this._titleInput.addEventListener('input', () => {
      this.workout.title = this._titleInput.value;
      this.#save();
      this.#renderSummary();
    });

    this._btnAddRest.addEventListener('click', () => {
      const phases = this.workout.phases || [];
      phases.push({ kind: 'rest', seconds: 20, ungrouped: true });
      this.#save();
      this.#renderPhases();
      this.#renderSummary();
    });

    this._btnAddSet.addEventListener('click', () => {
      this.workout.phases.push({ kind: 'set', series: 1 });
      this.#save();
      this.#renderPhases();
      this.#renderSummary();
    });

    this._btnBack.addEventListener('click', () => {
      this.#save();
      navigateTo(ROUTES.TIMER, this.workout.id);
    });
  }

  #renderPhases() {
    if (!this._phasesContainer) return;
    this._phasesContainer.innerHTML = '';

    const phases = this.workout.phases || [];

    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index];

      // Set: create one card and include all following non-set phases in it.
      if (phase.kind === 'set' || phase.kind === 'group') {
        const card = document.createElement('div');
        card.className = 'card';

        const groupRow = document.createElement('div');
        groupRow.className = 'phase-row phase-row--set phase-row--group';

        const seriesCol = document.createElement('div');
        seriesCol.className = 'phase-main phase-main--series';
        const seriesWrapper = document.createElement('div');
        seriesWrapper.className = 'series-field';
        const seriesInput = document.createElement('input');
        seriesInput.className = 'app-input series-input';
        seriesInput.type = 'number';
        seriesInput.min = '1';
        seriesInput.placeholder = 'Series';
        seriesInput.value = String(phase.series || '');
        seriesInput.addEventListener('input', () => {
          const value = Number(seriesInput.value) || 0;
          phase.series = value > 0 ? value : 1;
          this.#save();
          this.#renderSummary();
        });
        const seriesSuffix = document.createElement('span');
        seriesSuffix.className = 'series-suffix';
        seriesSuffix.textContent = 'series';
        seriesWrapper.appendChild(seriesInput);
        seriesWrapper.appendChild(seriesSuffix);
        seriesCol.appendChild(seriesWrapper);

        const groupActionsCol = this.#createActionsMenu(phase, index);
        groupRow.appendChild(seriesCol);
        groupRow.appendChild(groupActionsCol);
        card.appendChild(groupRow);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'set-children group-children';

        // Add all child phases (until next set) into the same card.
        let childIndex = index + 1;
        while (
          childIndex < phases.length &&
          phases[childIndex].kind !== 'set' &&
          phases[childIndex].kind !== 'group' &&
          !phases[childIndex].ungrouped
        ) {
          const childPhase = phases[childIndex];
          const childCard = document.createElement('div');
          childCard.className = 'card card--inner-group';
          const row = document.createElement('div');
          row.className = 'phase-row' + (childPhase.kind === 'rest' ? ' phase-row--rest' : '');

          if (childPhase.kind === 'exercise') {
            const titleCol = document.createElement('div');
            titleCol.className = 'phase-main';
            const titleInput = document.createElement('input');
            titleInput.className = 'app-input';
            titleInput.placeholder = 'Exercise title';
            titleInput.value = childPhase.title || '';
            titleInput.addEventListener('input', () => {
              childPhase.title = titleInput.value;
              this.#save();
              this.#renderSummary();
            });
            titleCol.appendChild(titleInput);

            const secondsCol = document.createElement('div');
            secondsCol.className = 'phase-secondary';
            const secondsField = this.#createSecondsField(childPhase);
            secondsCol.appendChild(secondsField);

            const actionsCol = this.#createActionsMenu(childPhase, childIndex);

            row.appendChild(titleCol);
            row.appendChild(secondsCol);
            row.appendChild(actionsCol);
          } else {
            // Rest inside group.
            const labelCol = document.createElement('div');
            labelCol.className = 'phase-main';
            const restInput = document.createElement('input');
            restInput.className = 'app-input';
            restInput.value = 'Rest';
            restInput.disabled = true;
            labelCol.appendChild(restInput);

            const secondsCol = document.createElement('div');
            secondsCol.className = 'phase-secondary';
            const secondsField = this.#createSecondsField(childPhase);
            secondsCol.appendChild(secondsField);

            const actionsCol = this.#createActionsMenu(childPhase, childIndex);

            row.appendChild(labelCol);
            row.appendChild(secondsCol);
            row.appendChild(actionsCol);
          }

          childCard.appendChild(row);
          childrenContainer.appendChild(childCard);
          childIndex += 1;
        }

        if (childrenContainer.children.length > 0) {
          card.appendChild(childrenContainer);
        }

        this._phasesContainer.appendChild(card);
        // Skip over children we already rendered.
        index = childIndex - 1;
        continue;
      }

      // Standalone rest outside of any set: its own card.
      const card = document.createElement('div');
      card.className = 'card';
      const row = document.createElement('div');
      row.className = 'phase-row' + (phase.kind === 'rest' ? ' phase-row--rest' : '');

      if (phase.kind === 'exercise') {
        const titleCol = document.createElement('div');
        titleCol.className = 'phase-main';
        const titleInput = document.createElement('input');
        titleInput.className = 'app-input';
        titleInput.placeholder = 'Exercise title';
        titleInput.value = phase.title || '';
        titleInput.addEventListener('input', () => {
          phase.title = titleInput.value;
          this.#save();
          this.#renderSummary();
        });
        titleCol.appendChild(titleInput);

        const secondsCol = document.createElement('div');
        secondsCol.className = 'phase-secondary';
        const secondsField = this.#createSecondsField(phase);
        secondsCol.appendChild(secondsField);

        const actionsCol = this.#createActionsMenu(phase, index);

        row.appendChild(titleCol);
        row.appendChild(secondsCol);
        row.appendChild(actionsCol);
      } else {
        // Rest outside of any set.
        const labelCol = document.createElement('div');
        labelCol.className = 'phase-main';
        const restInput = document.createElement('input');
        restInput.className = 'app-input';
        restInput.value = 'Rest';
        restInput.disabled = true;
        labelCol.appendChild(restInput);

        const secondsCol = document.createElement('div');
        secondsCol.className = 'phase-secondary';
        const secondsField = this.#createSecondsField(phase);
        secondsCol.appendChild(secondsField);

        const actionsCol = this.#createActionsMenu(phase, index);

        row.appendChild(labelCol);
        row.appendChild(secondsCol);
        row.appendChild(actionsCol);
      }

      card.appendChild(row);
      this._phasesContainer.appendChild(card);
    }

    this.#renderSummary();
  }

  #createSecondsField(phase) {
    const wrapper = document.createElement('div');
    wrapper.className = 'seconds-field';

    const input = document.createElement('input');
    input.className = 'app-input seconds-input';
    input.type = 'number';
    input.min = '1';
    input.value = String(phase.seconds || 0);
    input.addEventListener('input', () => {
      phase.seconds = Number(input.value) || 0;
      this.#save();
      this.#renderSummary();
    });

    const suffix = document.createElement('span');
    suffix.className = 'seconds-suffix';
    suffix.textContent = 's';

    wrapper.appendChild(input);
    wrapper.appendChild(suffix);
    return wrapper;
  }

  #closeAllMenus() {
    const openMenus = this.querySelectorAll('.phase-menu.phase-menu--open');
    openMenus.forEach((menu) => menu.classList.remove('phase-menu--open'));
  }

  #handleDocumentClick(event) {
    const target = event.target;
    if (!target) return;
    if (target.closest('.phase-menu') || target.closest('.phase-menu-button')) {
      return;
    }
    this.#closeAllMenus();
  }

  #createActionsMenu(phase, index) {
    const actionsCol = document.createElement('div');
    actionsCol.className = 'phase-actions';

    const menuButton = document.createElement('button');
    menuButton.className = 'phase-menu-button';
    menuButton.type = 'button';
    menuButton.innerHTML = `
      <span class="icon-feather" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </span>
    `;

    const menu = document.createElement('div');
    menu.className = 'phase-menu';

    const addItem = (label, iconSvg, handler, className) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'phase-menu-item' + (className ? ` ${className}` : '');
      item.innerHTML = `
        <span class="phase-menu-label">${label}</span>
        <span class="icon-feather" aria-hidden="true">${iconSvg}</span>
      `;
      item.addEventListener('click', () => {
        handler();
        menu.classList.remove('phase-menu--open');
      });
      menu.appendChild(item);
    };

    const copyIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    const plusIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    `;
    const trashIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
      </svg>
    `;
    const arrowUpIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    `;
    const arrowDownIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="5 12 12 19 19 12"></polyline>
      </svg>
    `;

    if (phase.kind === 'set' || phase.kind === 'group') {
      addItem('Add exercise', plusIcon, () => {
        const phases = this.workout.phases;
        let insertIndex = index + 1;
        while (insertIndex < phases.length && phases[insertIndex].kind !== 'set' && phases[insertIndex].kind !== 'group') {
          insertIndex += 1;
        }
        phases.splice(insertIndex, 0, { kind: 'exercise', title: 'Work', seconds: 20 });
        this.#save();
        this.#renderPhases();
      }, 'phase-menu-item--add-exercise');

      addItem('Add rest', plusIcon, () => {
        const phases = this.workout.phases;
        let insertIndex = index + 1;
        while (insertIndex < phases.length && phases[insertIndex].kind !== 'set' && phases[insertIndex].kind !== 'group') {
          insertIndex += 1;
        }
        phases.splice(insertIndex, 0, { kind: 'rest', seconds: 20 });
        this.#save();
        this.#renderPhases();
      }, 'phase-menu-item--add-rest');
    }

    addItem('Duplicate', copyIcon, () => {
      const phases = this.workout.phases || [];

      // When duplicating a set, also duplicate all of its children
      // (phases that belong to this set until the next set/ungrouped).
      if (phase.kind === 'set' || phase.kind === 'group') {
        const cloned = [];

        // Clone the set marker itself.
        cloned.push({ ...phase, kind: 'set' });

        // Collect and clone all child phases that belong to this set.
        let childIndex = index + 1;
        while (
          childIndex < phases.length &&
          phases[childIndex].kind !== 'set' &&
          phases[childIndex].kind !== 'group' &&
          !phases[childIndex].ungrouped
        ) {
          cloned.push({ ...phases[childIndex] });
          childIndex += 1;
        }

        phases.push(...cloned);
      } else {
        const { start, endExclusive } = this.#getSetBoundsForIndex(index);

        // If this phase lives inside a set, duplicate it at the end of that set's children.
        if (start >= 0) {
          phases.splice(endExclusive, 0, { ...phase });
        } else {
          // Standalone rests keep the old append behavior.
          phases.push({ ...phase });
        }
      }

      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--duplicate');

    addItem('Move up', arrowUpIcon, () => {
      if (index <= 0) return;
      const phases = this.workout.phases;

      const { start } = this.#getSetBoundsForIndex(index);
      const minIndex = start >= 0 ? start + 1 : 0;
      if (index <= minIndex) return;

      const [p] = phases.splice(index, 1);
      phases.splice(index - 1, 0, p);
      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--move-up');

    addItem('Move down', arrowDownIcon, () => {
      const phases = this.workout.phases;
      if (index >= phases.length - 1) return;

      const { endExclusive } = this.#getSetBoundsForIndex(index);
      const maxIndex = endExclusive - 1;
      if (index >= maxIndex) return;

      const [p] = phases.splice(index, 1);
      phases.splice(index + 1, 0, p);
      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--move-down');

    addItem('Delete', trashIcon, () => {
      this.workout.phases.splice(index, 1);
      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--delete');

    menuButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = menu.classList.contains('phase-menu--open');
      this.#closeAllMenus();
      if (!isOpen) {
        menu.classList.add('phase-menu--open');
      }
    });

    actionsCol.appendChild(menuButton);
    actionsCol.appendChild(menu);
    return actionsCol;
  }

  #save() {
    const workoutToStore = this.#buildStoredWorkout();
    upsertWorkout(workoutToStore);
  }

  #buildStoredWorkout() {
    const phases = this.workout?.phases || [];
    const storedPhases = [];

    for (let i = 0; i < phases.length; i += 1) {
      const phase = phases[i];
      if (!phase) continue;

      if (phase.kind === 'set' || phase.kind === 'group') {
        const setPhase = {
          kind: 'set',
          series: phase.series || 1,
          phases: [],
        };

        let j = i + 1;
        while (
          j < phases.length &&
          phases[j].kind !== 'set' &&
          phases[j].kind !== 'group' &&
          !phases[j].ungrouped
        ) {
          const child = { ...phases[j] };
          delete child.ungrouped;
          setPhase.phases.push(child);
          j += 1;
        }

        storedPhases.push(setPhase);
        i = j - 1;
      } else {
        // Standalone phases (e.g. rests with `ungrouped`) stay at top level.
        storedPhases.push({ ...phase });
      }
    }

    return {
      id: this.workout.id,
      title: this.workout.title,
      completed: this.workout.completed || 0,
      phases: storedPhases,
    };
  }

  #renderSummary() {
    if (!this._summaryEl || !this.workout) return;
    const workoutForSummary = this.#buildStoredWorkout();
    const summary = summarizeWorkout(workoutForSummary);
    const namesText = summary.names.join(', ') || 'No exercises yet';
    const minutes = Math.floor(summary.totalSeconds / 60);
    const seconds = summary.totalSeconds % 60;
    const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this._summaryEl.textContent = `${namesText} 
Total: ${timeText}`;

    if (this._completedEl) {
      const completed = typeof this.workout.completed === 'number' ? this.workout.completed : 0;
      this._completedEl.textContent = completed > 0
        ? `Completed ${completed} ${completed === 1 ? 'time' : 'times'}`
        : '';
    }
  }

  #getSetBoundsForIndex(index) {
    const phases = this.workout?.phases || [];
    if (index < 0 || index >= phases.length) {
      return { start: -1, endExclusive: phases.length };
    }

    // If the phase is standalone, treat it as standalone.
    if (phases[index].ungrouped) {
      return { start: -1, endExclusive: phases.length };
    }

    // For exercises/rest in sets, find the nearest set marker before and after.
    let start = -1;
    for (let i = index; i >= 0; i -= 1) {
      if (phases[i].kind === 'set' || phases[i].kind === 'group') {
        start = i;
        break;
      }
    }

    let endExclusive = phases.length;
    for (let i = index + 1; i < phases.length; i += 1) {
      if (phases[i].kind === 'set' || phases[i].kind === 'group' || phases[i].ungrouped) {
        endExclusive = i;
        break;
      }
    }

    return { start, endExclusive };
  }
}

customElements.define('customize-page', CustomizePage);

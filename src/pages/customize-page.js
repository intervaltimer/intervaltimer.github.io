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
      phases: [],
    };
    this.workout = JSON.parse(JSON.stringify(workout));
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
        <div class="app-row app-row--center app-footer-row">
          <button class="app-button" id="btn-add-exercise">+ exercise</button>
          <button class="app-button" id="btn-add-rest">+ rest</button>
        </div>
        <div class="app-row app-row--center app-footer-row">
          <button class="app-button" id="btn-back">Back to timer</button>
        </div>
      </div>
    `;

    this._titleInput = this.querySelector('#workout-title');
    this._phasesContainer = this.querySelector('#phases');
  this._summaryEl = this.querySelector('#workout-summary');
    this._btnBackTop = this.querySelector('#btn-back-top');
    this._btnAddExercise = this.querySelector('#btn-add-exercise');
    this._btnAddRest = this.querySelector('#btn-add-rest');
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

    this._btnAddExercise.addEventListener('click', () => {
      this.workout.phases.push({ kind: 'exercise', title: 'Work', seconds: 20 });
      this.#save();
      this.#renderPhases();
      this.#renderSummary();
    });

    this._btnAddRest.addEventListener('click', () => {
      this.workout.phases.push({ kind: 'rest', seconds: 20 });
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

    this.workout.phases.forEach((phase, index) => {
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
        });
        titleCol.appendChild(titleInput);

        const secondsCol = document.createElement('div');
        secondsCol.className = 'phase-secondary';
        const secondsInput = document.createElement('input');
        secondsInput.className = 'app-input';
        secondsInput.type = 'number';
        secondsInput.min = '1';
        secondsInput.value = String(phase.seconds || 0);
        secondsInput.addEventListener('input', () => {
          phase.seconds = Number(secondsInput.value) || 0;
          this.#save();
        });
        secondsCol.appendChild(secondsInput);

        const actionsCol = this.#createActionsMenu(phase, index);

        row.appendChild(titleCol);
        row.appendChild(secondsCol);
        row.appendChild(actionsCol);
      } else {
        const secondsCol = document.createElement('div');
        secondsCol.className = 'phase-secondary';
        const secondsInput = document.createElement('input');
        secondsInput.className = 'app-input';
        secondsInput.type = 'number';
        secondsInput.min = '1';
        secondsInput.value = String(phase.seconds || 0);
        secondsInput.addEventListener('input', () => {
          phase.seconds = Number(secondsInput.value) || 0;
          this.#save();
        });
        secondsCol.appendChild(secondsInput);

        const actionsCol = this.#createActionsMenu(phase, index);

        row.appendChild(secondsCol);
        row.appendChild(actionsCol);
      }

      card.appendChild(row);
      this._phasesContainer.appendChild(card);
    });

    this.#renderSummary();
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

    addItem('Duplicate', copyIcon, () => {
      this.workout.phases.push({ ...phase });
      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--duplicate');

    addItem('Move up', arrowUpIcon, () => {
      if (index <= 0) return;
      const phases = this.workout.phases;
      const [p] = phases.splice(index, 1);
      phases.splice(index - 1, 0, p);
      this.#save();
      this.#renderPhases();
    }, 'phase-menu-item--move-up');

    addItem('Move down', arrowDownIcon, () => {
      const phases = this.workout.phases;
      if (index >= phases.length - 1) return;
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
    upsertWorkout(this.workout);
  }

   #renderSummary() {
    if (!this._summaryEl || !this.workout) return;
    const summary = summarizeWorkout(this.workout);
    const namesText = summary.names.join(', ') || 'No exercises yet';
    const minutes = Math.floor(summary.totalSeconds / 60);
    const seconds = summary.totalSeconds % 60;
    const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this._summaryEl.textContent = `${namesText} 
Total: ${timeText}`;
  }
}

customElements.define('customize-page', CustomizePage);

import { loadWorkouts, deleteWorkout, summarizeWorkout, upsertWorkout } from '../storage/workouts.js';
import { navigateTo, ROUTES } from '../router.js';

class DashboardPage extends HTMLElement {
  constructor() {
    super();
    this._onDocumentClick = this.#handleDocumentClick.bind(this);
  }

  connectedCallback() {
    this.classList.add('app-column');
    document.addEventListener('click', this._onDocumentClick);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._onDocumentClick);
  }

  render() {
    const workouts = loadWorkouts();

    if (!workouts.length) {
      // No workouts: go straight to timer (will create default there)
      navigateTo(ROUTES.TIMER);
      return;
    }

    this.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'app-page-title';
    title.textContent = 'Your Workouts';
    this.appendChild(title);

    const list = document.createElement('div');
    list.className = 'app-column';

    workouts.forEach((w) => {
      const summary = summarizeWorkout(w);
      const card = document.createElement('button');
      card.className = 'card dashboard-card';
      card.type = 'button';
      card.addEventListener('click', () => {
        navigateTo(ROUTES.TIMER, w.id);
      });

      const content = document.createElement('div');
      content.className = 'dashboard-card-main';

      const heading = document.createElement('div');
      heading.className = 'card-title';
      heading.textContent = w.title || 'Untitled workout';
      content.appendChild(heading);

      const subtitle = document.createElement('div');
      subtitle.className = 'card-subtitle';
      const namesText = summary.names.join(', ') || 'No exercises yet';
      const minutes = Math.floor(summary.totalSeconds / 60);
      const seconds = summary.totalSeconds % 60;
      const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      subtitle.textContent = `${namesText} 
Total: ${timeText}`;
      content.appendChild(subtitle);

      const completed = typeof w.completed === 'number' ? w.completed : 0;
      if (completed > 0) {
        const completedEl = document.createElement('div');
        completedEl.className = 'card-subtitle dashboard-card-stat';
        completedEl.textContent = `Completed ${completed} ${completed === 1 ? 'time' : 'times'}`;
        content.appendChild(completedEl);
      }

      card.appendChild(content);

      const actions = document.createElement('div');
      actions.className = 'dashboard-card-actions';

      const menuButton = document.createElement('button');
      menuButton.type = 'button';
      menuButton.className = 'dashboard-card-menu-button';
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
      menu.className = 'dashboard-card-menu';

      const shareItem = document.createElement('button');
      shareItem.type = 'button';
      shareItem.className = 'dashboard-card-menu-item';
      shareItem.textContent = 'Share';
      shareItem.addEventListener('click', async (event) => {
        event.stopPropagation();
        try {
          const payload = JSON.stringify({ title: w.title, phases: w.phases || [] });
          const encoded = encodeURIComponent(payload);
          const url = `${window.location.origin}${window.location.pathname}?w=${encoded}#/timer`;

          if (navigator.share) {
            await navigator.share({ title: w.title || 'Workout', url });
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            // eslint-disable-next-line no-alert
            alert('Share link copied to clipboard');
          } else {
            // eslint-disable-next-line no-alert
            alert(url);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to create share link', e);
        }
      });

      menu.appendChild(shareItem);

      const deleteItem = document.createElement('button');
      deleteItem.type = 'button';
      deleteItem.className = 'dashboard-card-menu-item';
      deleteItem.textContent = 'Delete';
      deleteItem.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteWorkout(w.id);
        const remaining = loadWorkouts();
        if (!remaining.length) {
          navigateTo(ROUTES.TIMER);
        } else {
          this.render();
        }
      });

      menu.appendChild(deleteItem);

      menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = menu.classList.contains('dashboard-card-menu--open');
        this.#closeAllMenus();
        if (!isOpen) {
          menu.classList.add('dashboard-card-menu--open');
        }
      });

      actions.appendChild(menuButton);
      actions.appendChild(menu);
      card.appendChild(actions);

      list.appendChild(card);
    });

    this.appendChild(list);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'app-row app-footer-row';

    const addBtn = document.createElement('button');
    addBtn.className = 'app-button';
    addBtn.textContent = '+ Workout';
    addBtn.addEventListener('click', () => {
      const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now());
      const workout = {
        id,
        title: 'New Workout',
        completed: 0,
        phases: [],
      };
      upsertWorkout(workout);
      navigateTo(ROUTES.CUSTOMIZE, workout.id);
    });

    actionsRow.appendChild(addBtn);
    this.appendChild(actionsRow);
  }

  #closeAllMenus() {
    const open = this.querySelectorAll('.dashboard-card-menu.dashboard-card-menu--open');
    open.forEach((el) => el.classList.remove('dashboard-card-menu--open'));
  }

  #handleDocumentClick(event) {
    const target = event.target;
    if (!target) return;
    if (target.closest('.dashboard-card-menu') || target.closest('.dashboard-card-menu-button')) {
      return;
    }
    this.#closeAllMenus();
  }
}

customElements.define('dashboard-page', DashboardPage);

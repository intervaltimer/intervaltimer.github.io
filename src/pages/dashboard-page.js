import { loadWorkouts, deleteWorkout, summarizeWorkout, upsertWorkout } from '../storage/workouts.js';
import { navigateTo, ROUTES } from '../router.js';

class DashboardPage extends HTMLElement {
  connectedCallback() {
    this.classList.add('app-column');
    this.render();
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
      const card = document.createElement('div');
      card.className = 'card';

      const heading = document.createElement('div');
      heading.className = 'card-title';
      heading.textContent = w.title || 'Untitled workout';
      card.appendChild(heading);

      const subtitle = document.createElement('div');
      subtitle.className = 'card-subtitle';
      const namesText = summary.names.join(', ') || 'No exercises yet';
      const minutes = Math.floor(summary.totalSeconds / 60);
      const seconds = summary.totalSeconds % 60;
      const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      subtitle.textContent = `${namesText} 
Total: ${timeText}`;
      card.appendChild(subtitle);

      const actions = document.createElement('div');
      actions.className = 'app-row app-row--space-between';

      const openBtn = document.createElement('button');
      openBtn.className = 'app-button';
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        navigateTo(ROUTES.TIMER, w.id);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'app-button';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        deleteWorkout(w.id);
        const remaining = loadWorkouts();
        if (!remaining.length) {
          navigateTo(ROUTES.TIMER);
        } else {
          this.render();
        }
      });

      actions.appendChild(openBtn);
      actions.appendChild(deleteBtn);
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
        phases: [],
      };
      upsertWorkout(workout);
      navigateTo(ROUTES.CUSTOMIZE, workout.id);
    });

    actionsRow.appendChild(addBtn);
    this.appendChild(actionsRow);
  }
}

customElements.define('dashboard-page', DashboardPage);

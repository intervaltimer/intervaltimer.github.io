# Interval Timer PWA

Live app: www.interval.github.io

None of the interval timers online quite matched what I needed: autosave, easy workout configuration, workout sharing and a clear voice-over.

## Features

- Installable PWA designed for mobile (portrait-only, no zoom)
- Idle, exercise, and rest backgrounds with smooth color cues
- Voice guidance plus audio beeps for countdown and transitions
- Share your workouts via an url
- Workout dashboard with summaries (exercise counts and total time)
- Customize page with per-phase editing and quick actions
- Local storage persistence so workouts are saved on your device

## Tech Stack

- Vanilla JavaScript + Web Components
- HTML/CSS (custom fonts, dark theme)
- Web Speech API for voice
- LocalStorage for workout data

## Development

Install dependencies and run tests:

```bash
npm install
npm test
```

Then start a simple static server (for example, using `npx serve .`) and open the app in your browser.

Completely designed with AI

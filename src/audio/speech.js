let audioContext = null;
let speechWarmed = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      audioContext = new Ctor();
    }
  }
  return audioContext;
}

export function speak(text) {
  if (typeof window === 'undefined') return;
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}

export function warmUpSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve();
  }

  if (speechWarmed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    utterance.onend = () => {
      speechWarmed = true;
      resolve();
    };
    utterance.onerror = () => {
      speechWarmed = true;
      resolve();
    };
    window.speechSynthesis.speak(utterance);
  });
}

function playTone(frequency, durationMs = 180) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(1.0, ctx.currentTime);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export function beepLow() {
  playTone(550);
}

export function beepHigh() {
  playTone(900);
}

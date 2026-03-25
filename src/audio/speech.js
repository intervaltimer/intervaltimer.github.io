let audioContext = null;
let speechWarmed = false;
let speechOk = false;
let audioOk = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (Ctor) {
      audioContext = new Ctor();
      // Expose globally for legacy iOS unlock workarounds.
      window.audioContext = audioContext;
      setupIOSAudioUnlock();
    }
  }
  return audioContext;
}

function setupIOSAudioUnlock() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!('ontouchstart' in window)) return;
  if (!audioContext) return;

  const unlock = () => {
    if (!audioContext) return;

    try {
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      if (source.start) {
        source.start(0);
      } else if (source.play) {
        source.play(0);
      } else if (source.noteOn) {
        source.noteOn(0);
      }
    } catch {
      // Ignore unlock errors; we'll also try resume below.
    }

    if (typeof audioContext.resume === 'function') {
      audioContext.resume().catch(() => {});
    }

    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('touchend', unlock);
  };

  document.addEventListener('touchstart', unlock, { passive: true });
  document.addEventListener('touchend', unlock, { passive: true });
}

export async function ensureAudioReady() {
  if (typeof window === 'undefined') return;
  const ctx = getAudioContext();
  if (!ctx) {
    audioOk = false;
    return false;
  }
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      audioOk = ctx.state === 'running';
    } catch {
      // On iOS this still needs a user gesture; mark as not OK.
      audioOk = false;
    }
  } else {
    audioOk = ctx.state === 'running';
  }
  return audioOk;
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
    return Promise.resolve(false);
  }

  if (speechWarmed) {
    return Promise.resolve(speechOk);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      speechWarmed = true;
      resolve(speechOk);
    };

    try {
      const utterance = new SpeechSynthesisUtterance('.');
      utterance.volume = 0;
      utterance.onend = () => {
        speechOk = true;
        finish();
      };
      utterance.onerror = () => {
        speechOk = false;
        finish();
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      speechOk = false;
      finish();
    }

    // Safety timeout for buggy platforms (e.g. some iOS builds)
    setTimeout(() => {
      // If nothing has happened yet, treat warm-up as failed but unblock.
      speechOk = Boolean(speechOk);
      finish();
    }, 7000);
  });
}

export function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isAudioSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.AudioContext || window.webkitAudioContext);
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

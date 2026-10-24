/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Zero-Latency Procedural Web Audio Synthesizer & Telegram Haptic Engine
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const SOUND_STORAGE_KEY = 'ie_sound_enabled';

// Initialize sound setting from localStorage if available
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(SOUND_STORAGE_KEY);
  if (stored !== null) {
    soundEnabled = stored === 'true';
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  }
}

export function toggleSound(): boolean {
  const next = !soundEnabled;
  setSoundEnabled(next);
  if (next) {
    playTick();
  }
  return next;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error'): void {
  if (typeof window === 'undefined') return;
  const tg = (window as unknown as {
    Telegram?: {
      WebApp?: {
        version?: string;
        isVersionAtLeast?: (v: string) => boolean;
        HapticFeedback?: {
          selectionChanged: () => void;
          notificationOccurred: (t: 'error' | 'success' | 'warning') => void;
          impactOccurred: (s: 'light' | 'medium' | 'heavy') => void;
        };
      };
    };
  }).Telegram?.WebApp;

  if (!tg || !tg.HapticFeedback) return;
  if (typeof tg.isVersionAtLeast === 'function' && !tg.isVersionAtLeast('6.1')) return;
  if (parseFloat(String(tg.version || '6.0')) < 6.1) return;

  const haptic = tg.HapticFeedback;
  try {
    if (type === 'selection') {
      haptic.selectionChanged();
    } else if (type === 'success' || type === 'error') {
      haptic.notificationOccurred(type);
    } else {
      haptic.impactOccurred(type);
    }
  } catch {
    // Graceful fallback if not running inside Telegram client
  }
}

/**
 * playTick: Tactile mechanical click
 * 22ms triangle oscillator pitch drop 240Hz -> 65Hz + subtle noise burst
 */
export function playTick(): void {
  triggerHaptic('light');
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(240, now);
  osc.frequency.exponentialRampToValueAtTime(65, now + 0.022);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.025);

  // Subtle noise pop
  const bufferSize = Math.floor(ctx.sampleRate * 0.008);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.06;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  noiseGain.gain.setValueAtTime(0.08, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
}

/**
 * playSwitch: Cozy toggle pop
 * 300Hz -> 560Hz sine sweep, 40ms
 */
export function playSwitch(): void {
  triggerHaptic('selection');
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(560, now + 0.04);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.048);
}

/**
 * playCoin: 16-bit dual-tone crystal chime
 * 987Hz (B5) -> 1318Hz (E6)
 */
export function playCoin(): void {
  triggerHaptic('medium');
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Tone 1: 987Hz (B5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(987.77, now);
  gain1.gain.setValueAtTime(0.22, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.13);

  // Tone 2: 1318Hz (E6) starting after 55ms
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1318.51, now + 0.055);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.25, now + 0.055);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.055);
  osc2.stop(now + 0.3);
}

/**
 * playFanfare: 4-note celebratory pixel chord arpeggio
 * C5 (523.25) -> E5 (659.25) -> G5 (783.99) -> C6 (1046.50)
 */
export function playFanfare(): void {
  triggerHaptic('success');
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];
  const stepTime = 0.09;

  notes.forEach((freq, idx) => {
    const startTime = now + idx * stepTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const duration = idx === notes.length - 1 ? 0.45 : 0.18;
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  });
}

/**
 * playError: Low double buzz
 * 140Hz -> 100Hz
 */
export function playError(): void {
  triggerHaptic('error');
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  [0, 0.1].forEach((delay) => {
    const startTime = now + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(95, startTime + 0.07);

    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.08);
  });
}

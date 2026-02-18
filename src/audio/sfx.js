import { gameState } from '../core/GameState.js';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, type, duration, gain = 0.3, filterFreq = 4000) {
  if (gameState.isMuted) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, now);

  osc.connect(filter).connect(gainNode).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNotes(notes, type, noteDuration, gap, gain = 0.3, filterFreq = 4000) {
  if (gameState.isMuted) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  notes.forEach((freq, i) => {
    const start = now + i * gap;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, start);

    osc.connect(filter).connect(gainNode).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + noteDuration);
  });
}

function playNoise(duration, gain = 0.2, lpfFreq = 4000, hpfFreq = 0) {
  if (gameState.isMuted) return;
  const ctx = getCtx();
  const now = ctx.currentTime;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.setValueAtTime(lpfFreq, now);

  let chain = source.connect(lpf).connect(gainNode);

  if (hpfFreq > 0) {
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(hpfFreq, now);
    source.disconnect();
    chain = source.connect(hpf).connect(lpf).connect(gainNode);
  }

  chain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

// Fragment collected — bright ascending chime (data recovered!)
export function scoreSfx() {
  playNotes([659.25, 987.77], 'square', 0.12, 0.07, 0.3, 5000);
}

// Player death — descending crushed tones (system failure)
export function deathSfx() {
  playNotes([392, 329.63, 261.63, 220, 174.61], 'square', 0.2, 0.1, 0.25, 2000);
}

// Slowdown activation — power-up arpeggio (temporal shift)
export function slowdownSfx() {
  playNotes([261.63, 329.63, 392, 523.25, 659.25], 'square', 0.1, 0.06, 0.25, 5000);
}

// Button click — short pop
export function clickSfx() {
  playTone(523.25, 'sine', 0.08, 0.2, 5000);
}

// Acceleration warning — low alarm tone
export function accelWarnSfx() {
  playNotes([174.61, 220], 'sawtooth', 0.15, 0.12, 0.2, 1200);
}

// Whoosh — noise sweep (enemy spawn hint)
export function whooshSfx() {
  playNoise(0.15, 0.1, 4000, 800);
}

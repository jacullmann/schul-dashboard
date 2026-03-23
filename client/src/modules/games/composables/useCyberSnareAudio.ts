let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(
  freq: number,
  type: OscillatorType,
  duration: number,
  vol = 0.1,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, vol = 0.2) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
}

export const sfx = {
  drawStart: () => playTone(150, 'sawtooth', 0.1, 0.05),

  snareClose: () => {
    playTone(440, 'square', 0.3, 0.1);
    setTimeout(() => playTone(660, 'square', 0.4, 0.1), 50);
  },

  enemyHit: () => {
    playNoise(0.3, 0.3);
    playTone(100, 'sawtooth', 0.3, 0.2);
  },

  playerHit: () => {
    playTone(150, 'sawtooth', 0.5, 0.3);
    setTimeout(() => playTone(100, 'sawtooth', 0.5, 0.3), 100);
    playNoise(0.5, 0.4);
  },

  powerup: () => {
    playTone(600, 'sine', 0.1, 0.2);
    setTimeout(() => playTone(800, 'sine', 0.1, 0.2), 100);
    setTimeout(() => playTone(1200, 'sine', 0.2, 0.2), 200);
  },

  resume: () => {
    getCtx();
  },
};

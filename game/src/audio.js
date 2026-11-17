// Solara Bay — synthesized sound only. No audio files: every sound is built
// with the Web Audio API (oscillators, noise buffers, filters).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  // Must be called from a user gesture; headless screenshot runs skip audio.
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startEngineHum();
      this.startMusic();
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startEngineHum() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
  }

  // speedRatio 0..1 raises pitch and volume of the engine hum.
  setEngine(speedRatio, inCar) {
    if (!this.engineOsc) return;
    const target = inCar ? 0.05 + speedRatio * 0.09 : 0.0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 130, this.ctx.currentTime, 0.1);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  pickup() {
    this.blip(880, 0.12, 'sine', 0.25);
    setTimeout(() => this.blip(1320, 0.18, 'sine', 0.25), 90);
  }

  gunshot() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.15;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.4;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  siren(on) {
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 700;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.8;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      lfo.start();
      this.sirenOsc = osc;
      this.sirenLfo = lfo;
      this.sirenGain = gain;
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); this.sirenLfo.stop(); } catch (e) {}
      this.sirenOsc = null;
      this.sirenLfo = null;
    }
  }

  // A short original loop: warm pad chords + a lazy bass line, all synthesized.
  startMusic() {
    const chords = [
      [261.6, 329.6, 392.0],
      [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6],
      [196.0, 246.9, 293.7],
    ];
    const bass = [130.8, 110.0, 87.3, 98.0];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const chord = chords[this.musicStep % chords.length];
      const root = bass[this.musicStep % bass.length];
      for (const f of chord) {
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.4);
        gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.9);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        osc.stop(this.ctx.currentTime + 2);
      }
      const b = this.ctx.createOscillator();
      b.type = 'sine';
      b.frequency.value = root;
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.09, this.ctx.currentTime);
      bg.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);
      b.connect(bg);
      bg.connect(this.master);
      b.start();
      b.stop(this.ctx.currentTime + 2);
      this.musicStep++;
    }, 2000);
  }
}

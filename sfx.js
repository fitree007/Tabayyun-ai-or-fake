/**
 * Exciting Sound Effects Engine (Web Audio API)
 * Strictly SFX only — NO background music.
 */
class SoundEffectsEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.85;
    this.drumrollCleanup = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopDrumroll();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0));
  }

  /**
   * Helper to create a master gain node for a single sound effect
   */
  _createGain(multiplier = 1) {
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume * multiplier;
    gain.connect(this.ctx.destination);
    return gain;
  }

  /**
   * Subtle crisp UI hover/click tick
   */
  playTick(freq = 900) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this._createGain(0.2);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.045);

    gain.gain.setValueAtTime(this.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Exciting cinematic whoosh + suspense pulse when a new media appears
   */
  playQuestionReveal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Filtered noise whoosh
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(180, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.22);
    filter.frequency.exponentialRampToValueAtTime(280, now + 0.45);

    const noiseGain = this._createGain(0.35);
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.18);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noise.connect(filter);
    filter.connect(noiseGain);
    noise.start(now);
    noise.stop(now + 0.45);

    // 2. Deep cinematic double heartbeat thump ("Lub-Dub")
    this._playHeartbeatPulse(now + 0.08, 0.55);
    this._playHeartbeatPulse(now + 0.26, 0.4);
  }

  _playHeartbeatPulse(startTime, intensity = 0.5) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this._createGain(intensity);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.16);

    gain.gain.setValueAtTime(this.volume * intensity, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.17);

    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 0.18);
  }

  /**
   * Heartbeat suspense effect (on demand or when locking in)
   */
  playHeartbeatSuspense() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 3 accelerating lub-dub beats
    const beats = [0, 0.18, 0.55, 0.71, 1.02, 1.16];
    const amps = [0.5, 0.35, 0.65, 0.45, 0.8, 0.6];
    beats.forEach((offset, idx) => {
      this._playHeartbeatPulse(now + offset, amps[idx]);
    });
  }

  /**
   * Dramatic Lock-in sound when clicking an answer button
   */
  playLockIn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Punchy sub-impact + metallic ping
    const osc = this.ctx.createOscillator();
    const gain = this._createGain(0.5);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.25);

    // High tension riser ping
    const ping = this.ctx.createOscillator();
    const pingGain = this._createGain(0.25);
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(520, now);
    ping.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    pingGain.gain.setValueAtTime(this.volume * 0.25, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    ping.connect(pingGain);
    ping.start(now);
    ping.stop(now + 0.19);
  }

  /**
   * Exciting "CORRECT!" sound effect (Game show crisp fanfare chime + sparkle burst)
   */
  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Bright ascending major triad + 9th (C5 -> E5 -> G5 -> C6 -> E6)
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const times = [0, 0.07, 0.14, 0.22, 0.30];
    const durations = [0.25, 0.25, 0.3, 0.45, 0.65];

    notes.forEach((freq, i) => {
      const start = now + times[i];
      const dur = durations[i];

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this._createGain(0.32);

      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc2.frequency.setValueAtTime(freq * 2, start); // harmonic shimmer

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(this.volume * 0.32, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      const shimmerGain = this.ctx.createGain();
      shimmerGain.gain.value = 0.25;

      osc.connect(gain);
      osc2.connect(shimmerGain);
      shimmerGain.connect(gain);

      osc.start(start);
      osc2.start(start);
      osc.stop(start + dur + 0.02);
      osc2.stop(start + dur + 0.02);
    });

    // Crisp celebratory impact thump at the climax
    this._playHeartbeatPulse(now + 0.22, 0.45);
  }

  /**
   * Exciting "WRONG!" sound effect (Game show dual-saw buzzer + dramatic drop)
   */
  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Two dissonant low sawtooth bursts ("BZZT - BZZZT!")
    const pulses = [
      { start: 0, dur: 0.18, f1: 145, f2: 154 },
      { start: 0.21, dur: 0.42, f1: 115, f2: 123 }
    ];

    pulses.forEach(({ start, dur, f1, f2 }) => {
      const t0 = now + start;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this._createGain(0.28);

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(f1, t0);
      osc2.frequency.setValueAtTime(f2, t0);
      osc1.frequency.linearRampToValueAtTime(f1 * 0.85, t0 + dur);
      osc2.frequency.linearRampToValueAtTime(f2 * 0.85, t0 + dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, t0);
      filter.frequency.exponentialRampToValueAtTime(320, t0 + dur);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(t0 + dur + 0.02);
      osc2.stop(t0 + dur + 0.02);
    });
  }

  /**
   * Snare Drumroll SFX (1.4 seconds of rapid snare hits ending in a rimshot crash!)
   */
  playDrumroll() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    this.stopDrumroll();

    const now = this.ctx.currentTime;
    const totalDuration = 1.35;
    const steps = 26;

    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const hitTime = now + progress * totalDuration;
      const intensity = 0.12 + progress * 0.35;
      this._triggerSnareHit(hitTime, 0.045, intensity);
    }

    // Final accent hit
    this._triggerSnareHit(now + totalDuration, 0.22, 0.65);
    this._playHeartbeatPulse(now + totalDuration, 0.6);
  }

  _triggerSnareHit(startTime, duration, intensity) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 350;

    const gain = this._createGain(intensity);
    gain.gain.setValueAtTime(this.volume * intensity, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  stopDrumroll() {
    if (this.drumrollCleanup) {
      clearTimeout(this.drumrollCleanup);
      this.drumrollCleanup = null;
    }
  }

  /**
   * Countdown clock tick-tock (urgent pitch when <= 3 seconds left)
   */
  playTimerTick(isUrgent = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this._createGain(isUrgent ? 0.38 : 0.2);

    osc.type = isUrgent ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isUrgent ? 1150 : 750, now);
    osc.frequency.exponentialRampToValueAtTime(isUrgent ? 600 : 400, now + 0.06);

    gain.gain.setValueAtTime(this.volume * (isUrgent ? 0.38 : 0.2), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Applause / Celebration SFX burst (no music, realistic synthesized clapping + victory chime)
   */
  playApplauseVictory() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    this.playCorrect();
    const now = this.ctx.currentTime;

    // Synthesize 35 overlapping individual hand-claps over 1.6 seconds
    for (let i = 0; i < 38; i++) {
      const offset = 0.1 + Math.random() * 1.4;
      const clapTime = now + offset;
      const dur = 0.035 + Math.random() * 0.025;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.28));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 950 + Math.random() * 700;
      filter.Q.value = 1.8;

      const envelope = Math.sin((offset / 1.5) * Math.PI);
      const gain = this._createGain(0.16 * Math.max(0.2, envelope));

      noise.connect(filter);
      filter.connect(gain);
      noise.start(clapTime);
      noise.stop(clapTime + dur);
    }
  }
}

window.sfx = new SoundEffectsEngine();

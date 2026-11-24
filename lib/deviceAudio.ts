"use client";

/**
 * DeviceAudio — tiny synthesised sound set (no audio files).
 * Muted by default. The AudioContext is only created after the user explicitly
 * turns sound on (a user gesture), as browsers require.
 */
export type Sfx = "tick" | "key" | "beep" | "confirm" | "cancel" | "boot" | "shutdown" | "switch" | "squelch" | "static" | "lock" | "error";

class DeviceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private staticSrc: AudioBufferSourceNode | null = null;
  enabled = false;

  /** Call from a click/tap handler. */
  enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
    this.stopStatic();
    void this.ctx?.suspend();
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.5, delay = 0, slideTo?: number) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  private burst(dur: number, vol = 0.4, freq = 2400, delay = 0) {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  play(sfx: Sfx) {
    if (!this.enabled) return;
    switch (sfx) {
      case "tick": this.burst(0.025, 0.5, 4200); break;
      case "key": this.burst(0.018, 0.25, 3200); break;
      case "beep": this.tone(1320, 0.07, "square", 0.25); break;
      case "confirm": this.tone(880, 0.06, "square", 0.25); this.tone(1320, 0.08, "square", 0.25, 0.07); break;
      case "cancel": this.tone(660, 0.06, "square", 0.25); this.tone(440, 0.09, "square", 0.25, 0.07); break;
      case "error": this.tone(220, 0.18, "sawtooth", 0.2); break;
      case "switch": this.burst(0.04, 0.6, 1800); this.tone(180, 0.05, "triangle", 0.3, 0.02); break;
      case "boot": [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.3, i * 0.11)); break;
      case "shutdown": this.tone(900, 0.5, "sine", 0.3, 0, 90); break;
      case "squelch": this.burst(0.12, 0.5, 1600); this.tone(1800, 0.08, "sine", 0.15, 0.1, 900); break;
      case "lock": this.tone(1500, 0.04, "square", 0.2); this.burst(0.03, 0.5, 900, 0.05); break;
      case "static": break;
    }
  }

  /** Looping filtered radio static (push-to-talk). */
  startStatic() {
    if (!this.enabled || !this.ctx || !this.master || !this.noise || this.staticSrc) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1400;
    f.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    s.connect(f).connect(g).connect(this.master);
    s.start();
    this.staticSrc = s;
  }
  stopStatic() {
    try { this.staticSrc?.stop(); } catch { /* already stopped */ }
    this.staticSrc = null;
  }
}

export const deviceAudio = new DeviceAudio();

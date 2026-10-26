/* Cyber City Tactics · src/js/core/audio.js
 * Web Audio setup and the sound effects (sfx.*). Everything is synthesized; there are no audio files.
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= audio ================= */
const A = {
  ac: null,
  master: null,
  mus: null,
  unlock() {
    if (!this.ac) {
      try {
        this.ac = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ac.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.ac.destination);
        this.mus = this.ac.createGain();
        this.mus.gain.value = prefs.music ? 0.55 : 0;
        this.mus.connect(this.ac.destination);
      } catch (e) {}
    }
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
  },
  osc(dest, f, t, d, type, v, slide) {
    const a = this.ac;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + d + 0.02);
  },
  nz(dest, t, d, v, cut, hp) {
    const a = this.ac;
    const n = Math.max(1, Math.floor(a.sampleRate * d)),
      b = a.createBuffer(1, n, a.sampleRate),
      c = b.getChannelData(0);
    for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(),
      f = a.createBiquadFilter(),
      g = a.createGain();
    s.buffer = b;
    f.type = hp ? 'highpass' : 'lowpass';
    f.frequency.value = cut || 2400;
    g.gain.value = v;
    s.connect(f).connect(g).connect(dest);
    s.start(t);
  },
  tone(f, d, type, v, slide) {
    if (!this.ac || !prefs.sound) return;
    this.osc(this.master, f, this.ac.currentTime, d, type, v || 0.06, slide);
  },
  noise(d, v, cut) {
    if (!this.ac || !prefs.sound) return;
    this.nz(this.master, this.ac.currentTime, d, v || 0.12, cut);
  }
};
const sfx = {
  hit() {
    A.noise(0.07, 0.18, 1800);
    A.tone(160, 0.08, 'square', 0.05, -80);
  },
  heavy() {
    A.noise(0.14, 0.25, 900);
    A.tone(110, 0.15, 'square', 0.07, -60);
  },
  whiff() {
    A.noise(0.05, 0.05, 4000);
  },
  shot() {
    A.noise(0.13, 0.22, 3200);
    A.tone(520, 0.07, 'square', 0.04, -420);
  },
  click() {
    A.tone(1400, 0.03, 'square', 0.03);
  },
  clank() {
    A.tone(1800, 0.06, 'square', 0.04, -900);
    A.noise(0.05, 0.08, 5000);
  },
  spell() {
    A.tone(260, 0.35, 'sawtooth', 0.05, 700);
    A.tone(390, 0.35, 'triangle', 0.04, 900);
  },
  heal() {
    A.tone(523, 0.2, 'triangle', 0.05);
    setTimeout(() => A.tone(784, 0.3, 'triangle', 0.05), 120);
  },
  boom() {
    A.noise(0.35, 0.3, 700);
    A.tone(90, 0.3, 'sawtooth', 0.06, -50);
  },
  coin() {
    A.tone(988, 0.06, 'square', 0.04);
    setTimeout(() => A.tone(1480, 0.1, 'square', 0.04), 55);
  },
  jump() {
    A.tone(300, 0.12, 'triangle', 0.05, 250);
  },
  roll() {
    A.noise(0.12, 0.08, 1200);
  },
  hurt() {
    A.tone(220, 0.18, 'sawtooth', 0.06, -140);
  },
  zap() {
    A.tone(880, 0.12, 'sawtooth', 0.035, -600);
  },
  grab() {
    A.tone(200, 0.06, 'square', 0.05, 80);
  },
  buy() {
    A.tone(660, 0.07, 'square', 0.04);
    setTimeout(() => A.tone(990, 0.12, 'square', 0.04), 70);
  },
  loot() {
    A.tone(740, 0.08, 'triangle', 0.05);
    setTimeout(() => A.tone(1110, 0.08, 'triangle', 0.05), 80);
    setTimeout(() => A.tone(1480, 0.14, 'triangle', 0.05), 160);
  },
  level() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => A.tone(f, 0.18, 'square', 0.05), i * 90));
  },
  talk() {
    A.tone(700, 0.04, 'triangle', 0.03);
    setTimeout(() => A.tone(560, 0.05, 'triangle', 0.03), 50);
  }
};

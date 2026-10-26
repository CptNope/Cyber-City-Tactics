/* Cyber City Tactics · src/js/core/music.js
 * The chiptune sequencer and its songs (title, Den, each district, boss).
 * Loaded as a classic script: every file shares one global scope, in the order listed in index.html. */
'use strict';
/* ================= music ================= */
// Each song: bpm, root (MIDI), chord offsets per bar, 16-step patterns. Bass: r root, f fifth, o octave. Arp/lead: digits index the scale.
const MINOR = [0, 2, 3, 5, 7, 8, 10, 12, 14, 15];
const SONGS = {
  title: {
    bpm: 96,
    root: 45,
    prog: [0, -4, -2, -5],
    bass: 'r...r...f...r.o.',
    arp: '0.2.4.2.0.2.4.7.',
    lead: '................................7...6...4.......5...4...2.......',
    kick: 'x.......x.......',
    snare: '....s.......s...',
    hat: '..h...h...h...h.'
  },
  den: {
    bpm: 84,
    root: 50,
    prog: [0, 5, 3, -2],
    bass: 'r.....r...f.....',
    arp: '2...4...7...4...',
    lead: '4.......2...0...........................2...4...5...4...2.......',
    kick: 'x.........x.....',
    snare: '........s.......',
    hat: 'h...h...h...h.h.'
  },
  d0: {
    bpm: 132,
    root: 40,
    prog: [0, 0, -2, 3],
    bass: 'r.ro.rr.f.fo.r.r',
    arp: '0.4.7.4.0.4.7.9.',
    lead: '7.7.6.4.....4.6.7.....9.7.6.4...4.4.2.0.....2.4.0.....................',
    kick: 'x...x...x...x..x',
    snare: '....s.......s.s.',
    hat: 'hhhhhhhhhhhhhhhh'
  },
  d1: {
    bpm: 138,
    root: 43,
    prog: [0, 3, 5, -2],
    bass: 'r.r.o.r.r.r.f.o.',
    arp: '0247024702470247',
    lead: '9...7...6...4...6...7...9...........7.6.4.2.4.......',
    kick: 'x..x..x...x..x..',
    snare: '....s.......s...',
    hat: 'h.hhh.hhh.hhh.hh'
  },
  d2: {
    bpm: 116,
    root: 38,
    prog: [0, 1, 0, -1],
    bass: 'r...r.r.....r...',
    arp: '0..3..0..3..1..3',
    lead: '.......4.......3.......1...0...........4...5...4.......3.......',
    kick: 'x.......x..x....',
    snare: '........s.......',
    hat: '..h...h...h..hh.'
  },
  d3: {
    bpm: 144,
    root: 45,
    prog: [0, -2, -4, -5],
    bass: 'rrorrorrfforrfor',
    arp: '0.4.7.9.7.4.0.4.',
    lead: '7.9.7.6.4.......4.6.7.9.7.......9.9.9.7.6.4.2.4.......',
    kick: 'x...x...x...x...',
    snare: '....s..s....s...',
    hat: 'hhhhhhhhhhhhhhhh'
  },
  d4: {
    bpm: 150,
    root: 42,
    prog: [0, 3, -2, 1],
    bass: 'r.rorr.or.rorrfo',
    arp: '0470470470470479',
    lead: '9.7.9.7.6.4.6.7.9...7...9.9.9.8.7.6.4.......',
    kick: 'x..xx..xx..xx..x',
    snare: '....s.......s.s.',
    hat: 'hhhhhhhhhhhhhhhh'
  },
  boss: {
    bpm: 156,
    root: 41,
    prog: [0, 1, 0, -2],
    bass: 'roroforoforoforo',
    arp: '0303030303030303',
    lead: '7.7.8.7.6.4.....7.7.8.9.7.......',
    kick: 'x.x.x.x.x.x.x.x.',
    snare: '....s.......s.ss',
    hat: 'h.hhh.hhh.hhh.hh'
  }
};
const M = { cur: null, step: 0, next: 0 };
function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
function musicPlay(name) {
  if (M.cur === name) return;
  M.cur = name;
  M.step = 0;
  if (A.ac) M.next = A.ac.currentTime + 0.08;
}
function musicTick() {
  const a = A.ac;
  if (!a || !M.cur || !prefs.music) return;
  const S = SONGS[M.cur];
  const spb = 60 / S.bpm / 4;
  if (M.next < a.currentTime - 0.2) M.next = a.currentTime + 0.05;
  while (M.next < a.currentTime + 0.15) {
    const st = M.step % 16,
      bar = Math.floor(M.step / 16) % S.prog.length,
      t = M.next,
      root = S.root + S.prog[bar],
      out = A.mus;
    const b = S.bass[st];
    if (b && b !== '.')
      A.osc(out, midi(root - 12 + ({ r: 0, f: 7, o: 12 }[b] || 0)), t, spb * 1.7, 'triangle', 0.11);
    const ar = S.arp[st];
    if (ar && ar !== '.') A.osc(out, midi(root + 12 + MINOR[+ar]), t, spb * 0.8, 'square', 0.022);
    const L = S.lead[M.step % S.lead.length];
    if (L && L !== '.') A.osc(out, midi(root + 24 + MINOR[+L]), t, spb * 2.2, 'square', 0.03);
    if (S.kick[st] === 'x') A.osc(out, 140, t, 0.14, 'sine', 0.35, -100);
    if (S.snare[st] === 's') A.nz(out, t, 0.12, 0.12, 1800);
    if (S.hat[st] === 'h') A.nz(out, t, 0.03, 0.04, 7000, true);
    M.next += spb;
    M.step++;
  }
}
setInterval(musicTick, 25);
function setMusic(on) {
  prefs.music = on;
  savePrefs();
  if (A.mus) A.mus.gain.value = on ? 0.55 : 0;
}

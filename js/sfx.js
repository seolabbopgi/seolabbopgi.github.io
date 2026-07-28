/** 화려한 효과음 — Web Audio API */
const Sfx = (() => {
  let ctx = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, t0, dur, { type = 'sine', vol = 0.35, pan = 0 } = {}) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    const p = c.createStereoPanner();
    o.type = type;
    o.frequency.value = freq;
    p.pan.value = pan;
    g.gain.setValueAtTime(vol, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
    o.connect(g).connect(p).connect(c.destination);
    o.start(c.currentTime + t0);
    o.stop(c.currentTime + t0 + dur + 0.05);
  }

  function noise(t0, dur, vol = 0.25) {
    const c = ac();
    const len = c.sampleRate * dur;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2800;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur);
    src.connect(f).connect(g).connect(c.destination);
    src.start(c.currentTime + t0);
  }

  const API = {
    pull() {
      tone(392, 0, 0.08, { type: 'triangle', vol: 0.4 });
      tone(523, 0.06, 0.1, { type: 'triangle', vol: 0.35 });
      noise(0, 0.12, 0.2);
    },

    packOpen() {
      noise(0, 0.18, 0.35);
      [440, 554, 659].forEach((f, i) => tone(f, 0.05 + i * 0.04, 0.15, { vol: 0.3 }));
    },

    n() {
      tone(523, 0, 0.12, { vol: 0.35 });
      tone(659, 0.08, 0.15, { vol: 0.3 });
    },

    r() {
      [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.18, { type: 'triangle', vol: 0.38 }));
    },

    sr() {
      [587, 740, 880, 1047].forEach((f, i) => tone(f, i * 0.06, 0.22, { type: 'square', vol: 0.32, pan: (i - 1.5) * 0.2 }));
      noise(0.1, 0.08, 0.15);
    },

    ur() {
      [523, 659, 784, 988, 1175, 1319].forEach((f, i) => {
        tone(f, i * 0.07, 0.35, { type: 'square', vol: 0.42, pan: Math.sin(i) * 0.5 });
      });
      setTimeout(() => {
        [784, 988, 1175].forEach((f, i) => tone(f, i * 0.05, 0.4, { type: 'sawtooth', vol: 0.35 }));
      }, 400);
    },

    miss() {
      tone(220, 0, 0.25, { type: 'sawtooth', vol: 0.3 });
      tone(165, 0.15, 0.35, { type: 'sawtooth', vol: 0.28 });
    },

    click() {
      tone(880, 0, 0.05, { vol: 0.2 });
    },

    play(type) {
      const fn = API[type];
      if (fn) fn();
    },
  };

  return API;
})();

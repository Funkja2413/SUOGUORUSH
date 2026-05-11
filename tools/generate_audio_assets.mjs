import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sampleRate = 44100;
const outDir = fileURLToPath(new URL("../review_audio/", import.meta.url));

const clamp = (value, min = -1, max = 1) => Math.max(min, Math.min(max, value));
const secondsToSamples = (seconds) => Math.ceil(seconds * sampleRate);
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const pentatonicD = [midi(50), midi(53), midi(55), midi(57), midi(60), midi(62), midi(65), midi(67)];

function makeBuffer(seconds) {
  return {
    left: new Float32Array(secondsToSamples(seconds)),
    right: new Float32Array(secondsToSamples(seconds))
  };
}

function addSample(buffer, index, value, pan = 0) {
  if (index < 0 || index >= buffer.left.length) return;
  const leftGain = Math.cos(((pan + 1) * Math.PI) / 4);
  const rightGain = Math.sin(((pan + 1) * Math.PI) / 4);
  buffer.left[index] += value * leftGain;
  buffer.right[index] += value * rightGain;
}

function addTone(buffer, start, duration, options) {
  const {
    freq,
    endFreq = freq,
    gain = 0.3,
    type = "sine",
    attack = 0.01,
    release = 0.12,
    pan = 0,
    vibrato = 0,
    noise = 0
  } = options;
  const startIndex = secondsToSamples(start);
  const count = secondsToSamples(duration);
  let phase = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const progress = i / Math.max(1, count - 1);
    const currentFreq = freq * (endFreq / freq) ** progress;
    phase += (Math.PI * 2 * currentFreq) / sampleRate;
    const shapedPhase = phase + Math.sin(t * Math.PI * 2 * 5.5) * vibrato;
    let wave = Math.sin(shapedPhase);
    if (type === "triangle") wave = (2 / Math.PI) * Math.asin(Math.sin(shapedPhase));
    if (type === "saw") wave = 2 * (shapedPhase / (Math.PI * 2) - Math.floor(0.5 + shapedPhase / (Math.PI * 2)));
    if (type === "square") wave = Math.sin(shapedPhase) >= 0 ? 1 : -1;
    const envIn = Math.min(1, t / attack);
    const envOut = Math.min(1, (duration - t) / release);
    const envelope = Math.sin(Math.min(envIn, envOut) * Math.PI * 0.5) ** 1.4;
    const airy = noise ? (Math.random() * 2 - 1) * noise : 0;
    addSample(buffer, startIndex + i, (wave + airy) * envelope * gain, pan);
  }
}

function addNoise(buffer, start, duration, options = {}) {
  const { gain = 0.2, lowpass = 0.12, attack = 0.004, release = 0.12, pan = 0 } = options;
  const startIndex = secondsToSamples(start);
  const count = secondsToSamples(duration);
  let filtered = 0;
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    filtered += ((Math.random() * 2 - 1) - filtered) * lowpass;
    const envIn = Math.min(1, t / attack);
    const envOut = Math.min(1, (duration - t) / release);
    const envelope = Math.sin(Math.min(envIn, envOut) * Math.PI * 0.5);
    addSample(buffer, startIndex + i, filtered * envelope * gain, pan);
  }
}

function addDrum(buffer, start, gain = 0.8, pan = 0) {
  addTone(buffer, start, 0.36, {
    freq: 94,
    endFreq: 42,
    gain: gain * 0.65,
    type: "sine",
    attack: 0.002,
    release: 0.3,
    pan
  });
  addNoise(buffer, start, 0.09, { gain: gain * 0.22, lowpass: 0.08, release: 0.08, pan });
}

function addGong(buffer, start, gain = 0.55) {
  addTone(buffer, start, 2.4, { freq: 98, endFreq: 88, gain: gain * 0.5, type: "triangle", attack: 0.01, release: 2.2, pan: -0.08 });
  addTone(buffer, start + 0.01, 2.1, { freq: 147, endFreq: 132, gain: gain * 0.28, type: "sine", attack: 0.01, release: 2, pan: 0.1 });
  addTone(buffer, start + 0.02, 1.5, { freq: 207, endFreq: 186, gain: gain * 0.18, type: "triangle", attack: 0.01, release: 1.4, pan: 0.18 });
  addNoise(buffer, start, 0.8, { gain: gain * 0.12, lowpass: 0.025, release: 0.75, pan: 0 });
}

function addHorn(buffer, start, note, duration = 1.15, gain = 0.35, pan = 0) {
  addTone(buffer, start, duration, { freq: note * 0.98, endFreq: note * 1.16, gain, type: "saw", attack: 0.08, release: 0.45, pan, vibrato: 0.018 });
  addTone(buffer, start, duration, { freq: note / 2, endFreq: note * 0.58, gain: gain * 0.35, type: "triangle", attack: 0.08, release: 0.45, pan, vibrato: 0.012 });
}

function addPluck(buffer, start, note, gain = 0.28, pan = 0) {
  addTone(buffer, start, 0.72, { freq: note, endFreq: note * 0.995, gain, type: "triangle", attack: 0.004, release: 0.55, pan });
  addTone(buffer, start, 0.22, { freq: note * 2.01, endFreq: note * 1.99, gain: gain * 0.22, type: "sine", attack: 0.003, release: 0.18, pan });
}

function addSword(buffer, start, gain = 0.45) {
  addTone(buffer, start, 0.16, { freq: 430, endFreq: 1080, gain, type: "saw", attack: 0.002, release: 0.12, pan: 0.2 });
  addNoise(buffer, start + 0.015, 0.09, { gain: gain * 0.18, lowpass: 0.18, release: 0.08, pan: 0.16 });
}

function normalize(buffer, peak = 0.92) {
  let max = 0;
  for (let i = 0; i < buffer.left.length; i += 1) {
    max = Math.max(max, Math.abs(buffer.left[i]), Math.abs(buffer.right[i]));
  }
  if (max <= peak) return buffer;
  const scale = peak / max;
  for (let i = 0; i < buffer.left.length; i += 1) {
    buffer.left[i] *= scale;
    buffer.right[i] *= scale;
  }
  return buffer;
}

function encodeWav(buffer) {
  normalize(buffer);
  const frames = buffer.left.length;
  const bytes = Buffer.alloc(44 + frames * 4);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + frames * 4, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(2, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 4, 28);
  bytes.writeUInt16LE(4, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(frames * 4, 40);
  for (let i = 0; i < frames; i += 1) {
    bytes.writeInt16LE(Math.round(clamp(buffer.left[i]) * 32767), 44 + i * 4);
    bytes.writeInt16LE(Math.round(clamp(buffer.right[i]) * 32767), 46 + i * 4);
  }
  return bytes;
}

async function save(name, buffer) {
  await writeFile(join(outDir, name), encodeWav(buffer));
}

function bgmBattleLoop() {
  const buffer = makeBuffer(32);
  const motif = [0, 2, 3, 5, 3, 2, 0, 1, 0, 2, 5, 6, 5, 3, 2, 0];
  const beat = 0.5;
  for (let step = 0; step < 64; step += 1) {
    const time = step * beat;
    const note = pentatonicD[motif[step % motif.length]];
    const phraseAccent = step % 16 === 0;
    if (step % 2 === 0) addPluck(buffer, time, note * (phraseAccent ? 1.5 : 1), phraseAccent ? 0.34 : 0.22, step % 4 === 0 ? -0.22 : 0.18);
    if (step % 4 === 0) addDrum(buffer, time, phraseAccent ? 0.82 : 0.62, -0.04);
    if (step % 4 === 2) addDrum(buffer, time, 0.38, 0.08);
    if (step % 8 === 0) addTone(buffer, time, 1.5, { freq: note / 2, endFreq: note / 2, gain: 0.16, type: "sine", attack: 0.04, release: 1.1, pan: 0 });
    if (step % 16 === 0) addGong(buffer, time, 0.32);
    if (step % 32 === 0) addHorn(buffer, time + 0.16, midi(50), 1.2, 0.18, 0.12);
  }
  addNoise(buffer, 0, 32, { gain: 0.018, lowpass: 0.006, attack: 1, release: 1, pan: 0 });
  return buffer;
}

const creators = {
  "bgm_hulaoguan_battle_loop.wav": bgmBattleLoop,
  "ui_hero_select.wav": () => {
    const b = makeBuffer(0.55);
    addPluck(b, 0, midi(67), 0.32, -0.08);
    addPluck(b, 0.12, midi(72), 0.24, 0.08);
    return b;
  },
  "tower_build.wav": () => {
    const b = makeBuffer(0.7);
    addDrum(b, 0.02, 0.38);
    addNoise(b, 0.04, 0.18, { gain: 0.18, lowpass: 0.07 });
    addPluck(b, 0.18, midi(55), 0.26);
    addPluck(b, 0.3, midi(62), 0.24);
    return b;
  },
  "tower_upgrade.wav": () => {
    const b = makeBuffer(0.62);
    addPluck(b, 0, midi(62), 0.25, -0.1);
    addPluck(b, 0.09, midi(67), 0.24, 0);
    addPluck(b, 0.18, midi(74), 0.22, 0.12);
    addNoise(b, 0.14, 0.1, { gain: 0.07, lowpass: 0.2 });
    return b;
  },
  "tower_dismantle.wav": () => {
    const b = makeBuffer(0.78);
    addNoise(b, 0, 0.38, { gain: 0.28, lowpass: 0.06 });
    addTone(b, 0.02, 0.42, { freq: 210, endFreq: 58, gain: 0.3, type: "saw", attack: 0.004, release: 0.36 });
    return b;
  },
  "projectile_arrow.wav": () => {
    const b = makeBuffer(0.26);
    addTone(b, 0, 0.12, { freq: 980, endFreq: 1450, gain: 0.22, type: "triangle", attack: 0.002, release: 0.09, pan: 0.16 });
    addNoise(b, 0.01, 0.08, { gain: 0.08, lowpass: 0.3, pan: 0.16 });
    return b;
  },
  "projectile_crossbow.wav": () => {
    const b = makeBuffer(0.32);
    addNoise(b, 0, 0.08, { gain: 0.16, lowpass: 0.16 });
    addTone(b, 0.02, 0.14, { freq: 240, endFreq: 72, gain: 0.27, type: "square", attack: 0.002, release: 0.1 });
    return b;
  },
  "projectile_magic.wav": () => {
    const b = makeBuffer(0.55);
    addTone(b, 0, 0.35, { freq: midi(67), endFreq: midi(79), gain: 0.24, type: "sine", attack: 0.02, release: 0.22, vibrato: 0.03 });
    addTone(b, 0.05, 0.3, { freq: midi(74), endFreq: midi(62), gain: 0.13, type: "triangle", attack: 0.02, release: 0.24 });
    return b;
  },
  "projectile_fire.wav": () => {
    const b = makeBuffer(0.58);
    addTone(b, 0, 0.28, { freq: 200, endFreq: 58, gain: 0.28, type: "saw", attack: 0.005, release: 0.24 });
    addNoise(b, 0, 0.35, { gain: 0.22, lowpass: 0.055 });
    return b;
  },
  "projectile_stone.wav": () => {
    const b = makeBuffer(0.45);
    addTone(b, 0, 0.24, { freq: 105, endFreq: 48, gain: 0.36, type: "triangle", attack: 0.002, release: 0.22 });
    addNoise(b, 0.01, 0.16, { gain: 0.18, lowpass: 0.04 });
    return b;
  },
  "hero_attack.wav": () => {
    const b = makeBuffer(0.42);
    addSword(b, 0.02, 0.46);
    return b;
  },
  "hero_skill.wav": () => {
    const b = makeBuffer(0.95);
    addSword(b, 0, 0.48);
    addGong(b, 0.08, 0.2);
    addHorn(b, 0.15, midi(55), 0.58, 0.17);
    return b;
  },
  "hero_death.wav": () => {
    const b = makeBuffer(1.35);
    addTone(b, 0, 0.92, { freq: midi(57), endFreq: midi(38), gain: 0.34, type: "triangle", attack: 0.02, release: 0.78 });
    addGong(b, 0.16, 0.16);
    return b;
  },
  "enemy_attack.wav": () => {
    const b = makeBuffer(0.36);
    addTone(b, 0, 0.13, { freq: 250, endFreq: 130, gain: 0.28, type: "square", attack: 0.002, release: 0.11 });
    addNoise(b, 0.02, 0.09, { gain: 0.13, lowpass: 0.16 });
    return b;
  },
  "enemy_death.wav": () => {
    const b = makeBuffer(0.72);
    addTone(b, 0, 0.38, { freq: 180, endFreq: 70, gain: 0.25, type: "triangle", attack: 0.006, release: 0.34 });
    addNoise(b, 0.06, 0.18, { gain: 0.09, lowpass: 0.06 });
    return b;
  },
  "wave_start_gong_horn.wav": () => {
    const b = makeBuffer(1.8);
    addGong(b, 0, 0.48);
    addHorn(b, 0.18, midi(50), 1.1, 0.28);
    addDrum(b, 0.02, 0.62);
    addDrum(b, 0.32, 0.5);
    return b;
  }
};

await mkdir(outDir, { recursive: true });
for (const [name, create] of Object.entries(creators)) {
  await save(name, create());
}

console.log(`Generated ${Object.keys(creators).length} wav files in ${outDir}`);

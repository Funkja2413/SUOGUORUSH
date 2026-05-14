const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  stage: document.querySelector("#stage"),
  startScreen: document.querySelector("#startScreen"),
  menuStart: document.querySelector("#menuStart"),
  menuRanking: document.querySelector("#menuRanking"),
  menuToggleMusic: document.querySelector("#menuToggleMusic"),
  menuToggleSfx: document.querySelector("#menuToggleSfx"),
  introScreen: document.querySelector("#introScreen"),
  introVideo: document.querySelector("#introVideo"),
  introFallback: document.querySelector("#introFallback"),
  skipIntro: document.querySelector("#skipIntro"),
  preloadScreen: document.querySelector("#preloadScreen"),
  preloadProgress: document.querySelector("#preloadProgress"),
  preloadText: document.querySelector("#preloadText"),
  stats: document.querySelector("#stats"),
  towerPopup: document.querySelector("#towerPopup"),
  towerTooltip: document.querySelector("#towerTooltip"),
  waveInfo: document.querySelector("#waveInfo"),
  heroPortrait: document.querySelector(".hero-portrait"),
  heroStatus: document.querySelector("#heroStatus"),
  waveControl: document.querySelector("#waveControl"),
  toggleMusic: document.querySelector("#toggleMusic"),
  toggleSfx: document.querySelector("#toggleSfx"),
  togglePause: document.querySelector("#togglePause"),
  backHome: document.querySelector("#backHome"),
  restart: document.querySelector("#restart"),
  skillBuff: document.querySelector("#skillBuff"),
  skillLine: document.querySelector("#skillLine"),
  resultModal: document.querySelector("#resultModal"),
  resultStars: document.querySelector("#resultStars"),
  resultTitle: document.querySelector("#resultTitle"),
  resultBody: document.querySelector("#resultBody"),
  resultScore: document.querySelector("#resultScore"),
  resultRanking: document.querySelector("#resultRanking"),
  resultNext: document.querySelector("#resultNext"),
  resultRestart: document.querySelector("#resultRestart"),
  resultBack: document.querySelector("#resultBack"),
  rankingModal: document.querySelector("#rankingModal"),
  rankingList: document.querySelector("#rankingList"),
  closeRanking: document.querySelector("#closeRanking")
};

const appState = {
  mode: "menu",
  introSrc: "./assets/intro_cutscene.mp4?v=20260512-intro-v2"
};

const level = await fetch("./data/level_001_hulaoguan.json?v=20260514-lvbu-survival-v1").then((res) => res.json());
const WORLD_SCALE = 2;
const scaled = (value) => value * WORLD_SCALE;
const NAV_CELL = scaled(12);
const UI_BASE_STAGE_WIDTH = 1280;
const UI_MIN_SCALE = 0.75;
const RANKING_STORAGE_KEY = `sanguo-rush-ranking:${level.level_id}`;
const MAX_RANKING_RECORDS = 20;

const mapImage = new Image();
mapImage.src = "./assets/hulaoguan_map.jpg?v=20260514-map-jpg-v1";
const mapVideo = document.createElement("video");
mapVideo.src = "./assets/hulaoguan_map_loop.mp4?v=20260509-video-env-v3";
mapVideo.muted = true;
mapVideo.loop = true;
mapVideo.playsInline = true;
mapVideo.preload = "auto";
mapVideo.play().catch(() => {});

const AudioSystem = (() => {
  const sources = {
    music: {
      battle: "./assets/audio/bgm_hulaoguan_ambient.mp3",
      boss: "./assets/audio/bgm_hulaoguan_boss_loop.wav"
    },
    stinger: "./assets/audio/stinger_wave_start_short.wav",
    build: "./assets/audio/tower_build_01.ogg",
    upgrade: "./assets/audio/tower_upgrade_01.ogg",
    dismantle: "./assets/audio/tower_dismantle_01.ogg",
    heroSelect: "./assets/audio/hero_select_01.ogg",
    heroAttack: "./assets/audio/hero_attack_01.ogg",
    heroSkill: "./assets/audio/hero_skill_01.ogg",
    heroDeath: "./assets/audio/hero_death_01.ogg",
    enemySfx: {
      default: {
        attack: [
          "./assets/audio/enemy_attack_sword_01.ogg",
          "./assets/audio/enemy_attack_sword_02.ogg",
          "./assets/audio/enemy_attack_sword_03.ogg"
        ],
        death: [
          "./assets/audio/enemy_death_shout_01.wav",
          "./assets/audio/enemy_death_shout_02.wav",
          "./assets/audio/enemy_death_shout_03.wav"
        ]
      },
      knife_soldier: {
        attack: [
          "./assets/audio/enemy_attack_sword_01.ogg",
          "./assets/audio/enemy_attack_sword_02.ogg",
          "./assets/audio/enemy_attack_sword_03.ogg"
        ],
        death: [
          "./assets/audio/enemy_death_shout_01.wav",
          "./assets/audio/enemy_death_shout_02.wav",
          "./assets/audio/enemy_death_shout_03.wav"
        ]
      },
      iron_cavalry: {
        attack: [
          "./assets/audio/enemy_attack_cavalry_heavy_01.ogg",
          "./assets/audio/enemy_attack_cavalry_heavy_02.ogg",
          "./assets/audio/enemy_attack_cavalry_trot_01.ogg"
        ],
        death: [
          "./assets/audio/enemy_death_cavalry_01.wav",
          "./assets/audio/enemy_death_cavalry_02.wav"
        ]
      },
      warlock: {
        attack: [
          "./assets/audio/enemy_attack_warlock_spell_01.ogg",
          "./assets/audio/enemy_attack_warlock_spell_02.ogg"
        ],
        death: [
          "./assets/audio/enemy_death_warlock_01.mp3",
          "./assets/audio/enemy_death_warlock_02.mp3"
        ]
      },
      eagle_scout: {
        attack: [
          "./assets/audio/enemy_attack_eagle_screech_01.ogg",
          "./assets/audio/enemy_attack_eagle_screech_02.ogg"
        ],
        death: [
          "./assets/audio/enemy_death_eagle_screech_01.ogg"
        ]
      }
    },
    projectiles: {
      arrow_tower: "./assets/audio/tower_arrow_shot_01.ogg",
      crossbow_tower: "./assets/audio/tower_crossbow_shot_01.ogg",
      magic_tower: "./assets/audio/tower_magic_shot_01.ogg",
      fire_tower: "./assets/audio/tower_fire_shot_01.ogg",
      watchtower: "./assets/audio/tower_stone_shot_01.ogg"
    }
  };
  const baseVolumes = {
    music: 0.14,
    musicDuck: 0.06,
    stinger: 0.72,
    build: 0.55,
    upgrade: 0.5,
    dismantle: 0.58,
    heroSelect: 0.45,
    heroAttack: 0.58,
    heroSkill: 0.62,
    heroDeath: 0.62,
    enemyAttack: 0.42,
    enemyDeath: 0.46,
    projectile: 0.34,
    uiHover: 0.18,
    result: 0.55
  };
  let musicEnabled = true;
  let sfxEnabled = true;
  let unlocked = false;
  let currentMusic = null;
  let currentMusicKey = null;
  let musicDuckTimer = null;
  let sfxAudioContext = null;
  const lastPlayed = new Map();
  const samplePool = new Map();

  function flattenSources(value, result = []) {
    if (typeof value === "string") result.push(value);
    else if (Array.isArray(value)) value.forEach((item) => flattenSources(item, result));
    else if (value && typeof value === "object") Object.values(value).forEach((item) => flattenSources(item, result));
    return result;
  }

  function makeAudio(src, { loop = false, volume = 1 } = {}) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = loop;
    audio.volume = musicEnabled ? volume : 0;
    return audio;
  }

  function playThrottled(key, gap, callback) {
    if (!sfxEnabled || !unlocked) return;
    const now = performance.now() / 1000;
    if (now - (lastPlayed.get(key) || -Infinity) < gap) return;
    lastPlayed.set(key, now);
    callback();
  }

  function playSample(name, src, volume = 1, throttle = 0) {
    if (throttle > 0) {
      playThrottled(name, throttle, () => playSample(name, src, volume, 0));
      return;
    }
    const source = Array.isArray(src) ? src[Math.floor(Math.random() * src.length)] : src;
    if (!sfxEnabled || !unlocked || !source) return;
    const base = samplePool.get(source) || makeAudio(source, { volume });
    samplePool.set(source, base);
    const audio = base.cloneNode();
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  function getSfxAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sfxAudioContext ||= new AudioContextClass();
    return sfxAudioContext;
  }

  function resumeSfxAudioContext() {
    const ctx = getSfxAudioContext();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  }

  function playHoverTone() {
    if (!sfxEnabled || !unlocked) return;
    const now = performance.now() / 1000;
    if (now - (lastPlayed.get("uiHoverTone") || -Infinity) < 0.055) return;
    lastPlayed.set("uiHoverTone", now);

    const ctx = getSfxAudioContext();
    if (!ctx) {
      playSample("uiHoverFallback", sources.heroSelect, baseVolumes.uiHover, 0.06);
      return;
    }

    const start = ctx.currentTime;
    const duration = 0.12;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(620, start);
    oscillator.frequency.exponentialRampToValueAtTime(780, start + duration);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(baseVolumes.uiHover, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSoldierDeathShout(enemy) {
    if (!sfxEnabled || !unlocked || !enemy) return;
    const enemySfx = sources.enemySfx[enemy.id] || sources.enemySfx.default;
    playSample(`enemyDeath:${enemy.uid}`, enemySfx.death, enemy.isBoss ? baseVolumes.enemyDeath * 1.2 : baseVolumes.enemyDeath, 0.18);
  }

  function playEnemyWeaponHit(enemyId = "enemy") {
    if (!sfxEnabled || !unlocked) return;
    const heavy = enemyId === "iron_cavalry" || enemyId === "boss_liubei";
    const enemySfx = sources.enemySfx[enemyId] || sources.enemySfx.default;
    playSample(`enemyAttack:${enemyId}`, enemySfx.attack, heavy ? baseVolumes.enemyAttack * 1.18 : baseVolumes.enemyAttack, 0.09);
  }

  function setMusic(key) {
    const src = sources.music[key] || sources.music.battle;
    if (currentMusicKey === key && currentMusic) {
      if (musicEnabled && unlocked) currentMusic.play().catch(() => {});
      return;
    }
    if (currentMusic) currentMusic.pause();
    currentMusicKey = key;
    currentMusic = makeAudio(src, { loop: true, volume: baseVolumes.music });
    if (musicEnabled && unlocked) currentMusic.play().catch(() => {});
  }

  function duckMusic(duration = 8) {
    if (!currentMusic || !musicEnabled) return;
    window.clearTimeout(musicDuckTimer);
    currentMusic.volume = baseVolumes.musicDuck;
    musicDuckTimer = window.setTimeout(() => {
      if (currentMusic && musicEnabled) currentMusic.volume = baseVolumes.music;
    }, duration * 1000);
  }

  function syncToggle(button, enabled, onText, offText) {
    if (!button) return;
    button.classList.toggle("sound-off", !enabled);
    button.classList.toggle("sound-on", enabled);
    button.classList.toggle("is-off", !enabled);
    button.classList.toggle("is-on", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    const strong = button.querySelector("strong");
    if (strong) strong.textContent = enabled ? "ON" : "OFF";
    else if (!button.classList.contains("icon-only")) button.textContent = enabled ? onText : offText;
  }

  function syncUi() {
    syncToggle(ui.toggleMusic, musicEnabled, "乐", "静");
    syncToggle(ui.toggleSfx, sfxEnabled, "效", "禁");
    syncToggle(ui.menuToggleMusic, musicEnabled, "配乐", "配乐");
    syncToggle(ui.menuToggleSfx, sfxEnabled, "音效", "音效");
  }

  function setMusicEnabled(nextEnabled) {
    musicEnabled = nextEnabled;
    if (currentMusic) {
      currentMusic.volume = musicEnabled ? baseVolumes.music : 0;
      if (musicEnabled && unlocked) currentMusic.play().catch(() => {});
      else currentMusic.pause();
    }
    syncUi();
  }

  function setSfxEnabled(nextEnabled) {
    sfxEnabled = nextEnabled;
    syncUi();
  }

  return {
    async unlock() {
      unlocked = true;
      resumeSfxAudioContext();
      setMusic(currentMusicKey || "battle");
      syncUi();
    },
    toggleMusic() {
      setMusicEnabled(!musicEnabled);
    },
    toggleSfx() {
      setSfxEnabled(!sfxEnabled);
    },
    toggleSfxWithFeedback() {
      const wasEnabled = sfxEnabled;
      if (wasEnabled) this.uiSelect();
      setSfxEnabled(!sfxEnabled);
      if (!wasEnabled) this.uiSelect();
    },
    uiSelect() {
      playSample("uiSelect", sources.heroSelect, baseVolumes.heroSelect, 0.08);
    },
    uiHover() {
      playHoverTone();
    },
    setMusicWave(index) {
      setMusic(index >= level.waves.length - 1 ? "boss" : "battle");
    },
    waveStart(index) {
      this.setMusicWave(index);
      duckMusic(8);
      playSample("stinger", sources.stinger, baseVolumes.stinger, 7.5);
    },
    build() {
      playSample("build", sources.build, baseVolumes.build);
    },
    upgrade() {
      playSample("upgrade", sources.upgrade, baseVolumes.upgrade);
    },
    dismantle() {
      playSample("dismantle", sources.dismantle, baseVolumes.dismantle);
    },
    projectile(towerId) {
      playSample(`projectile:${towerId}`, sources.projectiles[towerId], baseVolumes.projectile, 0.05);
    },
    heroSelect() {
      playSample("heroSelect", sources.heroSelect, baseVolumes.heroSelect, 0.12);
    },
    heroAttack(skill = false) {
      playSample(skill ? "heroSkill" : "heroAttack", skill ? sources.heroSkill : sources.heroAttack, skill ? baseVolumes.heroSkill : baseVolumes.heroAttack, 0.08);
    },
    heroDeath() {
      playSample("heroDeath", sources.heroDeath, baseVolumes.heroDeath, 0.5);
    },
    enemyAttack(enemyId) {
      playEnemyWeaponHit(enemyId);
    },
    enemyDeath(enemy) {
      playSoldierDeathShout(enemy);
    },
    result(victory) {
      playSample(victory ? "resultVictory" : "resultDefeat", victory ? sources.upgrade : sources.heroDeath, baseVolumes.result, 0.5);
    },
    preloadSources() {
      return [...new Set(flattenSources(sources))];
    }
  };
})();
const pathMaskImage = new Image();
pathMaskImage.src = "./assets/path_mask.png";
const heroIdleImage = new Image();
heroIdleImage.src = "./assets/characters/heroes/liubei/idle.png";
const heroWalkImage = new Image();
heroWalkImage.src = "./assets/characters/heroes/liubei/walk.png";
const heroAttackImage = new Image();
heroAttackImage.src = "./assets/characters/heroes/liubei/attack.png?v=20260514-liubei-attack-v2";
const heroSkill1Image = new Image();
heroSkill1Image.src = "./assets/characters/heroes/liubei/skill1.png";
const heroSkill2Image = new Image();
heroSkill2Image.src = "./assets/characters/heroes/liubei/skill2.png";
const heroDeathImage = new Image();
heroDeathImage.src = "./assets/characters/heroes/liubei/death.png";
const lvbuIdleImage = new Image();
lvbuIdleImage.src = "./assets/characters/heroes/lvbu/idle.png";
const lvbuWalkImage = new Image();
lvbuWalkImage.src = "./assets/characters/heroes/lvbu/walk.png";
const lvbuAttackImage = new Image();
lvbuAttackImage.src = "./assets/characters/heroes/lvbu/attack.png";
const lvbuSkill1Image = new Image();
lvbuSkill1Image.src = "./assets/characters/heroes/lvbu/skill1.png";
const lvbuSkill2Image = new Image();
lvbuSkill2Image.src = "./assets/characters/heroes/lvbu/skill2.png";
const lvbuDeathImage = new Image();
lvbuDeathImage.src = "./assets/characters/heroes/lvbu/death.png";
const knifeSoldierWalkImage = new Image();
knifeSoldierWalkImage.src = "./assets/characters/enemies/knife_soldier/walk_side.png";
const knifeSoldierWalkFrontImage = new Image();
knifeSoldierWalkFrontImage.src = "./assets/characters/enemies/knife_soldier/walk_front.png";
const knifeSoldierWalkBackImage = new Image();
knifeSoldierWalkBackImage.src = "./assets/characters/enemies/knife_soldier/walk_back.png";
const knifeSoldierAttackImage = new Image();
knifeSoldierAttackImage.src = "./assets/characters/enemies/knife_soldier/attack.png";
const ironCavalryWalkImage = new Image();
ironCavalryWalkImage.src = "./assets/characters/enemies/iron_cavalry/walk_side.png";
const ironCavalryWalkFrontImage = new Image();
ironCavalryWalkFrontImage.src = "./assets/characters/enemies/iron_cavalry/walk_front.png";
const ironCavalryWalkBackImage = new Image();
ironCavalryWalkBackImage.src = "./assets/characters/enemies/iron_cavalry/walk_back.png";
const ironCavalryAttackImage = new Image();
ironCavalryAttackImage.src = "./assets/characters/enemies/iron_cavalry/attack.png";
const warlockWalkImage = new Image();
warlockWalkImage.src = "./assets/characters/enemies/warlock/walk_side.png";
const warlockWalkFrontImage = new Image();
warlockWalkFrontImage.src = "./assets/characters/enemies/warlock/walk_front.png";
const warlockWalkBackImage = new Image();
warlockWalkBackImage.src = "./assets/characters/enemies/warlock/walk_back.png";
const warlockAttackImage = new Image();
warlockAttackImage.src = "./assets/characters/enemies/warlock/attack.png";
const eagleScoutWalkImage = new Image();
eagleScoutWalkImage.src = "./assets/characters/enemies/eagle_scout/walk_side.png";
const eagleScoutWalkFrontImage = new Image();
eagleScoutWalkFrontImage.src = "./assets/characters/enemies/eagle_scout/walk_front.png";
const eagleScoutWalkBackImage = new Image();
eagleScoutWalkBackImage.src = "./assets/characters/enemies/eagle_scout/walk_back.png";
const eagleScoutAttackImage = new Image();
eagleScoutAttackImage.src = "./assets/characters/enemies/eagle_scout/attack.png";

const towerVisuals = Object.fromEntries(
  level.towers.flatMap((tower) =>
    (tower.visual?.levels || []).map((visual) => {
      const image = new Image();
      image.src = visual.image;
      return [`${tower.id}:${visual.level}`, { ...visual, image }];
    })
  )
);

function visualFrame(visual) {
  const columns = visual.columns || 1;
  const rows = visual.rows || 1;
  const frameCount = visual.frame_count || columns * rows;
  const fps = visual.fps || 8;
  const frameIndex = frameCount > 1 ? Math.floor(state.time * fps) % frameCount : 0;
  return {
    sx: (frameIndex % columns) * (visual.image.naturalWidth / columns),
    sy: Math.floor(frameIndex / columns) * (visual.image.naturalHeight / rows),
    sw: visual.image.naturalWidth / columns,
    sh: visual.image.naturalHeight / rows
  };
}

const pathMask = {
  ready: false,
  canvas: document.createElement("canvas"),
  ctx: null,
  cols: 0,
  rows: 0,
  grid: []
};
const heroIdleSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 8,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const heroWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const heroAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 18,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const heroSkill1Sprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const heroSkill2Sprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const heroDeathSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 8,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuIdleSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 8,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuSkill1Sprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuSkill2Sprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const lvbuDeathSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 8,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const knifeSoldierWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const knifeSoldierWalkFrontSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const knifeSoldierWalkBackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const knifeSoldierAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const ironCavalryWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const ironCavalryWalkFrontSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const ironCavalryWalkBackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const ironCavalryAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const warlockWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const warlockWalkFrontSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const warlockWalkBackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const warlockAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const eagleScoutWalkSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const eagleScoutWalkFrontSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const eagleScoutWalkBackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 10,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};
const eagleScoutAttackSprite = {
  columns: 4,
  rows: 3,
  frameCount: 12,
  fps: 14,
  ready: false,
  canvas: document.createElement("canvas"),
  frameWidth: 0,
  frameHeight: 0
};

function defenderSpriteSet() {
  return level.hero.id === "hero_lvbu"
    ? {
        idle: lvbuIdleSprite,
        walk: lvbuWalkSprite,
        attack: lvbuAttackSprite,
        skill1: lvbuSkill1Sprite,
        skill2: lvbuSkill2Sprite,
        death: lvbuDeathSprite,
        sourceFacesRight: true,
        idleSize: 148,
        walkSize: 148,
        attackSize: 148,
        skill1Size: 148,
        skill2Size: 148,
        deathSize: 148,
        idleYOffset: 50,
        yOffset: 50,
        skillYOffset: 50
      }
    : {
        idle: heroIdleSprite,
        walk: heroWalkSprite,
        attack: heroAttackSprite,
        skill1: heroSkill1Sprite,
        skill2: heroSkill2Sprite,
        death: heroDeathSprite,
        sourceFacesRight: false,
        idleSize: 118,
        walkSize: 118,
        attackSize: 118,
        skill1Size: 118,
        skill2Size: 118,
        deathSize: 118,
        idleYOffset: 38,
        yOffset: 38,
        skillYOffset: 38
      };
}

pathMask.canvas.width = canvas.width;
pathMask.canvas.height = canvas.height;
pathMask.ctx = pathMask.canvas.getContext("2d", { willReadFrequently: true });
pathMaskImage.addEventListener("load", () => {
  pathMask.ctx.clearRect(0, 0, canvas.width, canvas.height);
  pathMask.ctx.drawImage(pathMaskImage, 0, 0, canvas.width, canvas.height);
  buildPathMaskGrid();
  pathMask.ready = true;
});
function prepareSpriteSheet(image, sprite, options = {}) {
  sprite.canvas.width = image.naturalWidth;
  sprite.canvas.height = image.naturalHeight;
  sprite.frameWidth = image.naturalWidth / sprite.columns;
  sprite.frameHeight = image.naturalHeight / sprite.rows;

  const spriteCtx = sprite.canvas.getContext("2d", { willReadFrequently: true });
  spriteCtx.drawImage(image, 0, 0);
  if (options.preserveOriginal) {
    sprite.ready = true;
    return;
  }

  const imageData = spriteCtx.getImageData(0, 0, sprite.canvas.width, sprite.canvas.height);
  const pixels = imageData.data;
  let hasSourceAlpha = false;
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 250) {
      hasSourceAlpha = true;
      break;
    }
  }
  if (hasSourceAlpha) {
    sprite.ready = true;
    return;
  }

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const isWhiteMatte = r > 246 && g > 246 && b > 246;
    const isBlackMatte = r < 12 && g < 12 && b < 12;
    if (isWhiteMatte || isBlackMatte) {
      pixels[index + 3] = 0;
    }
  }
  spriteCtx.putImageData(imageData, 0, 0);
  sprite.ready = true;
}

heroIdleImage.addEventListener("load", () => {
  prepareSpriteSheet(heroIdleImage, heroIdleSprite);
});
heroWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(heroWalkImage, heroWalkSprite);
});
heroAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(heroAttackImage, heroAttackSprite);
});
heroSkill1Image.addEventListener("load", () => {
  prepareSpriteSheet(heroSkill1Image, heroSkill1Sprite);
});
heroSkill2Image.addEventListener("load", () => {
  prepareSpriteSheet(heroSkill2Image, heroSkill2Sprite);
});
heroDeathImage.addEventListener("load", () => {
  prepareSpriteSheet(heroDeathImage, heroDeathSprite);
});
lvbuIdleImage.addEventListener("load", () => {
  prepareSpriteSheet(lvbuIdleImage, lvbuIdleSprite);
});
lvbuWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(lvbuWalkImage, lvbuWalkSprite);
});
lvbuAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(lvbuAttackImage, lvbuAttackSprite);
});
lvbuSkill1Image.addEventListener("load", () => {
  prepareSpriteSheet(lvbuSkill1Image, lvbuSkill1Sprite);
});
lvbuSkill2Image.addEventListener("load", () => {
  prepareSpriteSheet(lvbuSkill2Image, lvbuSkill2Sprite);
});
lvbuDeathImage.addEventListener("load", () => {
  prepareSpriteSheet(lvbuDeathImage, lvbuDeathSprite);
});
knifeSoldierWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierWalkImage, knifeSoldierWalkSprite, { preserveOriginal: true });
});
knifeSoldierWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierWalkFrontImage, knifeSoldierWalkFrontSprite, { preserveOriginal: true });
});
knifeSoldierWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierWalkBackImage, knifeSoldierWalkBackSprite, { preserveOriginal: true });
});
knifeSoldierAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierAttackImage, knifeSoldierAttackSprite, { preserveOriginal: true });
});
ironCavalryWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkImage, ironCavalryWalkSprite, { preserveOriginal: true });
});
ironCavalryWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkFrontImage, ironCavalryWalkFrontSprite, { preserveOriginal: true });
});
ironCavalryWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkBackImage, ironCavalryWalkBackSprite, { preserveOriginal: true });
});
ironCavalryAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryAttackImage, ironCavalryAttackSprite, { preserveOriginal: true });
});
warlockWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(warlockWalkImage, warlockWalkSprite);
});
warlockWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(warlockWalkFrontImage, warlockWalkFrontSprite);
});
warlockWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(warlockWalkBackImage, warlockWalkBackSprite);
});
warlockAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(warlockAttackImage, warlockAttackSprite);
});
eagleScoutWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(eagleScoutWalkImage, eagleScoutWalkSprite);
});
eagleScoutWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(eagleScoutWalkFrontImage, eagleScoutWalkFrontSprite);
});
eagleScoutWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(eagleScoutWalkBackImage, eagleScoutWalkBackSprite);
});
eagleScoutAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(eagleScoutAttackImage, eagleScoutAttackSprite);
});

const spritePrepares = [
  [heroIdleImage, heroIdleSprite],
  [heroWalkImage, heroWalkSprite],
  [heroAttackImage, heroAttackSprite],
  [heroSkill1Image, heroSkill1Sprite],
  [heroSkill2Image, heroSkill2Sprite],
  [heroDeathImage, heroDeathSprite],
  [lvbuIdleImage, lvbuIdleSprite],
  [lvbuWalkImage, lvbuWalkSprite],
  [lvbuAttackImage, lvbuAttackSprite],
  [lvbuSkill1Image, lvbuSkill1Sprite],
  [lvbuSkill2Image, lvbuSkill2Sprite],
  [lvbuDeathImage, lvbuDeathSprite],
  [knifeSoldierWalkImage, knifeSoldierWalkSprite, { preserveOriginal: true }],
  [knifeSoldierWalkFrontImage, knifeSoldierWalkFrontSprite, { preserveOriginal: true }],
  [knifeSoldierWalkBackImage, knifeSoldierWalkBackSprite, { preserveOriginal: true }],
  [knifeSoldierAttackImage, knifeSoldierAttackSprite, { preserveOriginal: true }],
  [ironCavalryWalkImage, ironCavalryWalkSprite, { preserveOriginal: true }],
  [ironCavalryWalkFrontImage, ironCavalryWalkFrontSprite, { preserveOriginal: true }],
  [ironCavalryWalkBackImage, ironCavalryWalkBackSprite, { preserveOriginal: true }],
  [ironCavalryAttackImage, ironCavalryAttackSprite, { preserveOriginal: true }],
  [warlockWalkImage, warlockWalkSprite],
  [warlockWalkFrontImage, warlockWalkFrontSprite],
  [warlockWalkBackImage, warlockWalkBackSprite],
  [warlockAttackImage, warlockAttackSprite],
  [eagleScoutWalkImage, eagleScoutWalkSprite],
  [eagleScoutWalkFrontImage, eagleScoutWalkFrontSprite],
  [eagleScoutWalkBackImage, eagleScoutWalkBackSprite],
  [eagleScoutAttackImage, eagleScoutAttackSprite]
];

function prepareLoadedSprites() {
  if (pathMaskImage.complete && pathMaskImage.naturalWidth && !pathMask.ready) {
    pathMask.ctx.clearRect(0, 0, canvas.width, canvas.height);
    pathMask.ctx.drawImage(pathMaskImage, 0, 0, canvas.width, canvas.height);
    buildPathMaskGrid();
    pathMask.ready = true;
  }

  spritePrepares.forEach(([image, sprite, options]) => {
    if (image.complete && image.naturalWidth && !sprite.ready) {
      prepareSpriteSheet(image, sprite, options);
    }
  });
}

const cssPreloadImages = [
  "./assets/start_background.jpg",
  "./assets/start_button.png",
  "./assets/ranking_button.png",
  "./assets/ui/game_cursor.svg",
  "./assets/ui/hud_hp.png",
  "./assets/ui/hud_gold.png",
  "./assets/ui/hud_wave.png",
  "./assets/ui/hero_lvbu_portrait.png?v=20260512-hud-portrait-fix",
  "./assets/ui/hero_lvbu_skill_sweep_20260513_v4.png",
  "./assets/ui/hero_lvbu_skill_warcry_20260513_v4.png",
  "./assets/ui/result_success_1.png",
  "./assets/ui/result_success_2.png",
  "./assets/ui/result_success_3.png",
  "./assets/ui/result_next.png",
  "./assets/ui/result_failure_panel.png",
  "./assets/ui/result_retry.png",
  "./assets/ui/result_home.png",
  "./assets/ui/ranking_panel.png",
  "./assets/ui/ranking_close.png",
  "./assets/tower_menu_icons/dragon_tower.jpg?v=20260514-menu-icons-v4",
  "./assets/tower_menu_icons/watch_tower.jpg?v=20260514-menu-icons-v4",
  "./assets/tower_menu_icons/magic_tower.jpg?v=20260514-menu-icons-v4",
  "./assets/tower_menu_icons/fire_tower.jpg?v=20260514-menu-icons-v4",
  "./assets/tower_menu_icons/cannon_tower.jpg?v=20260514-menu-icons-v4"
];

function absoluteUrl(src) {
  return new URL(src, window.location.href).href;
}

function updatePreloadProgress(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 100;
  if (ui.preloadProgress) ui.preloadProgress.style.width = `${percent}%`;
  if (ui.preloadText) ui.preloadText.textContent = `${percent}%`;
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth) {
    return image.decode ? image.decode().catch(() => {}) : Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    image.addEventListener("load", () => {
      if (image.decode) image.decode().catch(() => {}).then(resolve);
      else resolve();
    }, { once: true });
    image.addEventListener("error", reject, { once: true });
  });
}

function preloadImageSource(src) {
  const image = new Image();
  image.src = src;
  return waitForImage(image);
}

async function preloadFetchAsset(src) {
  const response = await fetch(src, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to preload ${src}`);
  await response.blob();
}

async function preloadGameAssets() {
  ui.menuStart.disabled = true;
  ui.menuRanking.disabled = true;

  const imageElements = [
    mapImage,
    pathMaskImage,
    heroIdleImage,
    heroWalkImage,
    heroAttackImage,
    heroSkill1Image,
    heroSkill2Image,
    heroDeathImage,
    lvbuIdleImage,
    lvbuWalkImage,
    lvbuAttackImage,
    lvbuSkill1Image,
    lvbuSkill2Image,
    lvbuDeathImage,
    knifeSoldierWalkImage,
    knifeSoldierWalkFrontImage,
    knifeSoldierWalkBackImage,
    knifeSoldierAttackImage,
    ironCavalryWalkImage,
    ironCavalryWalkFrontImage,
    ironCavalryWalkBackImage,
    ironCavalryAttackImage,
    warlockWalkImage,
    warlockWalkFrontImage,
    warlockWalkBackImage,
    warlockAttackImage,
    eagleScoutWalkImage,
    eagleScoutWalkFrontImage,
    eagleScoutWalkBackImage,
    eagleScoutAttackImage,
    ...Object.values(towerVisuals).map((visual) => visual.image)
  ];
  const imageSources = [...new Set(cssPreloadImages.map(absoluteUrl))];
  const fetchSources = [
    appState.introSrc,
    mapVideo.src,
    ...AudioSystem.preloadSources()
  ].map(absoluteUrl);
  const tasks = [
    ...imageElements.map((image) => () => waitForImage(image)),
    ...imageSources.map((src) => () => preloadImageSource(src)),
    ...[...new Set(fetchSources)].map((src) => () => preloadFetchAsset(src))
  ];

  let done = 0;
  updatePreloadProgress(done, tasks.length);
  await Promise.all(tasks.map(async (task) => {
    try {
      await task();
    } catch (error) {
      console.warn(error);
    } finally {
      done += 1;
      updatePreloadProgress(done, tasks.length);
    }
  }));

  prepareLoadedSprites();
  ui.menuStart.disabled = false;
  ui.menuRanking.disabled = false;
  ui.preloadScreen.classList.add("is-complete");
}

const paths = [
  {
    id: "left_main",
    name: "左侧主路",
    width: 112,
    points: [
      [0, 364],
      [120, 374],
      [256, 384],
      [386, 391],
      [500, 410],
      [602, 408],
      [694, 366],
      [792, 329],
      [898, 287],
      [1030, 229]
    ]
  },
  {
    id: "top_pass",
    name: "上方中路",
    width: 116,
    points: [
      [768, 0],
      [785, 72],
      [797, 150],
      [797, 235],
      [806, 300],
      [885, 278],
      [970, 246],
      [1030, 229]
    ]
  },
  {
    id: "bottom_pass",
    name: "下方关外路",
    width: 110,
    points: [
      [616, 768],
      [612, 690],
      [610, 612],
      [603, 535],
      [604, 458],
      [640, 403],
      [718, 360],
      [818, 318],
      [930, 270],
      [1030, 229]
    ]
  },
  {
    id: "right_camp",
    name: "右侧营地路",
    width: 112,
    points: [
      [1392, 630],
      [1274, 575],
      [1156, 544],
      [1056, 490],
      [1006, 412],
      [1004, 332],
      [1030, 229]
    ]
  }
].map((path) => ({
  ...path,
  width: scaled(path.width),
  points: path.points.map(([x, y]) => ({ x: scaled(x), y: scaled(y) }))
})).map((path) => ({
  ...path,
  pixelLength: path.points.slice(1).reduce((total, point, index) => {
    const previous = path.points[index];
    return total + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0)
}));

const pathById = Object.fromEntries(paths.map((path) => [path.id, path]));

function entrancePathsForWave() {
  return paths;
}

const slotLayout = {
  upper_mid: { x: scaled(703), y: scaled(242) },
  upper_right: { x: scaled(905), y: scaled(229) },
  middle_left: { x: scaled(481), y: scaled(361) },
  middle_right: { x: scaled(827), y: scaled(371) },
  right_mid: { x: scaled(1043), y: scaled(411) },
  center_mid: { x: scaled(675), y: scaled(428) },
  lower_left: { x: scaled(325), y: scaled(486) },
  lower_right: { x: scaled(855), y: scaled(508) },
  lower_mid_left: { x: scaled(473), y: scaled(526) },
  bottom_right: { x: scaled(1043), y: scaled(569) },
  bottom_mid: { x: scaled(703), y: scaled(575) }
};

const towerColors = {
  arrow_tower: "#d5b15f",
  crossbow_tower: "#a58864",
  magic_tower: "#78b9e8",
  fire_tower: "#e46d3f",
  watchtower: "#9ecf86"
};

const towerLifecycleAnimations = {
  build: { frame_count: 2, duration: 0.36 },
  dismantle: { frame_count: 2, duration: 0.3 },
  ...(level.tower_lifecycle_animations || {})
};

const enemyColors = {
  knife_soldier: "#e0d3bd",
  iron_cavalry: "#b5b8bf",
  warlock: "#a7dcff",
  eagle_scout: "#f3d36b",
  boss_lvbu: "#e55353",
  boss_liubei: "#e55353"
};

function createInitialHeroState() {
  return {
    pathId: "left_main",
    progress: 14.4,
    x: 0,
    y: 0,
    maxHp: level.hero.max_hp || 1200,
    hp: level.hero.initial_hp || level.hero.max_hp || 1200,
    cooldown: 0,
    attackTimer: 0,
    attackDuration: 0,
    action: null,
    isDead: false,
    reviveTimer: 0,
    deathTimer: 0,
    duelEnemyUid: null,
    moveTarget: null,
    movePath: [],
    facing: 1,
    buffCooldown: 0,
    lineCooldown: 0
  };
}

const state = {
  hp: level.base.initial_hp,
  gold: level.economy.initial_gold,
  waveIndex: 0,
  waveActive: false,
  waveStartCountdown: null,
  paused: true,
  speed: 1,
  selectedTowerId: level.towers[0].id,
  selectedSlot: null,
  heroMoveMode: false,
  hoveredSlot: null,
  slots: level.map.tower_slots.map((slot) => ({
    ...slot,
    ...slotLayout[slot.position],
    tower: null
  })),
  enemies: [],
  projectiles: [],
  fireImpacts: [],
  towerAnimations: [],
  spawnQueue: [],
  spawnTimer: 0,
  bossSpawnTimer: null,
  nextEnemyId: 1,
  hero: createInitialHeroState(),
  bossSpeedBuffTimer: 0,
  gameOver: false,
  victory: false,
  uiScale: 1,
  time: 0,
  lastTime: performance.now()
};

function buildLookups() {
  return {
    towers: Object.fromEntries(level.towers.map((tower) => [tower.id, tower])),
    enemies: Object.fromEntries(level.enemies.map((enemy) => [enemy.id, enemy])),
    boss: { ...level.boss, type: "boss", physical_resistance: level.boss.armor, magic_resistance: 0 }
  };
}

const lookup = buildLookups();
const bossSkills = Object.fromEntries(level.boss.skills.map((skill) => [skill.effect, skill]));
const bossDashSkill = bossSkills.dash_forward || { name: "突进", distance: 0, cooldown: Infinity };
const bossSpeedSkill = bossSkills.enemy_speed_up || { name: "号令", value: 0, duration: 0, cooldown: Infinity };
ui.heroPortrait?.style.setProperty(
  "--hero-portrait-image",
  'url("../assets/ui/hero_lvbu_portrait.png?v=20260512-hud-portrait-fix")'
);
const heroStart = interpolatePath(state.hero.progress, pathById[state.hero.pathId]);
state.hero.x = heroStart.x;
state.hero.y = heroStart.y;

function resetHeroPosition() {
  const heroStart = interpolatePath(state.hero.progress, pathById[state.hero.pathId]);
  state.hero.x = heroStart.x;
  state.hero.y = heroStart.y;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function randomPath() {
  return paths[Math.floor(Math.random() * paths.length)];
}

function interpolatePath(progress, path = paths[0]) {
  const clamped = Math.max(0, Math.min(level.map.path_length, progress));
  const segmentScale = level.map.path_length / (path.points.length - 1);
  const rawIndex = Math.min(path.points.length - 2, Math.floor(clamped / segmentScale));
  const localT = (clamped - rawIndex * segmentScale) / segmentScale;
  const a = path.points[rawIndex];
  const b = path.points[rawIndex + 1];
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT
  };
}

function setHeroPathPosition(pathId, progress) {
  const path = pathById[pathId];
  const clampedProgress = Math.max(0, Math.min(level.map.path_length, progress));
  const pos = interpolatePath(clampedProgress, path);
  state.hero.pathId = pathId;
  state.hero.progress = clampedProgress;
  state.hero.x = pos.x;
  state.hero.y = pos.y;
}

function closestPointOnSinglePath(point, path) {
  let best = {
    x: path.points[0].x,
    y: path.points[0].y,
    progress: 0,
    pathId: path.id,
    pathWidth: path.width,
    distance: Infinity
  };

  const segmentScale = level.map.path_length / (path.points.length - 1);
  for (let index = 0; index < path.points.length - 1; index += 1) {
    const a = path.points[index];
    const b = path.points[index + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
    const x = a.x + dx * t;
    const y = a.y + dy * t;
    const candidateDistance = Math.hypot(point.x - x, point.y - y);
    if (candidateDistance < best.distance) {
      best = { x, y, progress: (index + t) * segmentScale, pathId: path.id, pathWidth: path.width, distance: candidateDistance };
    }
  }

  return best;
}

function closestPointOnPath(point) {
  return paths
    .map((path) => closestPointOnSinglePath(point, path))
    .sort((a, b) => a.distance - b.distance)[0];
}

function isGreenMaskPixel(x, y) {
  const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  const [r, g, b, a] = pathMask.ctx.getImageData(px, py, 1, 1).data;
  return a > 0 && g > 180 && r < 80 && b < 80;
}

function buildPathMaskGrid() {
  pathMask.cols = Math.ceil(canvas.width / NAV_CELL);
  pathMask.rows = Math.ceil(canvas.height / NAV_CELL);
  pathMask.grid = new Array(pathMask.cols * pathMask.rows).fill(false);

  for (let row = 0; row < pathMask.rows; row += 1) {
    for (let col = 0; col < pathMask.cols; col += 1) {
      const x = col * NAV_CELL + NAV_CELL / 2;
      const y = row * NAV_CELL + NAV_CELL / 2;
      const offset = NAV_CELL * 0.3;
      pathMask.grid[row * pathMask.cols + col] =
        isGreenMaskPixel(x, y) ||
        isGreenMaskPixel(x - offset, y) ||
        isGreenMaskPixel(x + offset, y) ||
        isGreenMaskPixel(x, y - offset) ||
        isGreenMaskPixel(x, y + offset);
    }
  }
}

function navIndex(col, row) {
  return row * pathMask.cols + col;
}

function isWalkableCell(col, row) {
  return col >= 0 && row >= 0 && col < pathMask.cols && row < pathMask.rows && pathMask.grid[navIndex(col, row)];
}

function cellCenter(cell) {
  return {
    x: cell.col * NAV_CELL + NAV_CELL / 2,
    y: cell.row * NAV_CELL + NAV_CELL / 2
  };
}

function nearestWalkableCell(point) {
  const startCol = Math.max(0, Math.min(pathMask.cols - 1, Math.floor(point.x / NAV_CELL)));
  const startRow = Math.max(0, Math.min(pathMask.rows - 1, Math.floor(point.y / NAV_CELL)));
  let best = null;
  let bestDistance = Infinity;
  const maxRadius = Math.max(pathMask.cols, pathMask.rows);

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let row = startRow - radius; row <= startRow + radius; row += 1) {
      for (let col = startCol - radius; col <= startCol + radius; col += 1) {
        if (Math.abs(col - startCol) !== radius && Math.abs(row - startRow) !== radius) continue;
        if (!isWalkableCell(col, row)) continue;
        const center = cellCenter({ col, row });
        const currentDistance = Math.hypot(center.x - point.x, center.y - point.y);
        if (currentDistance < bestDistance) {
          best = { col, row };
          bestDistance = currentDistance;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function findMaskRoute(startPoint, endPoint) {
  if (!pathMask.ready) return null;
  const start = nearestWalkableCell(startPoint);
  const goal = nearestWalkableCell(endPoint);
  if (!start || !goal) return null;

  const startIndex = navIndex(start.col, start.row);
  const goalIndex = navIndex(goal.col, goal.row);
  const cameFrom = new Int32Array(pathMask.grid.length).fill(-1);
  const gScore = new Float64Array(pathMask.grid.length).fill(Infinity);
  const closed = new Uint8Array(pathMask.grid.length);
  const open = [{ col: start.col, row: start.row, index: startIndex, f: 0 }];
  gScore[startIndex] = 0;

  const heuristic = (col, row) => Math.hypot(col - goal.col, row - goal.row);
  const directions = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2]
  ];

  while (open.length > 0) {
    open.sort((a, b) => b.f - a.f);
    const current = open.pop();
    if (closed[current.index]) continue;
    if (current.index === goalIndex) {
      const route = [];
      let cursor = goalIndex;
      while (cursor !== -1) {
        const row = Math.floor(cursor / pathMask.cols);
        const col = cursor % pathMask.cols;
        route.push(cellCenter({ col, row }));
        cursor = cameFrom[cursor];
      }
      route.reverse();
      route.push({ x: endPoint.x, y: endPoint.y });
      return route.filter((point, index) => index === 0 || index === route.length - 1 || index % 2 === 0);
    }

    closed[current.index] = 1;
    directions.forEach(([dx, dy, cost]) => {
      const col = current.col + dx;
      const row = current.row + dy;
      if (!isWalkableCell(col, row)) return;
      const nextIndex = navIndex(col, row);
      if (closed[nextIndex]) return;
      const tentative = gScore[current.index] + cost;
      if (tentative >= gScore[nextIndex]) return;
      cameFrom[nextIndex] = current.index;
      gScore[nextIndex] = tentative;
      open.push({ col, row, index: nextIndex, f: tentative + heuristic(col, row) });
    });
  }

  return null;
}

function isPointInsidePathMask(point) {
  if (!pathMask.ready) return null;
  return isGreenMaskPixel(point.x, point.y);
}

function canTarget(tower, enemy) {
  if (tower.target_type === "air_ground") return true;
  if (tower.target_type === "air") return enemy.type === "flying";
  return enemy.type !== "flying";
}

function createEnemy(enemyId, isBoss = false, pathId = null) {
  const base = isBoss ? lookup.boss : lookup.enemies[enemyId];
  const path = pathById[pathId] || randomPath();
  const pos = interpolatePath(0, path);
  return {
    ...base,
    id: isBoss ? base.id : enemyId,
    uid: state.nextEnemyId++,
    maxHp: base.hp,
    currentHp: base.hp,
    pathId: path.id,
    progress: 0,
    x: pos.x,
    y: pos.y,
    facing: 1,
    walkDirection: "side",
    fireDot: 0,
    fireDps: 0,
    attackCooldown: 0,
    attackTimer: 0,
    attackDuration: 0,
    action: null,
    bossHeroSkillIndex: 0,
    showHealthBar: false,
    dashCooldown: isBoss ? bossDashSkill.cooldown : 0,
    roarCooldown: isBoss ? bossSpeedSkill.cooldown : 0,
    isBoss
  };
}

function flattenWaveUnits(wave) {
  const queue = [];
  const entrancePathIds = entrancePathsForWave(wave).map((path) => path.id);
  wave.units.forEach((unit) => {
    for (let i = 0; i < unit.count; i += 1) {
      queue.push({
        enemyId: unit.enemy_id,
        pathId: entrancePathIds[Math.floor(Math.random() * entrancePathIds.length)]
      });
    }
  });
  return queue;
}

function startWave(pathId = null) {
  if (state.gameOver || state.victory || state.waveActive) return;
  AudioSystem.unlock();
  AudioSystem.waveStart(state.waveIndex);
  const wave = level.waves[state.waveIndex];
  if (!wave) return;
  state.waveActive = true;
  state.waveStartCountdown = 0;
  state.spawnQueue = flattenWaveUnits(wave);
  state.spawnTimer = 0;
  state.bossSpawnTimer = wave.boss ? wave.boss_delay : null;
}

function buildTower(slot, towerId = state.selectedTowerId) {
  const towerConfig = lookup.towers[towerId];
  if (slot.tower || state.gold < towerConfig.cost) return;
  const animation = towerLifecycleAnimations.build;
  state.selectedTowerId = towerId;
  state.gold -= towerConfig.cost;
  slot.tower = {
    ...towerConfig,
    level: 1,
    buildCost: towerConfig.cost,
    cooldown: 0,
    muzzleIndex: 0,
    lifecycleAnimation: {
      type: "build",
      elapsed: 0,
      duration: animation.duration
    }
  };
  AudioSystem.build(towerId);
  hideTowerPopup();
}

function upgradeTower(slot) {
  if (!slot.tower || slot.tower.level >= 3) return;
  const cost = slot.tower.upgrade_cost[slot.tower.level - 1];
  if (state.gold < cost) return;
  state.gold -= cost;
  slot.tower.level += 1;
  slot.tower.attack = Math.round(slot.tower.attack * 1.45);
  slot.tower.range += 0.45;
  AudioSystem.upgrade();
  hideTowerPopup();
}

function sellTower(slot) {
  if (!slot.tower) return;
  const refund = Math.floor(slot.tower.buildCost * 0.8);
  const animation = towerLifecycleAnimations.dismantle;
  AudioSystem.dismantle();
  state.gold += refund;
  state.towerAnimations.push({
    type: "dismantle",
    slotId: slot.slot_id,
    x: slot.x,
    y: slot.y,
    tower: { ...slot.tower },
    elapsed: 0,
    duration: animation.duration
  });
  slot.tower = null;
  hideTowerPopup();
}

function dealDamage(enemy, amount, damageType, source = "unknown") {
  const hpBefore = enemy.currentHp;
  const resistance = damageType === "physical" ? enemy.physical_resistance || 0 : enemy.magic_resistance || 0;
  const finalDamage = Math.max(1, amount * (1 - resistance));
  enemy.currentHp -= finalDamage;
  if (hpBefore > 0 && enemy.currentHp <= 0) {
    enemy.killedBy = source;
  }
  if (enemy.currentHp > 0 && enemy.currentHp < enemy.maxHp) {
    enemy.showHealthBar = true;
  }
  return finalDamage;
}

function damageHero(amount, sourceName) {
  const hero = state.hero;
  if (hero.isDead || state.gameOver || state.victory) return;
  hero.hp = Math.max(0, hero.hp - amount * (level.hero.damage_taken_multiplier || 1));
  if (hero.hp > 0) return;

  hero.isDead = true;
  hero.reviveTimer = level.hero.revive_cooldown || 30;
  hero.deathTimer = 0;
  hero.moveTarget = null;
  hero.movePath = [];
  hero.attackTimer = 0;
  hero.attackDuration = 0;
  hero.action = "dead";
  hero.duelEnemyUid = null;
  state.heroMoveMode = false;
  AudioSystem.heroDeath();
}

function heroEngageRange(enemy) {
  return scaled(enemy.isBoss ? 74 : 58);
}

function updateEnemyWalkDirection(enemy, dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy) * 0.72) {
    enemy.walkDirection = "side";
    if (Math.abs(dx) > 0.5) enemy.facing = dx > 0 ? 1 : -1;
    return;
  }
  enemy.walkDirection = dy > 0 ? "front" : "back";
}

function getHeroDuelEnemy() {
  return state.enemies.find((enemy) => enemy.uid === state.hero.duelEnemyUid && enemy.currentHp > 0) || null;
}

function refreshHeroDuel() {
  const hero = state.hero;
  if (hero.isDead || hero.moveTarget) {
    hero.duelEnemyUid = null;
    return null;
  }

  const current = getHeroDuelEnemy();
  if (current && distance(current, hero) <= scaled(105)) return current;

  const next = state.enemies
    .filter((enemy) => enemy.currentHp > 0 && distance(enemy, hero) <= heroEngageRange(enemy))
    .sort((a, b) => b.progress - a.progress)[0];
  hero.duelEnemyUid = next ? next.uid : null;
  return next || null;
}

function killEnemy(enemy) {
  state.gold += enemy.reward_gold || 0;
  if (enemy.uid === state.hero.duelEnemyUid) state.hero.duelEnemyUid = null;
}

function updateSpawning(dt) {
  if (!state.waveActive) return;
  const wave = level.waves[state.waveIndex];
  state.spawnTimer -= dt;
  if (state.spawnQueue.length && state.spawnTimer <= 0) {
    const spawn = state.spawnQueue.shift();
    state.enemies.push(createEnemy(spawn.enemyId, false, spawn.pathId));
    state.spawnTimer = wave.spawn_interval;
  }
  if (state.bossSpawnTimer !== null) {
    state.bossSpawnTimer -= dt;
    if (state.bossSpawnTimer <= 0) {
      state.enemies.push(createEnemy(wave.boss, true));
      state.bossSpawnTimer = null;
    }
  }
}

function triggerBossHeroSkill(enemy) {
  if (enemy.id !== "boss_liubei" || enemy.bossHeroSkillIndex >= 2) return false;
  const skillIndex = enemy.bossHeroSkillIndex;
  const skillSprite = skillIndex === 0 ? heroSkill1Sprite : heroSkill2Sprite;
  const fallbackSprite = heroAttackSprite;
  const sprite = skillSprite.ready ? skillSprite : fallbackSprite;
  const skillDamageMultiplier = skillIndex === 0 ? 1.1 : 1.25;
  enemy.bossHeroSkillIndex += 1;
  enemy.action = skillIndex === 0 ? "skill1" : "skill2";
  enemy.attackDuration = sprite.ready ? sprite.frameCount / sprite.fps : 0.55;
  enemy.attackTimer = enemy.attackDuration;
  enemy.attackCooldown = Math.max(enemy.attackDuration, 0.7);
  enemy.facing = state.hero.x < enemy.x ? -1 : 1;
  updateEnemyWalkDirection(enemy, state.hero.x - enemy.x, state.hero.y - enemy.y);
  damageHero((enemy.attack || 25) * skillDamageMultiplier, `${enemy.name}${skillIndex === 0 ? "·龙魂突进" : "·仁德号令"}`);
  AudioSystem.enemyAttack(enemy.id);
  if (skillIndex === 1) state.bossSpeedBuffTimer = bossSpeedSkill.duration;
  return true;
}

function updateEnemies(dt) {
  const speedMultiplier = state.bossSpeedBuffTimer > 0 ? 1 + bossSpeedSkill.value : 1;
  const duelEnemy = refreshHeroDuel();
  state.enemies.forEach((enemy) => {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    if (enemy.attackTimer <= 0) enemy.action = null;
    if (enemy.fireDot > 0) {
      enemy.fireDot -= dt;
      dealDamage(enemy, enemy.fireDps * dt, "magic", "tower");
    }

    if (enemy.isBoss) {
      enemy.dashCooldown -= dt;
      enemy.roarCooldown -= dt;
      if (enemy.dashCooldown <= 0) {
        enemy.progress += bossDashSkill.distance;
        enemy.dashCooldown = bossDashSkill.cooldown;
      }
      if (enemy.roarCooldown <= 0) {
        state.bossSpeedBuffTimer = bossSpeedSkill.duration;
        enemy.roarCooldown = bossSpeedSkill.cooldown;
      }
    }

    const canFightHero = duelEnemy && enemy.uid === duelEnemy.uid && distance(enemy, state.hero) <= heroEngageRange(enemy);
    if (canFightHero) {
      updateEnemyWalkDirection(enemy, state.hero.x - enemy.x, state.hero.y - enemy.y);
      if (enemy.attackCooldown <= 0) {
        if (triggerBossHeroSkill(enemy)) return;
        damageHero(enemy.attack || 25, enemy.name);
        AudioSystem.enemyAttack(enemy.id);
        enemy.attackCooldown = enemy.attack_interval || 1.4;
        const enemyAttackSprite =
          enemy.id === "knife_soldier"
            ? knifeSoldierAttackSprite
            : enemy.id === "iron_cavalry"
              ? ironCavalryAttackSprite
              : enemy.id === "warlock"
                ? warlockAttackSprite
                : enemy.id === "eagle_scout"
                  ? eagleScoutAttackSprite
                  : enemy.id === "boss_lvbu"
                    ? lvbuAttackSprite
                    : enemy.id === "boss_liubei"
                      ? heroAttackSprite
                    : null;
        if (enemyAttackSprite) {
          enemy.attackDuration = enemyAttackSprite.frameCount / enemyAttackSprite.fps;
          enemy.attackTimer = enemy.attackDuration;
        }
      }
    } else {
      const previousX = enemy.x;
      const previousY = enemy.y;
      enemy.progress += enemy.move_speed * speedMultiplier * dt;
      const nextPos = interpolatePath(enemy.progress, pathById[enemy.pathId]);
      updateEnemyWalkDirection(enemy, nextPos.x - previousX, nextPos.y - previousY);
    }
    const pos = interpolatePath(enemy.progress, pathById[enemy.pathId]);
    enemy.x = pos.x;
    enemy.y = pos.y;
  });

  const leaked = state.enemies.filter((enemy) => enemy.progress >= level.map.path_length);
  leaked.forEach((enemy) => {
    state.hp = Math.max(0, state.hp - enemy.leak_damage);
  });
  state.enemies = state.enemies.filter((enemy) => enemy.progress < level.map.path_length && enemy.currentHp > 0);
  if (!getHeroDuelEnemy()) state.hero.duelEnemyUid = null;
  leaked.length && checkGameOver();
}

function towerMuzzleDirection(slot, target) {
  const dx = target.x - slot.x;
  const dy = target.y - slot.y;
  if (Math.abs(dx) > Math.abs(dy) * 0.75) return dx < 0 ? "left" : "right";
  return dy < 0 ? "back" : "front";
}

function towerMuzzlePoint(slot, tower, target) {
  const visual = towerVisual(tower);
  const muzzles = visual?.muzzles || tower.visual?.muzzles;
  if (!muzzles) return { x: slot.x, y: slot.y - scaled(24) };

  const direction = towerMuzzleDirection(slot, target);
  const candidates = muzzles[direction] || muzzles.front || Object.values(muzzles)[0];
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const muzzle = list[tower.muzzleIndex % list.length] || { x: 0, y: -24 };
  tower.muzzleIndex = (tower.muzzleIndex + 1) % list.length;
  return {
    x: slot.x + scaled(muzzle.x),
    y: slot.y + scaled(muzzle.y)
  };
}

function updateTowers(dt) {
  state.slots.forEach((slot) => {
    if (!slot.tower) return;
    const tower = slot.tower;
    if (tower.lifecycleAnimation) {
      tower.lifecycleAnimation.elapsed += dt;
      if (tower.lifecycleAnimation.elapsed >= tower.lifecycleAnimation.duration) {
        tower.lifecycleAnimation = null;
      }
      return;
    }
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;

    const pxRange = tower.range * scaled(58);
    const target = state.enemies
      .filter((enemy) => canTarget(tower, enemy) && distance(slot, enemy) <= pxRange)
      .sort((a, b) => b.progress - a.progress)[0];
    if (!target) return;

    dealDamage(target, tower.attack, tower.damage_type, "tower");
    if (tower.id === "fire_tower") {
      target.fireDot = tower.dot_duration || 3;
      target.fireDps = tower.attack * 0.35;
      target.fireLevel = tower.level;
    }
    const muzzle = towerMuzzlePoint(slot, tower, target);
    if (tower.id === "arrow_tower") {
      state.projectiles.push({
        type: "arrow",
        level: tower.level,
        x1: muzzle.x,
        y1: muzzle.y,
        x2: target.x,
        y2: target.y - scaled(target.type === "flying" ? 18 : 12),
        life: Math.max(0.16, 0.28 - tower.level * 0.035),
        duration: Math.max(0.16, 0.28 - tower.level * 0.035),
        color: tower.level >= 3 ? "#f06cff" : tower.level === 2 ? "#c889ff" : "#f1d08a"
      });
    } else if (tower.id === "crossbow_tower") {
      state.projectiles.push({
        type: "bolt",
        level: tower.level,
        x1: muzzle.x,
        y1: muzzle.y,
        x2: target.x,
        y2: target.y - scaled(12),
        life: Math.max(0.18, 0.34 - tower.level * 0.04),
        duration: Math.max(0.18, 0.34 - tower.level * 0.04),
        color: tower.level >= 3 ? "#8dff6f" : tower.level === 2 ? "#6fe86d" : "#9ddf6b"
      });
    } else if (tower.id === "magic_tower") {
      state.projectiles.push({
        type: "magic",
        level: tower.level,
        x1: muzzle.x,
        y1: muzzle.y,
        x2: target.x,
        y2: target.y - scaled(14),
        life: Math.max(0.24, 0.42 - tower.level * 0.04),
        duration: Math.max(0.24, 0.42 - tower.level * 0.04),
        color: tower.level >= 3 ? "#b8f7ff" : tower.level === 2 ? "#6bdcff" : "#4ebcff"
      });
    } else if (tower.id === "fire_tower") {
      state.projectiles.push({
        type: "fireball",
        level: tower.level,
        x1: muzzle.x,
        y1: muzzle.y,
        x2: target.x,
        y2: target.y - scaled(target.type === "flying" ? 18 : 12),
        life: Math.max(0.24, 0.46 - tower.level * 0.045),
        duration: Math.max(0.24, 0.46 - tower.level * 0.045),
        color: tower.level >= 3 ? "#ff4a1c" : tower.level === 2 ? "#ff7d22" : "#ff9d2e",
        targetType: target.type
      });
    } else if (tower.id === "watchtower") {
      state.projectiles.push({
        type: "stoneball",
        level: tower.level,
        x1: muzzle.x,
        y1: muzzle.y,
        x2: target.x,
        y2: target.y - scaled(18),
        life: Math.max(0.24, 0.44 - tower.level * 0.04),
        duration: Math.max(0.24, 0.44 - tower.level * 0.04),
        color: "#1f1f1f"
      });
    } else {
      state.projectiles.push({ x1: muzzle.x, y1: muzzle.y, x2: target.x, y2: target.y, life: 0.12, color: towerColors[tower.id] });
    }
    AudioSystem.projectile(tower.id);
    tower.cooldown = tower.attack_speed;
  });
}

function updateTowerAnimations(dt) {
  state.towerAnimations.forEach((animation) => {
    animation.elapsed += dt;
  });
  state.towerAnimations = state.towerAnimations.filter((animation) => animation.elapsed < animation.duration);
}

function updateHero(dt) {
  const hero = state.hero;
  if (hero.isDead) {
    hero.reviveTimer = Math.max(0, hero.reviveTimer - dt);
    hero.deathTimer += dt;
    hero.attackTimer = 0;
    hero.action = "dead";
    state.bossSpeedBuffTimer = Math.max(0, state.bossSpeedBuffTimer - dt);
    if (hero.reviveTimer <= 0) {
      hero.hp = hero.maxHp;
      hero.isDead = false;
      hero.action = null;
      hero.deathTimer = 0;
    }
    return;
  }

  hero.cooldown -= dt;
  hero.attackTimer = Math.max(0, hero.attackTimer - dt);
  if (hero.attackTimer <= 0) hero.action = null;
  hero.buffCooldown = Math.max(0, hero.buffCooldown - dt);
  hero.lineCooldown = Math.max(0, hero.lineCooldown - dt);
  state.bossSpeedBuffTimer = Math.max(0, state.bossSpeedBuffTimer - dt);

  const duelEnemyBeforeMove = getHeroDuelEnemy();
  const isRecovering = hero.attackTimer <= 0 && !hero.action && !duelEnemyBeforeMove && !hero.moveTarget && hero.hp < hero.maxHp;
  if (isRecovering) {
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * (level.hero.regen_per_second ?? 0.018) * dt);
  }

  if (hero.moveTarget) {
    const dx = hero.moveTarget.x - hero.x;
    const dy = hero.moveTarget.y - hero.y;
    const remaining = Math.hypot(dx, dy);
    const step = scaled(260) * dt;
    const previousX = hero.x;

    if (remaining <= step) {
      hero.x = hero.moveTarget.x;
      hero.y = hero.moveTarget.y;
      hero.moveTarget = hero.movePath.shift() || null;
    } else {
      hero.x += (dx / remaining) * step;
      hero.y += (dy / remaining) * step;
    }
    hero.facing = hero.x < previousX ? -1 : 1;
    return;
  }

  if (hero.cooldown <= 0) {
    const duelEnemy = refreshHeroDuel();
    const target =
      duelEnemy ||
      state.enemies
        .filter((enemy) => distance(hero, enemy) <= scaled(95))
        .sort((a, b) => b.progress - a.progress)[0];
    if (target) {
      dealDamage(target, level.hero.attack, "physical", "hero");
      hero.cooldown = level.hero.attack_interval;
      const sprites = defenderSpriteSet();
      hero.attackDuration = sprites.attack.frameCount / sprites.attack.fps;
      hero.attackTimer = hero.attackDuration;
      hero.action = "attack";
      hero.facing = target.x < hero.x ? -1 : 1;
      AudioSystem.heroAttack();
    }
  }
}

function cleanupKilled() {
  const killed = state.enemies.filter((enemy) => enemy.currentHp <= 0);
  killed.forEach((enemy) => AudioSystem.enemyDeath(enemy));
  killed.forEach(killEnemy);
  state.enemies = state.enemies.filter((enemy) => enemy.currentHp > 0);
}

function finishWaveIfReady() {
  if (!state.waveActive) return;
  const noMoreSpawns = state.spawnQueue.length === 0 && state.bossSpawnTimer === null;
  if (!noMoreSpawns || state.enemies.length > 0) return;

  const wave = level.waves[state.waveIndex];
  state.gold += wave.reward;
  state.waveActive = false;
  state.waveIndex += 1;
  if (state.waveIndex >= level.waves.length) showResult(true);
  else state.waveStartCountdown = 3;
}

function updateWaveAutoStart(dt) {
  if (state.waveActive || state.gameOver || state.victory || state.waveIndex >= level.waves.length) return;
  if (state.waveStartCountdown === null) return;
  state.waveStartCountdown = Math.max(0, state.waveStartCountdown - dt);
  if (state.waveStartCountdown <= 0) startWave();
}

function checkGameOver() {
  if (state.hp <= 0) showResult(false);
}

function starsForHp(hp) {
  if (hp >= level.star_rules.three_star.min_hp) return 3;
  if (hp >= level.star_rules.two_star.min_hp) return 2;
  if (hp >= level.star_rules.one_star.min_hp) return 1;
  return 0;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function calculateResultScore(stars, hp, completionTime, victory) {
  const maxHp = level.base.max_hp;
  const hpLost = Math.max(0, maxHp - hp);
  const starScore = victory ? stars * 3000 : 0;
  const hpScore = victory ? hp * 260 : 0;
  const timeScore = victory ? Math.max(0, 3600 - Math.floor(completionTime * 12)) : 0;
  const score = starScore + hpScore + timeScore;

  return {
    score,
    stars,
    victory,
    hp,
    hpLost,
    completionTime,
    starScore,
    hpScore,
    timeScore
  };
}

function loadRankingRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RANKING_STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function saveRankingRecord(result, playerName = "") {
  const records = loadRankingRecords();
  const trimmedName = playerName.trim();
  const nextRecord = {
    ...result,
    levelId: level.level_id,
    levelName: level.level_name,
    player: trimmedName || `玩家 ${records.length + 1}`,
    completedAt: new Date().toISOString()
  };
  const nextRecords = [...records, nextRecord]
    .sort(
      (a, b) =>
        Number(b.victory !== false) - Number(a.victory !== false) ||
        b.score - a.score ||
        a.completionTime - b.completionTime ||
        b.hp - a.hp
    )
    .slice(0, MAX_RANKING_RECORDS);

  try {
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {
    return {
      record: nextRecord,
      rank: 1,
      records: [nextRecord]
    };
  }

  return {
    record: nextRecord,
    rank: nextRecords.findIndex((record) => record.completedAt === nextRecord.completedAt) + 1,
    records: nextRecords
  };
}

function renderRanking(records = loadRankingRecords()) {
  if (!ui.rankingList) return;
  const visibleRecords = records.slice(0, MAX_RANKING_RECORDS);
  if (visibleRecords.length === 0) {
    ui.rankingList.innerHTML = `<p class="ranking-empty">暂无通关记录</p>`;
    return;
  }

  ui.rankingList.innerHTML = visibleRecords
    .map((record, index) => {
      const date = record.completedAt ? new Date(record.completedAt) : null;
      const dateText = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("zh-CN") : "历史记录";
      return `
        <div class="ranking-row">
          <strong>${index + 1}</strong>
          <div>
            <b>${record.player || "玩家"}</b>
            <span>${record.victory !== false ? "通关" : "失败"} · ${record.stars} 星 · ${formatTime(record.completionTime)} · 剩余城防 ${record.hp}/${level.base.max_hp}</span>
          </div>
          <em>${record.score}</em>
          <small>${dateText}</small>
        </div>
      `;
    })
    .join("");
}

function resultStarsText(stars) {
  return "★".repeat(stars) + "☆".repeat(Math.max(0, 3 - stars));
}

function renderResultRanking(records, currentRecord) {
  if (!ui.resultRanking) return;
  const topRows = records.slice(0, 5);
  const currentInTopRows = topRows.some((record) => record.completedAt === currentRecord.completedAt);
  const rows = currentInTopRows ? topRows : [...records.slice(0, 4), currentRecord];
  if (rows.length === 0) {
    ui.resultRanking.innerHTML = "";
    return;
  }

  ui.resultRanking.innerHTML = `
    <h3>Ranking</h3>
    <div class="result-ranking-list">
      ${rows
        .map((record, index) => {
          const isCurrent = record.completedAt === currentRecord.completedAt;
          const rank = records.findIndex((candidate) => candidate.completedAt === record.completedAt) + 1 || index + 1;
          return `
            <div class="result-ranking-row${isCurrent ? " current" : ""}">
              <strong>${rank}</strong>
              <span>${record.victory !== false ? "通关" : "失败"} · ${record.stars} 星 · ${formatTime(record.completionTime)}</span>
              <em>${record.score}</em>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function openRanking(records) {
  renderRanking(records);
  ui.rankingModal.classList.remove("hidden");
}

let pendingResult = null;

function renderResultNameEntry() {
  ui.resultRanking.classList.remove("hidden");
  ui.resultRanking.classList.add("is-name-entry");
  ui.resultRanking.innerHTML = `
    <div class="result-name-form">
      <label for="resultPlayerName">输入姓名</label>
      <input id="resultPlayerName" type="text" maxlength="12" autocomplete="off" placeholder="玩家姓名" />
    </div>
  `;
  window.setTimeout(() => ui.resultRanking.querySelector("#resultPlayerName")?.focus(), 0);
}

function setResultActions(mode) {
  document.querySelector(".result-actions")?.classList.toggle("is-success", mode === "success");
  ui.resultNext.classList.toggle("hidden", mode !== "success");
  ui.resultRestart.classList.toggle("hidden", mode !== "failure");
  ui.resultBack.classList.toggle("hidden", mode !== "failure");
}

function submitResultToRanking() {
  if (!pendingResult) return;
  const playerName = ui.resultRanking.querySelector("#resultPlayerName")?.value || "";
  const ranking = saveRankingRecord(pendingResult, playerName);
  pendingResult = null;
  ui.resultModal.classList.add("hidden");
  openRanking(ranking.records);
}

function showResult(victory) {
  if (state.gameOver || state.victory) return;
  state.gameOver = !victory;
  state.victory = victory;
  ui.resultModal.classList.toggle("is-success", victory);
  ui.resultModal.classList.toggle("is-failure", !victory);
  const stars = victory ? starsForHp(state.hp) : 0;
  ui.resultModal.classList.toggle("stars-1", victory && stars === 1);
  ui.resultModal.classList.toggle("stars-2", victory && stars === 2);
  ui.resultModal.classList.toggle("stars-3", victory && stars === 3);
  const result = calculateResultScore(stars, Math.max(0, state.hp), state.time, victory);
  const resultTimeText = formatTime(state.time).replace(":", "");
  pendingResult = victory ? result : null;
  ui.resultStars.textContent = resultStarsText(stars);
  ui.resultTitle.textContent = victory ? "通关完成" : "防线失守";
  ui.resultBody.textContent = victory
    ? `剩余城防 ${Math.max(0, state.hp)}/${level.base.max_hp} · ${formatTime(state.time)}`
    : `城防归零 · ${formatTime(state.time)}`;
  ui.resultScore.innerHTML = `
    <strong>${resultTimeText}</strong>
    <span>本局用时</span>
    <small>${stars} 星 · 耗血 ${result.hpLost}</small>
  `;
  if (victory) {
    renderResultNameEntry();
    setResultActions("success");
  } else {
    ui.resultRanking.classList.add("hidden");
    ui.resultRanking.classList.remove("is-name-entry");
    ui.resultRanking.innerHTML = "";
    setResultActions("failure");
  }
  ui.resultModal.classList.remove("hidden");
  AudioSystem.result(victory);
}

function damageEnemiesAroundHero(skill, damageType) {
  const radius = scaled((skill.radius || 2.5) * 58);
  let hitCount = 0;
  state.enemies.forEach((enemy) => {
    if (distance(state.hero, enemy) <= radius) {
      dealDamage(enemy, skill.damage, damageType, "hero");
      hitCount += 1;
    }
  });
  return hitCount;
}

function useBuffSkill() {
  const skill = level.hero.skills[0];
  if (state.hero.buffCooldown > 0 || state.hero.isDead || state.gameOver) return;
  const hitCount = damageEnemiesAroundHero(skill, "physical");
  const sprites = defenderSpriteSet();
  state.hero.buffCooldown = skill.cooldown;
  state.hero.attackDuration = sprites.skill1.ready ? sprites.skill1.frameCount / sprites.skill1.fps : 0.35;
  state.hero.attackTimer = state.hero.attackDuration;
  state.hero.action = "skill1";
  AudioSystem.heroAttack(true);
}

function useLineSkill() {
  const skill = level.hero.skills[1];
  if (state.hero.lineCooldown > 0 || state.hero.isDead || state.gameOver) return;
  const sprites = defenderSpriteSet();
  const hitCount = damageEnemiesAroundHero(skill, "magic");
  state.hero.lineCooldown = skill.cooldown;
  state.hero.attackDuration = sprites.skill2.ready ? sprites.skill2.frameCount / sprites.skill2.fps : 0.35;
  state.hero.attackTimer = state.hero.attackDuration;
  state.hero.action = "skill2";
  AudioSystem.heroAttack(true);
}

function updateProjectiles(dt) {
  state.projectiles.forEach((projectile) => {
    projectile.life -= dt;
    if (projectile.type === "fireball" && projectile.life <= 0 && !projectile.hasImpacted) {
      projectile.hasImpacted = true;
      state.fireImpacts.push(createFireImpact(projectile));
    }
  });
  state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0);
}

function createFireImpact(projectile) {
  const level = projectile.level || 1;
  const sparkCount = 5 + level * 4;
  const smokeCount = 3 + level * 2;
  return {
    x: projectile.x2,
    y: projectile.y2 + scaled(projectile.targetType === "flying" ? 12 : 18),
    level,
    life: 0.5 + level * 0.14,
    duration: 0.5 + level * 0.14,
    radius: scaled(14 + level * 7),
    sparks: Array.from({ length: sparkCount }, (_, index) => {
      const angle = (Math.PI * 2 * index) / sparkCount + Math.random() * 0.55;
      const speed = scaled(16 + Math.random() * (18 + level * 12));
      return {
        angle,
        speed,
        size: scaled(1.2 + Math.random() * (1.2 + level * 0.45)),
        lifeOffset: Math.random() * 0.16
      };
    }),
    smoke: Array.from({ length: smokeCount }, () => ({
      angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.35,
      speed: scaled(8 + Math.random() * (10 + level * 4)),
      size: scaled(7 + Math.random() * (7 + level * 3)),
      drift: (Math.random() - 0.5) * scaled(10)
    }))
  };
}

function updateFireImpacts(dt) {
  state.fireImpacts.forEach((impact) => {
    impact.life -= dt;
  });
  state.fireImpacts = state.fireImpacts.filter((impact) => impact.life > 0);
}

function update(dt) {
  if (state.paused || state.gameOver || state.victory) return;
  const cappedDt = Math.min(0.08, dt);
  updateWaveAutoStart(cappedDt);
  const scaledDt = cappedDt * state.speed;
  state.time += scaledDt;
  updateSpawning(scaledDt);
  updateEnemies(scaledDt);
  updateTowers(scaledDt);
  updateTowerAnimations(scaledDt);
  updateHero(scaledDt);
  cleanupKilled();
  updateProjectiles(scaledDt);
  updateFireImpacts(scaledDt);
  finishWaveIfReady();
}

function drawPath() {
  // Path regions are intentionally hidden during play. See assets/path_mask.png
  // for the invisible placement mask used by hero movement and future pathing.
}

function drawBlob(points, fill, stroke = null) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 8;
    ctx.stroke();
  }
}

function drawTerrain() {
  if (mapVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && mapVideo.videoWidth > 0) {
    ctx.drawImage(mapVideo, 0, 0, canvas.width, canvas.height);
    return;
  }
  if (mapImage.complete && mapImage.naturalWidth > 0) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.fillStyle = "#a98256";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function towerAnimationProgress(animation) {
  if (!animation) return 1;
  const config = towerLifecycleAnimations[animation.type] || animation;
  const frameCount = Math.max(1, config.frame_count || 1);
  const rawProgress = Math.min(1, animation.elapsed / animation.duration);
  return frameCount === 1 ? rawProgress : Math.ceil(rawProgress * frameCount) / frameCount;
}

function towerVisual(tower) {
  return towerVisuals[`${tower.id}:${tower.level}`] || null;
}

function drawTowerBody(tower, progress = 1, alpha = 1) {
  const clampedProgress = Math.max(0.15, Math.min(1, progress));
  const visual = towerVisual(tower);
  ctx.globalAlpha *= alpha;
  ctx.scale(clampedProgress, clampedProgress);
  if (visual?.image.complete && visual.image.naturalWidth > 0) {
    const width = scaled(visual.display_width || 96);
    const height = scaled(visual.display_height || 72);
    const yOffset = scaled(visual.y_offset || 0);
    if ((visual.frame_count || 1) > 1) {
      const frame = visualFrame(visual);
      ctx.drawImage(visual.image, frame.sx, frame.sy, frame.sw, frame.sh, -width / 2, -height + yOffset, width, height);
    } else {
      ctx.drawImage(visual.image, -width / 2, -height + yOffset, width, height);
    }
    return;
  }
  ctx.fillStyle = towerColors[tower.id];
  ctx.strokeStyle = "#f4f0e7";
  ctx.lineWidth = scaled(3);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.rect(scaled(-32), scaled(-24), scaled(64), scaled(48));
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#10140f";
  ctx.font = `700 ${scaled(13)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Lv${tower.level}`, 0, -7);
}

function drawBuildSlotMarker(slot) {
  const isActive = state.selectedSlot === slot;
  const isHovered = state.hoveredSlot === slot;
  const size = scaled(isActive || isHovered ? 7.68 : 6.4);
  ctx.strokeStyle = isActive ? "#ffe66d" : isHovered ? "#fff0a6" : "rgb(255 247 223 / 0.86)";
  ctx.lineWidth = scaled(isActive || isHovered ? 2.56 : 1.92);
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.lineCap = "butt";
}

function drawSlots() {
  state.slots.forEach((slot) => {
    ctx.save();
    ctx.translate(slot.x, slot.y);
    if (!slot.tower) {
      drawBuildSlotMarker(slot);
    } else if (state.selectedSlot === slot || state.hoveredSlot === slot) {
      ctx.strokeStyle = "rgb(255 255 255 / 0.16)";
      ctx.beginPath();
      ctx.arc(0, 0, slot.tower.range * scaled(58), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawTowerSlot(slot) {
  ctx.save();
  ctx.translate(slot.x, slot.y);
  const buildProgress = towerAnimationProgress(slot.tower.lifecycleAnimation);
  drawTowerBody(slot.tower, buildProgress, 1);
  ctx.restore();
}

function drawTowerAnimation(animation) {
  ctx.save();
  ctx.translate(animation.x, animation.y);
  const progress = 1 - towerAnimationProgress(animation);
  drawTowerBody(animation.tower, progress, Math.max(0, progress));
  ctx.restore();
}

function towerDepthY(slot) {
  const visual = towerVisual(slot.tower);
  return slot.y + scaled(visual?.depth_y ?? visual?.y_offset ?? 0);
}

function drawTowers() {
  state.slots.forEach((slot) => {
    if (slot.tower) drawTowerSlot(slot);
  });
  state.towerAnimations.forEach((animation) => {
    drawTowerAnimation(animation);
  });
}

function getAnimatedEnemySprite(enemy) {
  const spriteSet =
    enemy.id === "knife_soldier"
      ? {
          walk: knifeSoldierWalkSprite,
          walkFront: knifeSoldierWalkFrontSprite,
          walkBack: knifeSoldierWalkBackSprite,
          attack: knifeSoldierAttackSprite,
          walkSize: 98,
          attackSize: 108,
          yOffset: 34,
          attackYOffset: 38,
          healthY: -70,
          labelY: 34,
          shadowX: 2,
          shadowY: 11,
          shadowW: 25,
          shadowH: 8,
          attackFacesRight: false
        }
      : enemy.id === "iron_cavalry"
        ? {
            walk: ironCavalryWalkSprite,
            walkFront: ironCavalryWalkFrontSprite,
            walkBack: ironCavalryWalkBackSprite,
            attack: ironCavalryAttackSprite,
            walkSize: 116,
            attackSize: 122,
            yOffset: 38,
            attackYOffset: 42,
            healthY: -82,
            labelY: 38,
            shadowX: 4,
            shadowY: 22,
            shadowW: 34,
            shadowH: 11,
            sideFacesRight: true,
            attackFacesRight: true,
            shadows: {
              side: { x: 7, y: 7, w: 35, h: 9 },
              front: { x: 1, y: 8, w: 30, h: 8 },
              back: { x: 7, y: 7, w: 36, h: 9 },
              attack: { x: 5, y: 8, w: 38, h: 9 }
            }
          }
        : enemy.id === "warlock"
          ? {
              walk: warlockWalkSprite,
              walkFront: warlockWalkFrontSprite,
              walkBack: warlockWalkBackSprite,
              attack: warlockAttackSprite,
              walkSize: 96,
              attackSize: 96,
              yOffset: 30,
              attackYOffset: 34,
              healthY: -62,
              labelY: 30,
              shadowX: 2,
              shadowY: 15,
              shadowW: 23,
              shadowH: 8,
              attackFacesRight: false
            }
          : enemy.id === "eagle_scout"
            ? {
                walk: eagleScoutWalkSprite,
                walkFront: eagleScoutWalkFrontSprite,
                walkBack: eagleScoutWalkBackSprite,
                attack: eagleScoutAttackSprite,
                walkSize: 78,
                attackSize: 88,
                yOffset: 28,
                attackYOffset: 32,
                healthY: -58,
                labelY: 30,
                shadowX: 2,
                shadowY: 20,
                shadowW: 18,
                shadowH: 6,
                attackFacesRight: false
              }
            : enemy.id === "boss_lvbu"
              ? {
                  walk: lvbuWalkSprite,
                  walkFront: lvbuWalkSprite,
                  walkBack: lvbuWalkSprite,
                  attack: lvbuAttackSprite,
                  walkSize: 132,
                  attackSize: 148,
                  yOffset: 44,
                  attackYOffset: 50,
                  healthY: -94,
                  labelY: 44,
                  shadowX: 3,
                  shadowY: 24,
                  shadowW: 37,
                  shadowH: 12,
                  attackFacesRight: false
                }
              : enemy.id === "boss_liubei"
                  ? {
                      walk: heroWalkSprite,
                      walkFront: heroWalkSprite,
                      walkBack: heroWalkSprite,
                      attack: heroAttackSprite,
                      skill1: heroSkill1Sprite,
                      skill2: heroSkill2Sprite,
                      walkSize: 118,
                      attackSize: 128,
                      skill1Size: 136,
                      skill2Size: 136,
                      yOffset: 38,
                      attackYOffset: 42,
                      skillYOffset: 44,
                      healthY: -74,
                    labelY: 38,
                    shadowX: 2,
                    shadowY: 18,
                    shadowW: 28,
                    shadowH: 10,
                    attackFacesRight: false
                  }
        : null;
  if (!spriteSet) return null;

  const isSkill1 = enemy.action === "skill1" && enemy.attackTimer > 0 && spriteSet.skill1?.ready;
  const isSkill2 = enemy.action === "skill2" && enemy.attackTimer > 0 && spriteSet.skill2?.ready;
  const isAttacking = enemy.attackTimer > 0 && (isSkill1 || isSkill2 || spriteSet.attack.ready);
  const sprite = isAttacking
    ? isSkill1
      ? spriteSet.skill1
      : isSkill2
        ? spriteSet.skill2
        : spriteSet.attack
    : enemy.walkDirection === "front"
      ? spriteSet.walkFront
      : enemy.walkDirection === "back"
        ? spriteSet.walkBack
        : spriteSet.walk;
  if (!sprite.ready) return null;

  return { ...spriteSet, sprite, isAttacking, isSkill1, isSkill2 };
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const animatedEnemySprite = getAnimatedEnemySprite(enemy);
    if (animatedEnemySprite) {
      const { sprite, isAttacking, isSkill1, isSkill2 } = animatedEnemySprite;
      const shadowKey = isAttacking ? "attack" : enemy.walkDirection;
      const shadow = animatedEnemySprite.shadows?.[shadowKey] || {
        x: animatedEnemySprite.shadowX,
        y: animatedEnemySprite.shadowY,
        w: animatedEnemySprite.shadowW,
        h: animatedEnemySprite.shadowH
      };
      drawGroundShadow(shadow.x, shadow.y, shadow.w, shadow.h, 0.26);
      const frameIndex = isAttacking
        ? Math.min(
            sprite.frameCount - 1,
            Math.floor((1 - enemy.attackTimer / Math.max(0.001, enemy.attackDuration || 1)) * sprite.frameCount)
          )
        : Math.floor((state.time + enemy.uid * 0.08) * sprite.fps) % sprite.frameCount;
      const shouldFlip = isAttacking
        ? animatedEnemySprite.attackFacesRight && enemy.facing < 0
        : enemy.walkDirection === "side" && (animatedEnemySprite.sideFacesRight ? enemy.facing < 0 : enemy.facing > 0);
      drawHeroSprite(
        sprite,
        frameIndex,
        scaled(isSkill1 ? animatedEnemySprite.skill1Size : isSkill2 ? animatedEnemySprite.skill2Size : isAttacking ? animatedEnemySprite.attackSize : animatedEnemySprite.walkSize),
        scaled(isSkill1 ? animatedEnemySprite.skill1Size : isSkill2 ? animatedEnemySprite.skill2Size : isAttacking ? animatedEnemySprite.attackSize : animatedEnemySprite.walkSize),
        scaled(isSkill1 || isSkill2 ? animatedEnemySprite.skillYOffset : isAttacking ? animatedEnemySprite.attackYOffset : animatedEnemySprite.yOffset),
        shouldFlip
      );
      drawBurningEnemyOverlay(enemy, animatedEnemySprite);
      if (enemy.showHealthBar) {
        const healthBarWidth = scaled(31);
        const healthBarHeight = scaled(5);
        const healthBarX = -healthBarWidth / 2;
        const healthBarY = scaled(animatedEnemySprite.healthY);
        ctx.fillStyle = "rgb(0 0 0 / 0.82)";
        ctx.fillRect(healthBarX - scaled(1.5), healthBarY - scaled(1.5), healthBarWidth + scaled(3), healthBarHeight + scaled(3));
        ctx.fillStyle = "#11140f";
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        ctx.fillStyle = enemy.currentHp / enemy.maxHp > 0.45 ? "#78d06f" : "#e15d50";
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth * Math.max(0, enemy.currentHp / enemy.maxHp), healthBarHeight);
      }
      ctx.restore();
      return;
    }
    const radius = scaled(enemy.isBoss ? 22 : enemy.type === "flying" ? 13 : 15);
    ctx.fillStyle = enemyColors[enemy.id] || "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enemy.isBoss ? "#ffe59b" : "#1a1d17";
    ctx.lineWidth = scaled(enemy.isBoss ? 4 : 2);
    ctx.stroke();
    drawBurningEnemyOverlay(enemy, { walkSize: enemy.isBoss ? 58 : enemy.type === "flying" ? 38 : 44, yOffset: enemy.type === "flying" ? 18 : 22 });
    if (enemy.showHealthBar) {
      ctx.fillStyle = "#11140f";
      ctx.fillRect(scaled(-22), -radius - scaled(13), scaled(44), scaled(5));
      ctx.fillStyle = enemy.currentHp / enemy.maxHp > 0.45 ? "#78d06f" : "#e15d50";
      ctx.fillRect(scaled(-22), -radius - scaled(13), scaled(44) * Math.max(0, enemy.currentHp / enemy.maxHp), scaled(5));
    }
    ctx.restore();
}

function drawBurningEnemyOverlay(enemy, spriteInfo = {}) {
  if (!enemy.fireDot || enemy.fireDot <= 0) return;
  const level = enemy.fireLevel || 1;
  const time = state.time * (6 + level * 1.2) + enemy.uid;
  const baseWidth = scaled((spriteInfo.walkSize || 52) * (0.12 + level * 0.012));
  const baseHeight = scaled((spriteInfo.walkSize || 52) * (0.12 + level * 0.026));
  const baseY = scaled((spriteInfo.yOffset || 34) - (spriteInfo.walkSize || 52) * 0.46);
  const flameCount = level + 1;

  ctx.save();
  for (let index = 0; index < flameCount; index += 1) {
    const phase = time + index * 1.7;
    const x = Math.sin(phase * 0.9) * baseWidth * (0.72 + index * 0.16);
    const y = baseY + Math.cos(phase * 1.15) * scaled(4) - index * scaled(5);
    const height = baseHeight * (0.75 + Math.sin(phase) * 0.16 + index * 0.12);
    const width = baseWidth * (0.9 + Math.cos(phase) * 0.12);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, height);
    gradient.addColorStop(0, "rgb(255 218 120 / 0.58)");
    gradient.addColorStop(0.46, level >= 3 ? "rgb(209 63 21 / 0.42)" : "rgb(218 91 26 / 0.35)");
    gradient.addColorStop(1, "rgb(255 28 8 / 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, -0.2 + Math.sin(phase) * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  if (level >= 3) {
    ctx.globalAlpha = 0.22 + Math.sin(time) * 0.04;
    ctx.fillStyle = "rgb(34 28 24 / 0.45)";
    ctx.beginPath();
    ctx.ellipse(Math.sin(time) * baseWidth * 0.7, baseY - scaled(12), baseWidth * 1.5, baseHeight * 0.8, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemies() {
  const enemiesByDepth = [...state.enemies].sort((a, b) => a.y - b.y || a.progress - b.progress || a.uid - b.uid);
  enemiesByDepth.forEach(drawEnemy);
}

function tintedSpriteCanvas(sprite, color) {
  if (!sprite.tintCache) sprite.tintCache = new Map();
  if (sprite.tintCache.has(color)) return sprite.tintCache.get(color);

  const canvas = document.createElement("canvas");
  canvas.width = sprite.canvas.width;
  canvas.height = sprite.canvas.height;
  const tintCtx = canvas.getContext("2d");
  tintCtx.drawImage(sprite.canvas, 0, 0);
  tintCtx.globalCompositeOperation = "source-in";
  tintCtx.fillStyle = color;
  tintCtx.fillRect(0, 0, canvas.width, canvas.height);
  sprite.tintCache.set(color, canvas);
  return canvas;
}

function drawSpriteFrame(sourceCanvas, sprite, frameX, frameY, width, height, yOffset, offsetX = 0, offsetY = 0) {
  ctx.drawImage(
    sourceCanvas,
    frameX,
    frameY,
    sprite.frameWidth,
    sprite.frameHeight,
    -width / 2 + offsetX,
    -height + yOffset + offsetY,
    width,
    height
  );
}

function drawHeroSprite(sprite, frameIndex, width, height, yOffset, flip = false, outline = null) {
  const frameX = (frameIndex % sprite.columns) * sprite.frameWidth;
  const frameY = Math.floor(frameIndex / sprite.columns) * sprite.frameHeight;
  ctx.save();
  if (flip) ctx.scale(-1, 1);
  if (outline) {
    const outlineCanvas = tintedSpriteCanvas(sprite, outline.color);
    const radius = outline.width || scaled(3);
    ctx.save();
    ctx.globalAlpha = outline.alpha ?? 0.72;
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      drawSpriteFrame(outlineCanvas, sprite, frameX, frameY, width, height, yOffset, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.restore();
  }
  drawSpriteFrame(sprite.canvas, sprite, frameX, frameY, width, height, yOffset);
  ctx.restore();
}

function drawGroundShadow(x, y, width, height, alpha = 0.28, angle = -0.15) {
  ctx.save();
  ctx.translate(scaled(x), scaled(y));
  ctx.rotate(angle);
  ctx.scale(scaled(width), scaled(height));
  const shadow = ctx.createRadialGradient(-0.18, -0.16, 0.08, 0, 0, 1);
  shadow.addColorStop(0, `rgb(0 0 0 / ${alpha})`);
  shadow.addColorStop(0.58, `rgb(0 0 0 / ${alpha * 0.42})`);
  shadow.addColorStop(1, "rgb(0 0 0 / 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(scaled(x - width * 0.04), scaled(y + height * 0.12));
  ctx.rotate(angle * 0.75);
  ctx.scale(scaled(width * 0.56), scaled(height * 0.34));
  ctx.fillStyle = `rgb(0 0 0 / ${alpha * 0.32})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 1, 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shouldFlipHeroSprite(sprites) {
  return sprites.sourceFacesRight ? state.hero.facing < 0 : state.hero.facing > 0;
}

function drawHero() {
  const sprites = defenderSpriteSet();
  ctx.save();
  ctx.translate(state.hero.x, state.hero.y);
  drawGroundShadow(2, 18, 31, 12, 0.3, -0.18);

  if (state.hero.isDead) {
    if (sprites.death.ready) {
      const frameIndex = Math.min(sprites.death.frameCount - 1, Math.floor(state.hero.deathTimer * sprites.death.fps));
      drawHeroSprite(sprites.death, frameIndex, scaled(sprites.deathSize), scaled(sprites.deathSize), scaled(sprites.yOffset), shouldFlipHeroSprite(sprites));
    }
    ctx.restore();
    return;
  }

  const shouldPlayWalk = Boolean(state.hero.moveTarget) && sprites.walk.ready;
  const shouldPlaySkill1 = state.hero.action === "skill1" && state.hero.attackTimer > 0 && sprites.skill1.ready;
  const shouldPlaySkill2 = state.hero.action === "skill2" && state.hero.attackTimer > 0 && sprites.skill2.ready;
  const shouldPlayAttack = state.hero.attackTimer > 0 && sprites.attack.ready;
  const shouldPlayIdle = !state.hero.moveTarget && state.hero.attackTimer <= 0 && sprites.idle.ready;
  const shouldFlip = shouldFlipHeroSprite(sprites);
  const selectedOutline = state.heroMoveMode
    ? {
        color: "#ffe28a",
        width: scaled(1.6 + Math.sin(state.time * 5) * 0.225),
        alpha: 0.62 + Math.sin(state.time * 5) * 0.08
      }
    : null;
  if (shouldPlaySkill1) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.skill1.frameCount - 1, Math.floor(progress * sprites.skill1.frameCount));
    drawHeroSprite(sprites.skill1, frameIndex, scaled(sprites.skill1Size), scaled(sprites.skill1Size), scaled(sprites.skillYOffset), shouldFlip, selectedOutline);
  } else if (shouldPlaySkill2) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.skill2.frameCount - 1, Math.floor(progress * sprites.skill2.frameCount));
    drawHeroSprite(sprites.skill2, frameIndex, scaled(sprites.skill2Size), scaled(sprites.skill2Size), scaled(sprites.skillYOffset), shouldFlip, selectedOutline);
  } else if (shouldPlayAttack) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.attack.frameCount - 1, Math.floor(progress * sprites.attack.frameCount));
    drawHeroSprite(sprites.attack, frameIndex, scaled(sprites.attackSize), scaled(sprites.attackSize), scaled(sprites.yOffset), shouldFlip, selectedOutline);
  } else if (shouldPlayWalk) {
    const frameIndex = Math.floor(state.time * sprites.walk.fps) % sprites.walk.frameCount;
    drawHeroSprite(sprites.walk, frameIndex, scaled(sprites.walkSize), scaled(sprites.walkSize), scaled(sprites.yOffset), shouldFlip, selectedOutline);
  } else if (shouldPlayIdle) {
    const frameIndex = Math.floor(state.time * sprites.idle.fps) % sprites.idle.frameCount;
    drawHeroSprite(sprites.idle, frameIndex, scaled(sprites.idleSize), scaled(sprites.idleSize), scaled(sprites.idleYOffset), false, selectedOutline);
  } else {
    ctx.fillStyle = "#5ea3db";
    ctx.beginPath();
    ctx.arc(0, 0, scaled(20), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f0e7";
    ctx.lineWidth = scaled(3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBattleActors() {
  const actors = [
    ...state.enemies.map((enemy) => ({
      type: "enemy",
      depthY: enemy.y + scaled(enemy.type === "flying" ? 8 : 18),
      tieBreaker: enemy.uid,
      draw: () => drawEnemy(enemy)
    })),
    ...state.slots
      .filter((slot) => slot.tower)
      .map((slot) => ({
        type: "tower",
        depthY: towerDepthY(slot),
        tieBreaker: slot.x,
        draw: () => drawTowerSlot(slot)
      })),
    ...state.towerAnimations.map((animation) => {
      const visual = towerVisual(animation.tower);
      return {
        type: "tower_animation",
        depthY: animation.y + scaled(visual?.depth_y ?? visual?.y_offset ?? 0),
        tieBreaker: animation.x,
        draw: () => drawTowerAnimation(animation)
      };
    })
  ];

  if (!state.hero.isDead) {
    actors.push({
      type: "hero",
      depthY: state.hero.y + scaled(18),
      tieBreaker: -1,
      draw: drawHero
    });
  } else {
    actors.push({
      type: "hero",
      depthY: state.hero.y + scaled(8),
      tieBreaker: -1,
      draw: drawHero
    });
  }

  actors
    .sort((a, b) => a.depthY - b.depthY || a.tieBreaker - b.tieBreaker)
    .forEach((actor) => actor.draw());
}

function drawArrowLikeProjectile(projectile) {
      const progress = 1 - projectile.life / projectile.duration;
      const x = projectile.x1 + (projectile.x2 - projectile.x1) * progress;
      const y = projectile.y1 + (projectile.y2 - projectile.y1) * progress - Math.sin(progress * Math.PI) * scaled(10);
      const previousProgress = Math.max(0, progress - 0.18);
      const trailX = projectile.x1 + (projectile.x2 - projectile.x1) * previousProgress;
      const trailY = projectile.y1 + (projectile.y2 - projectile.y1) * previousProgress - Math.sin(previousProgress * Math.PI) * scaled(10);
      const angle = Math.atan2(y - trailY, x - trailX);
      const level = projectile.level || 1;
      const alpha = Math.max(0.2, projectile.life / projectile.duration);
      const isBolt = projectile.type === "bolt";

      ctx.save();
      ctx.globalAlpha = alpha;
      if (level >= 2) {
        ctx.strokeStyle = isBolt
          ? level >= 3
            ? "rgb(118 255 105 / 0.62)"
            : "rgb(109 232 109 / 0.44)"
          : level >= 3
            ? "rgb(230 89 255 / 0.58)"
            : "rgb(200 137 255 / 0.42)";
        ctx.lineWidth = scaled(level >= 3 ? (isBolt ? 8 : 7) : 5);
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = scaled(level >= 3 ? (isBolt ? 4.5 : 3.5) : isBolt ? 3.2 : 2.5);
      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = isBolt ? (level >= 3 ? "#eaffd7" : "#d8ffbd") : level >= 3 ? "#ffe9ff" : "#fff0bd";
      ctx.strokeStyle = isBolt ? "#245a24" : level >= 3 ? "#6f1d8c" : "#5b3424";
      ctx.lineWidth = scaled(1.5);
      ctx.beginPath();
      ctx.moveTo(scaled(isBolt ? 15 : 11), 0);
      ctx.lineTo(scaled(isBolt ? -10 : -7), scaled(isBolt ? -5 : -4));
      ctx.lineTo(scaled(-3), 0);
      ctx.lineTo(scaled(isBolt ? -10 : -7), scaled(isBolt ? 5 : 4));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (level >= 3) {
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = isBolt ? "rgb(181 255 112 / 0.86)" : "rgb(255 163 255 / 0.85)";
        ctx.lineWidth = scaled(2);
        ctx.beginPath();
        ctx.moveTo(scaled(-13), scaled(-5));
        ctx.lineTo(scaled(-25), scaled(-10));
        ctx.moveTo(scaled(-13), scaled(5));
        ctx.lineTo(scaled(-25), scaled(10));
        ctx.stroke();
      }
      ctx.restore();
}

function drawMagicProjectile(projectile) {
  const progress = 1 - projectile.life / projectile.duration;
  const level = projectile.level || 1;
  const x = projectile.x1 + (projectile.x2 - projectile.x1) * progress;
  const y = projectile.y1 + (projectile.y2 - projectile.y1) * progress - Math.sin(progress * Math.PI) * scaled(18 + level * 4);
  const previousProgress = Math.max(0, progress - 0.16);
  const trailX = projectile.x1 + (projectile.x2 - projectile.x1) * previousProgress;
  const trailY = projectile.y1 + (projectile.y2 - projectile.y1) * previousProgress - Math.sin(previousProgress * Math.PI) * scaled(18 + level * 4);
  const radius = scaled(5 + level * 2);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * (2.6 + level * 0.35));

  ctx.save();
  glow.addColorStop(0, "rgb(230 255 255 / 0.98)");
  glow.addColorStop(0.34, level >= 3 ? "rgb(92 235 255 / 0.82)" : "rgb(68 190 255 / 0.7)");
  glow.addColorStop(1, "rgb(28 118 255 / 0)");
  ctx.strokeStyle = level >= 3 ? "rgb(139 244 255 / 0.68)" : "rgb(92 207 255 / 0.48)";
  ctx.lineWidth = scaled(3 + level);
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.quadraticCurveTo((trailX + x) / 2, (trailY + y) / 2 - scaled(8 + level * 4), x, y);
  ctx.stroke();
  if (level >= 2) {
    ctx.strokeStyle = level >= 3 ? "rgb(211 255 255 / 0.72)" : "rgb(174 238 255 / 0.48)";
    ctx.lineWidth = scaled(1.5);
    ctx.beginPath();
    ctx.arc(x, y, radius * (1.3 + level * 0.2), state.time * 5, state.time * 5 + Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * (2.6 + level * 0.35), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = projectile.color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFireballProjectile(projectile) {
  const level = projectile.level || 1;
  const progress = 1 - projectile.life / projectile.duration;
  const arcHeight = scaled(14 + level * 4);
  const x = projectile.x1 + (projectile.x2 - projectile.x1) * progress;
  const y = projectile.y1 + (projectile.y2 - projectile.y1) * progress - Math.sin(progress * Math.PI) * arcHeight;
  const radius = scaled(5 + level * 1.7);
  const trailProgress = Math.max(0, progress - (0.1 + level * 0.025));
  const trailX = projectile.x1 + (projectile.x2 - projectile.x1) * trailProgress;
  const trailY = projectile.y1 + (projectile.y2 - projectile.y1) * trailProgress - Math.sin(trailProgress * Math.PI) * arcHeight;
  const angle = Math.atan2(y - trailY, x - trailX);
  const flameGradient = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.35, 0, x, y, radius * 1.7);

  flameGradient.addColorStop(0, "rgb(255 230 132 / 0.95)");
  flameGradient.addColorStop(0.42, level >= 3 ? "rgb(219 74 22 / 0.88)" : "rgb(230 101 26 / 0.82)");
  flameGradient.addColorStop(1, "rgb(73 28 18 / 0.36)");

  ctx.save();
  ctx.strokeStyle = level >= 3 ? "rgb(126 48 24 / 0.5)" : "rgb(135 61 28 / 0.38)";
  ctx.lineWidth = scaled(4 + level);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.quadraticCurveTo((trailX + x) / 2, (trailY + y) / 2 - scaled(6 + level * 2), x, y);
  ctx.stroke();

  if (level >= 2) {
    ctx.strokeStyle = level >= 3 ? "rgb(239 116 35 / 0.46)" : "rgb(229 124 40 / 0.34)";
    ctx.lineWidth = scaled(1.4 + level * 0.35);
    for (let index = 0; index < level; index += 1) {
      const offset = scaled((index - (level - 1) / 2) * 4);
      ctx.beginPath();
      ctx.moveTo(trailX - Math.sin(angle) * offset, trailY + Math.cos(angle) * offset);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  if (level >= 3) {
    ctx.fillStyle = "rgb(42 34 28 / 0.34)";
    ctx.beginPath();
    ctx.ellipse(trailX, trailY - scaled(4), radius * 1.4, radius * 0.72, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = flameGradient;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.25, radius * 0.92, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = level >= 3 ? "rgb(255 196 87 / 0.78)" : "rgb(255 180 74 / 0.68)";
  ctx.beginPath();
  ctx.ellipse(x - Math.cos(angle) * radius * 0.24, y - Math.sin(angle) * radius * 0.24, radius * 0.42, radius * 0.32, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFireImpacts() {
  state.fireImpacts.forEach((impact) => {
    const level = impact.level || 1;
    const progress = 1 - impact.life / impact.duration;
    const fade = Math.max(0, impact.life / impact.duration);
    const radius = impact.radius * (0.65 + progress * (0.75 + level * 0.08));
    const scorchRadius = radius * (1.05 + level * 0.12);
    const flame = ctx.createRadialGradient(impact.x, impact.y - radius * 0.25, 0, impact.x, impact.y, radius * 1.35);

    ctx.save();
    ctx.globalAlpha = Math.min(0.52, fade * 0.72);
    ctx.fillStyle = "rgb(29 23 18 / 0.72)";
    ctx.beginPath();
    ctx.ellipse(impact.x, impact.y + scaled(8), scorchRadius * 1.22, scorchRadius * 0.42, -0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade * 0.85;
    flame.addColorStop(0, "rgb(255 219 112 / 0.68)");
    flame.addColorStop(0.38, level >= 3 ? "rgb(209 65 20 / 0.56)" : "rgb(217 91 25 / 0.45)");
    flame.addColorStop(1, "rgb(74 31 18 / 0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(impact.x, impact.y - radius * 0.08, radius * 0.72, radius * (0.85 + level * 0.12), -0.18, 0, Math.PI * 2);
    ctx.fill();

    impact.smoke.forEach((smoke) => {
      const x = impact.x + Math.cos(smoke.angle) * smoke.speed * progress + smoke.drift * progress;
      const y = impact.y + Math.sin(smoke.angle) * smoke.speed * progress - scaled(10 + level * 3) * progress;
      const smokeSize = smoke.size * (0.72 + progress * 0.72);
      ctx.globalAlpha = fade * (0.2 + level * 0.05) * (1 - progress * 0.45);
      ctx.fillStyle = level >= 3 ? "rgb(38 34 30 / 0.72)" : "rgb(56 48 40 / 0.58)";
      ctx.beginPath();
      ctx.ellipse(x, y, smokeSize * 1.2, smokeSize * 0.72, smoke.angle * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });

    impact.sparks.forEach((spark) => {
      const localProgress = Math.max(0, Math.min(1, progress - spark.lifeOffset));
      if (localProgress <= 0) return;
      const distance = spark.speed * localProgress;
      const x = impact.x + Math.cos(spark.angle) * distance;
      const y = impact.y + Math.sin(spark.angle) * distance - scaled(10) * localProgress * (1 - localProgress);
      ctx.globalAlpha = fade * (0.62 - localProgress * 0.36);
      ctx.fillStyle = localProgress < 0.35 ? "#f4c46f" : level >= 3 ? "#c95324" : "#d66c2b";
      ctx.beginPath();
      ctx.arc(x, y, spark.size * (1 - localProgress * 0.45), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
}

function drawStoneballProjectile(projectile) {
  const level = projectile.level || 1;
  const progress = 1 - projectile.life / projectile.duration;
  const x = projectile.x1 + (projectile.x2 - projectile.x1) * progress;
  const y = projectile.y1 + (projectile.y2 - projectile.y1) * progress - Math.sin(progress * Math.PI) * scaled(16 + level * 3);
  const previousProgress = Math.max(0, progress - 0.12);
  const trailX = projectile.x1 + (projectile.x2 - projectile.x1) * previousProgress;
  const trailY = projectile.y1 + (projectile.y2 - projectile.y1) * previousProgress - Math.sin(previousProgress * Math.PI) * scaled(16 + level * 3);
  const radius = scaled(6 + level * 2);

  ctx.save();
  ctx.strokeStyle = level >= 3 ? "rgb(40 40 40 / 0.65)" : "rgb(35 35 35 / 0.45)";
  ctx.lineWidth = scaled(4 + level);
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(x, y);
  ctx.stroke();
  if (level >= 2) {
    ctx.fillStyle = "rgb(0 0 0 / 0.18)";
    ctx.beginPath();
    ctx.arc(trailX, trailY, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius);
  gradient.addColorStop(0, level >= 3 ? "#77716a" : "#5f5c57");
  gradient.addColorStop(0.55, "#242424");
  gradient.addColorStop(1, "#070707");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = level >= 3 ? "#b48b45" : "#111";
  ctx.lineWidth = scaled(level >= 3 ? 2 : 1.5);
  ctx.stroke();
  if (level >= 3) {
    ctx.strokeStyle = "rgb(255 198 86 / 0.72)";
    ctx.lineWidth = scaled(1.5);
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.45, state.time * 4, state.time * 4 + Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProjectiles() {
  state.projectiles.forEach((projectile) => {
    if (projectile.type === "arrow" || projectile.type === "bolt") {
      drawArrowLikeProjectile(projectile);
      return;
    }
    if (projectile.type === "magic") {
      drawMagicProjectile(projectile);
      return;
    }
    if (projectile.type === "fireball") {
      drawFireballProjectile(projectile);
      return;
    }
    if (projectile.type === "stoneball") {
      drawStoneballProjectile(projectile);
      return;
    }
    ctx.strokeStyle = projectile.color;
    ctx.lineWidth = scaled(3);
    ctx.beginPath();
    ctx.moveTo(projectile.x1, projectile.y1);
    ctx.lineTo(projectile.x2, projectile.y2);
    ctx.stroke();
  });
}

function drawLabels() {
  ctx.fillStyle = "#f4f0e7";
  ctx.font = `700 ${scaled(14)}px sans-serif`;
  if (state.bossSpeedBuffTimer > 0) {
    ctx.fillStyle = "#ffb36b";
    ctx.fillText("敌军加速", scaled(1010), scaled(54));
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTerrain();
  drawPath();
  drawSlots();
  drawProjectiles();
  drawFireImpacts();
  drawBattleActors();
  drawLabels();
}

let waveButtonSignature = "";

function renderWaveButtons() {
  if (!ui.waveControl) return;
  if (state.waveActive || state.gameOver || state.victory || state.waveIndex >= level.waves.length) {
    if (waveButtonSignature !== "hidden") {
      ui.waveControl.innerHTML = "";
      waveButtonSignature = "hidden";
    }
    return;
  }

  const countdown = state.waveStartCountdown === null ? null : Math.ceil(state.waveStartCountdown);
  const canvasRect = canvas.getBoundingClientRect();
  const signature = `${state.waveIndex}:${countdown ?? "ready"}:${Math.round(canvasRect.width)}:${Math.round(canvasRect.height)}:${state.uiScale.toFixed(2)}`;
  if (signature === waveButtonSignature) return;
  waveButtonSignature = signature;
  ui.waveControl.innerHTML = entrancePathsForWave(level.waves[state.waveIndex])
    .map((path) => {
      const entrance = clampStagePoint(stagePointFromCanvasPoint(path.points[0]), 40 * state.uiScale);
      const label = countdown === null ? "战" : countdown;
      return `
        <button class="start-wave" type="button" data-path-id="${path.id}" style="left:${entrance.x}px; top:${entrance.y}px" title="${path.name}">
          <span>${label}</span>
        </button>
      `;
    })
    .join("");
}

function skillButtonContent(cooldown, isDead) {
  if (isDead) return `<span class="skill-cooldown">倒地</span>`;
  if (cooldown > 0) return `<span class="skill-cooldown">${Math.ceil(cooldown)}</span>`;
  return "";
}

function renderUi() {
  ui.stats.innerHTML = [
    ["hp", `${state.hp}`],
    ["gold", `${state.gold}`],
    ["wave", `${Math.min(state.waveIndex + 1, level.waves.length)}/${level.waves.length}`]
  ]
    .map(
      ([type, value]) => `
        <div class="stat">
          <span class="stat-icon ${type}" aria-hidden="true"></span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");

  const wave = level.waves[state.waveIndex];
  const entranceCount = wave ? entrancePathsForWave(wave).length : 0;
  ui.waveInfo.textContent = wave
    ? state.waveActive
      ? `第 ${wave.wave} 波 · ${entranceCount}入口随机 · 待出 ${state.spawnQueue.length} · 场上 ${state.enemies.length}`
      : state.waveStartCountdown === null
        ? `下一波：第 ${wave.wave} 波 · 点击任意入口开战`
        : `下一波：第 ${wave.wave} 波 · ${Math.ceil(state.waveStartCountdown)}s 后自动出兵 · 点击任意入口可立即开战`
    : "所有波次已完成。";

  const heroHpPercent = Math.max(0, Math.min(100, (state.hero.hp / state.hero.maxHp) * 100));
  const heroStateText = state.hero.isDead
    ? `死亡 · ${Math.ceil(state.hero.reviveTimer)}s 后复活`
    : getHeroDuelEnemy()
      ? "1V1 接战中"
    : state.hero.moveTarget
      ? "行走中"
      : state.heroMoveMode
        ? "点道路放置"
        : "点战场英雄移动";
  ui.heroStatus.innerHTML = `
    ${level.hero.name} · 攻击 ${level.hero.attack}
    <div class="hero-hp" aria-label="英雄血量"><span style="width:${heroHpPercent}%"></span></div>
    <small>${Math.ceil(state.hero.hp)}/${state.hero.maxHp} · ${heroStateText}</small>
  `;
  ui.heroPortrait.innerHTML = state.hero.isDead
    ? `<span class="hero-revive-count">${Math.ceil(state.hero.reviveTimer)}</span>`
    : "";
  ui.skillBuff.disabled = state.hero.buffCooldown > 0 || state.hero.isDead;
  ui.skillBuff.innerHTML = skillButtonContent(state.hero.buffCooldown, state.hero.isDead);
  ui.skillLine.disabled = state.hero.lineCooldown > 0 || state.hero.isDead;
  ui.skillLine.innerHTML = skillButtonContent(state.hero.lineCooldown, state.hero.isDead);
  ui.togglePause.textContent = state.paused ? "▶" : "II";
  renderWaveButtons();
  updateTowerPopupState();
}

function towerGlyph(tower) {
  return {
    arrow_tower: "弓",
    crossbow_tower: "弩",
    magic_tower: "策",
    fire_tower: "火",
    watchtower: "哨"
  }[tower.id];
}

function towerCounterText(tower) {
  return {
    arrow_tower: "克制：刀兵、飞鹰斥候",
    crossbow_tower: "克制：刀兵、Boss前排",
    magic_tower: "克制：铁骑、术士",
    fire_tower: "克制：铁骑、成群地面、飞鹰",
    watchtower: "克制：飞鹰斥候"
  }[tower.id];
}

function towerIntroText(tower) {
  const damage = tower.damage_type === "magic" ? "法术" : "物理";
  const target = tower.target_type === "air_ground" ? "空地" : tower.target_type === "air" ? "对空" : "对地";
  return `${damage} · ${target} · 攻击 ${tower.attack} · 范围 ${tower.range.toFixed(1)}`;
}

const towerMenuIcons = {
  arrow_tower: "./assets/tower_menu_icons/dragon_tower.jpg?v=20260514-menu-icons-v4",
  crossbow_tower: "./assets/tower_menu_icons/watch_tower.jpg?v=20260514-menu-icons-v4",
  magic_tower: "./assets/tower_menu_icons/magic_tower.jpg?v=20260514-menu-icons-v4",
  fire_tower: "./assets/tower_menu_icons/fire_tower.jpg?v=20260514-menu-icons-v4",
  watchtower: "./assets/tower_menu_icons/cannon_tower.jpg?v=20260514-menu-icons-v4"
};

function towerIconSrc(tower) {
  return towerMenuIcons[tower.id] || tower.visual?.levels?.[0]?.image || "";
}

function renderTowerPopup() {
  ui.towerPopup.innerHTML = "";
  if (state.selectedSlot?.tower) {
    const tower = state.selectedSlot.tower;
    const nextCost = tower.level < 3 ? tower.upgrade_cost[tower.level - 1] : null;
    ui.towerPopup.classList.remove("tower-popup-build");
    ui.towerPopup.classList.add("tower-popup-actions");
    ui.towerPopup.innerHTML = `
      <div class="tower-summary">
        <span class="tower-glyph" style="background:${towerColors[tower.id]}">${towerGlyph(tower)}</span>
        <strong>${tower.name} Lv${tower.level}</strong>
        <small>${towerIntroText(tower)}</small>
        <small>${towerCounterText(tower)}</small>
      </div>
      <button class="tower-action upgrade-action" ${nextCost === null || state.gold < nextCost ? "disabled" : ""}>
        升级 ${nextCost === null ? "MAX" : nextCost}
      </button>
      <button class="tower-action sell-action">拆除 +${Math.floor(tower.buildCost * 0.8)}</button>
    `;
    ui.towerPopup.querySelector(".upgrade-action").addEventListener("click", () => upgradeTower(state.selectedSlot));
    ui.towerPopup.querySelector(".sell-action").addEventListener("click", () => sellTower(state.selectedSlot));
    return;
  }

  ui.towerPopup.classList.add("tower-popup-build");
  ui.towerPopup.classList.remove("tower-popup-actions");
  const positions = [
    { x: 0, y: -128 },
    { x: 118, y: -58 },
    { x: 92, y: 88 },
    { x: -92, y: 88 },
    { x: -118, y: -58 }
  ];
  level.towers.forEach((tower, index) => {
    const button = document.createElement("button");
    button.className = "tower-option";
    const position = positions[index] || { x: 0, y: 0 };
    button.style.setProperty("--tower-x", `${position.x}px`);
    button.style.setProperty("--tower-y", `${position.y}px`);
    button.title = `${towerIntroText(tower)}；${towerCounterText(tower)}`;
    button.innerHTML = `
      <span class="tower-glyph" style="background:${towerColors[tower.id]}">
        ${towerIconSrc(tower) ? `<img class="tower-icon" src="${towerIconSrc(tower)}" alt="" draggable="false" />` : towerGlyph(tower)}
      </span>
      <strong class="tower-cost">${tower.cost}</strong>
    `;
    button.addEventListener("click", () => {
      if (state.selectedSlot) buildTower(state.selectedSlot, tower.id);
    });
    ui.towerPopup.append(button);
  });
}

function updateTowerPopupState() {
  if (state.selectedSlot?.tower) {
    const tower = state.selectedSlot.tower;
    const nextCost = tower.level < 3 ? tower.upgrade_cost[tower.level - 1] : null;
    const upgradeButton = ui.towerPopup.querySelector(".upgrade-action");
    if (upgradeButton) upgradeButton.disabled = nextCost === null || state.gold < nextCost || state.gameOver || state.victory;
    return;
  }

  ui.towerPopup.querySelectorAll(".tower-option").forEach((button, index) => {
    const tower = level.towers[index];
    button.disabled = !state.selectedSlot || state.gold < tower.cost || state.gameOver || state.victory;
  });
}

function updateUiScale() {
  const stageRect = ui.stage.getBoundingClientRect();
  const nextScale = Math.max(UI_MIN_SCALE, Math.min(1, stageRect.width / UI_BASE_STAGE_WIDTH));
  const rankingPanelWidth = Math.min((stageRect.width * 1260) / 2048, (stageRect.height * 1260) / 1152);
  const failurePanelWidth = Math.min(stageRect.width, (stageRect.height * 2048) / 1143);
  document.documentElement.style.setProperty("--ranking-panel-width", `${rankingPanelWidth.toFixed(2)}px`);
  document.documentElement.style.setProperty("--failure-panel-width", `${failurePanelWidth.toFixed(2)}px`);
  if (Math.abs(nextScale - state.uiScale) < 0.005) return;
  state.uiScale = nextScale;
  ui.stage.style.setProperty("--ui-scale", nextScale.toFixed(3));
  ui.stage.style.setProperty("--top-left-top", `${20 * nextScale}px`);
  ui.stage.style.setProperty("--top-left-left", `${54 * nextScale}px`);
  ui.stage.style.setProperty("--top-right-top", `${22 * nextScale}px`);
  ui.stage.style.setProperty("--top-right-right", `${42 * nextScale}px`);
  ui.stage.style.setProperty("--bottom-left-left", `${42 * nextScale}px`);
  ui.stage.style.setProperty("--bottom-left-bottom", `${22 * nextScale}px`);
  ui.stage.style.setProperty("--bottom-right-right", `${42 * nextScale}px`);
  ui.stage.style.setProperty("--bottom-right-bottom", `${24 * nextScale}px`);
  waveButtonSignature = "";
  if (state.selectedSlot) positionTowerPopup(state.selectedSlot);
}

function positionTowerPopup(slot) {
  const stageRect = document.querySelector(".stage").getBoundingClientRect();
  const canvasRect = canvasDisplayRectInStage();
  const x = canvasRect.left + (slot.x / canvas.width) * canvasRect.width;
  const y = canvasRect.top + (slot.y / canvas.height) * canvasRect.height;
  const marginX = (slot.tower ? 160 : 180) * state.uiScale;
  const marginY = (slot.tower ? 140 : 180) * state.uiScale;
  ui.towerPopup.style.left = `${Math.max(marginX, Math.min(stageRect.width - marginX, x))}px`;
  ui.towerPopup.style.top = `${Math.max(marginY, Math.min(stageRect.height - marginY, y))}px`;
}

function showTowerPopup(slot) {
  state.selectedSlot = slot;
  renderTowerPopup();
  positionTowerPopup(slot);
  ui.towerPopup.classList.remove("hidden");
  updateTowerPopupState();
}

function hideTowerPopup() {
  state.selectedSlot = null;
  ui.towerPopup.classList.add("hidden");
}

function canvasDisplayRectInStage() {
  const stageRect = document.querySelector(".stage").getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  return {
    left: canvasRect.left - stageRect.left,
    top: canvasRect.top - stageRect.top,
    width: canvasRect.width,
    height: canvasRect.height
  };
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height
  };
}

function stagePointFromCanvasPoint(point) {
  const displayRect = canvasDisplayRectInStage();
  return {
    x: displayRect.left + (point.x / canvas.width) * displayRect.width,
    y: displayRect.top + (point.y / canvas.height) * displayRect.height
  };
}

function clampStagePoint(point, margin = 24) {
  const stageRect = ui.stage.getBoundingClientRect();
  return {
    x: Math.max(margin, Math.min(stageRect.width - margin, point.x)),
    y: Math.max(margin, Math.min(stageRect.height - margin, point.y))
  };
}

function isHeroHit(point) {
  if (state.hero.isDead) return false;
  return distance(point, state.hero) <= scaled(30);
}

function moveHeroToPath(point) {
  if (state.hero.isDead) return false;
  const maskHit = isPointInsidePathMask(point);
  if (maskHit === false) return false;
  if (maskHit === null) return false;

  const route = findMaskRoute(state.hero, point);
  if (!route || route.length < 2) return false;
  const [, ...steps] = route;
  state.hero.movePath = steps;
  state.hero.moveTarget = state.hero.movePath.shift() || null;
  state.hero.duelEnemyUid = null;
  state.heroMoveMode = false;
  return true;
}

function showTowerTooltip(slot, event) {
  const tower = slot.tower;
  if (!tower) {
    hideTowerTooltip();
    return;
  }
  const point = canvasPoint(event);
  const stagePoint = stagePointFromCanvasPoint(point);
  ui.towerTooltip.innerHTML = `
    <div class="tooltip-title">
      <strong>${tower.name}</strong>
      <em>Lv${tower.level}</em>
    </div>
    <div class="tooltip-stats">
      <span>${tower.damage_type === "magic" ? "法术" : "物理"}</span>
      <span>${tower.target_type === "air_ground" ? "空地" : tower.target_type === "air" ? "对空" : "对地"}</span>
      <span>攻 ${tower.attack}</span>
      <span>距 ${tower.range.toFixed(1)}</span>
    </div>
    <p>${towerCounterText(tower)}</p>
    <small>点击升级或拆除</small>
  `;
  const stageRect = ui.stage.getBoundingClientRect();
  const tooltipWidth = 258 * state.uiScale;
  const tooltipHeight = 118 * state.uiScale;
  const offset = 18 * state.uiScale;
  ui.towerTooltip.style.left = `${Math.min(stageRect.width - tooltipWidth - offset, stagePoint.x + offset)}px`;
  ui.towerTooltip.style.top = `${Math.max(offset, Math.min(stageRect.height - tooltipHeight - offset, stagePoint.y - offset))}px`;
  ui.towerTooltip.classList.remove("hidden");
}

function hideTowerTooltip() {
  ui.towerTooltip.classList.add("hidden");
}

canvas.addEventListener("click", (event) => {
  AudioSystem.unlock();
  const point = canvasPoint(event);
  const slot = state.slots.find((candidate) => distance(candidate, point) < scaled(42));
  if (isHeroHit(point)) {
    hideTowerPopup();
    state.heroMoveMode = true;
    AudioSystem.heroSelect();
    return;
  }

  if (slot && !state.gameOver && !state.victory) {
    state.heroMoveMode = false;
    showTowerPopup(slot);
    return;
  }

  if (state.heroMoveMode) {
    hideTowerPopup();
    moveHeroToPath(point);
    return;
  }

  if (!slot || state.gameOver || state.victory) {
    hideTowerPopup();
  }
});

canvas.addEventListener("mousemove", (event) => {
  const point = canvasPoint(event);
  const slot = state.slots.find((candidate) => distance(candidate, point) < scaled(42));
  state.hoveredSlot = slot || null;
  if (slot?.tower) showTowerTooltip(slot, event);
  else hideTowerTooltip();
  const maskHit = state.heroMoveMode ? isPointInsidePathMask(point) : false;
  canvas.style.cursor = isHeroHit(point) || maskHit || slot ? "pointer" : "default";
});

canvas.addEventListener("mouseleave", () => {
  state.hoveredSlot = null;
  hideTowerTooltip();
  canvas.style.cursor = "default";
});

window.addEventListener("resize", () => {
  if (state.selectedSlot) positionTowerPopup(state.selectedSlot);
});

let introTimer = null;

function playMenuSelect() {
  AudioSystem.unlock();
  AudioSystem.uiSelect();
}

let hoveredButton = null;

document.addEventListener(
  "pointerdown",
  () => {
    AudioSystem.unlock();
  },
  { capture: true, once: true }
);

document.addEventListener("pointerover", (event) => {
  if (event.pointerType === "touch") return;
  const button = event.target.closest("button");
  if (!button || button.disabled || button === hoveredButton) return;
  hoveredButton = button;
  AudioSystem.uiHover();
});

document.addEventListener("pointerout", (event) => {
  if (!hoveredButton) return;
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node && hoveredButton.contains(nextTarget)) return;
  hoveredButton = null;
});

function setStageMode(mode) {
  appState.mode = mode;
  ui.stage.classList.toggle("is-menu", mode === "menu");
  ui.stage.classList.toggle("is-intro", mode === "intro");
  ui.stage.classList.toggle("is-playing", mode === "playing");
}

function beginIntro() {
  playMenuSelect();
  state.paused = true;
  setStageMode("intro");
  ui.startScreen.classList.add("hidden");
  ui.introScreen.classList.remove("hidden");
  ui.introVideo.src = appState.introSrc;
  ui.introVideo.currentTime = 0;
  ui.introVideo.play().catch(() => {});
  window.clearTimeout(introTimer);
}

function enterGame() {
  window.clearTimeout(introTimer);
  ui.introVideo.pause();
  ui.introVideo.removeAttribute("src");
  ui.introVideo.load();
  ui.introScreen.classList.add("hidden");
  ui.startScreen.classList.add("hidden");
  state.paused = false;
  state.lastTime = performance.now();
  setStageMode("playing");
}

function backToHome() {
  window.location.reload();
}

function restartLevel() {
  state.hp = level.base.initial_hp;
  state.gold = level.economy.initial_gold;
  state.waveIndex = 0;
  state.waveActive = false;
  state.waveStartCountdown = null;
  state.paused = false;
  state.speed = 1;
  state.selectedTowerId = level.towers[0].id;
  state.selectedSlot = null;
  state.heroMoveMode = false;
  state.hoveredSlot = null;
  state.slots = level.map.tower_slots.map((slot) => ({
    ...slot,
    ...slotLayout[slot.position],
    tower: null
  }));
  state.enemies = [];
  state.projectiles = [];
  state.fireImpacts = [];
  state.towerAnimations = [];
  state.spawnQueue = [];
  state.spawnTimer = 0;
  state.bossSpawnTimer = null;
  state.nextEnemyId = 1;
  state.hero = createInitialHeroState();
  resetHeroPosition();
  state.bossSpeedBuffTimer = 0;
  state.gameOver = false;
  state.victory = false;
  pendingResult = null;
  state.time = 0;
  state.lastTime = performance.now();
  waveButtonSignature = "";
  hideTowerPopup();
  hideTowerTooltip();
  ui.resultModal.classList.add("hidden");
  ui.rankingModal.classList.add("hidden");
  setStageMode("playing");
  ui.introScreen.classList.add("hidden");
  ui.startScreen.classList.add("hidden");
  ui.introVideo.pause();
  ui.introVideo.removeAttribute("src");
  ui.introVideo.load();
}

ui.menuStart.addEventListener("click", beginIntro);
ui.menuRanking.addEventListener("click", () => {
  playMenuSelect();
  openRanking();
});
ui.skipIntro.addEventListener("click", enterGame);
ui.introVideo.addEventListener("ended", enterGame);
ui.introVideo.addEventListener("error", () => {
  ui.introVideo.removeAttribute("src");
  ui.introVideo.load();
  window.clearTimeout(introTimer);
  introTimer = window.setTimeout(enterGame, 5200);
});
ui.waveControl.addEventListener("click", (event) => {
  const button = event.target.closest(".start-wave");
  if (!button) return;
  startWave(button.dataset.pathId);
});
ui.toggleMusic.addEventListener("click", () => {
  playMenuSelect();
  AudioSystem.toggleMusic();
});
ui.toggleSfx.addEventListener("click", () => {
  AudioSystem.unlock();
  AudioSystem.toggleSfxWithFeedback();
});
ui.menuToggleMusic.addEventListener("click", () => {
  playMenuSelect();
  AudioSystem.toggleMusic();
});
ui.menuToggleSfx.addEventListener("click", () => {
  AudioSystem.unlock();
  AudioSystem.toggleSfxWithFeedback();
});
ui.togglePause.addEventListener("click", () => {
  if (appState.mode !== "playing") return;
  state.paused = !state.paused;
});
ui.backHome.addEventListener("click", backToHome);
ui.restart.addEventListener("click", restartLevel);
ui.skillBuff.addEventListener("click", useBuffSkill);
ui.skillLine.addEventListener("click", useLineSkill);
ui.resultNext.addEventListener("click", submitResultToRanking);
ui.resultRanking.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && pendingResult) submitResultToRanking();
});
ui.resultRestart.addEventListener("click", restartLevel);
ui.resultBack.addEventListener("click", backToHome);
ui.closeRanking.addEventListener("click", () => ui.rankingModal.classList.add("hidden"));

function loop(now) {
  updateUiScale();
  const dt = (now - state.lastTime) / 1000;
  state.lastTime = now;
  update(dt);
  draw();
  renderUi();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", updateUiScale);
updateUiScale();
renderTowerPopup();
preloadGameAssets();
requestAnimationFrame(loop);

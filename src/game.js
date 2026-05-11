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
  stats: document.querySelector("#stats"),
  towerPopup: document.querySelector("#towerPopup"),
  towerTooltip: document.querySelector("#towerTooltip"),
  waveInfo: document.querySelector("#waveInfo"),
  logPanel: document.querySelector("#logPanel"),
  toggleLog: document.querySelector("#toggleLog"),
  log: document.querySelector("#log"),
  heroPortrait: document.querySelector(".hero-portrait"),
  heroStatus: document.querySelector("#heroStatus"),
  waveControl: document.querySelector("#waveControl"),
  toggleMusic: document.querySelector("#toggleMusic"),
  toggleSfx: document.querySelector("#toggleSfx"),
  togglePause: document.querySelector("#togglePause"),
  restart: document.querySelector("#restart"),
  skillBuff: document.querySelector("#skillBuff"),
  skillLine: document.querySelector("#skillLine"),
  resultModal: document.querySelector("#resultModal"),
  resultTitle: document.querySelector("#resultTitle"),
  resultBody: document.querySelector("#resultBody"),
  closeResult: document.querySelector("#closeResult")
};

const appState = {
  mode: "menu",
  introSrc: "./assets/intro_cutscene.mp4"
};

const level = await fetch("./data/level_001_hulaoguan.json").then((res) => res.json());
const WORLD_SCALE = 2;
const scaled = (value) => value * WORLD_SCALE;
const NAV_CELL = scaled(12);

const mapImage = new Image();
mapImage.src = "./assets/hulaoguan_map.png?v=20260509-video-env-v3";
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
    enemyAttack: "./assets/audio/enemy_attack_01.ogg",
    enemyDeath: "./assets/audio/enemy_death_01.ogg",
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
    result: 0.55
  };
  let musicEnabled = true;
  let sfxEnabled = true;
  let unlocked = false;
  let currentMusic = null;
  let currentMusicKey = null;
  let musicDuckTimer = null;
  const lastPlayed = new Map();
  const samplePool = new Map();

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
    if (!sfxEnabled || !unlocked || !src) return;
    const base = samplePool.get(src) || makeAudio(src, { volume });
    samplePool.set(src, base);
    const audio = base.cloneNode();
    audio.volume = volume;
    audio.play().catch(() => {});
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
    const strong = button.querySelector("strong");
    if (strong) strong.textContent = enabled ? "ON" : "OFF";
    else button.textContent = enabled ? onText : offText;
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
    enemyAttack() {
      playSample("enemyAttack", sources.enemyAttack, baseVolumes.enemyAttack, 0.08);
    },
    enemyDeath(enemy) {
      playSample(`enemyDeath:${enemy.uid}`, sources.enemyDeath, enemy.isBoss ? baseVolumes.enemyDeath * 1.2 : baseVolumes.enemyDeath, 0.2);
    },
    result(victory) {
      playSample(victory ? "resultVictory" : "resultDefeat", victory ? sources.upgrade : sources.heroDeath, baseVolumes.result, 0.5);
    }
  };
})();
const pathMaskImage = new Image();
pathMaskImage.src = "./assets/path_mask.png";
const heroImage = new Image();
heroImage.src = "./assets/hero_liubei.png";
const heroIdleImage = new Image();
heroIdleImage.src = "./assets/characters/heroes/liubei/idle.png";
const heroWalkImage = new Image();
heroWalkImage.src = "./assets/characters/heroes/liubei/walk.png";
const heroAttackImage = new Image();
heroAttackImage.src = "./assets/characters/heroes/liubei/attack.png";
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
        idleSize: 132,
        walkSize: 148,
        attackSize: 154,
        skill1Size: 176,
        skill2Size: 190,
        deathSize: 148,
        idleYOffset: 44,
        yOffset: 50,
        skillYOffset: 58
      }
    : {
        idle: heroIdleSprite,
        walk: heroWalkSprite,
        attack: heroAttackSprite,
        skill1: heroSkill1Sprite,
        skill2: heroSkill2Sprite,
        death: heroDeathSprite,
        idleSize: 92,
        walkSize: 118,
        attackSize: 118,
        skill1Size: 150,
        skill2Size: 190,
        deathSize: 118,
        idleYOffset: 26,
        yOffset: 38,
        skillYOffset: 58
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
function prepareSpriteSheet(image, sprite) {
  sprite.canvas.width = image.naturalWidth;
  sprite.canvas.height = image.naturalHeight;
  sprite.frameWidth = image.naturalWidth / sprite.columns;
  sprite.frameHeight = image.naturalHeight / sprite.rows;

  const spriteCtx = sprite.canvas.getContext("2d", { willReadFrequently: true });
  spriteCtx.drawImage(image, 0, 0);
  const imageData = spriteCtx.getImageData(0, 0, sprite.canvas.width, sprite.canvas.height);
  const pixels = imageData.data;
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
  prepareSpriteSheet(knifeSoldierWalkImage, knifeSoldierWalkSprite);
});
knifeSoldierWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierWalkFrontImage, knifeSoldierWalkFrontSprite);
});
knifeSoldierWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierWalkBackImage, knifeSoldierWalkBackSprite);
});
knifeSoldierAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(knifeSoldierAttackImage, knifeSoldierAttackSprite);
});
ironCavalryWalkImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkImage, ironCavalryWalkSprite);
});
ironCavalryWalkFrontImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkFrontImage, ironCavalryWalkFrontSprite);
});
ironCavalryWalkBackImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryWalkBackImage, ironCavalryWalkBackSprite);
});
ironCavalryAttackImage.addEventListener("load", () => {
  prepareSpriteSheet(ironCavalryAttackImage, ironCavalryAttackSprite);
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
  towerAnimations: [],
  spawnQueue: [],
  spawnTimer: 0,
  bossSpawnTimer: null,
  nextEnemyId: 1,
  hero: {
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
  },
  bossSpeedBuffTimer: 0,
  gameOver: false,
  victory: false,
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
  level.hero.id === "hero_lvbu" ? 'url("./assets/characters/heroes/lvbu/idle.png")' : 'url("./assets/hero_liubei.png")'
);
const heroStart = interpolatePath(state.hero.progress, pathById[state.hero.pathId]);
state.hero.x = heroStart.x;
state.hero.y = heroStart.y;

function log(message) {
  const line = document.createElement("div");
  line.textContent = message;
  ui.log.prepend(line);
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
  log(`第 ${wave.wave} 波来袭，敌军将从多入口进入${pathId ? `，你从${pathById[pathId]?.name || "入口"}发出迎战号令` : ""}`);
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
  log(`${slot.slot_id} 建造 ${towerConfig.name}`);
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
  log(`${slot.slot_id} ${slot.tower.name} 升至 ${slot.tower.level} 级`);
  hideTowerPopup();
}

function sellTower(slot) {
  if (!slot.tower) return;
  const refund = Math.floor(slot.tower.buildCost * 0.8);
  const animation = towerLifecycleAnimations.dismantle;
  log(`${slot.slot_id} 拆除 ${slot.tower.name}，返还 ${refund} 金`);
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

function dealDamage(enemy, amount, damageType) {
  const resistance = damageType === "physical" ? enemy.physical_resistance || 0 : enemy.magic_resistance || 0;
  const finalDamage = Math.max(1, amount * (1 - resistance));
  enemy.currentHp -= finalDamage;
  return finalDamage;
}

function damageHero(amount, sourceName) {
  const hero = state.hero;
  if (hero.isDead || state.gameOver || state.victory) return;
  hero.hp = Math.max(0, hero.hp - amount);
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
  log(`${sourceName} 击倒${level.hero.name}，${level.hero.revive_cooldown || 30}s 后复活`);
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
  if (next) log(`${level.hero.name}迎战${next.name}`);
  return next || null;
}

function killEnemy(enemy) {
  state.gold += enemy.reward_gold || 0;
  if (enemy.uid === state.hero.duelEnemyUid) state.hero.duelEnemyUid = null;
  if (enemy.isBoss) log(`${enemy.name}被击败`);
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
      log(`${lookup.boss.name}登场`);
    }
  }
}

function updateEnemies(dt) {
  const speedMultiplier = state.bossSpeedBuffTimer > 0 ? 1 + bossSpeedSkill.value : 1;
  const duelEnemy = refreshHeroDuel();
  state.enemies.forEach((enemy) => {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    if (enemy.fireDot > 0) {
      enemy.fireDot -= dt;
      dealDamage(enemy, enemy.fireDps * dt, "magic");
    }

    if (enemy.isBoss) {
      enemy.dashCooldown -= dt;
      enemy.roarCooldown -= dt;
      if (enemy.dashCooldown <= 0) {
        enemy.progress += bossDashSkill.distance;
        enemy.dashCooldown = bossDashSkill.cooldown;
        log(`${enemy.name}使用${bossDashSkill.name}`);
      }
      if (enemy.roarCooldown <= 0) {
        state.bossSpeedBuffTimer = bossSpeedSkill.duration;
        enemy.roarCooldown = bossSpeedSkill.cooldown;
        log(`${enemy.name}使用${bossSpeedSkill.name}`);
      }
    }

    const canFightHero = duelEnemy && enemy.uid === duelEnemy.uid && distance(enemy, state.hero) <= heroEngageRange(enemy);
    if (canFightHero) {
      updateEnemyWalkDirection(enemy, state.hero.x - enemy.x, state.hero.y - enemy.y);
      if (enemy.attackCooldown <= 0) {
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
    log(`${enemy.name} 突破防线，扣血 ${enemy.leak_damage}`);
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

    dealDamage(target, tower.attack, tower.damage_type);
    if (tower.id === "fire_tower") {
      target.fireDot = tower.dot_duration || 3;
      target.fireDps = tower.attack * 0.35;
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
        color: "#ff9d2e"
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
      log(`${level.hero.name}复活，可再次投入战斗`);
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
    hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.018 * dt);
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
      dealDamage(target, level.hero.attack, "physical");
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
  log(`第 ${wave.wave} 波结束，奖励 ${wave.reward} 金`);
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

function showResult(victory) {
  state.gameOver = !victory;
  state.victory = victory;
  const stars = victory ? starsForHp(state.hp) : 0;
  ui.resultTitle.textContent = victory ? `${stars} 星通关` : "防线失守";
  ui.resultBody.textContent = victory
    ? `剩余城防 ${state.hp}/${level.base.max_hp}，获得 ${stars} 星评价。`
    : `城防归零。调整建塔位置和技能时机后再战。`;
  ui.resultModal.classList.remove("hidden");
  AudioSystem.result(victory);
}

function damageEnemiesAroundHero(skill, damageType) {
  const radius = scaled((skill.radius || 2.5) * 58);
  let hitCount = 0;
  state.enemies.forEach((enemy) => {
    if (distance(state.hero, enemy) <= radius) {
      dealDamage(enemy, skill.damage, damageType);
      hitCount += 1;
    }
  });
  state.projectiles.push({
    x1: state.hero.x - radius,
    y1: state.hero.y,
    x2: state.hero.x + radius,
    y2: state.hero.y,
    life: 0.18,
    color: damageType === "magic" ? "#78b9e8" : "#ffe84f"
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
  log(`${level.hero.name}释放${skill.name}，命中 ${hitCount} 个敌军`);
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
  log(`${level.hero.name}释放${skill.name}，造成魔法伤害，命中 ${hitCount} 个敌军`);
}

function updateProjectiles(dt) {
  state.projectiles.forEach((projectile) => {
    projectile.life -= dt;
  });
  state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0);
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
          walkSize: 82,
          attackSize: 90,
          yOffset: 28,
          attackYOffset: 32,
          healthY: -58,
          labelY: 28,
          shadowX: 3,
          shadowY: 14,
          shadowW: 23,
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
              walkSize: 86,
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
                    walkSize: 118,
                    attackSize: 128,
                    yOffset: 38,
                    attackYOffset: 42,
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

  const isAttacking = enemy.attackTimer > 0 && spriteSet.attack.ready;
  const sprite = isAttacking
    ? spriteSet.attack
    : enemy.walkDirection === "front"
      ? spriteSet.walkFront
      : enemy.walkDirection === "back"
        ? spriteSet.walkBack
        : spriteSet.walk;
  if (!sprite.ready) return null;

  return { ...spriteSet, sprite, isAttacking };
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const animatedEnemySprite = getAnimatedEnemySprite(enemy);
    if (animatedEnemySprite) {
      const { sprite, isAttacking } = animatedEnemySprite;
      const shadowKey = isAttacking ? "attack" : enemy.walkDirection;
      const shadow = animatedEnemySprite.shadows?.[shadowKey] || {
        x: animatedEnemySprite.shadowX,
        y: animatedEnemySprite.shadowY,
        w: animatedEnemySprite.shadowW,
        h: animatedEnemySprite.shadowH
      };
      ctx.fillStyle = "rgb(0 0 0 / 0.28)";
      ctx.beginPath();
      ctx.ellipse(
        scaled(shadow.x),
        scaled(shadow.y),
        scaled(shadow.w),
        scaled(shadow.h),
        -0.15,
        0,
        Math.PI * 2
      );
      ctx.fill();
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
        scaled(isAttacking ? animatedEnemySprite.attackSize : animatedEnemySprite.walkSize),
        scaled(isAttacking ? animatedEnemySprite.attackSize : animatedEnemySprite.walkSize),
        scaled(isAttacking ? animatedEnemySprite.attackYOffset : animatedEnemySprite.yOffset),
        shouldFlip
      );
      ctx.fillStyle = "#11140f";
      ctx.fillRect(scaled(-22), scaled(animatedEnemySprite.healthY), scaled(44), scaled(5));
      ctx.fillStyle = enemy.currentHp / enemy.maxHp > 0.45 ? "#78d06f" : "#e15d50";
      ctx.fillRect(scaled(-22), scaled(animatedEnemySprite.healthY), scaled(44) * Math.max(0, enemy.currentHp / enemy.maxHp), scaled(5));
      ctx.fillStyle = "#fff8dc";
      ctx.font = `700 ${scaled(11)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(enemy.name.slice(2, 4), 0, scaled(animatedEnemySprite.labelY));
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
    ctx.fillStyle = "#11140f";
    ctx.fillRect(scaled(-22), -radius - scaled(13), scaled(44), scaled(5));
    ctx.fillStyle = enemy.currentHp / enemy.maxHp > 0.45 ? "#78d06f" : "#e15d50";
    ctx.fillRect(scaled(-22), -radius - scaled(13), scaled(44) * Math.max(0, enemy.currentHp / enemy.maxHp), scaled(5));
    ctx.fillStyle = "#fff8dc";
    ctx.font = `700 ${scaled(11)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(enemy.isBoss ? enemy.name : enemy.name.slice(2, 4), 0, radius + scaled(15));
    ctx.restore();
}

function drawEnemies() {
  const enemiesByDepth = [...state.enemies].sort((a, b) => a.y - b.y || a.progress - b.progress || a.uid - b.uid);
  enemiesByDepth.forEach(drawEnemy);
}

function drawHeroSprite(sprite, frameIndex, width, height, yOffset, flip = false) {
  const frameX = (frameIndex % sprite.columns) * sprite.frameWidth;
  const frameY = Math.floor(frameIndex / sprite.columns) * sprite.frameHeight;
  ctx.save();
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(
    sprite.canvas,
    frameX,
    frameY,
    sprite.frameWidth,
    sprite.frameHeight,
    -width / 2,
    -height + yOffset,
    width,
    height
  );
  ctx.restore();
}

function drawHero() {
  const sprites = defenderSpriteSet();
  ctx.save();
  ctx.translate(state.hero.x, state.hero.y);
  ctx.fillStyle = "rgb(0 0 0 / 0.34)";
  ctx.beginPath();
  ctx.ellipse(scaled(2), scaled(18), scaled(28), scaled(11), -0.18, 0, Math.PI * 2);
  ctx.fill();

  if (state.heroMoveMode) {
    ctx.strokeStyle = "#ffe84f";
    ctx.lineWidth = scaled(4);
    ctx.beginPath();
    ctx.ellipse(0, scaled(18), scaled(36), scaled(15), -0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.hero.isDead) {
    if (sprites.death.ready) {
      const frameIndex = Math.min(sprites.death.frameCount - 1, Math.floor(state.hero.deathTimer * sprites.death.fps));
      drawHeroSprite(sprites.death, frameIndex, scaled(sprites.deathSize), scaled(sprites.deathSize), scaled(sprites.yOffset), state.hero.facing > 0);
    }
    ctx.restore();
    return;
  }

  const shouldPlayWalk = Boolean(state.hero.moveTarget) && sprites.walk.ready;
  const shouldPlaySkill1 = state.hero.action === "skill1" && state.hero.attackTimer > 0 && sprites.skill1.ready;
  const shouldPlaySkill2 = state.hero.action === "skill2" && state.hero.attackTimer > 0 && sprites.skill2.ready;
  const shouldPlayAttack = state.hero.attackTimer > 0 && sprites.attack.ready;
  const shouldPlayIdle = !state.heroMoveMode && !state.hero.moveTarget && state.hero.attackTimer <= 0 && sprites.idle.ready;
  if (shouldPlaySkill1) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.skill1.frameCount - 1, Math.floor(progress * sprites.skill1.frameCount));
    drawHeroSprite(sprites.skill1, frameIndex, scaled(sprites.skill1Size), scaled(sprites.skill1Size), scaled(sprites.skillYOffset), state.hero.facing > 0);
  } else if (shouldPlaySkill2) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.skill2.frameCount - 1, Math.floor(progress * sprites.skill2.frameCount));
    drawHeroSprite(sprites.skill2, frameIndex, scaled(sprites.skill2Size), scaled(sprites.skill2Size), scaled(sprites.skillYOffset), state.hero.facing > 0);
  } else if (shouldPlayAttack) {
    const progress = 1 - state.hero.attackTimer / Math.max(0.001, state.hero.attackDuration || 1);
    const frameIndex = Math.min(sprites.attack.frameCount - 1, Math.floor(progress * sprites.attack.frameCount));
    drawHeroSprite(sprites.attack, frameIndex, scaled(sprites.attackSize), scaled(sprites.attackSize), scaled(sprites.yOffset), state.hero.facing > 0);
  } else if (shouldPlayWalk) {
    const frameIndex = Math.floor(state.time * sprites.walk.fps) % sprites.walk.frameCount;
    drawHeroSprite(sprites.walk, frameIndex, scaled(sprites.walkSize), scaled(sprites.walkSize), scaled(sprites.yOffset), state.hero.facing > 0);
  } else if (shouldPlayIdle) {
    const frameIndex = Math.floor(state.time * sprites.idle.fps) % sprites.idle.frameCount;
    drawHeroSprite(sprites.idle, frameIndex, scaled(sprites.idleSize), scaled(sprites.idleSize), scaled(sprites.idleYOffset));
  } else if (heroImage.complete && heroImage.naturalWidth > 0) {
    const width = scaled(82);
    const height = scaled(82);
    ctx.save();
    ctx.drawImage(heroImage, -width / 2, -height + scaled(24), width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = "#5ea3db";
    ctx.beginPath();
    ctx.arc(0, 0, scaled(20), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f0e7";
    ctx.lineWidth = scaled(3);
    ctx.stroke();
    ctx.fillStyle = "#10140f";
    ctx.font = `700 ${scaled(13)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("刘", 0, 1);
  }

  ctx.fillStyle = "#fff7df";
  ctx.font = `700 ${scaled(11)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.heroMoveMode ? "放置" : "英雄", 0, scaled(33));
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
      const x = projectile.x1 + (projectile.x2 - projectile.x1) * progress;
      const y = projectile.y1 + (projectile.y2 - projectile.y1) * progress - Math.sin(progress * Math.PI) * scaled(22 + level * 5);
      const radius = scaled(6 + level * 2);
      const trailProgress = Math.max(0, progress - (0.1 + level * 0.025));
      const trailX = projectile.x1 + (projectile.x2 - projectile.x1) * trailProgress;
      const trailY = projectile.y1 + (projectile.y2 - projectile.y1) * trailProgress - Math.sin(trailProgress * Math.PI) * scaled(22 + level * 5);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * (2.8 + level * 0.35));

      glow.addColorStop(0, "rgb(255 246 167 / 0.98)");
      glow.addColorStop(0.35, level >= 3 ? "rgb(255 103 29 / 0.88)" : "rgb(255 141 39 / 0.78)");
      glow.addColorStop(1, "rgb(255 42 18 / 0)");
      ctx.save();
      ctx.strokeStyle = level >= 3 ? "rgb(255 67 24 / 0.62)" : "rgb(255 117 35 / 0.45)";
      ctx.lineWidth = scaled(4 + level * 1.5);
      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(x, y);
      ctx.stroke();
      if (level >= 2) {
        ctx.strokeStyle = "rgb(255 218 76 / 0.58)";
        ctx.lineWidth = scaled(1.5 + level * 0.5);
        ctx.beginPath();
        ctx.moveTo(trailX, trailY - scaled(4));
        ctx.lineTo(x, y);
        ctx.moveTo(trailX, trailY + scaled(4));
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * (2.8 + level * 0.35), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = level >= 3 ? "#fff0a3" : "#fff4a3";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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
  const signature = `${state.waveIndex}:${countdown ?? "ready"}:${Math.round(canvasRect.width)}:${Math.round(canvasRect.height)}`;
  if (signature === waveButtonSignature) return;
  waveButtonSignature = signature;
  ui.waveControl.innerHTML = entrancePathsForWave(level.waves[state.waveIndex])
    .map((path) => {
      const entrance = clampStagePoint(stagePointFromCanvasPoint(path.points[0]), 40);
      const label = countdown === null ? "战" : countdown;
      return `
        <button class="start-wave" type="button" data-path-id="${path.id}" style="left:${entrance.x}px; top:${entrance.y}px" title="${path.name}">
          <span>${label}</span>
        </button>
      `;
    })
    .join("");
}

function renderUi() {
  ui.stats.innerHTML = [
    ["hp", "♥", `${state.hp}`],
    ["gold", "●", `${state.gold}`],
    ["wave", "☠", `${Math.min(state.waveIndex + 1, level.waves.length)}/${level.waves.length}`],
    ["speed", "▶", `${state.speed}x`]
  ]
    .map(
      ([type, icon, value]) => `
        <div class="stat">
          <span class="stat-icon ${type}">${icon}</span>
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
  ui.skillBuff.textContent = state.hero.isDead ? "倒地" : state.hero.buffCooldown > 0 ? `${state.hero.buffCooldown.toFixed(0)}s` : level.hero.skills[0].name.slice(0, 2);
  ui.skillLine.disabled = state.hero.lineCooldown > 0 || state.hero.isDead;
  ui.skillLine.textContent = state.hero.isDead ? "倒地" : state.hero.lineCooldown > 0 ? `${state.hero.lineCooldown.toFixed(0)}s` : level.hero.skills[1].name.slice(0, 2);
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
  arrow_tower: "./assets/tower_menu_icons/dragon_tower.jpg",
  crossbow_tower: "./assets/tower_menu_icons/watch_tower.jpg",
  magic_tower: "./assets/tower_menu_icons/magic_tower.jpg",
  fire_tower: "./assets/tower_menu_icons/fire_tower.jpg",
  watchtower: "./assets/tower_menu_icons/cannon_tower.jpg"
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

function positionTowerPopup(slot) {
  const stageRect = document.querySelector(".stage").getBoundingClientRect();
  const canvasRect = canvasDisplayRectInStage();
  const x = canvasRect.left + (slot.x / canvas.width) * canvasRect.width;
  const y = canvasRect.top + (slot.y / canvas.height) * canvasRect.height;
  const marginX = slot.tower ? 160 : 180;
  const marginY = slot.tower ? 140 : 180;
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
  log(`${level.hero.name}沿道路移动`);
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
  ui.towerTooltip.style.left = `${Math.min(window.innerWidth - 260, stagePoint.x + 18)}px`;
  ui.towerTooltip.style.top = `${Math.max(18, stagePoint.y - 18)}px`;
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
    log(`已选中${level.hero.name}，点击道路任意位置放置`);
    return;
  }

  if (slot && !state.gameOver && !state.victory) {
    state.heroMoveMode = false;
    showTowerPopup(slot);
    return;
  }

  if (state.heroMoveMode) {
    hideTowerPopup();
    if (!moveHeroToPath(point)) log("只能把英雄放置在敌军行径道路上");
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

ui.menuStart.addEventListener("click", beginIntro);
ui.menuRanking.addEventListener("click", () => {
  playMenuSelect();
  log("排行榜功能预留中");
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
ui.restart.addEventListener("click", () => window.location.reload());
ui.toggleLog.addEventListener("click", () => {
  ui.logPanel.classList.toggle("collapsed");
});
ui.skillBuff.addEventListener("click", useBuffSkill);
ui.skillLine.addEventListener("click", useLineSkill);
ui.closeResult.addEventListener("click", () => ui.resultModal.classList.add("hidden"));
document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    state.speed = Number(button.dataset.speed);
    document.querySelectorAll("[data-speed]").forEach((target) => target.classList.toggle("active", target === button));
  });
});

function loop(now) {
  const dt = (now - state.lastTime) / 1000;
  state.lastTime = now;
  update(dt);
  draw();
  renderUi();
  requestAnimationFrame(loop);
}

renderTowerPopup();
log("虎牢关防御部署完成");
document.querySelector('[data-speed="1"]').classList.add("active");
requestAnimationFrame(loop);

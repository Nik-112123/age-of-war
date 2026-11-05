export const WORLD = {
  width: 2000,
  height: 420,
  groundY: 340,
  baseWidth: 110,
  baseHeight: 170,
  baseHp: 1000,
}

export const ECONOMY = {
  startGold: 50,
  passiveIncome: 10,
}

export const AI_CONFIG = {
  minDelay: 2.4,
  maxDelay: 5.2,
  retryDelay: 0.25,
  maxUnits: 10,
}

export const TEAM_COLORS = {
  player: '#3b82f6',
  ai: '#ef4444',
}

export const TEAM_DIRECTION = {
  player: 1,
  ai: -1,
}

export const VIEWPORT = {
  width: 1000,
  height: 600,
}

// Масштаб подобран так, чтобы вся высота мира занимала холст по вертикали.
export const ZOOM = VIEWPORT.height / WORLD.height

// Юниты, доступные игроку и ИИ. Остальные типы остаются в UNIT_TYPES, но не появляются в игре.
export const ENABLED_UNIT_IDS = ['sniper']

// Каждая анимация - сетка кадров, читаемая слева направо и сверху вниз.
// src - путь к PNG (файлы кладутся в public/sprites/...).
// frameWidth - ширина кадра в PNG, по нему считается число колонок; высота кадра берется из размера картинки.
// Пока frameWidth не задан, анимация показывается заглушкой с номерами кадров и PNG не запрашивается.
// frames - реальное число кадров (в последнем ряду сетки кадров может быть меньше), fps - скорость смены.
// loop - крутить по кругу, skipFrames - номера кадров, которые пропускаются при зацикливании (дубли), pingpong - проигрывать туда-обратно (важнее loop), pingpongStart - кадр, до которого идет обратный ход, restartFrame - с кадра начинается каждая серия атаки после первой, lowerFrame - кадр, на котором атака при потере цели останавливается и юнит переходит к ходьбе, attackInterval - пауза между сериями выстрелов.
// feetRatio - доля высоты кадра, на которой стоят ноги юнита: по ней спрайт ставится на землю.
// spriteHeight - высота юнита на экране; size - ширина для расчета дистанций между юнитами.
// hitFrames - номера кадров атаки, на каждом из которых наносится удар (для снайпера - выстрел и вылет пули).
// muzzle - точка вылета пули относительно ног юнита, смотря вправо.
export const UNIT_TYPES = {
  infantry: {
    name: 'Пехотинец',
    icon: 'П',
    cost: 15,
    hp: 60,
    damage: 8,
    speed: 60,
    attackInterval: 0.8,
    range: 16,
    size: 34,
    spriteHeight: 112,
    hitFrames: [3],
    reward: 5,
    color: '#38bdf8',
    animations: {
      idle: { src: '/sprites/infantry/idle.png', frames: 8, fps: 6, loop: true },
      walk: { src: '/sprites/infantry/walk.png', frames: 8, fps: 10, loop: true },
      attack: { src: '/sprites/infantry/attack.png', frames: 6, fps: 12, loop: false },
      death: { src: '/sprites/infantry/death.png', frames: 6, fps: 8, loop: false },
    },
  },
  sniper: {
    name: 'Снайпер',
    icon: 'С',
    cost: 30,
    hp: 40,
    damage: 10,
    speed: 50,
    attackInterval: 1.5,
    range: 500,
    size: 34,
    spriteHeight: 112,
    ranged: true,
    hitFrames: [49, 73, 85],
    muzzle: { x: 32, y: -84 },
    reward: 8,
    color: '#34d399',
    animations: {
      idle: { src: '/sprites/sniper/idle.png', frameWidth: 190.4, frames: 100, fps: 30, loop: true, pingpong: true, pingpongStart: 40, feetRatio: 0.94 },
      walk: { src: '/sprites/sniper/walk.png', frameWidth: 544, frames: 43, fps: 30, loop: true, skipFrames: [0, 20], feetRatio: 0.94 },
      attack: { src: '/sprites/sniper/attack.png', frameWidth: 190.4, frames: 101, fps: 30, loop: false, pingpong: true, restartFrame: 40, lowerFrame: 40, feetRatio: 0.94 },
      death: { src: '/sprites/sniper/death.png', frameWidth: 544, frames: 73, fps: 30, loop: false, feetRatio: 0.94 },
    },
  },
  knight: {
    name: 'Рыцарь',
    icon: 'Р',
    cost: 70,
    hp: 220,
    damage: 28,
    speed: 36,
    attackInterval: 1.5,
    range: 18,
    size: 52,
    spriteHeight: 147,
    hitFrames: [4],
    reward: 20,
    color: '#fbbf24',
    animations: {
      idle: { src: '/sprites/knight/idle.png', frames: 6, fps: 5, loop: true },
      walk: { src: '/sprites/knight/walk.png', frames: 8, fps: 8, loop: true },
      attack: { src: '/sprites/knight/attack.png', frames: 8, fps: 12, loop: false },
      death: { src: '/sprites/knight/death.png', frames: 8, fps: 8, loop: false },
    },
  },
}

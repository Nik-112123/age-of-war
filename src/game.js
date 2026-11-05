import { WORLD, ECONOMY, UNIT_TYPES, AI_CONFIG, TEAM_DIRECTION, ENABLED_UNIT_IDS } from './config.js'
import { advanceAnimation, attackFrameAt, swingSteps, isDeathFinished } from './unit-animation.js'

const ENEMY = { player: 'ai', ai: 'player' }

const SOFT_PUSH_RANGE = 28
const SOFT_PUSH_SPEED = 30
const FLASH_PARTICLE_COUNT = 14

export function createGame() {
  return {
    status: 'playing',
    paused: false,
    gold: { player: ECONOMY.startGold, ai: ECONOMY.startGold },
    baseHp: { player: WORLD.baseHp, ai: WORLD.baseHp },
    units: [],
    particles: [],
    nextId: 1,
    aiTimer: 1,
  }
}

export function baseEdgeX(team) {
  return team === 'player' ? WORLD.baseWidth : WORLD.width - WORLD.baseWidth
}

export function spawnUnit(state, team, typeId) {
  if (state.status !== 'playing' || state.paused) return false
  const type = UNIT_TYPES[typeId]
  if (state.gold[team] < type.cost) return false

  state.gold[team] -= type.cost
  state.units.push({
    id: state.nextId++,
    team,
    type: typeId,
    x: baseEdgeX(team) + TEAM_DIRECTION[team] * type.size / 2,
    hp: type.hp,
    attackPause: 0,
    attackHold: false,
    attackFrame: 0,
    moving: false,
    swing: null,
    swingStart: 0,
    swingStep: -1,
    swingTarget: null,
    lowering: false,
    lastShotFrame: null,
    hasSwung: false,
    animState: 'idle',
    animTime: 0,
    dying: false,
  })
  return true
}

export function updateGame(state, dt) {
  if (state.paused) return
  if (state.status === 'playing') simulate(state, dt)
  for (const unit of state.units) advanceAnimation(unit, dt)
  updateParticles(state, dt)
  updateDeaths(state)
}

function simulate(state, dt) {
  state.gold.player += ECONOMY.passiveIncome * dt
  state.gold.ai += ECONOMY.passiveIncome * dt
  updateAi(state, dt)

  for (const unit of state.units) {
    if (!unit.dying) updateUnit(state, unit, dt)
  }

  if (state.baseHp.ai <= 0) state.status = 'won'
  else if (state.baseHp.player <= 0) state.status = 'lost'
}

function updateAi(state, dt) {
  state.aiTimer -= dt
  if (state.aiTimer > 0) return

  const enemyCount = state.units.filter((unit) => unit.team === 'ai' && !unit.dying).length
  const affordable = ENABLED_UNIT_IDS.filter((id) => state.gold.ai >= UNIT_TYPES[id].cost)
  if (enemyCount >= AI_CONFIG.maxUnits || affordable.length === 0) {
    state.aiTimer = AI_CONFIG.retryDelay
    return
  }

  const pick = affordable[Math.floor(Math.random() * affordable.length)]
  spawnUnit(state, 'ai', pick)
  state.aiTimer = AI_CONFIG.minDelay + Math.random() * (AI_CONFIG.maxDelay - AI_CONFIG.minDelay)
}

function updateUnit(state, unit, dt) {
  const type = UNIT_TYPES[unit.type]
  const dir = TEAM_DIRECTION[unit.team]

  let target = findTarget(state, unit, type, dir)
  const hadSwing = unit.swing !== null
  if (hadSwing) advanceSwing(state, unit, type, dt, target)

  target = findTarget(state, unit, type, dir)
  unit.attackHold = Boolean(target)
  if (target) {
    if (!hadSwing && unit.swing === null && unit.attackPause > 0) {
      unit.attackPause = Math.max(0, unit.attackPause - dt)
    }
    if (unit.attackPause <= 0 && unit.swing === null) startSwing(unit, type, target)
  } else {
    unit.attackPause = 0
  }

  unit.moving = !target && unit.swing === null
  if (unit.moving) unit.x += dir * type.speed * dt
  separateFromAllies(state, unit, dt)
}

function separateFromAllies(state, unit, dt) {
  for (const other of state.units) {
    if (other === unit || other.team !== unit.team || other.dying) continue
    const gap = unit.x - other.x
    if (Math.abs(gap) < SOFT_PUSH_RANGE) {
      unit.x += (gap >= 0 ? 1 : -1) * SOFT_PUSH_SPEED * dt
    }
  }
}

function startSwing(unit, type, target) {
  const attack = type.animations.attack
  unit.swing = 0
  unit.swingStart = unit.hasSwung ? (attack.restartFrame ?? 0) : 0
  unit.attackFrame = unit.swingStart
  unit.attackPause = 0
  unit.swingStep = -1
  unit.swingTarget = target
  unit.hasSwung = true
}

function advanceSwing(state, unit, type, dt, target) {
  const attack = type.animations.attack
  unit.lowering = !target
  if (target) unit.swingTarget = target

  const steps = swingSteps(attack, unit.swingStart, unit.lowering)
  unit.swing += dt
  const elapsed = Math.floor(unit.swing * attack.fps)
  const reached = Math.min(elapsed, steps)

  const forwardSteps = attack.frames - 1 - unit.swingStart
  if (!unit.lowering) {
    for (let step = unit.swingStep + 1; step <= Math.min(reached, forwardSteps); step++) {
      const frame = attackFrameAt(attack, unit.swingStart, step)
      if (type.hitFrames.includes(frame) && frame !== unit.lastShotFrame) {
        unit.lastShotFrame = frame
        strike(state, unit, type)
      }
    }
  }
  unit.swingStep = reached
  unit.attackFrame = attackFrameAt(attack, unit.swingStart, reached)

  if (elapsed >= steps) finishSwing(unit, type, steps)
}

function finishSwing(unit, type, steps) {
  unit.attackFrame = attackFrameAt(type.animations.attack, unit.swingStart, steps)
  unit.swing = null
  if (unit.lowering) {
    unit.lowering = false
    unit.hasSwung = false
    unit.lastShotFrame = null
    unit.attackPause = 0
    return
  }
  unit.attackPause = type.attackInterval
}

function strike(state, unit, type) {
  applyDamage(state, unit.swingTarget, type.damage)
  if (type.ranged) spawnMuzzleFlash(state, unit, type)
}

function spawnMuzzleFlash(state, unit, type) {
  const dir = TEAM_DIRECTION[unit.team]
  const x = unit.x + dir * type.muzzle.x
  const y = WORLD.groundY + type.muzzle.y
  for (let i = 0; i < FLASH_PARTICLE_COUNT; i++) {
    const angle = (Math.random() - 0.5) * 0.8
    const speed = 80 + Math.random() * 140
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 0.12 + Math.random() * 0.1,
      size: 1.5 + Math.random() * 2,
    })
  }
}

function updateParticles(state, dt) {
  for (const particle of state.particles) {
    particle.life += dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
  }
  state.particles = state.particles.filter((particle) => particle.life < particle.maxLife)
}

function updateDeaths(state) {
  state.units = state.units.filter((unit) => !unit.dying || !isDeathFinished(unit))
}

function findTarget(state, unit, type, dir) {
  let best = null
  let bestGap = Infinity

  for (const other of state.units) {
    if (other.team === unit.team || other.dying) continue
    const dist = (other.x - unit.x) * dir
    if (dist <= 0) continue
    const gap = dist - (type.size + UNIT_TYPES[other.type].size) / 2
    if (gap <= type.range && gap < bestGap) {
      best = other
      bestGap = gap
    }
  }
  if (best) return { unit: best }

  const enemy = ENEMY[unit.team]
  const baseGap = (baseEdgeX(enemy) - unit.x) * dir - type.size / 2
  if (baseGap <= type.range) return { base: enemy }

  return null
}

function applyDamage(state, target, damage) {
  if (target.unit) {
    const victim = target.unit
    if (victim.dying) return
    victim.hp -= damage
    if (victim.hp <= 0) kill(state, victim)
    return
  }
  state.baseHp[target.base] = Math.max(0, state.baseHp[target.base] - damage)
}

function kill(state, unit) {
  unit.dying = true
  unit.hp = 0
  unit.swing = null
  unit.lowering = false
  unit.moving = false
  if (unit.team === 'ai') state.gold.player += UNIT_TYPES[unit.type].reward
}

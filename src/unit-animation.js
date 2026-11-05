import { UNIT_TYPES } from './config.js'

export function attackSteps(anim, startFrame) {
  const span = anim.frames - 1 - startFrame
  return anim.pingpong ? 2 * span : span
}

// Пока цели нет, атака доигрывает обратный ход только до кадра lowerFrame (оружие опущено).
export function swingSteps(anim, startFrame, lowering) {
  if (!lowering || !anim.pingpong) return attackSteps(anim, startFrame)
  const span = anim.frames - 1 - startFrame
  const stopFrame = Math.max(anim.lowerFrame, startFrame)
  return 2 * span - (stopFrame - startFrame)
}

export function attackFrameAt(anim, startFrame, step) {
  const span = anim.frames - 1 - startFrame
  return step <= span ? startFrame + step : startFrame + (2 * span - step)
}

function loopCycle(anim) {
  const skip = anim.skipFrames ?? []
  const cycle = []
  for (let i = 0; i < anim.frames; i++) {
    if (!skip.includes(i)) cycle.push(i)
  }
  return cycle
}

export function frameIndex(animTime, anim) {
  const index = Math.floor(animTime * anim.fps)
  const last = anim.frames - 1
  if (anim.pingpong) {
    if (index <= last) return index
    const start = anim.pingpongStart ?? 0
    const half = last - start
    const step = (index - last) % (2 * half)
    return step <= half ? last - step : start + (step - half)
  }
  if (anim.loop) {
    const cycle = loopCycle(anim)
    return cycle[index % cycle.length]
  }
  return Math.min(index, last)
}

export function displayFrame(unit) {
  const anim = UNIT_TYPES[unit.type].animations[unit.animState]
  if (unit.animState === 'attack') {
    if (unit.swing === null) return unit.attackFrame ?? (anim.restartFrame ?? 0)
    const step = Math.min(Math.floor(unit.swing * anim.fps), swingSteps(anim, unit.swingStart, unit.lowering))
    return attackFrameAt(anim, unit.swingStart, step)
  }
  return frameIndex(unit.animTime, anim)
}

export function isDeathFinished(unit) {
  const anim = UNIT_TYPES[unit.type].animations.death
  return unit.animState === 'death' && displayFrame(unit) >= anim.frames - 1
}

export function advanceAnimation(unit, dt) {
  const next = resolveAnimationState(unit)
  if (next === unit.animState) {
    unit.animTime += dt
    return
  }
  unit.animState = next
  unit.animTime = 0
}

function resolveAnimationState(unit) {
  if (unit.dying) return 'death'
  if (unit.swing !== null || unit.attackHold) return 'attack'
  if (unit.moving) return 'walk'
  return 'idle'
}

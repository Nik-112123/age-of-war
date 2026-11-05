import { WORLD, VIEWPORT, TEAM_COLORS, TEAM_DIRECTION, UNIT_TYPES } from './config.js'
import { displayFrame } from './unit-animation.js'
import { getAnimationSheet } from './sprite-sheets.js'
import { cameraOrigin, cameraScale } from './camera.js'

const HP_COLORS = { player: '#ffffff', ai: '#ef4444' }

function drawSky(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.groundY)
  sky.addColorStop(0, '#0f172a')
  sky.addColorStop(1, '#1e293b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WORLD.width, WORLD.groundY)

  ctx.fillStyle = '#292524'
  ctx.fillRect(0, WORLD.groundY, WORLD.width, WORLD.height - WORLD.groundY)
  ctx.fillStyle = '#57534e'
  ctx.fillRect(0, WORLD.groundY, WORLD.width, 2)
}

function drawBar(ctx, x, y, width, height, ratio, color) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height)
}

function drawBase(ctx, team, hp) {
  const x = team === 'player' ? 0 : WORLD.width - WORLD.baseWidth
  const w = WORLD.baseWidth
  const top = WORLD.groundY - WORLD.baseHeight
  const teamColor = TEAM_COLORS[team]

  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(x, top + 12, w, WORLD.baseHeight - 12)

  ctx.fillStyle = '#cbd5e1'
  for (let mx = x; mx < x + w; mx += 24) {
    ctx.fillRect(mx, top, 14, 12)
  }

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x + w / 2 - 12, WORLD.groundY - 44, 24, 44)

  const poleX = x + w / 2
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(poleX - 1, top - 40, 2, 40)
  ctx.fillStyle = teamColor
  ctx.fillRect(poleX + 1, top - 40, 28, 16)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
  ctx.fillRect(x + 8, top - 56, w - 16, 6)
  drawBar(ctx, x + 8, top - 56, w - 16, 6, hp / WORLD.baseHp, teamColor)
}

function drawUnit(ctx, unit) {
  const type = UNIT_TYPES[unit.type]
  const sheet = getAnimationSheet(unit.type, unit.animState)
  const frame = displayFrame(unit)
  const col = frame % sheet.columns
  const row = Math.floor(frame / sheet.columns)
  const sx = Math.round(col * sheet.frameWidth)
  const sy = Math.round(row * sheet.frameHeight)
  const sw = Math.round((col + 1) * sheet.frameWidth) - sx
  const sh = Math.round((row + 1) * sheet.frameHeight) - sy
  const scale = type.spriteHeight / sheet.frameHeight
  const drawWidth = Math.round(sheet.frameWidth * scale)
  const drawHeight = type.spriteHeight
  const flip = sheet.placeholder ? 1 : TEAM_DIRECTION[unit.team]

  ctx.save()
  ctx.globalAlpha = 0.4
  ctx.fillStyle = TEAM_COLORS[unit.team]
  ctx.beginPath()
  ctx.ellipse(unit.x, WORLD.groundY, type.size * 0.45, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  ctx.translate(unit.x, WORLD.groundY)
  ctx.scale(flip, 1)
  ctx.drawImage(
    sheet.source,
    sx, sy, sw, sh,
    -drawWidth / 2, Math.round(-sheet.feetRatio * drawHeight), drawWidth, drawHeight,
  )
  ctx.restore()

  if (!unit.dying) {
    const barWidth = drawWidth * 0.5
    const barY = WORLD.groundY - type.spriteHeight - 6
    drawBar(ctx, unit.x - barWidth / 2, barY, barWidth, 3, unit.hp / type.hp, HP_COLORS[unit.team])
  }
}

function drawParticles(ctx, particles) {
  ctx.fillStyle = '#fde68a'
  for (const particle of particles) {
    const alpha = 1 - particle.life / particle.maxLife
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const dpr = window.devicePixelRatio || 1
  canvas.width = VIEWPORT.width * dpr
  canvas.height = VIEWPORT.height * dpr

  return {
    draw(state, camera) {
      const scale = cameraScale(camera)
      const origin = cameraOrigin(camera)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height)
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, -origin.x * dpr * scale, -origin.y * dpr * scale)
      drawSky(ctx)
      drawBase(ctx, 'player', state.baseHp.player)
      drawBase(ctx, 'ai', state.baseHp.ai)
      for (const unit of state.units) drawUnit(ctx, unit)
      drawParticles(ctx, state.particles)
    },
  }
}

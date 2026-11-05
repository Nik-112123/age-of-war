import { UNIT_TYPES } from './config.js'

const ANIMATION_LABELS = { idle: 'Покой', walk: 'Ходьба', attack: 'Атака', death: 'Смерть' }
const FRAME_ASPECT = 0.75
const PLACEHOLDER_FONT_RATIO = 0.16

const images = new Map()
const placeholders = new Map()

// Загружает все PNG-анимации до старта игрового цикла, чтобы кадры не рисовались до готовности.
export function loadSprites() {
  const pending = []
  for (const type of Object.values(UNIT_TYPES)) {
    for (const anim of Object.values(type.animations)) {
      if (anim.frameWidth) pending.push(loadImage(anim.src))
    }
  }
  return Promise.all(pending)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      images.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Не удалось загрузить ${src}`))
    img.src = src
  })
}

// Размер кадра берется из самой загруженной картинки: у каждой анимации свой PNG, и сетка у них разная.
export function getAnimationSheet(typeId, animName) {
  const anim = UNIT_TYPES[typeId].animations[animName]
  if (anim.frameWidth) {
    const image = images.get(anim.src)
    const columns = Math.round(image.naturalWidth / anim.frameWidth)
    const rows = Math.ceil(anim.frames / columns)
    return {
      source: image,
      frameWidth: image.naturalWidth / columns,
      frameHeight: image.naturalHeight / rows,
      columns,
      feetRatio: anim.feetRatio,
      placeholder: false,
    }
  }

  const placeholder = getPlaceholder(typeId, animName)
  return {
    source: placeholder,
    frameWidth: placeholder.width / anim.frames,
    frameHeight: placeholder.height,
    columns: anim.frames,
    feetRatio: 1,
    placeholder: true,
  }
}

function getPlaceholder(typeId, animName) {
  const key = `${typeId}:${animName}`
  if (!placeholders.has(key)) {
    const type = UNIT_TYPES[typeId]
    placeholders.set(key, createPlaceholder(type, animName, type.animations[animName]))
  }
  return placeholders.get(key)
}

function createPlaceholder(type, animName, anim) {
  const frameHeight = type.spriteHeight
  const frameWidth = Math.round(frameHeight * FRAME_ASPECT)
  const fontSize = Math.round(frameHeight * PLACEHOLDER_FONT_RATIO)

  const canvas = document.createElement('canvas')
  canvas.width = frameWidth * anim.frames
  canvas.height = frameHeight
  const ctx = canvas.getContext('2d')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < anim.frames; i++) {
    const x = i * frameWidth
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, 0, frameWidth, frameHeight)
    ctx.globalAlpha = 0.35
    ctx.fillStyle = type.color
    ctx.fillRect(x, 0, frameWidth, frameHeight)
    ctx.globalAlpha = 1

    ctx.strokeStyle = type.color
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, 1, frameWidth - 2, frameHeight - 2)

    ctx.fillStyle = '#f8fafc'
    ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`
    ctx.fillText(`Кадр ${i + 1}`, x + frameWidth / 2, frameHeight / 2)
    ctx.font = `600 ${Math.round(fontSize * 0.7)}px Inter, system-ui, sans-serif`
    ctx.fillText(ANIMATION_LABELS[animName], x + frameWidth / 2, frameHeight - fontSize)
  }
  return canvas
}

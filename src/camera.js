import { WORLD, VIEWPORT, ZOOM } from './config.js'

const MIN_ZOOM = 1
const MAX_ZOOM = 2

export function createCamera() {
  return { x: 0, zoom: MIN_ZOOM }
}

export function cameraScale(camera) {
  return ZOOM * camera.zoom
}

// Камера прижата к низу мира: земля и юниты видны при любом зуме.
export function cameraOrigin(camera) {
  return { x: camera.x, y: WORLD.height - VIEWPORT.height / cameraScale(camera) }
}

function viewWidth(camera) {
  return VIEWPORT.width / cameraScale(camera)
}

function clampX(camera) {
  camera.x = Math.max(0, Math.min(WORLD.width - viewWidth(camera), camera.x))
}

export function panCamera(camera, dx) {
  camera.x += dx
  clampX(camera)
}

// anchor - доля ширины холста (0..1): под этой точкой мир остается на месте при изменении зума.
export function zoomCamera(camera, zoom, anchor) {
  const focus = camera.x + anchor * viewWidth(camera)
  camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
  camera.x = focus - anchor * viewWidth(camera)
  clampX(camera)
}

export function attachCameraControls(canvas, camera) {
  let drag = null

  const toWorldUnits = (cssPixels) => cssPixels * VIEWPORT.width / canvas.getBoundingClientRect().width / cameraScale(camera)

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    drag = { lastX: event.clientX }
    canvas.setPointerCapture(event.pointerId)
    canvas.classList.add('is-dragging')
  })

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return
    panCamera(camera, -toWorldUnits(event.clientX - drag.lastX))
    drag.lastX = event.clientX
  })

  const endDrag = () => {
    drag = null
    canvas.classList.remove('is-dragging')
  }
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault()
    if (event.deltaX) panCamera(camera, toWorldUnits(event.deltaX))
    if (event.deltaY) {
      const rect = canvas.getBoundingClientRect()
      const anchor = (event.clientX - rect.left) / rect.width
      zoomCamera(camera, camera.zoom * Math.exp(-event.deltaY * 0.001), anchor)
    }
  }, { passive: false })
}

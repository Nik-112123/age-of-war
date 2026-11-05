import './style.css'
import { createGame, spawnUnit, updateGame } from './src/game.js'
import { createRenderer } from './src/renderer.js'
import { createUi } from './src/ui.js'
import { createCamera, attachCameraControls } from './src/camera.js'
import { loadSprites } from './src/sprite-sheets.js'

const canvas = document.querySelector('#field')
const renderer = createRenderer(canvas)
const camera = createCamera()
attachCameraControls(canvas, camera)
let state = createGame()

const ui = createUi({
  onSpawn: (typeId) => spawnUnit(state, 'player', typeId),
  onRestart: () => {
    state = createGame()
  },
  onTogglePause: () => {
    state.paused = !state.paused
  },
})

let lastTime = 0

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now

  updateGame(state, dt)
  renderer.draw(state, camera)
  ui.render(state)

  requestAnimationFrame(frame)
}

loadSprites()
  .then(() => {
    lastTime = performance.now()
    requestAnimationFrame(frame)
  })
  .catch((error) => console.error(error))

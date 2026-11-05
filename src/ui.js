import { UNIT_TYPES, ECONOMY, ENABLED_UNIT_IDS } from './config.js'

const RESULT_TEXT = { won: 'Победа!', lost: 'Поражение' }

function previewHtml(type) {
  return `<span class="unit-card__preview" style="background:${type.color}">${type.icon}</span>`
}

export function createUi({ onSpawn, onRestart, onTogglePause }) {
  const goldEl = document.querySelector('#gold')
  const rateEl = document.querySelector('#gold-rate')
  const buttonsEl = document.querySelector('#unit-buttons')
  const pauseEl = document.querySelector('#pause')
  const resultEl = document.querySelector('#result')
  const resultTitleEl = document.querySelector('#result-title')

  rateEl.textContent = `+${ECONOMY.passiveIncome}/сек`

  const cards = ENABLED_UNIT_IDS.map((typeId) => {
    const type = UNIT_TYPES[typeId]
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'unit-card'
    card.innerHTML = `
      ${previewHtml(type)}
      <span class="unit-card__body">
        <span class="unit-card__name">${type.name}</span>
        <span class="unit-card__stats">Здоровье ${type.hp} · Урон ${type.damage} · Скорость ${type.speed}</span>
      </span>
      <span class="unit-card__cost">${type.cost}</span>
    `
    card.addEventListener('click', () => onSpawn(typeId))
    buttonsEl.append(card)
    return { card, cost: type.cost }
  })

  pauseEl.addEventListener('click', onTogglePause)
  document.querySelector('#restart').addEventListener('click', onRestart)

  return {
    render(state) {
      goldEl.textContent = Math.floor(state.gold.player)
      for (const { card, cost } of cards) {
        card.disabled = state.status !== 'playing' || state.paused || state.gold.player < cost
      }
      pauseEl.disabled = state.status !== 'playing'
      pauseEl.textContent = state.paused ? 'Старт' : 'Пауза'
      resultEl.hidden = state.status === 'playing'
      if (state.status !== 'playing') {
        resultTitleEl.textContent = RESULT_TEXT[state.status]
        resultTitleEl.className = `result__title result__title--${state.status}`
      }
    },
  }
}

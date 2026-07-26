// Puntuacion total acumulada del jugador, persistida entre sesiones.

const SCORE_KEY = 'daily-sudoku:score'

export function loadScore() {
  try {
    const value = Number(localStorage.getItem(SCORE_KEY))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function saveScore(value) {
  try {
    localStorage.setItem(SCORE_KEY, String(value))
  } catch {
    // localStorage no disponible: se ignora
  }
}

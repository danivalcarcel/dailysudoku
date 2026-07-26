// Configuracion de dificultades: cuantas casillas se vacian del sudoku resuelto
// (mas vacias = mas dificil), cuantos puntos da completar una fila/columna/caja,
// y cuantos puntos extra da resolver el sudoku entero.

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme']

export const DIFFICULTY_CONFIG = {
  easy: { targetEmpty: 36, unitPoints: 5, completionPoints: 100 },
  medium: { targetEmpty: 45, unitPoints: 10, completionPoints: 250 },
  hard: { targetEmpty: 52, unitPoints: 20, completionPoints: 500 },
  extreme: { targetEmpty: 58, unitPoints: 35, completionPoints: 1000 },
}

const STORAGE_KEY = 'daily-sudoku:difficulty'

export function detectDifficulty() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (DIFFICULTIES.includes(stored)) return stored
  } catch {
    // localStorage no disponible: se ignora
  }
  return 'medium'
}

export function persistDifficulty(difficulty) {
  try {
    localStorage.setItem(STORAGE_KEY, difficulty)
  } catch {
    // se ignora
  }
}

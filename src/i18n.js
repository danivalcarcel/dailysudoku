export const LOCALES = ['es', 'en']

export const translations = {
  es: {
    title: 'Sudoku Diario',
    subtitle: 'Un puzzle nuevo cada día',
    puzzleDateLabel: 'Sudoku del',
    nextPuzzleLabel: 'Próximo en',
    solved: '¡Sudoku resuelto correctamente!',
    reset: 'Reiniciar',
    erase: 'Borrar',
    notes: 'Notas',
    scoreLabel: 'Puntuación',
    pointsSuffix: 'puntos',
    timeLabel: 'Tiempo',
    mistakesLabel: 'Fallos',
    gameOver: '¡Demasiados fallos! Pulsa Reiniciar para volver a intentarlo.',
    historyLabel: 'Historial',
    historyEmpty: 'Aún no has resuelto ningún sudoku.',
    historyToday: 'hoy',
    difficulties: {
      easy: 'Fácil',
      medium: 'Medio',
      hard: 'Difícil',
      extreme: 'Extremo',
    },
  },
  en: {
    title: 'Daily Sudoku',
    subtitle: 'A new puzzle every day',
    puzzleDateLabel: 'Puzzle for',
    nextPuzzleLabel: 'Next in',
    solved: 'Sudoku solved correctly!',
    reset: 'Reset',
    erase: 'Erase',
    notes: 'Notes',
    scoreLabel: 'Score',
    pointsSuffix: 'points',
    timeLabel: 'Time',
    mistakesLabel: 'Mistakes',
    gameOver: 'Too many mistakes! Press Reset to try again.',
    historyLabel: 'History',
    historyEmpty: "You haven't solved any sudoku yet.",
    historyToday: 'today',
    difficulties: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      extreme: 'Extreme',
    },
  },
}

const STORAGE_KEY = 'daily-sudoku:locale'

export function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(stored)) return stored
  } catch {
    // localStorage no disponible: se ignora
  }

  // Espanol solo si el navegador esta en espanol; cualquier otro idioma
  // (incluidos los que no soportamos) cae en ingles.
  return navigator.language?.slice(0, 2) === 'es' ? 'es' : 'en'
}

export function persistLocale(locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // se ignora
  }
}

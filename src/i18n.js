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
    loggedInAs: 'Sesión:',
    signOut: 'Cerrar sesión',
    nicknamePrompt: 'Elige un apodo para el ranking',
    nicknamePlaceholder: 'Tu apodo',
    nicknameSave: 'Guardar',
    nicknameInvalid: 'Usa 3-20 letras, números, espacios o guiones bajos',
    nicknameTaken: 'Ese apodo ya está en uso',
    authError: 'No se pudo iniciar sesión, inténtalo de nuevo',
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
    loggedInAs: 'Signed in:',
    signOut: 'Sign out',
    nicknamePrompt: 'Choose a nickname for the leaderboard',
    nicknamePlaceholder: 'Your nickname',
    nicknameSave: 'Save',
    nicknameInvalid: 'Use 3-20 letters, numbers, spaces or underscores',
    nicknameTaken: 'That nickname is already taken',
    authError: "Couldn't sign in, please try again",
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

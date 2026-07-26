// Historico de puntos ganados por dia (suma de todas las dificultades resueltas ese dia).
// A diferencia de boardStorage, esto no se limpia nunca: es el registro permanente.

const HISTORY_KEY = 'daily-sudoku:history'

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function addHistoryPoints(date, points) {
  const history = loadHistory()
  const next = { ...history, [date]: (history[date] ?? 0) + points }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // localStorage no disponible: se ignora
  }

  return next
}

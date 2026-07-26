// Historico por dia: puntos totales ganados y, por dificultad, el tiempo que
// se tardo en resolver el sudoku ese dia. A diferencia de boardStorage, esto
// no se limpia nunca: es el registro permanente.

const HISTORY_KEY = 'daily-sudoku:history'

function normalizeEntry(entry) {
  if (typeof entry === 'number') return { points: entry, times: {} }
  if (!entry || typeof entry !== 'object') return { points: 0, times: {} }

  return {
    points: typeof entry.points === 'number' ? entry.points : 0,
    times: entry.times && typeof entry.times === 'object' ? entry.times : {},
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const normalized = {}
    for (const [date, entry] of Object.entries(parsed)) {
      normalized[date] = normalizeEntry(entry)
    }
    return normalized
  } catch {
    return {}
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch {
    // localStorage no disponible: se ignora
  }
}

export function addHistoryPoints(date, points) {
  const history = loadHistory()
  const current = history[date] ?? { points: 0, times: {} }
  const next = { ...history, [date]: { ...current, points: current.points + points } }

  saveHistory(next)
  return next
}

export function recordHistoryTime(date, difficulty, seconds) {
  const history = loadHistory()
  const current = history[date] ?? { points: 0, times: {} }
  const next = {
    ...history,
    [date]: { ...current, times: { ...current.times, [difficulty]: seconds } },
  }

  saveHistory(next)
  return next
}

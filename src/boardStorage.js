// Persistencia del progreso del tablero en localStorage, una entrada por dia y
// dificultad, para no mezclar partidas de distintos dias o niveles.
// Cada entrada guarda tambien las notas (candidatos), que filas/columnas/cajas ya
// se puntuaron, y si ya se otorgaron los puntos por resolver el sudoku entero.

import { createEmptyCompletedUnits } from './sudokuCompletion'

const STORAGE_PREFIX = 'daily-sudoku:board:'

function buildKey(date, difficulty) {
  return `${STORAGE_PREFIX}${date}:${difficulty}`
}

function createEmptyNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
}

function isValidSavedBoard(saved, puzzle) {
  if (!Array.isArray(saved) || saved.length !== 9) return false

  return saved.every((row, r) => {
    if (!Array.isArray(row) || row.length !== 9) return false
    return row.every((cell, c) => {
      if (typeof cell !== 'string') return false
      if (puzzle[r][c] !== 0 && cell !== String(puzzle[r][c])) return false
      return true
    })
  })
}

function isValidNotes(notes) {
  if (!Array.isArray(notes) || notes.length !== 9) return false

  return notes.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every(
        (cellNotes) =>
          Array.isArray(cellNotes) &&
          cellNotes.every((n) => Number.isInteger(n) && n >= 1 && n <= 9),
      ),
  )
}

function isValidCompletedUnits(units) {
  if (!units || typeof units !== 'object') return false

  return ['rows', 'cols', 'boxes'].every(
    (key) =>
      Array.isArray(units[key]) &&
      units[key].length === 9 &&
      units[key].every((v) => typeof v === 'boolean'),
  )
}

export function loadPuzzleState(date, difficulty, puzzle) {
  try {
    const raw = localStorage.getItem(buildKey(date, difficulty))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || !isValidSavedBoard(parsed.board, puzzle)) return null

    return {
      board: parsed.board,
      notes: isValidNotes(parsed.notes) ? parsed.notes : createEmptyNotes(),
      completedUnits: isValidCompletedUnits(parsed.completedUnits)
        ? parsed.completedUnits
        : createEmptyCompletedUnits(),
      scored: Boolean(parsed.scored),
    }
  } catch {
    return null
  }
}

export function savePuzzleState(date, difficulty, board, notes, completedUnits, scored) {
  try {
    localStorage.setItem(
      buildKey(date, difficulty),
      JSON.stringify({ board, notes, completedUnits, scored }),
    )

    const datePrefix = `${STORAGE_PREFIX}${date}:`
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX) && !key.startsWith(datePrefix)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // localStorage no disponible (modo privado, cuota agotada, etc.): se ignora.
  }
}

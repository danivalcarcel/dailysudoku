// Genera un sudoku deterministico a partir de una semilla (fecha de hoy + dificultad),
// para que todo el mundo que entre el mismo dia con la misma dificultad vea el mismo puzzle.

import { DIFFICULTY_CONFIG } from './difficulties'

const BOX_SIZE = 3
const GRID_SIZE = 9

function xmur3(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(items, rng) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function isValidPlacement(grid, index, value) {
  const row = Math.floor(index / GRID_SIZE)
  const col = index % GRID_SIZE
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE

  for (let i = 0; i < GRID_SIZE; i++) {
    if (grid[row * GRID_SIZE + i] === value) return false
    if (grid[i * GRID_SIZE + col] === value) return false
  }
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      if (grid[(boxRow + r) * GRID_SIZE + (boxCol + c)] === value) return false
    }
  }
  return true
}

function fillGrid(grid, rng) {
  const emptyIndex = grid.indexOf(0)
  if (emptyIndex === -1) return true

  for (const value of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
    if (isValidPlacement(grid, emptyIndex, value)) {
      grid[emptyIndex] = value
      if (fillGrid(grid, rng)) return true
      grid[emptyIndex] = 0
    }
  }
  return false
}

function countSolutions(grid, limit) {
  const emptyIndex = grid.indexOf(0)
  if (emptyIndex === -1) return 1

  let total = 0
  for (let value = 1; value <= GRID_SIZE && total < limit; value++) {
    if (isValidPlacement(grid, emptyIndex, value)) {
      grid[emptyIndex] = value
      total += countSolutions(grid, limit - total)
      grid[emptyIndex] = 0
    }
  }
  return total
}

function removeCells(grid, rng, targetEmpty) {
  const positions = shuffle(
    Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i),
    rng,
  )
  let removed = 0

  for (const index of positions) {
    if (removed >= targetEmpty) break

    const backup = grid[index]
    grid[index] = 0

    if (countSolutions([...grid], 2) === 1) {
      removed++
    } else {
      grid[index] = backup
    }
  }

  return grid
}

function toRows(flatGrid) {
  const rows = []
  for (let r = 0; r < GRID_SIZE; r++) {
    rows.push(flatGrid.slice(r * GRID_SIZE, r * GRID_SIZE + GRID_SIZE))
  }
  return rows
}

export function getDailySeed(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function generateDailySudoku(date = new Date(), difficulty = 'medium') {
  const seed = `${getDailySeed(date)}:${difficulty}`
  const rng = mulberry32(xmur3(seed)())

  const solved = Array(GRID_SIZE * GRID_SIZE).fill(0)
  fillGrid(solved, rng)

  const { targetEmpty } = DIFFICULTY_CONFIG[difficulty]
  const puzzle = removeCells([...solved], rng, targetEmpty)

  return {
    puzzle: toRows(puzzle),
    solution: toRows(solved),
  }
}

// Deteccion de filas, columnas y cajas 3x3 completas y correctas (comparando con la solucion),
// usado para el sistema de puntos incrementales.

export function createEmptyCompletedUnits() {
  return {
    rows: Array(9).fill(false),
    cols: Array(9).fill(false),
    boxes: Array(9).fill(false),
  }
}

export function isRowComplete(board, solution, row) {
  return board[row].every((cell, c) => cell !== '' && Number(cell) === solution[row][c])
}

export function isColComplete(board, solution, col) {
  return board.every((row, r) => row[col] !== '' && Number(row[col]) === solution[r][col])
}

export function isBoxComplete(board, solution, boxIndex) {
  const boxRow = Math.floor(boxIndex / 3) * 3
  const boxCol = (boxIndex % 3) * 3

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const row = boxRow + r
      const col = boxCol + c
      if (board[row][col] === '' || Number(board[row][col]) !== solution[row][col]) return false
    }
  }
  return true
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { generateDailySudoku, getDailySeed, getNextResetTime } from './sudokuGenerator'
import { loadPuzzleState, savePuzzleState } from './boardStorage'
import { LOCALES, translations, detectLocale, persistLocale } from './i18n'
import { DIFFICULTIES, DIFFICULTY_CONFIG, detectDifficulty, persistDifficulty } from './difficulties'
import { loadScore, saveScore } from './score'
import { loadHistory, addHistoryPoints, recordHistoryTime } from './scoreHistory'
import { createEmptyCompletedUnits, isRowComplete, isColComplete, isBoxComplete } from './sudokuCompletion'
import './App.css'

const ARROW_DELTAS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function createEmptyBoard(puzzle) {
  return puzzle.map((row) => row.map((cell) => (cell === 0 ? '' : String(cell))))
}

function createEmptyNotes(puzzle) {
  return puzzle.map((row) => row.map(() => []))
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDate(dateStr, locale) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatCountdown(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}min`
}

function App() {
  const seed = useMemo(() => getDailySeed(), [])
  const [difficulty, setDifficulty] = useState(detectDifficulty)
  const { puzzle, solution } = useMemo(() => generateDailySudoku(new Date(), difficulty), [difficulty])

  const [puzzleState, setPuzzleState] = useState(
    () =>
      loadPuzzleState(seed, difficulty, puzzle) ?? {
        board: createEmptyBoard(puzzle),
        notes: createEmptyNotes(puzzle),
        completedUnits: createEmptyCompletedUnits(),
        scored: false,
        elapsedSeconds: 0,
      },
  )
  const [selected, setSelected] = useState({ row: 0, col: 0 })
  const [notesMode, setNotesMode] = useState(false)
  const [locale, setLocale] = useState(detectLocale)
  const [totalScore, setTotalScore] = useState(loadScore)
  const [history, setHistory] = useState(loadHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [justScored, setJustScored] = useState(false)
  const [toast, setToast] = useState(null)
  const [countdown, setCountdown] = useState(() => getNextResetTime().getTime() - Date.now())
  const cellRefs = useRef(Array.from({ length: 9 }, () => Array(9).fill(null)))
  const toastTimeoutRef = useRef(null)
  const t = translations[locale]
  const board = puzzleState.board

  const showToast = (message) => {
    clearTimeout(toastTimeoutRef.current)
    setToast(message)
    toastTimeoutRef.current = setTimeout(() => setToast(null), 1800)
  }

  // Al cambiar de dificultad se carga (o crea) el progreso de ese puzzle.
  useEffect(() => {
    setPuzzleState(
      loadPuzzleState(seed, difficulty, puzzle) ?? {
        board: createEmptyBoard(puzzle),
        notes: createEmptyNotes(puzzle),
        completedUnits: createEmptyCompletedUnits(),
        scored: false,
        elapsedSeconds: 0,
      },
    )
    setSelected({ row: 0, col: 0 })
    setJustScored(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty])

  useEffect(() => {
    savePuzzleState(
      seed,
      difficulty,
      puzzleState.board,
      puzzleState.notes,
      puzzleState.completedUnits,
      puzzleState.scored,
      puzzleState.elapsedSeconds,
    )
  }, [seed, difficulty, puzzleState])

  useEffect(() => {
    persistLocale(locale)
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    persistDifficulty(difficulty)
  }, [difficulty])

  // Cuenta atras hasta el proximo cambio de puzzle (misma hora UTC para todos).
  // Solo se muestra con precision de minutos, asi que no hace falta tick por segundo.
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(getNextResetTime().getTime() - Date.now())
    }, 30000)

    return () => clearInterval(id)
  }, [])

  const isGiven = (row, col) => puzzle[row][col] !== 0

  const isSolved = board.every((row, r) => row.every((cell, c) => Number(cell) === solution[r][c]))

  // Numero de la casilla seleccionada (si tiene valor), para resaltarlo entre
  // las notas del resto de casillas y facilitar la comparacion.
  const selectedValue = board[selected.row][selected.col]
  const highlightDigit = selectedValue !== '' ? Number(selectedValue) : null

  // Cronometro: cuenta mientras el puzzle actual no este resuelto.
  useEffect(() => {
    if (isSolved) return

    const id = setInterval(() => {
      setPuzzleState((prev) => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }))
    }, 1000)

    return () => clearInterval(id)
  }, [isSolved, seed, difficulty])

  // Otorga puntos por cada fila, columna o caja 3x3 que se complete correctamente
  // por primera vez (independiente de si el sudoku entero ya esta resuelto).
  useEffect(() => {
    const prevUnits = puzzleState.completedUnits
    const nextRows = [...prevUnits.rows]
    const nextCols = [...prevUnits.cols]
    const nextBoxes = [...prevUnits.boxes]
    let newlyCompleted = 0

    for (let i = 0; i < 9; i++) {
      if (!prevUnits.rows[i] && isRowComplete(board, solution, i)) {
        nextRows[i] = true
        newlyCompleted++
      }
      if (!prevUnits.cols[i] && isColComplete(board, solution, i)) {
        nextCols[i] = true
        newlyCompleted++
      }
      if (!prevUnits.boxes[i] && isBoxComplete(board, solution, i)) {
        nextBoxes[i] = true
        newlyCompleted++
      }
    }

    if (newlyCompleted === 0) return

    const points = newlyCompleted * DIFFICULTY_CONFIG[difficulty].unitPoints
    setTotalScore((prev) => {
      const next = prev + points
      saveScore(next)
      return next
    })
    setHistory(addHistoryPoints(seed, points))
    setPuzzleState((prev) => ({
      ...prev,
      completedUnits: { rows: nextRows, cols: nextCols, boxes: nextBoxes },
    }))
    showToast(`+${points} ${t.pointsSuffix}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, solution, difficulty, seed])

  // Otorga los puntos de la dificultad actual la primera vez que se resuelve.
  useEffect(() => {
    if (!isSolved || puzzleState.scored) return

    const points = DIFFICULTY_CONFIG[difficulty].completionPoints
    setTotalScore((prev) => {
      const next = prev + points
      saveScore(next)
      return next
    })
    setHistory(addHistoryPoints(seed, points))
    setHistory(recordHistoryTime(seed, difficulty, puzzleState.elapsedSeconds))
    setPuzzleState((prev) => ({ ...prev, scored: true }))
    setJustScored(true)
  }, [isSolved, puzzleState.scored, puzzleState.elapsedSeconds, difficulty, seed])

  const toggleNote = (row, col, digit) => {
    if (isGiven(row, col) || puzzleState.board[row][col] !== '') return

    setPuzzleState((prev) => {
      const cellNotes = prev.notes[row][col]
      const nextCellNotes = cellNotes.includes(digit)
        ? cellNotes.filter((n) => n !== digit)
        : [...cellNotes, digit].sort((a, b) => a - b)

      const nextNotes = prev.notes.map((r) => [...r])
      nextNotes[row][col] = nextCellNotes
      return { ...prev, notes: nextNotes }
    })
  }

  const clearNotes = (row, col) => {
    setPuzzleState((prev) => {
      const nextNotes = prev.notes.map((r) => [...r])
      nextNotes[row][col] = []
      return { ...prev, notes: nextNotes }
    })
  }

  const handleChange = (row, col, value) => {
    if (isGiven(row, col)) return
    if (value !== '' && !/^[1-9]$/.test(value)) return

    if (notesMode) {
      if (value !== '') toggleNote(row, col, Number(value))
      return
    }

    setPuzzleState((prev) => {
      const nextBoard = prev.board.map((r) => [...r])
      nextBoard[row][col] = value

      // Un numero erroneo no descarta nada: solo un acierto elimina ese
      // candidato del resto de la fila, columna y bloque 3x3 (y de la propia casilla).
      const isCorrectEntry = value !== '' && Number(value) === solution[row][col]
      if (!isCorrectEntry) {
        return { ...prev, board: nextBoard }
      }

      const nextNotes = prev.notes.map((r) => [...r])
      nextNotes[row][col] = []

      const digit = Number(value)
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3

      for (let i = 0; i < 9; i++) {
        nextNotes[row][i] = nextNotes[row][i].filter((n) => n !== digit)
        nextNotes[i][col] = nextNotes[i][col].filter((n) => n !== digit)
      }
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rr = boxRow + r
          const cc = boxCol + c
          nextNotes[rr][cc] = nextNotes[rr][cc].filter((n) => n !== digit)
        }
      }

      return { ...prev, board: nextBoard, notes: nextNotes }
    })
  }

  const handleReset = () => {
    setPuzzleState((prev) => ({
      board: createEmptyBoard(puzzle),
      notes: createEmptyNotes(puzzle),
      completedUnits: prev.completedUnits,
      scored: prev.scored,
      elapsedSeconds: 0,
    }))
    setJustScored(false)
  }

  const handleNumpadInput = (value) => {
    if (notesMode) {
      if (value === '') {
        clearNotes(selected.row, selected.col)
      } else {
        toggleNote(selected.row, selected.col, Number(value))
      }
      return
    }
    handleChange(selected.row, selected.col, value)
  }

  const handleKeyDown = (e, row, col) => {
    const delta = ARROW_DELTAS[e.key]
    if (!delta) return

    e.preventDefault()
    const nextRow = Math.min(8, Math.max(0, row + delta[0]))
    const nextCol = Math.min(8, Math.max(0, col + delta[1]))
    cellRefs.current[nextRow][nextCol]?.focus({ preventScroll: true })
  }

  // iOS/Chrome tienden a hacer scroll para "centrar" un input al enfocarlo,
  // incluso con inputMode="none". Tomamos el foco nosotros mismos con
  // preventScroll para evitar ese salto de la pagina.
  const handleCellPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.focus({ preventScroll: true })
  }

  return (
    <div className="app">
      {toast && (
        <div className="toast" key={toast}>
          {toast}
        </div>
      )}

      <div className="topbar">
        <div className="topbar__brand">
          <h1>{t.title}</h1>
          <p className="subtitle">{t.subtitle}</p>
          <p className="puzzle-date">
            {t.puzzleDateLabel} {formatDate(seed, locale)} · {t.nextPuzzleLabel} {formatCountdown(countdown)}
          </p>
        </div>

        <div className="lang-switch">
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={`lang-switch__btn${locale === code ? ' lang-switch__btn--active' : ''}`}
              onClick={() => setLocale(code)}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-row">
        <p className="score">
          {t.scoreLabel}: <strong>{totalScore}</strong>
        </p>

        <p className="timer">
          {t.timeLabel}: <strong>{formatTime(puzzleState.elapsedSeconds)}</strong>
        </p>
      </div>

      <div className="difficulty-switch">
        {DIFFICULTIES.map((id) => (
          <button
            key={id}
            type="button"
            className={`difficulty-switch__btn${difficulty === id ? ' difficulty-switch__btn--active' : ''}`}
            onClick={() => setDifficulty(id)}
          >
            {t.difficulties[id]}
          </button>
        ))}
      </div>

      <div className="board">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const given = isGiven(r, c)
            const wrong = !given && cell !== '' && Number(cell) !== solution[r][c]
            const boxAlt = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1
            const isSelected = selected.row === r && selected.col === c
            const cellNotes = puzzleState.notes[r][c]
            const showNotes = !given && cell === '' && cellNotes.length > 0
            const classes = [
              'cell',
              given ? 'cell--given' : 'cell--editable',
              boxAlt ? 'cell--box-alt' : '',
              wrong ? 'cell--wrong' : '',
              isSelected ? (notesMode ? 'cell--selected-notes' : 'cell--selected') : '',
              c % 3 === 2 && c !== 8 ? 'cell--border-right' : '',
              r % 3 === 2 && r !== 8 ? 'cell--border-bottom' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div key={`${r}-${c}`} className={classes}>
                {showNotes && (
                  <div className="cell__notes">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <span
                        key={n}
                        className={`cell__note${n === highlightDigit && cellNotes.includes(n) ? ' cell__note--highlight' : ''}`}
                      >
                        {cellNotes.includes(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                )}
                <input
                  ref={(el) => {
                    cellRefs.current[r][c] = el
                  }}
                  className="cell__input"
                  type="text"
                  inputMode="none"
                  maxLength={1}
                  value={cell}
                  readOnly={given}
                  onChange={(e) => handleChange(r, c, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, r, c)}
                  onFocus={() => setSelected({ row: r, col: c })}
                  onMouseDown={handleCellPointerDown}
                  onTouchStart={handleCellPointerDown}
                />
              </div>
            )
          }),
        )}
      </div>

      <div className="numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            className="numpad__btn"
            onClick={() => handleNumpadInput(String(n))}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="numpad__btn numpad__btn--erase"
          onClick={() => handleNumpadInput('')}
        >
          {t.erase}
        </button>
      </div>

      {isSolved && (
        <div className="message message--ok">
          <p>{t.solved}</p>
          {justScored && (
            <p className="message__points">
              +{DIFFICULTY_CONFIG[difficulty].completionPoints} {t.pointsSuffix}
            </p>
          )}
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className={`notes-toggle${notesMode ? ' notes-toggle--active' : ''}`}
          onClick={() => setNotesMode((prev) => !prev)}
        >
          {t.notes}
        </button>
        <button onClick={handleReset}>{t.reset}</button>
      </div>

      <div className="history">
        <button
          type="button"
          className="history__toggle"
          onClick={() => setHistoryOpen((prev) => !prev)}
        >
          {t.historyLabel} {historyOpen ? '▲' : '▼'}
        </button>

        {historyOpen && (
          <ul className="history__list">
            {Object.keys(history).length === 0 && (
              <li className="history__empty">{t.historyEmpty}</li>
            )}
            {Object.entries(history)
              .sort((a, b) => (a[0] < b[0] ? 1 : -1))
              .map(([date, entry]) => (
                <li key={date} className="history__row">
                  <div className="history__row-main">
                    <span>
                      {formatDate(date, locale)}
                      {date === seed && <span className="history__today"> ({t.historyToday})</span>}
                    </span>
                    <span>
                      {entry.points} {t.pointsSuffix}
                    </span>
                  </div>
                  {Object.keys(entry.times).length > 0 && (
                    <div className="history__times">
                      {DIFFICULTIES.filter((id) => entry.times[id] != null).map((id) => (
                        <span key={id} className="history__time">
                          {t.difficulties[id]}: {formatTime(entry.times[id])}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App

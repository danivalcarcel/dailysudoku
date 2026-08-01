// Cloud sync for progress/history, only ever called while logged in.
// Mirrors boardStorage.js / scoreHistory.js's shapes exactly — this is a
// transport, not a rewrite of what gets persisted.

import { apiRequest } from './apiClient'

export function fetchProgress(date, difficulty) {
  return apiRequest(`/api/progress/${date}/${difficulty}`)
}

export function saveProgress(date, difficulty, state) {
  return apiRequest(`/api/progress/${date}/${difficulty}`, {
    method: 'PUT',
    body: JSON.stringify(state),
  })
}

export function fetchHistory() {
  return apiRequest('/api/history')
}

export function saveHistoryEntry(date, entry) {
  return apiRequest(`/api/history/${date}`, { method: 'PUT', body: JSON.stringify(entry) })
}

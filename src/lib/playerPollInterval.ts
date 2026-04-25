const STORAGE_KEY = 'scoutmap-player-poll-ms-v1'
const EVT = 'scoutmap-player-poll-changed'

export const DEFAULT_PLAYER_POLL_MS = 12_000
const MIN_MS = 3_000
const MAX_MS = 120_000

export function clampPlayerPollIntervalMs(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_PLAYER_POLL_MS
  return Math.min(MAX_MS, Math.max(MIN_MS, Math.round(n)))
}

export function getPlayerPollIntervalMs(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    const n = v ? parseInt(v, 10) : DEFAULT_PLAYER_POLL_MS
    return clampPlayerPollIntervalMs(n)
  } catch {
    return DEFAULT_PLAYER_POLL_MS
  }
}

export function setPlayerPollIntervalMs(n: number): void {
  localStorage.setItem(STORAGE_KEY, String(clampPlayerPollIntervalMs(n)))
  window.dispatchEvent(new Event(EVT))
}

export { EVT as PLAYER_POLL_EVENT, MAX_MS, MIN_MS }

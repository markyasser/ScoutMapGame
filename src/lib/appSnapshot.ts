import type { TeamTargets } from './mapTargetsStorage'
import { getDefaultMapTargets, loadMapTargets, saveMapTargets } from './mapTargetsStorage'
import {
  DEFAULT_MAX_GUESSES,
  DEFAULT_TOLERANCE,
  getDefaultMaxGuesses,
  getDefaultPersistedState,
  getTolerancePx,
  loadGameState,
  saveGameState,
  setDefaultMaxGuesses,
  setTolerancePx,
  type PersistedState,
} from './gameState'
import { readDefaultMaxGuessesAndBroadcast } from '../hooks/useDefaultMaxGuesses'
import { readToleranceAndBroadcast } from '../hooks/useToleranceSync'

const SNAPSHOT_V = 1 as const

export type AppSnapshotV1 = {
  v: typeof SNAPSHOT_V
  /** ms since epoch — last write wins for merge */
  updatedAt: number
  game: PersistedState
  targets: TeamTargets
  tolerancePx: number
  defaultMaxGuesses: number
  /**
   * Set when the organizer uses “Save to players”. All clients must apply the full
   * snapshot, ignoring uncommitted local / unpushed state on player devices.
   */
  adminOverride?: true
}

export function buildLocalSnapshot(): AppSnapshotV1 {
  return {
    v: SNAPSHOT_V,
    updatedAt: Date.now(),
    game: loadGameState(),
    targets: loadMapTargets(),
    tolerancePx: getTolerancePx(),
    defaultMaxGuesses: getDefaultMaxGuesses(),
  }
}

/**
 * Code defaults only — no localStorage. Used when the API is up but the DB has no row yet
 * (single source of truth: wait for server, do not merge with a prior local copy).
 */
export function buildDefaultSnapshot(): AppSnapshotV1 {
  return {
    v: SNAPSHOT_V,
    updatedAt: Date.now(),
    game: getDefaultPersistedState(),
    targets: getDefaultMapTargets(),
    tolerancePx: DEFAULT_TOLERANCE,
    defaultMaxGuesses: DEFAULT_MAX_GUESSES,
  }
}

/** Before first React mount — e.g. after fetching remote. */
export function applySnapshotToLocalStorage(s: AppSnapshotV1): void {
  setTolerancePx(s.tolerancePx)
  setDefaultMaxGuesses(s.defaultMaxGuesses)
  saveGameState(s.game)
  saveMapTargets(s.targets)
}

/** After mount — keep hooks and context aligned with a remote snapshot. */
export function applySnapshotToReact(
  s: AppSnapshotV1,
  onGame: (p: PersistedState) => void,
  onTargets: (t: TeamTargets) => void
): void {
  saveGameState(s.game)
  saveMapTargets(s.targets)
  onGame(s.game)
  onTargets(s.targets)
  readToleranceAndBroadcast(s.tolerancePx)
  readDefaultMaxGuessesAndBroadcast(s.defaultMaxGuesses)
}

/** Map, tolerance, and defaults from organizer — does not touch game (team progress). */
export function applyRemoteConfigToReact(
  s: AppSnapshotV1,
  onTargets: (t: TeamTargets) => void
): void {
  saveMapTargets(s.targets)
  onTargets(s.targets)
  readToleranceAndBroadcast(s.tolerancePx)
  readDefaultMaxGuessesAndBroadcast(s.defaultMaxGuesses)
}

export function isAppSnapshotV1(x: unknown): x is AppSnapshotV1 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 1) return false
  if (typeof o.updatedAt !== 'number' || o.updatedAt <= 0) return false
  if (typeof o.tolerancePx !== 'number' || typeof o.defaultMaxGuesses !== 'number') return false
  if (!o.game || typeof o.game !== 'object' || !o.targets || typeof o.targets !== 'object') return false
  if (o.adminOverride !== undefined && o.adminOverride !== true) return false
  return true
}

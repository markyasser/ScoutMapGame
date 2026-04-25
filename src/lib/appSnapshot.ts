import type { TeamTargets } from './mapTargetsStorage'
import { loadMapTargets, saveMapTargets } from './mapTargetsStorage'
import {
  getDefaultMaxGuesses,
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

export function pickNewer(a: AppSnapshotV1, b: AppSnapshotV1): AppSnapshotV1 {
  return a.updatedAt >= b.updatedAt ? a : b
}

export function isAppSnapshotV1(x: unknown): x is AppSnapshotV1 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 1) return false
  if (typeof o.updatedAt !== 'number' || o.updatedAt <= 0) return false
  if (typeof o.tolerancePx !== 'number' || typeof o.defaultMaxGuesses !== 'number') return false
  if (!o.game || typeof o.game !== 'object' || !o.targets || typeof o.targets !== 'object') return false
  return true
}

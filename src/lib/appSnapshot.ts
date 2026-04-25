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
import {
  applyTeamLabelsFromSnapshot,
  getDefaultTeamLabels,
  getTeamLabels,
  isValidTeamLabelsInSnapshot,
  type TeamLabels,
} from './teamLabelsStorage'
import { getLivePollEnabled, setLivePollEnabled } from './livePollEnabled'
import {
  DEFAULT_PLAYER_POLL_MS,
  getPlayerPollIntervalMs,
  MAX_MS,
  MIN_MS,
  setPlayerPollIntervalMs,
} from './playerPollInterval'

const SNAPSHOT_V = 1 as const

export type AppSnapshotV1 = {
  v: typeof SNAPSHOT_V
  /** ms since epoch — last write wins for merge */
  updatedAt: number
  game: PersistedState
  targets: TeamTargets
  tolerancePx: number
  defaultMaxGuesses: number
  /** How often player devices `GET` /api/snapshot (ms). Organizer-tunable; 3s–120s. */
  playerPollIntervalMs?: number
  /**
   * When true, devices poll the server on a timer. When false (default), only the
   * initial load and full page refresh fetch — no background GET loop.
   */
  livePollEnabled?: boolean
  /** Display names for team1…team4 — synced with organizer. */
  teamLabels?: TeamLabels
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
    playerPollIntervalMs: getPlayerPollIntervalMs(),
    livePollEnabled: getLivePollEnabled(),
    teamLabels: getTeamLabels(),
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
    playerPollIntervalMs: DEFAULT_PLAYER_POLL_MS,
    livePollEnabled: false,
    teamLabels: getDefaultTeamLabels(),
  }
}

/** Before first React mount — e.g. after fetching remote. */
export function applySnapshotToLocalStorage(s: AppSnapshotV1): void {
  setTolerancePx(s.tolerancePx)
  setDefaultMaxGuesses(s.defaultMaxGuesses)
  setPlayerPollIntervalMs(s.playerPollIntervalMs ?? DEFAULT_PLAYER_POLL_MS)
  setLivePollEnabled(s.livePollEnabled === true)
  applyTeamLabelsFromSnapshot(s.teamLabels)
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
  setPlayerPollIntervalMs(s.playerPollIntervalMs ?? DEFAULT_PLAYER_POLL_MS)
  setLivePollEnabled(s.livePollEnabled === true)
  applyTeamLabelsFromSnapshot(s.teamLabels)
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
  setPlayerPollIntervalMs(s.playerPollIntervalMs ?? DEFAULT_PLAYER_POLL_MS)
  setLivePollEnabled(s.livePollEnabled === true)
  applyTeamLabelsFromSnapshot(s.teamLabels)
}

export function isAppSnapshotV1(x: unknown): x is AppSnapshotV1 {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 1) return false
  if (typeof o.updatedAt !== 'number' || o.updatedAt <= 0) return false
  if (typeof o.tolerancePx !== 'number' || typeof o.defaultMaxGuesses !== 'number') return false
  if (!o.game || typeof o.game !== 'object' || !o.targets || typeof o.targets !== 'object') return false
  if (o.adminOverride !== undefined && o.adminOverride !== true) return false
  if (o.playerPollIntervalMs !== undefined) {
    if (typeof o.playerPollIntervalMs !== 'number' || !Number.isFinite(o.playerPollIntervalMs)) return false
    if (o.playerPollIntervalMs < MIN_MS || o.playerPollIntervalMs > MAX_MS) return false
  }
  if (o.livePollEnabled !== undefined && typeof o.livePollEnabled !== 'boolean') return false
  if (o.teamLabels !== undefined && !isValidTeamLabelsInSnapshot(o.teamLabels)) return false
  return true
}

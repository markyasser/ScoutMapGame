import type { AppSnapshotV1 } from './appSnapshot'
import { mergeGameStateWithDefaultMaxGuesses } from './gameState'
import { getDefaultTeamLabels, type TeamLabels } from './teamLabelsStorage'
import { DEFAULT_PLAYER_POLL_MS } from './playerPollInterval'

function pollKey(s: { playerPollIntervalMs?: number }): number {
  return s.playerPollIntervalMs ?? DEFAULT_PLAYER_POLL_MS
}

function liveKey(s: { livePollEnabled?: boolean }): boolean {
  return s.livePollEnabled === true
}

function labelsKey(s: { teamLabels?: TeamLabels }): string {
  return JSON.stringify({ ...getDefaultTeamLabels(), ...s.teamLabels })
}

/** Use when comparing a network snapshot to local state (merge game with default, same as apply). */
export function snapshotDataKeyFromV1(s: AppSnapshotV1): string {
  return snapshotDataKey({
    game: mergeGameStateWithDefaultMaxGuesses(s.game, s.defaultMaxGuesses),
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
    playerPollIntervalMs: s.playerPollIntervalMs,
    livePollEnabled: s.livePollEnabled,
    teamLabels: s.teamLabels,
  })
}

export function snapshotDataKey(
  s: Pick<
    AppSnapshotV1,
    | 'game'
    | 'targets'
    | 'tolerancePx'
    | 'defaultMaxGuesses'
    | 'playerPollIntervalMs'
    | 'livePollEnabled'
    | 'teamLabels'
  >
): string {
  return JSON.stringify({
    game: s.game,
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
    playerPollIntervalMs: pollKey(s),
    livePollEnabled: liveKey(s),
    teamLabels: labelsKey(s),
  })
}

export function snapshotConfigKey(
  s: Pick<
    AppSnapshotV1,
    'targets' | 'tolerancePx' | 'defaultMaxGuesses' | 'playerPollIntervalMs' | 'livePollEnabled' | 'teamLabels'
  >
): string {
  return JSON.stringify({
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
    playerPollIntervalMs: pollKey(s),
    livePollEnabled: liveKey(s),
    teamLabels: labelsKey(s),
  })
}

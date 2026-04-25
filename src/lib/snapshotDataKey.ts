import type { AppSnapshotV1 } from './appSnapshot'
import { DEFAULT_PLAYER_POLL_MS } from './playerPollInterval'

function pollKey(s: { playerPollIntervalMs?: number }): number {
  return s.playerPollIntervalMs ?? DEFAULT_PLAYER_POLL_MS
}

function liveKey(s: { livePollEnabled?: boolean }): boolean {
  return s.livePollEnabled === true
}

export function snapshotDataKey(
  s: Pick<
    AppSnapshotV1,
    'game' | 'targets' | 'tolerancePx' | 'defaultMaxGuesses' | 'playerPollIntervalMs' | 'livePollEnabled'
  >
): string {
  return JSON.stringify({
    game: s.game,
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
    playerPollIntervalMs: pollKey(s),
    livePollEnabled: liveKey(s),
  })
}

export function snapshotConfigKey(
  s: Pick<AppSnapshotV1, 'targets' | 'tolerancePx' | 'defaultMaxGuesses' | 'playerPollIntervalMs' | 'livePollEnabled'>
): string {
  return JSON.stringify({
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
    playerPollIntervalMs: pollKey(s),
    livePollEnabled: liveKey(s),
  })
}

import type { AppSnapshotV1 } from './appSnapshot'

export function snapshotDataKey(
  s: Pick<AppSnapshotV1, 'game' | 'targets' | 'tolerancePx' | 'defaultMaxGuesses'>
): string {
  return JSON.stringify({
    game: s.game,
    targets: s.targets,
    tolerancePx: s.tolerancePx,
    defaultMaxGuesses: s.defaultMaxGuesses,
  })
}

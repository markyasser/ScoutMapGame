import { MAP_CONFIG, TEAMS, type MapPoint, type TeamId } from '../config/mapConfig'

const TARGETS_KEY = 'scoutmap-targets-v1'

export type TeamTargets = Record<TeamId, [MapPoint, MapPoint, MapPoint, MapPoint]>

function deepCloneCodeDefaults(): TeamTargets {
  const o = {} as TeamTargets
  for (const t of TEAMS) {
    o[t] = MAP_CONFIG.teams[t].map((p) => ({ x: p.x, y: p.y })) as [
      MapPoint,
      MapPoint,
      MapPoint,
      MapPoint,
    ]
  }
  return o
}

function validPt(v: unknown): v is MapPoint {
  if (!v || typeof v !== 'object') return false
  const p = v as { x?: unknown; y?: unknown }
  return (
    typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)
  )
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n))
}

/**
 * Coerce any snapshot or stored blob into a valid `TeamTargets` (4 points per team).
 * Invalid teams fall back to code defaults; prevents `.map` crashes when a team is an object, string, etc.
 */
export function normalizeMapTargets(input: unknown): TeamTargets {
  const base = deepCloneCodeDefaults()
  if (!input || typeof input !== 'object') return base
  for (const t of TEAMS) {
    const teamArr = (input as Record<string, unknown>)[t]
    if (!Array.isArray(teamArr) || teamArr.length !== 4) continue
    const next: [MapPoint, MapPoint, MapPoint, MapPoint] = [...base[t]]
    for (let i = 0; i < 4; i++) {
      if (validPt(teamArr[i])) {
        const pt = teamArr[i] as MapPoint
        next[i] = {
          x: clamp(pt.x),
          y: clamp(pt.y),
        }
      }
    }
    base[t] = next
  }
  return base
}

/** Merge saved targets with code defaults; validate shape. */
export function loadMapTargets(): TeamTargets {
  try {
    const raw = localStorage.getItem(TARGETS_KEY)
    if (!raw) return deepCloneCodeDefaults()
    const parsed: unknown = JSON.parse(raw)
    return normalizeMapTargets(parsed)
  } catch {
    return deepCloneCodeDefaults()
  }
}

export function saveMapTargets(targets: TeamTargets): void {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets))
}

export { TARGETS_KEY, deepCloneCodeDefaults as getDefaultMapTargets }

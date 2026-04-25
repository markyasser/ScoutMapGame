import type { TeamId } from '../config/mapConfig'
import { TEAMS } from '../config/mapConfig'

const STORAGE_KEY = 'scoutmap-game-v1'
const TOLERANCE_KEY = 'scoutmap-tolerance-px'
const MAX_GUESSES_DEFAULT_KEY = 'scoutmap-default-max-guesses'
const DEFAULT_TOLERANCE = 18
const DEFAULT_MAX_GUESSES = 3
const MIN_GUESSES = 1
const MAX_GUESSES_CAP = 50

export type GuessRecord = { x: number; y: number; distancePx: number }
export type PointState = {
  attempts: number
  maxGuesses: number
  guesses: GuessRecord[]
  /** Where the team clicked when they found this waypoint; kept for map pin */
  foundAt?: { x: number; y: number }
}

export type TeamGameState = {
  currentPointIndex: number
  points: [PointState, PointState, PointState, PointState]
  /** Completed point indices, for display */
  foundMask: [boolean, boolean, boolean, boolean]
}

/** Built-in default when nothing is in localStorage (same as `DEFAULT_MAX_GUESSES`). */
export function getDefaultMaxGuesses(): number {
  try {
    const v = localStorage.getItem(MAX_GUESSES_DEFAULT_KEY)
    const n = v ? parseInt(v, 10) : DEFAULT_MAX_GUESSES
    if (!Number.isFinite(n)) return DEFAULT_MAX_GUESSES
    return Math.min(MAX_GUESSES_CAP, Math.max(MIN_GUESSES, n))
  } catch {
    return DEFAULT_MAX_GUESSES
  }
}

export function setDefaultMaxGuesses(n: number): void {
  const c = Math.min(MAX_GUESSES_CAP, Math.max(MIN_GUESSES, Math.round(n)))
  localStorage.setItem(MAX_GUESSES_DEFAULT_KEY, String(c))
  window.dispatchEvent(new Event('scoutmap-default-guesses-changed'))
}

const emptyPoint = (max: number = getDefaultMaxGuesses()): PointState => ({
  attempts: 0,
  maxGuesses: max,
  guesses: [],
  foundAt: undefined,
})

function defaultTeamState(): TeamGameState {
  return {
    currentPointIndex: 0,
    points: [emptyPoint(), emptyPoint(), emptyPoint(), emptyPoint()],
    foundMask: [false, false, false, false],
  }
}

export type PersistedState = {
  teams: Record<TeamId, TeamGameState>
}

function defaultPersisted(): PersistedState {
  const teams = {} as Record<TeamId, TeamGameState>
  for (const t of TEAMS) teams[t] = defaultTeamState()
  return { teams }
}

export function loadGameState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPersisted()
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    const defMax = getDefaultMaxGuesses()
    const base = defaultPersisted()
    for (const t of TEAMS) {
      if (parsed.teams?.[t]) {
        const incoming = parsed.teams[t]!
        const pt = [0, 1, 2, 3].map((i) => {
          const inc = incoming.points?.[i]
          const fa = inc?.foundAt
          return {
            attempts: Math.min(inc?.attempts ?? 0, (inc?.maxGuesses ?? defMax) + 100),
            maxGuesses: Math.max(defMax, inc?.maxGuesses ?? defMax),
            guesses: Array.isArray(inc?.guesses) ? inc.guesses : [],
            foundAt:
              fa && typeof fa.x === 'number' && typeof fa.y === 'number'
                ? { x: fa.x, y: fa.y }
                : undefined,
          } as PointState
        }) as [PointState, PointState, PointState, PointState]
        base.teams[t] = {
          currentPointIndex: Math.min(
            4,
            Math.max(0, incoming.currentPointIndex ?? 0)
          ),
          points: pt,
          foundMask: (incoming.foundMask ?? [false, false, false, false]) as [
            boolean,
            boolean,
            boolean,
            boolean,
          ],
        }
      }
    }
    return base
  } catch {
    return defaultPersisted()
  }
}

export function saveGameState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getTolerancePx(): number {
  const v = localStorage.getItem(TOLERANCE_KEY)
  const n = v ? parseFloat(v) : DEFAULT_TOLERANCE
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TOLERANCE
}

export function setTolerancePx(px: number): void {
  localStorage.setItem(TOLERANCE_KEY, String(px))
}

export { DEFAULT_TOLERANCE, DEFAULT_MAX_GUESSES, STORAGE_KEY, MIN_GUESSES, MAX_GUESSES_CAP }

/** Euclidean distance in pixels given normalized 0–100 coords and image pixel size. */
export function distancePx(
  a: { x: number; y: number },
  b: { x: number; y: number },
  widthPx: number,
  heightPx: number
): number {
  const ax = (a.x / 100) * widthPx
  const ay = (a.y / 100) * heightPx
  const bx = (b.x / 100) * widthPx
  const by = (b.y / 100) * heightPx
  return Math.hypot(ax - bx, ay - by)
}

/**
 * 0 = far, 1 = close. `maxDistPx` is the distance that maps to “coldest” yellow;
 * beyond that, color stays at yellow.
 */
export function farToCloseT(distancePx: number, maxDistPx: number): number {
  if (maxDistPx <= 0) return 1
  return 1 - Math.min(1, distancePx / maxDistPx)
}

/**
 * Picks a scale in pixels so typical on-map clicks span the full heat strip (not all brown from huge diagonal / RGB mud).
 */
export function colorScaleMaxPx(mapWidthPx: number, mapHeightPx: number): number {
  return Math.max(100, 0.42 * Math.min(mapWidthPx, mapHeightPx))
}

/**
 * Heat: far = vivid yellow, close = red (HSL hue path — avoids brown mid-tones from RGB lerp on road maps).
 */
export function lerpColorFarToClose(t: number): string {
  const u = Math.min(1, Math.max(0, t))
  const h = 58 * (1 - u) // 58° (yellow) → 0° (red)
  const s = 88 + 7 * u
  const l = 52 - 10 * u
  return `hsl(${h}, ${s}%, ${l}%)`
}

/** One line per guess: first has no “nearer” compare; then vs previous distance. */
export function guessProgressLabels(guesses: GuessRecord[]): string[] {
  return guesses.map((g, i) => {
    if (i === 0) return 'Start — first try'
    const prev = guesses[i - 1]!.distancePx
    if (g.distancePx < prev) return 'Nearer than your last try'
    if (g.distancePx > prev) return 'Farther than your last try'
    return 'Same distance as your last try'
  })
}

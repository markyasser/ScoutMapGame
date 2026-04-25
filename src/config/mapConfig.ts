/**
 * Target positions as percentage of image width/height (0–100).
 * Base map: `public/scout-map.jpg`. If you replace it, update natural width/height below
 * and re-place or reset waypoints in Organizer.
 */
export const TEAMS = ['team1', 'team2', 'team3', 'team4'] as const
export type TeamId = (typeof TEAMS)[number]

export const TEAM_LABELS: Record<TeamId, string> = {
  team1: 'Alpha',
  team2: 'Bravo',
  team3: 'Charlie',
  team4: 'Delta',
}

export type MapPoint = { x: number; y: number }

export const MAP_CONFIG = {
  mapSrc: '/scout-map.jpg',
  mapNaturalWidth: 1024,
  mapNaturalHeight: 432,
  teams: {
    team1: [
      { x: 28, y: 32 },
      { x: 52, y: 44 },
      { x: 70, y: 58 },
      { x: 40, y: 72 },
    ],
    team2: [
      { x: 22, y: 38 },
      { x: 48, y: 28 },
      { x: 65, y: 50 },
      { x: 38, y: 68 },
    ],
    team3: [
      { x: 35, y: 30 },
      { x: 55, y: 48 },
      { x: 45, y: 62 },
      { x: 32, y: 78 },
    ],
    team4: [
      { x: 48, y: 22 },
      { x: 30, y: 46 },
      { x: 72, y: 55 },
      { x: 44, y: 84 },
    ],
  } as Record<TeamId, [MapPoint, MapPoint, MapPoint, MapPoint]>,
} as const

export function isTeamId(s: string | null): s is TeamId {
  return s !== null && TEAMS.includes(s as TeamId)
}

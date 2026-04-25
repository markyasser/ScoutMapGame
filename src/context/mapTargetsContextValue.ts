import { createContext } from 'react'
import type { MapPoint, TeamId } from '../config/mapConfig'
import type { TeamTargets } from '../lib/mapTargetsStorage'

export type MapTargetsContextValue = {
  targets: TeamTargets
  setTeamTargets: (team: TeamId, points: [MapPoint, MapPoint, MapPoint, MapPoint]) => void
  setOneWaypoint: (team: TeamId, index: 0 | 1 | 2 | 3, p: MapPoint) => void
  /** Full replace (e.g. remote sync). */
  replaceAllTargets: (t: TeamTargets) => void
  resetTeamTargetsToCodeDefaults: (team: TeamId) => void
  resetAllTargetsToCodeDefaults: () => void
}

export const MapTargetsContext = createContext<MapTargetsContextValue | null>(null)

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { MapPoint, TeamId } from '../config/mapConfig'
import { MapTargetsContext } from './mapTargetsContextValue'
import {
  getDefaultMapTargets,
  loadMapTargets,
  normalizeMapTargets,
  saveMapTargets,
  TARGETS_KEY,
  type TeamTargets,
} from '../lib/mapTargetsStorage'

export function MapTargetsProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<TeamTargets>(() => loadMapTargets())

  useEffect(() => {
    saveMapTargets(targets)
  }, [targets])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TARGETS_KEY) setTargets(loadMapTargets())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTeamTargets = useCallback((team: TeamId, points: [MapPoint, MapPoint, MapPoint, MapPoint]) => {
    setTargets((prev) => ({ ...prev, [team]: points }))
  }, [])

  const setOneWaypoint = useCallback(
    (team: TeamId, index: 0 | 1 | 2 | 3, p: MapPoint) => {
      setTargets((prev) => {
        const o = { ...prev[team] } as [MapPoint, MapPoint, MapPoint, MapPoint]
        o[index] = { x: p.x, y: p.y }
        return { ...prev, [team]: o }
      })
    },
    []
  )

  const replaceAllTargets = useCallback((t: TeamTargets) => {
    setTargets(normalizeMapTargets(t))
  }, [])

  const resetTeamTargetsToCodeDefaults = useCallback((team: TeamId) => {
    const d = getDefaultMapTargets()
    setTargets((prev) => ({ ...prev, [team]: d[team] }))
  }, [])

  const resetAllTargetsToCodeDefaults = useCallback(() => {
    setTargets(getDefaultMapTargets())
  }, [])

  return (
    <MapTargetsContext.Provider
      value={{
        targets,
        setTeamTargets,
        setOneWaypoint,
        replaceAllTargets,
        resetTeamTargetsToCodeDefaults,
        resetAllTargetsToCodeDefaults,
      }}
    >
      {children}
    </MapTargetsContext.Provider>
  )
}

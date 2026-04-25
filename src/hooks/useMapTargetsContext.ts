import { useContext } from 'react'
import { MapTargetsContext } from '../context/mapTargetsContextValue'

export function useMapTargets() {
  const c = useContext(MapTargetsContext)
  if (!c) throw new Error('useMapTargets must be used within MapTargetsProvider')
  return c
}

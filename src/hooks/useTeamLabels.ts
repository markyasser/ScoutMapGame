import { useCallback, useEffect, useState } from 'react'
import { type TeamId } from '../config/mapConfig'
import { getTeamLabels, setTeamLabels, TEAM_LABELS_EVENT, type TeamLabels } from '../lib/teamLabelsStorage'

export function useTeamLabels() {
  const [teamLabels, setState] = useState(() => getTeamLabels())

  const setTeamLabel = useCallback((team: TeamId, name: string) => {
    setTeamLabels({ ...getTeamLabels(), [team]: name })
    setState(getTeamLabels())
  }, [])

  const setAllTeamLabels = useCallback((next: TeamLabels) => {
    setTeamLabels(next)
    setState(getTeamLabels())
  }, [])

  useEffect(() => {
    const sync = () => setState(getTeamLabels())
    window.addEventListener(TEAM_LABELS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(TEAM_LABELS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { teamLabels, setTeamLabel, setTeamLabels: setAllTeamLabels }
}

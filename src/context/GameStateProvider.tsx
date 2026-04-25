import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { TEAMS, type TeamId } from '../config/mapConfig'
import { GameStateContext } from './gameStateContextValue'
import type { PersistedState, PointState, TeamGameState } from '../lib/gameState'
import { getDefaultMaxGuesses, loadGameState, saveGameState, STORAGE_KEY } from '../lib/gameState'

const freshPoint = (): PointState => ({
  attempts: 0,
  maxGuesses: getDefaultMaxGuesses(),
  guesses: [],
  foundAt: undefined,
})

function freshTeamState(): TeamGameState {
  return {
    currentPointIndex: 0,
    points: [freshPoint(), freshPoint(), freshPoint(), freshPoint()],
    foundMask: [false, false, false, false],
  }
}

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => loadGameState())

  useEffect(() => {
    saveGameState(state)
  }, [state])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setState(loadGameState())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updateTeam = useCallback(
    (team: TeamId, fn: (prev: TeamGameState) => TeamGameState) => {
      setState((s) => ({
        ...s,
        teams: { ...s.teams, [team]: fn(s.teams[team]) },
      }))
    },
    []
  )

  const resetAllTeams = useCallback(() => {
    const next: PersistedState = { teams: {} as PersistedState['teams'] }
    for (const t of TEAMS) next.teams[t] = freshTeamState()
    setState(next)
  }, [])

  return (
    <GameStateContext.Provider value={{ state, setState, updateTeam, resetAllTeams }}>
      {children}
    </GameStateContext.Provider>
  )
}

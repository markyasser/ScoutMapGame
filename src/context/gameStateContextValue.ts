import { createContext } from 'react'
import type { TeamId } from '../config/mapConfig'
import type { PersistedState, TeamGameState } from '../lib/gameState'

export type GameStateContextValue = {
  state: PersistedState
  setState: (s: PersistedState | ((p: PersistedState) => PersistedState)) => void
  updateTeam: (team: TeamId, fn: (prev: TeamGameState) => TeamGameState) => void
  resetAllTeams: () => void
}

export const GameStateContext = createContext<GameStateContextValue | null>(null)

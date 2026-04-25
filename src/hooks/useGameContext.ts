import { useContext } from 'react'
import { GameStateContext } from '../context/gameStateContextValue'

export function useGame() {
  const c = useContext(GameStateContext)
  if (!c) throw new Error('useGame must be used within GameStateProvider')
  return c
}

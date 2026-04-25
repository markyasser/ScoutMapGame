import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_PLAYER_POLL_MS,
  getPlayerPollIntervalMs,
  setPlayerPollIntervalMs,
  PLAYER_POLL_EVENT,
} from '../lib/playerPollInterval'

export function usePlayerPollInterval() {
  const [ms, setMs] = useState(() => getPlayerPollIntervalMs())

  const set = useCallback((n: number) => {
    setPlayerPollIntervalMs(n)
    setMs(getPlayerPollIntervalMs())
  }, [])

  useEffect(() => {
    const sync = () => setMs(getPlayerPollIntervalMs())
    window.addEventListener(PLAYER_POLL_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(PLAYER_POLL_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return {
    playerPollIntervalMs: ms,
    setPlayerPollIntervalMs: set,
    defaultPlayerPollMs: DEFAULT_PLAYER_POLL_MS,
  }
}

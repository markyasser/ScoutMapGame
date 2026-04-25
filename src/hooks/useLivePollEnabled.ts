import { useCallback, useEffect, useState } from 'react'
import { getLivePollEnabled, setLivePollEnabled, LIVE_POLL_EVENT } from '../lib/livePollEnabled'

export function useLivePollEnabled() {
  const [on, setOn] = useState(() => getLivePollEnabled())

  const set = useCallback((v: boolean) => {
    setLivePollEnabled(v)
    setOn(getLivePollEnabled())
  }, [])

  useEffect(() => {
    const sync = () => setOn(getLivePollEnabled())
    window.addEventListener(LIVE_POLL_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(LIVE_POLL_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { livePollEnabled: on, setLivePollEnabled: set }
}

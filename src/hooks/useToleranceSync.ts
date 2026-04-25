import { useEffect, useState } from 'react'
import { getTolerancePx, setTolerancePx, DEFAULT_TOLERANCE } from '../lib/gameState'

const EVT = 'scoutmap-tolerance-changed'

export function readToleranceAndBroadcast(px: number) {
  setTolerancePx(px)
  window.dispatchEvent(new Event(EVT))
}

export function useTolerancePx() {
  const [px, setPx] = useState(() => getTolerancePx())

  useEffect(() => {
    const sync = () => setPx(getTolerancePx())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { tolerancePx: px, setTolerancePx: readToleranceAndBroadcast, defaultTolerance: DEFAULT_TOLERANCE }
}

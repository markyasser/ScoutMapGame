import { useCallback, useEffect, useState } from 'react'
import {
  getDefaultMaxGuesses,
  setDefaultMaxGuesses,
  DEFAULT_MAX_GUESSES,
  MIN_GUESSES,
  MAX_GUESSES_CAP,
} from '../lib/gameState'

const EVT = 'scoutmap-default-guesses-changed'

export function readDefaultMaxGuessesAndBroadcast(n: number) {
  setDefaultMaxGuesses(n)
  window.dispatchEvent(new Event(EVT))
}

export function useDefaultMaxGuesses() {
  const [n, setN] = useState(() => getDefaultMaxGuesses())

  useEffect(() => {
    const sync = () => setN(getDefaultMaxGuesses())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const set = useCallback((value: number) => {
    readDefaultMaxGuessesAndBroadcast(value)
    setN(getDefaultMaxGuesses())
  }, [])

  return {
    defaultMaxGuesses: n,
    setDefaultMaxGuesses: set,
    minGuesses: MIN_GUESSES,
    maxGuessesCap: MAX_GUESSES_CAP,
    /** Constant 3 when localStorage is empty */
    fallbackDefault: DEFAULT_MAX_GUESSES,
  }
}

import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useGame } from '../hooks/useGameContext'
import { useMapTargets } from '../hooks/useMapTargetsContext'
import { useDefaultMaxGuesses } from '../hooks/useDefaultMaxGuesses'
import { useTolerancePx } from '../hooks/useToleranceSync'
import { useSyncApi } from '../context/SyncApiContext'
import {
  type AppSnapshotV1,
  applySnapshotToReact,
  isAppSnapshotV1,
} from '../lib/appSnapshot'
import { snapshotDataKey } from '../lib/snapshotDataKey'

const POLL_MS = 2500
const PUSH_DEBOUNCE_MS = 400

type RemoteSyncProps = { children: ReactNode }

/**
 * Pushes local changes to /api/snapshot and polls for updates from other devices
 * (no-op when the API is not available, e.g. no KV or 501).
 */
export function RemoteSync({ children }: RemoteSyncProps) {
  return (
    <>
      <RemoteSyncInner />
      {children}
    </>
  )
}

function RemoteSyncInner() {
  const { apiActive, initialRemoteAt } = useSyncApi()
  const { state, setState } = useGame()
  const { targets, replaceAllTargets } = useMapTargets()
  const { defaultMaxGuesses } = useDefaultMaxGuesses()
  const { tolerancePx } = useTolerancePx()

  const lastRemoteAt = useRef(initialRemoteAt)
  const applyingRemote = useRef(false)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPushedDataKey = useRef('')

  const stateRef = useRef(state)
  const targetsRef = useRef(targets)
  const toleranceRef = useRef(tolerancePx)
  const defaultRef = useRef(defaultMaxGuesses)
  stateRef.current = state
  targetsRef.current = targets
  toleranceRef.current = tolerancePx
  defaultRef.current = defaultMaxGuesses

  useEffect(() => {
    lastRemoteAt.current = initialRemoteAt
  }, [initialRemoteAt])

  const currentDataKey = useCallback(() => {
    return snapshotDataKey({
      game: stateRef.current,
      targets: targetsRef.current,
      tolerancePx: toleranceRef.current,
      defaultMaxGuesses: defaultRef.current,
    })
  }, [])

  const applyRemote = useCallback(
    (s: AppSnapshotV1) => {
      applyingRemote.current = true
      try {
        applySnapshotToReact(s, setState, replaceAllTargets)
        lastRemoteAt.current = s.updatedAt
        lastPushedDataKey.current = snapshotDataKey(s)
      } finally {
        queueMicrotask(() => {
          applyingRemote.current = false
        })
      }
    },
    [setState, replaceAllTargets]
  )

  const pushIfNeeded = useCallback(async () => {
    if (!apiActive || applyingRemote.current) return
    const key = currentDataKey()
    if (key === lastPushedDataKey.current) return
    const snap: AppSnapshotV1 = {
      v: 1,
      updatedAt: Date.now(),
      game: stateRef.current,
      targets: targetsRef.current,
      tolerancePx: toleranceRef.current,
      defaultMaxGuesses: defaultRef.current,
    }
    try {
      const r = await fetch('/api/snapshot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap),
      })
      if (r.ok) {
        lastPushedDataKey.current = key
      }
    } catch {
      /* retry on next debounce */
    }
  }, [apiActive, currentDataKey])

  useEffect(() => {
    if (!apiActive) return
    if (applyingRemote.current) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      void pushIfNeeded()
    }, PUSH_DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [apiActive, state, targets, tolerancePx, defaultMaxGuesses, pushIfNeeded])

  useEffect(() => {
    if (!apiActive) return
    const tick = () => {
      if (applyingRemote.current) return
      void (async () => {
        try {
          const r = await fetch('/api/snapshot')
          if (r.status === 501) return
          if (!r.ok) return
          const j: unknown = await r.json()
          if (j == null) return
          if (!isAppSnapshotV1(j)) return
          if (j.updatedAt <= lastRemoteAt.current) return
          const localKey = currentDataKey()
          const incomingKey = snapshotDataKey(j)
          if (incomingKey === localKey) {
            lastRemoteAt.current = j.updatedAt
            return
          }
          applyRemote(j)
        } catch {
          /* ignore */
        }
      })()
    }
    void tick()
    const id = setInterval(tick, POLL_MS)
    return () => clearInterval(id)
  }, [apiActive, applyRemote, currentDataKey])

  return null
}

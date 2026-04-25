import { useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from '../hooks/useGameContext'
import { useMapTargets } from '../hooks/useMapTargetsContext'
import { useDefaultMaxGuesses } from '../hooks/useDefaultMaxGuesses'
import { useTolerancePx } from '../hooks/useToleranceSync'
import { useSyncApi } from '../context/SyncApiContext'
import { RemoteSyncActionsProvider } from '../context/RemoteSyncActionsContext'
import {
  type AppSnapshotV1,
  applyRemoteConfigToReact,
  applySnapshotToReact,
  isAppSnapshotV1,
} from '../lib/appSnapshot'
import { snapshotConfigKey, snapshotDataKey } from '../lib/snapshotDataKey'

const POLL_MS = 2000
const PUSH_DEBOUNCE_MS = 150

type RemoteSyncProps = { children: ReactNode }

/**
 * Pushes local changes to /api/snapshot and polls for updates from other devices
 * (no-op when the API is not available, e.g. no Redis or 501).
 * Auto-push is disabled on /admin; use the Save button to publish organizer changes.
 */
export function RemoteSync({ children }: RemoteSyncProps) {
  const { apiActive, initialRemoteAt } = useSyncApi()
  const { pathname } = useLocation()
  const isAdminRoute = pathname === '/admin'

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

  // Treat initial client state as “synced to nothing pending” so poll logic is not always “dirty”
  useEffect(() => {
    lastPushedDataKey.current = currentDataKey()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time after mount; refs are current
  }, [])

  const currentDataKey = useCallback(() => {
    return snapshotDataKey({
      game: stateRef.current,
      targets: targetsRef.current,
      tolerancePx: toleranceRef.current,
      defaultMaxGuesses: defaultRef.current,
    })
  }, [])

  const snapshotConfigKeyFromRefs = useCallback(() => {
    return snapshotConfigKey({
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

  const doPutSnapshot = useCallback(async (snap: AppSnapshotV1, key: string) => {
    const r = await fetch('/api/snapshot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snap),
    })
    if (r.ok) {
      lastPushedDataKey.current = key
      lastRemoteAt.current = Math.max(lastRemoteAt.current, snap.updatedAt)
    }
    return r.ok
  }, [])

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
      await doPutSnapshot(snap, key)
    } catch {
      /* retry on next debounce */
    }
  }, [apiActive, currentDataKey, doPutSnapshot])

  const saveToRemote = useCallback(async () => {
    if (!apiActive) return { ok: false as const, error: 'no_api' as const }
    if (applyingRemote.current) return { ok: false as const, error: 'busy' as const }
    const key = currentDataKey()
    const snap: AppSnapshotV1 = {
      v: 1,
      updatedAt: Date.now(),
      game: stateRef.current,
      targets: targetsRef.current,
      tolerancePx: toleranceRef.current,
      defaultMaxGuesses: defaultRef.current,
    }
    try {
      const ok = await doPutSnapshot(snap, key)
      return ok ? { ok: true as const } : { ok: false as const, error: 'http' as const }
    } catch {
      return { ok: false as const, error: 'network' as const }
    }
  }, [apiActive, currentDataKey, doPutSnapshot])

  const saveContextValue = useMemo(() => ({ saveToRemote }), [saveToRemote])

  useEffect(() => {
    if (!apiActive) return
    if (isAdminRoute) {
      if (pushTimer.current) {
        clearTimeout(pushTimer.current)
        pushTimer.current = null
      }
      return
    }
    if (applyingRemote.current) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      void pushIfNeeded()
    }, PUSH_DEBOUNCE_MS)
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [apiActive, isAdminRoute, state, targets, tolerancePx, defaultMaxGuesses, pushIfNeeded])

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
          if (j.updatedAt < lastRemoteAt.current) return
          const localKey = currentDataKey()
          const incomingKey = snapshotDataKey(j)
          if (incomingKey === localKey) {
            lastRemoteAt.current = j.updatedAt
            return
          }

          const playerHasUnpushedToServer =
            !isAdminRoute && currentDataKey() !== lastPushedDataKey.current
          if (playerHasUnpushedToServer) {
            if (snapshotConfigKey(j) !== snapshotConfigKeyFromRefs()) {
              applyRemoteConfigToReact(j, replaceAllTargets)
            }
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
  }, [
    apiActive,
    applyRemote,
    currentDataKey,
    isAdminRoute,
    replaceAllTargets,
    snapshotConfigKeyFromRefs,
  ])

  return (
    <RemoteSyncActionsProvider value={saveContextValue}>{children}</RemoteSyncActionsProvider>
  )
}

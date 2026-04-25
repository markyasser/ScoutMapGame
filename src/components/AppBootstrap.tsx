import { useEffect, useState, type ReactNode } from 'react'
import {
  applySnapshotToLocalStorage,
  buildLocalSnapshot,
  isAppSnapshotV1,
  pickNewer,
} from '../lib/appSnapshot'
import { SyncApiProvider } from '../context/SyncApiContext'

export function AppBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [apiActive, setApiActive] = useState(false)
  const [initialRemoteAt, setInitialRemoteAt] = useState(0)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const local = buildLocalSnapshot()
      let chosen = local
      let active = false
      try {
        const r = await fetch('/api/snapshot')
        active = r.ok
        if (r.ok) {
          const j: unknown = await r.json()
          if (j != null && isAppSnapshotV1(j)) {
            chosen = pickNewer(j, local)
          }
        }
      } catch {
        /* offline or no /api in dev — local only */
      }
      if (cancel) return
      applySnapshotToLocalStorage(chosen)
      setApiActive(active)
      setInitialRemoteAt(chosen.updatedAt)
      setReady(true)
    })()
    return () => {
      cancel = true
    }
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950 text-stone-400">
        <p className="text-sm">Loading game…</p>
      </div>
    )
  }

  return (
    <SyncApiProvider apiActive={apiActive} initialRemoteAt={initialRemoteAt}>
      {children}
    </SyncApiProvider>
  )
}

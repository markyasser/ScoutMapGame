import { createContext, useContext, type ReactNode } from 'react'

type SyncApiValue = {
  /** GET /api/snapshot was reachable (e.g. KV configured) */
  apiActive: boolean
  /** `updatedAt` of the snapshot we booted from (local or remote) */
  initialRemoteAt: number
}

const SyncApiContext = createContext<SyncApiValue>({ apiActive: false, initialRemoteAt: 0 })

export function SyncApiProvider({
  apiActive,
  initialRemoteAt,
  children,
}: {
  apiActive: boolean
  initialRemoteAt: number
  children: ReactNode
}) {
  return <SyncApiContext.Provider value={{ apiActive, initialRemoteAt }}>{children}</SyncApiContext.Provider>
}

export function useSyncApi() {
  return useContext(SyncApiContext)
}

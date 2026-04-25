import { createContext, useContext, type ReactNode } from 'react'

export type SaveToRemoteError = 'no_api' | 'network' | 'http' | 'busy'

export type SaveToRemoteResult = { ok: true } | { ok: false; error: SaveToRemoteError }

export type SaveToRemoteOptions = {
  /** Organizer only: server marks snapshot so all players replace local state with this payload. */
  adminOverride?: boolean
}

type Value = {
  saveToRemote: (options?: SaveToRemoteOptions) => Promise<SaveToRemoteResult>
}

const RemoteSyncActionsContext = createContext<Value | null>(null)

export function RemoteSyncActionsProvider({ value, children }: { value: Value; children: ReactNode }) {
  return <RemoteSyncActionsContext.Provider value={value}>{children}</RemoteSyncActionsContext.Provider>
}

export function useRemoteSyncActions() {
  const v = useContext(RemoteSyncActionsContext)
  if (v == null) {
    throw new Error('useRemoteSyncActions must be used under RemoteSyncActionsProvider')
  }
  return v
}

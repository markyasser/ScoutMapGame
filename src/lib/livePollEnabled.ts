const STORAGE_KEY = 'scoutmap-live-poll-enabled-v1'
const EVT = 'scoutmap-live-poll-enabled-changed'

/** When false, no background `GET` loop — only AppBootstrap on load and manual page refresh. */
const DEFAULT_LIVE_POLL = false

export function getLivePollEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v == null) return DEFAULT_LIVE_POLL
    return v === '1' || v === 'true'
  } catch {
    return DEFAULT_LIVE_POLL
  }
}

export function setLivePollEnabled(on: boolean): void {
  localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  window.dispatchEvent(new Event(EVT))
}

export { DEFAULT_LIVE_POLL, EVT as LIVE_POLL_EVENT }

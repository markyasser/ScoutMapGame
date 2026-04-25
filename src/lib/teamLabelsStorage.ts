import { TEAMS, TEAM_LABELS, type TeamId } from '../config/mapConfig'

const STORAGE_KEY = 'scoutmap-team-labels-v1'
export const TEAM_LABELS_EVENT = 'scoutmap-team-labels-changed'

export type TeamLabels = Record<TeamId, string>

function defaults(): TeamLabels {
  return { ...TEAM_LABELS }
}

export function getDefaultTeamLabels(): TeamLabels {
  return { ...TEAM_LABELS }
}

function clampName(s: string): string {
  const t = s.trim().slice(0, 48)
  return t.length > 0 ? t : 'Team'
}

export function getTeamLabels(): TeamLabels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const base = defaults()
    if (!raw) return base
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') return base
    for (const t of TEAMS) {
      const v = (p as Record<string, unknown>)[t]
      if (typeof v === 'string' && v.trim()) {
        base[t] = clampName(v)
      }
    }
    return base
  } catch {
    return defaults()
  }
}

export function setTeamLabels(next: TeamLabels): void {
  const o = defaults()
  for (const t of TEAMS) {
    o[t] = clampName(next[t] ?? o[t]!)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(o))
  window.dispatchEvent(new Event(TEAM_LABELS_EVENT))
}

/** Apply labels from a snapshot; merges with code defaults for missing keys. */
export function applyTeamLabelsFromSnapshot(teamLabels: TeamLabels | undefined): void {
  if (!teamLabels) return
  const o = defaults()
  for (const t of TEAMS) {
    const v = teamLabels[t]
    if (typeof v === 'string' && v.trim()) o[t] = clampName(v)
  }
  setTeamLabels(o)
}

export function isValidTeamLabelsInSnapshot(o: unknown): o is TeamLabels {
  if (!o || typeof o !== 'object') return false
  const r = o as Record<string, unknown>
  for (const t of TEAMS) {
    const v = r[t]
    if (typeof v !== 'string' || v.length > 80) return false
  }
  return true
}

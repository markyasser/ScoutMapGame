import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router-dom'
import { TEAMS, type TeamId } from '../config/mapConfig'
import { useTeamLabels } from '../hooks/useTeamLabels'
import { ScoutMap } from '../components/ScoutMap'
import { useGame } from '../hooks/useGameContext'
import { useMapTargets } from '../hooks/useMapTargetsContext'
import { useDefaultMaxGuesses } from '../hooks/useDefaultMaxGuesses'
import { useLivePollEnabled } from '../hooks/useLivePollEnabled'
import { usePlayerPollInterval } from '../hooks/usePlayerPollInterval'
import { useTolerancePx } from '../hooks/useToleranceSync'
import { MAX_MS, MIN_MS } from '../lib/playerPollInterval'
import { getDefaultMaxGuesses } from '../lib/gameState'
import { useSyncApi } from '../context/SyncApiContext'
import { useRemoteSyncActions } from '../context/RemoteSyncActionsContext'

const AUTH_USER = 'admin'
const AUTH_PASS = 'password123'
const SESS = 'scoutmap-admin-auth'

export function AdminPage() {
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [authed, setAuthed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESS) === '1'
  )
  const { state, updateTeam, resetAllTeams } = useGame()
  const { targets, setOneWaypoint, resetTeamTargetsToCodeDefaults, resetAllTargetsToCodeDefaults } = useMapTargets()
  const { tolerancePx, setTolerancePx, defaultTolerance } = useTolerancePx()
  const {
    defaultMaxGuesses,
    setDefaultMaxGuesses: setDefaultTries,
    minGuesses,
    maxGuessesCap,
  } = useDefaultMaxGuesses()
  const { playerPollIntervalMs, setPlayerPollIntervalMs, defaultPlayerPollMs } = usePlayerPollInterval()
  const { livePollEnabled, setLivePollEnabled } = useLivePollEnabled()
  const [adminTeam, setAdminTeam] = useState<TeamId>('team1')
  const [helper, setHelper] = useState(true)
  /** Which waypoint (0–3) is shown on the map for click-to-place and the accuracy ring */
  const [waypointToSet, setWaypointToSet] = useState<0 | 1 | 2 | 3>(0)
  const [showAllWaypoints, setShowAllWaypoints] = useState(false)
  const { apiActive } = useSyncApi()
  const { saveToRemote } = useRemoteSyncActions()
  const { teamLabels, setTeamLabel } = useTeamLabels()
  const [saving, setSaving] = useState(false)
  const [saveHint, setSaveHint] = useState<string | null>(null)

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (u === AUTH_USER && p === AUTH_PASS) {
      sessionStorage.setItem(SESS, '1')
      setAuthed(true)
    }
  }

  const increaseTrials = () => {
    const gs = state.teams[adminTeam]
    const i = Math.min(3, gs.currentPointIndex)
    if (gs.currentPointIndex >= 4) return
    updateTeam(adminTeam, (t) => {
      const p = t.points.map((c) => ({ ...c })) as typeof t.points
      p[i] = { ...p[i]!, maxGuesses: p[i]!.maxGuesses + 1 }
      return { ...t, points: p }
    })
  }

  const clearTrialsForCurrentPoint = () => {
    const gs = state.teams[adminTeam]
    const i = Math.min(3, gs.currentPointIndex)
    if (gs.currentPointIndex >= 4) return
    if (
      !window.confirm(
        `Clear trials for ${teamLabels[adminTeam]} on point ${i + 1}/4? This resets guesses to the default (${getDefaultMaxGuesses()}), clears used attempts, and removes map markers for this point.`
      )
    ) {
      return
    }
    updateTeam(adminTeam, (t) => {
      const p = t.points.map((c) => ({ ...c })) as typeof t.points
      p[i] = {
        attempts: 0,
        maxGuesses: getDefaultMaxGuesses(),
        guesses: [],
        foundAt: undefined,
      }
      return { ...t, points: p }
    })
  }

  if (!authed) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <form
          onSubmit={onLogin}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-600/40 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/30"
        >
          <h1 className="font-mono text-lg text-stone-100">Organizer</h1>
          <div>
            <label className="text-xs text-stone-500">User</label>
            <input
              className="mt-1 w-full rounded border border-slate-600/50 bg-slate-950/80 px-3 py-2 text-stone-100 placeholder-stone-600 focus:border-teal-700/50 focus:outline-none focus:ring-1 focus:ring-teal-800/30"
              value={u}
              onChange={(e) => setU(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded border border-slate-600/50 bg-slate-950/80 px-3 py-2 text-stone-100 focus:border-teal-700/50 focus:outline-none focus:ring-1 focus:ring-teal-800/30"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-800/80 py-2 font-mono text-sm text-stone-100 hover:bg-teal-700/90"
          >
            Sign in
          </button>
          <p className="text-center text-xs text-stone-500">
            <Link to="/" className="text-teal-400/85 hover:text-teal-300 hover:underline">
              Back to game
            </Link>
          </p>
        </form>
      </div>
    )
  }

  const tState = state.teams[adminTeam]
  const curIdx = tState.currentPointIndex

  return (
    <div className="w-full px-3 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-4 border-b border-slate-700/50 pb-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-mono text-xl text-stone-100">Organizer console</h1>
              <p className="text-sm text-stone-500">Tolerance, default attempt budget, and trial boosts for live play.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {apiActive ? (
                livePollEnabled ? (
                  <span className="text-xs text-teal-500/90">
                    API + background sync on — devices poll the server on a timer.
                  </span>
                ) : (
                  <span className="max-w-md text-xs text-teal-500/80">
                    API on — background poll off. Players and this tab load data on open/refresh; use Save to players to
                    update the server.
                  </span>
                )
              ) : (
                <span className="max-w-md text-xs text-amber-400/95">
                  Live sync: off — in Vercel, add an Upstash Redis store (or set UPSTASH_REDIS_REST_URL and
                  UPSTASH_REDIS_REST_TOKEN), then redeploy. Without that, this browser and players never share data.
                </span>
              )}
              <button
                type="button"
                disabled={!apiActive || saving}
                className="rounded-lg bg-teal-800/80 px-4 py-2 text-sm font-mono text-stone-100 hover:bg-teal-700/90 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={async () => {
                  if (!apiActive) return
                  setSaving(true)
                  setSaveHint(null)
                  const r = await saveToRemote({ adminOverride: true })
                  setSaving(false)
                  if (r.ok) {
                    setSaveHint(
                      'Saved with override — on the next sync, all players will match this organizer state (replaces in-progress play on their devices).'
                    )
                  } else if (r.error === 'no_api') {
                    setSaveHint('Sync is not available (no Redis on the server).')
                  } else {
                    setSaveHint('Could not save. Check the network and try again.')
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save to players'}
              </button>
              <Link to="/" className="text-sm text-teal-400/85 hover:text-teal-300 hover:underline">
                Home
              </Link>
              <button
                type="button"
                className="text-sm text-stone-500 hover:text-stone-300"
                onClick={() => {
                  sessionStorage.removeItem(SESS)
                  setAuthed(false)
                }}
              >
                Log out
              </button>
            </div>
          </div>
          {saveHint != null && <p className="text-sm text-stone-400">{saveHint}</p>}
        </header>

        <section className="space-y-3 rounded-xl border border-slate-600/35 bg-slate-900/40 p-4">
          <h2 className="font-mono text-sm text-stone-300">Team names</h2>
          <p className="text-xs text-stone-500">
            Shown on the home team picker and in the header while playing. Use{' '}
            <span className="text-stone-400">Save to players</span> to sync.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEAMS.map((t) => (
              <div key={t} className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-stone-500" htmlFor={`admin-team-name-${t}`}>
                  {t}
                </label>
                <input
                  id={`admin-team-name-${t}`}
                  type="text"
                  maxLength={80}
                  className="rounded border border-slate-600/50 bg-slate-950/80 px-3 py-2 text-stone-100"
                  value={teamLabels[t]}
                  onChange={(e) => setTeamLabel(t, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-slate-600/35 bg-slate-900/40 p-4">
            <label className="block text-sm font-medium text-stone-200">
              Accuracy tolerance: {Math.round(tolerancePx)} px
            </label>
            <input
              type="range"
              min={4}
              max={80}
              step={1}
              value={tolerancePx}
              onChange={(e) => setTolerancePx(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="text-xs text-stone-500">
              Default ~{defaultTolerance}px. Touchscreens often need 15–20+ px.
            </p>

            <div className="border-t border-slate-700/50 pt-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-stone-200">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-500 bg-slate-950 text-teal-600 focus:ring-teal-800/50"
                  checked={livePollEnabled}
                  onChange={(e) => setLivePollEnabled(e.target.checked)}
                />
                Background live sync
              </label>
              <p className="mt-2 text-xs text-stone-500">
                <span className="text-stone-400">Off (default):</span> no repeated server requests while the page stays
                open. Everyone loads the game from the server when they open the app or <strong>refresh the tab</strong>.{' '}
                <span className="text-stone-400">On:</span> team devices recheck the server on the interval below (uses
                API quota). Use <span className="text-stone-400">Save to players</span> to publish settings.
              </p>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <label className="block text-sm font-medium text-stone-200" htmlFor="player-poll-sec">
                Poll interval (when background sync is on): {Math.round(playerPollIntervalMs / 1000)}s
              </label>
              <p className="mb-2 text-xs text-stone-500">
                How often team devices request updates from the server (longer = fewer API calls, slower updates). Use{' '}
                <span className="text-stone-400">Save to players</span> to apply on all devices. Default {defaultPlayerPollMs / 1000}s.
              </p>
              <input
                id="player-poll-sec"
                type="range"
                min={MIN_MS / 1000}
                max={MAX_MS / 1000}
                step={1}
                value={playerPollIntervalMs / 1000}
                onChange={(e) => setPlayerPollIntervalMs(Number(e.target.value) * 1000)}
                disabled={!livePollEnabled}
                className="w-full accent-teal-600 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              />
              <p className="mt-1 text-xs text-stone-600">
                {MIN_MS / 1000}s–{MAX_MS / 1000}s
              </p>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <label className="block text-sm font-medium text-stone-200" htmlFor="default-tries">
                Default attempts per waypoint
              </label>
              <p className="mb-2 text-xs text-stone-500">
                Starting guess budget for each point (new games, &quot;Reset all progress&quot;, and &quot;Clear trials&quot;).
                Teams already playing keep their current limits until you clear a point or reset.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="default-tries"
                  type="number"
                  min={minGuesses}
                  max={maxGuessesCap}
                  step={1}
                  className="w-24 rounded border border-slate-600/50 bg-slate-950/80 px-3 py-2 text-stone-100"
                  value={defaultMaxGuesses}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isFinite(v)) return
                    setDefaultTries(v)
                  }}
                />
                <span className="text-xs text-stone-500">
                  Range {minGuesses}–{maxGuessesCap}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-600/35 bg-slate-900/40 p-4">
            <p className="text-sm text-stone-400">Active team (trials for current point)</p>
            <select
              className="w-full rounded border border-slate-600/50 bg-slate-950/80 px-3 py-2 text-stone-100"
              value={adminTeam}
              onChange={(e) => {
                setAdminTeam(e.target.value as TeamId)
                setWaypointToSet(0)
              }}
            >
              {TEAMS.map((t) => {
                const idx = state.teams[t].currentPointIndex
                return (
                  <option key={t} value={t}>
                    {teamLabels[t]} — point {idx >= 4 ? 'done' : idx + 1}/4
                  </option>
                )
              })}
            </select>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={increaseTrials}
                disabled={curIdx >= 4}
                className="min-h-[2.75rem] flex-1 rounded-lg border border-teal-800/45 bg-teal-950/30 px-3 py-2.5 text-sm font-medium text-stone-100 hover:bg-teal-950/50 disabled:opacity-40"
              >
                +1 attempt
              </button>
              <button
                type="button"
                onClick={clearTrialsForCurrentPoint}
                disabled={curIdx >= 4}
                className="min-h-[2.75rem] flex-1 rounded-lg border-2 border-slate-500/60 bg-slate-800/60 px-3 py-2.5 text-sm font-semibold text-stone-100 shadow-sm hover:border-rose-700/50 hover:bg-slate-800 disabled:opacity-40"
              >
                Clear trials
              </button>
            </div>
            <p className="text-xs text-stone-500">
              <span className="text-stone-400">+1</span> adds a guess.{' '}
              <span className="text-stone-400">Clear trials</span> resets this point to {defaultMaxGuesses} attempts, no
              markers, no extra +1s.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Reset all teams?')) return
                flushSync(() => {
                  resetAllTeams()
                })
                if (apiActive) {
                  setSaving(true)
                  setSaveHint(null)
                  const r = await saveToRemote({ adminOverride: true })
                  setSaving(false)
                  if (r.ok) {
                    setSaveHint('Progress reset and pushed to all devices.')
                  } else {
                    setSaveHint('Local progress was reset, but the server could not be updated. Use Save to players.')
                  }
                } else {
                  setSaveHint('Progress reset on this device only — add Redis in Vercel to sync the reset to players.')
                }
              }}
              className="w-full text-xs text-rose-400/85 hover:text-rose-300 hover:underline"
            >
              Reset all progress
            </button>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-600/35 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-mono text-sm text-stone-300">Place target waypoints on the map</h2>
              <p className="mt-1 text-xs text-stone-500">
                Team <span className="text-stone-400">{teamLabels[adminTeam]}</span>. Pick a waypoint, then{' '}
                <span className="text-stone-400">click the map</span> to set it. The teal ring shows the current hit radius
                (same as the accuracy tolerance slider above).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Reset waypoints for ${teamLabels[adminTeam]} to values from the app code?`)) {
                    resetTeamTargetsToCodeDefaults(adminTeam)
                  }
                }}
                className="rounded-lg border border-slate-600/50 bg-slate-950/60 px-3 py-1.5 text-xs text-stone-300 hover:bg-slate-800"
              >
                Reset this team
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Reset ALL teams’ waypoints to the defaults from code? This does not change game progress (found points, guesses).'
                    )
                  ) {
                    resetAllTargetsToCodeDefaults()
                  }
                }}
                className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-1.5 text-xs text-rose-200/90 hover:bg-rose-950/35"
              >
                Reset all teams
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Select waypoint to place">
            {([0, 1, 2, 3] as const).map((wi) => (
              <button
                key={wi}
                type="button"
                role="tab"
                aria-selected={waypointToSet === wi}
                onClick={() => setWaypointToSet(wi)}
                className={
                  waypointToSet === wi
                    ? 'rounded-lg border-2 border-teal-500/60 bg-teal-950/40 px-3 py-2 text-sm font-medium text-stone-100'
                    : 'rounded-lg border border-slate-600/50 bg-slate-950/50 px-3 py-2 text-sm text-stone-400 hover:border-slate-500 hover:text-stone-200'
                }
              >
                Waypoint {wi + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAllWaypoints((v) => !v)}
              className={
                showAllWaypoints
                  ? 'ml-auto rounded-lg border-2 border-amber-500/50 bg-amber-950/30 px-3 py-2 text-sm font-medium text-amber-100'
                  : 'ml-auto rounded-lg border border-slate-500/50 bg-slate-800/50 px-3 py-2 text-sm text-stone-300 hover:bg-slate-800'
              }
            >
              {showAllWaypoints ? 'Hide all 4' : 'Full view: all 4 points'}
            </button>
          </div>

          <p className="text-sm text-stone-400">
            Setting <span className="text-teal-300/90">waypoint {waypointToSet + 1} of 4</span> — click the map. Console log:{' '}
            <label className="inline-flex items-center gap-1.5 text-stone-500">
              <input
                type="checkbox"
                checked={helper}
                onChange={(e) => setHelper(e.target.checked)}
                className="rounded border-slate-600 text-teal-700"
              />
              <span className="text-xs">% coords to DevTools (F12)</span>
            </label>
          </p>

          {showAllWaypoints && (
            <p className="text-xs text-amber-200/80">
              1–4: teal, amber, violet, rose. The selected tab has a slightly stronger hit ring. Clicks still move the
              selected waypoint.
            </p>
          )}

          <ScoutMap
            currentTarget={targets[adminTeam][waypointToSet]!}
            guesses={[]}
            onGuess={() => {}}
            disabled={false}
            showTarget
            showAllTargets={showAllWaypoints}
            allTargets={targets[adminTeam]}
            activeTargetIndex={waypointToSet}
            showAccuracyCircle
            accuracyRadiusPx={tolerancePx}
            placeTargetMode
            onPlaceTarget={(pct) => {
              setOneWaypoint(adminTeam, waypointToSet, {
                x: Math.min(100, Math.max(0, pct.x)),
                y: Math.min(100, Math.max(0, pct.y)),
              })
            }}
            coordinateHelper={helper}
          />

          <details className="group rounded-lg border border-slate-700/50 bg-slate-950/30 p-3">
            <summary className="cursor-pointer list-none text-xs font-medium text-stone-500 marker:content-none [&::-webkit-details-marker]:hidden group-open:text-stone-400">
              Optional: fine-tune with numbers (% 0–100)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([0, 1, 2, 3] as const).map((wi) => {
                const pt = targets[adminTeam][wi]!
                return (
                  <div
                    key={wi}
                    className="flex flex-col gap-2 rounded-lg border border-slate-700/40 bg-slate-950/40 p-3"
                  >
                    <p className="text-xs font-medium text-stone-400">Waypoint {wi + 1}</p>
                    <div className="flex items-center gap-2">
                      <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-stone-500">
                        X
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          className="min-w-0 flex-1 rounded border border-slate-600/50 bg-slate-950/80 px-2 py-1.5 text-sm text-stone-100"
                          value={pt.x}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            if (!Number.isFinite(v)) return
                            setOneWaypoint(adminTeam, wi, {
                              x: Math.min(100, Math.max(0, v)),
                              y: pt.y,
                            })
                          }}
                        />
                      </label>
                      <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-stone-500">
                        Y
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          className="min-w-0 flex-1 rounded border border-slate-600/50 bg-slate-950/80 px-2 py-1.5 text-sm text-stone-100"
                          value={pt.y}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value)
                            if (!Number.isFinite(v)) return
                            setOneWaypoint(adminTeam, wi, {
                              x: pt.x,
                              y: Math.min(100, Math.max(0, v)),
                            })
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </section>
      </div>
    </div>
  )
}

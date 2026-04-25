import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TEAM_LABELS, isTeamId } from '../config/mapConfig'
import { useMapTargets } from '../hooks/useMapTargetsContext'
import { useGame } from '../hooks/useGameContext'
import { ScoutMap } from '../components/ScoutMap'
import { useTolerancePx } from '../hooks/useToleranceSync'
import { guessProgressLabels } from '../lib/gameState'
import type { TeamGameState } from '../lib/gameState'
import { useRemoteSyncActions } from '../context/RemoteSyncActionsContext'

function TeamSelect() {
  return (
    <div className="w-full">
      <div className="mx-auto max-w-md px-5 pb-16 pt-16 sm:px-8 sm:pt-20">
        <header className="mb-10 border-b border-slate-700/50 pb-8 text-center">
          <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-500/85">
            ScoutMap
          </p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">
            Choose your team
          </h1>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-stone-400 sm:text-base">
            Use your team link, or open a team below. Example in the address bar:{' '}
            <code className="whitespace-nowrap rounded-md border border-slate-600/50 bg-slate-950/80 px-2 py-0.5 text-[0.8rem] text-teal-200/90">
              ?team=team1
            </code>
          </p>
        </header>

        <ul className="space-y-3">
          {(['team1', 'team2', 'team3', 'team4'] as const).map((t) => (
            <li key={t}>
              <a
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-600/35 bg-slate-900/40 px-5 py-4 font-medium text-stone-100 transition hover:border-teal-800/40 hover:bg-slate-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500/40 sm:py-4"
                href={`/?team=${t}`}
              >
                <span className="text-lg text-stone-100">{TEAM_LABELS[t]}</span>
                <span className="rounded-md border border-slate-700/50 bg-slate-950/50 px-2.5 py-1 font-mono text-xs text-stone-500 group-hover:text-stone-400">
                  {t}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-center text-sm text-stone-500">
          <a
            href="/admin"
            className="text-teal-400/85 hover:text-teal-300 hover:underline"
          >
            Organizer sign-in
          </a>
        </p>
      </div>
    </div>
  )
}

export function TeamGamePage() {
  const [params] = useSearchParams()
  const team = params.get('team')
  const { state, updateTeam } = useGame()
  const { targets } = useMapTargets()
  const { tolerancePx } = useTolerancePx()
  const { saveToRemote } = useRemoteSyncActions()
  const [showCongrats, setShowCongrats] = useState(false)
  const [waypointFound, setWaypointFound] = useState(1 as 1 | 2 | 3 | 4)

  const teamId = isTeamId(team) ? team : null
  const teamState = teamId ? state.teams[teamId] : null
  const idx = teamState?.currentPointIndex ?? 0
  const target = teamId && teamState && idx < 4 ? targets[teamId][idx]! : { x: 0, y: 0 }
  const point = teamId && teamState && idx < 4 ? teamState.points[idx] : null
  const won = teamId && teamState ? teamState.currentPointIndex >= 4 : false
  const outOfGuesses = point ? point.attempts >= point.maxGuesses : false
  const canGuess = Boolean(
    point && !outOfGuesses && !won && !showCongrats
  )

  const foundPins = useMemo(() => {
    if (!teamId || !teamState) return []
    const pins: { x: number; y: number; num: number }[] = []
    for (let i = 0; i < 4; i++) {
      if (!teamState.foundMask[i]) continue
      const p = teamState.points[i]!
      const t = targets[teamId][i]!
      const at = p.foundAt ?? t
      pins.push({ x: at.x, y: at.y, num: i + 1 })
    }
    return pins
  }, [teamId, teamState, targets])

  const lastTryFeedback = useMemo(() => {
    if (!point || point.guesses.length === 0) return null
    const g = point.guesses
    const labels = guessProgressLabels(g)
    const i = g.length - 1
    return { distancePx: g[i]!.distancePx, label: labels[i]! }
  }, [point])

  const onGuess = (pct: { x: number; y: number }, dist: number) => {
    if (!teamId || !teamState || !point || idx > 3) return
    if (dist <= tolerancePx) {
      const foundN = (idx + 1) as 1 | 2 | 3 | 4
      updateTeam(teamId, (t) => {
        const p = t.points.map((c) => ({ ...c })) as TeamGameState['points']
        p[idx] = {
          ...p[idx]!,
          foundAt: { x: pct.x, y: pct.y },
          guesses: [],
          attempts: p[idx]!.attempts,
          maxGuesses: p[idx]!.maxGuesses,
        }
        const found = [...t.foundMask] as [boolean, boolean, boolean, boolean]
        found[idx] = true
        return {
          ...t,
          currentPointIndex: t.currentPointIndex + 1,
          points: p,
          foundMask: found,
        }
      })
      setWaypointFound(foundN)
      setShowCongrats(true)
      setTimeout(() => {
        void saveToRemote()
      }, 0)
      return
    }
    updateTeam(teamId, (t) => {
      const p = t.points.map((c) => ({ ...c })) as TeamGameState['points']
      const nextGuesses = [...p[idx]!.guesses, { x: pct.x, y: pct.y, distancePx: dist }]
      p[idx] = {
        ...p[idx]!,
        attempts: p[idx]!.attempts + 1,
        guesses: nextGuesses,
      }
      return { ...t, points: p }
    })
  }

  if (!teamId) return <TeamSelect />

  const name = TEAM_LABELS[teamId]
  return (
    <div className="w-full">
      <div className="mx-auto max-w-4xl px-3 pb-8 pt-6">
        <header className="mb-6 border-b border-slate-700/50 pb-4">
          <h1 className="font-mono text-xl font-semibold text-stone-100">Team: {name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-stone-400">
            <span>
              Target:{' '}
              <span className="text-teal-300/90">{won ? '4' : Math.min(4, idx + 1)} of 4</span>
            </span>
            {!won && point && (
              <span>
                Guesses left:{' '}
                <span className="font-mono text-stone-200">
                  {Math.max(0, point.maxGuesses - point.attempts)}
                </span>
              </span>
            )}
          </div>
        </header>

        {showCongrats && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="congrats-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-teal-700/40 bg-slate-900/98 p-8 text-center shadow-2xl shadow-slate-950/60">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-teal-400/90">
                Nice shot
              </p>
              <h2
                id="congrats-title"
                className="text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl"
              >
                {waypointFound < 4 ? 'Congratulations!' : 'Mission complete!'}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-stone-400 sm:text-base">
                {waypointFound < 4 ? (
                  <>
                    You found <span className="text-teal-300/90">waypoint {waypointFound} of 4</span>. Keep going for the
                    next one.
                  </>
                ) : (
                  <>
                    {name} found the final mark. <span className="text-stone-300">All 4 waypoints are in the log.</span>{' '}
                    Report to base.
                  </>
                )}
              </p>
              <button
                type="button"
                className="mt-8 w-full rounded-xl bg-teal-800/90 py-3 text-sm font-semibold text-stone-100 transition hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500/50"
                onClick={() => setShowCongrats(false)}
                autoFocus
              >
                {waypointFound < 4 ? 'Continue' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {won && !showCongrats && (
          <div className="mb-4 rounded-xl border border-teal-800/30 bg-slate-900/50 px-4 py-3 text-center sm:text-left">
            <p className="text-sm text-stone-300">
              <span className="font-mono text-teal-400/90">Mission complete</span> — {name} has found all 4 waypoints. Report
              to base.
            </p>
          </div>
        )}

        {outOfGuesses && !won && (
          <div className="mb-4 rounded-lg border border-rose-800/40 bg-rose-950/25 px-4 py-3 text-sm text-rose-100/90">
            No guesses left for this point. <strong className="text-rose-50/95">Contact the organizer</strong> for more trials.
          </div>
        )}

        {lastTryFeedback && !won && (
          <p className="mb-3 rounded-lg border border-slate-600/30 bg-slate-900/40 px-4 py-3 text-sm text-stone-300">
            <span className="text-stone-500">
              {lastTryFeedback.distancePx.toFixed(0)} px —{' '}
            </span>
            <span
              className={
                lastTryFeedback.label.includes('Nearer')
                  ? 'text-emerald-300/90'
                  : lastTryFeedback.label.includes('Farther')
                    ? 'text-amber-300/85'
                    : lastTryFeedback.label.includes('Same')
                      ? 'text-slate-400'
                      : 'text-stone-200'
              }
            >
              {lastTryFeedback.label}
            </span>
          </p>
        )}

        <ScoutMap
          currentTarget={target}
          guesses={point?.guesses ?? []}
          onGuess={onGuess}
          disabled={!canGuess}
          showTarget={false}
          foundPins={foundPins}
        />
      </div>
    </div>
  )
}

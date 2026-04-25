import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { MAP_CONFIG } from '../config/mapConfig'
import type { MapPoint } from '../config/mapConfig'
import { colorScaleMaxPx, distancePx, farToCloseT, lerpColorFarToClose } from '../lib/gameState'
import type { GuessRecord } from '../lib/gameState'

type ScoutMapProps = {
  currentTarget: MapPoint
  guesses: GuessRecord[]
  onGuess: (pct: { x: number; y: number }, distancePx: number) => void
  disabled: boolean
  /** Log clicks to console (admin coordinate helper) */
  coordinateHelper?: boolean
  /** If true, show target crosshair (admin preview only — keep false for teams) */
  showTarget?: boolean
  /** If true, draw a pixel-perfect circle = hit radius (tolerance) around the target (organizer) */
  showAccuracyCircle?: boolean
  /** Hit radius in screen pixels; same as game tolerance. Used with `showAccuracyCircle`. */
  accuracyRadiusPx?: number
  /** Clicks set target position in %; used instead of a guess (organizer) */
  placeTargetMode?: boolean
  onPlaceTarget?: (pct: { x: number; y: number }) => void
  /** Organizer: show every waypoint for the team with labels (uses `allTargets`) */
  showAllTargets?: boolean
  allTargets?: [MapPoint, MapPoint, MapPoint, MapPoint]
  /** Which one is the active tab (slightly stronger ring/crosshair) */
  activeTargetIndex?: 0 | 1 | 2 | 3
  /** Completed waypoints (player view): show sticky pins 1..4 */
  foundPins?: { x: number; y: number; num: number }[]
}

export function ScoutMap({
  currentTarget,
  guesses,
  onGuess,
  disabled,
  coordinateHelper = false,
  showTarget = false,
  showAccuracyCircle = false,
  accuracyRadiusPx = 18,
  placeTargetMode = false,
  onPlaceTarget,
  showAllTargets = false,
  allTargets,
  activeTargetIndex = 0,
  foundPins,
}: ScoutMapProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [box, setBox] = useState({ w: 1, h: 1 })

  const updateBox = useCallback(() => {
    const el = imgRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setBox({ w: r.width, h: r.height })
  }, [])

  useLayoutEffect(() => {
    updateBox()
    const ro = new ResizeObserver(() => updateBox())
    if (imgRef.current) ro.observe(imgRef.current)
    window.addEventListener('resize', updateBox)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateBox)
    }
  }, [updateBox])

  const heatMaxPx = colorScaleMaxPx(box.w, box.h)
  const lineW = 0.6
  const markR = 0.95
  const markStroke = 0.14
  const targetStrokeW = 0.16

  const guessList = Array.isArray(guesses) ? guesses : []
  const allTargetsSafe =
    Array.isArray(allTargets) && allTargets.length === 4 ? allTargets : null

  const onPointer = useCallback(
    (e: React.MouseEvent) => {
      const el = imgRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * 100
      const y = ((e.clientY - r.top) / r.height) * 100
      if (x < 0 || x > 100 || y < 0 || y > 100) return

      if (coordinateHelper) {
        console.log('[ScoutMap] click %', { x: +x.toFixed(2), y: +y.toFixed(2) })
      }
      if (placeTargetMode && onPlaceTarget) {
        onPlaceTarget({ x, y })
        return
      }
      if (disabled) return

      const dist = distancePx({ x, y }, currentTarget, r.width, r.height)
      onGuess({ x, y }, dist)
    },
    [disabled, currentTarget, onGuess, coordinateHelper, placeTargetMode, onPlaceTarget]
  )

  const rPx = Math.max(1, Math.min(500, accuracyRadiusPx))
  const dPx = 2 * rPx
  const fourColors = [
    'rgb(45, 212, 191)', // teal-400
    'rgb(251, 191, 36)', // amber-400
    'rgb(167, 139, 250)', // violet-400
    'rgb(251, 113, 133)', // rose-400
  ] as const

  return (
    <div className="relative mx-auto w-full max-w-4xl select-none">
      <div className="relative w-full">
        <img
          ref={imgRef}
          src={MAP_CONFIG.mapSrc}
          width={MAP_CONFIG.mapNaturalWidth}
          height={MAP_CONFIG.mapNaturalHeight}
          alt="Scout map"
          className="block h-auto w-full cursor-crosshair rounded-lg border border-slate-600/35 shadow-lg shadow-slate-950/40"
          style={(() => {
            const f = (MAP_CONFIG as { mapImageFilter?: string }).mapImageFilter
            return f ? { filter: f as string } : undefined
          })()}
          draggable={false}
        />
        {showTarget && showAllTargets && allTargetsSafe && showAccuracyCircle
          ? allTargetsSafe.map((p, i) => {
              const isActive = i === activeTargetIndex
              return (
                <div
                  key={i}
                  className={
                    isActive
                      ? 'pointer-events-none absolute z-[5] rounded-full border-2 border-teal-300/70 bg-teal-400/15 shadow-[0_0_0_1px_rgba(15,23,42,0.5)]'
                      : 'pointer-events-none absolute z-[5] rounded-full border-2 border-teal-500/30 bg-teal-400/5'
                  }
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: dPx,
                    height: dPx,
                    marginLeft: -rPx,
                    marginTop: -rPx,
                  }}
                  aria-hidden
                />
              )
            })
          : null}
        {showTarget && !showAllTargets && showAccuracyCircle && (
          <div
            className="pointer-events-none absolute z-[5] rounded-full border-2 border-teal-400/50 bg-teal-400/10 shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
            style={{
              left: `${currentTarget.x}%`,
              top: `${currentTarget.y}%`,
              width: dPx,
              height: dPx,
              marginLeft: -rPx,
              marginTop: -rPx,
            }}
            aria-hidden
          />
        )}
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {showTarget && showAllTargets && allTargetsSafe
            ? allTargetsSafe.map((p, i) => {
                const c = fourColors[i]!
                const w = i === activeTargetIndex ? targetStrokeW * 1.35 : targetStrokeW
                const s = 1.2
                return (
                  <g key={i}>
                    <line
                      x1={p.x - s}
                      y1={p.y}
                      x2={p.x + s}
                      y2={p.y}
                      stroke={c}
                      strokeWidth={w}
                      opacity={0.95}
                      strokeLinecap="round"
                    />
                    <line
                      x1={p.x}
                      y1={p.y - s}
                      x2={p.x}
                      y2={p.y + s}
                      stroke={c}
                      strokeWidth={w}
                      opacity={0.95}
                      strokeLinecap="round"
                    />
                    <text
                      x={p.x + 1.6}
                      y={p.y - 1.1}
                      fill="rgb(255, 255, 255)"
                      stroke="rgb(2, 6, 23)"
                      strokeWidth={0.18}
                      paintOrder="stroke fill"
                      fontSize={2.1}
                      fontWeight="600"
                      fontFamily="ui-monospace, monospace"
                    >
                      {i + 1}
                    </text>
                  </g>
                )
              })
            : null}
          {showTarget && !showAllTargets && (
            <g>
              <line
                x1={currentTarget.x - 1.2}
                y1={currentTarget.y}
                x2={currentTarget.x + 1.2}
                y2={currentTarget.y}
                stroke="rgb(130, 168, 140)"
                strokeWidth={targetStrokeW}
                opacity={0.9}
                strokeLinecap="round"
              />
              <line
                x1={currentTarget.x}
                y1={currentTarget.y - 1.2}
                x2={currentTarget.x}
                y2={currentTarget.y + 1.2}
                stroke="rgb(130, 168, 140)"
                strokeWidth={targetStrokeW}
                opacity={0.9}
                strokeLinecap="round"
              />
            </g>
          )}

          {guessList.map((g, i) => {
            if (i === 0) {
              const t = farToCloseT(g.distancePx, heatMaxPx)
              const c = lerpColorFarToClose(t)
              return (
                <circle
                  key={i}
                  cx={g.x}
                  cy={g.y}
                  r={markR}
                  fill={c}
                  stroke="rgba(2, 6, 23, 0.35)"
                  strokeWidth={markStroke}
                />
              )
            }
            const prev = guessList[i - 1]!
            const t = farToCloseT(g.distancePx, heatMaxPx)
            const c = lerpColorFarToClose(t)
            return (
              <g key={i}>
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={g.x}
                  y2={g.y}
                  stroke="rgba(2, 6, 23, 0.28)"
                  strokeWidth={lineW + 0.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={g.x}
                  y2={g.y}
                  stroke={c}
                  strokeWidth={lineW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx={g.x}
                  cy={g.y}
                  r={markR}
                  fill={c}
                  stroke="rgba(2, 6, 23, 0.35)"
                  strokeWidth={markStroke}
                />
              </g>
            )
          })}

          {foundPins && foundPins.length > 0
            ? foundPins.map((pin) => (
                <g key={pin.num}>
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={1.15}
                    fill="rgb(5, 46, 22)"
                    stroke="rgb(52, 211, 153)"
                    strokeWidth={0.2}
                    opacity={0.95}
                  />
                  <text
                    x={pin.x}
                    y={pin.y + 0.55}
                    textAnchor="middle"
                    fill="rgb(204, 251, 241)"
                    fontSize={1.1}
                    fontWeight="700"
                    fontFamily="ui-monospace, system-ui, sans-serif"
                  >
                    {pin.num}
                  </text>
                </g>
              ))
            : null}
        </svg>
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-crosshair bg-transparent"
          onClick={onPointer}
          disabled={disabled && !coordinateHelper && !placeTargetMode}
          aria-label={placeTargetMode ? 'Set target on map' : 'Place guess on map'}
        />
      </div>
    </div>
  )
}

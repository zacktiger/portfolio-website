import { useRef, useEffect, useCallback, useState } from 'react'

// ═══════════════════════════════════════════════════════════
//  "After hours" — the portfolio at night.
//  Same true-black world, same single cyan accent (#00d4ff),
//  just lit up in synthwave. Cyan is the hero; magenta/violet
//  are demoted to supporting glow so it reads as this site.
// ═══════════════════════════════════════════════════════════

const ACCENT = '#00d4ff'                 // site accent — the through-line
const OBSTACLE_COLORS = ['#c05cff', '#ff5ca8', '#8a6cff'] // demoted violet/magenta

// Shared road model. Lane u ∈ [0,1] across the drivable road; `persp` is the
// perspective factor at a given depth (0 at the horizon, 1 at the near plane).
// Player and obstacles BOTH map through this, so collision can be tested in
// lane space and everything lines up visually. LANE_MIN/MAX bound both, so
// there is no empty edge to hide in.
const LANE_MIN = 0.12
const LANE_MAX = 0.88
const roadX = (w, u, persp) => w * 0.5 + (u - 0.5) * w * 0.9 * persp

function drawCar(ctx, x, y, w, h) {
    ctx.save()
    ctx.shadowColor = 'rgba(0,212,255,0.7)'
    ctx.shadowBlur = 20

    // Body bottom
    ctx.fillStyle = ACCENT
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y)
    ctx.lineTo(x + w / 2, y)
    ctx.lineTo(x + w / 2 - 4, y - h * 0.45)
    ctx.lineTo(x - w / 2 + 4, y - h * 0.45)
    ctx.closePath()
    ctx.fill()

    // Cabin
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + 8, y - h * 0.45)
    ctx.lineTo(x + w / 2 - 8, y - h * 0.45)
    ctx.lineTo(x + w / 2 - 14, y - h * 0.82)
    ctx.lineTo(x - w / 2 + 14, y - h * 0.82)
    ctx.closePath()
    ctx.fill()

    // Roof
    ctx.fillStyle = ACCENT
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + 14, y - h * 0.82)
    ctx.lineTo(x + w / 2 - 14, y - h * 0.82)
    ctx.lineTo(x + w / 2 - 16, y - h)
    ctx.lineTo(x - w / 2 + 16, y - h)
    ctx.closePath()
    ctx.fill()

    // Tail lights (a whisper of magenta, the demoted accent)
    ctx.shadowBlur = 12
    ctx.shadowColor = '#ff2ea6'
    ctx.fillStyle = '#ff2ea6'
    ctx.fillRect(x - w / 2 + 1, y - 6, 5, 3)
    ctx.fillRect(x + w / 2 - 6, y - 6, 5, 3)

    // Headlights
    ctx.shadowColor = '#eafcff'
    ctx.fillStyle = '#eafcff'
    ctx.fillRect(x - w / 2 + 2, y - h * 0.42, 4, 2)
    ctx.fillRect(x + w / 2 - 6, y - h * 0.42, 4, 2)

    ctx.restore()
}

function drawObstacleCar(ctx, x, y, w, h, color, danger) {
    ctx.save()
    ctx.shadowColor = danger ? '#ff2ea6' : color
    ctx.shadowBlur = danger ? 16 : 10
    ctx.fillStyle = danger ? '#ff5c7a' : color
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y)
    ctx.lineTo(x + w / 2, y)
    ctx.lineTo(x + w / 2 - 3, y - h * 0.5)
    ctx.lineTo(x - w / 2 + 3, y - h * 0.5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + 5, y - h * 0.5)
    ctx.lineTo(x + w / 2 - 5, y - h * 0.5)
    ctx.lineTo(x + w / 2 - 9, y - h * 0.85)
    ctx.lineTo(x - w / 2 + 9, y - h * 0.85)
    ctx.closePath()
    ctx.fill()

    ctx.shadowBlur = 8
    ctx.shadowColor = '#ff2ea6'
    ctx.fillStyle = '#ff2ea6'
    ctx.fillRect(x - w / 2 + 1, y - 4, 4, 2)
    ctx.fillRect(x + w / 2 - 5, y - 4, 4, 2)
    ctx.restore()
}

function randomObstacleColor() {
    return OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)]
}

const randomLane = () => Math.random() * (LANE_MAX - LANE_MIN) + LANE_MIN

export default function RetroCarGame({ onPlayStart, onGameStateChange }) {
    const canvasRef = useRef(null)
    // 'intro' | 'running' | 'paused' | 'over' — mirrored into phaseRef so the
    // single game loop can read it without being torn down on every change.
    const [phase, setPhase] = useState('intro')
    const [distance, setDistance] = useState(0)
    const phaseRef = useRef('intro')
    const keysRef = useRef({ left: false, right: false })
    const cbRef = useRef({ onPlayStart, onGameStateChange })
    cbRef.current = { onPlayStart, onGameStateChange }

    const gameRef = useRef({
        carX: 0.5,
        speed: 2,
        roadOffset: 0,
        distance: 0,
        hudTick: 0,
        crashed: false,
        obstacles: [],
        stars: [],
        buildings: [],
        initialized: false,
    })

    const go = useCallback((p) => {
        phaseRef.current = p
        setPhase(p)
        cbRef.current.onGameStateChange?.(p === 'running')
    }, [])

    const resetObstacles = useCallback((g) => {
        // stagger obstacles behind the horizon so the run always starts clear and
        // they arrive one at a time (always dodgeable). Three keeps comfortable
        // gaps between cars while still covering the full width.
        g.obstacles = Array.from({ length: 3 }, (_, i) => ({
            lane: randomLane(),
            z: -0.3 - i * 0.5,
            color: randomObstacleColor(),
        }))
    }, [])

    const resetGame = useCallback(() => {
        const g = gameRef.current
        g.carX = 0.5
        g.speed = 2
        g.roadOffset = 0
        g.distance = 0
        g.hudTick = 0
        g.crashed = false
        resetObstacles(g)
        keysRef.current.left = false
        keysRef.current.right = false
        setDistance(0)
    }, [resetObstacles])

    const startGame = useCallback(() => {
        cbRef.current.onPlayStart?.()
        go('running')
    }, [go])

    const restart = useCallback(() => {
        resetGame()
        go('running')
    }, [resetGame, go])

    const togglePause = useCallback(() => {
        go(phaseRef.current === 'running' ? 'paused' : 'running')
    }, [go])

    const initScene = useCallback(() => {
        const g = gameRef.current
        if (g.initialized) return
        g.stars = Array.from({ length: 80 }, () => ({
            x: Math.random(),
            y: Math.random() * 0.45,
            size: Math.random() * 1.8 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
        }))
        g.buildings = []
        for (let i = 0; i < 8; i++) {
            g.buildings.push({ x: Math.random() * 0.2, w: Math.random() * 0.06 + 0.03, h: Math.random() * 0.15 + 0.08, side: 'left', windows: Math.floor(Math.random() * 3) + 2 })
            g.buildings.push({ x: 0.8 + Math.random() * 0.2, w: Math.random() * 0.06 + 0.03, h: Math.random() * 0.15 + 0.08, side: 'right', windows: Math.floor(Math.random() * 3) + 2 })
        }
        resetObstacles(g)
        g.initialized = true
    }, [resetObstacles])

    // ── Single mount-once loop. All the run/pause/over branching reads phaseRef,
    //    so the effect (and its window listeners) is created exactly once. ──
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animId = null

        const endGame = () => {
            const g = gameRef.current
            if (g.crashed) return
            g.crashed = true
            setDistance(Math.floor(g.distance))
            go('over')
        }

        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                if (phaseRef.current === 'running' || phaseRef.current === 'paused') {
                    e.preventDefault()
                    togglePause()
                }
                return
            }
            // Keep arrow keys from scrolling the page behind the modal
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()
            if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = true
            if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = true
        }
        const handleKeyUp = (e) => {
            if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = false
            if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = false
        }
        const handleTouch = (e) => {
            if (phaseRef.current !== 'running') return
            const rect = canvas.getBoundingClientRect()
            const x = e.touches[0].clientX - rect.left
            if (x < rect.width / 2) { keysRef.current.left = true; keysRef.current.right = false }
            else { keysRef.current.right = true; keysRef.current.left = false }
        }
        const handleTouchEnd = () => { keysRef.current.left = false; keysRef.current.right = false }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        canvas.addEventListener('touchstart', handleTouch, { passive: true })
        canvas.addEventListener('touchend', handleTouchEnd)

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const rect = canvas.parentElement.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            // setTransform (not scale) so repeated resizes never compound the dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
        }
        resize()
        window.addEventListener('resize', resize)
        initScene()

        let lastTime = 0
        const loop = (time) => {
            const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
            lastTime = time
            const w = canvas.width / (window.devicePixelRatio || 1)
            const h = canvas.height / (window.devicePixelRatio || 1)
            const g = gameRef.current
            const running = phaseRef.current === 'running'
            const horizonY = h * 0.48
            const playerY = h - 35
            // perspective factor at the player's row — player and obstacles share it
            const perspPlayer = (playerY - horizonY) / (h - horizonY)
            const px = roadX(w, g.carX, perspPlayer)
            const playerW = 48

            if (running) {
                if (keysRef.current.left) g.carX = Math.max(LANE_MIN, g.carX - 1.2 * dt)
                if (keysRef.current.right) g.carX = Math.min(LANE_MAX, g.carX + 1.2 * dt)
                g.roadOffset = (g.roadOffset + g.speed * dt) % 1
                g.distance += g.speed * dt * 22
                // gentle speed ramp — tops out so it stays an easter egg, not a boss fight
                g.speed = Math.min(4.2, g.speed + dt * 0.05)
                g.obstacles.forEach(obs => {
                    obs.z += g.speed * dt * 0.3
                    if (obs.z > 1.15) {
                        obs.z = -0.15
                        obs.lane = randomLane()
                        obs.color = randomObstacleColor()
                    }
                })
                g.hudTick += dt
                if (g.hudTick > 0.12) {
                    g.hudTick = 0
                    setDistance(Math.floor(g.distance))
                }
            }

            ctx.clearRect(0, 0, w, h)

            // ── Sky: near-black falling into a cyan-navy horizon glow ──
            const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
            skyGrad.addColorStop(0, '#050507')
            skyGrad.addColorStop(0.55, '#080a12')
            skyGrad.addColorStop(1, '#0e2236')
            ctx.fillStyle = skyGrad
            ctx.fillRect(0, 0, w, horizonY)

            const t_sec = time * 0.001
            g.stars.forEach(s => {
                ctx.fillStyle = `rgba(220,245,255,${0.35 + 0.5 * Math.sin(t_sec * 1.5 + s.twinkle)})`
                ctx.fillRect(s.x * w, s.y * h, s.size, s.size)
            })

            // ── Sun: cyan-forward, with a whisper of violet at the base ──
            const sunX = w * 0.5, sunY = horizonY - h * 0.02, sunR = Math.min(w, h) * 0.13
            const sunBody = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR * 0.3)
            sunBody.addColorStop(0, '#c9f7ff')
            sunBody.addColorStop(0.45, ACCENT)
            sunBody.addColorStop(1, '#7a3ea8')
            ctx.save()
            ctx.shadowColor = 'rgba(0,212,255,0.5)'
            ctx.shadowBlur = 40
            ctx.fillStyle = sunBody
            ctx.beginPath(); ctx.arc(sunX, sunY, sunR, Math.PI, 0); ctx.fill()
            ctx.restore()
            // iconic scan gaps across the lower half of the sun
            ctx.fillStyle = '#080a12'
            for (let i = 1; i <= 5; i++) {
                const gy = sunY - sunR * 0.55 + i * (sunR * 0.55 / 5)
                ctx.fillRect(sunX - sunR, gy, sunR * 2, 2)
            }

            // ── City silhouettes with cyan-lit windows ──
            g.buildings.forEach(b => {
                ctx.fillStyle = '#0a0a14'
                const bx = b.x * w, bw = b.w * w, bh = b.h * h, by = horizonY - bh
                ctx.fillRect(bx, by, bw, bh + 4)
                ctx.fillStyle = 'rgba(0,212,255,0.28)'
                for (let r = 0; r < b.windows; r++) {
                    for (let c = 0; c < Math.max(2, Math.floor(bw / 8)); c++) {
                        if (Math.random() > 0.4) ctx.fillRect(bx + 3 + c * (bw - 6) / 4, by + 4 + r * (bh - 8) / b.windows, 2, 2)
                    }
                }
            })

            // ── Ground: back to true black ──
            const ground = ctx.createLinearGradient(0, horizonY, 0, h)
            ground.addColorStop(0, '#06080e'); ground.addColorStop(1, '#000000')
            ctx.fillStyle = ground
            ctx.fillRect(0, horizonY, w, h - horizonY)

            // Horizontal grid — cyan hero, a faint magenta only far away for depth
            for (let i = 0; i < 20; i++) {
                let t01 = (i / 20 + g.roadOffset / 20) % 1
                const py = horizonY + (h - horizonY) * Math.pow(t01, 1.8)
                const magenta = Math.max(0, 0.12 - t01 * 0.3)
                ctx.strokeStyle = `rgba(${Math.round(magenta * 500)},212,255,${0.1 + t01 * 0.3})`
                ctx.lineWidth = 0.5 + t01; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke()
            }
            // Perspective rails — dim cyan
            for (let i = 0; i <= 16; i++) {
                const t01 = i / 16, bx = w * 0.05 + w * 0.9 * t01
                ctx.strokeStyle = `rgba(0,212,255,${0.16 - Math.abs(t01 - 0.5) * 0.12})`
                ctx.beginPath(); ctx.moveTo(w * 0.5, horizonY); ctx.lineTo(bx, h); ctx.stroke()
            }

            // ── Obstacles + collision (collision is tested in lane space) ──
            g.obstacles.forEach(obs => {
                if (obs.z <= 0.02) return // still behind the horizon — hidden
                const pz = Math.pow(obs.z, 1.8)
                const ox = roadX(w, obs.lane, pz)
                const oy = horizonY + (h - horizonY) * pz
                const ow = 20 + pz * 30
                const atPlayerRow = oy > playerY - 40 && oy < playerY + 14
                if (oy > horizonY && oy < h - 16) drawObstacleCar(ctx, ox, oy, ow, 14 + pz * 22, obs.color, atPlayerRow && running)
                if (running && !g.crashed && atPlayerRow && Math.abs(obs.lane - g.carX) < 0.11) {
                    endGame()
                }
            })

            drawCar(ctx, px, playerY, playerW, 36)

            if (phaseRef.current !== 'over') {
                ctx.fillStyle = 'rgba(220,245,255,0.28)'
                ctx.font = '10px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'
                ctx.fillText('A / D · arrows · or tap the sides to steer', w / 2, h - 10)
            }

            animId = requestAnimationFrame(loop)
        }
        animId = requestAnimationFrame(loop)

        return () => {
            if (animId) cancelAnimationFrame(animId)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            canvas.removeEventListener('touchstart', handleTouch)
            canvas.removeEventListener('touchend', handleTouchEnd)
            window.removeEventListener('resize', resize)
        }
        // Stable callbacks only — the loop itself is intentionally created once.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [go, togglePause, initScene])

    const hudVisible = phase === 'running' || phase === 'paused'

    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0, touchAction: 'none' }} />

            {/* Distance HUD — top-left, opposite the modal's ✕ */}
            <div className={`absolute left-4 top-4 z-10 rounded-xl border border-border bg-black/40 px-4 py-2 text-sm text-text-primary backdrop-blur-md transition-opacity duration-300 ${hudVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="text-xs text-text-tertiary">Distance</div>
                <div className="font-heading text-lg font-bold text-accent">{distance}m</div>
            </div>

            {/* Pause / Resume — bottom-left, clear of the modal's ✕ (top-right) */}
            {hudVisible && (
                <button
                    onClick={togglePause}
                    className="absolute bottom-4 left-4 z-20 rounded-lg border border-border-hover bg-black/40 px-3 py-1.5 text-xs font-semibold text-text-primary backdrop-blur-md transition-colors hover:bg-black/60"
                >
                    {phase === 'running' ? 'Pause' : 'Resume'}
                </button>
            )}

            {phase === 'paused' && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <span className="font-heading text-sm uppercase tracking-[0.35em] text-text-secondary">Paused</span>
                </div>
            )}

            {phase === 'intro' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                    <div className="w-full max-w-xs rounded-xl border border-border-hover bg-black/50 p-5 text-center backdrop-blur-lg">
                        <h3 className="font-heading text-lg font-semibold text-text-primary">Neon Rider</h3>
                        <p className="mt-1.5 text-xs text-text-secondary">The portfolio, after hours. Steer to survive the highway.</p>
                        <button onClick={startGame} className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg transition-transform hover:scale-105">▶ Play</button>
                    </div>
                </div>
            )}

            {phase === 'over' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                    <div className="w-full max-w-xs rounded-xl border border-border-hover bg-black/60 p-5 text-center backdrop-blur-lg">
                        <p className="font-heading text-xs uppercase tracking-[0.2em] text-text-tertiary">Nice run</p>
                        <p className="mt-2 font-heading text-4xl font-bold text-accent">{distance}<span className="text-lg text-text-secondary">m</span></p>
                        <button onClick={restart} className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg transition-transform hover:scale-105">↻ Retry</button>
                        <p className="mt-3 text-[11px] text-text-tertiary">Now go read the boring stuff — hit <span className="text-text-secondary">Esc</span>.</p>
                    </div>
                </div>
            )}
        </>
    )
}

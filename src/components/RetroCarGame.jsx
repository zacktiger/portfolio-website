import { useRef, useEffect, useCallback, useState } from 'react'

// ═══════════════════════════════════════════════════════════
//  "After hours" — the portfolio at night.
//  Same true-black world, same single cyan accent (#00d4ff),
//  just lit up in synthwave. Cyan is the hero; magenta/violet
//  are demoted to supporting glow so it reads as this site.
// ═══════════════════════════════════════════════════════════

const ACCENT = '#00d4ff'                 // site accent — the through-line
const OBSTACLE_COLORS = ['#c05cff', '#ff5ca8', '#8a6cff'] // demoted violet/magenta

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

export default function RetroCarGame({ onPlayStart, onGameStateChange }) {
    const canvasRef = useRef(null)
    const [isGameRunning, setIsGameRunning] = useState(false)
    const [isIntroVisible, setIsIntroVisible] = useState(true)
    const [isIntroFading, setIsIntroFading] = useState(false)
    const [isGameOver, setIsGameOver] = useState(false)
    const [distance, setDistance] = useState(0)
    const keysRef = useRef({ left: false, right: false })
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

    const handlePlay = () => {
        onPlayStart?.()
        onGameStateChange?.(true)
        setIsIntroFading(true)
        setTimeout(() => {
            setIsIntroVisible(false)
            setIsGameRunning(true)
        }, 350)
    }

    const handleToggleGame = () => {
        setIsGameRunning((prev) => {
            const next = !prev
            onGameStateChange?.(next)
            return next
        })
    }

    const pauseGame = useCallback(() => {
        setIsGameRunning((prev) => {
            if (!prev) return prev
            onGameStateChange?.(false)
            return false
        })
    }, [onGameStateChange])

    const resetObstacles = useCallback((g) => {
        // stagger obstacles behind the horizon so the run always starts clear
        g.obstacles = OBSTACLE_COLORS.map((_, i) => ({
            lane: Math.random() * 0.5 + 0.25,
            z: -0.3 - i * 0.55,
            color: randomObstacleColor(),
        }))
    }, [])

    const restartGame = useCallback(() => {
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
        setIsGameOver(false)
        onGameStateChange?.(true)
        setIsGameRunning(true)
    }, [onGameStateChange, resetObstacles])

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
            setIsGameOver(true)
            onGameStateChange?.(false)
            setIsGameRunning(false)
        }

        const handleKeyDown = (e) => {
            if (e.code === 'Space') { if (isGameRunning) { e.preventDefault(); pauseGame() } return }
            if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = true
            if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = true
        }
        const handleKeyUp = (e) => {
            if (['ArrowLeft', 'a', 'A'].includes(e.key)) keysRef.current.left = false
            if (['ArrowRight', 'd', 'D'].includes(e.key)) keysRef.current.right = false
        }
        const handleTouch = (e) => {
            if (!isGameRunning) return
            const x = e.touches[0].clientX
            const w = window.innerWidth
            if (x < w / 2) { keysRef.current.left = true; keysRef.current.right = false }
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
            ctx.scale(dpr, dpr)
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
        }
        resize()
        window.addEventListener('resize', resize)
        initScene()

        let lastTime = 0
        const loop = (time) => {
            const dt = Math.min((time - lastTime) / 1000, 0.05)
            lastTime = time
            const w = canvas.width / (window.devicePixelRatio || 1)
            const h = canvas.height / (window.devicePixelRatio || 1)
            const g = gameRef.current
            const horizonY = h * 0.48
            const px = w * 0.05 + w * 0.9 * g.carX
            const playerW = 48
            const playerY = h - 35

            if (isGameRunning) {
                if (keysRef.current.left) g.carX = Math.max(0.15, g.carX - 1.2 * dt)
                if (keysRef.current.right) g.carX = Math.min(0.85, g.carX + 1.2 * dt)
                g.roadOffset = (g.roadOffset + g.speed * dt) % 1
                g.distance += g.speed * dt * 22
                // gentle speed ramp — tops out so it stays an easter egg, not a boss fight
                g.speed = Math.min(4.2, g.speed + dt * 0.05)
                g.obstacles.forEach(obs => {
                    obs.z += g.speed * dt * 0.3
                    if (obs.z > 1.15) {
                        obs.z = -0.15
                        obs.lane = Math.random() * 0.5 + 0.25
                        obs.color = randomObstacleColor()
                    }
                })
                g.hudTick += dt
                if (g.hudTick > 0.15) {
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

            // ── Obstacles + collision ──
            g.obstacles.forEach(obs => {
                const pz = Math.pow(obs.z, 1.8)
                const ox = w * 0.5 + (obs.lane - 0.5) * w * 0.9 * pz
                const oy = horizonY + (h - horizonY) * pz
                const ow = 20 + pz * 30
                const near = oy > playerY - 46 && oy < playerY + 12
                if (oy > horizonY && oy < h - 20) drawObstacleCar(ctx, ox, oy, ow, 14 + pz * 22, obs.color, near && isGameRunning)
                // collision: obstacle has reached the player's row and overlaps horizontally
                if (isGameRunning && !g.crashed && near && Math.abs(ox - px) < (playerW + ow) / 2 * 0.6) {
                    endGame()
                }
            })

            drawCar(ctx, px, playerY, playerW, 36)

            if (!isGameOver) {
                ctx.fillStyle = 'rgba(220,245,255,0.28)'
                ctx.font = '10px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'
                ctx.fillText('A / D · arrows · or tap the sides to steer', w / 2, h - 10)
            }

            if (isGameRunning) animId = requestAnimationFrame(loop)
        }

        if (isGameRunning) animId = requestAnimationFrame(loop)
        else loop(0)

        return () => {
            if (animId) cancelAnimationFrame(animId)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            canvas.removeEventListener('touchstart', handleTouch)
            canvas.removeEventListener('touchend', handleTouchEnd)
            window.removeEventListener('resize', resize)
        }
    }, [isGameRunning, isGameOver, pauseGame, initScene, onGameStateChange])

    useEffect(() => {
        const handleScroll = () => {
            if (!isGameRunning) return
            const rect = canvasRef.current?.getBoundingClientRect()
            if (rect && rect.bottom < 0) pauseGame()
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [isGameRunning, pauseGame])

    return (
        <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0, touchAction: 'none' }} />

            {!isIntroVisible && !isGameOver && (
                <button onClick={handleToggleGame} className="absolute right-4 top-8 z-20 rounded-lg border border-border-hover bg-black/40 px-3 py-1.5 text-xs font-semibold text-text-primary backdrop-blur-md transition-colors hover:bg-black/60">
                    {isGameRunning ? 'Pause' : 'Resume'}
                </button>
            )}

            {isIntroVisible && (
                <div className={`absolute inset-x-0 top-[calc(50%+9rem)] z-20 flex justify-center px-6 transition-opacity duration-500 ${isIntroFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="w-full max-w-xs rounded-xl border border-border-hover bg-black/50 p-4 text-center backdrop-blur-lg">
                        <h3 className="font-heading text-lg font-semibold text-text-primary">Neon Rider</h3>
                        <p className="mt-1.5 text-xs text-text-secondary">The portfolio, after hours. Steer to survive the highway.</p>
                        <button onClick={handlePlay} className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg transition-transform hover:scale-105">▶ Play</button>
                    </div>
                </div>
            )}

            {isGameOver && (
                <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
                    <div className="w-full max-w-xs rounded-xl border border-border-hover bg-black/60 p-5 text-center backdrop-blur-lg">
                        <p className="font-heading text-xs uppercase tracking-[0.2em] text-text-tertiary">Nice run</p>
                        <p className="mt-2 font-heading text-4xl font-bold text-accent">{distance}<span className="text-lg text-text-secondary">m</span></p>
                        <button onClick={restartGame} className="mt-4 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg transition-transform hover:scale-105">↻ Retry</button>
                        <p className="mt-3 text-[11px] text-text-tertiary">Now go read the boring stuff — hit <span className="text-text-secondary">Esc</span>.</p>
                    </div>
                </div>
            )}

            <div className={`absolute left-4 top-8 z-10 rounded-xl border border-border bg-black/40 px-4 py-2 text-sm text-text-primary backdrop-blur-md transition-opacity duration-300 ${isGameRunning ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="text-xs text-text-tertiary">Distance</div>
                <div className="font-heading text-lg font-bold text-accent">{distance}m</div>
            </div>
        </>
    )
}

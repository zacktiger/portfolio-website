import { useRef, useEffect, useCallback, useState } from 'react'


// ─── Low-poly car shape (simple trapezoid + wheels) ───
function drawCar(ctx, x, y, w, h, color, glowColor) {
    ctx.save()
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 18

    // Body bottom
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y)
    ctx.lineTo(x + w / 2, y)
    ctx.lineTo(x + w / 2 - 4, y - h * 0.45)
    ctx.lineTo(x - w / 2 + 4, y - h * 0.45)
    ctx.closePath()
    ctx.fill()

    // Cabin
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + 8, y - h * 0.45)
    ctx.lineTo(x + w / 2 - 8, y - h * 0.45)
    ctx.lineTo(x + w / 2 - 14, y - h * 0.82)
    ctx.lineTo(x - w / 2 + 14, y - h * 0.82)
    ctx.closePath()
    ctx.fill()

    // Roof
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + 14, y - h * 0.82)
    ctx.lineTo(x + w / 2 - 14, y - h * 0.82)
    ctx.lineTo(x + w / 2 - 16, y - h)
    ctx.lineTo(x - w / 2 + 16, y - h)
    ctx.closePath()
    ctx.fill()

    // Tail lights
    ctx.shadowBlur = 12
    ctx.shadowColor = '#ff2244'
    ctx.fillStyle = '#ff2244'
    ctx.fillRect(x - w / 2 + 1, y - 6, 5, 3)
    ctx.fillRect(x + w / 2 - 6, y - 6, 5, 3)

    // Headlights
    ctx.shadowColor = '#ffee88'
    ctx.fillStyle = '#ffee88'
    ctx.fillRect(x - w / 2 + 2, y - h * 0.42, 4, 2)
    ctx.fillRect(x + w / 2 - 6, y - h * 0.42, 4, 2)

    ctx.restore()
}

function drawObstacleCar(ctx, x, y, w, h, color) {
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.fillStyle = color
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
    ctx.shadowColor = '#ff4466'
    ctx.fillStyle = '#ff4466'
    ctx.fillRect(x - w / 2 + 1, y - 4, 4, 2)
    ctx.fillRect(x + w / 2 - 5, y - 4, 4, 2)
    ctx.restore()
}

export default function RetroCarGame({ onPlayStart, onGameStateChange }) {
    const canvasRef = useRef(null)
    const isDark = true
    const [isGameRunning, setIsGameRunning] = useState(false)
    const [isIntroVisible, setIsIntroVisible] = useState(true)
    const [isIntroFading, setIsIntroFading] = useState(false)
    const [hud, setHud] = useState({ distance: 0, blocksShot: 0 })
    const keysRef = useRef({ left: false, right: false })
    const gameRef = useRef({
        carX: 0.5,
        speed: 2,
        roadOffset: 0,
        distance: 0,
        blocksShot: 0,
        hudTick: 0,
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
        g.obstacles = Array.from({ length: 3 }, (_, i) => ({
            lane: Math.random() * 0.6 + 0.2,
            z: 0.3 + i * 0.25,
            color: ['#e879f9', '#22d3ee', '#f97316'][i % 3],
        }))
        g.initialized = true
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        let animId = null

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

            if (isGameRunning) {
                if (keysRef.current.left) g.carX = Math.max(0.15, g.carX - 1.2 * dt)
                if (keysRef.current.right) g.carX = Math.min(0.85, g.carX + 1.2 * dt)
                g.roadOffset = (g.roadOffset + g.speed * dt) % 1
                g.distance += g.speed * dt * 22
                g.obstacles.forEach(obs => {
                    obs.z += g.speed * dt * 0.3
                    if (obs.z > 1.1) {
                        obs.z = -0.1
                        obs.lane = Math.random() * 0.5 + 0.25
                        obs.color = ['#e879f9', '#22d3ee', '#f97316', '#a855f7'][Math.floor(Math.random() * 4)]
                        g.blocksShot += 1
                    }
                })
                g.hudTick += dt
                if (g.hudTick > 0.15) {
                    g.hudTick = 0
                    setHud({ distance: Math.floor(g.distance), blocksShot: g.blocksShot })
                }
            }

            ctx.clearRect(0, 0, w, h)
            const horizonY = h * 0.48
            const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
            if (isDark) {
                skyGrad.addColorStop(0, '#05050f'); skyGrad.addColorStop(0.5, '#0c0820'); skyGrad.addColorStop(1, '#3a1060')
            } else {
                skyGrad.addColorStop(0, '#1a0a3a'); skyGrad.addColorStop(0.5, '#3a1060'); skyGrad.addColorStop(1, '#e060a0')
            }
            ctx.fillStyle = skyGrad
            ctx.fillRect(0, 0, w, horizonY)

            const t_sec = time * 0.001
            g.stars.forEach(s => {
                ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.sin(t_sec * 1.5 + s.twinkle)})`
                ctx.fillRect(s.x * w, s.y * h, s.size, s.size)
            })

            const sunX = w * 0.5, sunY = horizonY - h * 0.02, sunR = Math.min(w, h) * 0.13
            const sunBody = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR * 0.3)
            sunBody.addColorStop(0, '#fff8a0'); sunBody.addColorStop(0.4, '#ffaa44'); sunBody.addColorStop(1, '#cc44aa')
            ctx.fillStyle = sunBody
            ctx.beginPath(); ctx.arc(sunX, sunY, sunR, Math.PI, 0); ctx.fill()

            const bColor = isDark ? '#08081a' : '#120828'
            g.buildings.forEach(b => {
                ctx.fillStyle = bColor
                const bx = b.x * w, bw = b.w * w, bh = b.h * h, by = horizonY - bh
                ctx.fillRect(bx, by, bw, bh + 4)
                ctx.fillStyle = 'rgba(255,230,120,0.3)'
                for (let r = 0; r < b.windows; r++) {
                    for (let c = 0; c < Math.max(2, Math.floor(bw / 8)); c++) {
                        if (Math.random() > 0.4) ctx.fillRect(bx + 3 + c * (bw - 6) / 4, by + 4 + r * (bh - 8) / b.windows, 2, 2)
                    }
                }
            })

            const ground = ctx.createLinearGradient(0, horizonY, 0, h)
            ground.addColorStop(0, isDark ? '#0a0418' : '#1a0830'); ground.addColorStop(1, '#000008')
            ctx.fillStyle = ground
            ctx.fillRect(0, horizonY, w, h - horizonY)

            for (let i = 0; i < 20; i++) {
                let t01 = (i / 20 + g.roadOffset / 20) % 1
                const py = horizonY + (h - horizonY) * Math.pow(t01, 1.8)
                ctx.strokeStyle = (isDark ? 'rgba(232,121,249,' : 'rgba(180,138,216,') + (0.08 + t01 * 0.25) + ')'
                ctx.lineWidth = 0.5 + t01; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke()
            }
            for (let i = 0; i <= 16; i++) {
                const t01 = i / 16, bx = w * 0.05 + w * 0.9 * t01
                ctx.strokeStyle = (isDark ? 'rgba(34,211,238,' : 'rgba(110,198,192,') + (0.15 - Math.abs(t01 - 0.5) * 0.1) + ')'
                ctx.beginPath(); ctx.moveTo(w * 0.5, horizonY); ctx.lineTo(bx, h); ctx.stroke()
            }

            g.obstacles.forEach(obs => {
                const pz = Math.pow(obs.z, 1.8)
                const ox = w * 0.5 + (obs.lane - 0.5) * w * 0.9 * pz
                const oy = horizonY + (h - horizonY) * pz
                if (oy > horizonY && oy < h - 20) drawObstacleCar(ctx, ox, oy, 20 + pz * 30, 14 + pz * 22, obs.color)
            })

            const px = w * 0.05 + w * 0.9 * g.carX
            drawCar(ctx, px, h - 35, 48, 36, isDark ? '#22d3ee' : '#6ec6c0', isDark ? 'rgba(34,211,238,0.6)' : 'rgba(110,198,192,0.6)')

            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
            ctx.font = '10px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'
            ctx.fillText('A/D or Arrows or Touch sides to drive', w / 2, h - 10)

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
    }, [isDark, isGameRunning, pauseGame, initScene])

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
            {!isIntroVisible && (
                <button onClick={handleToggleGame} className={`absolute right-4 top-8 z-20 rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors ${isDark ? 'border-white/20 bg-black/35 text-white hover:bg-black/55' : 'border-slate-300/80 bg-white/50 text-slate-800'}`}>
                    {isGameRunning ? 'Pause' : 'Resume'}
                </button>
            )}
            {isIntroVisible && (
                <div className={`absolute inset-x-0 top-[calc(50%+10rem)] z-20 flex justify-center px-6 transition-opacity duration-500 ${isIntroFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className={`w-full max-w-xs rounded-xl border p-4 text-center backdrop-blur-lg ${isDark ? 'border-white/20 bg-slate-900/45 text-white' : 'border-white/50 bg-white/40 text-slate-900'}`}>
                        <h3 className="text-lg font-semibold">Neon Rider</h3>
                        <p className="mt-1.5 text-xs opacity-80">Drive through the retro highway loop.</p>
                        <button onClick={handlePlay} className={`mt-4 inline-flex items-center rounded-lg px-4 py-2 text-xs font-semibold ${isDark ? 'bg-neon-cyan text-slate-900' : 'bg-pastel-cyan text-slate-900'}`}>▶ Play</button>
                    </div>
                </div>
            )}
            <div className={`absolute left-4 top-8 z-10 rounded-xl px-4 py-2 text-sm backdrop-blur-md transition-opacity duration-300 ${isGameRunning ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/35 text-white' : 'bg-white/45 text-slate-800'}`}>
                <div>Dist: <span className="font-bold">{hud.distance}m</span></div>
                <div>Blocks: <span className="font-bold">{hud.blocksShot}</span></div>
            </div>
        </>
    )
}

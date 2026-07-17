import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Github, Linkedin, Mail, FileText, ArrowUpRight } from 'lucide-react'

/* ───────────────────────────────────────────
   Typewriter — cycles through roles
   ─────────────────────────────────────────── */
const ROLES = [
    'Full Stack Developer',
    'Backend Engineer',
    'Systems Builder',
    'GameJam Winner — IIT BHU',
]

function Typewriter() {
    const [text, setText] = useState('')
    const [roleIndex, setRoleIndex] = useState(0)
    const [phase, setPhase] = useState('typing') // typing | pausing | deleting

    useEffect(() => {
        const role = ROLES[roleIndex]
        let timeout

        if (phase === 'typing') {
            if (text.length < role.length) {
                timeout = setTimeout(() => setText(role.slice(0, text.length + 1)), 65)
            } else {
                timeout = setTimeout(() => setPhase('deleting'), 2200)
            }
        } else if (phase === 'deleting') {
            if (text.length > 0) {
                timeout = setTimeout(() => setText(text.slice(0, -1)), 35)
            } else {
                setRoleIndex(i => (i + 1) % ROLES.length)
                setPhase('typing')
            }
        }
        return () => clearTimeout(timeout)
    }, [text, phase, roleIndex])

    return (
        <span className="inline-flex items-center">
            <span className="text-text-secondary">{text}</span>
            <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatType: 'reverse' }}
                className="ml-0.5 inline-block w-[2px] h-[1.15em] bg-accent align-middle"
            />
        </span>
    )
}

/* ───────────────────────────────────────────
   Magnetic — element leans toward the cursor
   ─────────────────────────────────────────── */
function Magnetic({ children, strength = 0.35 }) {
    const ref = useRef(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const sx = useSpring(x, { stiffness: 200, damping: 15 })
    const sy = useSpring(y, { stiffness: 200, damping: 15 })

    const handleMove = (e) => {
        const rect = ref.current?.getBoundingClientRect()
        if (!rect) return
        x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
        y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
    }
    const handleLeave = () => { x.set(0); y.set(0) }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ x: sx, y: sy }}
        >
            {children}
        </motion.div>
    )
}

/* ───────────────────────────────────────────
   Interactive Particle Field (Canvas)
   ─────────────────────────────────────────── */
function ParticleCanvas() {
    const canvasRef = useRef(null)
    const mouseRef = useRef({ x: -1000, y: -1000 })
    const particlesRef = useRef([])
    const animRef = useRef(null)

    const initParticles = useCallback((w, h) => {
        const count = Math.min(80, Math.floor((w * h) / 15000))
        return Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 1.5 + 0.5,
        }))
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        const resize = () => {
            const dpr = window.devicePixelRatio || 1
            const rect = canvas.parentElement.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            ctx.scale(dpr, dpr)
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
            particlesRef.current = initParticles(rect.width, rect.height)
        }

        resize()
        window.addEventListener('resize', resize)

        const handleMouse = (e) => {
            const rect = canvas.getBoundingClientRect()
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }
        window.addEventListener('mousemove', handleMouse)

        const loop = () => {
            const w = canvas.width / (window.devicePixelRatio || 1)
            const h = canvas.height / (window.devicePixelRatio || 1)
            const mx = mouseRef.current.x
            const my = mouseRef.current.y

            ctx.clearRect(0, 0, w, h)
            const particles = particlesRef.current

            // Update positions
            particles.forEach(p => {
                // Mouse attraction
                const dx = mx - p.x
                const dy = my - p.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 200 && dist > 1) {
                    p.vx += (dx / dist) * 0.015
                    p.vy += (dy / dist) * 0.015
                }

                p.x += p.vx
                p.y += p.vy
                p.vx *= 0.99
                p.vy *= 0.99

                // Wrap
                if (p.x < 0) p.x = w
                if (p.x > w) p.x = 0
                if (p.y < 0) p.y = h
                if (p.y > h) p.y = 0
            })

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x
                    const dy = particles[i].y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 120) {
                        const alpha = (1 - dist / 120) * 0.15
                        ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
                        ctx.lineWidth = 0.5
                        ctx.beginPath()
                        ctx.moveTo(particles[i].x, particles[i].y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.stroke()
                    }
                }
            }

            // Draw particles
            particles.forEach(p => {
                const dx = mx - p.x
                const dy = my - p.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                const brightness = dist < 200 ? 0.6 + (1 - dist / 200) * 0.4 : 0.3

                ctx.fillStyle = `rgba(0, 212, 255, ${brightness})`
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fill()
            })

            // Mouse glow
            if (mx > 0 && my > 0) {
                const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 150)
                grd.addColorStop(0, 'rgba(0, 212, 255, 0.03)')
                grd.addColorStop(1, 'rgba(0, 212, 255, 0)')
                ctx.fillStyle = grd
                ctx.fillRect(0, 0, w, h)
            }

            animRef.current = requestAnimationFrame(loop)
        }

        animRef.current = requestAnimationFrame(loop)
        return () => {
            cancelAnimationFrame(animRef.current)
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouse)
        }
    }, [initParticles])

    return <canvas ref={canvasRef} className="particle-canvas" />
}

/* ───────────────────────────────────────────
   Hero Section
   ─────────────────────────────────────────── */
export default function Hero() {
    return (
        <section
            id="home"
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
            <ParticleCanvas />

            {/* Radial gradient overlay */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, #0a0a0a 70%)',
                }}
            />

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                {/* Availability badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-border bg-surface/60 backdrop-blur-md"
                >
                    <span className="relative flex w-2 h-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-400" />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-secondary">
                        Open to internships
                    </span>
                </motion.div>

                {/* Label */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent mb-8"
                >
                    Software Development Engineer
                </motion.p>

                {/* Name */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="font-heading font-800 tracking-tight mb-6"
                    style={{ fontSize: 'clamp(3rem, 10vw, 8rem)', lineHeight: 0.95, fontWeight: 800 }}
                >
                    <span className="text-text-primary">KSHITIJ</span>
                    <br />
                    <span className="text-accent">BACHHAV</span>
                </motion.h1>

                {/* Subtitle — typewriter roles */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.7 }}
                    className="font-display text-lg sm:text-xl tracking-wide mb-4 min-h-[1.8em]"
                >
                    <Typewriter />
                </motion.p>

                {/* One-liner */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="font-body text-text-tertiary text-base max-w-xl mx-auto mb-12 leading-relaxed"
                >
                    Building scalable SaaS platforms, real-time prediction markets,
                    and interactive algorithm visualizers.
                </motion.p>

                {/* CTA row */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.6 }}
                    className="flex items-center justify-center gap-4 mb-8"
                >
                    <a href="#projects" className="cta-button" style={{ padding: '11px 24px', fontSize: '13px' }}>
                        View Work
                        <ArrowUpRight size={14} />
                    </a>
                    <a
                        href="/resume.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cta-button-ghost"
                        style={{ padding: '11px 24px', fontSize: '13px' }}
                    >
                        <FileText size={14} />
                        Resume
                    </a>
                </motion.div>

                {/* Social row */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.6 }}
                    className="flex items-center justify-center gap-3"
                >
                    {[
                        { icon: Github, href: 'https://github.com/zacktiger', label: 'GitHub' },
                        { icon: Linkedin, href: 'https://www.linkedin.com/in/KshitijBachhav', label: 'LinkedIn' },
                        { icon: Mail, href: 'mailto:kshitijbachhav005@gmail.com', label: 'Email' },
                    ].map(({ icon: Icon, href, label }, i) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.7 + i * 0.1, type: 'spring', stiffness: 200 }}
                        >
                            <Magnetic>
                                <a
                                    href={href}
                                    target={label !== 'Email' ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="block p-3 rounded-xl border border-border-hover bg-surface/40 text-text-secondary
                                               hover:text-accent hover:border-accent-mid hover:bg-accent-dim
                                               transition-colors duration-300"
                                >
                                    <Icon size={18} />
                                </a>
                            </Magnetic>
                        </motion.div>
                    ))}
                </motion.div>

            </div>
        </section>
    )
}

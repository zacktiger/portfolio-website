import { useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, ChevronDown } from 'lucide-react'

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

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.7 }}
                    className="font-display text-text-secondary text-lg sm:text-xl tracking-wide mb-4"
                >
                    Full Stack Developer{' '}
                    <span className="text-text-muted mx-2">•</span>{' '}
                    Backend Engineer{' '}
                    <span className="text-text-muted mx-2">•</span>{' '}
                    Systems Builder
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
                        <motion.a
                            key={label}
                            href={href}
                            target={label !== 'Email' ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            aria-label={label}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.7 + i * 0.1, type: 'spring', stiffness: 200 }}
                            className="p-3 rounded-xl border border-border text-text-tertiary
                                       hover:text-accent hover:border-accent-mid hover:bg-accent-dim
                                       transition-all duration-300"
                        >
                            <Icon size={18} />
                        </motion.a>
                    ))}
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2"
                >
                    <motion.a
                        href="#about"
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-text-muted hover:text-accent transition-colors"
                    >
                        <ChevronDown size={24} />
                    </motion.a>
                </motion.div>
            </div>
        </section>
    )
}

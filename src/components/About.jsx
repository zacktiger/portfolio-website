import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, MapPin, Calendar, Trophy, Zap } from 'lucide-react'
import { achievements } from '../data/portfolioData'

/* ───────────────────────────────────────────
   Spotlight Card (mouse-tracking glow)
   ─────────────────────────────────────────── */
function SpotlightCard({ children, className = '' }) {
    const cardRef = useRef(null)
    const [pos, setPos] = useState({ x: 0, y: 0 })

    const handleMouse = useCallback((e) => {
        const rect = cardRef.current?.getBoundingClientRect()
        if (!rect) return
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }, [])

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouse}
            className={`spotlight-card ${className}`}
        >
            <div
                className="spotlight-gradient"
                style={{
                    background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, rgba(0,212,255,0.06), transparent 60%)`,
                }}
            />
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}

/* ───────────────────────────────────────────
   Animated Counter
   ─────────────────────────────────────────── */
function AnimatedCounter({ value, suffix = '', label }) {
    const [count, setCount] = useState(0)
    const [hasAnimated, setHasAnimated] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true)
                    const duration = 1500
                    const steps = 40
                    const increment = value / steps
                    let current = 0
                    const timer = setInterval(() => {
                        current += increment
                        if (current >= value) {
                            setCount(value)
                            clearInterval(timer)
                        } else {
                            setCount(Math.floor(current))
                        }
                    }, duration / steps)
                }
            },
            { threshold: 0.5 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [value, hasAnimated])

    return (
        <div ref={ref} className="text-center">
            <div className="font-heading text-3xl sm:text-4xl font-800 text-accent mb-2" style={{ fontWeight: 800 }}>
                {count}{suffix}
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary">
                {label}
            </div>
        </div>
    )
}

/* ───────────────────────────────────────────
   About Section
   ─────────────────────────────────────────── */
const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

export default function About() {
    return (
        <section id="about" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-12">
                    <p className="section-label">About</p>
                    <h2 className="section-title">
                        Building systems that<br />
                        <span className="text-accent">scale and ship.</span>
                    </h2>
                </motion.div>

                {/* Stats row */}
                <motion.div
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.1 }}
                    className="grid grid-cols-3 gap-4 sm:gap-5 mb-10"
                >
                    <SpotlightCard className="p-5 sm:p-6">
                        <AnimatedCounter value={3} suffix="+" label="Projects Built" />
                    </SpotlightCard>
                    <SpotlightCard className="p-5 sm:p-6">
                        <AnimatedCounter value={200} suffix="+" label="DSA Problems" />
                    </SpotlightCard>
                    <SpotlightCard className="p-5 sm:p-6">
                        <AnimatedCounter value={1} suffix="st" label="Place — IIT BHU" />
                    </SpotlightCard>
                </motion.div>

                {/* Two-column cards */}
                <div className="grid lg:grid-cols-2 gap-5">
                    {/* Bio */}
                    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
                        <SpotlightCard className="p-7 sm:p-8 h-full">
                            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-4">
                                Background
                            </p>
                            <p className="font-body text-sm sm:text-[15px] leading-[1.8] text-text-secondary mb-4">
                                I'm a Software Development Engineer specializing in{' '}
                                <span className="text-text-primary font-medium">Full Stack and Backend development</span>.
                                Currently pursuing B.Tech in IoT at IIIT Nagpur, I build production-ready
                                systems that scale — from multi-tenant SaaS platforms with enterprise
                                authentication to real-time prediction markets powered by LLM pipelines.
                            </p>
                            <p className="font-body text-sm sm:text-[15px] leading-[1.8] text-text-tertiary">
                                My stack spans{' '}
                                <span className="text-text-secondary">React, Node.js, FastAPI, PostgreSQL, and Docker</span>.
                                I care about clean architecture, robust auth flows, and interfaces that
                                are as beautiful as they are functional.
                            </p>
                        </SpotlightCard>
                    </motion.div>

                    {/* Education + Achievements */}
                    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
                        <SpotlightCard className="p-7 sm:p-8 h-full">
                            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent mb-4">
                                Education
                            </p>

                            <div className="mb-5">
                                <div className="flex items-start gap-3.5 mb-2.5">
                                    <div className="p-2 rounded-lg bg-accent-dim border border-accent-mid/50">
                                        <GraduationCap size={16} className="text-accent" />
                                    </div>
                                    <div>
                                        <h4 className="font-display font-bold text-base text-text-primary">
                                            IIIT Nagpur
                                        </h4>
                                        <p className="font-body text-sm text-text-secondary">
                                            B.Tech in Internet of Things (IoT)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 ml-[44px]">
                                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                        <MapPin size={12} /> Nagpur, MH
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                                        <Calendar size={12} /> 2023 – 2027
                                    </span>
                                </div>
                            </div>

                            <div className="h-px bg-border my-5" />

                            {/* Achievements */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy size={13} className="text-accent" />
                                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-accent">
                                        Achievements
                                    </span>
                                </div>
                                <div className="space-y-3.5">
                                    {achievements.map((ach, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                            <Zap size={12} className="mt-1 flex-shrink-0 text-accent" />
                                            <div>
                                                <span className="text-sm font-display font-semibold text-text-primary">
                                                    {ach.title}
                                                </span>
                                                <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">
                                                    {ach.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

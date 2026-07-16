import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, MapPin, Calendar, Trophy } from 'lucide-react'
import { achievements } from '../data/portfolioData'

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
        <div ref={ref}>
            <div className="font-heading text-4xl sm:text-5xl font-800 text-text-primary" style={{ fontWeight: 800 }}>
                {count}
                <span className="serif-accent text-3xl sm:text-4xl ml-0.5">{suffix}</span>
            </div>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary mt-2">
                {label}
            </div>
        </div>
    )
}

/* ───────────────────────────────────────────
   About Section — editorial, no boxes
   ─────────────────────────────────────────── */
const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

export default function About() {
    return (
        <section id="about" className="relative py-28 sm:py-36">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-14">
                    <p className="section-label">About</p>
                    <h2 className="section-title">
                        Building systems that<br />
                        <span className="serif-accent">scale and ship.</span>
                    </h2>
                </motion.div>

                {/* Editorial statement */}
                <motion.p
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.1 }}
                    className="font-body font-light text-xl sm:text-2xl leading-[1.6] text-text-secondary max-w-3xl mb-16"
                >
                    I'm a Software Development Engineer specializing in{' '}
                    <span className="text-text-primary font-normal">Full Stack and Backend development</span>{' '}
                    — from multi-tenant SaaS platforms with enterprise authentication to
                    real-time prediction markets powered by LLM pipelines. I care about
                    clean architecture, robust auth flows, and interfaces that are as{' '}
                    <span className="serif-accent">beautiful</span> as they are functional.
                </motion.p>

                {/* Stats — inline hairline row */}
                <motion.div
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.15 }}
                    className="grid grid-cols-3 mb-20 border-y border-white/[0.07]"
                >
                    <div className="py-8 pr-6 border-r border-white/[0.07]">
                        <AnimatedCounter value={9} suffix="+" label="Projects Built" />
                    </div>
                    <div className="py-8 px-6 sm:px-10 border-r border-white/[0.07]">
                        <AnimatedCounter value={200} suffix="+" label="DSA Problems" />
                    </div>
                    <div className="py-8 pl-6 sm:pl-10">
                        <AnimatedCounter value={1} suffix="st" label="Place — IIT BHU" />
                    </div>
                </motion.div>

                {/* Education + Achievements — two clean columns */}
                <div className="grid lg:grid-cols-2 gap-x-20 gap-y-12">
                    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                        <div className="flex items-center gap-2 mb-6">
                            <GraduationCap size={14} className="text-accent" />
                            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-accent">
                                Education
                            </span>
                        </div>
                        <h4 className="font-heading font-bold text-xl text-text-primary mb-1">
                            IIIT Nagpur
                        </h4>
                        <p className="font-body text-[15px] text-text-secondary mb-3">
                            B.Tech in Internet of Things (IoT)
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary">
                                <MapPin size={12} /> Nagpur, MH
                            </span>
                            <span className="flex items-center gap-1.5 font-mono text-xs text-text-tertiary">
                                <Calendar size={12} /> 2023 – 2027
                            </span>
                        </div>
                        <p className="font-body text-sm leading-[1.8] text-text-tertiary mt-5 max-w-md">
                            My stack spans{' '}
                            <span className="text-text-secondary">React, Node.js, FastAPI, PostgreSQL, and Docker</span>{' '}
                            — with fundamentals in DSA, OS, networks, and database systems.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.18 }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Trophy size={13} className="text-accent" />
                            <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-accent">
                                Achievements
                            </span>
                        </div>
                        <div>
                            {achievements.map((ach, i) => (
                                <div key={i} className={`py-4 ${i === 0 ? 'pt-0' : ''} ${i < achievements.length - 1 ? 'hairline' : ''}`}>
                                    <span className="font-display font-semibold text-base text-text-primary">
                                        {ach.title}
                                    </span>
                                    <p className="text-sm text-text-tertiary mt-1 leading-relaxed">
                                        {ach.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

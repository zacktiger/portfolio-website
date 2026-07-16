import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mail, Linkedin, Github, Send, ArrowUpRight } from 'lucide-react'
import { contactInfo } from '../data/portfolioData'

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
                    background: `radial-gradient(300px circle at ${pos.x}px ${pos.y}px, rgba(0,212,255,0.06), transparent 60%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

const items = [
    { icon: Mail, label: 'Email', value: contactInfo.email, href: `mailto:${contactInfo.email}` },
    { icon: Linkedin, label: 'LinkedIn', value: 'Kshitij Bachhav', href: contactInfo.linkedin },
    { icon: Github, label: 'GitHub', value: '@zacktiger', href: contactInfo.github },
]

export default function Contact() {
    return (
        <section id="contact" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-12">
                    <p className="section-label">Contact</p>
                    <h2 className="section-title mb-3">
                        Let's work<br />
                        <span className="text-accent">together.</span>
                    </h2>
                    <p className="font-body text-text-tertiary text-sm max-w-md">
                        Open to internships, collaborations, and interesting engineering challenges.
                    </p>
                </motion.div>

                {/* Contact cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-10">
                    {items.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <motion.a
                                key={item.label}
                                href={item.href}
                                target={item.label !== 'Email' ? '_blank' : undefined}
                                rel="noopener noreferrer"
                                {...fadeUp}
                                transition={{ ...fadeUp.transition, delay: 0.1 + i * 0.06 }}
                                className="block group"
                            >
                                <SpotlightCard className="p-5 text-center h-full">
                                    <div className="inline-flex p-2.5 rounded-lg bg-accent-dim border border-accent-mid/40 mb-3 group-hover:bg-accent-mid/30 transition-colors">
                                        <Icon size={18} className="text-accent" />
                                    </div>
                                    <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-muted mb-1">
                                        {item.label}
                                    </p>
                                    <p className="text-[13px] font-display font-medium text-text-primary truncate">
                                        {item.value}
                                    </p>
                                    <ArrowUpRight
                                        size={13}
                                        className="mx-auto mt-2.5 text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                    />
                                </SpotlightCard>
                            </motion.a>
                        )
                    })}
                </div>

                {/* CTA */}
                <motion.div
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.3 }}
                    className="text-center"
                >
                    <a
                        href={`mailto:${contactInfo.email}`}
                        className="cta-button"
                    >
                        <Send size={15} />
                        Send a Message
                    </a>
                </motion.div>
            </div>
        </section>
    )
}

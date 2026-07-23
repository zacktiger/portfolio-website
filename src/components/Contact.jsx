import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, FileText, MapPin, GraduationCap, Clock } from 'lucide-react'
import { contactInfo } from '../data/portfolioData'

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

/* Label + value row inside the status card */
function InfoRow({ icon: Icon, label, children }) {
    return (
        <div className="flex items-start gap-3">
            <Icon size={15} className="text-accent mt-[3px] flex-shrink-0" />
            <div>
                <div className="font-mono text-[9.5px] tracking-[0.15em] uppercase text-text-tertiary">
                    {label}
                </div>
                <div className="font-display text-sm text-text-primary mt-0.5">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function Contact() {
    // Live local time — matches the section's "reach me" intent and the
    // "Live from GitHub" motif elsewhere. No SSR here, so no hydration concern.
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000)
        return () => clearInterval(id)
    }, [])
    const istTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
    }).format(now)

    return (
        <section id="contact" className="relative py-32 sm:py-44">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-14">
                    <p className="section-label">Contact</p>
                    <h2 className="section-title">
                        Let's work<br />
                        <span className="serif-accent holo-text">together.</span>
                    </h2>
                </motion.div>

                {/* Two columns: the CTA on the left, an at-a-glance card filling
                   what used to be dead space on the right. Splits only at xl — at
                   narrower widths the content-container runs near full-width and a
                   far-right card would collide with the fixed dock nav, so it stacks. */}
                <div className="grid gap-12 xl:grid-cols-[1fr_280px] xl:gap-16 xl:items-center">
                    {/* Left — intro, giant mailto, inline links */}
                    <div>
                        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="mb-14">
                            <p className="font-body text-text-tertiary text-sm max-w-md mb-8">
                                Open to internships, collaborations, and interesting engineering
                                challenges. The fastest way to reach me:
                            </p>
                            <a
                                href={`mailto:${contactInfo.email}`}
                                className="group inline-block"
                            >
                                <span
                                    className="font-display font-medium text-text-primary transition-colors duration-300 group-hover:text-accent break-all"
                                    style={{ fontSize: 'clamp(1.3rem, 3vw, 2.25rem)', letterSpacing: '-0.02em' }}
                                >
                                    {contactInfo.email}
                                </span>
                                <span className="block h-[2px] mt-3 bg-white/15 relative overflow-hidden">
                                    <span className="absolute inset-y-0 left-0 w-full bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                                </span>
                            </a>
                        </motion.div>

                        {/* Inline links */}
                        <motion.div
                            {...fadeUp}
                            transition={{ ...fadeUp.transition, delay: 0.2 }}
                            className="flex flex-wrap items-center gap-x-10 gap-y-5"
                        >
                            <a
                                href={contactInfo.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-underline font-display text-sm font-medium"
                            >
                                GitHub
                                <ArrowUpRight size={13} />
                            </a>
                            <a
                                href={contactInfo.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-underline font-display text-sm font-medium"
                            >
                                LinkedIn
                                <ArrowUpRight size={13} />
                            </a>
                            <a
                                href="/resume.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-underline font-display text-sm font-medium text-accent"
                            >
                                <FileText size={14} />
                                Resume
                                <ArrowUpRight size={13} />
                            </a>
                        </motion.div>
                    </div>

                    {/* Right — at-a-glance status card */}
                    <motion.div
                        {...fadeUp}
                        transition={{ ...fadeUp.transition, delay: 0.15 }}
                        className="rounded-2xl border border-border bg-surface/40 backdrop-blur-sm p-6 flex flex-col gap-5"
                    >
                        {/* Status */}
                        <div className="flex items-start gap-3">
                            <span className="relative flex w-2.5 h-2.5 mt-[5px] ml-[2px] flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-400" />
                            </span>
                            <div>
                                <div className="font-mono text-[9.5px] tracking-[0.15em] uppercase text-text-tertiary">
                                    Status
                                </div>
                                <div className="font-display text-sm text-text-primary mt-0.5">
                                    Open to internships
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        <InfoRow icon={MapPin} label="Location">
                            Nagpur, India
                        </InfoRow>
                        <InfoRow icon={GraduationCap} label="Currently">
                            B.Tech @ IIIT Nagpur
                        </InfoRow>
                        <InfoRow icon={Clock} label="Local time">
                            {istTime} IST
                        </InfoRow>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}

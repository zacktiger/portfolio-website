import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Github, Calendar, ArrowUpRight } from 'lucide-react'
import { projects } from '../data/portfolioData'

/* ───────────────────────────────────────────
   Spotlight Card
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
            className={`spotlight-card project-card-v2 ${className}`}
        >
            <div
                className="spotlight-gradient"
                style={{
                    background: `radial-gradient(500px circle at ${pos.x}px ${pos.y}px, rgba(0,212,255,0.04), transparent 60%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

/* ───────────────────────────────────────────
   Project Card
   ─────────────────────────────────────────── */
function ProjectCard({ project, index }) {
    const Icon = project.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
            <SpotlightCard>
                {/* Stack vertically — image on top, content below */}
                <div className="flex flex-col">
                    {/* Image */}
                    <div className="project-image-wrapper aspect-[16/9] relative">
                        <img
                            src={project.image}
                            alt={`${project.title} preview`}
                            className="project-image w-full h-full object-cover object-top"
                        />
                        {/* Bottom fade */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: 'linear-gradient(to bottom, transparent 40%, #161616 100%)',
                            }}
                        />
                        {/* Date badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg/60 backdrop-blur-md border border-border text-text-tertiary text-xs font-mono">
                            <Calendar size={11} />
                            {project.date}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-7 sm:px-8 pb-7 sm:pb-8 pt-2">
                        {/* Title */}
                        <div className="flex items-start gap-3.5 mb-4">
                            <div className="p-2 rounded-lg bg-accent-dim border border-accent-mid/40 flex-shrink-0 mt-0.5">
                                <Icon size={18} className="text-accent" />
                            </div>
                            <div>
                                <h3 className="font-heading text-lg sm:text-xl font-bold text-text-primary mb-0.5" style={{ letterSpacing: '-0.015em' }}>
                                    {project.title}
                                </h3>
                                <p className="font-mono text-[11px] text-text-tertiary tracking-wide">
                                    {project.subtitle}
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4">
                            {project.description}
                        </p>

                        {/* Bullets — only show first 3 */}
                        <ul className="space-y-2 mb-5">
                            {project.bullets.slice(0, 3).map((bullet, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                                    <span className="text-[13px] text-text-tertiary leading-relaxed">
                                        {bullet}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                            {project.tags.map(tag => (
                                <span key={tag} className="tag-chip">{tag}</span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <a
                                href={project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cta-button-ghost"
                                style={{ padding: '8px 18px', fontSize: '12px' }}
                            >
                                <Github size={14} />
                                Code
                            </a>
                            <a
                                href={project.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cta-button"
                                style={{ padding: '8px 18px', fontSize: '12px' }}
                            >
                                <ExternalLink size={14} />
                                Live Demo
                                <ArrowUpRight size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    )
}

/* ───────────────────────────────────────────
   Projects Section
   ─────────────────────────────────────────── */
export default function Projects() {
    return (
        <section id="projects" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-12"
                >
                    <p className="section-label">Projects</p>
                    <h2 className="section-title mb-3">
                        Things I've<br />
                        <span className="text-accent">built.</span>
                    </h2>
                    <p className="font-body text-text-tertiary text-sm max-w-lg">
                        Production-grade applications — from enterprise SaaS to AI-powered
                        real-time platforms.
                    </p>
                </motion.div>

                {/* Project cards — stacked vertically with proper gaps */}
                <div className="space-y-6">
                    {projects.map((project, i) => (
                        <ProjectCard key={project.id} project={project} index={i} />
                    ))}
                </div>
            </div>
        </section>
    )
}

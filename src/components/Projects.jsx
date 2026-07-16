import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Github, Calendar, ArrowUpRight, Folder } from 'lucide-react'
import { projects, moreProjects } from '../data/portfolioData'
import SpotlightCard from './SpotlightCard'

/* ───────────────────────────────────────────
   Project Card
   ─────────────────────────────────────────── */
function ProjectCard({ project, index }) {
    const Icon = project.icon
    const cardRef = useRef(null)
    const [isHit, setIsHit] = useState(false)

    // React to laser shots from CustomCursor
    useEffect(() => {
        const el = cardRef.current
        if (!el) return
        const onHit = () => {
            setIsHit(true)
            setTimeout(() => setIsHit(false), 350)
        }
        el.addEventListener('laser-hit', onHit)
        return () => el.removeEventListener('laser-hit', onHit)
    }, [])

    return (
        <motion.div
            ref={cardRef}
            data-project-id={project.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={isHit ? 'laser-flash' : ''}
        >
            <SpotlightCard className="project-card-v2" glowSize={500} glowAlpha={0.04}>
                {/* Stack vertically — image on top, content below */}
                <div className="flex flex-col">
                    {/* Image */}
                    <div className="project-image-wrapper aspect-[16/9] relative">
                        <img
                            src={project.image}
                            alt={`${project.title} preview`}
                            className="project-image w-full h-full object-cover object-top"
                            loading="lazy"
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
                            {project.live && (
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
                            )}
                        </div>
                    </div>
                </div>
            </SpotlightCard>
        </motion.div>
    )
}

/* ───────────────────────────────────────────
   Mini Project Card (More Projects grid)
   ─────────────────────────────────────────── */
const languageColors = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    'C++': '#f34b7d',
}

function MiniProjectCard({ project, index }) {
    return (
        <motion.a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="block group h-full"
        >
            <SpotlightCard className="p-5 h-full" glowSize={300} glowAlpha={0.05}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                        <Folder size={18} className="text-accent" strokeWidth={1.6} />
                        <ArrowUpRight
                            size={15}
                            className="text-text-muted group-hover:text-accent transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                    </div>
                    <h4 className="font-display font-semibold text-[15px] text-text-primary mb-1.5 group-hover:text-accent transition-colors">
                        {project.name}
                    </h4>
                    <p className="text-[12.5px] text-text-tertiary leading-relaxed mb-4 flex-1">
                        {project.description}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: languageColors[project.language] || '#00d4ff' }}
                        />
                        <span className="font-mono text-[10.5px] text-text-tertiary tracking-wide">
                            {project.language}
                        </span>
                    </div>
                </div>
            </SpotlightCard>
        </motion.a>
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

                {/* Featured project cards */}
                <div className="space-y-6">
                    {projects.map((project, i) => (
                        <ProjectCard key={project.id} project={project} index={i} />
                    ))}
                </div>

                {/* More projects */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-16 mb-6 flex items-center gap-4"
                >
                    <h3 className="font-heading text-lg font-bold text-text-primary whitespace-nowrap">
                        More on <span className="text-accent">GitHub</span>
                    </h3>
                    <div className="h-px flex-1 bg-border" />
                    <a
                        href="https://github.com/zacktiger?tab=repositories"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] tracking-wider text-text-tertiary hover:text-accent transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                        View all
                        <ArrowUpRight size={12} />
                    </a>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {moreProjects.map((project, i) => (
                        <MiniProjectCard key={project.name} project={project} index={i} />
                    ))}
                </div>
            </div>
        </section>
    )
}

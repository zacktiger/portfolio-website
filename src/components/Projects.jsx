import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Github, ArrowUpRight } from 'lucide-react'
import { projects, moreProjects } from '../data/portfolioData'

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

/* ───────────────────────────────────────────
   Featured Project — editorial row
   ─────────────────────────────────────────── */
function ProjectRow({ project, index }) {
    const rowRef = useRef(null)
    const [isHit, setIsHit] = useState(false)
    const imageLeft = index % 2 === 1

    // React to laser shots from CustomCursor
    useEffect(() => {
        const el = rowRef.current
        if (!el) return
        const onHit = () => {
            setIsHit(true)
            setTimeout(() => setIsHit(false), 350)
        }
        el.addEventListener('laser-hit', onHit)
        return () => el.removeEventListener('laser-hit', onHit)
    }, [])

    return (
        <motion.article
            ref={rowRef}
            data-project-id={project.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className={`project-row group relative grid lg:grid-cols-12 gap-8 lg:gap-12 items-center py-16 sm:py-20 ${isHit ? 'laser-flash' : ''}`}
        >
            {/* Visual */}
            <div className={`lg:col-span-7 ${imageLeft ? 'lg:order-1' : 'lg:order-2'}`}>
                <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${project.title} on GitHub`}
                    className="block"
                >
                    <div className="project-visual aspect-[16/10]">
                        <img src={project.image} alt={`${project.title} preview`} loading="lazy" />
                    </div>
                </a>
            </div>

            {/* Text */}
            <div className={`lg:col-span-5 relative z-10 ${imageLeft ? 'lg:order-2' : 'lg:order-1'}`}>
                <span className="ghost-num hidden sm:block mb-3" aria-hidden="true" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}>
                    {String(index + 1).padStart(2, '0')}
                </span>
                <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-4">
                    {project.date}
                </p>
                <h3
                    className="font-heading font-bold text-2xl sm:text-3xl text-text-primary mb-4"
                    style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
                >
                    {project.title}
                </h3>
                <p className="font-body text-[15px] text-text-secondary leading-[1.75] mb-5">
                    {project.description}
                </p>

                <ul className="space-y-2.5 mb-6">
                    {project.bullets.slice(0, 2).map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span className="w-1 h-1 rounded-full bg-accent mt-[9px] flex-shrink-0" />
                            <span className="text-[13.5px] text-text-tertiary leading-[1.7]">
                                {bullet}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* Tags as mono text */}
                <p className="font-mono text-[11px] tracking-wide text-text-muted mb-7">
                    {project.tags.join('  /  ')}
                </p>

                {/* Text links */}
                <div className="flex items-center gap-8">
                    <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline font-display text-sm font-medium"
                    >
                        <Github size={15} />
                        Code
                        <ArrowUpRight size={13} />
                    </a>
                    {project.live && (
                        <a
                            href={project.live}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-underline font-display text-sm font-medium text-accent"
                        >
                            Live Demo
                            <ArrowUpRight size={13} />
                        </a>
                    )}
                </div>
            </div>
        </motion.article>
    )
}

/* ───────────────────────────────────────────
   More Projects — hairline list rows
   ─────────────────────────────────────────── */
const languageColors = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    'C++': '#f34b7d',
}

function MoreProjectRow({ project, index, isLast }) {
    return (
        <motion.a
            href={project.github}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className={`group grid sm:grid-cols-[240px_1fr_auto] items-baseline gap-x-8 gap-y-1 py-5 ${!isLast ? 'hairline' : ''} transition-colors duration-300 hover:bg-white/[0.015] -mx-4 px-4 rounded-lg`}
        >
            <span className="font-display font-semibold text-[15px] text-text-primary group-hover:text-accent transition-colors">
                {project.name}
            </span>
            <span className="text-[13px] text-text-tertiary leading-relaxed">
                {project.description}
            </span>
            <span className="flex items-center gap-4 justify-self-end">
                <span className="flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: languageColors[project.language] || '#00d4ff' }}
                    />
                    <span className="font-mono text-[10.5px] text-text-tertiary tracking-wide">
                        {project.language}
                    </span>
                </span>
                <ArrowUpRight
                    size={14}
                    className="text-text-muted group-hover:text-accent transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
            </span>
        </motion.a>
    )
}

/* ───────────────────────────────────────────
   Projects Section
   ─────────────────────────────────────────── */
export default function Projects() {
    return (
        <section id="projects" className="relative py-28 sm:py-36">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-8">
                    <p className="section-label">Projects</p>
                    <h2 className="section-title mb-4">
                        Things I've<br />
                        <span className="serif-accent">built.</span>
                    </h2>
                    <p className="font-body text-text-tertiary text-sm max-w-lg">
                        Production-grade applications — from enterprise SaaS to AI-powered
                        real-time platforms.
                    </p>
                </motion.div>

                {/* Featured — editorial rows separated by hairlines */}
                <div className="divide-y divide-white/[0.06]">
                    {projects.map((project, i) => (
                        <ProjectRow key={project.id} project={project} index={i} />
                    ))}
                </div>

                {/* More projects */}
                <motion.div
                    {...fadeUp}
                    className="mt-20 mb-4 flex items-baseline gap-4"
                >
                    <h3 className="font-heading text-xl font-bold text-text-primary whitespace-nowrap">
                        More on <span className="serif-accent">GitHub</span>
                    </h3>
                    <div className="h-px flex-1 bg-white/[0.07] self-center" />
                    <a
                        href="https://github.com/zacktiger?tab=repositories"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline font-mono text-[11px] tracking-wider"
                    >
                        View all
                        <ArrowUpRight size={12} />
                    </a>
                </motion.div>

                <div className="border-t border-white/[0.07]">
                    {moreProjects.map((project, i) => (
                        <MoreProjectRow
                            key={project.name}
                            project={project}
                            index={i}
                            isLast={i === moreProjects.length - 1}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { projects } from '../data/portfolioData'
import useGitHubRepos from '../hooks/useGitHubRepos'
import FeaturedProjects from './FeaturedProjects'

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

/* ───────────────────────────────────────────
   Archive — a filtered grid of compact cards

   One hairline row per repo ran 2.1 screens for 21 repos and left the right
   third of every row empty. Three columns of clamped cards fit the same
   repos in about half the height, and the category chips mean picking a
   category makes the section shorter rather than longer.
   ─────────────────────────────────────────── */
const languageColors = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    'C++': '#f34b7d',
    HTML: '#e34c26',
    CSS: '#563d7c',
    'Jupyter Notebook': '#DA5B0B',
    MATLAB: '#e16737',
    PowerShell: '#012456',
    Shell: '#89e051',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
}

const ALL = 'All'

function ArchiveCard({ repo }) {
    return (
        <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="archive-card group"
        >
            <span className="flex items-start justify-between gap-3">
                <span className="font-display font-semibold text-[14px] leading-snug text-text-primary group-hover:text-accent transition-colors">
                    {repo.title}
                </span>
                <ArrowUpRight
                    size={13}
                    className="flex-shrink-0 mt-0.5 text-text-muted group-hover:text-accent transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
            </span>

            <span className="archive-card__desc">{repo.description}</span>

            <span className="archive-card__foot">
                {repo.language && (
                    <>
                        <span
                            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                            style={{ background: languageColors[repo.language] || '#00d4ff' }}
                        />
                        <span className="text-text-tertiary">{repo.language}</span>
                    </>
                )}
                <span className="ml-auto tabular-nums">{repo.year}</span>
            </span>
        </a>
    )
}

function Archive({ items, categories, count }) {
    const [filter, setFilter] = useState(ALL)
    const prefersReduced = useReducedMotion()

    const shown = useMemo(
        () => (filter === ALL ? items : items.filter((r) => r.category === filter)),
        [items, filter]
    )

    return (
        <>
            <motion.div {...fadeUp} className="archive-filters mb-6">
                <button
                    type="button"
                    onClick={() => setFilter(ALL)}
                    aria-pressed={filter === ALL}
                    className="archive-chip"
                >
                    All
                    <span className="archive-chip__count">{count}</span>
                </button>
                {categories.map(({ category, count: n }) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setFilter(category)}
                        aria-pressed={filter === category}
                        className="archive-chip"
                    >
                        {category}
                        <span className="archive-chip__count">{n}</span>
                    </button>
                ))}
            </motion.div>

            {/*
                `layout` on the cards is what makes filtering read as the grid
                reflowing rather than as a new page — items that survive the
                filter slide to their new slot instead of blinking there.
            */}
            <motion.div layout={!prefersReduced} className="archive-grid">
                <AnimatePresence mode="popLayout" initial={false}>
                    {shown.map((repo) => (
                        <motion.div
                            key={repo.name}
                            layout={!prefersReduced}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <ArchiveCard repo={repo} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>
        </>
    )
}

/* ───────────────────────────────────────────
   Projects Section
   ─────────────────────────────────────────── */
export default function Projects() {
    const { items, categories, count } = useGitHubRepos()

    return (
        <section id="projects" className="relative py-28 sm:py-36">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-8">
                    <p className="section-label">Projects</p>
                    <h2 className="section-title mb-4">
                        Things I've<br />
                        <span className="serif-accent holo-text">built.</span>
                    </h2>
                    <p className="font-body text-text-tertiary text-sm max-w-lg">
                        Three I'll defend line by line, then the rest worth showing.
                    </p>
                </motion.div>

                {/* Featured — three cards of equal height, each opening in place.
                    Inside the container now: a card is content at the standard
                    reading measure, not a surface that has to escape it. */}
                <FeaturedProjects projects={projects} />

                {/* Archive */}
                <motion.div {...fadeUp} className="mt-28 mb-6">
                    <div className="flex items-baseline gap-4">
                        <h3 className="font-heading text-xl font-bold text-text-primary whitespace-nowrap">
                            The <span className="serif-accent holo-text">archive</span>
                        </h3>
                        <div className="h-px flex-1 bg-white/[0.07] self-center" />
                        <a
                            href="https://github.com/zacktiger?tab=repositories"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-underline font-mono text-[11px] tracking-wider"
                        >
                            GitHub
                            <ArrowUpRight size={12} />
                        </a>
                    </div>
                    <p className="font-mono text-[11px] text-text-muted tracking-wide mt-3">
                        {count} selected repositories, with details pulled live from GitHub.
                    </p>
                </motion.div>

                <Archive items={items} categories={categories} count={count} />
            </div>
        </section>
    )
}

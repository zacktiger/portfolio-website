import { useRef, useState, useEffect, useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Github, ArrowUpRight, ChevronDown } from 'lucide-react'

/*
 * FeaturedProjects — the three case studies as a vertical stack of cards that
 * are all exactly the same height.
 *
 * This replaced a pinned horizontal track, and the reason is worth keeping:
 * the card was carrying the resume bullets. At 116 / 85 / 78 words of bullets
 * per project, plus one screenshot, the three cards measured 630 / 646 / 894px
 * against a 768px sticky frame — so the tallest one had 126px of itself cut
 * off with no way to reach it, and mid-transition you watched a card with real
 * edges slide past one that bled off the top and bottom of the screen. They
 * read as two different kinds of object, which is the exact failure the track's
 * bounded-card rule existed to prevent.
 *
 * The fix is a split, not a squeeze. A closed card carries the PITCH — title,
 * stack, a two-sentence thesis, three measurements, two links. The PROOF (the
 * bullets, the corpus the numbers were measured on, the screenshot) sits behind
 * "How it works" and opens in place. Nothing was rewritten to get here; the
 * `description` field was already 19 / 26 / 17 words. It was all just on screen
 * at once.
 *
 * UNIFORM HEIGHT IS STRUCTURAL, not a fixed number. Every row of a closed card
 * reserves its space whether or not it needs it — the title reserves two lines,
 * the thesis three, every metric label two — and each is clamped so it cannot
 * take more. So the cards are identical because their rows are identical, and
 * they stay identical when the copy changes. `.project-card__inner`'s
 * `min-height` is only a floor under all that; deleting it would not reintroduce
 * the bug, and it must NOT be relied on as the mechanism.
 *
 * Cards open independently rather than as an accordion: nothing a reader opened
 * should close itself because they opened something else.
 *
 * What this buys, beyond the cards matching: the section went from 4.66 screens
 * to about 3.3 of a 14-screen page, and find-in-page and the tab order work
 * again. Under the pinned track, off-screen cards were translated out of view
 * rather than unmounted, so tabbing into one threw the page sideways and
 * Ctrl+F could not usefully scroll to anything. That cost was real and is now
 * simply gone — there is one layout here, at every width, with or without
 * `prefers-reduced-motion`.
 */

const reveal = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
}

/** One case study: the pitch always, the proof on request. */
function ProjectCard({ project, index, total }) {
    const cardRef = useRef(null)
    const [isHit, setIsHit] = useState(false)
    const [open, setOpen] = useState(false)
    const panelId = useId()
    const prefersReduced = useReducedMotion()

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

    const hasDetail = project.bullets?.length > 0 || project.scale || project.image

    return (
        <motion.article
            ref={cardRef}
            data-project-id={project.id}
            className={`project-row project-card group relative ${isHit ? 'laser-flash' : ''}`}
            {...reveal}
            transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
                delay: prefersReduced ? 0 : index * 0.08,
            }}
        >
            <div className="project-card__inner">
                <div className="project-card__meta">
                    {/* The whole ordinal is decorative, so it is hidden as one
                        unit — hiding the "01" but not the "/ 03" left a screen
                        reader announcing a bare "slash oh three". */}
                    <span className="contents" aria-hidden="true">
                        <span className="ghost-num">
                            {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-[10.5px] tracking-[0.2em] text-text-muted tabular-nums">
                            / {String(total).padStart(2, '0')}
                        </span>
                    </span>
                    <span className="ml-auto font-mono text-[11px] tracking-[0.2em] uppercase text-accent">
                        {project.date}
                    </span>
                </div>

                <h3 className="project-card__title">{project.title}</h3>
                <p className="project-card__stack">{project.subtitle}</p>
                <p className="project-card__thesis">{project.description}</p>

                {project.metrics?.length > 0 && (
                    <div className="metric-strip">
                        {project.metrics.map((metric) => (
                            <div key={metric.label} className="metric-item">
                                <span className="metric-value">{metric.value}</span>
                                <span className="metric-label">{metric.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pushed to the card's bottom edge by `margin-top: auto`, which
                    is what turns the reserved rows above into equal heights. */}
                <div className="project-card__foot">
                    {hasDetail && (
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-expanded={open}
                            aria-controls={open ? panelId : undefined}
                            className="link-underline font-display text-sm font-medium"
                        >
                            <ChevronDown
                                size={14}
                                style={{
                                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: prefersReduced ? 'none' : 'transform 0.3s ease',
                                }}
                            />
                            How it works
                        </button>
                    )}

                    <div className="project-card__links">
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

                {/*
                    The panel is UNMOUNTED when closed rather than collapsed to
                    zero height. A zero-height `overflow: hidden` box still
                    holds matchable text, so find-in-page would land on prose
                    nobody can see — the same class of problem the old track
                    had.

                    Nothing here animates HEIGHT, and the panel uses no Framer
                    at all: it mounts, a CSS keyframe fades it in, and closing
                    unmounts it outright.

                    That is a deliberate choice rather than a discovered bug.
                    Animating to `height: 'auto'` means measuring the element
                    first, and measurement is the part that broke: with the
                    panel shrinkable (see `flex: none` in index.css) the
                    measured height collapsed to zero and the panel latched
                    there — `aria-expanded` read true, the chevron flipped, and
                    nothing opened. `flex: none` fixes that specific collapse,
                    but the layout here has no need to animate its own height
                    to begin with, and not measuring is strictly more robust
                    than measuring correctly. The layout lands instantly and
                    only opacity and offset animate.

                    Keeping the fade in CSS rather than JS is the same
                    reasoning applied once more: expanding a card changes the
                    body height, which wakes the ResizeObserver SectionPath
                    keeps on `document.body`, and the `measure()` that follows
                    rebuilds a 512-sample length table with `getPointAtLength`.
                    A composited CSS animation is indifferent to how busy the
                    main thread is; a rAF-driven one is not.
                */}
                {open && hasDetail && (
                    <div id={panelId} className="project-card__panel">
                        <div className="project-card__detail">
                            {project.scale && (
                                <p className="project-card__scale">{project.scale}</p>
                            )}

                            {project.bullets?.length > 0 && (
                                <ul className="space-y-3 max-w-3xl">
                                    {project.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="w-1 h-1 rounded-full bg-accent mt-[9px] flex-shrink-0" />
                                            <span className="text-[13.5px] text-text-tertiary leading-[1.7]">
                                                {bullet}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Supporting evidence, not the headline — which is
                                why it lives in here. Its height used to be the
                                single biggest reason the cards disagreed. */}
                            {project.image && (
                                <a
                                    href={project.live || project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${project.title} preview`}
                                    className="block mt-8 max-w-xl"
                                >
                                    <div className="project-visual aspect-[16/10]">
                                        <img
                                            src={project.image}
                                            alt={`${project.title} preview`}
                                            loading="lazy"
                                        />
                                    </div>
                                </a>
                            )}

                        <p className="project-card__tags">
                            {project.tags.join('  /  ')}
                        </p>
                        </div>
                    </div>
                )}
            </div>
        </motion.article>
    )
}

export default function FeaturedProjects({ projects }) {
    return (
        <div className="featured-stack">
            {projects.map((project, i) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    index={i}
                    total={projects.length}
                />
            ))}
        </div>
    )
}

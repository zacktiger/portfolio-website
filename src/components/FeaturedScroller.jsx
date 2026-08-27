import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { motion, useScroll, useTransform, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import { Github, ArrowUpRight } from 'lucide-react'

/*
 * FeaturedScroller — the three case studies as a pinned horizontal track.
 *
 * A wrapper N×100vh tall holds a `sticky` viewport-height frame. Scroll
 * progress through that wrapper drives the track's translateX, so scrolling
 * DOWN moves the cards SIDEWAYS. Framer Motion's `useScroll` reads the
 * progress; nothing here hijacks or animates the scroll position itself, so
 * the scrollbar stays honest and the browser keeps its native scrolling.
 *
 * Three things make the sideways motion legible, and they are the whole point
 * of the layout:
 *
 *   · A card is a BOUNDED SURFACE, not the viewport. It is capped at
 *     `CARD_MAX` and never wider than `vw - 2 × LANE`, so it always sits
 *     inside its own panel with real gutters. A full-bleed card has no edges,
 *     so mid-transition you saw the tail of one case study and the head of the
 *     next with nothing between them — it read as a broken page rather than as
 *     two objects sliding past.
 *   · The neighbour PEEKS. Because the card is narrower than the viewport, the
 *     next one is already visible at the edge — the affordance that says the
 *     track goes sideways, without an arrow or a caption.
 *   · Off-centre cards DIM AND SHRINK, so at any moment exactly one card is
 *     the subject and the others are context.
 *
 * The scroll→track map is DETENTED rather than linear: each card holds its
 * centred position for a stretch of scroll (`HOLD`) and the movement happens
 * in between. That reads as snapping without taking the scroll away from the
 * user — no scroll-jacking, no `scroll-snap` fighting the rest of the page.
 * For the same reason the track does not advance on a timer: auto-forwarding
 * carousels measurably hurt comprehension, and anything moving on its own for
 * more than five seconds owes the user a pause control (WCAG 2.2.2).
 *
 * `LANE` is the reserved gutter on each side. It is not decoration: the
 * SectionPath ribbon runs at roughly ±(w/2 − 130) and the dock nav sits ~24px
 * off the right edge, so a card wider than `vw - 2 × LANE` would collide with
 * both. That is what used to clip the metric labels behind the dock icons.
 *
 * Three fallbacks, all of which render the same cards in a plain vertical
 * stack:
 *   · below `lg` — a viewport-width card on a phone is unreadable, and
 *     horizontal pinning fights native touch scrolling
 *   · `prefers-reduced-motion` — the whole effect IS the motion
 *   · no JS / before hydration — `pinned` starts false
 *
 * Known cost, stated plainly: off-screen cards are translated out of view, not
 * unmounted, so they're in the DOM but browser find-in-page can't scroll to
 * them usefully, and tabbing into a card that isn't on screen will jump the
 * page. That's inherent to the pattern, not to this implementation. The
 * progress bar below the track is a real control for the same reason — click a
 * segment to scroll to that card.
 */

const CARD_MAX = 1100 // matches .content-container's max-width — same reading measure
const CARD_MIN = 560
const LANE = 190 // gutter kept clear each side for the ribbon and the dock nav
const GAP = 40
const HOLD = 0.11 // half-width, in scroll progress, of a card's detent

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const linear = (t) => t
const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** One case study, laid out to fit inside a single bounded card. */
function ProjectCard({ project, index, total, pinned, width, pos }) {
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

    /*
     * Falloff either side of the centred card.
     *
     * Deliberately flat through the middle and steep at the edges. A plain
     * linear ramp put BOTH cards at ~60% halfway through a move — the whole
     * screen dimmed at exactly the moment there was most to look at. The job
     * of the dim is to say "this one is the subject" when a card is parked
     * off-centre; mid-move there is no subject, so nothing should dim.
     *
     * Hooks run unconditionally; the values are simply not applied in the
     * unpinned fallback.
     */
    const range = [index - 1, index - 0.6, index, index + 0.6, index + 1]
    const opacity = useTransform(pos, range, [0.25, 0.85, 1, 0.85, 0.25])
    const scale = useTransform(pos, range, [0.93, 0.985, 1, 0.985, 0.93])
    const [isActive, setIsActive] = useState(index === 0)
    useMotionValueEvent(pos, 'change', (v) => {
        setIsActive(Math.round(v) === index)
    })

    const Wrapper = pinned ? motion.article : 'article'
    // An off-centre card is dimmed to 25% and half off-screen, so it must not
    // swallow clicks meant for the subject. `pointer-events` only — NOT
    // `aria-hidden`: all three case studies stay in the accessibility tree and
    // in the tab order, because a screen reader reads the track linearly and
    // has no notion of which card is "centred".
    const motionProps = pinned ? { style: { width, opacity, scale } } : {}

    return (
        <Wrapper
            ref={cardRef}
            data-project-id={project.id}
            className={`project-row group relative flex-shrink-0 ${
                pinned ? 'project-card' : 'w-full py-16 sm:py-20'
            } ${isHit ? 'laser-flash' : ''} ${pinned && !isActive ? 'project-card--away' : ''}`}
            {...motionProps}
        >
            <div className={pinned ? 'project-card__inner' : 'content-container'}>
                <div className="grid lg:grid-cols-12 gap-x-10 xl:gap-x-14 gap-y-8">
                    {/* Identity and the three measurements */}
                    <div className="lg:col-span-4">
                        <div className="flex items-baseline gap-4 mb-3">
                            <span
                                className="ghost-num hidden lg:block"
                                aria-hidden="true"
                                style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)' }}
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {pinned && (
                                <span className="font-mono text-[10.5px] tracking-[0.2em] text-text-muted tabular-nums">
                                    / {String(total).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent mb-3">
                            {project.date}
                        </p>
                        <h3
                            className="font-heading font-bold text-2xl text-text-primary mb-2"
                            style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
                        >
                            {project.title}
                        </h3>
                        <p className="font-mono text-[11.5px] tracking-wide text-text-muted">
                            {project.subtitle}
                        </p>

                        {project.metrics?.length > 0 && (
                            <div className="metric-stack">
                                {project.metrics.map((metric) => (
                                    <div key={metric.label} className="metric-item">
                                        <span className="metric-value">{metric.value}</span>
                                        <span className="metric-label">{metric.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {project.scale && (
                            <p className="font-mono text-[10.5px] text-text-muted leading-[1.7] mt-4">
                                {project.scale}
                            </p>
                        )}
                    </div>

                    {/* The prose */}
                    <div className="lg:col-span-8 relative z-10">
                        <p className="font-body text-[15px] text-text-secondary leading-[1.75] max-w-2xl mb-8">
                            {project.description}
                        </p>

                        {project.image && (
                            <a
                                href={project.live || project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${project.title} preview`}
                                className="block mb-8 max-w-xl"
                            >
                                <div className="project-visual aspect-[16/10]">
                                    <img
                                        src={project.image}
                                        alt={project.imageAlt || `${project.title} preview`}
                                        loading="lazy"
                                    />
                                </div>
                            </a>
                        )}

                        <ul className="space-y-3 mb-7 max-w-3xl">
                            {project.bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="w-1 h-1 rounded-full bg-accent mt-[9px] flex-shrink-0" />
                                    <span className="text-[13.5px] text-text-tertiary leading-[1.7]">
                                        {bullet}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="font-mono text-[11px] tracking-wide text-text-muted mb-7">
                            {project.tags.join('  /  ')}
                        </p>

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
                </div>
            </div>
        </Wrapper>
    )
}

export default function FeaturedScroller({ projects }) {
    const wrapRef = useRef(null)
    const prefersReduced = useReducedMotion()
    const [vw, setVw] = useState(0)

    useEffect(() => {
        const read = () => setVw(document.documentElement.clientWidth)
        read()
        window.addEventListener('resize', read)
        return () => window.removeEventListener('resize', read)
    }, [])

    const total = projects.length
    const pinned = vw >= 1024 && !prefersReduced

    // A card never grows past the reading measure, and never past the space
    // left over once both gutters are reserved.
    const cardW = pinned
        ? Math.max(CARD_MIN, Math.min(CARD_MAX, vw - LANE * 2))
        : 0
    const step = cardW + GAP
    const lead = (vw - cardW) / 2 // centres card 0 in the frame

    // Progress from the moment the wrapper's top hits the viewport top to the
    // moment its bottom does — exactly the span over which the frame is stuck.
    const { scrollYProgress } = useScroll({
        target: wrapRef,
        offset: ['start start', 'end end'],
    })

    // Detented scroll→card map: flat while a card is centred, eased in between.
    const detent = useMemo(() => {
        const input = []
        const output = []
        for (let i = 0; i < total; i++) {
            const c = total === 1 ? 0 : i / (total - 1)
            input.push(clamp01(c - HOLD))
            output.push(i)
            input.push(clamp01(c + HOLD))
            output.push(i)
        }
        for (let i = 1; i < input.length; i++) {
            if (input[i] <= input[i - 1]) input[i] = input[i - 1] + 1e-4
        }
        // Even segments sit inside a card's hold; odd segments are the moves.
        const ease = input.slice(1).map((_, j) => (j % 2 === 0 ? linear : easeInOutCubic))
        return { input, output, ease }
    }, [total])

    const pos = useTransform(scrollYProgress, detent.input, detent.output, {
        ease: detent.ease,
    })
    const x = useTransform(pos, (v) => lead - v * step)

    // Discrete card index for the progress readout.
    const [active, setActive] = useState(0)
    useMotionValueEvent(pos, 'change', (v) => {
        setActive(Math.max(0, Math.min(total - 1, Math.round(v))))
    })

    // Clicking a segment scrolls to that card's detent centre.
    const goTo = useCallback(
        (i) => {
            const el = wrapRef.current
            if (!el) return
            const top = el.getBoundingClientRect().top + window.scrollY
            const span = Math.max(el.offsetHeight - window.innerHeight, 0)
            const c = total === 1 ? 0 : i / (total - 1)
            window.scrollTo({ top: top + c * span, behavior: 'smooth' })
        },
        [total]
    )

    return (
        <div
            ref={wrapRef}
            style={pinned ? { height: `${total * 100}vh` } : undefined}
        >
            <div
                className={
                    pinned
                        ? 'sticky top-0 h-screen flex items-center overflow-hidden'
                        : ''
                }
            >
                {/*
                    The mask has to sit on a STATIC wrapper, not on the track:
                    a mask painted on the moving element travels with it and
                    would fade the middle of a card as it slid past.
                */}
                <div className={pinned ? 'track-mask w-full' : ''}>
                    <motion.div
                        className={pinned ? 'flex items-center' : 'divide-y divide-white/[0.06]'}
                        style={pinned ? { gap: GAP, x, willChange: 'transform' } : undefined}
                    >
                        {projects.map((project, i) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                index={i}
                                total={total}
                                pinned={pinned}
                                width={cardW}
                                pos={pos}
                            />
                        ))}
                    </motion.div>
                </div>

                {/* Where am I in the track, and a way to move through it —
                    a pinned frame gives no other clue and no other control. */}
                {pinned && (
                    <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                        <div
                            className="flex items-center gap-3"
                            style={{ width: cardW }}
                        >
                            {projects.map((project, i) => (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => goTo(i)}
                                    aria-label={`Go to ${project.title}`}
                                    aria-current={i === active ? 'true' : undefined}
                                    className="track-tick"
                                >
                                    <span
                                        className="track-tick__bar"
                                        style={{
                                            background:
                                                i <= active
                                                    ? 'var(--color-accent)'
                                                    : 'rgba(255,255,255,0.12)',
                                        }}
                                    />
                                </button>
                            ))}
                            <span className="font-mono text-[10.5px] text-text-muted tabular-nums ml-2">
                                {String(active + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

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

const CARD_MAX = 980 // narrower than .content-container: the card is a panel, not the page
const CARD_MIN = 560
const LANE = 190 // gutter kept clear each side for the ribbon and the dock nav
const GAP = 40

/*
 * Card height is fixed for the whole track, and that is a correctness rule
 * rather than a nicety.
 *
 * The cards do not all want the same height — the one with a screenshot ran
 * 857px against 637px for the two without, and in a frame where cards slide
 * PAST each other a 220px height difference reads as the frame itself jolting.
 * Worse, the frame is `overflow-hidden` and exactly one viewport tall: at
 * 1366x768 that 857px card measured 894px, hung 63px off each end, and had its
 * opening line sliced in half and its Code / Live Demo links cut off with no
 * way to scroll to them.
 *
 * So the track picks one height every card is laid out to, derived from the
 * viewport rather than from the tallest card's content:
 *
 *   · RESERVE is the space below the card the progress ticks live in. They sit
 *     at `bottom: 40px` and are ~21px tall, so anything less than ~76px puts
 *     them ON the card — which is what used to draw the tick bar straight
 *     through the tag line. Doubled, to keep the same air above the card.
 *   · CARD_H_MAX stops a tall desktop window from inflating a card to 900px of
 *     mostly-empty panel.
 *   · CARD_H_MIN is the floor below which the layout stops being worth pinning
 *     at all; under it the component falls back to the vertical stack.
 *
 * Content that would exceed the height is absorbed by the card's one flexible
 * element (the optional screenshot — see `.project-card__figure`), never by
 * clipping prose.
 */
const RESERVE = 168
const CARD_H_MAX = 700
const CARD_H_MIN = 520

/*
 * How much of the track's scroll is spent MOVING, per transition.
 *
 * The rest is stillness, split evenly between the cards. With three cards and
 * MOVE = 0.18 that is two 18% moves and three ~21.5% holds — 65% of the
 * section's scroll leaves the card exactly where it is, so a reader can scroll
 * at their own pace through a case study without the thing they are reading
 * sliding out from under them. The previous map held a card for 11% and spent
 * 56% of the section in motion, which is why every scroll gesture moved the
 * cards.
 */
const MOVE = 0.18

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const linear = (t) => t
const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/** One case study, laid out to fit inside a single bounded card. */
function ProjectCard({ project, index, total, pinned, width, height, pos }) {
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
    const motionProps = pinned ? { style: { width, height, opacity, scale } } : {}

    return (
        <Wrapper
            data-project-id={project.id}
            className={`project-row group relative flex-shrink-0 ${
                pinned ? 'project-card' : 'w-full py-16 sm:py-20'
            } ${pinned && !isActive ? 'project-card--away' : ''}`}
            {...motionProps}
        >
            <div className={pinned ? 'project-card__inner' : 'content-container'}>
                <div className="grid lg:grid-cols-12 gap-x-10 xl:gap-x-14 gap-y-8 h-full">
                    {/* Identity and the three measurements */}
                    <div className="lg:col-span-4 flex flex-col min-h-0">
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
                    <div className="lg:col-span-8 relative z-10 min-h-0 flex flex-col">
                        <p className="font-body text-[15px] text-text-secondary leading-[1.75] max-w-2xl mb-8">
                            {project.description}
                        </p>

                        <ul className="space-y-3 mb-6 max-w-3xl">
                            {project.bullets.map((bullet, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="w-1 h-1 rounded-full bg-accent mt-[9px] flex-shrink-0" />
                                    <span className="text-[13.5px] text-text-tertiary leading-[1.7]">
                                        {bullet}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/*
                            Supporting evidence, and the one element on the card
                            allowed to change size. Every other child here is
                            intrinsically sized, so this is what absorbs the
                            difference between a case study's natural height and
                            the single height the whole track is laid out to —
                            which is how three cards share one height without a
                            word of prose being clipped. A short window drops the
                            picture rather than the sentence (see
                            `.project-card__figure`).

                            It sits after the argument and before the credits on
                            purpose: in the prose column it had been wedged
                            between the opening line and the bullets, which put a
                            screenshot in front of the point it was meant to
                            support.
                        */}
                        {project.image && (
                            <a
                                href={project.live || project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${project.title} preview`}
                                className={
                                    pinned
                                        ? 'project-card__figure'
                                        : 'block mb-8 max-w-xl'
                                }
                            >
                                <div className={pinned ? 'project-visual h-full' : 'project-visual aspect-[16/10]'}>
                                    <img
                                        src={project.image}
                                        alt={`${project.title} preview`}
                                        loading="lazy"
                                    />
                                </div>
                            </a>
                        )}

                        {/*
                            Stack and links, pinned to the foot of the column.
                            `mt-auto` is what keeps the three cards' credit rows
                            on ONE baseline now that they share a height: the
                            card with a screenshot has a flexible figure that
                            already pushes its links down, and without this the
                            two cards without one left their links floating
                            mid-card above ~190px of hole.
                        */}
                        <div className="mt-auto">
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
            </div>
        </Wrapper>
    )
}

export default function FeaturedScroller({ projects }) {
    const wrapRef = useRef(null)
    const prefersReduced = useReducedMotion()
    const [vw, setVw] = useState(0)
    const [vh, setVh] = useState(0)

    useEffect(() => {
        const read = () => {
            setVw(document.documentElement.clientWidth)
            setVh(window.innerHeight)
        }
        read()
        window.addEventListener('resize', read)
        return () => window.removeEventListener('resize', read)
    }, [])

    const total = projects.length

    // One height for every card in the track, from the viewport rather than
    // from the tallest card's content — see RESERVE / CARD_H_MAX above. Below
    // CARD_H_MIN there is no height worth pinning to, so the whole effect
    // steps aside for the vertical stack rather than shipping a cramped one.
    const cardH = Math.min(CARD_H_MAX, vh - RESERVE)
    const pinned = vw >= 1024 && cardH >= CARD_H_MIN && !prefersReduced

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

    /*
     * Detented scroll→card map: flat while a card is centred, eased in between.
     *
     * Built from MOVE rather than from evenly-spaced centres, so the holds are
     * an explicit budget instead of whatever is left over. Each of the
     * `total - 1` transitions gets MOVE of the track's progress; the remainder
     * is stillness divided equally among the cards, and each card's hold is
     * laid down as two identical output values so the segment between them is
     * genuinely flat — scrolling through it advances the page and moves
     * nothing.
     */
    const detent = useMemo(() => {
        const moves = Math.max(total - 1, 0)
        // Guard the degenerate case: enough cards that the moves alone would
        // eat the whole track leaves no hold to give anyone.
        const moveSpan = moves > 0 ? Math.min(MOVE, 1 / (moves + 1)) : 0
        const hold = (1 - moveSpan * moves) / total

        const input = []
        const output = []
        let cursor = 0
        for (let i = 0; i < total; i++) {
            input.push(clamp01(cursor))
            output.push(i)
            cursor += hold
            input.push(clamp01(cursor))
            output.push(i)
            cursor += moveSpan
        }
        for (let i = 1; i < input.length; i++) {
            if (input[i] <= input[i - 1]) input[i] = input[i - 1] + 1e-4
        }
        // Even segments sit inside a card's hold; odd segments are the moves.
        const ease = input.slice(1).map((_, j) => (j % 2 === 0 ? linear : easeInOutCubic))
        // Where each card's hold is centred, for the tick buttons to scroll to.
        const centres = []
        for (let i = 0; i < total; i++) centres.push(i * (hold + moveSpan) + hold / 2)
        return { input, output, ease, centres }
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

    // Clicking a segment scrolls to the middle of that card's hold — the
    // detent centre, which is no longer i/(total-1) now that the holds are
    // budgeted rather than evenly spaced.
    const goTo = useCallback(
        (i) => {
            const el = wrapRef.current
            if (!el) return
            const top = el.getBoundingClientRect().top + window.scrollY
            const span = Math.max(el.offsetHeight - window.innerHeight, 0)
            window.scrollTo({ top: top + (detent.centres[i] ?? 0) * span, behavior: 'smooth' })
        },
        [detent]
    )

    return (
        <div
            ref={wrapRef}
            // `relative` is required, not cosmetic: useScroll measures its
            // target against the nearest positioned ancestor, and framer-motion
            // warns that a static one gives it the wrong scroll offset.
            className="relative"
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
                                height={cardH}
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

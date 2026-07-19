import { motion } from 'framer-motion'
import { PenLine, ArrowUpRight, Clock, Rss } from 'lucide-react'
import SpotlightCard from './SpotlightCard'
import { posts, writingProfile } from '../data/portfolioData'

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

function formatDate(iso) {
    if (!iso) return null
    const d = new Date(iso + 'T00:00:00')
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString('en', { month: 'short', year: 'numeric' })
}

/* ───────────────────────────────────────────
   Article card (used once posts exist)
   ─────────────────────────────────────────── */
function PostCard({ post, index }) {
    const date = formatDate(post.date)
    return (
        <motion.a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="block group"
        >
            <SpotlightCard className="h-full flex flex-col overflow-hidden">
                {/* Cover — image or gradient fallback */}
                <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.06]">
                    {post.cover ? (
                        <img
                            src={post.cover}
                            alt={`${post.title} cover`}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    'radial-gradient(120% 120% at 0% 0%, rgba(0,212,255,0.14), transparent 55%), #131313',
                            }}
                        />
                    )}
                    {post.tag && (
                        <span className="absolute top-3 left-3 font-mono text-[9.5px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-sm border border-white/[0.08] text-accent">
                            {post.tag}
                        </span>
                    )}
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider text-text-tertiary mb-3">
                        {date && <span>{date}</span>}
                        {date && post.readMinutes && <span className="text-text-muted">•</span>}
                        {post.readMinutes && (
                            <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {post.readMinutes} min read
                            </span>
                        )}
                    </div>
                    <h3 className="font-heading font-bold text-lg text-text-primary leading-snug mb-2 group-hover:text-accent transition-colors">
                        {post.title}
                    </h3>
                    {post.blurb && (
                        <p className="font-body text-[13.5px] text-text-tertiary leading-relaxed">
                            {post.blurb}
                        </p>
                    )}
                    <span className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-1.5 font-display text-[13px] font-medium text-text-secondary group-hover:text-accent transition-colors">
                        Read article
                        <ArrowUpRight
                            size={13}
                            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                    </span>
                </div>
            </SpotlightCard>
        </motion.a>
    )
}

/* ───────────────────────────────────────────
   Coming-soon empty state
   ─────────────────────────────────────────── */
function ComingSoon() {
    return (
        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
            <SpotlightCard className="p-8 sm:p-12" glowSize={500} glowAlpha={0.05}>
                <div className="flex flex-col items-center text-center">
                    <div className="inline-flex p-3 rounded-xl bg-accent-dim border border-accent-mid/40 mb-6">
                        <PenLine size={20} className="text-accent" />
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-accent mb-4">
                        Coming soon
                    </span>
                    <h3 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary mb-3">
                        Notes are on the way.
                    </h3>
                    <p className="font-body text-text-tertiary text-[15px] leading-relaxed max-w-md">
                        I'm putting together write-ups on the systems I build —
                        auth flows, multi-tenant architecture, real-time pipelines, and
                        the trade-offs behind them. Check back shortly.
                    </p>

                    {/* Ghosted placeholder rows hinting the future layout */}
                    <div className="w-full max-w-lg mt-10 space-y-3" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.05]"
                                style={{ opacity: 1 - i * 0.28 }}
                            >
                                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-2.5 rounded-full bg-white/[0.06]" style={{ width: `${70 - i * 12}%` }} />
                                    <div className="h-2 rounded-full bg-white/[0.035]" style={{ width: `${45 - i * 8}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {writingProfile.url && (
                        <a
                            href={writingProfile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cta-button-ghost mt-10"
                            style={{ padding: '11px 24px', fontSize: '13px' }}
                        >
                            <Rss size={14} />
                            Follow on {writingProfile.platform}
                        </a>
                    )}
                </div>
            </SpotlightCard>
        </motion.div>
    )
}

/* ───────────────────────────────────────────
   Writing Section
   ─────────────────────────────────────────── */
export default function Writing() {
    const hasPosts = posts.length > 0

    return (
        <section id="writing" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-12 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <p className="section-label">Writing</p>
                        <h2 className="section-title mb-3">
                            Notes &amp;<br />
                            <span className="serif-accent">ideas.</span>
                        </h2>
                        <p className="font-body text-text-tertiary text-sm max-w-md">
                            Long-form write-ups on architecture, backend systems, and the
                            engineering decisions behind my projects.
                        </p>
                    </div>

                    {hasPosts && writingProfile.url && (
                        <a
                            href={writingProfile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-underline font-mono text-[11px] tracking-wider"
                        >
                            Read all on {writingProfile.platform}
                            <ArrowUpRight size={12} />
                        </a>
                    )}
                </motion.div>

                {hasPosts ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posts.map((post, i) => (
                            <PostCard key={post.url || post.title} post={post} index={i} />
                        ))}
                    </div>
                ) : (
                    <ComingSoon />
                )}
            </div>
        </section>
    )
}

import { motion } from 'framer-motion'
import { skillCategories } from '../data/portfolioData'

/* ───────────────────────────────────────────
   Skills Section — editorial table, no boxes
   ─────────────────────────────────────────── */
const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

function SkillRow({ category, index, isLast }) {
    const Icon = category.icon
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className={`group grid sm:grid-cols-[220px_1fr] gap-x-8 gap-y-2 py-7 ${!isLast ? 'hairline' : ''}`}
        >
            {/* Category label */}
            <div className="flex items-center gap-2.5 self-start">
                <Icon size={14} className="text-accent/70 group-hover:text-accent transition-colors" strokeWidth={1.8} />
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-text-tertiary group-hover:text-text-secondary transition-colors">
                    {category.title}
                </span>
            </div>

            {/* Skills flow */}
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
                {category.skills.map((skill, i) => (
                    <span key={skill} className="inline-flex items-baseline">
                        <span className="font-display text-[15px] sm:text-base text-text-secondary hover:text-accent transition-colors duration-300 cursor-default">
                            {skill}
                        </span>
                        {i < category.skills.length - 1 && (
                            <span className="mx-2 text-text-muted text-xs select-none" aria-hidden="true">·</span>
                        )}
                    </span>
                ))}
            </div>
        </motion.div>
    )
}

export default function Skills() {
    return (
        <section id="skills" className="relative py-28 sm:py-36">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-10">
                    <p className="section-label">Skills</p>
                    <h2 className="section-title">
                        Tools I work<br />
                        <span className="serif-accent holo-text">with daily.</span>
                    </h2>
                </motion.div>

                {/* Editorial table */}
                <div className="border-t border-white/[0.07]">
                    {skillCategories.map((cat, i) => (
                        <SkillRow
                            key={cat.title}
                            category={cat}
                            index={i}
                            isLast={i === skillCategories.length - 1}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

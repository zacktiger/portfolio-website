import { motion } from 'framer-motion'
import { skillCategories } from '../data/portfolioData'
import SpotlightCard from './SpotlightCard'

/* ───────────────────────────────────────────
   Skill Item
   ─────────────────────────────────────────── */
function SkillItem({ name, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="group flex items-center gap-3 py-1.5 px-2.5 rounded-md hover:bg-white/[0.02] transition-colors"
        >
            <div className="w-1.5 h-1.5 rounded-full bg-accent/40 group-hover:bg-accent transition-colors flex-shrink-0" />
            <span className="font-display text-[13px] text-text-secondary group-hover:text-text-primary transition-colors">
                {name}
            </span>
        </motion.div>
    )
}

/* ───────────────────────────────────────────
   Skills Section
   ─────────────────────────────────────────── */
const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

export default function Skills() {
    return (
        <section id="skills" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-12">
                    <p className="section-label">Skills</p>
                    <h2 className="section-title">
                        Tools I work<br />
                        <span className="text-accent">with daily.</span>
                    </h2>
                </motion.div>

                {/* Skills grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {skillCategories.map((cat, catIndex) => {
                        const Icon = cat.icon
                        return (
                            <motion.div
                                key={cat.title}
                                {...fadeUp}
                                transition={{ ...fadeUp.transition, delay: catIndex * 0.06 }}
                            >
                                <SpotlightCard className="p-5 sm:p-6 h-full" glowSize={350} glowAlpha={0.05}>
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="p-1.5 rounded-lg bg-accent-dim border border-accent-mid/40">
                                            <Icon size={14} className="text-accent" />
                                        </div>
                                        <h3 className="font-heading text-[13px] font-semibold tracking-wide text-text-primary">
                                            {cat.title}
                                        </h3>
                                    </div>

                                    <div className="space-y-0">
                                        {cat.skills.map((skill, i) => (
                                            <SkillItem
                                                key={skill}
                                                name={skill}
                                                delay={catIndex * 0.04 + i * 0.03}
                                            />
                                        ))}
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}

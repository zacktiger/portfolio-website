import { motion } from 'framer-motion'
import { ArrowUpRight, FileText } from 'lucide-react'
import { contactInfo } from '../data/portfolioData'

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

export default function Contact() {
    return (
        <section id="contact" className="relative py-32 sm:py-44">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-14">
                    <p className="section-label">Contact</p>
                    <h2 className="section-title">
                        Let's work<br />
                        <span className="serif-accent">together.</span>
                    </h2>
                </motion.div>

                {/* Giant mailto */}
                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="mb-16">
                    <p className="font-body text-text-tertiary text-sm max-w-md mb-8">
                        Open to internships, collaborations, and interesting engineering
                        challenges. The fastest way to reach me:
                    </p>
                    <a
                        href={`mailto:${contactInfo.email}`}
                        className="group inline-block"
                    >
                        <span
                            className="font-display font-medium text-text-primary transition-colors duration-300 group-hover:text-accent break-all"
                            style={{ fontSize: 'clamp(1.4rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
                        >
                            {contactInfo.email}
                        </span>
                        <span className="block h-[2px] mt-3 bg-white/15 relative overflow-hidden">
                            <span className="absolute inset-y-0 left-0 w-full bg-accent origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                        </span>
                    </a>
                </motion.div>

                {/* Inline links */}
                <motion.div
                    {...fadeUp}
                    transition={{ ...fadeUp.transition, delay: 0.2 }}
                    className="flex flex-wrap items-center gap-x-10 gap-y-5"
                >
                    <a
                        href={contactInfo.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline font-display text-sm font-medium"
                    >
                        GitHub
                        <ArrowUpRight size={13} />
                    </a>
                    <a
                        href={contactInfo.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline font-display text-sm font-medium"
                    >
                        LinkedIn
                        <ArrowUpRight size={13} />
                    </a>
                    <a
                        href="/resume.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-underline font-display text-sm font-medium text-accent"
                    >
                        <FileText size={14} />
                        Resume
                        <ArrowUpRight size={13} />
                    </a>
                </motion.div>
            </div>
        </section>
    )
}

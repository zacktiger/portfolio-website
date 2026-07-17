import { useEffect, useState } from 'react'
import { ArrowLeft, Download, Printer, Mail, Linkedin, Github, MapPin } from 'lucide-react'
import { skillCategories, projects, achievements, contactInfo } from '../data/portfolioData'
import './resume.css'

// If you drop a real file in as public/resume.pdf, the toolbar downloads it.
// Otherwise "Download PDF" falls back to printing this typeset page.
const PDF_SRC = '/resume.pdf'

function Section({ label, children }) {
    return (
        <section className="resume-section">
            <h2 className="resume-section-label">{label}</h2>
            {children}
        </section>
    )
}

export default function ResumePage() {
    // Detect whether a real PDF exists so we don't link to Vite's SPA fallback.
    const [pdfAvailable, setPdfAvailable] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(PDF_SRC, { method: 'HEAD' })
            .then(res => {
                const type = res.headers.get('content-type') || ''
                if (!cancelled) setPdfAvailable(res.ok && type.includes('pdf'))
            })
            .catch(() => {
                if (!cancelled) setPdfAvailable(false)
            })
        return () => { cancelled = true }
    }, [])

    return (
        <div className="resume-page min-h-screen bg-bg text-text-primary">
            {/* Toolbar — hidden in print */}
            <div className="no-print sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-border">
                <div className="max-w-[860px] mx-auto px-6 py-4 flex items-center justify-between">
                    <a
                        href="/"
                        className="link-underline font-display text-sm font-medium"
                    >
                        <ArrowLeft size={15} />
                        Back to portfolio
                    </a>
                    {pdfAvailable ? (
                        <a
                            href={PDF_SRC}
                            download
                            className="cta-button"
                            style={{ padding: '9px 20px', fontSize: '13px' }}
                        >
                            <Download size={14} />
                            Download PDF
                        </a>
                    ) : (
                        <button
                            onClick={() => window.print()}
                            className="cta-button"
                            style={{ padding: '9px 20px', fontSize: '13px' }}
                        >
                            <Printer size={14} />
                            Print / Save PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Sheet */}
            <div className="resume-sheet max-w-[860px] mx-auto px-6 sm:px-10 py-12 sm:py-16">
                {/* Header */}
                <header className="mb-10">
                    <h1
                        className="font-heading font-bold text-4xl sm:text-5xl mb-2"
                        style={{ letterSpacing: '-0.03em' }}
                    >
                        Kshitij Bachhav
                    </h1>
                    <p className="font-display text-base resume-dim mb-5">
                        Software Development Engineer — Full Stack & Backend
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[12px] resume-dim">
                        <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-1.5 hover:text-accent transition-colors">
                            <Mail size={12} /> {contactInfo.email}
                        </a>
                        <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-accent transition-colors">
                            <Linkedin size={12} /> linkedin.com/in/KshitijBachhav
                        </a>
                        <a href={contactInfo.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-accent transition-colors">
                            <Github size={12} /> github.com/zacktiger
                        </a>
                        <span className="flex items-center gap-1.5">
                            <MapPin size={12} /> Nagpur, MH, India
                        </span>
                    </div>
                </header>

                <Section label="Education">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <h3 className="font-display font-semibold text-[15px]">
                                Indian Institute of Information Technology (IIIT), Nagpur
                            </h3>
                            <p className="text-[13.5px] resume-dim mt-0.5">
                                B.Tech in Internet of Things (IoT)
                            </p>
                        </div>
                        <span className="font-mono text-[12px] resume-dim">2023 – 2027</span>
                    </div>
                </Section>

                <Section label="Projects">
                    <div className="space-y-7">
                        {projects.map(project => (
                            <article key={project.id} className="resume-item">
                                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                                    <h3 className="font-display font-semibold text-[15px]">
                                        {project.title}
                                    </h3>
                                    <span className="font-mono text-[12px] resume-dim">{project.date}</span>
                                </div>
                                <p className="font-mono text-[11.5px] text-accent mb-2">
                                    {project.subtitle}
                                </p>
                                <ul className="space-y-1.5">
                                    {project.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-[13px] leading-[1.65] resume-dim">
                                            <span className="resume-bullet mt-[8px]" />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </Section>

                <Section label="Technical Skills">
                    <div className="space-y-2">
                        {skillCategories.map(cat => (
                            <p key={cat.title} className="text-[13.5px] leading-[1.7]">
                                <span className="font-display font-semibold">{cat.title}: </span>
                                <span className="resume-dim">{cat.skills.join(', ')}</span>
                            </p>
                        ))}
                    </div>
                </Section>

                <Section label="Achievements">
                    <ul className="space-y-2">
                        {achievements.map((ach, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.65]">
                                <span className="resume-bullet mt-[9px]" />
                                <span>
                                    <span className="font-display font-semibold">{ach.title}. </span>
                                    <span className="resume-dim">{ach.description}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            </div>
        </div>
    )
}

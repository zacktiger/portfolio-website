import { Github, Linkedin, Mail, FileText } from 'lucide-react'

export default function Footer() {
    const quickLinks = ['Home', 'About', 'Skills', 'Projects', 'GitHub', 'Contact']

    return (
        <footer className="relative z-10 px-0 pt-16 pb-8 border-t border-border">
            <div className="content-container">
                <div className="grid sm:grid-cols-3 gap-10 mb-12">
                    {/* Brand */}
                    <div>
                        <span className="font-heading text-lg tracking-widest font-bold text-accent">
                            KB<span className="text-text-muted">.DEV</span>
                        </span>
                        <p className="mt-3 text-sm leading-relaxed text-text-muted">
                            Software Development Engineer.
                            <br />
                            Full Stack & Backend Developer.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-tertiary mb-4">
                            Navigation
                        </h4>
                        <div className="flex flex-col gap-2">
                            {quickLinks.map(link => (
                                <a
                                    key={link}
                                    href={`#${link.toLowerCase()}`}
                                    className="text-sm font-display text-text-muted hover:text-accent transition-colors duration-300"
                                >
                                    {link}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-text-tertiary mb-4">
                            Connect
                        </h4>
                        <div className="flex flex-col gap-3">
                            <a
                                href="mailto:kshitijbachhav005@gmail.com"
                                className="flex items-center gap-2.5 text-sm text-text-muted hover:text-accent transition-colors"
                            >
                                <Mail size={13} />
                                <span className="truncate">kshitijbachhav005@gmail.com</span>
                            </a>
                            <a
                                href="/resume.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-sm text-text-muted hover:text-accent transition-colors"
                            >
                                <FileText size={13} />
                                Resume
                            </a>
                            <div className="flex gap-2 mt-2">
                                {[
                                    { icon: Github, href: 'https://github.com/zacktiger', label: 'GitHub' },
                                    { icon: Linkedin, href: 'https://www.linkedin.com/in/KshitijBachhav', label: 'LinkedIn' },
                                ].map(({ icon: Icon, href, label }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="p-2 rounded-lg border border-border text-text-muted hover:text-accent hover:border-accent-mid transition-all duration-300"
                                    >
                                        <Icon size={14} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs font-display text-text-muted">
                        © {new Date().getFullYear()} Kshitij Bachhav
                    </p>
                    <p className="text-xs font-mono text-text-muted tracking-wider">
                        type <span className="text-accent">"play"</span> for a surprise
                    </p>
                </div>
            </div>
        </footer>
    )
}

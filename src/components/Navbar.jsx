import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, User, Wrench, FolderKanban, Mail, Menu, X } from 'lucide-react'

const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'about', icon: User, label: 'About' },
    { id: 'skills', icon: Wrench, label: 'Skills' },
    { id: 'projects', icon: FolderKanban, label: 'Projects' },
    { id: 'contact', icon: Mail, label: 'Contact' },
]

export default function Navbar() {
    const [activeSection, setActiveSection] = useState('home')
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    // Scroll spy
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY + window.innerHeight / 3
            for (let i = navItems.length - 1; i >= 0; i--) {
                const el = document.getElementById(navItems[i].id)
                if (el && el.offsetTop <= scrollY) {
                    setActiveSection(navItems[i].id)
                    break
                }
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Lock scroll on mobile menu
    useEffect(() => {
        if (isMobileOpen) {
            document.body.classList.add('sidebar-open')
        } else {
            document.body.classList.remove('sidebar-open')
        }
        return () => document.body.classList.remove('sidebar-open')
    }, [isMobileOpen])

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
        setIsMobileOpen(false)
    }

    return (
        <>
            {/* ═══ Desktop: Vertical Floating Dock ═══ */}
            <motion.nav
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2, duration: 0.8, ease: 'easeOut' }}
                className="dock-nav"
            >
                <div className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-surface/80 backdrop-blur-xl border border-border">
                    {navItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className={`dock-nav-item ${activeSection === id ? 'active' : ''}`}
                            aria-label={label}
                        >
                            <Icon size={16} strokeWidth={1.8} />
                            <span className="dock-nav-label">{label}</span>
                        </button>
                    ))}
                </div>
            </motion.nav>

            {/* ═══ Mobile: Hamburger ═══ */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-6 right-6 z-[100] md:hidden p-3 rounded-xl bg-surface/80 backdrop-blur-xl border border-border text-text-secondary"
                aria-label="Open menu"
            >
                <Menu size={20} />
            </motion.button>

            {/* ═══ Mobile: Slide-over ═══ */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 z-[120] w-72 md:hidden bg-surface/98 border-l border-border"
                        >
                            <div className="flex justify-end p-6">
                                <button
                                    onClick={() => setIsMobileOpen(false)}
                                    className="p-2 rounded-lg text-text-tertiary hover:text-accent transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <nav className="px-8 flex flex-col gap-1">
                                {navItems.map(({ id, icon: Icon, label }, i) => (
                                    <motion.button
                                        key={id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 + i * 0.05 }}
                                        onClick={() => scrollTo(id)}
                                        className={`
                                            flex items-center gap-4 py-4 px-4 rounded-xl text-left
                                            font-display text-base tracking-wide transition-all duration-300
                                            ${activeSection === id
                                                ? 'text-accent bg-accent-dim'
                                                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                                            }
                                        `}
                                    >
                                        <Icon size={18} strokeWidth={1.8} />
                                        {label}
                                    </motion.button>
                                ))}
                            </nav>

                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="h-px bg-border" />
                                <p className="mt-4 font-heading text-xs tracking-widest text-text-muted">
                                    KB.DEV
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

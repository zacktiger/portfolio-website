import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { skillCategories, projects, moreProjects, achievements, contactInfo } from '../data/portfolioData'

const PROMPT = 'kshitij@portfolio:~$'
const SECTIONS = ['home', 'about', 'skills', 'projects', 'contact']

const HELP_LINES = [
    ['help', 'list available commands'],
    ['about', 'who is this guy?'],
    ['skills', 'tech stack, straight from the resume'],
    ['projects', 'featured work + github links'],
    ['achievements', 'trophy cabinet'],
    ['contact', 'email & socials'],
    ['goto <section>', `scroll to a section (${SECTIONS.join(', ')})`],
    ['play', 'launch the retro car game 🏎️'],
    ['clear', 'wipe the screen'],
    ['exit', 'close the terminal (Esc works too)'],
]

let lineId = 0
const line = (type, content) => ({ id: ++lineId, type, content })

function runCommand(rawInput, { close, launchGame }) {
    const input = rawInput.trim()
    const [cmd, ...args] = input.split(/\s+/)

    switch (cmd.toLowerCase()) {
        case 'help':
            return [
                line('out', 'Available commands:'),
                ...HELP_LINES.map(([name, desc]) =>
                    line('rich', (
                        <span>
                            <span className="text-accent">{name.padEnd(16)}</span>
                            <span className="text-text-secondary">{desc}</span>
                        </span>
                    ))
                ),
            ]

        case 'about':
        case 'whoami':
            return [
                line('out', 'Kshitij Bachhav — full-stack developer.'),
                line('out', 'Builds multi-tenant SaaS platforms, algorithm visualizers, and'),
                line('out', 'real-time prediction markets. Winner of Technex GameJam 2024 (IIT BHU).'),
                line('out', "Currently shipping with React, Node.js, FastAPI, and PostgreSQL."),
            ]

        case 'skills':
            return skillCategories.map(cat =>
                line('rich', (
                    <span>
                        <span className="text-accent">{cat.title.padEnd(15)}</span>
                        <span className="text-text-secondary">{cat.skills.join(' · ')}</span>
                    </span>
                ))
            )

        case 'projects':
            return [
                line('out', 'Featured:'),
                ...projects.flatMap(p => [
                    line('rich', (
                        <span>
                            <span className="text-accent">▸ {p.title}</span>
                            <span className="text-text-tertiary"> — {p.subtitle}</span>
                        </span>
                    )),
                    line('rich', (
                        <span className="pl-4 text-text-secondary">
                            {p.description}{' '}
                            <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-text-primary">
                                [github]
                            </a>
                        </span>
                    )),
                ]),
                line('out', ''),
                line('out', 'More:'),
                ...moreProjects.map(p =>
                    line('rich', (
                        <span>
                            <span className="text-text-secondary">▸ {p.name}</span>
                            <span className="text-text-tertiary"> ({p.language}) </span>
                            <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2 hover:text-text-primary">
                                [github]
                            </a>
                        </span>
                    ))
                ),
            ]

        case 'achievements':
            return achievements.map(a =>
                line('rich', (
                    <span>
                        <span className="text-accent">🏆 {a.title}</span>
                        <span className="text-text-secondary"> — {a.description}</span>
                    </span>
                ))
            )

        case 'contact':
        case 'socials':
            return [
                line('rich', (
                    <span>
                        <span className="text-accent">email    </span>
                        <a href={`mailto:${contactInfo.email}`} className="text-text-secondary underline underline-offset-2 hover:text-accent">{contactInfo.email}</a>
                    </span>
                )),
                line('rich', (
                    <span>
                        <span className="text-accent">linkedin </span>
                        <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-text-secondary underline underline-offset-2 hover:text-accent">{contactInfo.linkedin}</a>
                    </span>
                )),
                line('rich', (
                    <span>
                        <span className="text-accent">github   </span>
                        <a href={contactInfo.github} target="_blank" rel="noopener noreferrer" className="text-text-secondary underline underline-offset-2 hover:text-accent">{contactInfo.github}</a>
                    </span>
                )),
            ]

        case 'goto': {
            const target = (args[0] || '').toLowerCase()
            if (!SECTIONS.includes(target)) {
                return [line('err', `goto: unknown section '${args[0] || ''}'. Try: ${SECTIONS.join(', ')}`)]
            }
            document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })
            close()
            return []
        }

        case 'play':
            launchGame()
            return [line('out', 'Firing up the engine... 🏎️')]

        case 'clear':
            return 'CLEAR'

        case 'exit':
        case 'quit':
        case 'q':
            close()
            return []

        case 'sudo':
            return [line('err', 'kshitij is not in the sudoers file. This incident will be reported.')]

        case '':
            return []

        default:
            return [line('err', `command not found: ${cmd}. Type 'help' to see what works.`)]
    }
}

/**
 * Retro CLI widget: press "/" anywhere to open a terminal where visitors
 * can explore the portfolio via commands. Typing `play` launches the
 * retro car game (handled by EasterEgg via the 'open-retro-game' event).
 */
export default function Terminal() {
    const [isOpen, setIsOpen] = useState(false)
    const [lines, setLines] = useState([])
    const [value, setValue] = useState('')
    const [history, setHistory] = useState([])
    const [historyIdx, setHistoryIdx] = useState(-1)
    const inputRef = useRef(null)
    const scrollRef = useRef(null)

    const close = useCallback(() => setIsOpen(false), [])
    const launchGame = useCallback(() => {
        setIsOpen(false)
        window.dispatchEvent(new Event('open-retro-game'))
    }, [])

    // "/" opens the terminal from anywhere on the page
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
            const t = e.target
            if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
            e.preventDefault()
            setIsOpen(true)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    // Escape closes even when the input isn't focused
    useEffect(() => {
        if (!isOpen) return
        const onEsc = (e) => { if (e.key === 'Escape') close() }
        window.addEventListener('keydown', onEsc)
        return () => window.removeEventListener('keydown', onEsc)
    }, [isOpen, close])

    // boot message on every fresh open
    useEffect(() => {
        if (!isOpen) return
        setLines([
            line('out', 'kshitij.dev terminal — v1.0.0'),
            line('rich', (
                <span className="text-text-secondary">
                    Type <span className="text-accent">help</span> to get started, or <span className="text-accent">play</span> if you're here for a good time.
                </span>
            )),
            line('out', ''),
        ])
        setValue('')
        setHistoryIdx(-1)
        const id = setTimeout(() => inputRef.current?.focus(), 50)
        return () => clearTimeout(id)
    }, [isOpen])

    // keep the latest output in view
    useEffect(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines])

    const handleKeyDown = (e) => {
        // don't leak keystrokes to global listeners (EasterEgg's "play" buffer,
        // the "/" opener) while typing in the terminal
        e.stopPropagation()

        if (e.key === 'Escape') {
            close()
            return
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (!history.length) return
            const idx = historyIdx < 0 ? history.length - 1 : Math.max(0, historyIdx - 1)
            setHistoryIdx(idx)
            setValue(history[idx])
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (historyIdx < 0) return
            const idx = historyIdx + 1
            if (idx >= history.length) {
                setHistoryIdx(-1)
                setValue('')
            } else {
                setHistoryIdx(idx)
                setValue(history[idx])
            }
            return
        }
        if (e.key !== 'Enter') return

        const input = value
        setValue('')
        setHistoryIdx(-1)
        if (input.trim()) setHistory(prev => [...prev, input])

        const result = runCommand(input, { close, launchGame })
        if (result === 'CLEAR') {
            setLines([])
            return
        }
        setLines(prev => [...prev, line('cmd', input), ...result])
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <div className="absolute inset-0" onClick={close} />
                    <motion.div
                        initial={{ scale: 0.95, y: 16, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, y: 16, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                        className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-accent/20 bg-[#0c0c0c] shadow-glow"
                        onClick={() => inputRef.current?.focus()}
                    >
                        {/* title bar */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border">
                            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                            <span className="ml-3 font-mono text-xs text-text-tertiary tracking-wide">
                                kshitij@portfolio — zsh
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); close() }}
                                className="ml-auto p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-card-hover transition-colors"
                                aria-label="Close terminal"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* scrollback */}
                        <div
                            ref={scrollRef}
                            className="h-[55vh] max-h-[480px] overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed"
                        >
                            {lines.map(l => (
                                <div key={l.id} className="whitespace-pre-wrap break-words">
                                    {l.type === 'cmd' && (
                                        <span>
                                            <span className="text-accent/70">{PROMPT} </span>
                                            <span className="text-text-primary">{l.content}</span>
                                        </span>
                                    )}
                                    {l.type === 'out' && <span className="text-text-secondary">{l.content || ' '}</span>}
                                    {l.type === 'err' && <span className="text-[#ff6b6b]">{l.content}</span>}
                                    {l.type === 'rich' && l.content}
                                </div>
                            ))}

                            {/* input row */}
                            <div className="flex items-center">
                                <span className="text-accent/70 shrink-0">{PROMPT}&nbsp;</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 bg-transparent outline-none border-none text-text-primary font-mono text-[13px] caret-accent"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                    spellCheck={false}
                                    aria-label="Terminal command input"
                                />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

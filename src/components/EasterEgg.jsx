import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import RetroCarGame from './RetroCarGame'

/**
 * Easter egg: type "play" anywhere — or tap the footer hint on mobile —
 * to open the retro "after hours" mini-game. Esc or the ✕ closes it.
 */
export default function EasterEgg() {
    const [isOpen, setIsOpen] = useState(false)
    const [buffer, setBuffer] = useState('')

    const handleKeyDown = useCallback((e) => {
        if (isOpen) {
            if (e.key === 'Escape') setIsOpen(false)
            return
        }
        const key = e.key.toLowerCase()
        if (key.length !== 1) return

        setBuffer(prev => {
            const next = (prev + key).slice(-4)
            if (next === 'play') {
                setTimeout(() => setIsOpen(true), 0)
                return ''
            }
            return next
        })
    }, [isOpen])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Tap-to-open entry point: the Terminal's `play` command and the footer
    // hint both fire this event — the only way in on touch devices.
    useEffect(() => {
        const open = () => setIsOpen(true)
        window.addEventListener('open-retro-game', open)
        return () => window.removeEventListener('open-retro-game', open)
    }, [])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black backdrop-blur-sm"
                >
                    {/* dim-into-night: the world settles to black first, then the game surfaces */}
                    <motion.div
                        initial={{ scale: 0.94, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.94, opacity: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="relative w-[90vw] max-w-4xl aspect-video rounded-2xl overflow-hidden border border-accent/20 shadow-glow"
                    >
                        <RetroCarGame
                            onPlayStart={() => {}}
                            onGameStateChange={() => {}}
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Close game"
                            className="absolute top-4 right-4 z-[210] p-2 rounded-lg border border-border bg-bg/70 text-text-secondary backdrop-blur-md hover:bg-bg/90 hover:text-text-primary transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                    <button
                        aria-label="Close game"
                        className="absolute inset-0 -z-10 cursor-default"
                        onClick={() => setIsOpen(false)}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import RetroCarGame from './RetroCarGame'

/**
 * Easter egg: Type "play" anywhere to open the retro car game
 */
export default function EasterEgg() {
    const [isOpen, setIsOpen] = useState(false)
    const [buffer, setBuffer] = useState('')

    const handleKeyDown = useCallback((e) => {
        if (isOpen) return
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

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-[90vw] max-w-4xl aspect-video rounded-2xl overflow-hidden border border-accent/20"
                    >
                        <RetroCarGame
                            onPlayStart={() => {}}
                            onGameStateChange={() => {}}
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 z-[210] p-2 rounded-lg border border-border bg-bg/70 text-text-secondary backdrop-blur-md hover:bg-bg/90 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                    <div
                        className="absolute inset-0 -z-10"
                        onClick={() => setIsOpen(false)}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

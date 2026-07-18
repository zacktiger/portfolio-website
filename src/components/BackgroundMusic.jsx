import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VolumeX } from 'lucide-react'

export default function BackgroundMusic() {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [hasInteracted, setHasInteracted] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const [hintExpired, setHintExpired] = useState(false)
    const [volume] = useState(0.35)

    // The hint chip floats over page content, so let it retire on its own
    useEffect(() => {
        const timer = setTimeout(() => setHintExpired(true), 12000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        audio.volume = 0
        audio.muted = true
        audio.loop = true
        const p = audio.play()
        if (p) p.catch(() => {})
    }, [])

    const handleFirstInteraction = useCallback(() => {
        if (hasInteracted) return
        setHasInteracted(true)
        const audio = audioRef.current
        if (!audio) return
        audio.muted = false
        audio.volume = volume
        const p = audio.play()
        if (p) p.then(() => setIsPlaying(true)).catch(() => {})
    }, [hasInteracted, volume])

    useEffect(() => {
        const events = ['click', 'touchstart', 'keydown']
        events.forEach(e => document.addEventListener(e, handleFirstInteraction, { once: false, passive: true }))
        return () => events.forEach(e => document.removeEventListener(e, handleFirstInteraction))
    }, [handleFirstInteraction])

    useEffect(() => {
        if (hasInteracted) {
            const events = ['click', 'touchstart', 'keydown']
            events.forEach(e => document.removeEventListener(e, handleFirstInteraction))
        }
    }, [hasInteracted, handleFirstInteraction])

    const toggleMusic = (e) => {
        e.stopPropagation()
        const audio = audioRef.current
        if (!audio) return
        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            audio.muted = false
            audio.volume = volume
            const p = audio.play()
            if (p) p.then(() => { setIsPlaying(true); if (!hasInteracted) setHasInteracted(true) }).catch(() => {})
        }
    }

    const EqualizerBars = () => (
        <div className="flex items-end gap-[2px] h-3">
            {[0, 1, 2, 3].map(i => (
                <motion.div
                    key={i}
                    className="w-[2.5px] rounded-full bg-accent"
                    animate={{
                        height: isPlaying
                            ? [3, 8 + Math.random() * 4, 4, 10 + Math.random() * 2, 3]
                            : 3,
                    }}
                    transition={{
                        duration: 0.8 + i * 0.15,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                        delay: i * 0.1,
                    }}
                />
            ))}
        </div>
    )

    return (
        <>
            <audio ref={audioRef} src="/bgm.mp3" loop preload="auto" />

            <motion.div
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 2, duration: 0.6, type: 'spring', stiffness: 200 }}
                className="fixed bottom-6 right-6 z-[100]"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <AnimatePresence>
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg text-xs font-display tracking-wider whitespace-nowrap pointer-events-none bg-surface border border-border text-text-secondary shadow-lg"
                        >
                            {isPlaying ? 'PAUSE MUSIC' : 'PLAY MUSIC'}
                        </motion.div>
                    )}
                </AnimatePresence>

                {isPlaying && (
                    <motion.div
                        className="absolute inset-0 rounded-full border border-accent/20"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}

                <motion.button
                    onClick={toggleMusic}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`
                        relative w-11 h-11 rounded-full flex items-center justify-center
                        transition-all duration-500 cursor-pointer
                        bg-surface/80 backdrop-blur-xl border shadow-lg
                        ${isPlaying
                            ? 'border-accent/30 shadow-accent/10'
                            : 'border-border'
                        }
                    `}
                    aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
                    id="music-toggle-btn"
                >
                    {isPlaying ? (
                        <EqualizerBars />
                    ) : (
                        <VolumeX size={16} className="text-text-muted" />
                    )}
                </motion.button>
            </motion.div>

            <AnimatePresence>
                {!hasInteracted && !hintExpired && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 3, duration: 1 }}
                        className="hidden sm:block fixed bottom-20 right-4 z-[99] px-3 py-2 rounded-lg text-[10px] font-mono tracking-[0.15em] uppercase pointer-events-none bg-surface/80 text-text-muted border border-border backdrop-blur-md"
                    >
                        ♪ click for music
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

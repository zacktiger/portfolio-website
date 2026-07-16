import { motion, useScroll, useSpring } from 'framer-motion'

export default function ScrollProgress() {
    const { scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-[2px] z-[150] origin-left"
            style={{
                scaleX,
                background: 'linear-gradient(90deg, rgba(0,212,255,0.4), #00d4ff)',
                boxShadow: '0 0 8px rgba(0, 212, 255, 0.4)',
            }}
        />
    )
}

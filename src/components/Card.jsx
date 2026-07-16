import { motion } from 'framer-motion'

export default function Card({ children, className = '', delay = 0, hover = true }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay }}
            whileHover={hover ? { y: -4, transition: { duration: 0.3 } } : {}}
            className={`
                spotlight-card backdrop-blur-md
                transition-all duration-300 ease-out
                p-7 sm:p-10 lg:p-12
                ${className}
            `}
        >
            {children}
        </motion.div>
    )
}

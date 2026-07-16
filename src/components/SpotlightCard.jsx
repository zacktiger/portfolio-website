import { useRef, useState, useCallback } from 'react'

/**
 * Card with a mouse-tracking radial glow.
 * Extra props (e.g. data-project-id) are spread onto the root element.
 */
export default function SpotlightCard({
    children,
    className = '',
    glowSize = 400,
    glowAlpha = 0.06,
    ...rest
}) {
    const cardRef = useRef(null)
    const [pos, setPos] = useState({ x: 0, y: 0 })

    const handleMouse = useCallback((e) => {
        const rect = cardRef.current?.getBoundingClientRect()
        if (!rect) return
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }, [])

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouse}
            className={`spotlight-card ${className}`}
            {...rest}
        >
            <div
                className="spotlight-gradient"
                style={{
                    background: `radial-gradient(${glowSize}px circle at ${pos.x}px ${pos.y}px, rgba(0,212,255,${glowAlpha}), transparent 60%)`,
                }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    )
}

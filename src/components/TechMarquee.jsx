const STACK = [
    'React', 'TypeScript', 'Node.js', 'Express', 'FastAPI', 'PostgreSQL',
    'MongoDB', 'Prisma', 'Redis', 'Docker', 'Tailwind', 'Framer Motion',
    'C++', 'Python', 'WebSockets', 'JWT / RBAC',
]

export default function TechMarquee() {
    const items = [...STACK, ...STACK]
    return (
        <div className="marquee py-5" aria-hidden="true">
            <div className="marquee-track">
                {items.map((tech, i) => (
                    <span key={i} className="inline-flex items-center">
                        <span className="font-display text-sm tracking-[0.2em] uppercase text-text-muted">
                            {tech}
                        </span>
                        <span className="mx-6 text-accent/40 text-xs">✦</span>
                    </span>
                ))}
            </div>
        </div>
    )
}

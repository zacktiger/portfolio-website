import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Github, Flame, CalendarDays, GitCommitHorizontal, ArrowUpRight } from 'lucide-react'
import SpotlightCard from './SpotlightCard'
import { contactInfo } from '../data/portfolioData'

const USERNAME = 'zacktiger'
const API_URL = `https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`

const LEVEL_COLORS = [
    'rgba(255, 255, 255, 0.04)',
    'rgba(0, 212, 255, 0.18)',
    'rgba(0, 212, 255, 0.38)',
    'rgba(0, 212, 255, 0.65)',
    '#00d4ff',
]

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
}

function computeStats(days) {
    let longestStreak = 0
    let streak = 0
    let busiest = 0
    for (const d of days) {
        if (d.count > 0) {
            streak += 1
            if (streak > longestStreak) longestStreak = streak
        } else {
            streak = 0
        }
        if (d.count > busiest) busiest = d.count
    }
    return { longestStreak, busiest }
}

function StatTile({ icon: Icon, value, label }) {
    return (
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-dim border border-accent-mid/40 flex-shrink-0">
                <Icon size={15} className="text-accent" />
            </div>
            <div>
                <div className="font-heading text-lg font-bold text-text-primary leading-none">
                    {value}
                </div>
                <div className="font-mono text-[9.5px] tracking-[0.15em] uppercase text-text-tertiary mt-1">
                    {label}
                </div>
            </div>
        </div>
    )
}

function ContributionGraph({ days }) {
    // Group into weeks (columns), Sunday-start like GitHub
    const weeks = useMemo(() => {
        const result = []
        let week = []
        days.forEach((day) => {
            const dow = new Date(day.date + 'T00:00:00').getDay()
            if (dow === 0 && week.length > 0) {
                result.push(week)
                week = []
            }
            week.push(day)
        })
        if (week.length > 0) result.push(week)
        return result
    }, [days])

    // Month labels: label a week-column when the month changes
    const monthLabels = useMemo(() => {
        const labels = []
        let lastMonth = -1
        weeks.forEach((week, wi) => {
            const m = new Date(week[0].date + 'T00:00:00').getMonth()
            if (m !== lastMonth) {
                labels.push({
                    week: wi,
                    name: new Date(week[0].date + 'T00:00:00').toLocaleString('en', { month: 'short' }),
                })
                lastMonth = m
            }
        })
        // Drop first label if it sits at the very edge and would overlap the second
        return labels.filter((l, i) => i === 0 || l.week - labels[i - 1].week > 2)
    }, [weeks])

    const CELL = 11
    const GAP = 3

    return (
        <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            <div style={{ minWidth: weeks.length * (CELL + GAP) }}>
                {/* Month labels */}
                <div className="relative h-4 mb-1.5">
                    {monthLabels.map(l => (
                        <span
                            key={`${l.name}-${l.week}`}
                            className="absolute font-mono text-[9px] text-text-tertiary"
                            style={{ left: l.week * (CELL + GAP) }}
                        >
                            {l.name}
                        </span>
                    ))}
                </div>
                {/* Grid */}
                <div className="flex" style={{ gap: GAP }}>
                    {weeks.map((week, wi) => {
                        const dowOffset = new Date(week[0].date + 'T00:00:00').getDay()
                        return (
                            <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                                {/* pad first partial week so days align to weekday rows */}
                                {wi === 0 && dowOffset > 0 &&
                                    Array.from({ length: dowOffset }).map((_, i) => (
                                        <div key={`pad-${i}`} style={{ width: CELL, height: CELL }} />
                                    ))}
                                {week.map(day => (
                                    <div
                                        key={day.date}
                                        title={`${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}`}
                                        className="rounded-[2.5px] transition-all duration-300 hover:scale-125 hover:z-10"
                                        style={{
                                            width: CELL,
                                            height: CELL,
                                            background: LEVEL_COLORS[day.level] || LEVEL_COLORS[0],
                                            boxShadow: day.level === 4 ? '0 0 6px rgba(0,212,255,0.5)' : 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default function GitHubActivity() {
    const [data, setData] = useState(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let cancelled = false
        fetch(API_URL)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(json => { if (!cancelled) setData(json) })
            .catch(() => { if (!cancelled) setFailed(true) })
        return () => { cancelled = true }
    }, [])

    // Fail silently — a broken third-party API shouldn't leave a hole in the page
    if (failed) return null

    const days = data?.contributions ?? []
    const stats = days.length > 0 ? computeStats(days) : null

    return (
        <section id="github" className="relative py-24 sm:py-32">
            <div className="content-container">
                {/* Header */}
                <motion.div {...fadeUp} className="mb-12">
                    <p className="section-label">Open Source</p>
                    <h2 className="section-title mb-3">
                        Proof of<br />
                        <span className="text-accent">work.</span>
                    </h2>
                    <p className="font-body text-text-tertiary text-sm max-w-md">
                        Live from GitHub — every square is a day of shipping.
                    </p>
                </motion.div>

                <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }}>
                    <SpotlightCard className="p-6 sm:p-8" glowSize={500} glowAlpha={0.04}>
                        {data === null ? (
                            /* Loading skeleton */
                            <div className="h-32 flex items-center justify-center">
                                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-text-muted animate-pulse">
                                    Fetching contributions…
                                </span>
                            </div>
                        ) : (
                            <>
                                {/* Stats row */}
                                <div className="flex flex-wrap items-center gap-x-10 gap-y-4 mb-7">
                                    <StatTile
                                        icon={GitCommitHorizontal}
                                        value={data.total?.lastYear ?? '—'}
                                        label="Contributions / year"
                                    />
                                    {stats && (
                                        <>
                                            <StatTile
                                                icon={Flame}
                                                value={`${stats.longestStreak}d`}
                                                label="Longest streak"
                                            />
                                            <StatTile
                                                icon={CalendarDays}
                                                value={stats.busiest}
                                                label="Busiest day"
                                            />
                                        </>
                                    )}
                                    <a
                                        href={contactInfo.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto hidden sm:flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-text-tertiary hover:text-accent transition-colors"
                                    >
                                        <Github size={13} />
                                        @{USERNAME}
                                        <ArrowUpRight size={11} />
                                    </a>
                                </div>

                                <ContributionGraph days={days} />

                                {/* Legend */}
                                <div className="flex items-center justify-end gap-1.5 mt-3">
                                    <span className="font-mono text-[9px] text-text-muted mr-1">LESS</span>
                                    {LEVEL_COLORS.map((c, i) => (
                                        <span
                                            key={i}
                                            className="w-[9px] h-[9px] rounded-[2px]"
                                            style={{ background: c }}
                                        />
                                    ))}
                                    <span className="font-mono text-[9px] text-text-muted ml-1">MORE</span>
                                </div>
                            </>
                        )}
                    </SpotlightCard>
                </motion.div>
            </div>
        </section>
    )
}

import {
    Code2, Layout, Database, Cpu, Server, Wrench,
    Kanban, BarChart3, Globe2,
} from 'lucide-react'

// ══════════════════════════════════════════
//  SKILLS — matches resume exactly
// ══════════════════════════════════════════

export const skillCategories = [
    {
        title: 'Languages',
        icon: Code2,
        color: 'cyan',
        skills: ['JavaScript (ES6+)', 'TypeScript', 'C++', 'Python'],
    },
    {
        title: 'Frontend',
        icon: Layout,
        color: 'pink',
        skills: ['React.js', 'Tailwind CSS', 'Framer Motion'],
    },
    {
        title: 'Backend',
        icon: Server,
        color: 'cyan',
        skills: ['Node.js', 'Express.js', 'FastAPI'],
    },
    {
        title: 'Databases',
        icon: Database,
        color: 'pink',
        skills: ['PostgreSQL', 'MongoDB', 'Prisma ORM', 'Redis'],
    },
    {
        title: 'Tools',
        icon: Wrench,
        color: 'cyan',
        skills: ['Git', 'GitHub', 'Docker'],
    },
    {
        title: 'Core Concepts',
        icon: Cpu,
        color: 'pink',
        skills: [
            'Data Structures & Algorithms',
            'Object-Oriented Programming',
            'DBMS',
            'RESTful APIs',
            'Authentication (JWT, RBAC, OAuth)',
            'Operating Systems',
            'Computer Networks',
        ],
    },
]

// ══════════════════════════════════════════
//  PROJECTS — from resume
// ══════════════════════════════════════════

export const projects = [
    {
        id: 'saas-pm',
        title: 'Multi-Tenant Project Management SaaS',
        subtitle: 'React.js, Express.js, PostgreSQL, Docker',
        date: '2025 – Present',
        icon: Kanban,
        accent: 'cyan',
        image: '/project-saas.png',
        github: '#',
        live: '#',
        description:
            'A scalable multi-tenant SaaS collaboration platform with strict data isolation and enterprise-grade security.',
        bullets: [
            'Architected strict data isolation across 4 hierarchical layers (organizations, workspaces, projects, tasks), enabling scalable onboarding for teams of any size.',
            'Secured 100% of REST API endpoints with JWT access tokens, refresh-token rotation, bcrypt-hashed storage, and token-reuse detection with rate-limited routes.',
            'Enforced organization-scoped RBAC (admin, member, viewer) across backend middleware and React Router guards, covering invitations and member lifecycle management.',
            'Delivered full Kanban workflow with drag-and-drop reordering, optimistic UI updates, persisted task ordering, cursor-based pagination, soft deletes, and audit activity logs.',
        ],
        tags: ['React.js', 'Express.js', 'PostgreSQL', 'Docker', 'JWT', 'RBAC', 'Prisma'],
    },
    {
        id: 'algoviz',
        title: 'AlgoViz',
        subtitle: 'React 19, TypeScript, Tailwind CSS, Framer Motion',
        date: 'February 2026',
        icon: BarChart3,
        accent: 'pink',
        image: '/project-algoviz.png',
        github: '#',
        live: '#',
        description:
            'An interactive algorithm visualizer covering 20+ sorting, searching, and graph algorithms with step-by-step execution.',
        bullets: [
            'Built an interactive visualizer for 20+ algorithms with step-by-step execution, real-time state updates, and live complexity statistics using 15+ reusable TypeScript components.',
            'Implemented centralized state management with Zustand to synchronize live statistics, pseudocode highlighting, and side-by-side algorithm comparisons with zero prop-drilling.',
            'Developed 3 custom renderers — array bars, SVG-based weighted graphs, and 2-D DP tables — with 60 fps smooth animations via Framer Motion.',
        ],
        tags: ['React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Zustand'],
    },
    {
        id: 'policast',
        title: 'Policast',
        subtitle: 'React, FastAPI, PostgreSQL, WebSockets, Groq API, GDELT',
        date: 'December 2025',
        icon: Globe2,
        accent: 'cyan',
        image: '/project-policast.png',
        github: '#',
        live: '#',
        description:
            'A real-time geopolitical prediction market platform tracking 52 live prediction markets with AI-powered forecasting.',
        bullets: [
            'Developed 22 REST API endpoints across markets, signals, drivers, and scheduler control with full CRUD and admin-gated mutation routes.',
            'Engineered a multi-provider LLM forecasting pipeline (Groq Llama-3.3-70B with Claude and GPT-4o fallback) ingesting GDELT and RSS news signals, recalculating probabilities every 4 hours.',
            'Integrated WebSocket broadcast layer with custom connection manager and heartbeat protocol for live probability updates, eliminating client-side polling.',
            'Designed on-demand AI briefing feature using FastAPI SSE to stream structured geopolitical analyses token-by-token to React.',
        ],
        tags: ['React', 'FastAPI', 'PostgreSQL', 'WebSockets', 'Groq API', 'GDELT', 'SSE'],
    },
]

// ══════════════════════════════════════════
//  ACHIEVEMENTS
// ══════════════════════════════════════════

export const achievements = [
    {
        title: 'Winner (1st Place)',
        description: 'Technex GameJam 2024, IIT BHU — ranked 1st among all participating teams in a national-level game development hackathon.',
        accent: 'pink',
    },
    {
        title: 'LeetCode / DSA',
        description: 'Solved 200+ problems across LeetCode and GeeksForGeeks, covering arrays, trees, graphs, DP, and greedy algorithms.',
        accent: 'cyan',
    },
]

// ══════════════════════════════════════════
//  CONTACT
// ══════════════════════════════════════════

export const contactInfo = {
    email: 'kshitijbachhav005@gmail.com',
    linkedin: 'https://www.linkedin.com/in/KshitijBachhav',
    github: 'https://github.com/zacktiger',
}

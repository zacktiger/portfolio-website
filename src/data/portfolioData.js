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
        github: 'https://github.com/zacktiger/Multi-Tenant-Project-Management-System',
        live: null,
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
        github: 'https://github.com/zacktiger/algo-visualizer',
        live: null,
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
        github: 'https://github.com/zacktiger/PoliCast',
        live: null,
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
//  MORE PROJECTS — compact grid, from GitHub
// ══════════════════════════════════════════

export const moreProjects = [
    {
        name: 'Roastmyresume',
        description: 'AI app that brutally roasts your resume and tells you how to fix it.',
        language: 'TypeScript',
        github: 'https://github.com/zacktiger/Roastmyresume',
    },
    {
        name: 'AI Expense Tracker',
        description: 'Expense tracking app with AI-assisted categorization and insights.',
        language: 'TypeScript',
        github: 'https://github.com/zacktiger/AI-Expense-Tracker',
    },
    {
        name: 'Secure Backend with RBAC',
        description: 'Backend engineering fundamentals — secure auth, role-based authorization, scalable API design.',
        language: 'JavaScript',
        github: 'https://github.com/zacktiger/Secure-Backend-System-with-RBAC',
    },
    {
        name: 'URL Shortener',
        description: 'Full-stack URL shortening service with redirect analytics.',
        language: 'TypeScript',
        github: 'https://github.com/zacktiger/Url_shortner',
    },
    {
        name: 'Cognimap',
        description: 'Python tool for cognitive mapping and visualization.',
        language: 'Python',
        github: 'https://github.com/zacktiger/Cognimap',
    },
    {
        name: 'Library Management System',
        description: 'Object-oriented library system in modern C++ — polymorphism and smart pointers.',
        language: 'C++',
        github: 'https://github.com/zacktiger/Library-management-',
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
//  WRITING / POSTS
//  The "coming soon" state on the site disappears automatically
//  the moment this `posts` array has at least one entry.
//  Copy this shape to add an article:
//  {
//      title: 'How I built a multi-tenant SaaS',
//      blurb: 'A one-line teaser that reads like a magazine dek.',
//      date: '2026-02-14',          // ISO date → rendered as "Feb 2026"
//      readMinutes: 6,              // optional
//      tag: 'Backend',             // optional category label
//      url: 'https://medium.com/@handle/slug',
//      cover: '/post-saas.png',    // optional; omit for a gradient fallback
//  }
// ══════════════════════════════════════════

export const writingProfile = {
    platform: 'Medium',
    // Paste your Medium (or blog) profile URL here to light up the
    // "Read all on Medium →" link. Leave '' while there are no posts.
    url: '',
}

export const posts = []

// ══════════════════════════════════════════
//  CONTACT
// ══════════════════════════════════════════

export const contactInfo = {
    email: 'kshitijbachhav005@gmail.com',
    linkedin: 'https://www.linkedin.com/in/KshitijBachhav',
    github: 'https://github.com/zacktiger',
}

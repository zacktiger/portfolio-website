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
//  FEATURED PROJECTS — the work the resume leads with
//
//  These get a full editorial row each, and they are the only projects that
//  do. Everything else lives in the archive below, which is generated.
//
//  `metrics` is what the row is built around: each project earns its space
//  with measurements rather than a screenshot. Exactly three cells — the
//  strip is a three-column grid above `sm`, and a fourth would wrap badly.
//  Keep `value` short (it is set in a large display face) and put the units
//  and the caveat in `label`.
//
//  `repo` must match the GitHub repository name character for character.
//  `useGitHubRepos` reads it to keep a featured project from also showing up
//  in the archive, so a rename on GitHub without a rename here produces a
//  duplicate entry rather than an error.
//
//  `image` is optional and deliberately secondary. Backend work has nothing
//  worth photographing; a row without an image gives its bullets the full
//  width instead.
// ══════════════════════════════════════════

export const projects = [
    {
        id: 'pulse',
        repo: 'pulse',
        title: 'Pulse — Social Feed Platform',
        subtitle: 'Express, PostgreSQL, Redis, BullMQ, Socket.io, Next.js',
        date: 'July 2026',
        accent: 'cyan',
        image: null,
        github: 'https://github.com/zacktiger/pulse',
        live: 'https://social-media-web-neon.vercel.app/',
        description:
            'A follower-graph social feed built around one problem: generating a personalized, ranked timeline without recomputing it on every read.',
        metrics: [
            { value: '74 ms', label: 'p50 personalized feed (92 ms p95)' },
            { value: '43,556/s', label: 'follower-feed writes sustained' },
            { value: '8.6×', label: 'lower p50 than per-request ranking' },
        ],
        scale: '5,000 users · 633K follow edges · 300K posts',
        bullets: [
            'Built a hybrid push/pull fan-out with decay-ranked feeds — Redis sorted sets for write-time ranking, PostgreSQL pulls for high-follower accounts — returning personalized feeds at 74 ms p50 / 92 ms p95 across 5,000 users, 633K follow edges, and 300K posts.',
            'Designed a BullMQ asynchronous fan-out pipeline sustaining 43,556 follower-feed writes/sec while holding post-creation latency at 50 ms p50 independent of follower count, updating engagement ranking with a single Redis write per like instead of re-scoring cached feeds.',
            'Implemented real-time notifications over Socket.io with a Redis adapter for multi-instance delivery, plus PostgreSQL-native full-text and typo-tolerant search via tsvector, GIN, and pg_trgm — answering selective queries in 5.7 ms on 300K posts with no separate search service.',
        ],
        tags: ['Express', 'PostgreSQL', 'Redis', 'BullMQ', 'Socket.io', 'Next.js'],
    },
    {
        id: 'flux',
        repo: 'Flux-ledger',
        title: 'Flux — Concurrent Double-Entry Ledger',
        subtitle: 'Next.js, PostgreSQL, Node.js',
        date: 'March 2026',
        accent: 'pink',
        image: null,
        github: 'https://github.com/zacktiger/Flux-ledger',
        live: null,
        description:
            'A money-transfer service with an append-only, database-enforced ledger where balances are derived, never stored. Not a wallet app — a concurrency experiment with a UI attached.',
        metrics: [
            { value: '4', label: 'concurrency strategies benchmarked' },
            { value: '200 → 100', label: 'simultaneous transfers, funds for 100' },
            { value: '100 → 1', label: 'duplicate requests, exactly one debit' },
        ],
        scale: 'Naive read-modify-write overdrew by ₹220 · FOR UPDATE, optimistic versioning, and SERIALIZABLE each held exactly',
        bullets: [
            'Engineered an append-only ledger where balances are derived rather than stored, then benchmarked 4 concurrency-control strategies under 200 simultaneous transfers against funds for only 100: naive read-modify-write overdrew the account by ₹220 (122 transfers posted), while FOR UPDATE, optimistic versioning, and SERIALIZABLE each held at exactly 100 — at 1.2×–5.9× lower throughput.',
            'Prevented double-charges under client retries: 100 simultaneous requests sharing one idempotency key produced exactly 1 transfer and 1 debit, with 99 resolved as replays, via a UNIQUE key claimed before any ledger write.',
        ],
        tags: ['Next.js', 'PostgreSQL', 'Node.js', 'Concurrency', 'Benchmarks'],
    },
    {
        id: 'saas-pm',
        repo: 'Multi-Tenant-Project-Management-System',
        title: 'Multi-Tenant Project Management SaaS',
        subtitle: 'React.js, Express.js, PostgreSQL',
        date: 'Sep 2025 – Jan 2026',
        accent: 'cyan',
        image: '/project-saas.png',
        github: 'https://github.com/zacktiger/Multi-Tenant-Project-Management-System',
        live: 'https://multi-tenant-project-management-sys.vercel.app',
        description:
            'A multi-tenant SaaS collaboration platform where tenant isolation is enforced at the query layer, not by convention.',
        metrics: [
            { value: '28', label: 'REST endpoints, all org-scoped' },
            { value: '4', label: 'hierarchical tenant layers' },
            { value: '404', label: 'on cross-tenant reads — not 403' },
        ],
        scale: 'Organizations → workspaces → projects → tasks',
        bullets: [
            'Scoped all 28 REST endpoints by organization ID across 4 tenant layers; cross-tenant reads return 404, not 403, so the existence of another tenant’s data is never leaked.',
            'Secured the API with JWT, single-use hashed refresh tokens and reuse detection, and a 3-role RBAC re-checked in the database on every request and enforced again in React Router guards.',
            'Delivered Kanban drag-and-drop with optimistic UI, transactional reordering, soft deletes, audit activity logs, and invitation-based onboarding with member lifecycle management.',
        ],
        tags: ['React.js', 'Express.js', 'PostgreSQL', 'JWT', 'RBAC', 'Prisma'],
    },
]

// ══════════════════════════════════════════
//  PROJECT ARCHIVE — curated here, detailed live from GitHub
//
//  ONE RULE: a repo listed in `repoOverrides` is on the site. A repo that
//  isn't, isn't. `isArchived()` below is the only place that decides.
//
//  It used to be the other way round — every public repo appeared unless it
//  was explicitly hidden — and that is exactly what filled the section with
//  coursework, assignments, and repos whose first and last commit were
//  minutes apart. The archive sits below three case studies a reader has
//  already worked through; a row earns its place by showing something those
//  three don't, which is a judgement no default can make.
//
//  What is still live: `/api/repos` supplies each listed repo's description,
//  language, stars, dates and homepage, so those stay current on their own,
//  and a repo that is renamed or deleted drops out by itself. What is no
//  longer automatic: a NEW repo stays off the site until it is written about
//  here. That is the point.
//
//  Three knobs shape the result:
//
//    1. `repoOverrides` — membership, and per-repo polish keyed by the exact
//       repository name. Any field you set wins over GitHub; anything you
//       leave out stays automatic. An empty object `{}` is a valid entry:
//       it means "show this, GitHub's own words are fine".
//    2. `archiveCategories` — the chip order. A repo with no `category`
//       override lands in `archiveDefaultCategory`.
//    3. `archiveFallback` — the copy baked into the build, rendered only if
//       the GitHub request fails, so the section is never empty.
//
//  Repos named in `projects[].repo` above are removed automatically — a
//  featured project never appears twice.
// ══════════════════════════════════════════

/** Group order in the archive. Groups with no repos are dropped. */
export const archiveCategories = [
    'Systems & Backend',
    'AI & Data',
    'Apps & Interfaces',
    'Tools & Experiments',
    'Coursework & Assignments',
]

/** Where a repo with no `category` override goes — including brand-new ones. */
export const archiveDefaultCategory = 'Tools & Experiments'

/**
 * The archive itself: which repositories appear, and what they say.
 *
 * Being a key here is what puts a repo on the site — see `isArchived()`. To
 * take one off, delete its entry. GitHub's own description is often empty, or
 * written for someone already reading the README, so override just the field
 * you want and leave the rest automatic:
 *
 *   'repo-name': {
 *       title: 'A Real Name',            // default: the repo name, de-slugged
 *       description: 'One sentence.',    // default: the GitHub description
 *       category: 'Systems & Backend',   // default: archiveDefaultCategory
 *       language: 'C++',                 // default: GitHub's detected language
 *       live: 'https://…',               // default: the repo's homepage field
 *   }
 *
 * Nine entries, and each one is a claim that this repo shows something the
 * three case studies above don't. Adding a tenth means making that claim.
 */
export const repoOverrides = {
    // ─── Systems & Backend ───
    Url_shortner: {
        title: 'SnapLink — URL Shortener',
        category: 'Systems & Backend',
        description:
            'Collision-resistant short codes over a 62⁷ keyspace, with Redis cache-aside redirects and a PostgreSQL fallback.',
    },
    'Claude-limit-notifier': {
        title: 'Claude Reset Notifier',
        category: 'Systems & Backend',
        description:
            'A Cloudflare Worker and a Durable Object: arm it with a reset time, get a ping at that exact moment.',
    },

    // ─── AI & Data ───
    PoliCast: {
        title: 'PoliCast',
        category: 'AI & Data',
        description:
            'Geopolitical prediction markets with an LLM forecasting pipeline over GDELT and RSS signals, re-scored every four hours.',
    },
    AtlasQL: {
        title: 'AtlasQL',
        category: 'AI & Data',
        description:
            'A geographic query engine: structured searches across countries, cities, and rivers by spatial and economic metrics.',
    },
    'mini-project-cnn-wildfire': {
        title: 'Wildfire CNN',
        category: 'AI & Data',
        description:
            'A convolutional network for wildfire image classification, end to end in a notebook.',
    },

    // ─── Apps & Interfaces ───
    Roastmyresume: {
        title: 'Roast My Resume',
        category: 'Apps & Interfaces',
        description:
            'An AI resume agent grounded in local vector embeddings, plus a roaster that takes any PDF apart.',
    },
    'algo-visualizer': {
        title: 'AlgoViz',
        category: 'Apps & Interfaces',
        description:
            '20+ sorting, searching, and graph algorithms with step-by-step execution and live complexity statistics.',
    },
    DailyNote: {
        title: 'DailyNote',
        category: 'Apps & Interfaces',
        description:
            'Notes you write daily and then lose, kept and searchable — shipped with a real spec, roadmap and decision records.',
    },
    'portfolio-website': {
        title: 'This Site',
        category: 'Apps & Interfaces',
        description:
            'The portfolio you are reading — React 19, Tailwind v4, Framer Motion, with the writing and project sections pulled live.',
    },
}

/** Repos already given a full editorial card above the archive. */
const featuredRepoNames = new Set(projects.map((p) => p.repo).filter(Boolean))

/**
 * Does this repository belong in the archive?
 *
 * The single definition of the rule, imported by the runtime hook
 * (`useGitHubRepos.js`) and by the bake-time script (`refresh-repos.mjs`) so
 * the live render and the offline fallback can never disagree about what the
 * site shows — they used to keep two copies of the featured-exclusion set.
 */
export function isArchived(repoName) {
    if (featuredRepoNames.has(repoName)) return false
    return Object.hasOwn(repoOverrides, repoName)
}

/**
 * Offline snapshot of the archive, rendered only when `/api/repos` cannot be
 * reached (a GitHub outage, a rate limit, `vite dev` with no network).
 *
 * It does not need to stay in sync with GitHub — treat it as the "worst case"
 * a visitor sees. Refresh it whenever you like with:
 *     npm run refresh:repos
 */
export const archiveFallback = [
    {
        name: 'portfolio-website',
        url: 'https://github.com/zacktiger/portfolio-website',
        homepage: 'https://portfolio-eta-roan-85.vercel.app/',
        description: null,
        language: 'JavaScript',
        stars: 0,
        createdAt: '2026-02-13T12:43:18Z',
        pushedAt: '2026-08-18T19:52:25Z',
    },
    {
        name: 'mini-project-cnn-wildfire',
        url: 'https://github.com/zacktiger/mini-project-cnn-wildfire',
        homepage: null,
        description: null,
        language: 'Jupyter Notebook',
        stars: 2,
        createdAt: '2026-08-01T18:22:23Z',
        pushedAt: '2026-08-18T17:34:34Z',
    },
    {
        name: 'Url_shortner',
        url: 'https://github.com/zacktiger/Url_shortner',
        homepage: 'https://url-shortner-eight-omega.vercel.app/',
        description: null,
        language: 'TypeScript',
        stars: 1,
        createdAt: '2026-05-31T14:38:37Z',
        pushedAt: '2026-08-14T14:56:06Z',
    },
    {
        name: 'Claude-limit-notifier',
        url: 'https://github.com/zacktiger/Claude-limit-notifier',
        homepage: 'https://claude-limit-notifier.claude-reset-notifier.workers.dev/',
        description: null,
        language: 'HTML',
        stars: 0,
        createdAt: '2026-08-10T12:02:18Z',
        pushedAt: '2026-08-10T18:19:56Z',
    },
    {
        name: 'AtlasQL',
        url: 'https://github.com/zacktiger/AtlasQL',
        homepage: null,
        description: '(An awesome tool if you are interested and curious about geography, economics and the intersection)  A geographic query engine that enables structured searches across countries, states, cities, rivers, mountains, and other geographic entities using hundreds of spatial, demographic, economic, and environmental metrics.',
        language: 'Python',
        stars: 4,
        createdAt: '2026-07-30T14:55:55Z',
        pushedAt: '2026-08-08T03:31:54Z',
    },
    {
        name: 'DailyNote',
        url: 'https://github.com/zacktiger/DailyNote',
        homepage: null,
        description: 'So that the small notes we write daily aren\'t forgotten, helpful to others too and we actually follow through',
        language: 'TypeScript',
        stars: 0,
        createdAt: '2026-07-24T12:36:44Z',
        pushedAt: '2026-08-04T19:42:13Z',
    },
    {
        name: 'PoliCast',
        url: 'https://github.com/zacktiger/PoliCast',
        homepage: 'https://poli-cast.vercel.app',
        description: 'A geopolitical prediction platform combining agentic AI, automated news signal extraction, and probabilistic forecasting models. The system continuously updates event probabilities and visualizes trends through an interactive React dashboard.',
        language: 'Python',
        stars: 3,
        createdAt: '2026-03-13T18:10:25Z',
        pushedAt: '2026-07-28T20:20:20Z',
    },
    {
        name: 'algo-visualizer',
        url: 'https://github.com/zacktiger/algo-visualizer',
        homepage: 'https://algo-visualizer-rho-woad.vercel.app',
        description: 'A visualizer that simulates algorithms.',
        language: 'TypeScript',
        stars: 0,
        createdAt: '2026-03-12T17:15:54Z',
        pushedAt: '2026-07-24T13:15:22Z',
    },
    {
        name: 'Roastmyresume',
        url: 'https://github.com/zacktiger/Roastmyresume',
        homepage: 'https://roastmyresume-zeta.vercel.app',
        description: null,
        language: 'TypeScript',
        stars: 0,
        createdAt: '2026-07-05T13:14:30Z',
        pushedAt: '2026-07-22T08:21:41Z',
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
//
//  Articles are pulled live from Medium — publish a post and it appears in
//  the "Notes & ideas" section on its own, with no edit here and no redeploy.
//  `/api/medium` (see `api/medium.js`) reads the RSS feed server-side and
//  caches it at the edge for ~5 minutes.
//
//  Nothing below needs routine maintenance. It exists for two jobs:
//    1. `posts` — the copy baked into the build, shown if the feed is
//       unreachable, so the section is never empty.
//    2. `postOverrides` — optional per-article polish, keyed by canonical URL
//       (the article link with any `?source=…` stripped). Any field you set
//       wins over the feed; anything you leave out stays automatic.
// ══════════════════════════════════════════

export const writingProfile = {
    platform: 'Medium',
    // Profile URL — powers the "Follow on Medium" button (coming-soon
    // state) and the "Read all on Medium →" link once posts exist.
    url: 'https://medium.com/@kshitijbachhav005',
    // The feed the site reads. Change the handle here and in `api/medium.js`
    // if the Medium account ever moves.
    feed: 'https://medium.com/feed/@kshitijbachhav005',
}

/**
 * Hand-tuned fields for individual articles, keyed by canonical URL.
 *
 * Medium's feed gives a usable blurb (the post's subtitle) and a tag (its
 * first Medium tag, title-cased), but those are not always the framing you'd
 * choose for a portfolio card. Override just the field you want:
 *
 *   'https://medium.com/@handle/some-slug-abc123': {
 *       tag: 'Economics',
 *       blurb: 'A sharper one-line dek than the subtitle.',
 *   }
 */
export const postOverrides = {
    'https://medium.com/@kshitijbachhav005/i-realized-oil-is-an-economic-problem-not-a-geological-one-060bdbebf102': {
        tag: 'Economics',
        blurb:
            'Why a barrel of oil that technically exists underground can still be worth nothing — and how that quirk of geology quietly shapes U.S.–Saudi relations.',
    },
    'https://medium.com/@kshitijbachhav005/why-even-superpowers-cant-win-wars-anymore-f8f82d89a2eb': {
        tag: 'Geopolitics',
    },
    'https://medium.com/@kshitijbachhav005/the-geography-of-power-centralized-states-decentralized-states-and-the-primate-city-629ba0836a72': {
        tag: 'Geopolitics',
    },
}

/**
 * Offline fallback, rendered only when `/api/medium` cannot be reached (local
 * `vite dev` without `vercel dev`, a Medium outage, a request timeout).
 *
 * It does not need to stay in sync with Medium — treat it as the "worst case"
 * snapshot a visitor sees. Refresh it whenever you like with:
 *     npm run refresh:posts
 */
export const posts = [
    {
        title: 'The Geography of Power: Centralized States, Decentralized States, and the Primate City',
        blurb: 'A country’s political structure is often visible on its map.',
        date: '2026-08-18',
        readMinutes: 6,
        tag: 'Geopolitics',
        url: 'https://medium.com/@kshitijbachhav005/the-geography-of-power-centralized-states-decentralized-states-and-the-primate-city-629ba0836a72',
        cover: 'https://cdn-images-1.medium.com/max/1200/1*el9fg57NdzMM3zkAS5yAfw.png',
    },
    {
        title: 'I Realized Oil Is an Economic Problem, Not a Geological One.',
        blurb: 'Why a barrel of oil that technically exists underground can still be worth nothing — and how that quirk of geology quietly shapes U.S.–Saudi relations.',
        date: '2026-07-19',
        readMinutes: 9,
        tag: 'Economics',
        url: 'https://medium.com/@kshitijbachhav005/i-realized-oil-is-an-economic-problem-not-a-geological-one-060bdbebf102',
        cover: 'https://cdn-images-1.medium.com/max/1200/1*jA3qCnqRxeGN9Bw5u4JZyg.jpeg',
    },
    {
        title: 'Why Even Superpowers Can’t Win Wars Anymore',
        blurb: 'Military rankings feel almost absurd nowadays, right? Russia sits at number two, the US at number one undisputed. And yet both are visibly struggling to break the spirit of…',
        date: '2026-04-18',
        readMinutes: 5,
        tag: 'Geopolitics',
        url: 'https://medium.com/@kshitijbachhav005/why-even-superpowers-cant-win-wars-anymore-f8f82d89a2eb',
        cover: 'https://cdn-images-1.medium.com/max/1200/1*9VN_7H0pJo1qhBGjo29wMQ.jpeg',
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

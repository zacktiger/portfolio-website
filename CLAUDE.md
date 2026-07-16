# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-page personal portfolio site (Kshitij Bachhav) built with React 19 + Vite + Tailwind CSS 4, animated with Framer Motion. No backend, no router, no state library — it's one scrollable page assembled from section components.

## Commands

- `npm run dev` — start Vite dev server (default `http://localhost:5173`)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

There is no lint script, no test runner, and no TypeScript configured in this repo.

## Architecture

**Single-page composition.** `src/App.jsx` renders one document: `Navbar`, then a `<main>` with `Hero → About → Skills → Projects → Contact` sections separated by a `Divider`, then `Footer`, plus fixed-position overlay components (`CustomCursor`, `BackgroundMusic`, `EasterEgg`) mounted at the root. Sections are plain `<section id="...">` elements; the id (`home`, `about`, `skills`, `projects`, `contact`) is the anchor used for both nav scroll-spy and `scrollIntoView` navigation — keep those ids in sync between `Navbar.jsx`'s `navItems` and each section component.

**Content lives in data, not JSX.** `src/data/portfolioData.js` is the single source of truth for skills, projects, achievements, and contact info (email/LinkedIn/GitHub) — it's a plain JS module exporting arrays/objects consumed by `Skills.jsx`, `Projects.jsx`, and `Contact.jsx`. To add/edit a project or skill category, edit this file, not the component markup. Project entries reference images by path (e.g. `/project-saas.png`) served from `public/`.

**Styling: Tailwind v4 with CSS-first theming.** There's no `tailwind.config.js` — theme tokens (colors, fonts, shadows) are declared via `@theme` in `src/index.css` and consumed both as CSS vars (`var(--color-accent)`) and as generated Tailwind utility classes (`bg-bg`, `text-text-primary`, `border-border`, etc., derived from the `--color-*` names). The Vite plugin `@tailwindcss/vite` handles the build (see `vite.config.js`). When introducing a new color/font/shadow, add it to the `@theme` block rather than hardcoding hex values, so it stays usable as a utility class.

`index.css` also holds a number of hand-written component classes used across sections instead of Tailwind utility soup: `.spotlight-card`, `.dock-nav` / `.dock-nav-item`, `.tag-chip`, `.cta-button` / `.cta-button-ghost`, `.section-label`, `.section-title`, `.content-container`, `.section-divider`, plus one-off effects (`.grain-overlay`, `body.screen-shake`, `body.sidebar-open`). Reuse these classes for new sections rather than re-implementing the same look with raw utilities.

**Custom cursor changes global cursor behavior.** `index.css` sets `cursor: none !important` on all elements at `@media (pointer: fine)`, and `CustomCursor.jsx` renders the replacement cursor itself — any new interactive element should still declare correct `cursor-*` intent classes for non-fine-pointer devices, but expect the visual cursor on desktop to come from that component, not native styling.

**Animation convention (Framer Motion).** Scroll-triggered reveals use `whileInView` with `viewport={{ once: true, margin: '-50px' }}` (see `Card.jsx`, the shared wrapper used by most section content blocks). Entrance sequences (Navbar, Hero) use staggered `initial`/`animate` with explicit `delay`. Follow this pattern rather than introducing a different animation approach for new sections.

**Easter egg / mini-game.** Typing "play" anywhere on the page (`EasterEgg.jsx`, global `keydown` listener buffering the last 4 keys) opens a modal hosting `RetroCarGame.jsx`, a self-contained canvas-based game component. Treat it as an isolated feature — it doesn't share state with the rest of the app beyond the open/close modal wrapper.

**No routing, no global state.** All interactivity is local `useState`/`useEffect` per component (scroll-spy in `Navbar`, keyboard buffer in `EasterEgg`, etc.). Don't reach for a router or a context/store for new features unless the scope genuinely outgrows this — the codebase deliberately has neither.

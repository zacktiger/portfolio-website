import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import GitHubActivity from './components/GitHubActivity'
import Writing from './components/Writing'
import Contact from './components/Contact'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'
import { lazy, Suspense } from 'react'
import ScrollProgress from './components/ScrollProgress'

// three.js is heavy — load the 3D floaters in their own chunk after first paint
const PixelModels = lazy(() => import('./components/PixelModels'))
import BackgroundMusic from './components/BackgroundMusic'
import EasterEgg from './components/EasterEgg'
import Terminal from './components/Terminal'
import TechMarquee from './components/TechMarquee'

function Divider() {
    return <div className="section-divider" />
}

export default function App() {
    return (
        <div className="grain-overlay min-h-screen bg-bg text-text-primary">
            <CustomCursor />
            <ScrollProgress />
            <Suspense fallback={null}>
                <PixelModels />
            </Suspense>
            <Navbar />
            <main className="relative z-10">
                <Hero />
                <TechMarquee />
                <About />
                <Divider />
                <Skills />
                <Divider />
                <Projects />
                <Divider />
                <GitHubActivity />
                <Divider />
                <Writing />
                <Divider />
                <Contact />
            </main>
            <Footer />
            <BackgroundMusic />
            <EasterEgg />
            <Terminal />
        </div>
    )
}

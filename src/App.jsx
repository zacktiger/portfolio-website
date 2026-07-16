import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Contact from './components/Contact'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'
import BackgroundMusic from './components/BackgroundMusic'
import EasterEgg from './components/EasterEgg'

function Divider() {
    return <div className="section-divider" />
}

export default function App() {
    return (
        <div className="grain-overlay min-h-screen bg-bg text-text-primary">
            <CustomCursor />
            <Navbar />
            <main>
                <Hero />
                <Divider />
                <About />
                <Divider />
                <Skills />
                <Divider />
                <Projects />
                <Divider />
                <Contact />
            </main>
            <Footer />
            <BackgroundMusic />
            <EasterEgg />
        </div>
    )
}

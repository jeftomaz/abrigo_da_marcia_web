import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Header, ThemeProvider } from '@abrigo/shared'
import { Footer } from './components/Footer'

const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })))
const Adocao = lazy(() => import('./pages/Adocao').then((m) => ({ default: m.Adocao })))
const Historias = lazy(() => import('./pages/Historias').then((m) => ({ default: m.Historias })))
const Eventos = lazy(() => import('./pages/Eventos').then((m) => ({ default: m.Eventos })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }

    const animationFrame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [pathname, hash])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ScrollToTop />
        <Header />
        <Suspense fallback={<div role="status" aria-live="polite" className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/adocao" element={<Adocao />} />
            <Route path="/historias" element={<Historias />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

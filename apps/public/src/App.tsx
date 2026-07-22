import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Header, ThemeProvider } from '@abrigo/shared'
import { Landing } from './pages/Landing'
import { Adocao } from './pages/Adocao'
import { Historias } from './pages/Historias'
import { Eventos } from './pages/Eventos'
import { NotFound } from './pages/NotFound'
import { Footer } from './components/Footer'

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/adocao" element={<Adocao />} />
          <Route path="/historias" element={<Historias />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

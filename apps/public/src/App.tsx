import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Header, ThemeProvider } from '@abrigo/shared'
import { Landing } from './pages/Landing'
import { Adocao } from './pages/Adocao'
import { Footer } from './components/Footer'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => window.scrollTo(0, 0), [pathname])

  return null
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/adocao" element={<Adocao />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

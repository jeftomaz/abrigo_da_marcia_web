import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Header, ThemeProvider } from '@abrigo/shared'
import { Landing } from './pages/Landing'
import { Footer } from './components/Footer'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

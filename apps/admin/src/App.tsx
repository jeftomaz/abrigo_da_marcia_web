import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@abrigo/shared'
import { AdminHeader } from './components/AdminHeader'
import { Caes } from './pages/Caes'
import { Eventos } from './pages/Eventos'
import { Historias } from './pages/Historias'

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div className="flex min-h-screen flex-col">
          <AdminHeader />
          <Routes>
            <Route path="/" element={<Caes />} />
            <Route path="/historias" element={<Historias />} />
            <Route path="/eventos" element={<Eventos />} />
          </Routes>
        </div>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App

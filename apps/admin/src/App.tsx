import { HashRouter, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@abrigo/shared'
import { AdminHeader } from './components/AdminHeader'
import { Caes } from './pages/Caes'
import { Eventos } from './pages/Eventos'
import { Historias } from './pages/Historias'
import { RaffleDraw } from './pages/RaffleDraw'

function AdminShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader />
      <Outlet />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route element={<AdminShell />}>
            <Route path="/" element={<Caes />} />
            <Route path="/historias" element={<Historias />} />
            <Route path="/eventos" element={<Eventos />} />
          </Route>
          <Route path="/eventos/:eventId/sorteio" element={<RaffleDraw />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App

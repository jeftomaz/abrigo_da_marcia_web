import { HashRouter, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@abrigo/shared'
import { AdminAuth } from './auth/AdminAuth'
import { AdminHeader } from './components/AdminHeader'
import { Caes } from './pages/Caes'
import { Configuracoes } from './pages/Configuracoes'
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
      <AdminAuth>
        <HashRouter>
          <Routes>
            <Route element={<AdminShell />}>
              <Route path="/" element={<Caes />} />
              <Route path="/historias" element={<Historias />} />
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="/eventos/:eventId/sorteio" element={<RaffleDraw />} />
          </Routes>
        </HashRouter>
      </AdminAuth>
    </ThemeProvider>
  )
}

export default App

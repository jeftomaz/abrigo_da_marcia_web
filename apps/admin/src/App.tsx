import { Suspense, lazy } from 'react'
import { HashRouter, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@abrigo/shared'
import { AdminAuth } from './auth/AdminAuth'
import { AdminHeader } from './components/AdminHeader'

const Caes = lazy(() => import('./pages/Caes').then((m) => ({ default: m.Caes })))
const Configuracoes = lazy(() => import('./pages/Configuracoes').then((m) => ({ default: m.Configuracoes })))
const Eventos = lazy(() => import('./pages/Eventos').then((m) => ({ default: m.Eventos })))
const Historias = lazy(() => import('./pages/Historias').then((m) => ({ default: m.Historias })))
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })))
const RaffleDraw = lazy(() => import('./pages/RaffleDraw').then((m) => ({ default: m.RaffleDraw })))

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
          <Suspense fallback={<div role="status" aria-live="polite" className="min-h-screen" />}>
            <Routes>
              <Route element={<AdminShell />}>
                <Route path="/" element={<Caes />} />
                <Route path="/historias" element={<Historias />} />
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="/eventos/:eventId/sorteio" element={<RaffleDraw />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </AdminAuth>
    </ThemeProvider>
  )
}

export default App

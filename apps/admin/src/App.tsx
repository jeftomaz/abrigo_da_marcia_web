import { HashRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@abrigo/shared'
import { AdminHeader } from './components/AdminHeader'
import { Caes } from './pages/Caes'

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <div className="flex min-h-screen flex-col">
          <AdminHeader />
          <Routes>
            <Route path="/" element={<Caes />} />
          </Routes>
        </div>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App

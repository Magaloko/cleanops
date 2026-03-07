import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kunden from './pages/Kunden'
import Objekte from './pages/Objekte'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/kunden" element={<Kunden />} />
            <Route path="/objekte" element={<Objekte />} />
            <Route path="/angebote" element={<Placeholder title="Angebote" />} />
            <Route path="/vertraege" element={<Placeholder title="Verträge" />} />
            <Route path="/projekte" element={<Placeholder title="Projekte" />} />
            <Route path="/aufgaben" element={<Placeholder title="Aufgaben" />} />
            <Route path="/mitarbeiter" element={<Placeholder title="Mitarbeiter" />} />
            <Route path="/qualitaet" element={<Placeholder title="Qualität" />} />
            <Route path="/rechnungen" element={<Placeholder title="Rechnungen" />} />
            <Route path="/material" element={<Placeholder title="Material" />} />
            <Route path="/berichte" element={<Placeholder title="Berichte" />} />
            <Route path="/einstellungen" element={<Placeholder title="Einstellungen" />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

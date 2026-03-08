import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kunden from './pages/Kunden'
import Objekte from './pages/Objekte'
import Angebote from './pages/Angebote'
import Vertraege from './pages/Vertraege'
import Projekte from './pages/Projekte'
import Aufgaben from './pages/Aufgaben'
import Mitarbeiter from './pages/Mitarbeiter'
import Qualitaet from './pages/Qualitaet'
import Rechnungen from './pages/Rechnungen'
import Material from './pages/Material'
import Berichte from './pages/Berichte'
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
            <Route path="/angebote" element={<Angebote />} />
            <Route path="/vertraege" element={<Vertraege />} />
            <Route path="/projekte" element={<Projekte />} />
            <Route path="/aufgaben" element={<Aufgaben />} />
            <Route path="/mitarbeiter" element={<Mitarbeiter />} />
            <Route path="/qualitaet" element={<Qualitaet />} />
            <Route path="/rechnungen" element={<Rechnungen />} />
            <Route path="/material" element={<Material />} />
            <Route path="/berichte" element={<Berichte />} />
            <Route path="/einstellungen" element={<Placeholder title="Einstellungen" />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

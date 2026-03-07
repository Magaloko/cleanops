import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem('cleanops_session')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  function loginDemo(role) {
    const s = { role, demo: true, name: 'Demo-Nutzer' }
    localStorage.setItem('cleanops_session', JSON.stringify(s))
    setSession(s)
  }

  function logout() {
    localStorage.removeItem('cleanops_session')
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

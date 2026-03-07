import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Real Supabase session
  const [supabaseUser, setSupabaseUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Demo session (stored in localStorage)
  const [demoSession, setDemoSession] = useState(() => {
    try {
      const s = localStorage.getItem('cleanops_demo')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  useEffect(() => {
    // Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      setLoadingAuth(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Unified session object consumed by the app
  const session = supabaseUser
    ? { user: supabaseUser, role: supabaseUser.user_metadata?.role ?? 'admin', demo: false }
    : demoSession

  async function loginWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  function loginDemo(role) {
    const s = { role, demo: true, name: 'Demo-Nutzer' }
    localStorage.setItem('cleanops_demo', JSON.stringify(s))
    setDemoSession(s)
  }

  async function logout() {
    if (supabaseUser) {
      await supabase.auth.signOut()
    }
    localStorage.removeItem('cleanops_demo')
    setDemoSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loadingAuth, loginWithEmail, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

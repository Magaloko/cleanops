import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [supabaseUser, setSupabaseUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  const [demoSession, setDemoSession] = useState(() => {
    try {
      const s = localStorage.getItem('cleanops_demo')
      return s ? JSON.parse(s) : null
    } catch { return null }
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null)
      setLoadingAuth(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const session = supabaseUser
    ? { user: supabaseUser, role: supabaseUser.user_metadata?.role ?? 'admin', demo: false }
    : demoSession

  async function loginWithEmail(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function registerWithEmail(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    })
    if (error) throw error
  }

  function loginDemo(role) {
    const s = { role, demo: true, name: 'Demo-Nutzer' }
    localStorage.setItem('cleanops_demo', JSON.stringify(s))
    setDemoSession(s)
  }

  async function logout() {
    if (supabaseUser) await supabase.auth.signOut()
    localStorage.removeItem('cleanops_demo')
    setDemoSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loadingAuth, loginWithEmail, registerWithEmail, loginWithGoogle, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

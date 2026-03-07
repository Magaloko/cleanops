import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Loader2, Play, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/roles'

const TABS = { login: 'Anmelden', register: 'Registrieren' }

export default function Login() {
  const navigate = useNavigate()
  const { session, loginWithEmail, registerWithEmail, loginWithGoogle, loginDemo } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  function resetForm() {
    setEmail(''); setPassword(''); setError(''); setSuccess('')
  }

  function switchTab(t) {
    setTab(t); resetForm()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (tab === 'login') {
        await loginWithEmail(email, password)
        navigate('/dashboard')
      } else {
        await registerWithEmail(email, password)
        setSuccess('Bestätigungs-E-Mail gesendet. Bitte prüfe dein Postfach.')
        setEmail(''); setPassword('')
      }
    } catch (err) {
      const msg = err.message
      if (msg === 'Invalid login credentials') setError('E-Mail oder Passwort falsch.')
      else if (msg.includes('already registered')) setError('Diese E-Mail ist bereits registriert.')
      else if (msg.includes('Password should be at least')) setError('Passwort muss mindestens 6 Zeichen haben.')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err.message)
    }
  }

  function handleDemo(role) {
    loginDemo(role)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 gap-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl">
          <Zap size={20} className="text-white" />
        </div>
        <span className="text-2xl font-bold text-white tracking-tight">CleanOps</span>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        {/* Auth Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {Object.entries(TABS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-8">
            <p className="text-sm text-gray-400 mb-6">
              {tab === 'login' ? 'Mit deinem Account einloggen' : 'Neuen Account erstellen'}
            </p>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium rounded-lg transition-colors mb-4"
            >
              {/* Google SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"/>
              </svg>
              Mit Google {tab === 'login' ? 'anmelden' : 'registrieren'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-600">oder</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">E-Mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@firma.at"
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={tab === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {success && (
                <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
                  <Mail size={16} className="shrink-0 mt-0.5" />
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" />{tab === 'login' ? 'Anmelden…' : 'Registrieren…'}</>
                  : tab === 'login' ? 'Anmelden' : 'Account erstellen'
                }
              </button>
            </form>
          </div>
        </div>

        {/* Demo Mode */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Play size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Demo-Modus</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Erkunde CleanOps ohne Account — wähle eine Rolle und starte sofort.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(ROLES).map(([key, role]) => (
              <button
                key={key}
                onClick={() => handleDemo(key)}
                className="group flex flex-col items-start gap-2 p-4 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl text-left transition-all"
              >
                <div className={`w-8 h-8 ${role.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <span className="text-white text-xs font-bold">
                    {role.label.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {role.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                    {role.description.split('·')[0].trim()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-700">CleanOps · Field Service Management · AT/DE</p>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Loader2, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../lib/roles'

export default function Login() {
  const navigate = useNavigate()
  const { loginDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    // Platzhalter — wird durch Supabase Auth ersetzt
    setError('Login noch nicht aktiv. Bitte Demo-Modus verwenden.')
    setLoading(false)
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
        {/* Login Card */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <h1 className="text-xl font-semibold text-white mb-1">Anmelden</h1>
          <p className="text-sm text-gray-400 mb-6">Mit deinem Account einloggen</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@firma.at"
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" />Anmelden…</> : 'Anmelden'}
            </button>
          </form>
        </div>

        {/* Demo Mode */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <Play size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Demo-Modus</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Wähle eine Rolle und erkunde CleanOps ohne Account — keine Registrierung nötig.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(ROLES).map(([key, role]) => (
              <button
                key={key}
                onClick={() => handleDemo(key)}
                className="group flex flex-col items-start gap-2 p-4 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-500 rounded-xl text-left transition-all"
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

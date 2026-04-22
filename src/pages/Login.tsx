import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError('Credenciais inválidas. Verifique seu e-mail e senha.')
        } else {
            navigate('/')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-off flex flex-col items-center justify-center px-4 text-gray-900">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight font-display text-green-700">Login Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-2">Sua central de contratos e propostas.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Senha
                                </label>
                                <Link to="/reset-password" className="text-xs text-gray-500 hover:text-green-600 transition-colors">
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white font-medium text-sm py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Entrando...' : 'Entrar na conta'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

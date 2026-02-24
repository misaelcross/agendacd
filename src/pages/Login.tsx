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
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 font-inter text-white relative overflow-hidden">
            {/* Decoração de fundo sutil */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-sm relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-medium tracking-tight">Login Dashboard</h1>
                    <p className="text-[#a1a1aa] text-sm mt-2">Sua central de contratos e propostas.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5 ml-1">
                            E-mail
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
                            <label className="block text-sm font-medium text-[#a1a1aa]">
                                Senha
                            </label>
                            <Link to="/reset-password" className="text-xs text-[#a1a1aa] hover:text-white transition-colors">
                                Esqueceu a senha?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Entrando...' : 'Entrar na conta'}
                    </button>
                </form>
            </div>
        </div>
    )
}

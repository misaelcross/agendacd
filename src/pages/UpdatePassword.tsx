import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function UpdatePassword() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    useEffect(() => {
        // Escuta evento específico de mudança de hash (quando o Supabase redireciona para cá)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // Ok, tem permissão para alterar a senha
            }
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            setLoading(false)
            return
        }

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError('Erro ao atualizar senha. Tente novamente.')
        } else {
            // Senha atualizada, redirecionar para a interface logada
            navigate('/')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 font-inter text-white relative overflow-hidden">
            <div className="w-full max-w-sm relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-medium tracking-tight">Nova Senha</h1>
                    <p className="text-[#a1a1aa] text-sm mt-2">Digite sua nova senha abaixo.</p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5 ml-1">
                            Nova Senha
                        </label>
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
                        {loading ? 'Atualizando...' : 'Atualizar senha'}
                    </button>
                </form>
            </div>
        </div>
    )
}

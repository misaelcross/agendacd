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
        <div className="min-h-screen bg-off flex flex-col items-center justify-center px-4 text-gray-900">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight font-display text-green-700">Nova Senha</h1>
                    <p className="text-gray-500 text-sm mt-2">Digite sua nova senha abaixo.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                    <form onSubmit={handleUpdate} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Nova Senha
                            </label>
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
                            {loading ? 'Atualizando...' : 'Atualizar senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function SignUp() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirm) {
            setError('As senhas não coincidem.')
            return
        }
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.')
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
            },
        })

        if (error) {
            setError(error.message === 'User already registered'
                ? 'Este e-mail já está cadastrado.'
                : `Erro ao criar conta: ${error.message}`)
        } else {
            // Confirmação de e-mail desativada — login direto
            navigate('/')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-off flex flex-col items-center justify-center px-4 text-gray-900">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight font-display text-green-700">
                        Criar conta
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">
                        Acesse o painel de agendamentos e propostas.
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                    <form onSubmit={handleSignUp} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Nome completo
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="Seu nome"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Senha
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                Confirmar senha
                            </label>
                            <input
                                type="password"
                                required
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-600 transition-colors"
                                placeholder="Repita a senha"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white font-medium text-sm py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Criando conta...' : 'Criar conta'}
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Já tem uma conta?{' '}
                    <Link to="/login" className="text-green-600 font-medium hover:text-green-700 transition-colors">
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    )
}

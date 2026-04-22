import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function ResetPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        })

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao enviar e-mail. Verifique o endereço digitado.' })
        } else {
            setMessage({ type: 'success', text: 'Link de recuperação enviado para seu e-mail!' })
            setEmail('')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-off flex flex-col items-center justify-center px-4 text-gray-900">
            <div className="w-full max-w-sm">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight font-display text-green-700">Recuperar Senha</h1>
                    <p className="text-gray-500 text-sm mt-2">Enviaremos um link para definir uma nova senha.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                    <form onSubmit={handleReset} className="space-y-4">
                        {message && (
                            <div className={`p-3 border rounded-xl text-sm text-center ${message.type === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-600'
                                    : 'bg-green-50 border-green-200 text-green-700'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                                E-mail cadastrado
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white font-medium text-sm py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center text-sm">
                    <Link to="/login" className="text-gray-500 hover:text-green-600 transition-colors">
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

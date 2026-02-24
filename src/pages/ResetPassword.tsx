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
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 font-inter text-white relative overflow-hidden">
            <div className="w-full max-w-sm relative z-10">
                <div className="mb-10 text-center">
                    <h1 className="text-2xl font-medium tracking-tight">Recuperar Senha</h1>
                    <p className="text-[#a1a1aa] text-sm mt-2">Enviaremos um link para definir uma nova senha.</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                    {message && (
                        <div className={`p-3 border rounded-xl text-sm text-center ${message.type === 'error'
                                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                : 'bg-green-500/10 border-green-500/20 text-green-400'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5 ml-1">
                            E-mail castrado
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <Link to="/login" className="text-[#a1a1aa] hover:text-white transition-colors">
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

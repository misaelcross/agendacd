import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle, ShieldCheck, DownloadSimple, SpinnerGap } from '@phosphor-icons/react'

export function ContractSign() {
    const { contractId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [contract, setContract] = useState<any>(null)
    const [token, setToken] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Timer para reenvio de código
    const [resendTimer, setResendTimer] = useState(60)
    const [isResending, setIsResending] = useState(false)

    // Status de Geração do PDF
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Autofocus input on load and window focus
    useEffect(() => {
        if (!loading && !success && inputRef.current) {
            inputRef.current.focus()
        }

        const handleFocus = () => {
            if (!loading && !success && inputRef.current) {
                inputRef.current.focus()
            }
        }
        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [loading, success])

    useEffect(() => {
        async function loadContract() {
            if (!contractId) return
            setLoading(true)

            let contractData: any = null
            let error: any = null

            const isShortId = !contractId.includes('-')

            if (isShortId) {
                const res = await supabase.rpc('get_contract_by_short_id', { p_short_id: contractId })
                contractData = res.data ? res.data[0] : null
                error = res.error

                // Fetch joined proposal
                if (contractData) {
                    const { data: propData } = await supabase.from('proposals').select('*').eq('id', contractData.proposal_id).single()
                    contractData.proposals = propData
                }
            } else {
                const res = await supabase
                    .from('contracts')
                    .select('*, proposals (*)')
                    .eq('id', contractId)
                    .single()
                contractData = res.data
                error = res.error
            }

            if (error || !contractData) {
                setError('Contrato não encontrado.')
            } else {
                setContract(contractData)
                // Se o contrato já foi assinado, mostramos a tela de sucesso diretamente
                if (contractData.status !== 'pending') {
                    setSuccess(true)
                }
            }
            setLoading(false)
        }

        loadContract()
    }, [contractId])

    const handleVerifyToken = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsVerifying(true)
        setError(null)

        try {
            // 1. Descobrir o IP do cliente (para o registro do signature_ip)
            let ip = 'Desconhecido'
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json')
                const ipData = await ipRes.json()
                ip = ipData.ip
            } catch (e) {
                console.warn('Não foi possível capturar o IP')
            }

            // 2. Chamar a RPC do banco para validar o token
            // Usando o contract.id porque é o UUID completo que a DB espera
            const { data: isValid, error: rpcError } = await supabase.rpc('validate_signature_token', {
                p_contract_id: contract.id,
                p_token: token,
                p_ip_address: ip
            })

            if (rpcError) throw rpcError

            if (!isValid) {
                throw new Error('Token inválido ou expirado. Tente gerar um novo contrato.')
            }

            // 3. Sucesso! Vamos recarregar os dados do contrato (agora com as signatures do DB)
            const { data: updatedContract } = await supabase
                .from('contracts')
                .select('*, proposals(*)')
                .eq('id', contract.id)
                .single()

            setContract(updatedContract)

            // 4. PDF export removed
            setIsGeneratingPdf(true)
            try {
                console.warn('PDF export removed')
            } catch (pdfErr) {
                console.error('Erro ao gerar/upar PDF:', pdfErr)
            } finally {
                setIsGeneratingPdf(false)
                setSuccess(true)
            }

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Código inválido ou expirado.')
        } finally {
            setIsVerifying(false)
        }
    }

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0 && !success) {
            interval = setInterval(() => setResendTimer(prev => prev - 1), 1000)
        }
        return () => clearInterval(interval)
    }, [resendTimer, success])

    const handleResendToken = async () => {
        if (!contract || isResending || resendTimer > 0) return

        setIsResending(true)
        setError(null)
        try {
            const tokenStr = Math.floor(100000 + Math.random() * 900000).toString()
            const expires = new Date(Date.now() + 15 * 60000).toISOString()

            await supabase.from('contract_tokens').insert({
                contract_id: contract.id,
                token: tokenStr,
                email: contract.contractor_email,
                expires_at: expires
            })

            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-contract-email', {
                body: { contractId: contract.id, email: contract.contractor_email, token: tokenStr, clientName: contract.contractor_name || 'Cliente' }
            })

            if (edgeError || (edgeData && edgeData.error)) {
                throw new Error('Falha ao reenviar e-mail')
            }

            setResendTimer(60)
        } catch (err: any) {
            console.error(err)
            setError('Erro ao reenviar o código. Tente novamente.')
        } finally {
            setIsResending(false)
        }
    }

    const handleDownloadPDF = async () => {
        if (contract?.signed_pdf_url) {
            window.open(contract.signed_pdf_url, '_blank')
        } else {
            console.warn('PDF export removed')
        }
    }


    if (loading) {
        return (
            <div className="min-h-screen bg-off flex items-center justify-center">
                <div className="animate-pulse text-green-600 text-sm tracking-widest uppercase">Verificando Documento...</div>
            </div>
        )
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen bg-off flex items-center justify-center text-gray-900">
                {error}
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-off flex items-center justify-center px-4 font-inter">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} weight="fill" />
                    </div>
                    <h1 className="text-3xl font-display font-bold text-gray-900 mb-2 tracking-tight">Assinatura Concluída!</h1>
                    <p className="text-gray-500 mb-8 leading-relaxed">O contrato referente ao pedido <strong className="text-gray-900">#{contract.proposal_id.split('-')[0]}</strong> foi assinado digitalmente com sucesso. Seu documento já possui validade jurídica.</p>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all mb-4 disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <SpinnerGap size={20} className="animate-spin" /> : <DownloadSimple size={20} weight="bold" />}
                        {isGeneratingPdf ? 'Preparando PDF...' : 'Baixar Cópia do Contrato (PDF)'}
                    </button>

                    <button
                        onClick={() => navigate(`/ proposta / ${contract.proposal_id.split('-')[0]} `)}
                        className="w-full bg-transparent border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-3 px-6 rounded-xl transition-all"
                    >
                        Voltar para Proposta
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-off flex flex-col items-center justify-center px-4 font-inter relative">
            <div className="max-w-sm w-full relative z-10 p-8 md:p-10 bg-white border border-gray-200 shadow-sm rounded-3xl">
                <div className="flex justify-center mb-6 text-green-600">
                    <ShieldCheck size={48} weight="duotone" />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-display font-bold text-gray-900 mb-2 tracking-tight">Assinatura do Contrato</h1>
                    <p className="text-sm text-gray-500 leading-relaxed">Enviamos um código de <strong className="text-gray-900">assinatura de 6 dígitos</strong> para o e-mail: <br /><span className="text-green-600 block mt-1">{contract.contractor_email}</span></p>
                </div>

                <form onSubmit={handleVerifyToken}>
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-3">
                            Digite o Código
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            required
                            maxLength={6}
                            value={token}
                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                            className="w-full bg-gray-50 border border-green-500/30 rounded-2xl py-4 text-center text-3xl font-bold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-gray-900 transition-all placeholder:text-gray-300"
                            style={{ letterSpacing: '0.8em', paddingLeft: '0.8em' }}
                            placeholder="000000"
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isVerifying || token.length < 6}
                        className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mb-4 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {isVerifying ? (
                            <><SpinnerGap size={20} className="animate-spin" /> Verificando...</>
                        ) : (
                            <><CheckCircle size={20} weight="bold" /> Assinar</>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleResendToken}
                        disabled={resendTimer > 0 || isResending}
                        className="w-full bg-transparent hover:bg-gray-50 active:scale-[0.98] text-gray-400 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100 text-sm"
                    >
                        {isResending ? <SpinnerGap size={16} className="animate-spin" /> : null}
                        {resendTimer > 0 ? `Aguarde ${resendTimer}s para reenviar` : 'Não recebi o código (Reenviar)'}
                    </button>
                </form>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400 max-w-sm">
                Ao clicar em assinar, você concorda com os termos propostos e sua assinatura digital terá validade jurídica mediante registro de IP e data.
            </div>
        </div>
    )
}

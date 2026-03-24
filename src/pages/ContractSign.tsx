import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircle, ShieldCheck, DownloadSimple, SpinnerGap } from '@phosphor-icons/react'
import { ContractPDF } from '../components/ContractPDF'
// @ts-ignore
import { pdf } from '@react-pdf/renderer'

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

            // 4. Gerar o PDF Assinado e subir pro Storage do Supabase silenciosamente
            setIsGeneratingPdf(true)
            try {
                const asPdf = pdf(<ContractPDF contract={updatedContract} proposal={updatedContract.proposals} />)
                const blob = await asPdf.toBlob()

                // Upload to storage
                const fileName = `${contract.id} _signed.pdf`
                const { error: uploadError } = await supabase.storage
                    .from('contracts')
                    .upload(fileName, blob, {
                        contentType: 'application/pdf',
                        upsert: true
                    })

                if (!uploadError) {
                    // Pegar URL Pública e atualizar o contrato
                    const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(fileName)
                    if (urlData.publicUrl) {
                        const { data: savePdfResult, error: savePdfError } = await supabase.rpc('set_signed_pdf_url', {
                            p_contract_id: contract.id,
                            p_signed_pdf_url: urlData.publicUrl
                        })

                        if (savePdfError || !savePdfResult) {
                            console.error('Erro ao salvar signed_pdf_url no banco:', savePdfError)
                        }

                        // Enviar e-mail automático com o PDF assinado
                        try {
                            await supabase.functions.invoke('send-contract-email', {
                                body: {
                                    contractId: contract.id,
                                    email: contract.contractor_email,
                                    clientName: contract.contractor_name || 'Cliente',
                                    pdfUrl: urlData.publicUrl
                                }
                            })
                        } catch (emailErr) {
                            console.error('Erro ao enviar pdf por email:', emailErr)
                        }

                        setContract({ ...updatedContract, signed_pdf_url: urlData.publicUrl })
                    }
                }
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
            // Caso dê bug e o URL não tenha salvado, gerar na hora para download
            setIsGeneratingPdf(true)
            const asPdf = pdf(<ContractPDF contract={contract} proposal={contract.proposals} />)
            const blob = await asPdf.toBlob()
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
            setIsGeneratingPdf(false)
        }
    }


    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-pulse text-orange-500 text-sm tracking-widest uppercase">Verificando Documento...</div>
            </div>
        )
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
                {error}
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 font-inter">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} weight="fill" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Assinatura Concluída!</h1>
                    <p className="text-neutral-400 mb-8 leading-relaxed">O contrato referente ao pedido <strong className="text-white">#{contract.proposal_id.split('-')[0]}</strong> foi assinado digitalmente com sucesso. Seu documento já possui validade jurídica.</p>

                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="w-full bg-white text-black hover:bg-neutral-200 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all mb-4 disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <SpinnerGap size={20} className="animate-spin" /> : <DownloadSimple size={20} weight="bold" />}
                        {isGeneratingPdf ? 'Preparando PDF...' : 'Baixar Cópia do Contrato (PDF)'}
                    </button>

                    <button
                        onClick={() => navigate(`/ proposta / ${contract.proposal_id.split('-')[0]} `)}
                        className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-neutral-300 font-medium py-3 px-6 rounded-xl transition-all"
                    >
                        Voltar para Proposta
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 font-inter relative">
            <div className="max-w-sm w-full relative z-10 p-8 md:p-10 bg-[#111] border border-white/5 shadow-2xl rounded-3xl">
                <div className="flex justify-center mb-6 text-orange-500">
                    <ShieldCheck size={48} weight="duotone" />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Assinatura do Contrato</h1>
                    <p className="text-sm text-neutral-400 leading-relaxed">Enviamos um código de <strong className="text-white">assinatura de 6 dígitos</strong> para o e-mail: <br /><span className="text-orange-400 block mt-1">{contract.contractor_email}</span></p>
                </div>

                <form onSubmit={handleVerifyToken}>
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest text-center mb-3">
                            Digite o Código
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            required
                            maxLength={6}
                            value={token}
                            onChange={(e) => setToken(e.target.value.toUpperCase())}
                            className="w-full bg-black/60 border border-orange-500/30 rounded-2xl py-4 text-center text-3xl font-bold focus:outline-none focus:border-orange-500 text-white transition-all placeholder:text-white/10"
                            style={{ letterSpacing: '0.8em', paddingLeft: '0.8em' }}
                            placeholder="000000"
                            autoComplete="off"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isVerifying || token.length < 6}
                        className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mb-4 disabled:opacity-50 disabled:active:scale-100"
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
                        className="w-full bg-transparent hover:bg-white/5 active:scale-[0.98] text-neutral-400 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:active:scale-100 text-sm"
                    >
                        {isResending ? <SpinnerGap size={16} className="animate-spin" /> : null}
                        {resendTimer > 0 ? `Aguarde ${resendTimer}s para reenviar` : 'Não recebi o código (Reenviar)'}
                    </button>
                </form>
            </div>

            <div className="mt-8 text-center text-xs text-neutral-600 max-w-sm">
                Ao clicar em assinar, você concorda com os termos propostos e sua assinatura digital terá validade jurídica mediante registro de IP e data.
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, User, Briefcase, ArrowRight, CreditCard, CheckCircle } from '@phosphor-icons/react'

export function ContractForm() {
    const { proposalId } = useParams()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [proposal, setProposal] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Formulário
    const [step, setStep] = useState(1)
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit'>('pix')
    const [installments, setInstallments] = useState(1)

    const [type, setType] = useState<'pf' | 'pj'>('pf')
    const [name, setName] = useState('')
    const [documentNumber, setDocumentNumber] = useState('')
    const [address, setAddress] = useState('')
    const [addressNumber, setAddressNumber] = useState('')
    const [neighborhood, setNeighborhood] = useState('')
    const [cep, setCep] = useState('')
    const [city, setCity] = useState('')
    const [stateUF, setStateUF] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    // Apenas PJ
    const [respName, setRespName] = useState('')
    const [respCpf, setRespCpf] = useState('')

    const UFs = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ]



    useEffect(() => {
        async function loadProposal() {
            if (!proposalId) return
            setLoading(true)

            const isShortId = !proposalId.includes('-')
            let data: any = null
            let error: any = null

            if (isShortId) {
                const res = await supabase.rpc('get_proposal_by_short_id', { p_short_id: proposalId })
                data = res.data ? res.data[0] : null
                error = res.error
            } else {
                const res = await supabase.from('proposals').select('*').eq('id', proposalId).single()
                data = res.data
                error = res.error
            }

            if (error || !data) {
                setError('Proposta não encontrada.')
            } else {
                setProposal(data)
            }
            setLoading(false)
        }
        loadProposal()
    }, [proposalId])

    const maskCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const maskCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const maskPhone = (value: string) => {
        let r = value.replace(/\D/g, '')
        r = r.replace(/^0/, '')
        if (r.length > 10) {
            r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3')
        } else if (r.length > 5) {
            r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3')
        } else if (r.length > 2) {
            r = r.replace(/^(\d\d)(\d{0,5})/, '($1) $2')
        } else if (r.length > 0) {
            r = r.replace(/^(\d*)/, '($1')
        }
        return r
    }

    const maskCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/\.(\d{3})(\d)/, '.$1-$2')
            .replace(/(-\d{3})\d+?$/, '$1')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!proposal) return

        setSubmitting(true)
        setError(null)

        try {
            // 1. Extrair informações de prazo e valor
            const deadlineDays = parseInt(proposal.delivery_time) || 0;

            // Montar a descrição dos serviços somados
            const projectDesc = proposal.items && proposal.items.length > 0
                ? proposal.items.map((i: any) => `- ${i.title}: ${i.description.replace(/\n/g, ' ')}`).join('\n')
                : proposal.project_title;

            // 2. Inserir Contrato (o RLS diz: Public can insert contracts)
            const { data: contract, error: contractError } = await supabase.from('contracts').insert({
                proposal_id: proposal.id,
                contractor_type: type,
                contractor_name: name,
                contractor_document: documentNumber,
                contractor_address: address,
                contractor_number: addressNumber,
                contractor_neighborhood: neighborhood,
                contractor_cep: cep,
                contractor_city: city,
                contractor_state: stateUF,
                contractor_email: email,
                contractor_phone: phone,
                responsible_name: type === 'pj' ? respName : null,
                responsible_cpf: type === 'pj' ? respCpf : null,
                status: 'pending',
                project_description: projectDesc,
                project_value: proposal.value,
                project_deadline_days: deadlineDays
            }).select().single()

            if (contractError) throw contractError

            // 3. Gerar Token e Inserir
            const tokenStr = Math.floor(100000 + Math.random() * 900000).toString()
            const expires = new Date(Date.now() + 15 * 60000).toISOString() // 15 min

            const { error: tokenError } = await supabase.from('contract_tokens').insert({
                contract_id: contract.id,
                token: tokenStr,
                email: email,
                expires_at: expires
            })

            if (tokenError) throw tokenError

            // 4. Chamar Edge Function para enviar e-mail
            const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-contract-email', {
                body: { contractId: contract.id, email, token: tokenStr, clientName: name }
            })

            if (edgeError || (edgeData && edgeData.error)) {
                console.error('Função de e-mail falhou:', edgeError || edgeData?.error)
                setError('Ocorreu um erro ao enviar o e-mail com o token. Verifique seus logs/API Key no Supabase.')
                setSubmitting(false)
                return // Aborta a navegação se o e-mail não chegou!
            }

            // 5. Ir para a tela de Assinatura (short ID do contrato)
            const shortContractId = contract.id.split('-')[0]
            navigate(`/proposta/${shortContractId}/assinar`)

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Erro ao gerar gerar contrato.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-pulse text-orange-500 text-sm tracking-widest uppercase">Carregando Dados...</div>
            </div>
        )
    }

    if (error && !proposal) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
                {error}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white font-inter py-12 px-4 selection:bg-orange-500/30">
            <div className="max-w-3xl mx-auto">
                <div className="relative flex items-center justify-center mb-8">
                    <button
                        onClick={() => step === 1 ? navigate(`/proposta/${proposalId}`) : setStep(step - 1)}
                        className="absolute left-0 p-2 text-neutral-400 hover:text-white transition-colors flex items-center justify-center"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} weight="bold" />
                    </button>
                    <h1 className="text-white font-bold text-lg tracking-wide">Assinar contrato</h1>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-[#111] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">


                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* ----------------- PASSO 1: PAGAMENTO ----------------- */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-20">
                                <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">1. Como prefere pagar?</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all hover:-translate-y-1 ${paymentMethod === 'pix' ? 'bg-[#4db6ac]/10 border-[#4db6ac] shadow-[0_5px_20px_rgba(77,182,172,0.15)] focus:outline-none focus:ring-2 focus:ring-[#4db6ac]/50' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                                    >
                                        <div className={`p-3 rounded-xl ${paymentMethod === 'pix' ? 'bg-[#4db6ac]/20 text-[#4db6ac]' : 'bg-white/5 text-neutral-400'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 48">
                                                <path fill="currentColor" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76	l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"></path>
                                                <path fill="currentColor" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76	l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"></path>
                                                <path fill="currentColor" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0	l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17	l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26	C46.65,21.88,46.65,26.12,44.04,28.74z"></path>
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-white text-lg">Pix</h4>
                                            <p className="text-sm text-neutral-400 mt-1">À vista com desconto especial</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit')}
                                        className={`flex flex-col items-start gap-4 p-6 rounded-2xl border transition-all hover:-translate-y-1 ${paymentMethod === 'credit' ? 'bg-blue-500/10 border-blue-500 shadow-[0_5px_20px_rgba(59,130,246,0.15)] focus:outline-none focus:ring-2 focus:ring-blue-500/50' : 'bg-black/40 border-white/10 hover:border-white/20'}`}
                                    >
                                        <div className={`p-3 rounded-xl ${paymentMethod === 'credit' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-neutral-400'}`}>
                                            <CreditCard size={32} weight={paymentMethod === 'credit' ? 'duotone' : 'regular'} />
                                        </div>
                                        <div className="text-left">
                                            <h4 className="font-bold text-white text-lg">Cartão de Crédito</h4>
                                            <p className="text-sm text-neutral-400 mt-1">Parcelamento flexível em até 5x</p>
                                        </div>
                                    </button>
                                </div>

                                {paymentMethod === 'credit' && (
                                    <div className="mt-8 p-6 bg-black/40 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-4">
                                        <label className="block text-sm font-bold text-neutral-300 mb-4">Escolha o número de parcelas:</label>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                                            {[1, 2, 3, 4, 5].map(num => (
                                                <button
                                                    key={num}
                                                    type="button"
                                                    onClick={() => setInstallments(num)}
                                                    className={`shrink-0 w-16 h-16 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${installments === num ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400' : 'bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    <span className="text-xl">{num}x</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 active:scale-[0.98] transition-all text-white font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]"
                                    >
                                        Próximo
                                        <ArrowRight size={20} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ----------------- PASSO 2: DADOS PESSOAIS ----------------- */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-20">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
                                    <h3 className="text-xl font-bold text-white">2. Dados de Faturamento</h3>

                                    <div className="flex gap-1 p-1 bg-black/40 border border-white/5 rounded-xl w-fit">
                                        <button
                                            type="button"
                                            onClick={() => { setType('pf'); setDocumentNumber(''); }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${type === 'pf' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <User size={16} /> Física
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setType('pj'); setDocumentNumber(''); }}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${type === 'pj' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                                        >
                                            <Briefcase size={16} /> Jurídica
                                        </button>
                                    </div>
                                </div>



                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">{type === 'pf' ? 'Nome Completo' : 'Razão Social'}</label>
                                        <input required value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors placeholder:text-neutral-600" placeholder={type === 'pf' ? 'Ex: Alexander Bragato' : 'Ex: Conversão Digital LTDA'} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">{type === 'pf' ? 'CPF' : 'CNPJ'}</label>
                                        <input
                                            required value={documentNumber} onChange={(e) => setDocumentNumber(type === 'pf' ? maskCPF(e.target.value) : maskCNPJ(e.target.value))}
                                            type="text" placeholder={type === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors placeholder:text-neutral-600"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">E-mail (Para receber código de verificação)</label>
                                        <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="seu.email@exemplo.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors placeholder:text-neutral-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Telefone / WhatsApp</label>
                                        <input
                                            required value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))}
                                            type="text" placeholder="(00) 00000-0000"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors placeholder:text-neutral-600"
                                        />
                                    </div>
                                </div>

                                {type === 'pj' && (
                                    <div className="mt-8 p-6 bg-black/30 border border-neutral-800 rounded-2xl animate-in fade-in slide-in-from-top-4">
                                        <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4">Representante Legal (Assinante)</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Nome Completo</label>
                                                <input required value={respName} onChange={(e) => setRespName(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">CPF</label>
                                                <input
                                                    required value={respCpf} onChange={(e) => setRespCpf(maskCPF(e.target.value))}
                                                    type="text" placeholder="000.000.000-00"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-8 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all text-neutral-300 font-bold px-2 py-4 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={20} weight="bold" />
                                        Voltar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (name.length > 3 && documentNumber.length >= 14 && email.includes('@')) {
                                                setStep(3);
                                            } else {
                                                const btn = document.createElement('button');
                                                btn.type = 'submit';
                                                btn.style.display = 'none';
                                                document.forms[0].appendChild(btn);
                                                btn.click();
                                                document.forms[0].removeChild(btn);
                                            }
                                        }}
                                        className="flex-1 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] transition-all text-white font-bold px-2 py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]"
                                    >
                                        Próximo
                                        <ArrowRight size={20} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ----------------- PASSO 3: ENDEREÇO E FINALIZAÇÃO ----------------- */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-20">
                                <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">3. Endereço</h3>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">CEP</label>
                                        <input
                                            required value={cep} onChange={(e) => setCep(maskCEP(e.target.value))}
                                            type="text" placeholder="00000-000"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Logradouro (Rua, Av)</label>
                                        <input required value={address} onChange={(e) => setAddress(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Número</label>
                                        <input required value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Bairro</label>
                                        <input required value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Cidade</label>
                                        <input required value={city} onChange={(e) => setCity(e.target.value)} type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors" />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-medium text-neutral-400 mb-1.5 ml-1">Estado</label>
                                        <select
                                            required value={stateUF} onChange={(e) => setStateUF(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-colors custom-select appearance-none"
                                        >
                                            <option value="" disabled>UF</option>
                                            {UFs.map(uf => (
                                                <option key={uf} value={uf}>{uf}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 active:scale-[0.98] transition-all text-neutral-300 font-bold px-2 py-4 rounded-xl flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft size={20} weight="bold" />
                                        Voltar
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all text-white font-bold px-2 py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_25px_rgba(22,163,74,0.5)]"
                                    >
                                        {submitting ? 'Gerando...' : (
                                            <>
                                                <CheckCircle size={20} weight="bold" />
                                                Assinar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </div>
    )
}

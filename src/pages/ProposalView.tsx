import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
    WhatsappLogo,
    EnvelopeSimple,
    Package,
    Monitor,
    Laptop,
    ShoppingCart,
    RocketLaunch,
    ChatCircleDots,
    CheckCircle,
    Receipt,
    CaretUp,
    CaretDown
} from '@phosphor-icons/react'
// @ts-ignore
import html2pdf from 'html2pdf.js'

interface ProposalItem {
    title: string
    description: string
    type: 'Pontual' | 'Mensal'
    price: number
    quantity?: number
}

interface Proposal {
    id: string
    client_name: string
    project_title: string
    description: string
    value: number
    status: string
    created_at: string
    delivery_time?: string
    valid_until?: string
    items?: ProposalItem[]
}

const SETTINGS_ID = '550e8400-e29b-41d4-a716-446655440000'

export function ProposalView() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [proposal, setProposal] = useState<Proposal | null>(null)
    const [loading, setLoading] = useState(true)
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false)

    useEffect(() => {
        async function fetchData() {
            if (!id) return
            setLoading(true)

            try {
                // Determine if 'id' is a full UUID or a short ID
                const isShortId = !id.includes('-');

                let proposalPromise: any;
                if (isShortId) {
                    proposalPromise = supabase.rpc('get_proposal_by_short_id', { p_short_id: id });
                } else {
                    proposalPromise = supabase.from('proposals').select('*').eq('id', id).single();
                }

                // Fetch proposal and settings in parallel
                const [proposalRes, settingsRes] = await Promise.all([
                    proposalPromise,
                    supabase.from('settings').select('logo_url').eq('id', SETTINGS_ID).single()
                ])

                if (!proposalRes.error && proposalRes.data) {
                    // If using RPC, data is an array, so take the first element
                    const proposalData = isShortId ? proposalRes.data[0] : proposalRes.data;
                    setProposal(proposalData as Proposal);
                } else if (proposalRes.error) {
                    console.error('Error fetching proposal:', proposalRes.error);
                }

                if (!settingsRes.error && settingsRes.data) {
                    setLogoUrl(settingsRes.data.logo_url)
                } else if (settingsRes.error) {
                    console.error('Error fetching settings:', settingsRes.error);
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    useEffect(() => {
        if (!loading && proposal) {
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('export') === 'pdf') {
                generatePdf(urlParams.get('mobile') === 'true')
            }
        }
    }, [loading, proposal])

    const generatePdf = async (isMobile: boolean) => {
        setIsExporting(true)
        await new Promise(resolve => setTimeout(resolve, 2000))

        const element = document.getElementById('proposal-container')
        if (!element) {
            setIsExporting(false)
            return
        }

        try {
            const width = isMobile ? 430 : 1200;
            window.scrollTo(0, 0);
            const height = element.scrollHeight;

            const opt = {
                margin: 0,
                filename: `Proposta_${proposal?.client_name.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#0C0A09',
                    windowWidth: width,
                    width: width,
                    height: height,
                    scrollY: 0,
                    scrollX: 0,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'px',
                    format: [width, height] as [number, number],
                    orientation: 'portrait' as const,
                    hotfixes: ['px_scaling'],
                    compress: true
                }
            };

            await html2pdf().set(opt).from(element).save()

            setTimeout(() => {
                const urlParams = new URLSearchParams(window.location.search)
                if (urlParams.get('export') === 'pdf') {
                    window.close()
                }
            }, 1000)
        } catch (err) {
            console.error(err)
            alert('Erro ao gerar PDF')
        } finally {
            setIsExporting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center">
                <div className="animate-pulse text-orange-500 font-medium tracking-widest text-sm uppercase">Carregando Proposta...</div>
            </div>
        )
    }

    if (!proposal) {
        return (
            <div className="min-h-screen bg-[#111] flex items-center justify-center">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">Proposta não encontrada</h1>
                    <p className="text-neutral-500">O link que você tentou acessar é inválido.</p>
                </div>
            </div>
        )
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

    const items = proposal.items || []
    const subtotalUnico = items.filter(i => i.type === 'Pontual' || i.type === 'Único' as any).reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0)
    const subtotalMensal = items.filter(i => i.type === 'Mensal').reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0)
    const total = items.length > 0 ? (subtotalUnico + subtotalMensal) : proposal.value

    const formatDate = (dateString?: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    }

    const getServiceIcon = (title: string) => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('landing') || lowerTitle.includes('lp')) {
            return { icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' };
        }
        if (lowerTitle.includes('site') || lowerTitle.includes('laptop') || lowerTitle.includes('institucional')) {
            return { icon: Laptop, color: 'text-cyan-400', bg: 'bg-cyan-400/10' };
        }
        if (lowerTitle.includes('ecommerce') || lowerTitle.includes('loja') || lowerTitle.includes('vendas')) {
            return { icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10' };
        }
        if (lowerTitle.includes('lançamento') || lowerTitle.includes('foguete') || lowerTitle.includes('vls')) {
            return { icon: RocketLaunch, color: 'text-red-400', bg: 'bg-red-400/10' };
        }
        return { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' };
    }

    return (
        <div id="proposal-container" className="min-h-screen bg-[#0C0A09] text-white font-sans overflow-x-clip relative flex justify-center selection:bg-orange-500/30">
            <div className="absolute inset-0 bg-[#0C0A09] pointer-events-none" />

            {isExporting && (
                <div data-html2canvas-ignore="true" className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-white text-lg font-medium">Gerando PDF...</p>
                </div>
            )}

            <div className="absolute inset-0 pointer-events-none z-0">
                <img
                    src="https://images.unsplash.com/photo-1700585295276-f272574889d5?q=80&w=985&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt="background"
                    className="w-full h-full object-cover opacity-10 -z-1"
                />
            </div>

            <div className="w-full max-w-7xl px-6 py-6 md:py-12 relative z-10 pb-32 lg:pb-12">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 md:mb-16 mx-auto">
                    <div className="flex items-center gap-3">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <>
                                <div className="text-orange-500">
                                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 0L40 10V30L20 40L0 30V10L20 0Z" fill="currentColor" fillOpacity="0.1" />
                                        <path d="M20 5L35 12.5V27.5L20 35L5 27.5V12.5L20 5Z" stroke="currentColor" strokeWidth="2" />
                                        <path d="M20 15L25 25H15L20 15Z" fill="currentColor" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">Conversão</h1>
                                    <h1 className="text-2xl font-bold leading-tight tracking-tight text-orange-500">Digital</h1>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2 md:gap-4 p-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                        <a href="https://wa.me/+5515998074956" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 md:px-4 py-2 hover:bg-white/5 rounded-full transition-colors hidden md:flex">
                            <WhatsappLogo size={20} className="text-orange-500" />
                            <span className="text-sm font-medium text-neutral-300">15 99807-4956</span>
                        </a>
                        <a href="https://wa.me/+5515998074956" target="_blank" rel="noreferrer" className="flex md:hidden items-center justify-center w-10 h-10 hover:bg-white/5 rounded-full transition-colors">
                            <WhatsappLogo size={20} className="text-orange-500" />
                        </a>

                        <a href="mailto:contato@conversao.digital" className="flex items-center gap-2 px-3 md:px-4 py-2 hover:bg-white/5 rounded-full transition-colors hidden md:flex">
                            <EnvelopeSimple size={20} className="text-orange-500" />
                            <span className="text-sm font-medium text-neutral-300">contato@conversao.digital</span>
                        </a>
                        <a href="mailto:contato@conversao.digital" className="flex md:hidden items-center justify-center w-10 h-10 hover:bg-white/5 rounded-full transition-colors">
                            <EnvelopeSimple size={20} className="text-orange-500" />
                        </a>
                    </div>
                </header>

                <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 mx-auto">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-none">Seu Orçamento</h1>
                            <span className="bg-white/10 text-neutral-300 text-[10px] md:text-xs px-2 py-0.5 md:py-1 rounded-full font-medium h-fit self-center">
                                #{proposal.id.split('-')[0]}
                            </span>
                        </div>
                        <p className="text-neutral-500 font-medium text-sm md:text-lg">{items.length} {items.length === 1 ? 'Item selecionado' : 'Itens selecionados'}</p>
                    </div>
                </div>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* First Column: Structural Info + Services */}
                    <div className="lg:col-span-8 flex flex-col gap-8">

                        {/* Structural Info (Horizontal Row/Compact Grid) */}
                        <div className="border border-white/10 rounded-2xl grid grid-cols-2 lg:grid-cols-3 divide-x divide-y lg:divide-y-0 divide-white/5 bg-[#121212]/50">
                            <div className="p-4 flex flex-col justify-center col-span-2 lg:col-span-1">
                                <p className="text-[9px] md:text-[10px] text-neutral-500 mb-1 uppercase tracking-widest font-bold">Cliente</p>
                                <p className="text-sm md:text-base font-medium text-neutral-200 truncate">{proposal.client_name}</p>
                            </div>
                            <div className="p-4 flex flex-col justify-center border-t-0 lg:border-l">
                                <p className="text-[9px] md:text-[10px] text-neutral-500 mb-1 uppercase tracking-widest font-bold">Data do Pedido</p>
                                <p className="text-sm md:text-base font-medium text-neutral-200">{formatDate(proposal.created_at)}</p>
                                <p className="text-[9px] md:text-[10px] text-neutral-600 mt-0.5 italic">Válido até {formatDate(proposal.valid_until)}</p>
                            </div>
                            <div className="p-4 flex flex-col justify-center">
                                <p className="text-[9px] md:text-[10px] text-neutral-500 mb-1 uppercase tracking-widest font-bold">Data de Entrega</p>
                                <p className="text-sm md:text-base font-medium text-neutral-200">{proposal.delivery_time || 'A combinar'}</p>
                            </div>
                        </div>

                        {/* Services List - Backgrounds Removed */}
                        <div className="space-y-6">
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em] mb-4 ml-2">Serviços</h2>
                            {items.length > 0 ? items.map((item, index) => {
                                const style = getServiceIcon(item.title);
                                return (
                                    <div key={index} className="border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-8 flex flex-row gap-4 md:gap-8 hover:border-white/10 hover:bg-white/[0.02] transition-all group lg:items-center">
                                        <div className={`w-14 h-14 md:w-32 md:h-32 ${style.bg} rounded-xl md:rounded-3xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner group-hover:scale-105 transition-transform`}>
                                            <style.icon size={28} className={`md:hidden ${style.color}`} weight="duotone" />
                                            <style.icon size={56} className={`hidden md:block ${style.color}`} weight="duotone" />
                                        </div>

                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-2 md:mb-3">
                                                <h3 className="text-lg md:text-2xl font-semibold text-white group-hover:text-orange-400 transition-colors tracking-tight leading-tight">
                                                    {item.quantity && item.quantity > 1 && <span className="text-orange-400 mr-2">{item.quantity}x</span>}
                                                    {item.title}
                                                </h3>
                                                <div className="text-left md:text-right flex items-center gap-2 md:block">
                                                    <div className="text-lg md:text-2xl font-bold text-white leading-tight">{formatCurrency(item.price * (item.quantity || 1))}</div>
                                                    <span className={`text-[9px] md:text-[10px] uppercase tracking-widest font-bold ${item.type === 'Mensal' ? 'text-blue-400' : 'text-green-400'} mt-0.5`}>
                                                        {item.type}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-neutral-400 text-xs md:text-sm leading-relaxed max-w-2xl">
                                                {item.description.split('\n').map((line, i) => {
                                                    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•')
                                                    return (
                                                        <p key={i} className={isBullet ? "flex gap-2 mb-0.5 md:mb-1" : "mb-0.5 md:mb-1"}>
                                                            {isBullet && <span className="text-orange-500/50 pt-0.5 md:pt-0">•</span>}
                                                            <span>{line.replace(/^[-•]\s*/, '')}</span>
                                                        </p>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-neutral-500 italic pb-8 rounded-3xl p-12 border border-white/5 text-center">
                                    Nenhum serviço discriminado neste orçamento.
                                </div>
                            )}
                        </div>

                        {/* Compact Terms - Backgrounds Removed */}
                        <div className="pt-8 border-t border-white/10 mt-12 mb-12">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6">Informações Importantes</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="text-[11px] text-neutral-500 flex gap-2">
                                    <span className="text-orange-500/40">•</span> Início imediato após o aceite e pagamento inicial de 50%.
                                </div>
                                <div className="text-[11px] text-neutral-500 flex gap-2">
                                    <span className="text-orange-500/40">•</span> Saldo remanescente a ser quitado no ato da entrega final.
                                </div>
                                <div className="text-[11px] text-neutral-500 flex gap-2">
                                    <span className="text-orange-500/40">•</span> Inclui suporte e até 3 rodadas de ajustes pontuais.
                                </div>
                                <div className="text-[11px] text-neutral-500 flex gap-2">
                                    <span className="text-orange-500/40">•</span> Prazo de validade do orçamento conforme indicado no cabeçalho.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Column: Financial Summary (Sticky Desktop) - Hidden on Mobile */}
                    <div className="hidden lg:flex lg:col-span-4 lg:sticky lg:top-8 self-start flex-col gap-6">

                        {/* Financial Summary Box */}
                        <div className="p-8 border border-white/10 rounded-3xl bg-gradient-to-br from-[#121212] to-black shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col gap-8">
                                <div>
                                    <p className="text-[10px] text-neutral-500 mb-2 uppercase tracking-[0.2em] font-bold">Investimento Total</p>
                                    <div className="text-5xl font-bold tracking-tighter text-white mb-2 flex items-baseline gap-2">
                                        {formatCurrency(total)}
                                        <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">BRL</span>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-8 border-t border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-neutral-400">Pagamento Pontual</span>
                                        <span className="text-sm font-semibold text-neutral-200">{formatCurrency(subtotalUnico)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-neutral-400">Manutenção Mensal</span>
                                        <span className="text-sm font-semibold text-neutral-200">{formatCurrency(subtotalMensal)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        onClick={() => navigate(`/proposta/${id}/contratar`)}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-[0.98]">
                                        <CheckCircle size={22} weight="bold" />
                                        Quero Contratar Agora
                                    </button>
                                    <button
                                        onClick={() => {
                                            const wppMessage = encodeURIComponent(`Olá, quero negociar o valor da proposta: ${window.location.origin}/proposta/${id?.split('-')[0]}`);
                                            window.open(`https://wa.me/5515997891687?text=${wppMessage}`, '_blank');
                                        }}
                                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-300 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                        <ChatCircleDots size={22} />
                                        Negociar Proposta
                                    </button>
                                </div>

                                <div className="pt-6 border-t border-white/5 space-y-4">
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Formas de Pagamento</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20" height="20" viewBox="0 0 48 48">
                                                <path fill="#4db6ac" d="M11.9,12h-0.68l8.04-8.04c2.62-2.61,6.86-2.61,9.48,0L36.78,12H36.1c-1.6,0-3.11,0.62-4.24,1.76	l-6.8,6.77c-0.59,0.59-1.53,0.59-2.12,0l-6.8-6.77C15.01,12.62,13.5,12,11.9,12z"></path><path fill="#4db6ac" d="M36.1,36h0.68l-8.04,8.04c-2.62,2.61-6.86,2.61-9.48,0L11.22,36h0.68c1.6,0,3.11-0.62,4.24-1.76	l6.8-6.77c0.59-0.59,1.53-0.59,2.12,0l6.8,6.77C32.99,35.38,34.5,36,36.1,36z"></path><path fill="#4db6ac" d="M44.04,28.74L38.78,34H36.1c-1.07,0-2.07-0.42-2.83-1.17l-6.8-6.78c-1.36-1.36-3.58-1.36-4.94,0	l-6.8,6.78C13.97,33.58,12.97,34,11.9,34H9.22l-5.26-5.26c-2.61-2.62-2.61-6.86,0-9.48L9.22,14h2.68c1.07,0,2.07,0.42,2.83,1.17	l6.8,6.78c0.68,0.68,1.58,1.02,2.47,1.02s1.79-0.34,2.47-1.02l6.8-6.78C34.03,14.42,35.03,14,36.1,14h2.68l5.26,5.26	C46.65,21.88,46.65,26.12,44.04,28.74z"></path>
                                            </svg>
                                        </div>
                                        <span className="text-xs text-neutral-400 font-medium tracking-tight">Pix (5% de desconto à vista)</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <rect x="2" y="5" width="20" height="14" rx="2" stroke="#3b82f6" strokeWidth="2" />
                                                <path d="M2 10H22" stroke="#3b82f6" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        <span className="text-xs text-neutral-400 font-medium tracking-tight">Cartão de Crédito em até 5x</span>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 p-8 text-white/[0.02] pointer-events-none -mr-8 -mt-8 rotate-12">
                                <Receipt size={200} weight="thin" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Action Footer */}
            <div data-html2canvas-ignore="true" className={`fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/90 backdrop-blur-xl lg:hidden z-40 transition-all duration-300 ease-in-out ${isSummaryExpanded ? 'pb-8 pt-6 px-6' : 'pb-8 pt-5 px-5 h-[100px]'}`}>
                {/* Expand/Collapse Toggle Button */}
                <button
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-6 bg-black/80 backdrop-blur-md border border-white/10 border-b-0 rounded-t-xl flex items-center justify-center text-neutral-400 active:text-white"
                >
                    {isSummaryExpanded ? <CaretDown size={20} weight="bold" /> : <CaretUp size={20} weight="bold" />}
                </button>

                {/* Expanded Content */}
                {isSummaryExpanded && (
                    <div className="mb-6 pt-2 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500 uppercase tracking-widest font-bold">Investimento Pontual</span>
                                <span className="font-semibold text-neutral-200">{formatCurrency(subtotalUnico)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500 uppercase tracking-widest font-bold">Investimento Mensal</span>
                                <span className="font-semibold text-neutral-200">{formatCurrency(subtotalMensal)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-3">
                            <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">Formas de Pagamento</p>
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[11px] text-neutral-400">Pix (5% de desconto à vista)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span className="text-[11px] text-neutral-400">Cartão de Crédito em até 5x</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`flex items-center justify-between gap-4 ${isSummaryExpanded ? 'pt-4 border-t border-white/5' : ''}`}>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Total</span>
                        <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(total)}</span>
                    </div>
                    <button
                        onClick={() => navigate(`/proposta/${id}/contratar`)}
                        className="bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all flex-1 max-w-[200px] shadow-lg shadow-orange-500/20">
                        <CheckCircle size={20} weight="bold" />
                        Contratar
                    </button>
                </div>
            </div>
        </div>
    )
}

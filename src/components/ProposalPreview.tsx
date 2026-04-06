import { Monitor, Laptop, ShoppingCart, RocketLaunch, Package } from '@phosphor-icons/react'
import type { ProposalData } from '../types/proposal'

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

const getServiceIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('landing') || lowerTitle.includes('lp'))
        return { icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' }
    if (lowerTitle.includes('site') || lowerTitle.includes('laptop') || lowerTitle.includes('institucional'))
        return { icon: Laptop, color: 'text-cyan-400', bg: 'bg-cyan-400/10' }
    if (lowerTitle.includes('ecommerce') || lowerTitle.includes('loja') || lowerTitle.includes('vendas'))
        return { icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10' }
    if (lowerTitle.includes('lançamento') || lowerTitle.includes('foguete') || lowerTitle.includes('vls'))
        return { icon: RocketLaunch, color: 'text-red-400', bg: 'bg-red-400/10' }
    return { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' }
}

interface ProposalPreviewProps {
    proposal: ProposalData
}

export function ProposalPreview({ proposal }: ProposalPreviewProps) {
    const items = proposal.items || []
    const subtotalUnico = items.filter(i => i.type === 'Pontual' || i.type === 'Único' as any).reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0)
    const subtotalMensal = items.filter(i => i.type === 'Mensal').reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0)
    const total = subtotalUnico + subtotalMensal

    return (
        <div className="space-y-4">
            {/* Info Grid */}
            <div className="border border-white/10 rounded-xl grid grid-cols-3 divide-x divide-white/5 bg-[#121212]/50">
                <div className="p-3">
                    <p className="text-[9px] text-neutral-500 mb-0.5 uppercase tracking-widest font-bold">Cliente</p>
                    <p className="text-sm font-medium text-neutral-200 truncate">{proposal.client_name}</p>
                </div>
                <div className="p-3">
                    <p className="text-[9px] text-neutral-500 mb-0.5 uppercase tracking-widest font-bold">Entrega</p>
                    <p className="text-sm font-medium text-neutral-200">{proposal.delivery_time}</p>
                </div>
                <div className="p-3">
                    <p className="text-[9px] text-neutral-500 mb-0.5 uppercase tracking-widest font-bold">Válido até</p>
                    <p className="text-sm font-medium text-neutral-200">{formatDate(proposal.valid_until)}</p>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] ml-1">Serviços</h3>
                {items.map((item, index) => {
                    const style = getServiceIcon(item.title)
                    return (
                        <div key={index} className="border border-white/5 rounded-xl p-4 flex gap-4 hover:border-white/10 transition-all items-center">
                            <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center shrink-0 border border-white/5`}>
                                <style.icon size={20} className={style.color} weight="duotone" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="text-sm font-semibold text-white truncate">
                                        {item.quantity && item.quantity > 1 && <span className="text-orange-400 mr-2">{item.quantity}x</span>}
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-sm font-bold text-white">{formatCurrency(item.price * (item.quantity || 1))}</span>
                                        <span className={`text-[9px] uppercase tracking-widest font-bold ${item.type === 'Mensal' ? 'text-blue-400' : 'text-green-400'}`}>
                                            {item.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-neutral-400 text-xs leading-relaxed">
                                    {item.description.split('\n').map((line, i) => {
                                        const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•')
                                        return (
                                            <p key={i} className={isBullet ? "flex gap-1.5 mb-0.5" : "mb-0.5"}>
                                                {isBullet && <span className="text-orange-500/50">•</span>}
                                                <span>{line.replace(/^[-•]\s*/, '')}</span>
                                            </p>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Financial Summary */}
            <div className="border border-white/10 rounded-xl p-4 bg-[#121212]/50">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-neutral-400">Pagamento Pontual</span>
                        <span className="text-sm font-semibold text-neutral-200">{formatCurrency(subtotalUnico)}</span>
                    </div>
                    {subtotalMensal > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-neutral-400">Manutenção Mensal</span>
                            <span className="text-sm font-semibold text-neutral-200">{formatCurrency(subtotalMensal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Total</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

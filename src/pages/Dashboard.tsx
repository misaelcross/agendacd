import { useState, useEffect } from 'react'
import { Plus, Eye, Export, CaretDown, CaretUp, LinkSimple, Pencil, Gear, Trash } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { CreateProposalModal } from '../components/CreateProposalModal'
import { SettingsModal } from '../components/SettingsModal'
import { ExportModal } from '../components/ExportModal'
import { format } from 'date-fns'

interface ProposalItem {
    title: string
    description: string
    type: 'Único' | 'Mensal'
    price: number
}

interface Proposal {
    id: string
    client_name: string
    project_title: string
    value: number
    status: string
    created_at: string
    delivery_time?: string
    valid_until?: string
    items?: ProposalItem[]
}

export function Dashboard() {
    const [proposals, setProposals] = useState<Proposal[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [proposalToDelete, setProposalToDelete] = useState<string | null>(null)
    const [editingProposal, setEditingProposal] = useState<Proposal | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [proposalToExport, setProposalToExport] = useState<string | null>(null)
    const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set())

    const handleCopyLink = (id: string) => {
        const shortId = id.split('-')[0]
        const link = `${window.location.origin}/proposta/${shortId}`
        navigator.clipboard.writeText(link)
        alert('Link da proposta copiado!')
    }
    const toggleAccordion = (id: string) => {
        setExpandedAccordions(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    function handleDelete(id: string) {
        setProposalToDelete(id)
        setIsDeleteModalOpen(true)
    }

    async function handleConfirmDelete() {
        if (!proposalToDelete) return

        setIsDeleting(true)
        try {
            const { error } = await supabase.from('proposals').delete().eq('id', proposalToDelete)
            if (error) {
                console.error('Supabase delete error:', error)
                throw error
            }
            fetchProposals()
            setIsDeleteModalOpen(false)
            setProposalToDelete(null)
        } catch (error: any) {
            console.error('Error deleting proposal:', error)
            alert(`Erro ao excluir proposta: ${error.message || 'Erro desconhecido'}`)
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleEdit(proposal: Proposal) {
        setEditingProposal(proposal)
        setIsModalOpen(true)
    }

    async function fetchProposals() {
        setLoading(true)
        const { data, error } = await supabase
            .from('proposals')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching proposals:', error)
        } else {
            setProposals(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProposals()
    }, [])

    return (
        <div className="min-h-screen bg-[#0C0A09] text-neutral-100 flex flex-col selection:bg-orange-500/30">
            <header className="bg-black/40 backdrop-blur-md border-b border-neutral-800/50 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Propostas CD</h1>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsSettingsOpen(true)}
                        className="gap-2"
                    >
                        <Gear size={20} />
                        <span className="hidden md:inline">Configurações</span>
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-orange-600 hover:bg-orange-700">
                        <Plus size={20} weight="bold" />
                        <span className="hidden sm:inline">Nova Proposta</span>
                    </Button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="bg-neutral-900/50 rounded-2xl shadow-2xl border border-neutral-800/50 overflow-hidden backdrop-blur-sm">
                    {loading ? (
                        <div className="p-8 text-center text-neutral-500">Carregando...</div>
                    ) : proposals.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 border border-neutral-700">
                                <Plus size={32} className="text-neutral-500" />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-100 mb-1">Nenhuma proposta</h3>
                            <p className="text-neutral-500 mb-4 text-sm">Comece criando sua primeira proposta comercial.</p>
                            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                                <Plus size={20} weight="bold" />
                                Criar Proposta
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-800 bg-neutral-800/30">
                                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Cliente</th>
                                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Projeto</th>
                                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Data</th>
                                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest">Valor</th>
                                            <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-widest text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {proposals.map((proposal) => (
                                            <tr key={proposal.id} className="hover:bg-neutral-800/30 transition-all group">
                                                <td className="px-6 py-4 font-semibold text-neutral-100 group-hover:text-orange-400">
                                                    {proposal.client_name}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-400">
                                                    {proposal.project_title}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-500 text-sm">
                                                    {format(new Date(proposal.created_at), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="px-6 py-4 text-neutral-100 font-bold">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        proposal.items && proposal.items.length > 0
                                                            ? proposal.items.reduce((sum, item) => sum + Number(item.price), 0)
                                                            : proposal.value
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-1">
                                                    <Link to={`/proposta/${proposal.id.split('-')[0]}`} target="_blank" rel="noopener noreferrer">
                                                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-2" title="Visualizar">
                                                            <Eye size={20} weight="bold" />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 p-2"
                                                        onClick={() => handleCopyLink(proposal.id)}
                                                        title="Copiar Link"
                                                    >
                                                        <LinkSimple size={20} weight="bold" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 p-2"
                                                        onClick={() => {
                                                            setProposalToExport(proposal.id)
                                                            setIsExportModalOpen(true)
                                                        }}
                                                        title="Exportar"
                                                    >
                                                        <Export size={20} weight="bold" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-purple-500 hover:text-purple-400 hover:bg-purple-500/10 p-2"
                                                        onClick={() => handleEdit(proposal)}
                                                        title="Editar"
                                                    >
                                                        <Pencil size={20} weight="bold" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2"
                                                        onClick={() => handleDelete(proposal.id)}
                                                        title="Excluir"
                                                    >
                                                        <Trash size={20} weight="bold" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Accordion View */}
                            <div className="md:hidden divide-y divide-neutral-800/50">
                                {proposals.map((proposal) => {
                                    const isExpanded = expandedAccordions.has(proposal.id)
                                    const totalValue = proposal.items && proposal.items.length > 0
                                        ? proposal.items.reduce((sum, item) => sum + Number(item.price), 0)
                                        : proposal.value

                                    return (
                                        <div key={proposal.id} className="bg-neutral-900/30">
                                            {/* Accordion Header - Always Visible */}
                                            <button
                                                onClick={() => toggleAccordion(proposal.id)}
                                                className="w-full px-4 py-4 flex items-center justify-between hover:bg-neutral-800/30 transition-all"
                                            >
                                                <div className="flex-1 text-left">
                                                    <p className="font-semibold text-neutral-100">{proposal.client_name}</p>
                                                    <p className="text-sm text-neutral-500">{proposal.project_title}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-orange-400">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                                                    </span>
                                                    {isExpanded ? (
                                                        <CaretUp size={20} className="text-neutral-500" />
                                                    ) : (
                                                        <CaretDown size={20} className="text-neutral-500" />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Accordion Content - Expanded */}
                                            {isExpanded && (
                                                <div className="px-4 py-4 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Data</p>
                                                            <p className="text-neutral-300">{format(new Date(proposal.created_at), 'dd/MM/yyyy')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-neutral-500 text-xs uppercase tracking-wider mb-1">Valor Total</p>
                                                            <p className="text-neutral-100 font-bold">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex gap-2 pt-2">
                                                        <a
                                                            href={`/proposta/${proposal.id.split('-')[0]}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="min-w-[50%]"
                                                        >
                                                            <Button variant="outline" size="sm" className="w-full gap-2 text-blue-400 border-blue-500/30 hover:bg-blue-500/10">
                                                                <Eye size={18} weight="bold" />
                                                                Ver
                                                            </Button>
                                                        </a>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-2 text-neutral-400 border-neutral-700 hover:bg-neutral-800"
                                                            onClick={() => handleCopyLink(proposal.id)}
                                                        >
                                                            <LinkSimple size={18} weight="bold" />
                                                            Copiar Link
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-2 text-neutral-400 border-neutral-700 hover:bg-neutral-800"
                                                            onClick={() => {
                                                                setProposalToExport(proposal.id)
                                                                setIsExportModalOpen(true)
                                                            }}
                                                        >
                                                            <Export size={18} weight="bold" />
                                                            Exportar
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-2 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                                                            onClick={() => handleEdit(proposal)}
                                                        >
                                                            <Pencil size={18} weight="bold" />
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                                                            onClick={() => handleDelete(proposal.id)}
                                                        >
                                                            <Trash size={18} weight="bold" />
                                                            Excluir
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </main>

            <CreateProposalModal
                isOpen={isModalOpen}
                initialData={editingProposal || undefined}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingProposal(null)
                }}
                onSuccess={fetchProposals}
            />

            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => {
                    setIsExportModalOpen(false)
                    setProposalToExport(null)
                }}
                proposalId={proposalToExport}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Proposta"
                description="Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita."
                confirmLabel="Excluir"
                isSubmitting={isDeleting}
            />
        </div>
    )
}

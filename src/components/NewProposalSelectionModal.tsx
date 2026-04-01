import { Robot, ListBullets } from '@phosphor-icons/react'
import { Modal } from './ui/Modal'

interface NewProposalSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelectAI: () => void
    onSelectManual: () => void
}

export function NewProposalSelectionModal({ isOpen, onClose, onSelectAI, onSelectManual }: NewProposalSelectionModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nova Proposta">
            <p className="text-neutral-400 text-sm mb-6">
                Escolha como deseja criar sua proposta
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={onSelectAI}
                    className="flex flex-col items-center gap-3 p-6 bg-neutral-800/40 border border-neutral-800 rounded-xl transition-all hover:border-orange-500/50 hover:bg-orange-500/5 group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                        <Robot size={24} className="text-orange-500" />
                    </div>
                    <span className="text-white font-medium">Utilizar IA</span>
                    <span className="text-neutral-500 text-xs text-center">
                        Cole as informações e a IA gera a proposta automaticamente
                    </span>
                </button>

                <button
                    onClick={onSelectManual}
                    className="flex flex-col items-center gap-3 p-6 bg-neutral-800/40 border border-neutral-800 rounded-xl transition-all hover:border-blue-500/50 hover:bg-blue-500/5 group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <ListBullets size={24} className="text-blue-500" />
                    </div>
                    <span className="text-white font-medium">Campos Normais</span>
                    <span className="text-neutral-500 text-xs text-center">
                        Preencha manualmente todos os campos da proposta
                    </span>
                </button>
            </div>
        </Modal>
    )
}

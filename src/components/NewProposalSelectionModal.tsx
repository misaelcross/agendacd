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
            <p className="text-gray-500 text-sm mb-6">
                Escolha como deseja criar sua proposta
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    onClick={onSelectAI}
                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 border border-gray-200 rounded-xl transition-all hover:border-gray-300 hover:bg-gray-100 group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Robot size={24} className="text-gray-400" />
                    </div>
                    <span className="text-gray-700 font-medium">Utilizar IA</span>
                    <span className="text-gray-400 text-xs text-center">
                        Cole as informações e a IA gera a proposta automaticamente
                    </span>
                </button>

                <button
                    onClick={onSelectManual}
                    className="flex flex-col items-center gap-3 p-6 bg-gray-50 border border-gray-200 rounded-xl transition-all hover:border-green-500/50 hover:bg-green-500/5 group cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <ListBullets size={24} className="text-green-600" />
                    </div>
                    <span className="text-gray-900 font-medium">Campos Normais</span>
                    <span className="text-gray-400 text-xs text-center">
                        Preencha manualmente todos os campos da proposta
                    </span>
                </button>
            </div>
        </Modal>
    )
}

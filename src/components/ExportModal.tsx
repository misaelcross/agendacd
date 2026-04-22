import { useState } from 'react'
import { Copy, Desktop, DeviceMobile, X } from '@phosphor-icons/react'
import { Button } from './ui/Button'

interface ExportModalProps {
    isOpen: boolean
    onClose: () => void
    proposalId: string | null
}

export function ExportModal({ isOpen, onClose, proposalId }: ExportModalProps) {
    const [copied, setCopied] = useState(false)

    if (!isOpen || !proposalId) return null

    const proposalUrl = `${window.location.origin}/proposta/${proposalId?.split('-')[0]}`

    function handleCopyLink() {
        navigator.clipboard.writeText(proposalUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function handleExportPDF(isMobile: boolean) {
        const url = `${proposalUrl}?export=pdf${isMobile ? '&mobile=true' : ''}`

        if (isMobile) {
            window.open(url, 'ExportPDFMobile', 'width=430,height=850,resizable=yes,scrollbars=yes')
        } else {
            window.open(url, '_blank')
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Exportar Proposta</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <X size={24} weight="bold" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <button
                        onClick={handleCopyLink}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
                    >
                        <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl group-hover:bg-blue-500/20 transition-colors shrink-0">
                            <Copy size={24} weight="bold" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{copied ? 'Link Copiado!' : 'Copiar Link da Proposta'}</p>
                            <p className="text-sm text-gray-500">Copie o link para enviar diretamente ao cliente.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleExportPDF(false)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-green-500/50 hover:bg-green-500/5 transition-all text-left group"
                    >
                        <div className="bg-green-500/10 text-green-400 p-3 rounded-xl group-hover:bg-green-500/20 transition-colors shrink-0">
                            <Desktop size={24} weight="bold" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">Baixar PDF (Desktop)</p>
                            <p className="text-sm text-gray-500">Gera um PDF com o layout original para computador.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleExportPDF(true)}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-gray-50 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left group"
                    >
                        <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl group-hover:bg-amber-500/20 transition-colors shrink-0">
                            <DeviceMobile size={24} weight="bold" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">Baixar PDF (Mobile)</p>
                            <p className="text-sm text-gray-500">Adapta o layout para celular antes de gerar o PDF.</p>
                        </div>
                    </button>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-900">Fechar</Button>
                </div>
            </div>
        </div>
    )
}

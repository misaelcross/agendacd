import type { ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: ReactNode
    maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className={`bg-neutral-900/95 border border-neutral-800 rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-500 hover:text-neutral-200 transition-colors"
                    >
                        <X size={24} weight="bold" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto text-neutral-300">{children}</div>
            </div>
        </div>
    )
}

import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'primary'
    isSubmitting?: boolean
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    isSubmitting = false
}: ConfirmModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-neutral-400">{description}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'primary' : 'primary'}
                        className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processando...' : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

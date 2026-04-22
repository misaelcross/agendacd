import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export type BadgeStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show' | 'paid' | 'refunded'

const STATUS_CONFIG: Record<BadgeStatus, { label: string; classes: string }> = {
    confirmed:  { label: 'Confirmado',   classes: 'bg-green-100 text-green-700 border-green-200' },
    pending:    { label: 'Pendente',     classes: 'bg-amber-100 text-amber-700 border-amber-200' },
    completed:  { label: 'Concluído',    classes: 'bg-blue-100 text-blue-700 border-blue-200' },
    cancelled:  { label: 'Cancelado',    classes: 'bg-red-100 text-red-700 border-red-200' },
    no_show:    { label: 'Não compareceu', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
    paid:       { label: 'Pago',         classes: 'bg-green-100 text-green-700 border-green-200' },
    refunded:   { label: 'Estornado',    classes: 'bg-purple-100 text-purple-700 border-purple-200' },
}

interface BadgeProps {
    status: BadgeStatus
    className?: string
}

export function Badge({ status, className }: BadgeProps) {
    const config = STATUS_CONFIG[status]
    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            config.classes,
            className
        )}>
            {config.label}
        </span>
    )
}

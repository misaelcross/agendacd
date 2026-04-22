import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

interface AdminTopBarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  backTo?: string
}

export function AdminTopBar({ title, subtitle, actions, backTo }: AdminTopBarProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-gray-900 text-lg truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">{actions}</div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  FileText,
  CalendarBlank,
  List,
  Wrench,
  Users,
  ChartBar,
  LinkSimple,
  Check,
  Copy,
} from '@phosphor-icons/react'
import { useBusiness } from '../../contexts/BusinessContext'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Propostas',
    items: [
      { to: '/', label: 'Dashboard', icon: <FileText size={18} weight="duotone" />, end: true },
    ],
  },
  {
    title: 'Agendamentos',
    items: [
      { to: '/agenda', label: 'Calendário',  icon: <CalendarBlank size={18} weight="duotone" />, end: true },
      { to: '/agenda/lista', label: 'Lista',  icon: <List size={18} weight="duotone" /> },
      { to: '/admin/relatorios', label: 'Relatórios', icon: <ChartBar size={18} weight="duotone" /> },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { to: '/admin/servicos', label: 'Serviços', icon: <Wrench size={18} weight="duotone" /> },
      { to: '/admin/equipe',   label: 'Equipe',   icon: <Users size={18} weight="duotone" /> },
    ],
  },
]

export function AdminSidebar() {
  const [copied, setCopied] = useState(false)
  const { business } = useBusiness()
  const bookingUrl = business
    ? `${window.location.origin}/agendar/${business.slug}`
    : `${window.location.origin}/agendar`

  function handleCopyLink() {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <aside className="w-56 shrink-0 hidden md:flex flex-col bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="font-display font-bold text-lg text-green-700 tracking-tight">
          AgendaCD
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-green-50 text-green-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      ].join(' ')
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Shareable booking link */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-100">
        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Link de agendamento
        </p>
        <div className="mx-1 p-2.5 bg-green-50 rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <LinkSimple size={13} className="text-green-600 shrink-0" />
            <span className="text-[11px] text-green-700 font-medium truncate" title={bookingUrl}>
              {bookingUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
          >
            {copied ? (
              <>
                <Check size={12} />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={12} />
                Copiar link
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}

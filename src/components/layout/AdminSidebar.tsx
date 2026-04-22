import { NavLink } from 'react-router-dom'
import {
  FileText,
  CalendarBlank,
  List,
  Wrench,
  Users,
  ChartBar,
} from '@phosphor-icons/react'

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
    </aside>
  )
}

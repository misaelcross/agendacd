import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { MagnifyingGlass, Eye, X, CalendarBlank } from '@phosphor-icons/react'
import { AdminShell } from '../../components/layout/AdminShell'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import {
  fetchAppointments,
  updateAppointmentStatus,
  confirmCautionPayment,
} from '../../lib/appointments'
import type { Appointment, AppointmentStatus } from '../../types/appointments'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type FilterStatus = 'all' | AppointmentStatus

const STATUS_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'pending',   label: 'Pendentes' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'no_show',   label: 'Não compareceu' },
]

export function AppointmentsList() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStatus, setActiveStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAppointments({
        status: activeStatus,
        search: search || undefined,
      })
      setAppointments(data)
    } catch (err) {
      setError('Erro ao carregar agendamentos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [activeStatus, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 400 : 0)
    return () => clearTimeout(timer)
  }, [load, search])

  const countByStatus = (status: FilterStatus) => {
    if (status === 'all') return appointments.length
    return appointments.filter(a => a.status === status).length
  }

  const handleConfirmCaution = async (id: string) => {
    setActionLoading(id + '_caution')
    try {
      await confirmCautionPayment(id)
      await load()
    } catch {
      alert('Erro ao confirmar pagamento.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Deseja cancelar este agendamento?')) return
    setActionLoading(id + '_cancel')
    try {
      await updateAppointmentStatus(id, 'cancelled')
      await load()
    } catch {
      alert('Erro ao cancelar agendamento.')
    } finally {
      setActionLoading(null)
    }
  }

  const displayed = appointments.filter(a => {
    if (activeStatus !== 'all' && a.status !== activeStatus) return false
    return true
  })

  return (
    <AdminShell>
      <AdminTopBar title="Lista de Agendamentos" />

      <div className="flex-1 overflow-auto p-6 space-y-5">
        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-0 border-b border-gray-100 overflow-x-auto">
            {STATUS_TABS.map(tab => {
              const isActive = activeStatus === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveStatus(tab.key)}
                  className={[
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                >
                  {tab.label}
                  <span
                    className={[
                      'inline-flex items-center justify-center rounded-full text-xs px-1.5 py-0.5 min-w-[20px]',
                      isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500',
                    ].join(' ')}
                  >
                    {loading ? '–' : countByStatus(tab.key)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <Input
              placeholder="Buscar por nome ou e-mail do cliente…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              icon={<MagnifyingGlass size={16} />}
              className="max-w-sm"
            />
          </div>

          {/* Table */}
          {error ? (
            <div className="p-8 text-center text-sm text-red-500">{error}</div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Carregando…</div>
          ) : displayed.length === 0 ? (
            <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
              <CalendarBlank size={40} weight="thin" />
              <p className="text-sm">Nenhum agendamento encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Serviço</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Profissional</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Caução</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(apt => (
                    <tr key={apt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{apt.client_name}</p>
                        <p className="text-xs text-gray-400">{apt.client_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {apt.services ? (
                          <span>{apt.services.emoji} {apt.services.name}</span>
                        ) : '–'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {apt.staff?.name ?? '–'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {format(parseISO(apt.scheduled_at), "dd/MM/yyyy 'às' HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {BRL(apt.service_price)}
                      </td>
                      <td className="px-4 py-3">
                        {apt.caution_status === 'none' ? (
                          <span className="text-gray-400 text-xs">–</span>
                        ) : (
                          <Badge status={apt.caution_status as any} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={apt.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/agenda/${apt.id}`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </button>
                          {apt.caution_status === 'pending' && (
                            <button
                              onClick={() => handleConfirmCaution(apt.id)}
                              disabled={actionLoading === apt.id + '_caution'}
                              className="px-2 py-1 rounded-lg text-xs text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {actionLoading === apt.id + '_caution' ? '…' : 'Confirmar caução'}
                            </button>
                          )}
                          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                            <button
                              onClick={() => handleCancel(apt.id)}
                              disabled={actionLoading === apt.id + '_cancel'}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

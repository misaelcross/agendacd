import { useState, useEffect, useCallback } from 'react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChartBar, TrendUp } from '@phosphor-icons/react'
import { AdminShell } from '../../components/layout/AdminShell'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Input } from '../../components/ui/Input'
import { fetchAppointments } from '../../lib/appointments'
import type { Appointment, AppointmentStatus } from '../../types/appointments'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

type RangeMode = 'month' | 'last30' | 'custom'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bgColor: string }> = {
  pending:   { label: 'Pendente',        color: 'bg-amber-500',  bgColor: 'bg-amber-50' },
  confirmed: { label: 'Confirmado',      color: 'bg-green-500',  bgColor: 'bg-green-50' },
  completed: { label: 'Concluído',       color: 'bg-blue-500',   bgColor: 'bg-blue-50' },
  cancelled: { label: 'Cancelado',       color: 'bg-red-400',    bgColor: 'bg-red-50' },
  no_show:   { label: 'Não compareceu',  color: 'bg-gray-400',   bgColor: 'bg-gray-50' },
}

export function AppointmentsReports() {
  const [rangeMode, setRangeMode] = useState<RangeMode>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = useCallback(() => {
    const now = new Date()
    if (rangeMode === 'month') {
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      }
    }
    if (rangeMode === 'last30') {
      return {
        from: startOfDay(subDays(now, 30)).toISOString(),
        to: endOfDay(now).toISOString(),
      }
    }
    // custom
    return {
      from: customFrom ? startOfDay(parseISO(customFrom)).toISOString() : null,
      to:   customTo   ? endOfDay(parseISO(customTo)).toISOString()     : null,
    }
  }, [rangeMode, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { from, to } = getDateRange()
      const data = await fetchAppointments({
        dateFrom: from ?? undefined,
        dateTo:   to   ?? undefined,
      })
      setAppointments(data)
    } catch (err) {
      setError('Erro ao carregar dados.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [getDateRange])

  useEffect(() => {
    if (rangeMode !== 'custom') {
      load()
    }
  }, [rangeMode, load])

  const handleCustomApply = () => {
    if (customFrom && customTo) load()
  }

  // Stats
  const total = appointments.length
  const confirmed = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed').length
  const revenue = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => sum + a.service_price, 0)
  const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0

  // Group by date for bar chart
  const byDate: Record<string, number> = {}
  appointments.forEach(a => {
    const d = format(parseISO(a.scheduled_at), 'yyyy-MM-dd')
    byDate[d] = (byDate[d] ?? 0) + 1
  })
  const dateEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))
  const maxCount = Math.max(...Object.values(byDate), 1)

  // Status breakdown
  const statusCounts = Object.keys(STATUS_CONFIG).reduce(
    (acc, s) => {
      acc[s as AppointmentStatus] = appointments.filter(a => a.status === s).length
      return acc
    },
    {} as Record<AppointmentStatus, number>
  )

  return (
    <AdminShell>
      <AdminTopBar title="Relatórios" />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Range picker */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['month', 'last30', 'custom'] as RangeMode[]).map(mode => {
                const labels = { month: 'Este mês', last30: 'Últimos 30 dias', custom: 'Personalizado' }
                return (
                  <button
                    key={mode}
                    onClick={() => setRangeMode(mode)}
                    className={[
                      'px-4 py-2 text-sm font-medium transition-colors',
                      rangeMode === mode
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {labels[mode]}
                  </button>
                )
              })}
            </div>

            {rangeMode === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-400 text-sm">até</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-40"
                />
                <button
                  onClick={handleCustomApply}
                  disabled={!customFrom || !customTo}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de agendamentos', value: loading ? '–' : total, sub: 'no período' },
            { label: 'Confirmados / Concluídos', value: loading ? '–' : confirmed, sub: `de ${total}` },
            { label: 'Receita total', value: loading ? '–' : BRL(revenue), sub: 'confirmados + concluídos' },
            { label: 'Taxa de conversão', value: loading ? '–' : `${conversionRate}%`, sub: 'confirmados / total' },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <ChartBar size={16} className="text-green-600" />
            <h2 className="font-semibold text-gray-800">Agendamentos por dia</h2>
          </div>

          {loading ? (
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-20 h-3 bg-gray-100 rounded" />
                  <div className="h-6 bg-gray-100 rounded-md" style={{ width: `${30 + i * 12}%` }} />
                </div>
              ))}
            </div>
          ) : dateEntries.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Nenhum dado para exibir.
            </div>
          ) : (
            <div className="space-y-2">
              {dateEntries.map(([date, count]) => {
                const pct = Math.round((count / maxCount) * 100)
                const label = format(parseISO(date), 'd MMM', { locale: ptBR })
                return (
                  <div key={date} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-gray-500 text-right shrink-0">{label}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500 flex items-center px-2"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendUp size={16} className="text-green-600" />
            <h2 className="font-semibold text-gray-800">Distribuição por status</h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="flex-1 h-3 bg-gray-100 rounded-full" />
                  <div className="h-3 w-8 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(status => {
                const count = statusCounts[status]
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                const cfg = STATUS_CONFIG[status]
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      <div className={`h-2.5 w-2.5 rounded-full ${cfg.color}`} />
                      <span className="text-sm text-gray-700">{cfg.label}</span>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cfg.color}`}
                        style={{ width: `${Math.max(pct, 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-20 shrink-0 justify-end">
                      <span className="text-sm font-semibold text-gray-800">{count}</span>
                      <span className="text-xs text-gray-400">({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

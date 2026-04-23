import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaretLeft, CaretRight, CalendarBlank, LockSimple } from '@phosphor-icons/react'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { fetchAppointments } from '../../lib/appointments'
import type { Appointment, AppointmentStatus } from '../../types/appointments'


export function AppointmentsCalendar() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAppointments({
        dateFrom: weekStart.toISOString(),
        dateTo: weekEnd.toISOString(),
      })
      setAppointments(data)
    } catch (err) {
      setError('Erro ao carregar agendamentos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const todayCount = appointments.filter(a =>
    isSameDay(parseISO(a.scheduled_at), new Date())
  ).length

  const weekCount = appointments.length

  const goToPrev = () => setWeekStart(prev => addWeeks(prev, -1))
  const goToNext = () => setWeekStart(prev => addWeeks(prev, 1))

  const weekLabel = `${format(weekStart, 'd MMM', { locale: ptBR })} – ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`

  const aptsForDay = (day: Date) =>
    appointments
      .filter(a => isSameDay(parseISO(a.scheduled_at), day))
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))

  return (
    <>
      <AdminTopBar
        title="Agendamentos"
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/agenda/config/bloqueios')}>
            <LockSimple size={15} className="mr-1.5" />
            Nova data bloqueada
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Hoje</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '–' : todayCount}</p>
            <p className="text-xs text-gray-400 mt-1">agendamentos</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Esta semana</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? '–' : weekCount}</p>
            <p className="text-xs text-gray-400 mt-1">agendamentos</p>
          </div>
        </div>

        {/* Week navigation */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={goToPrev}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <span className="text-sm font-semibold text-gray-700 capitalize">{weekLabel}</span>
            <button
              onClick={goToNext}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-500 text-center">{error}</div>
          )}

          {/* Calendar grid */}
          <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[480px]">
            {days.map(day => {
              const dayApts = aptsForDay(day)
              const isCurrentDay = isToday(day)
              return (
                <div key={day.toISOString()} className="flex flex-col">
                  {/* Day header */}
                  <div
                    className={[
                      'px-2 py-2.5 text-center border-b border-gray-100',
                      isCurrentDay ? 'bg-green-50' : 'bg-gray-50',
                    ].join(' ')}
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p
                      className={[
                        'text-lg font-bold mt-0.5',
                        isCurrentDay ? 'text-green-600' : 'text-gray-800',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>

                  {/* Appointments */}
                  <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                    {loading ? (
                      <div className="animate-pulse space-y-1.5 mt-1">
                        <div className="h-14 bg-gray-100 rounded-lg" />
                        <div className="h-14 bg-gray-100 rounded-lg" />
                      </div>
                    ) : dayApts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                        <CalendarBlank size={20} />
                      </div>
                    ) : (
                      dayApts.map(apt => (
                        <button
                          key={apt.id}
                          onClick={() => navigate(`/agenda/${apt.id}`)}
                          className="w-full text-left bg-green-50 border border-green-100 rounded-lg p-2 hover:bg-green-100 transition-colors"
                        >
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {apt.client_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(parseISO(apt.scheduled_at), 'HH:mm')}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {apt.services?.name ?? '–'}
                          </p>
                          <div className="mt-1">
                            <Badge status={apt.status as AppointmentStatus} />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { ArrowRight, SpinnerGap } from '@phosphor-icons/react'

import { useBooking } from '../../contexts/BookingContext'
import { computeWeekSlots, fetchStaffForService } from '../../lib/appointments'
import type { DaySlots, TimeSlot } from '../../types/appointments'
import { WeekStrip } from '../../components/ui/WeekStrip'
import { TimeSlotPicker } from '../../components/ui/TimeSlotPicker'
import { Button } from '../../components/ui/Button'

export function BookingDateTime() {
  const navigate = useNavigate()
  const { state, dispatch } = useBooking()

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [daySlots, setDaySlots] = useState<DaySlots[]>([])
  const [loading, setLoading] = useState(false)

  // Guard
  useEffect(() => {
    if (!state.service) navigate('/agendar', { replace: true })
  }, [state.service, navigate])

  // Fetch slots whenever weekStart changes
  useEffect(() => {
    if (!state.service) return

    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const service = state.service!
        const durationMin = service.duration_min

        if (state.staff) {
          // Specific staff selected
          const availability = state.staff.staff_availability ?? []
          const slots = await computeWeekSlots(
            weekStart,
            durationMin,
            state.staff.id,
            availability,
          )
          if (!cancelled) setDaySlots(slots)
        } else {
          // No preference — fetch all active staff for this service and union slots
          const allStaff = await fetchStaffForService(service.id)

          if (allStaff.length === 0) {
            if (!cancelled) setDaySlots([])
            return
          }

          // Compute slots for each staff member in parallel then merge
          const perStaff = await Promise.all(
            allStaff.map(member =>
              computeWeekSlots(
                weekStart,
                durationMin,
                member.id,
                member.staff_availability ?? [],
              )
            )
          )

          if (cancelled) return

          // Union: for each day, merge time slots — a slot is available if at least one staff has it available
          const merged: DaySlots[] = perStaff[0].map((day, dayIdx) => {
            const slotMap = new Map<string, TimeSlot>()

            for (const staffDays of perStaff) {
              const staffDay = staffDays[dayIdx]
              for (const slot of staffDay.slots) {
                const existing = slotMap.get(slot.time)
                if (!existing) {
                  slotMap.set(slot.time, { ...slot })
                } else if (slot.available) {
                  // Mark available if at least one staff can take it
                  slotMap.set(slot.time, { ...existing, available: true })
                }
              }
            }

            const slots = Array.from(slotMap.values()).sort((a, b) =>
              a.time.localeCompare(b.time)
            )
            return {
              date: day.date,
              hasAvailability: slots.some(s => s.available),
              slots,
            }
          })

          setDaySlots(merged)
        }
      } catch (err) {
        console.error('Erro ao carregar horários:', err)
        setDaySlots([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [weekStart, state.service, state.staff])

  const selectedDaySlots = daySlots.find(d => d.date === state.date)
  const datesWithSlots = daySlots
    .filter(d => d.hasAvailability)
    .map(d => d.date)

  const canAdvance = Boolean(state.date && state.time)

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 pt-6">
      <h1 className="text-xl font-display font-bold text-gray-900 mb-6">
        Data e horário
      </h1>

      {/* Week strip */}
      <div className="mb-6">
        <WeekStrip
          weekStart={weekStart}
          selectedDate={state.date}
          datesWithSlots={datesWithSlots}
          onSelectDate={date => dispatch({ type: 'SET_DATE', payload: date })}
          onPrevWeek={() => setWeekStart(w => subWeeks(w, 1))}
          onNextWeek={() => setWeekStart(w => addWeeks(w, 1))}
          minToday
        />
      </div>

      {/* Time slot picker */}
      <div className="min-h-[120px]">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <SpinnerGap size={20} className="animate-spin" />
            <span className="text-sm">Carregando horários…</span>
          </div>
        ) : state.date ? (
          <TimeSlotPicker
            slots={selectedDaySlots?.slots ?? []}
            selectedTime={state.time}
            onSelect={time => dispatch({ type: 'SET_TIME', payload: time })}
          />
        ) : (
          <p className="text-center text-sm text-gray-400 py-10">
            Selecione um dia para ver os horários disponíveis.
          </p>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={!canAdvance}
            onClick={() => navigate('/agendar/dados')}
          >
            Avançar
            <ArrowRight size={18} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  )
}

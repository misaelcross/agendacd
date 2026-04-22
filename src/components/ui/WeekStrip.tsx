import { format, addWeeks, subWeeks, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

interface WeekStripProps {
  weekStart: Date
  selectedDate: string | null  // "YYYY-MM-DD"
  datesWithSlots?: string[]    // "YYYY-MM-DD" list of dates that have availability
  onSelectDate: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  /** Don't allow navigating to weeks before today's week */
  minToday?: boolean
}

export function WeekStrip({
  weekStart,
  selectedDate,
  datesWithSlots = [],
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  minToday = true,
}: WeekStripProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(weekStart, { weekStartsOn: 1 }),  // Mon
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),      // Sun
  })

  const isPastWeek = minToday && isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="w-full">
      {/* Week header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrevWeek}
          disabled={isPastWeek}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          aria-label="Semana anterior"
        >
          <CaretLeft size={16} weight="bold" />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {format(days[0], "d MMM", { locale: ptBR })} –{' '}
          {format(days[6], "d MMM yyyy", { locale: ptBR })}
        </span>
        <button
          onClick={onNextWeek}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Próxima semana"
        >
          <CaretRight size={16} weight="bold" />
        </button>
      </div>

      {/* Day buttons */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const iso     = format(day, 'yyyy-MM-dd')
          const isSelected = selectedDate === iso
          const hasSlots   = datesWithSlots.includes(iso)
          const today      = isToday(day)
          const past       = day < new Date(new Date().setHours(0,0,0,0))

          return (
            <button
              key={iso}
              onClick={() => !past && onSelectDate(iso)}
              disabled={past}
              className={[
                'flex flex-col items-center py-2 rounded-xl border transition-all text-center gap-0.5 disabled:opacity-30 disabled:pointer-events-none',
                isSelected
                  ? 'bg-green-600 border-green-600 text-white shadow-sm'
                  : today
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50',
              ].join(' ')}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
              <span className="text-sm font-bold leading-none">
                {format(day, 'd')}
              </span>
              {/* Availability dot */}
              <span
                className={[
                  'w-1 h-1 rounded-full mt-0.5',
                  hasSlots
                    ? isSelected ? 'bg-white/70' : 'bg-green-500'
                    : 'bg-transparent',
                ].join(' ')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

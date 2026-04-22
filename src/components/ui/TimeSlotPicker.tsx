import type { TimeSlot, SlotPeriod } from '../../types/appointments'

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onSelect: (time: string) => void
  loading?: boolean
}

const PERIOD_LABELS: Record<SlotPeriod, string> = {
  manha: '🌅 Manhã',
  tarde: '☀️ Tarde',
  noite: '🌙 Noite',
}

const PERIOD_ORDER: SlotPeriod[] = ['manha', 'tarde', 'noite']

export function TimeSlotPicker({ slots, selectedTime, onSelect, loading }: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
            <div className="grid grid-cols-4 gap-2">
              {[0,1,2,3].map(j => (
                <div key={j} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const available = slots.filter(s => s.available)

  if (available.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Nenhum horário disponível para este dia.
      </div>
    )
  }

  const byPeriod = PERIOD_ORDER.reduce<Record<SlotPeriod, TimeSlot[]>>(
    (acc, p) => ({ ...acc, [p]: [] }),
    { manha: [], tarde: [], noite: [] }
  )
  for (const slot of available) {
    byPeriod[slot.period].push(slot)
  }

  return (
    <div className="space-y-5">
      {PERIOD_ORDER.filter(p => byPeriod[p].length > 0).map(period => (
        <div key={period}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {PERIOD_LABELS[period]}
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {byPeriod[period].map(slot => (
              <button
                key={slot.time}
                onClick={() => onSelect(slot.time)}
                className={[
                  'py-2.5 rounded-lg border text-sm font-semibold transition-all',
                  selectedTime === slot.time
                    ? 'bg-green-600 border-green-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50',
                ].join(' ')}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

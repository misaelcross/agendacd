import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, CheckCircle, CaretRight } from '@phosphor-icons/react'
import { fetchStaffForService } from '../../lib/appointments'
import { useBooking } from '../../contexts/BookingContext'
import { StaffAvatar } from '../../components/ui/StaffAvatar'
import { Button } from '../../components/ui/Button'
import type { Staff } from '../../types/appointments'

// Sentinel value for "no preference" selection
const NO_PREFERENCE = '__no_preference__'

function StaffCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
    </div>
  )
}

export function BookingStaffSelect() {
  const navigate = useNavigate()
  const { state, dispatch } = useBooking()

  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // selectedId: either a staff UUID, NO_PREFERENCE, or null (nothing chosen yet)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (state.staff === null && state.date !== null) {
      // staff was explicitly set to null (no preference) in a previous visit
      return NO_PREFERENCE
    }
    return state.staff?.id ?? null
  })

  // Guard: redirect if no service selected
  useEffect(() => {
    if (!state.service) {
      navigate('/agendar', { replace: true })
    }
  }, [state.service, navigate])

  useEffect(() => {
    if (!state.service) return
    fetchStaffForService(state.service.id)
      .then(setStaffList)
      .catch(() => setError('Não foi possível carregar os profissionais. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [state.service])

  function selectNoPreference() {
    setSelectedId(NO_PREFERENCE)
  }

  function selectStaff(staff: Staff) {
    setSelectedId(staff.id)
  }

  function handleAdvance() {
    if (selectedId === NO_PREFERENCE) {
      dispatch({ type: 'SET_STAFF', payload: null })
    } else {
      const chosen = staffList.find(s => s.id === selectedId)
      if (chosen) dispatch({ type: 'SET_STAFF', payload: chosen })
    }
    navigate('/agendar/horario')
  }

  const canAdvance = selectedId !== null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-28">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
          Escolha o profissional
        </h1>
        {state.service && (
          <p className="text-sm text-gray-500 mt-1">
            Para{' '}
            <span className="font-medium text-gray-700">{state.service.name}</span>
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm mb-4">
          {error}
        </div>
      )}

      {/* No-preference card (always shown) */}
      <button
        onClick={selectNoPreference}
        className={[
          'w-full text-left bg-white border rounded-xl p-4 flex items-center gap-4 transition-all mb-3',
          selectedId === NO_PREFERENCE
            ? 'border-green-500 ring-2 ring-green-100'
            : 'border-gray-200 hover:border-green-300 hover:shadow-sm',
        ].join(' ')}
      >
        <div
          className={[
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors',
            selectedId === NO_PREFERENCE ? 'bg-green-100' : 'bg-gray-100',
          ].join(' ')}
        >
          <Users
            size={20}
            weight="duotone"
            className={selectedId === NO_PREFERENCE ? 'text-green-600' : 'text-gray-400'}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">Sem preferência</p>
          <p className="text-xs text-gray-400 mt-0.5">Escolher automaticamente</p>
        </div>

        {selectedId === NO_PREFERENCE ? (
          <CheckCircle size={20} weight="fill" className="text-green-600 shrink-0" />
        ) : (
          <CaretRight size={16} className="text-gray-300 shrink-0" />
        )}
      </button>

      {/* Staff list */}
      {loading && (
        <div className="space-y-3 mt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <StaffCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && !error && staffList.length > 0 && (
        <div className="space-y-3 mt-2">
          {staffList.map(staff => {
            const isSelected = selectedId === staff.id
            return (
              <button
                key={staff.id}
                onClick={() => selectStaff(staff)}
                className={[
                  'w-full text-left bg-white border rounded-xl p-4 flex items-center gap-4 transition-all',
                  isSelected
                    ? 'border-green-500 ring-2 ring-green-100'
                    : 'border-gray-200 hover:border-green-300 hover:shadow-sm',
                ].join(' ')}
              >
                <StaffAvatar
                  name={staff.name}
                  initials={staff.initials}
                  avatarColor={staff.avatar_color}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">
                    {staff.name}
                  </p>
                  {staff.role && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{staff.role}</p>
                  )}
                </div>

                {isSelected ? (
                  <CheckCircle size={20} weight="fill" className="text-green-600 shrink-0" />
                ) : (
                  <CaretRight size={16} className="text-gray-300 shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {!loading && !error && staffList.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">
          Nenhum profissional disponível para este serviço no momento.
        </p>
      )}

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={!canAdvance}
            onClick={handleAdvance}
          >
            Avançar
            <span aria-hidden>→</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

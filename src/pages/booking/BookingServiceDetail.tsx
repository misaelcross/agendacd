import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, CurrencyCircleDollar, Warning, Package } from '@phosphor-icons/react'
import { fetchServiceById, fetchActiveServices, calcCautionAmount } from '../../lib/appointments'
import { useBooking } from '../../contexts/BookingContext'
import { useBusiness } from '../../contexts/BusinessContext'
import { bookingPath } from '../../lib/routes'
import { Button } from '../../components/ui/Button'
import type { Service, ServiceCategory } from '../../types/appointments'

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  facial: 'Facial',
  massagem: 'Massagem',
  corporal: 'Corporal',
  outro: 'Outro',
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-2xl bg-gray-100" />
        <div className="h-7 bg-gray-100 rounded w-40" />
        <div className="h-5 bg-gray-100 rounded w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function BookingServiceDetail() {
  const navigate = useNavigate()
  const { serviceId, slug } = useParams<{ serviceId: string; slug: string }>()
  const { dispatch } = useBooking()
  const { businessId } = useBusiness()

  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [comboNames, setComboNames] = useState<string[]>([])

  useEffect(() => {
    if (!serviceId || !businessId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    fetchServiceById(serviceId, businessId)
      .then(async data => {
        if (!data) { setNotFound(true); return }
        setService(data)
        if (data.is_combo && data.combo_service_ids?.length && businessId) {
          const all = await fetchActiveServices(businessId)
          setComboNames(
            data.combo_service_ids
              .map(id => all.find(s => s.id === id)?.name)
              .filter(Boolean) as string[]
          )
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [serviceId, businessId])

  function handleChooseProfessional() {
    if (!service) return
    dispatch({ type: 'SET_SERVICE', payload: service })
    navigate(bookingPath(slug!, 'profissional'))
  }

  const cautionAmount = service ? calcCautionAmount(service.price, service.caution_pct) : 0

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={18} weight="bold" />
        Voltar
      </button>

      {loading && <DetailSkeleton />}

      {!loading && notFound && (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">🔍</p>
          <p className="font-semibold text-gray-700">Serviço não encontrado</p>
          <p className="text-sm text-gray-400">
            Este serviço não existe ou não está mais disponível.
          </p>
          <button
            onClick={() => navigate(bookingPath(slug!))}
            className="text-sm text-green-600 hover:underline"
          >
            Ver todos os serviços
          </button>
        </div>
      )}

      {!loading && service && (
        <>
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="bg-green-50 rounded-2xl w-20 h-20 flex items-center justify-center text-4xl mb-4 overflow-hidden">
              {service.image_url
                ? <img src={service.image_url} alt={service.name} className="w-full h-full object-cover rounded-2xl" />
                : service.emoji}
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
              {service.name}
            </h1>
            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
              {CATEGORY_LABELS[service.category] ?? service.category}
            </span>
          </div>

          {/* Description */}
          {service.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-8 text-center">
              {service.description}
            </p>
          )}

          {/* Combo composition */}
          {service.is_combo && comboNames.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-violet-600" weight="fill" />
                <span className="text-sm font-semibold text-violet-700">Serviços inclusos</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {comboNames.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-violet-700 rounded-lg text-xs font-medium border border-violet-200">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* Duration */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
              <Clock size={20} className="text-green-600" weight="duotone" />
              <span className="text-xs text-gray-500 leading-tight">Duração</span>
              <span className="font-semibold text-gray-800 text-sm">
                {formatDuration(service.duration_min)}
              </span>
            </div>

            {/* Price */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
              <CurrencyCircleDollar size={20} className="text-green-600" weight="duotone" />
              <span className="text-xs text-gray-500 leading-tight">Valor</span>
              <span className="font-semibold text-green-700 text-sm">
                {formatPrice(service.price)}
              </span>
            </div>

            {/* Caution */}
            <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 text-center">
              <Warning size={20} className="text-amber-500" weight="duotone" />
              <span className="text-xs text-gray-500 leading-tight">Caução</span>
              <span className="font-semibold text-gray-800 text-sm">
                {service.caution_pct > 0 ? formatPrice(cautionAmount) : '—'}
              </span>
            </div>
          </div>

          {/* Caution notice */}
          {service.caution_pct > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start mb-6">
              <Warning size={18} className="text-amber-500 mt-0.5 shrink-0" weight="fill" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Este serviço requer uma caução de{' '}
                <strong>{service.caution_pct}%</strong> ({formatPrice(cautionAmount)}) no
                momento do agendamento, descontada do valor final.
              </p>
            </div>
          )}
        </>
      )}

      {/* Sticky bottom CTA */}
      {!loading && service && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
          <div className="max-w-lg mx-auto">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleChooseProfessional}
            >
              Escolher profissional
              <span aria-hidden>→</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

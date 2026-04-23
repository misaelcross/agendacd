import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CaretRight, Package } from '@phosphor-icons/react'
import { fetchActiveServices } from '../../lib/appointments'
import { useBusiness } from '../../contexts/BusinessContext'
import { bookingPath } from '../../lib/routes'
import type { Service, ServiceCategory } from '../../types/appointments'

type CategoryFilter = 'todos' | ServiceCategory

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  todos: 'Todos',
  facial: 'Facial',
  massagem: 'Massagem',
  corporal: 'Corporal',
  outro: 'Outro',
}

const ALL_FILTERS: CategoryFilter[] = ['todos', 'facial', 'massagem', 'corporal', 'outro']

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

function ServiceCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-100 rounded w-2/5" />
        <div className="h-3 bg-gray-100 rounded w-3/5" />
        <div className="h-3 bg-gray-100 rounded w-1/4" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-14 shrink-0" />
    </div>
  )
}

export function BookingServices() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { businessId } = useBusiness()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('todos')

  useEffect(() => {
    if (!businessId) return
    fetchActiveServices(businessId)
      .then(setServices)
      .catch(() => setError('Não foi possível carregar os serviços. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [businessId])

  const filtered =
    activeFilter === 'todos'
      ? services
      : services.filter(s => s.category === activeFilter)

  const s = slug ?? ''

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-10">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
          Escolha o serviço
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione o serviço que deseja agendar
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide -mx-4 px-4">
        {ALL_FILTERS.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={[
              'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeFilter === filter
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {CATEGORY_LABELS[filter]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Service list */}
      {!loading && !error && (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">
              Nenhum serviço encontrado nesta categoria.
            </p>
          )}

          {filtered.map(service => (
            <button
              key={service.id}
              onClick={() => navigate(bookingPath(s, `servico/${service.id}`))}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              {/* Image / Emoji */}
              <div className="bg-green-50 rounded-xl w-12 h-12 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {service.image_url
                  ? <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  : service.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 truncate">
                    {service.name}
                  </p>
                  {service.is_combo && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 shrink-0">
                      <Package size={9} />
                      combo
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-gray-400">
                    {formatDuration(service.duration_min)}
                  </span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                    {CATEGORY_LABELS[service.category as CategoryFilter] ?? service.category}
                  </span>
                </div>
              </div>

              {/* Price + caret */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-green-700 text-sm">
                  {formatPrice(service.price)}
                </span>
                <CaretRight
                  size={16}
                  className="text-gray-300 group-hover:text-green-500 transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

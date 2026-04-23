import { useLocation, Outlet, useParams } from 'react-router-dom'
import { BookingProvider } from '../../contexts/BookingContext'
import { BookingBusinessProvider, useBusiness } from '../../contexts/BusinessContext'
import { ProgressSteps } from '../../components/ui/ProgressSteps'

const STEPS = ['Serviço', 'Profissional', 'Data e Hora', 'Seus Dados', 'Confirmar', 'Pagamento']

function pathToStepIndex(pathname: string): number {
  if (pathname.startsWith('/agendar/') && pathname.includes('/pagamento')) return 5
  if (pathname.startsWith('/agendar/') && pathname.includes('/confirmar')) return 4
  if (pathname.startsWith('/agendar/') && pathname.includes('/dados')) return 3
  if (pathname.startsWith('/agendar/') && pathname.includes('/horario')) return 2
  if (pathname.startsWith('/agendar/') && pathname.includes('/profissional')) return 1
  return 0
}

function BookingLayoutInner() {
  const location = useLocation()
  const activeStep = pathToStepIndex(location.pathname)
  const { business, loading } = useBusiness()

  const brandName = business?.name ?? ''
  const slug = business?.slug ?? ''

  if (loading) {
    return (
      <div className="min-h-screen bg-off flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-off flex flex-col items-center justify-center gap-3 text-center px-4">
        <span className="text-4xl">🔍</span>
        <p className="font-semibold text-gray-700">Empresa não encontrada</p>
        <p className="text-sm text-gray-400">O link de agendamento não é válido.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-off flex flex-col">
      {/* Fixed top header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          {/* Left: brand name */}
          <div className="w-24 shrink-0">
            <span className="font-display text-green-700 font-bold text-lg leading-none truncate block">
              {brandName || 'AgendaCD'}
            </span>
          </div>

          {/* Center: progress */}
          <div className="flex-1 flex justify-center overflow-hidden">
            <ProgressSteps steps={STEPS} activeStep={activeStep} />
          </div>

          {/* Right: spacer */}
          <div className="w-24 shrink-0" />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export function BookingLayout() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <BookingBusinessProvider slug={slug}>
      <BookingProvider>
        <BookingLayoutInner />
      </BookingProvider>
    </BookingBusinessProvider>
  )
}

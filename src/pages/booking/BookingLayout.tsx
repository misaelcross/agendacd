import { useLocation, Outlet } from 'react-router-dom'
import { BookingProvider } from '../../contexts/BookingContext'
import { ProgressSteps } from '../../components/ui/ProgressSteps'

const STEPS = ['Serviço', 'Profissional', 'Data e Hora', 'Seus Dados', 'Confirmar', 'Pagamento']

function pathToStepIndex(pathname: string): number {
  if (pathname.startsWith('/agendar/pagamento')) return 5
  if (pathname.startsWith('/agendar/confirmar')) return 4
  if (pathname.startsWith('/agendar/dados')) return 3
  if (pathname.startsWith('/agendar/horario')) return 2
  if (pathname.startsWith('/agendar/profissional')) return 1
  // covers /agendar, /agendar/, /agendar/servico/:id
  return 0
}

function BookingLayoutInner() {
  const location = useLocation()
  const activeStep = pathToStepIndex(location.pathname)

  return (
    <div className="min-h-screen bg-off flex flex-col">
      {/* Fixed top header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          {/* Left: logo */}
          <div className="w-24 shrink-0">
            <span className="font-display text-green-700 font-bold text-lg leading-none">
              AgendaCD
            </span>
          </div>

          {/* Center: progress */}
          <div className="flex-1 flex justify-center overflow-hidden">
            <ProgressSteps steps={STEPS} activeStep={activeStep} />
          </div>

          {/* Right: spacer for visual balance */}
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
  return (
    <BookingProvider>
      <BookingLayoutInner />
    </BookingProvider>
  )
}

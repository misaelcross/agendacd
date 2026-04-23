import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaretDown, CaretUp, ArrowRight } from '@phosphor-icons/react'

import { useBooking } from '../../contexts/BookingContext'

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function BookingConfirm() {
  const navigate = useNavigate()
  const { state } = useBooking()

  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [chk1, setChk1] = useState(false)
  const [chk2, setChk2] = useState(false)

  // Guard: booking must be reasonably complete
  useEffect(() => {
    if (!state.service || !state.date || !state.time || !state.clientName) {
      navigate('/agendar', { replace: true })
    }
  }, [state.service, state.date, state.time, state.clientName, navigate])

  if (!state.service || !state.date || !state.time || !state.clientName) {
    return null
  }

  const { service } = state
  const cautionAmount = Math.round(service.price * (service.caution_pct / 100) * 100) / 100

  function toggleSection(key: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const canConfirm = chk1 && chk2

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 pt-6">
      <h1 className="text-xl font-display font-bold text-gray-900 mb-6">
        Confirme seu agendamento
      </h1>

      {/* Service summary card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          {service.image_url
            ? <img src={service.image_url} alt={service.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
            : <span className="text-3xl leading-none">{service.emoji}</span>}
          <div>
            <h2 className="font-display font-bold text-gray-900 text-lg leading-tight">
              {service.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {state.staff ? state.staff.name : 'Profissional a confirmar'}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400">📅</span>
            <span className="capitalize">
              {capitalize(formatDate(state.date))}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400">🕐</span>
            <span>às {state.time}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400">⏱</span>
            <span>{service.duration_min} minutos</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-gray-400">💰</span>
            <span className="font-semibold text-gray-900">{fmt.format(service.price)}</span>
            {service.caution_pct > 0 && (
              <span className="text-gray-400 text-xs">
                (caução: {fmt.format(cautionAmount)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accordion: Seus dados */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('dados')}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <span>Seus dados</span>
          {openSections.has('dados')
            ? <CaretUp size={16} className="text-gray-400" />
            : <CaretDown size={16} className="text-gray-400" />
          }
        </button>
        {openSections.has('dados') && (
          <div className="px-5 pb-5 space-y-2 text-sm text-gray-700 border-t border-gray-100">
            <div className="pt-3 space-y-1.5">
              <p><span className="font-medium text-gray-500">Nome:</span> {state.clientName}</p>
              <p><span className="font-medium text-gray-500">E-mail:</span> {state.clientEmail}</p>
              <p><span className="font-medium text-gray-500">Telefone:</span> {state.clientPhone}</p>
              {state.clientNotes && (
                <p>
                  <span className="font-medium text-gray-500">Observações:</span>{' '}
                  {state.clientNotes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Accordion: Política de cancelamento */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('politica')}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
        >
          <span>Política de cancelamento</span>
          {openSections.has('politica')
            ? <CaretUp size={16} className="text-gray-400" />
            : <CaretDown size={16} className="text-gray-400" />
          }
        </button>
        {openSections.has('politica') && (
          <div className="px-5 pb-5 border-t border-gray-100">
            <p className="pt-3 text-sm text-gray-600 leading-relaxed">
              Cancelamentos com menos de 24h de antecedência não são reembolsáveis.
              A caução será retida.
            </p>
          </div>
        )}
      </div>

      {/* Terms checkboxes */}
      <div className="space-y-3 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={chk1}
            onChange={e => setChk1(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
          />
          <span className="text-sm text-gray-700">
            Confirmo que os dados acima estão corretos.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={chk2}
            onChange={e => setChk2(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
          />
          <span className="text-sm text-gray-700">
            Li e aceito a política de cancelamento.
          </span>
        </label>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => navigate('/agendar/pagamento')}
            className="inline-flex items-center justify-center w-full gap-2 h-11 px-8 text-base rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            Confirmar e Pagar
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  )
}

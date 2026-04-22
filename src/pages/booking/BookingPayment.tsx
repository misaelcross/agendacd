import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Check, ChatCircle, ArrowLeft } from '@phosphor-icons/react'

import { useBooking } from '../../contexts/BookingContext'
import { bookAppointment } from '../../lib/appointments'

const PIX_KEY = 'agendacd@conversao.digital'
const WHATSAPP_URL =
  'https://wa.me/5511999999999?text=Ol%C3%A1!+Acabei+de+fazer+meu+agendamento+e+gostaria+de+confirmar+o+pagamento+da+cau%C3%A7%C3%A3o.'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type ErrorKind = 'slot_unavailable' | 'generic' | null

export function BookingPayment() {
  const navigate = useNavigate()
  const { state, dispatch } = useBooking()

  const [booking, setBooking] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [copied, setCopied] = useState(false)
  const [paidConfirmed, setPaidConfirmed] = useState(false)
  const didBook = useRef(false)

  // Guard
  useEffect(() => {
    if (!state.service || !state.date || !state.time || !state.clientName) {
      navigate('/agendar', { replace: true })
    }
  }, [state.service, state.date, state.time, state.clientName, navigate])

  // Book appointment on mount if not already done
  useEffect(() => {
    if (didBook.current) return
    if (!state.service || !state.date || !state.time || !state.clientName) return
    if (state.appointmentId) {
      setBooking('done')
      return
    }

    didBook.current = true
    setBooking('loading')

    bookAppointment(state)
      .then(id => {
        dispatch({ type: 'SET_APPOINTMENT_ID', payload: id })
        setBooking('done')
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('slot_unavailable')) {
          setErrorKind('slot_unavailable')
        } else {
          setErrorKind('generic')
        }
        setBooking('error')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(PIX_KEY)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select input (no-op in this UI)
    }
  }

  if (!state.service) return null

  const { service } = state
  const cautionAmount = Math.round(service.price * (service.caution_pct / 100) * 100) / 100
  const remainder = Math.round((service.price - cautionAmount) * 100) / 100

  // Error state
  if (booking === 'error') {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 flex flex-col items-center text-center gap-4">
        {errorKind === 'slot_unavailable' ? (
          <>
            <span className="text-4xl">😕</span>
            <h2 className="text-lg font-display font-bold text-gray-900">
              Horário indisponível
            </h2>
            <p className="text-sm text-gray-500">
              Este horário não está mais disponível. Escolha outro horário.
            </p>
            <Link
              to="/agendar/horario"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline"
            >
              <ArrowLeft size={16} />
              Escolher outro horário
            </Link>
          </>
        ) : (
          <>
            <span className="text-4xl">⚠️</span>
            <h2 className="text-lg font-display font-bold text-gray-900">
              Algo deu errado
            </h2>
            <p className="text-sm text-gray-500">
              Não foi possível concluir o agendamento. Tente novamente.
            </p>
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline"
            >
              <ArrowLeft size={16} />
              Recomeçar
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 pt-6">
      {/* Header */}
      <h1 className="font-display font-bold text-green-700 text-2xl mb-1">
        Quase lá!
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Para confirmar, pague a caução via PIX
      </p>

      {/* Caution amount card */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
          Valor da caução
        </p>
        <p className="text-3xl font-display font-bold text-green-700 mb-1">
          {brl.format(cautionAmount)}
        </p>
        {remainder > 0 && (
          <p className="text-sm text-gray-600">
            Restante no dia:{' '}
            <span className="font-semibold text-gray-800">{brl.format(remainder)}</span>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          A caução garante seu horário. O restante é pago no dia do serviço.
        </p>
      </div>

      {/* PIX section */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 space-y-4">
        {/* QR code placeholder */}
        <div className="flex flex-col items-center">
          <div className="w-44 h-44 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 gap-2">
            {/* Minimal QR pattern decoration */}
            <div className="grid grid-cols-3 gap-1.5 opacity-30 mb-1" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-sm ${[0,2,6,8].includes(i) ? 'bg-gray-700' : i === 4 ? 'bg-gray-700' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-gray-400">QR Code</span>
            <span className="text-[10px] text-gray-300">Gerado após confirmação</span>
          </div>
        </div>

        {/* PIX copia-e-cola */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            PIX Copia e Cola
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate select-all">
              {PIX_KEY}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={15} className="text-green-600" weight="bold" />
                  <span className="text-green-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* WhatsApp button */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#20BD5C] transition-colors"
        >
          <ChatCircle size={18} weight="fill" />
          Enviar comprovante via WhatsApp
        </a>
      </div>

      {/* "Já paguei" section */}
      {paidConfirmed ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-2">
          <span className="text-2xl">✅</span>
          <p className="text-sm font-semibold text-green-800">
            Pagamento informado!
          </p>
          <p className="text-sm text-green-700">
            Nossa equipe irá confirmar em breve. Você receberá um e-mail de confirmação.
          </p>
          {state.appointmentId && (
            <p className="text-xs text-gray-400 pt-1">
              ID do agendamento:{' '}
              <span className="font-mono text-gray-600">{state.appointmentId}</span>
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPaidConfirmed(true)}
          disabled={booking === 'loading'}
          className="w-full py-3 rounded-xl border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {booking === 'loading' ? 'Registrando agendamento…' : 'Já realizei o pagamento'}
        </button>
      )}

      {/* Appointment ID (always visible once booked) */}
      {state.appointmentId && !paidConfirmed && (
        <p className="text-center text-xs text-gray-400 mt-4">
          ID do agendamento:{' '}
          <span className="font-mono text-gray-600">{state.appointmentId}</span>
        </p>
      )}
    </div>
  )
}

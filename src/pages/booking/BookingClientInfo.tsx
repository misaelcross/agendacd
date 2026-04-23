import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from '@phosphor-icons/react'

import { useBooking } from '../../contexts/BookingContext'
import { bookingPath } from '../../lib/routes'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'

const schema = z.object({
  clientName:  z.string().min(3, 'Nome muito curto'),
  clientEmail: z.string().email('E-mail inválido'),
  clientPhone: z.string().min(8, 'Telefone inválido'),
  clientNotes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function BookingClientInfo() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { state, dispatch } = useBooking()

  // Guard
  useEffect(() => {
    if (!state.service) navigate(bookingPath(slug!), { replace: true })
  }, [state.service, navigate, slug])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientName:  state.clientName  || '',
      clientEmail: state.clientEmail || '',
      clientPhone: state.clientPhone || '',
      clientNotes: state.clientNotes || '',
    },
  })

  function onSubmit(values: FormValues) {
    dispatch({
      type: 'SET_CLIENT_INFO',
      payload: {
        clientName:  values.clientName,
        clientEmail: values.clientEmail,
        clientPhone: values.clientPhone,
        clientNotes: values.clientNotes ?? '',
      },
    })
    navigate(bookingPath(slug!, 'confirmar'))
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 pt-6">
      <h1 className="text-xl font-display font-bold text-gray-900 mb-1">
        Seus dados
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Preencha seus dados para confirmar o agendamento
      </p>

      <form id="client-info-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-4">
          {/* Nome completo */}
          <Input
            label="Nome completo"
            placeholder="Seu nome completo"
            error={errors.clientName?.message}
            {...register('clientName')}
          />

          {/* E-mail */}
          <Input
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            error={errors.clientEmail?.message}
            {...register('clientEmail')}
          />

          {/* Telefone */}
          <Input
            type="tel"
            label="Telefone / WhatsApp"
            placeholder="(11) 99999-9999"
            error={errors.clientPhone?.message}
            {...register('clientPhone')}
          />

          {/* Observações */}
          <Textarea
            label="Observações"
            placeholder="Alguma informação adicional?"
            {...register('clientNotes')}
          />
        </div>
      </form>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 z-20">
        <div className="max-w-lg mx-auto">
          <Button
            type="submit"
            form="client-info-form"
            size="lg"
            className="w-full gap-2"
          >
            Avançar
            <ArrowRight size={18} weight="bold" />
          </Button>
        </div>
      </div>
    </div>
  )
}

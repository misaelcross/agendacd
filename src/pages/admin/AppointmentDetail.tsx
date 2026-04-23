import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  User,
  Scissors,
  NotePencil,
  CurrencyDollar,
  Warning,
  CheckCircle,
} from '@phosphor-icons/react'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import {
  fetchAppointmentById,
  updateAppointmentStatus,
  confirmCautionPayment,
} from '../../lib/appointments'
import { supabase } from '../../lib/supabase'
import type { Appointment, AppointmentStatus } from '../../types/appointments'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending',   label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'no_show',   label: 'Não compareceu' },
]

const CAUTION_LABEL: Record<string, string> = {
  none:     'Sem caução',
  pending:  'Aguardando pagamento',
  paid:     'Pago',
  refunded: 'Estornado',
}

export function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [cautionLoading, setCautionLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAppointmentById(id)
        setAppointment(data)
        setAdminNotes(data?.admin_notes ?? '')
      } catch (err) {
        setError('Erro ao carregar agendamento.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleNotesChange = (value: string) => {
    setAdminNotes(value)
    setNotesSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveNotes(value), 1200)
  }

  const saveNotes = async (notes: string) => {
    if (!id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ admin_notes: notes })
        .eq('id', id)
      if (error) throw error
      setNotesSaved(true)
    } catch {
      // silent fail – notes will be re-saved on next change
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!id || !appointment) return
    setSaving(true)
    try {
      await updateAppointmentStatus(id, status)
      setAppointment(prev => prev ? { ...prev, status } : prev)
    } catch {
      alert('Erro ao atualizar status.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmCaution = async () => {
    if (!id) return
    setCautionLoading(true)
    try {
      await confirmCautionPayment(id)
      setAppointment(prev =>
        prev ? { ...prev, caution_status: 'paid', caution_paid_at: new Date().toISOString() } : prev
      )
    } catch {
      alert('Erro ao confirmar pagamento.')
    } finally {
      setCautionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !confirm('Deseja realmente cancelar este agendamento?')) return
    setCancelLoading(true)
    try {
      await updateAppointmentStatus(id, 'cancelled')
      setAppointment(prev => prev ? { ...prev, status: 'cancelled', cancelled_at: new Date().toISOString() } : prev)
    } catch {
      alert('Erro ao cancelar agendamento.')
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminTopBar title="Detalhe do Agendamento" backTo="/agenda/lista" />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Carregando…
        </div>
      </>
    )
  }

  if (error || !appointment) {
    return (
      <>
        <AdminTopBar title="Detalhe do Agendamento" backTo="/agenda/lista" />
        <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
          {error ?? 'Agendamento não encontrado.'}
        </div>
      </>
    )
  }

  const apt = appointment

  return (
    <>
      <AdminTopBar
        title="Detalhe do Agendamento"
        subtitle={`#${apt.id.slice(0, 8).toUpperCase()}`}
        backTo="/agenda/lista"
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Service info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scissors size={16} className="text-green-600" />
                <h2 className="font-semibold text-gray-800">Serviço</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Serviço</p>
                  <p className="text-gray-900 font-medium">
                    {apt.services ? apt.services.name : '–'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Profissional</p>
                  <p className="text-gray-900">{apt.staff?.name ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Data e hora</p>
                  <p className="text-gray-900">
                    {format(parseISO(apt.scheduled_at), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Término previsto</p>
                  <p className="text-gray-900">
                    {format(parseISO(apt.ends_at), "HH:mm")}
                    {apt.services && (
                      <span className="text-gray-400 ml-1">({apt.services.duration_min} min)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Valor</p>
                  <p className="text-gray-900 font-medium">{BRL(apt.service_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Caução</p>
                  <p className="text-gray-900">{BRL(apt.caution_amount)}</p>
                </div>
              </div>
            </div>

            {/* Client info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-green-600" />
                <h2 className="font-semibold text-gray-800">Cliente</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Nome</p>
                  <p className="text-gray-900 font-medium">{apt.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">E-mail</p>
                  <p className="text-gray-900">{apt.client_email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Telefone</p>
                  <p className="text-gray-900">{apt.client_phone ?? '–'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Política aceita</p>
                  <p className="text-gray-900">{apt.policy_accepted ? 'Sim' : 'Não'}</p>
                </div>
                {apt.client_notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Observações do cliente</p>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">
                      {apt.client_notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin notes */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <NotePencil size={16} className="text-green-600" />
                  <h2 className="font-semibold text-gray-800">Notas internas</h2>
                </div>
                <span className="text-xs text-gray-400">
                  {saving ? 'Salvando…' : notesSaved ? '✓ Salvo' : ''}
                </span>
              </div>
              <textarea
                value={adminNotes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Anotações visíveis apenas para administradores…"
                rows={4}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none transition-all"
              />
            </div>
          </div>

          {/* ── Right sidebar ────────────────────────────── */}
          <div className="space-y-5">

            {/* Status */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Status</h2>
              <div className="mb-3">
                <Badge status={apt.status} />
              </div>
              <Select
                label="Alterar status"
                value={apt.status}
                onChange={e => handleStatusChange(e.target.value as AppointmentStatus)}
                disabled={saving}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
              <p className="text-xs text-gray-400 mt-2">
                Criado em {format(parseISO(apt.created_at), 'dd/MM/yyyy')}
              </p>
              {apt.cancelled_at && (
                <p className="text-xs text-red-400 mt-1">
                  Cancelado em {format(parseISO(apt.cancelled_at), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>

            {/* Caution */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <CurrencyDollar size={16} className="text-green-600" />
                <h2 className="font-semibold text-gray-800">Caução</h2>
              </div>
              <p className="text-sm text-gray-700 mb-1">{BRL(apt.caution_amount)}</p>
              <p className="text-xs text-gray-500 mb-3">
                {CAUTION_LABEL[apt.caution_status] ?? apt.caution_status}
              </p>
              {apt.caution_status === 'pending' && (
                <Button
                  size="sm"
                  onClick={handleConfirmCaution}
                  disabled={cautionLoading}
                  className="w-full"
                >
                  <CheckCircle size={15} className="mr-1.5" />
                  {cautionLoading ? 'Confirmando…' : 'Confirmar Pagamento'}
                </Button>
              )}
              {apt.caution_paid_at && (
                <p className="text-xs text-green-600 mt-2">
                  Pago em {format(parseISO(apt.caution_paid_at), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>

            {/* Danger zone */}
            {apt.status !== 'cancelled' && (
              <div className="bg-white border border-red-100 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Warning size={16} className="text-red-400" />
                  <h2 className="font-semibold text-red-500">Zona de perigo</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Esta ação não pode ser desfeita.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="w-full"
                >
                  {cancelLoading ? 'Cancelando…' : 'Cancelar agendamento'}
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}

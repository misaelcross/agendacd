import { useState, useEffect } from 'react'
import { Plus, X, CaretDown, CaretUp, Users } from '@phosphor-icons/react'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { StaffAvatar } from '../../components/ui/StaffAvatar'
import { supabase } from '../../lib/supabase'
import type { Staff, StaffAvailability } from '../../types/appointments'

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

interface StaffWithAvail extends Staff {
  staff_availability: StaffAvailability[]
}

type AvailMap = Record<DayOfWeek, { is_active: boolean; start_time: string; end_time: string }>

function buildAvailMap(availability: StaffAvailability[]): AvailMap {
  const defaults: AvailMap = {} as AvailMap
  ALL_DAYS.forEach(d => {
    const found = availability.find(a => a.day_of_week === d)
    defaults[d] = {
      is_active:  found?.is_active ?? false,
      start_time: found?.start_time?.slice(0, 5) ?? '09:00',
      end_time:   found?.end_time?.slice(0, 5)   ?? '18:00',
    }
  })
  return defaults
}

interface StaffFormState {
  name: string
  role: string
  initials: string
  avatar_color: string
  is_active: boolean
  sort_order: number
}

export function StaffConfig() {
  const [staffList, setStaffList] = useState<StaffWithAvail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Edit/new state
  const [editTarget, setEditTarget] = useState<StaffWithAvail | null>(null)
  const [form, setForm] = useState<StaffFormState>({
    name: '', role: '', initials: '', avatar_color: '#16a34a', is_active: true, sort_order: 0,
  })
  const [availMap, setAvailMap] = useState<AvailMap>(buildAvailMap([]))
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*, staff_availability(*)')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setStaffList((data ?? []) as StaffWithAvail[])
    } catch (err) {
      setError('Erro ao carregar equipe.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditTarget(null)
    setForm({ name: '', role: '', initials: '', avatar_color: '#16a34a', is_active: true, sort_order: 0 })
    setAvailMap(buildAvailMap([]))
    setPanelOpen(true)
  }

  const openEdit = (staff: StaffWithAvail) => {
    setEditTarget(staff)
    setForm({
      name:         staff.name,
      role:         staff.role ?? '',
      initials:     staff.initials ?? '',
      avatar_color: staff.avatar_color,
      is_active:    staff.is_active,
      sort_order:   staff.sort_order,
    })
    setAvailMap(buildAvailMap(staff.staff_availability ?? []))
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditTarget(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('O nome é obrigatório.')
    setSaving(true)
    try {
      let staffId: string

      if (editTarget) {
        staffId = editTarget.id
        const { error } = await supabase.from('staff').update({
          name:         form.name,
          role:         form.role || null,
          initials:     form.initials || null,
          avatar_color: form.avatar_color,
          is_active:    form.is_active,
          sort_order:   form.sort_order,
        }).eq('id', staffId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('staff').insert({
          name:         form.name,
          role:         form.role || null,
          initials:     form.initials || null,
          avatar_color: form.avatar_color,
          is_active:    form.is_active,
          sort_order:   form.sort_order,
        }).select('id').single()
        if (error) throw error
        staffId = data.id
      }

      // Upsert availability
      const upsertRows = ALL_DAYS.map(d => ({
        staff_id:    staffId,
        day_of_week: d,
        is_active:   availMap[d].is_active,
        start_time:  availMap[d].start_time + ':00',
        end_time:    availMap[d].end_time   + ':00',
      }))

      const { error: upsertErr } = await supabase
        .from('staff_availability')
        .upsert(upsertRows, { onConflict: 'staff_id,day_of_week' })
      if (upsertErr) throw upsertErr

      await load()
      closePanel()
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message ?? 'tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (staff: StaffWithAvail) => {
    try {
      const { error } = await supabase.from('staff').update({ is_active: !staff.is_active }).eq('id', staff.id)
      if (error) throw error
      setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: !s.is_active } : s))
    } catch {
      alert('Erro ao atualizar.')
    }
  }

  const setAvailDay = (day: DayOfWeek, key: 'is_active' | 'start_time' | 'end_time', value: boolean | string) => {
    setAvailMap(prev => ({ ...prev, [day]: { ...prev[day], [key]: value } }))
  }

  const set = <K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <>
      <AdminTopBar
        title="Equipe"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="mr-1.5" />
            Novo Profissional
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/6" />
                </div>
              </div>
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Users size={40} weight="thin" />
            <p className="text-sm">Nenhum profissional cadastrado.</p>
            <Button size="sm" onClick={openNew}>Adicionar profissional</Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {staffList.map(staff => {
              const isExpanded = expandedId === staff.id
              return (
                <div key={staff.id}>
                  {/* Staff row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <StaffAvatar
                      name={staff.name}
                      initials={staff.initials}
                      avatarColor={staff.avatar_color}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{staff.name}</p>
                      {staff.role && <p className="text-xs text-gray-500">{staff.role}</p>}
                    </div>
                    <div onClick={e => e.stopPropagation()}>
                      <Toggle
                        checked={staff.is_active}
                        onChange={() => handleToggleActive(staff)}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEdit(staff)}
                    >
                      Editar
                    </Button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : staff.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {isExpanded ? <CaretUp size={15} /> : <CaretDown size={15} />}
                    </button>
                  </div>

                  {/* Availability accordion */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-gray-50/60">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pt-3">
                        Disponibilidade semanal
                      </p>
                      <div className="grid grid-cols-7 gap-2">
                        {ALL_DAYS.map(day => {
                          const avail = staff.staff_availability?.find(a => a.day_of_week === day)
                          const isActive = avail?.is_active ?? false
                          return (
                            <div
                              key={day}
                              className={[
                                'rounded-lg border p-2 text-center',
                                isActive
                                  ? 'bg-white border-green-200'
                                  : 'bg-gray-100 border-gray-200',
                              ].join(' ')}
                            >
                              <p className={`text-xs font-semibold mb-1 ${isActive ? 'text-green-700' : 'text-gray-400'}`}>
                                {DAY_LABELS[day]}
                              </p>
                              {isActive && avail && (
                                <>
                                  <p className="text-xs text-gray-500">{avail.start_time.slice(0,5)}</p>
                                  <p className="text-xs text-gray-400">–</p>
                                  <p className="text-xs text-gray-500">{avail.end_time.slice(0,5)}</p>
                                </>
                              )}
                              {!isActive && (
                                <p className="text-xs text-gray-400">Folga</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {editTarget ? 'Editar Profissional' : 'Novo Profissional'}
              </h2>
              <button onClick={closePanel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Basic info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Informações básicas</h3>

                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                  <StaffAvatar
                    name={form.name || 'NM'}
                    initials={form.initials || undefined}
                    avatarColor={form.avatar_color}
                    size="lg"
                  />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cor do avatar</label>
                    <input
                      type="color"
                      value={form.avatar_color}
                      onChange={e => set('avatar_color', e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 px-1 py-1 cursor-pointer"
                    />
                  </div>
                </div>

                <Input
                  label="Nome completo"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ex: Ana Souza"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Cargo / Função"
                    value={form.role}
                    onChange={e => set('role', e.target.value)}
                    placeholder="Ex: Esteticista"
                  />
                  <Input
                    label="Iniciais"
                    value={form.initials}
                    onChange={e => set('initials', e.target.value.toUpperCase())}
                    placeholder="Ex: AS"
                    maxLength={3}
                  />
                </div>
                <Input
                  label="Ordem de exibição"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => set('sort_order', Number(e.target.value))}
                />
                <Toggle
                  checked={form.is_active}
                  onChange={v => set('is_active', v)}
                  label="Profissional ativo"
                  description="Aparece na seleção de agendamento"
                />
              </div>

              {/* Availability */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Disponibilidade semanal</h3>
                <div className="space-y-2">
                  {ALL_DAYS.map(day => (
                    <div key={day} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                      <div className="w-8 text-sm font-medium text-gray-600">{DAY_LABELS[day]}</div>
                      <Toggle
                        checked={availMap[day].is_active}
                        onChange={v => setAvailDay(day, 'is_active', v)}
                      />
                      {availMap[day].is_active && (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={availMap[day].start_time}
                            onChange={e => setAvailDay(day, 'start_time', e.target.value)}
                            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          />
                          <span className="text-gray-400 text-sm">–</span>
                          <input
                            type="time"
                            value={availMap[day].end_time}
                            onChange={e => setAvailDay(day, 'end_time', e.target.value)}
                            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                          />
                        </div>
                      )}
                      {!availMap[day].is_active && (
                        <span className="text-xs text-gray-400">Folga</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={closePanel}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

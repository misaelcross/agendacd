import { useState, useEffect } from 'react'
import { Plus, X, Trash, Scissors } from '@phosphor-icons/react'
import { AdminShell } from '../../components/layout/AdminShell'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Toggle } from '../../components/ui/Toggle'
import { supabase } from '../../lib/supabase'
import type { Service, ServiceCategory } from '../../types/appointments'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  facial:   'Facial',
  massagem: 'Massagem',
  corporal: 'Corporal',
  outro:    'Outro',
}

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  facial:   'bg-pink-100 text-pink-700',
  massagem: 'bg-blue-100 text-blue-700',
  corporal: 'bg-amber-100 text-amber-700',
  outro:    'bg-gray-100 text-gray-600',
}

type ServiceForm = Omit<Service, 'id' | 'created_at'>

const EMPTY_FORM: ServiceForm = {
  name: '',
  description: '',
  emoji: '✨',
  category: 'facial',
  duration_min: 60,
  price: 0,
  caution_pct: 0,
  is_active: true,
  sort_order: 0,
}

export function ServicesConfig() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadServices = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      setServices(data ?? [])
    } catch (err) {
      setError('Erro ao carregar serviços.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadServices() }, [])

  const openNew = () => {
    setSelected(null)
    setForm(EMPTY_FORM)
    setPanelOpen(true)
  }

  const openEdit = (service: Service) => {
    setSelected(service)
    const { id: _id, created_at: _cat, ...rest } = service
    setForm(rest)
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelected(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('O nome do serviço é obrigatório.')
    setSaving(true)
    try {
      if (selected) {
        const { error } = await supabase
          .from('services')
          .update(form)
          .eq('id', selected.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('services')
          .insert(form)
        if (error) throw error
      }
      await loadServices()
      closePanel()
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message ?? 'tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected || !confirm(`Deseja excluir o serviço "${selected.name}"?`)) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('services').delete().eq('id', selected.id)
      if (error) throw error
      await loadServices()
      closePanel()
    } catch (err: any) {
      alert('Erro ao excluir: ' + (err.message ?? 'tente novamente.'))
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)
      if (error) throw error
      setServices(prev =>
        prev.map(s => s.id === service.id ? { ...s, is_active: !s.is_active } : s)
      )
    } catch {
      alert('Erro ao atualizar serviço.')
    }
  }

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <AdminShell>
      <AdminTopBar
        title="Serviços"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus size={15} className="mr-1.5" />
            Novo Serviço
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
                <div className="h-8 w-8 bg-gray-100 rounded-lg mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
            <Scissors size={40} weight="thin" />
            <p className="text-sm">Nenhum serviço cadastrado.</p>
            <Button size="sm" onClick={openNew}>Adicionar primeiro serviço</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <div
                key={service.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-green-200 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => openEdit(service)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{service.emoji}</span>
                  <div onClick={e => { e.stopPropagation() }}>
                    <Toggle
                      checked={service.is_active}
                      onChange={() => handleToggleActive(service)}
                    />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[service.category]}`}>
                    {CATEGORY_LABELS[service.category]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{service.duration_min} min</span>
                  <span className="font-semibold text-gray-800">{BRL(service.price)}</span>
                </div>
                {service.caution_pct > 0 && (
                  <p className="text-xs text-gray-400 mt-1">Caução: {service.caution_pct}%</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-over panel */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closePanel}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {selected ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex gap-3">
                <Input
                  label="Emoji"
                  value={form.emoji}
                  onChange={e => set('emoji', e.target.value)}
                  className="w-20 text-center text-xl"
                  maxLength={4}
                />
                <div className="flex-1">
                  <Input
                    label="Nome do serviço"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="Ex: Massagem relaxante"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Descreva o serviço…"
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none transition-all"
                />
              </div>

              <Select
                label="Categoria"
                value={form.category}
                onChange={e => set('category', e.target.value as ServiceCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as ServiceCategory[]).map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Duração (min)"
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_min}
                  onChange={e => set('duration_min', Number(e.target.value))}
                />
                <Input
                  label="Preço (R$)"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={e => set('price', Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Caução (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.caution_pct}
                  onChange={e => set('caution_pct', Number(e.target.value))}
                />
                <Input
                  label="Ordem de exibição"
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => set('sort_order', Number(e.target.value))}
                />
              </div>

              <div className="pt-1">
                <Toggle
                  checked={form.is_active}
                  onChange={v => set('is_active', v)}
                  label="Serviço ativo"
                  description="Aparece na tela de agendamento"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {selected ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash size={15} className="mr-1.5" />
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={closePanel}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}

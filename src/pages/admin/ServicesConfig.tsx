import { useState, useEffect, useRef } from 'react'
import { Plus, X, Trash, Scissors, Check, CaretDown, Star, Image as ImageIcon, Package } from '@phosphor-icons/react'
import { AdminTopBar } from '../../components/layout/AdminTopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Toggle } from '../../components/ui/Toggle'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'
import type { Service } from '../../types/appointments'

// ── Price mask ────────────────────────────────────────────────────
function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function displayToCents(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  return Math.min(parseInt(digits || '0', 10), 9999999)
}

// ── Category color (deterministic from string) ────────────────────
const PALETTE = [
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-violet-100 text-violet-700',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function categoryColor(cat: string): string {
  const hash = [...cat].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return PALETTE[hash % PALETTE.length]
}

// ── Category dropdown with inline "add new" ───────────────────────
interface CategoryDropdownProps {
  value: string
  options: string[]
  onChange: (v: string) => void
}

function CategoryDropdown({ value, options, onChange }: CategoryDropdownProps) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setAdding(false)
        setNewCat('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function confirmNew() {
    const trimmed = newCat.trim()
    if (!trimmed) return
    onChange(trimmed)
    setNewCat('')
    setAdding(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || 'Selecione ou crie uma categoria'}
        </span>
        <CaretDown size={14} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-56 overflow-y-auto">
          {options.length === 0 && !adding && (
            <p className="px-3 py-2 text-sm text-gray-400">Nenhuma categoria ainda</p>
          )}
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {opt}
              {opt === value && <Check size={13} className="text-green-600" />}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            {adding ? (
              <div className="flex items-center gap-2 px-3 py-1.5">
                <input
                  ref={inputRef}
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmNew() }
                    if (e.key === 'Escape') { setAdding(false); setNewCat('') }
                  }}
                  placeholder="Nome da categoria..."
                  className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-green-500"
                />
                <button type="button" onClick={confirmNew} className="text-green-600 hover:text-green-700 shrink-0">
                  <Check size={15} />
                </button>
                <button type="button" onClick={() => { setAdding(false); setNewCat('') }} className="text-gray-400 hover:text-gray-600 shrink-0">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
              >
                <Plus size={14} />
                Nova categoria
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Image Upload ──────────────────────────────────────────────────
interface ImageUploadProps {
  value: string | null
  onChange: (url: string | null) => void
}

function ImageUpload({ value, onChange, businessId }: ImageUploadProps & { businessId: string | null }) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadError('Apenas imagens são aceitas.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagem deve ter no máximo 5MB.')
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const prefix = businessId ? `${businessId}/` : ''
      const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('service-images')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (error) throw error
      const { data } = supabase.storage.from('service-images').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err: any) {
      setUploadError('Erro ao enviar: ' + (err.message ?? 'tente novamente.'))
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do serviço</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !value && !uploading && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all ${
          dragOver ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
        } ${!value && !uploading ? 'cursor-pointer hover:border-green-400 hover:bg-green-50/60' : ''}`}
      >
        {value ? (
          <>
            <img src={value} alt="Serviço" className="w-full h-44 object-cover rounded-xl" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                className="px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg shadow text-xs font-medium text-gray-700 hover:text-green-700 transition-colors"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange(null) }}
                className="p-1.5 bg-white/90 backdrop-blur rounded-lg shadow text-gray-500 hover:text-red-600 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <div className="h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Enviando imagem…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
            <ImageIcon size={28} weight="thin" />
            <p className="text-sm text-center px-4">
              <span className="text-green-600 font-medium">Clique para selecionar</span>
              {' '}ou arraste uma imagem aqui
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP — máx. 5MB</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
    </div>
  )
}

// ── Form type ─────────────────────────────────────────────────────
type ServiceForm = Omit<Service, 'id' | 'created_at'>

const EMPTY_FORM: ServiceForm = {
  name: '',
  description: '',
  emoji: '',
  image_url: null,
  category: '',
  duration_min: 60,
  price: 0,
  caution_pct: 0,
  is_combo: false,
  combo_service_ids: null,
  is_active: true,
  is_featured: false,
  sort_order: 0,
}

const MAX_FEATURED = 3

export function ServicesConfig() {
  const { businessId } = useBusiness()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [priceCents, setPriceCents] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [featuredError, setFeaturedError] = useState('')
  const [comboMode, setComboMode] = useState(false)
  const [selectedComboIds, setSelectedComboIds] = useState<string[]>([])
  const [comboDropdownOpen, setComboDropdownOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))].sort()

  const featuredCount = services.filter(s => s.is_featured && s.id !== selected?.id).length

  const loadServices = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId!)
        .order('name', { ascending: true })
      if (error) throw error
      const rows = (data ?? []).map(s => ({ is_featured: false, ...s }))
      setServices(rows.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)))
    } catch (err) {
      setError('Erro ao carregar serviços.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (businessId) loadServices() }, [businessId])

  // Close combo dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  // Auto-fill name, price, duration when combo services change
  const comboServices = services.filter(s => selectedComboIds.includes(s.id))
  const nameManuallyEdited = useRef(false)
  const priceManuallyEdited = useRef(false)
  const durationManuallyEdited = useRef(false)

  function handleComboToggle(ids: string[]) {
    setSelectedComboIds(ids)
    const sel = services.filter(s => ids.includes(s.id))
    if (sel.length >= 2 && !nameManuallyEdited.current) {
      setForm(prev => ({ ...prev, name: sel.map(s => s.name).join(' + ') }))
    }
    if (sel.length >= 2 && !priceManuallyEdited.current) {
      const sumCents = Math.round(sel.reduce((acc, s) => acc + s.price, 0) * 100)
      setPriceCents(sumCents)
      setForm(prev => ({ ...prev, price: sumCents / 100 }))
    }
    if (sel.length >= 2 && !durationManuallyEdited.current) {
      const totalMin = sel.reduce((acc, s) => acc + s.duration_min, 0)
      setForm(prev => ({ ...prev, duration_min: totalMin }))
    }
  }

  function toggleComboService(id: string) {
    setSelectedComboIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    const nextIds = selectedComboIds.includes(id)
      ? selectedComboIds.filter(x => x !== id)
      : [...selectedComboIds, id]
    handleComboToggle(nextIds)
  }

  const openNew = () => {
    setSelected(null)
    setForm(EMPTY_FORM)
    setPriceCents(0)
    setFeaturedError('')
    setComboMode(false)
    setSelectedComboIds([])
    nameManuallyEdited.current = false
    priceManuallyEdited.current = false
    durationManuallyEdited.current = false
    setPanelOpen(true)
  }

  const openEdit = (service: Service) => {
    setSelected(service)
    const { id: _id, created_at: _cat, ...rest } = service
    setForm(rest)
    setPriceCents(Math.round(service.price * 100))
    setFeaturedError('')
    setComboMode(service.is_combo)
    setSelectedComboIds(service.combo_service_ids ?? [])
    nameManuallyEdited.current = false
    priceManuallyEdited.current = false
    durationManuallyEdited.current = false
    setPanelOpen(true)
  }

  const closePanel = () => {
    setPanelOpen(false)
    setSelected(null)
    setFeaturedError('')
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('O nome do serviço é obrigatório.')
    if (!form.category.trim()) return alert('Selecione ou crie uma categoria.')
    if (comboMode && selectedComboIds.length < 2) return alert('Selecione pelo menos 2 serviços para o combo.')
    setSaving(true)
    try {
      const payload = {
        ...form,
        business_id: businessId,
        price: priceCents / 100,
        is_combo: comboMode,
        combo_service_ids: comboMode ? selectedComboIds : null,
      }
      if (selected) {
        const { error } = await supabase.from('services').update(payload).eq('id', selected.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('services').insert(payload)
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

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleFeaturedToggle = (checked: boolean) => {
    if (checked && featuredCount >= MAX_FEATURED) {
      setFeaturedError(`Máximo de ${MAX_FEATURED} serviços em destaque. Remova um antes de adicionar outro.`)
      return
    }
    setFeaturedError('')
    set('is_featured', checked)
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    priceManuallyEdited.current = true
    const cents = displayToCents(e.target.value)
    setPriceCents(cents)
    setForm(prev => ({ ...prev, price: cents / 100 }))
  }

  return (
    <>
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
                  <div className="flex items-center gap-2">
                    {service.image_url ? (
                      <img src={service.image_url} alt={service.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="text-3xl">{service.emoji || '🖼️'}</span>
                    )}
                    {service.is_featured && (
                      <Star size={14} weight="fill" className="text-amber-400 mt-1" />
                    )}
                  </div>
                  <div onClick={e => { e.stopPropagation() }}>
                    <Toggle
                      checked={service.is_active}
                      onChange={() => handleToggleActive(service)}
                    />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  {service.is_combo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                      <Package size={10} />
                      Combo
                    </span>
                  )}
                  {service.category && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor(service.category)}`}>
                      {service.category}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{service.duration_min} min</span>
                  <span className="font-semibold text-gray-800">
                    {service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
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
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closePanel} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Combo toggle */}
              <div className="pb-2">
                <Toggle
                  checked={comboMode}
                  onChange={v => {
                    setComboMode(v)
                    if (!v) {
                      setSelectedComboIds([])
                      setForm(prev => ({ ...prev, is_combo: false, combo_service_ids: null }))
                    }
                  }}
                  label="É um combo?"
                  description="Combine 2 ou mais serviços existentes"
                />
              </div>

              {/* Combo service selector */}
              {comboMode && (
                <div ref={comboRef} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serviços do combo <span className="text-gray-400 font-normal">(selecione 2 ou mais)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setComboDropdownOpen(o => !o)}
                      className="flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    >
                      <span className={selectedComboIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                        {selectedComboIds.length > 0
                          ? `${selectedComboIds.length} serviço${selectedComboIds.length > 1 ? 's' : ''} selecionado${selectedComboIds.length > 1 ? 's' : ''}`
                          : 'Selecione os serviços'}
                      </span>
                      <CaretDown size={14} className="text-gray-400 shrink-0" />
                    </button>

                    {comboDropdownOpen && (
                      <div className="mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg py-1 max-h-56 overflow-y-auto">
                        {services
                          .filter(s => !s.is_combo && s.is_active)
                          .map(s => {
                            const isSelected = selectedComboIds.includes(s.id)
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleComboService(s.id)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check size={10} className="text-white" weight="bold" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="truncate">{s.name}</span>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0">
                                  {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </button>
                            )
                          })}
                        {services.filter(s => !s.is_combo && s.is_active).length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Nenhum serviço disponível</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected combo services as chips */}
                  {comboServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {comboServices.map(s => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium"
                        >
                          {s.name}
                          <button
                            type="button"
                            onClick={() => toggleComboService(s.id)}
                            className="text-green-500 hover:text-green-700"
                          >
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested price notice */}
                  {comboServices.length >= 2 && !priceManuallyEdited.current && (
                    <p className="text-xs text-gray-400">
                      Preço sugerido: soma dos serviços individuais. Você pode ajustar livremente.
                    </p>
                  )}
                </div>
              )}

              {/* Image */}
              <ImageUpload
                value={form.image_url ?? null}
                onChange={url => set('image_url', url)}
                businessId={businessId}
              />

              {/* Name */}
              <Input
                label="Nome do serviço"
                value={form.name}
                onChange={e => { nameManuallyEdited.current = true; set('name', e.target.value) }}
                placeholder="Ex: Massagem relaxante"
              />

              {/* Description */}
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

              {/* Category */}
              <CategoryDropdown
                value={form.category}
                options={categories}
                onChange={v => set('category', v)}
              />

              {/* Duration + Price */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Duração (min)"
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration_min}
                  onChange={e => { durationManuallyEdited.current = true; set('duration_min', Number(e.target.value)) }}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço</label>
                  <input
                    inputMode="numeric"
                    value={centsToDisplay(priceCents)}
                    onChange={handlePriceChange}
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Caution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caução (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={form.caution_pct}
                    onChange={e => set('caution_pct', Number(e.target.value))}
                    onFocus={e => e.target.select()}
                    className="flex h-10 w-24 shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 30, 40, 50].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => set('caution_pct', pct)}
                        className={`h-8 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                          form.caution_pct === pct
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                <Toggle
                  checked={form.is_active}
                  onChange={v => set('is_active', v)}
                  label="Serviço ativo"
                  description="Aparece na tela de agendamento"
                />
                <div>
                  <Toggle
                    checked={form.is_featured}
                    onChange={handleFeaturedToggle}
                    label="Serviço em destaque"
                    description={`Aparece primeiro na listagem (${featuredCount}/${MAX_FEATURED} em destaque)`}
                  />
                  {featuredError && (
                    <p className="mt-1 text-xs text-red-500">{featuredError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {selected ? (
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash size={15} className="mr-1.5" />
                  {deleting ? 'Excluindo…' : 'Excluir'}
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={closePanel}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

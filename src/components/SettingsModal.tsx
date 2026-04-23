import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { supabase } from '../lib/supabase'
import { useBusiness } from '../contexts/BusinessContext'
import { Image, FloppyDisk, Globe, Desktop, Buildings, Plus, Trash } from '@phosphor-icons/react'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export interface CompanyProfile {
    id: string
    name: string
    document: string
    address: string
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { businessId } = useBusiness()
    const [logoUrl, setLogoUrl] = useState('')
    const [faviconUrl, setFaviconUrl] = useState('')
    const [systemName, setSystemName] = useState('')
    const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchSettings()
        }
    }, [isOpen])

    async function fetchSettings() {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('logo_url, favicon_url, system_name, company_profiles')
                .eq('business_id', businessId)
                .single()

            if (error && error.code !== 'PGRST116') {
                throw error
            }

            if (data) {
                setLogoUrl(data.logo_url || '')
                setFaviconUrl(data.favicon_url || '')
                setSystemName(data.system_name || '')
                setCompanyProfiles(data.company_profiles || [])
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSave() {
        setIsSaving(true)
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    business_id: businessId,
                    logo_url: logoUrl,
                    favicon_url: faviconUrl,
                    system_name: systemName,
                    company_profiles: companyProfiles,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            onClose()
            window.location.reload()
        } catch (error: any) {
            console.error('Error saving settings:', error)
            alert(`Erro ao salvar configurações: ${error.message}`)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configurações do Sistema"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Nome do Sistema"
                            placeholder="Ex: Propostas CD"
                            value={systemName}
                            onChange={(e) => setSystemName(e.target.value)}
                            icon={<Desktop size={18} className="text-gray-400" />}
                        />
                        <Input
                            label="URL do Favicon"
                            placeholder="https://exemplo.com/favicon.png"
                            value={faviconUrl}
                            onChange={(e) => setFaviconUrl(e.target.value)}
                            icon={<Globe size={18} className="text-gray-400" />}
                        />
                    </div>

                    <Input
                        label="URL do Logo"
                        placeholder="https://exemplo.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        icon={<Image size={18} className="text-gray-400" />}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Preview Logo</span>
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo Preview"
                                    className="max-h-20 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro'
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center text-gray-300">
                                    <Image size={32} weight="thin" />
                                    <span className="text-xs mt-2">Sem logo</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Preview Favicon</span>
                            {faviconUrl ? (
                                <img
                                    src={faviconUrl}
                                    alt="Favicon Preview"
                                    className="w-8 h-8 object-contain rounded"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=!'
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center text-gray-300">
                                    <Globe size={32} weight="thin" />
                                    <span className="text-xs mt-2">Sem favicon</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Perfis de Empresa */}
                <div className="pt-6 border-t border-gray-200 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Buildings size={16} className="text-green-600" />
                        <span className="text-sm font-semibold text-gray-600">Perfis da Nossa Empresa (Assinatura PDF)</span>
                    </div>
                    {companyProfiles.map((profile, idx) => (
                        <div key={profile.id} className="p-4 bg-white border border-gray-200 rounded-xl space-y-3 relative group">
                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyProfiles(prev => prev.filter(p => p.id !== profile.id))
                                }}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash size={16} />
                            </button>
                            <Input
                                label="Razão Social / Nome"
                                placeholder="Ex: CONVERSÃO DIGITAL LTDA"
                                value={profile.name}
                                onChange={(e) => {
                                    const newProfiles = [...companyProfiles];
                                    newProfiles[idx].name = e.target.value;
                                    setCompanyProfiles(newProfiles);
                                }}
                            />
                            <Input
                                label="CNPJ / CPF"
                                placeholder="Ex: 51.523.000/0001-90"
                                value={profile.document}
                                onChange={(e) => {
                                    const newProfiles = [...companyProfiles];
                                    newProfiles[idx].document = e.target.value;
                                    setCompanyProfiles(newProfiles);
                                }}
                            />
                            <Input
                                label="Endereço Completo"
                                placeholder="Ex: Rua Exemplo, 123, Bairro, Cidade - SP"
                                value={profile.address}
                                onChange={(e) => {
                                    const newProfiles = [...companyProfiles];
                                    newProfiles[idx].address = e.target.value;
                                    setCompanyProfiles(newProfiles);
                                }}
                            />
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCompanyProfiles([...companyProfiles, { id: crypto.randomUUID(), name: '', document: '', address: '' }])}
                        className="w-full gap-2 border-dashed"
                    >
                        <Plus size={18} /> Adicionar Novo Perfil
                    </Button>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white border-none"
                    >
                        <FloppyDisk size={18} />
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

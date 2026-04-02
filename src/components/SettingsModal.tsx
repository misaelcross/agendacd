import { useState, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { supabase } from '../lib/supabase'
import { Image, FloppyDisk, Globe, Desktop, Robot, Key, Buildings, Plus, Trash } from '@phosphor-icons/react'

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

const SETTINGS_ID = '550e8400-e29b-41d4-a716-446655440000'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [logoUrl, setLogoUrl] = useState('')
    const [faviconUrl, setFaviconUrl] = useState('')
    const [systemName, setSystemName] = useState('')
    const [geminiApiKey, setGeminiApiKey] = useState('')
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
                .select('logo_url, favicon_url, system_name, gemini_api_key, company_profiles')
                .eq('id', SETTINGS_ID)
                .single()

            if (error && error.code !== 'PGRST116') {
                throw error
            }

            if (data) {
                setLogoUrl(data.logo_url || '')
                setFaviconUrl(data.favicon_url || '')
                setSystemName(data.system_name || '')
                setGeminiApiKey(data.gemini_api_key || '')
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
                    id: SETTINGS_ID,
                    logo_url: logoUrl,
                    favicon_url: faviconUrl,
                    system_name: systemName,
                    gemini_api_key: geminiApiKey,
                    company_profiles: companyProfiles,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            onClose()
            // Optional: Trigger a refresh of the global state if needed, or window.location.reload()
            window.location.reload() // Reload to apply title/favicon changes everywhere easily
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
                            icon={<Desktop size={18} className="text-neutral-500" />}
                        />
                        <Input
                            label="URL do Favicon"
                            placeholder="https://exemplo.com/favicon.png"
                            value={faviconUrl}
                            onChange={(e) => setFaviconUrl(e.target.value)}
                            icon={<Globe size={18} className="text-neutral-500" />}
                        />
                    </div>

                    <Input
                        label="URL do Logo"
                        placeholder="https://exemplo.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        icon={<Image size={18} className="text-neutral-500" />}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-neutral-800/30 border border-neutral-800 rounded-xl flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Preview Logo</span>
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
                                <div className="flex flex-col items-center text-neutral-700">
                                    <Image size={32} weight="thin" />
                                    <span className="text-xs mt-2">Sem logo</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-neutral-800/30 border border-neutral-800 rounded-xl flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Preview Favicon</span>
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
                                <div className="flex flex-col items-center text-neutral-700">
                                    <Globe size={32} weight="thin" />
                                    <span className="text-xs mt-2">Sem favicon</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Section */}
                <div className="pt-6 border-t border-neutral-800 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Robot size={16} className="text-orange-500" />
                        <span className="text-sm font-semibold text-neutral-300">Inteligência Artificial</span>
                    </div>
                    <Input
                        label="Chave API do Gemini"
                        placeholder="AIza..."
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        type="password"
                        icon={<Key size={18} className="text-neutral-500" />}
                    />
                    <p className="text-xs text-neutral-600">
                        Obtenha sua chave em{' '}
                        <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-orange-500/70 hover:text-orange-500">
                            aistudio.google.com
                        </a>
                    </p>
                </div>

                {/* Perfis de Empresa */}
                <div className="pt-6 border-t border-neutral-800 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Buildings size={16} className="text-orange-500" />
                        <span className="text-sm font-semibold text-neutral-300">Perfis da Nossa Empresa (Assinatura PDF)</span>
                    </div>
                    {companyProfiles.map((profile, idx) => (
                        <div key={profile.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 relative group">
                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyProfiles(prev => prev.filter(p => p.id !== profile.id))
                                }}
                                className="absolute top-2 right-2 p-1.5 text-neutral-500 hover:text-red-500 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

                <div className="pt-4 flex justify-end gap-3 border-t border-neutral-800">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="gap-2 bg-orange-600 hover:bg-orange-700 text-white border-none"
                    >
                        <FloppyDisk size={18} />
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}

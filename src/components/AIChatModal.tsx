import { useState, useRef, useEffect } from 'react'
import { PaperPlaneRight, ArrowLeft, Check, PencilSimple, Warning } from '@phosphor-icons/react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { ProposalPreview } from './ProposalPreview'
import { generateProposalFromText } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import type { ProposalData, ChatMessage } from '../types/proposal'

const SETTINGS_ID = '550e8400-e29b-41d4-a716-446655440000'

interface AIChatModalProps {
    isOpen: boolean
    onClose: () => void
    onApprove: (data: ProposalData) => Promise<void>
    onEdit: (data: ProposalData) => void
}

export function AIChatModal({ isOpen, onClose, onApprove, onEdit }: AIChatModalProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [apiKey, setApiKey] = useState<string | null>(null)
    const [keyLoading, setKeyLoading] = useState(true)
    const [proposal, setProposal] = useState<ProposalData | null>(null)
    const [phase, setPhase] = useState<'chat' | 'preview'>('chat')
    const [approving, setApproving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isOpen) {
            setMessages([])
            setInput('')
            setProposal(null)
            setPhase('chat')
            setError(null)
            setApproving(false)
            fetchApiKey()
        }
    }, [isOpen])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    async function fetchApiKey() {
        setKeyLoading(true)
        const { data } = await supabase
            .from('settings')
            .select('gemini_api_key')
            .eq('id', SETTINGS_ID)
            .single()
        setApiKey(data?.gemini_api_key || null)
        setKeyLoading(false)
    }

    async function handleSend() {
        const text = input.trim()
        if (!text || loading || !apiKey) return

        const userMessage: ChatMessage = { role: 'user', content: text }
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        setLoading(true)
        setError(null)

        try {
            const result = await generateProposalFromText(apiKey, newMessages)
            setProposal(result)
            setMessages([...newMessages, { role: 'assistant', content: 'Proposta gerada! Confira a pré-visualização.' }])
            setPhase('preview')
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar proposta'
            let friendlyMsg = 'Erro ao processar. Tente novamente com mais detalhes.'
            if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
                friendlyMsg = 'Chave API inválida. Verifique nas Configurações.'
            } else if (errorMsg.includes('429')) {
                friendlyMsg = 'Muitas requisições. Aguarde alguns segundos e tente novamente.'
            } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
                friendlyMsg = 'Erro de conexão. Verifique sua internet.'
            }
            setMessages([...newMessages, { role: 'assistant', content: friendlyMsg }])
            setError(friendlyMsg)
        } finally {
            setLoading(false)
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    async function handleApprove() {
        if (!proposal) return
        setApproving(true)
        try {
            await onApprove(proposal)
        } finally {
            setApproving(false)
        }
    }

    function handleBackToChat() {
        setPhase('chat')
        setError(null)
    }

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Proposta com IA" maxWidth="md:max-w-[75%]">
            {keyLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-orange-500 animate-spin" />
                </div>
            ) : !apiKey ? (
                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Warning size={24} className="text-yellow-500" />
                    </div>
                    <p className="text-neutral-300 text-center text-sm">
                        Chave API do Gemini não configurada.
                    </p>
                    <p className="text-neutral-500 text-center text-xs">
                        Vá em Configurações e adicione sua chave API do Gemini para usar o assistente de IA.
                    </p>
                </div>
            ) : phase === 'chat' ? (
                <div className="flex flex-col h-[60vh]">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                        {/* Welcome message */}
                        {messages.length === 0 && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-800/60 border border-neutral-700 rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                                    <p className="text-sm text-neutral-300">
                                        Olá! Cole as informações do cliente e da proposta que eu vou gerar tudo formatado para você.
                                    </p>
                                    <p className="text-xs text-neutral-500 mt-2">
                                        Inclua: nome do cliente, tipo de projeto, serviços, valores e prazos.
                                    </p>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`px-4 py-3 max-w-[80%] text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-orange-600/20 border border-orange-500/30 rounded-2xl rounded-br-md text-neutral-200'
                                        : error && i === messages.length - 1
                                            ? 'bg-red-900/20 border border-red-500/30 rounded-2xl rounded-bl-md text-red-300'
                                            : 'bg-neutral-800/60 border border-neutral-700 rounded-2xl rounded-bl-md text-neutral-300'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-800/60 border border-neutral-700 rounded-2xl rounded-bl-md px-4 py-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="flex gap-2 items-end border-t border-neutral-800 pt-3">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Cole as informações da proposta aqui..."
                            rows={2}
                            className="flex-1 bg-neutral-800/40 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
                        />
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="shrink-0 h-[46px]"
                        >
                            <PaperPlaneRight size={18} weight="bold" />
                        </Button>
                    </div>
                </div>
            ) : (
                /* Preview Phase */
                <div className="flex flex-col h-[60vh]">
                    <div className="flex-1 overflow-y-auto pr-1">
                        <div className="mb-3">
                            <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold mb-1">Pré-visualização</p>
                            <p className="text-sm text-neutral-400">Confira se os dados estão corretos antes de criar a proposta.</p>
                        </div>
                        {proposal && <ProposalPreview proposal={proposal} />}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-neutral-800">
                        <Button
                            variant="ghost"
                            onClick={handleBackToChat}
                            className="sm:mr-auto"
                        >
                            <ArrowLeft size={16} />
                            Voltar ao Chat
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => proposal && onEdit(proposal)}
                        >
                            <PencilSimple size={16} />
                            Editar nos Campos
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleApprove}
                            disabled={approving}
                        >
                            <Check size={16} weight="bold" />
                            {approving ? 'Criando...' : 'Aprovar e Criar'}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}

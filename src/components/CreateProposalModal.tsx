import { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from './ui/Modal'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { SearchableSelect } from './ui/SearchableSelect'
import { DeliveryTimeInput } from './ui/DeliveryTimeInput'
import { supabase } from '../lib/supabase'
import { Plus, Trash, CaretUp, CaretDown, DotsSixVertical } from '@phosphor-icons/react'

const projectOptions = [
    'Site',
    'Loja Online (E-commerce)',
    'Landing Page',
    'Página de Lançamento'
]

const proposalSchema = z.object({
    client_name: z.string().min(1, 'Obrigatório'),
    project_title: z.string().min(1, 'Obrigatório'),
    delivery_time: z.number().min(1, 'Mínimo 1 dia'),
    valid_until: z.string().min(1, 'Obrigatório'),
    items: z.array(
        z.object({
            title: z.string().min(1, 'Obrigatório'),
            description: z.string().min(1, 'Obrigatório'),
            type: z.enum(['Único', 'Mensal']),
            price: z.number().min(0, 'Obrigatório'),
        })
    ).min(1, 'Adicione pelo menos um serviço'),
})

type ProposalFormData = z.infer<typeof proposalSchema>

interface CreateProposalModalProps {
    isOpen: boolean
    initialData?: {
        id: string
        client_name: string
        project_title: string
        delivery_time?: string
        valid_until?: string
        items?: any[]
    }
    onClose: () => void
    onSuccess: () => void
}

export function CreateProposalModal({ isOpen, initialData, onClose, onSuccess }: CreateProposalModalProps) {
    const getTomorrowDate = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    const parseDeliveryTime = (time: string | undefined): number => {
        if (!time) return 3
        const match = time.match(/(\d+)/)
        return match ? parseInt(match[1]) : 3
    }

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProposalFormData>({
        resolver: zodResolver(proposalSchema),
        defaultValues: {
            delivery_time: 3,
            valid_until: getTomorrowDate(),
            items: [{ title: '', description: '', type: 'Único', price: 0 }]
        }
    })

    useEffect(() => {
        if (initialData) {
            console.log('Loading initialData for edit:', initialData)
            reset({
                client_name: initialData.client_name,
                project_title: initialData.project_title,
                delivery_time: parseDeliveryTime(initialData.delivery_time),
                valid_until: initialData.valid_until || getTomorrowDate(),
                items: initialData.items?.map(item => ({
                    title: item.title || '',
                    description: item.description || '',
                    type: item.type === 'Mensal' ? 'Mensal' : 'Único',
                    price: Number(item.price) || 0
                })) || [{ title: '', description: '', type: 'Único', price: 0 }]
            })
        } else {
            reset({
                client_name: '',
                project_title: '',
                delivery_time: 3,
                valid_until: getTomorrowDate(),
                items: [{ title: '', description: '', type: 'Único', price: 0 }]
            })
        }
    }, [initialData, reset, isOpen])

    const { fields, append, remove, move, update } = useFieldArray({
        control,
        name: "items"
    })

    async function onSubmit(data: ProposalFormData) {
        console.log('Submitting proposal data:', data)
        try {
            const totalValue = data.items.reduce((acc, item) => acc + item.price, 0)
            const payload = {
                client_name: data.client_name,
                project_title: data.project_title,
                delivery_time: `${data.delivery_time} dias úteis`,
                valid_until: data.valid_until,
                items: data.items,
                value: totalValue,
                status: 'pending',
            }

            console.log('Payload for Supabase:', payload)

            const { data: result, error } = initialData
                ? await supabase.from('proposals').update(payload).eq('id', initialData.id).select()
                : await supabase.from('proposals').insert([payload]).select()

            if (error) {
                console.error('Supabase submit error:', error)
                throw error
            }

            console.log('Supabase result:', result)

            reset()
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error('Detailed submission error:', error)
            alert(`Erro ao salvar proposta: ${error.message || 'Erro desconhecido'}. Verifique o console.`)
        }
    }

    const handleRemoveService = (index: number) => {
        if (fields.length > 1) {
            remove(index)
        } else {
            // Se for o último, apenas reseta os campos
            update(0, { title: '', description: '', type: 'Único', price: 0 })
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Proposta" : "Nova Proposta"}
            maxWidth="md:max-w-[75%]"
        >
            <form
                onSubmit={handleSubmit(onSubmit, (errors) => {
                    console.log('Form validation errors (Detailed):', JSON.stringify(errors, null, 2))
                })}
                className="space-y-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Nome do Cliente / Identificação"
                        placeholder="Ex: Impacto - Vistoria Cautelar"
                        {...register('client_name')}
                        error={errors.client_name?.message}
                    />

                    <Controller
                        control={control}
                        name="project_title"
                        render={({ field }) => (
                            <SearchableSelect
                                label="Título Interno do Projeto"
                                placeholder="Selecione ou digite o título..."
                                options={projectOptions}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.project_title?.message}
                            />
                        )}
                    />

                    <Controller
                        control={control}
                        name="delivery_time"
                        render={({ field }) => (
                            <DeliveryTimeInput
                                label="Prazo de Entrega"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.delivery_time?.message}
                            />
                        )}
                    />

                    <Input
                        label="Validade da Proposta"
                        type="date"
                        {...register('valid_until')}
                        error={errors.valid_until?.message}
                    />
                </div>

                <div className="border-t border-neutral-800 pt-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-neutral-100 border-l-4 border-orange-500 pl-3">Serviços da Proposta</h3>
                    </div>

                    <div className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="group flex items-start gap-4">
                                {/* Reorder Controls */}
                                <div className="flex flex-col gap-1 pt-10">
                                    <button
                                        type="button"
                                        onClick={() => index > 0 && move(index, index - 1)}
                                        className={`p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors ${index === 0 ? 'invisible' : ''}`}
                                        title="Mover para cima"
                                    >
                                        <CaretUp size={18} weight="bold" />
                                    </button>
                                    <div className="p-1 text-gray-300">
                                        <DotsSixVertical size={20} weight="bold" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => index < fields.length - 1 && move(index, index + 1)}
                                        className={`p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors ${index === fields.length - 1 ? 'invisible' : ''}`}
                                        title="Mover para baixo"
                                    >
                                        <CaretDown size={18} weight="bold" />
                                    </button>
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 p-5 bg-neutral-800/40 border border-neutral-800 rounded-xl relative">
                                    <div className="grid grid-cols-12 gap-4 mb-4">
                                        <div className="col-span-12 md:col-span-6">
                                            <Input
                                                label="Título do Serviço"
                                                {...register(`items.${index}.title`)}
                                                error={errors.items?.[index]?.title?.message}
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-3">
                                            <label className="block text-sm font-medium text-neutral-300 mb-1">
                                                Cobrança
                                            </label>
                                            <select
                                                className="flex h-10 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                                                {...register(`items.${index}.type`)}
                                            >
                                                <option value="Único">Único</option>
                                                <option value="Mensal">Mensal</option>
                                            </select>
                                        </div>
                                        <div className="col-span-12 md:col-span-3">
                                            <Input
                                                label="Preço (R$)"
                                                type="number"
                                                step="0.01"
                                                {...register(`items.${index}.price`, { valueAsNumber: true })}
                                                error={errors.items?.[index]?.price?.message}
                                            />
                                        </div>
                                    </div>

                                    <Textarea
                                        label="Descrição / Escopo"
                                        rows={3}
                                        {...register(`items.${index}.description`)}
                                        error={errors.items?.[index]?.description?.message}
                                    />
                                </div>

                                {/* Delete Action - External */}
                                <div className="pt-10">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveService(index)}
                                        className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Remover serviço"
                                    >
                                        <Trash size={22} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ title: '', description: '', type: 'Único', price: 0 })}
                            className="w-full gap-2 border-dashed py-8 border-2 text-neutral-500 hover:text-orange-400 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all rounded-xl"
                        >
                            <Plus size={20} weight="bold" /> Adicionar Novo Serviço à Proposta
                        </Button>

                        {errors.items?.root && (
                            <p className="text-sm text-red-400 font-medium text-center bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                {errors.items.root.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-neutral-800 mt-8">
                    <Button type="button" variant="ghost" onClick={onClose} className="px-6">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="px-8 bg-orange-600 hover:bg-orange-700">
                        {isSubmitting ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Proposta Completa'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

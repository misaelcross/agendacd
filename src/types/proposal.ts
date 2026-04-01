export interface ProposalItem {
    title: string
    description: string
    type: 'Único' | 'Mensal'
    price: number
}

export interface ProposalData {
    client_name: string
    project_title: string
    delivery_time: string
    valid_until: string
    items: ProposalItem[]
}

export interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

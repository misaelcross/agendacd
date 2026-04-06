import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ProposalData, ChatMessage } from '../types/proposal'

function getSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0]
    return `Você é um assistente especializado em criar comerciais para uma agência de desenvolvimento web chamada Conversão Digital.

Sua tarefa principal é interagir com o usuário para extrair as informações necessárias e gerar uma proposta.

Regras de Análise:
1. Ao identificar serviços, fique atento se há mais de um. Por exemplo: "landing page" é um serviço, "blog" é outro serviço, "e-commerce" é outro serviço.
2. Tente identificar se esses são itens separados ou apenas um serviço.
3. Se houver QUALQUER dúvida sobre como separar os itens ou detalhes dos serviços, RESPONDA EM TEXTO NORMAL perguntando ao usuário para esclarecer (ex: perguntar se são serviços separados e confirmar se são aqueles que você identificou).
4. Sinta-se livre para fazer perguntas (em texto normal) caso faltem informações críticas.
5. APENAS quando tiver certeza das informações, gere a proposta final EXCLUSIVAMENTE como um JSON. O JSON não deve conter textos adicionais fora do objeto.

Estrutura EXCLUSIVA do JSON (quando for gerar a proposta):
{
  "client_name": "Nome do cliente ou empresa",
  "project_title": "Tipo do projeto",
  "delivery_time": "X dias úteis",
  "valid_until": "YYYY-MM-DD",
  "items": [
    {
      "title": "Título do serviço",
      "description": "Descrição detalhada. Use bullet points com '-' para listar funcionalidades.",
      "type": "Pontual ou Mensal",
      "price": 0,
      "quantity": 1
    }
  ]
}

REGRAS DO JSON:
1. O campo "type" deve ser exatamente "Pontual" ou "Mensal".
2. O campo "price" deve ser um NUMERO (não string).
3. O campo "quantity" deve ser um NUMERO inteiro, representando a quantidade deste item.
4. Data de hoje (para referência de validade): ${today}`
}

function parseGeminiResponse(text: string): ProposalData {
    let cleaned = text.trim()
    // Strip markdown fences
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const parsed = JSON.parse(cleaned)

    // Validate and apply defaults
    const today = new Date()
    const defaultValidUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

    return {
        client_name: parsed.client_name || 'Cliente',
        project_title: parsed.project_title || 'Projeto',
        delivery_time: parsed.delivery_time || '7 dias úteis',
        valid_until: parsed.valid_until || defaultValidUntil,
        items: Array.isArray(parsed.items) && parsed.items.length > 0
            ? parsed.items.map((item: Record<string, unknown>) => ({
                title: String(item.title || 'Serviço'),
                description: String(item.description || ''),
                type: item.type === 'Mensal' ? 'Mensal' as const : 'Pontual' as const,
                price: typeof item.price === 'number' ? item.price : 0,
                quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            }))
            : [{ title: 'Serviço', description: '', type: 'Pontual' as const, price: 0, quantity: 1 }],
    }
}

export type GeminiResponse = 
    | { type: 'proposal'; data: ProposalData }
    | { type: 'text'; content: string }

export async function generateProposalFromText(
    apiKey: string,
    messages: ChatMessage[]
): Promise<GeminiResponse> {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite-preview',
        systemInstruction: getSystemPrompt(),
    })

    const chat = model.startChat({
        history: messages.slice(0, -1).map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'model' as const,
            parts: [{ text: msg.content }],
        })),
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    const responseText = result.response.text().trim()

    // Indício simples de que é JSON (começa com colchete ou tem sintaxe de markdown JSON)
    if (responseText.startsWith('{') || responseText.startsWith('```')) {
        try {
            return { type: 'proposal', data: parseGeminiResponse(responseText) }
        } catch {
            // Retry once asking for valid JSON
            const retry = await chat.sendMessage(
                'A resposta anterior não era JSON válido. Retorne APENAS o JSON da proposta, sem markdown ou texto adicional.'
            )
            return { type: 'proposal', data: parseGeminiResponse(retry.response.text()) }
        }
    }

    // Se não for JSON, assumimos que é uma pergunta/conversa natural
    return { type: 'text', content: responseText }
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ProposalData, ChatMessage } from '../types/proposal'

function getSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0]
    return `Você é um assistente especializado em criar propostas comerciais para uma agência de desenvolvimento web chamada Conversão Digital.

Sua tarefa é extrair informações de texto livre fornecido pelo usuário e retornar EXCLUSIVAMENTE um objeto JSON válido (sem markdown, sem explicação, sem texto adicional) com a seguinte estrutura:

{
  "client_name": "Nome do cliente ou empresa",
  "project_title": "Tipo do projeto (um dos seguintes: Site, Loja Online, Landing Page, Página de Lançamento, ou título personalizado)",
  "delivery_time": "X dias úteis",
  "valid_until": "YYYY-MM-DD",
  "items": [
    {
      "title": "Título do serviço",
      "description": "Descrição detalhada. Use bullet points com '-' para listar funcionalidades.",
      "type": "Único ou Mensal",
      "price": 0
    }
  ]
}

Regras:
1. SEMPRE retorne JSON válido. Nada mais.
2. Prazo de entrega padrão: "7 dias úteis" se não especificado.
3. Validade padrão: 7 dias a partir da data de hoje se não especificada.
4. O campo "type" deve ser exatamente "Único" ou "Mensal".
5. O campo "price" deve ser um número (não string). Use 0 se não especificado.
6. Separe serviços em itens distintos (ex: desenvolvimento vs. manutenção mensal).
7. Nas descrições, seja detalhado e profissional.
8. Se informações estiverem incompletas, use valores padrão razoáveis.
9. Se o usuário pedir alterações sobre uma proposta anterior, aplique as mudanças e retorne o JSON completo atualizado.
10. A data de hoje é: ${today}`
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
                type: item.type === 'Mensal' ? 'Mensal' as const : 'Único' as const,
                price: typeof item.price === 'number' ? item.price : 0,
            }))
            : [{ title: 'Serviço', description: '', type: 'Único' as const, price: 0 }],
    }
}

export async function generateProposalFromText(
    apiKey: string,
    messages: ChatMessage[]
): Promise<ProposalData> {
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
    const responseText = result.response.text()

    try {
        return parseGeminiResponse(responseText)
    } catch {
        // Retry once asking for valid JSON
        const retry = await chat.sendMessage(
            'A resposta anterior não era JSON válido. Retorne APENAS o JSON da proposta, sem markdown ou texto adicional.'
        )
        return parseGeminiResponse(retry.response.text())
    }
}

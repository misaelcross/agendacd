import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const INTERNAL_COPY_EMAIL = 'contato@conversao.digital'

serve(async (req) => {
  // 1. Resposta ao Preflight (CORS) do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { email, token, clientName, pdfUrl, contractId } = payload

    console.log(`Iniciando envio para: ${email}, nome: ${clientName}, modo: ${pdfUrl ? 'PDF Assinado' : 'Token'}`)

    // Pegando a chave do environment varibale no Supabase Dashboard
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não encontrada nas variáveis de ambiente.")
      throw new Error("RESEND_API_KEY is missing from environment variables")
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null

    let subject = 'Conversão Digital - Seu Token para Assinar Contrato';
    let htmlContent = `
      <div style="font-family: sans-serif; background-color: #f7f7f7; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #eaeaea;">
          <h1 style="color: #ff6000; font-size: 24px; margin-bottom: 20px;">Token de Segurança</h1>
          <p style="color: #444; font-size: 16px; margin-bottom: 10px;">Olá <strong>${clientName || ''}</strong>,</p>
          <p style="color: #444; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            As informações do seu contrato foram geradas com sucesso. Para prosseguir com a assinatura digital, por favor insira o código de validação em duas etapas abaixo:
          </p>
          
          <div style="margin: 0 auto 30px; padding: 20px; background-color: #fff4ed; border: 2px dashed #ff6000; border-radius: 12px; display: inline-block;">
            <h2 style="font-size: 38px; letter-spacing: 12px; color: #ff6000; margin: 0; padding-left: 12px;">${token}</h2>
          </div>
          
          <p style="color: #888; font-size: 13px; line-height: 1.5; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea;">
            Este token expira em 15 minutos.<br>
            A validação deste token atrela sua autoria e rastreabilidade jurídica ao documento final.
          </p>
        </div>
      </div>
    `;

    if (pdfUrl) {
      subject = 'Cópia Autêntica: Contrato Assinado - Conversão Digital';
      htmlContent = `
      <div style="font-family: sans-serif; background-color: #f7f7f7; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 16px; text-align: center; border: 1px solid #eaeaea;">
          <h1 style="color: #10b981; font-size: 24px; margin-bottom: 20px;">Contrato Assinado com Sucesso</h1>
          <p style="color: #444; font-size: 16px; margin-bottom: 10px;">Olá <strong>${clientName || ''}</strong>,</p>
          <p style="color: #444; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            Obrigado por assinar seu contrato digitalmente conosco. A assinatura possui validade jurídica mediante registro digital.
            Você pode visualizar e fazer download da sua via clicando no botão abaixo:
          </p>
          
          <a href="${pdfUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background-color: #10b981; color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 8px; margin-top: 10px; margin-bottom: 20px; font-size: 16px;">Visualizar / Baixar Contrato (PDF)</a>
          
          <p style="color: #888; font-size: 13px; line-height: 1.5; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eaeaea;">
            Guarde esta cópia para os seus registros.<br>Se precisar de qualquer coisa, estamos à disposição.
          </p>
        </div>
      </div>
      `;
    }

    const persistEmailLog = async (params: {
      status: 'accepted' | 'failed'
      resendEmailId?: string | null
      errorMessage?: string | null
      providerResponse?: unknown
    }) => {
      if (!supabaseAdmin) {
        console.warn('Supabase admin client indisponível para persistir log de email.')
        return
      }

      const { error: logError } = await supabaseAdmin.from('resend_email_logs').insert({
        contract_id: contractId || null,
        recipient_email: email,
        subject,
        template_type: pdfUrl ? 'signed_pdf' : 'token',
        provider: 'resend',
        resend_email_id: params.resendEmailId || null,
        status: params.status,
        error_message: params.errorMessage || null,
        provider_response: params.providerResponse || null,
      })

      if (logError) {
        console.error('Falha ao gravar log de email:', logError)
      }
    }

    // 2. Enviar email via Resend
    const resendPayload: Record<string, unknown> = {
      from: 'Conversão Digital <vendas@conversao.digital>',
      to: email,
      subject: subject,
      html: htmlContent,
    }

    // Para contratos assinados, enviamos uma cópia interna em BCC.
    if (pdfUrl && email !== INTERNAL_COPY_EMAIL) {
      resendPayload.bcc = INTERNAL_COPY_EMAIL
    }

    console.log("Enviando requisição para Resend API...")
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Resend API falhou:", data)
      await persistEmailLog({
        status: 'failed',
        errorMessage: typeof data === 'string' ? data : JSON.stringify(data),
        providerResponse: data
      })
      throw new Error(JSON.stringify(data))
    }

    console.log("Email enviado com sucesso:", data)
    await persistEmailLog({
      status: 'accepted',
      resendEmailId: data?.id || null,
      providerResponse: data
    })

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error("Erro na Edge Function:", error.message || error)
    return new Response(JSON.stringify({ error: error.message || error }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

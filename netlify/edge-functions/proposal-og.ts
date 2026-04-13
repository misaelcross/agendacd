import type { Context } from 'https://edge.netlify.com'

export default async function handler(req: Request, context: Context) {
    const url = new URL(req.url)

    // Extrai o short ID da URL /proposta/:id ou /proposta/:id/...
    const match = url.pathname.match(/^\/proposta\/([^/]+)/)
    if (!match) return context.next()

    const shortId = match[1]

    const supabaseUrl = Netlify.env.get('VITE_SUPABASE_URL')
    const supabaseKey = Netlify.env.get('VITE_SUPABASE_ANON_KEY')

    let clientName = 'Proposta Comercial'
    let projectTitle = 'Conversão Digital'
    let totalValue = ''

    try {
        if (supabaseUrl && supabaseKey) {
            // Tenta buscar pelo short ID via RPC
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_proposal_by_short_id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({ p_short_id: shortId }),
            })

            if (rpcRes.ok) {
                const data = await rpcRes.json()
                const proposal = Array.isArray(data) ? data[0] : data
                if (proposal) {
                    clientName = proposal.client_name || clientName
                    projectTitle = proposal.project_title || projectTitle

                    const items: any[] = proposal.items || []
                    const total = items.length > 0
                        ? items.reduce((acc: number, i: any) => acc + (i.price * (i.quantity || 1)), 0)
                        : proposal.value || 0

                    if (total > 0) {
                        totalValue = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }).format(total)
                    }
                }
            }
        }
    } catch (_) {
        // Silently fallback to defaults
    }

    const ogTitle = `${clientName} — ${projectTitle}`
    const ogDescription = totalValue
        ? `Proposta no valor de ${totalValue} · Clique para visualizar e contratar.`
        : 'Visualize sua proposta comercial personalizada e contrate com facilidade.'

    const ogImageUrl = 'https://contrato.conversao.digital/og-image.png'
    const ogUrl = req.url

    // Busca o index.html estático gerado pelo build
    const response = await context.next()
    const html = await response.text()

    const injected = html.replace(
        '</head>',
        `
  <!-- OG dinâmico da proposta -->
  <title>${ogTitle}</title>
  <meta name="description" content="${ogDescription}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Conversão Digital" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
</head>`,
    )

    return new Response(injected, {
        headers: {
            ...Object.fromEntries(response.headers),
            'content-type': 'text/html; charset=utf-8',
        },
        status: response.status,
    })
}

export const config = { path: '/proposta/*' }

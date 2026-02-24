// @ts-ignore
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Registrando fontes seguras do próprio Google Fonts para garantir que o PDF seja gerado consistentemente
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 500 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf', fontWeight: 700 }
    ]
})

const styles = StyleSheet.create({
    page: {
        padding: 60,
        fontFamily: 'Inter',
        fontSize: 10,
        fontWeight: 400,
        color: '#000000',
        backgroundColor: '#ffffff',
        lineHeight: 1.6,
    },
    header: {
        marginBottom: 40,
        borderBottom: '1px solid #eaeaea',
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: '#000000',
        marginBottom: 12,
        lineHeight: 1.3,
    },
    subtitle: {
        fontSize: 12,
        color: '#666666',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 700,
        color: '#000000',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    col: {
        flex: 1,
    },
    label: {
        fontWeight: 600,
        color: '#444444',
        marginRight: 4,
    },
    value: {
        color: '#1a1a1a',
    },
    clauseTitle: {
        fontSize: 12,
        fontWeight: 700,
        marginTop: 16,
        marginBottom: 8,
    },
    text: {
        marginBottom: 8,
        textAlign: 'justify',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 60,
        right: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1px solid #eaeaea',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#888888',
    },
    signaturesContainer: {
        marginTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 40,
    },
    signatureBox: {
        flex: 1,
        paddingTop: 16,
    },
    electronicSignature: {
        fontSize: 9,
        color: '#059669',
        textAlign: 'center',
        lineHeight: 1.5,
    },
    electronicSignatureBold: {
        fontSize: 9,
        color: '#000000',
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.5,
        marginTop: 4,
    }
})

interface ContractPDFProps {
    contract: any
    proposal: any
}

export function ContractPDF({ contract, proposal }: ContractPDFProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* CABEÇALHO */}
                <View style={styles.header}>
                    <View style={{ flex: 1, paddingRight: 20 }}>
                        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</Text>
                        <Text style={styles.subtitle}>CONVERSÃO DIGITAL SOLUÇÕES EM DESIGN LTDA</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 120 }}>
                        <Text style={{ fontSize: 10 }}>Documento nº: {contract.id.split('-')[0].toUpperCase()}</Text>
                    </View>
                </View>

                {/* PARTES CONTRATADAS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. IDENTIFICAÇÃO DAS PARTES</Text>

                    <Text style={[styles.text, { fontWeight: 700, marginBottom: 4 }]}>CONTRATADA:</Text>
                    <Text style={styles.text}>
                        CONVERSÃO DIGITAL SOLUÇÕES EM DESIGN LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 51.523.000/0001-90, com sede na Rua Exemplo, 123, Bairro, Cidade - SP.
                    </Text>

                    <Text style={[styles.text, { fontWeight: 700, marginBottom: 4, marginTop: 12 }]}>CONTRATANTE:</Text>
                    <Text style={styles.text}>
                        <Text style={styles.label}>{contract.contractor_name}</Text>, inscrito(a) no {contract.contractor_type === 'pf' ? 'CPF' : 'CNPJ'} sob o nº <Text style={styles.label}>{contract.contractor_document}</Text>,
                        com sede/residência na {contract.contractor_address}, nº {contract.contractor_number}, bairro {contract.contractor_neighborhood}, CEP: {contract.contractor_cep}, {contract.contractor_city} - {contract.contractor_state}.
                        {contract.contractor_type === 'pj' && contract.responsible_name ? ` Neste ato representado(a) por ${contract.responsible_name}, CPF ${contract.responsible_cpf}.` : ''}
                    </Text>
                </View>

                {/* OBJETO DO CONTRATO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. DO OBJETO DO CONTRATO</Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 1ª.</Text> O presente contrato tem como OBJETO a prestação de serviços, pela CONTRATADA ao CONTRATANTE, consistindo nas atividades listadas abaixo:
                    </Text>
                    <Text style={[styles.text, { paddingLeft: 12, borderLeft: '2px solid #eaeaea', color: '#444' }]}>
                        {contract.project_description || 'Serviços de desenvolvimento web gerais.'}
                    </Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 2ª.</Text> O contrato de prestação de serviço iniciará a partir da entrega dos materiais solicitados à CONTRATADA, por parte do CONTRATANTE, ou do pagamento do sinal, o que ocorrer por último, e terá o prazo de {contract.project_deadline_days || 15} dias úteis.
                    </Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 3ª.</Text> Trabalhos adicionais serão objeto de nova proposta comercial. O cumprimento dos prazos dá-se sobre o projeto inicial, e qualquer mudança de quantidade, variações e afins podem alterar os valores e prazos, devendo ser renegociados.
                    </Text>
                </View>

                {/* DAS OBRIGAÇÕES DO CONTRATANTE */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. DAS OBRIGAÇÕES DO CONTRATANTE</Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 4ª.</Text> Entregar os materiais e documentos que forem requeridos pela CONTRATADA, conforme o prazo estabelecido nesse contrato, sob pena de atraso na conclusão do projeto, inexistindo qualquer responsabilidade para a CONTRATADA.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 5ª.</Text> Eleger um representante para prestar esclarecimento e discutir dúvidas com a parte CONTRATADA.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 6ª.</Text> Descrever com o maior número de características e funcionalidades possíveis ao projeto.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 7ª.</Text> Efetuar os pagamentos na data acordada, sob pena de acréscimo de juros e multa.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 8ª.</Text> Se for necessária a prestação de qualquer serviço externo ou que necessite de custos adicionais, inclusive ferramentas específicas, o pagamento será feito pelo CONTRATANTE.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 9ª.</Text> Em caso de pagamento relacionado a cláusula anterior, o comprovante deverá ser anexo ao presente contrato e um termo aditivo que informe a motivação do pagamento.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 10ª.</Text> Desenvolver com a CONTRATADA um cronograma exclusivo para o projeto, onde constarão as datas de entrega, produção e qualquer situação que precise estar prevista, com exceção daquelas imprevisíveis.
                    </Text>
                </View>

                {/* DAS OBRIGAÇÕES DA CONTRATADA */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. DAS OBRIGAÇÕES DA CONTRATADA</Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 11ª.</Text> Entregar o projeto no prazo estabelecido, sempre respeitando o escopo e as especificidades que o CONTRATANTE informou previamente para a consecução perfeita do serviço.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 12ª.</Text> Entrar em contato com o CONTRATANTE sempre que precisar esclarecer alguma dúvida ou precisar de uma informação.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 13ª.</Text> Informar sobre qualquer atraso na prestação de serviços, bem como a motivação dele.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 14ª.</Text> Prestar o serviço com qualidade.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 15ª.</Text> Eleger um representante para sempre estar em contato e esclarecer qualquer dúvida ou repassar informações para a parte CONTRATANTE.
                    </Text>
                </View>

                {/* DO PAGAMENTO */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. DO PAGAMENTO</Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 16ª.</Text> Pela prestação dos serviços contratados, o CONTRATANTE pagará à CONTRATADA a quantia total de <Text style={{ fontWeight: 700 }}>{formatCurrency(contract.project_value)}</Text>, paga na forma selecionada no ato do acerto comercial via plataforma.{'\n'}{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 17ª.</Text> Se ocorrer o atraso no pagamento ou em qualquer uma das parcelas será acrescido de juros 1% a.m. e multa de 10% sobre o valor total deste objeto, e mora no valor de 2%.
                    </Text>
                </View>

                {/* DA RESCISÃO CONTRATUAL */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. CONDIÇÕES GERAIS, RESCISÃO E FORO</Text>
                    <Text style={styles.text}>
                        <Text style={{ fontWeight: 700 }}>Cláusula 18ª.</Text> O presente instrumento não poderá ser rescindido sem justa causa, sob pena de multa no valor do contrato. PARÁGRAFO ÚNICO: Na hipótese de desistência pelo CONTRATANTE, antes do início da prestação de serviço, fica estipulada a multa de 50% sobre o valor total.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 19ª.</Text> Este contrato será rescindido caso haja o descumprimento de qualquer das cláusulas pelas partes.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 20ª.</Text> Pelo presente contrato, a CONTRATADA cede em favor do CONTRATANTE, com exclusividade, a totalidade dos direitos autorais de todo o trabalho desenvolvido em razão do presente contrato, podendo editar e alterar.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 21ª.</Text> A CONTRATADA não atuará com exclusividade dentro do segmento do CONTRATANTE.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 22ª.</Text> Os contratantes declaram expressamente manter sigilo de todos os dados e informações obtidos por força deste contrato.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 23ª.</Text> Fica pactuada a total inexistência de vínculo trabalhista entre as partes.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 24ª.</Text> Ambas as partes aceitam que este contrato é assinado via validação eletrônica de Token, possuindo integridade legal sob a MP 2.200-2 e Lei 14.063/2020.{'\n'}
                        <Text style={{ fontWeight: 700 }}>Cláusula 25ª.</Text> Fica eleito o foro do domicílio do CONTRATANTE para dirimir quaisquer litígios.
                    </Text>
                </View>

                {/* ASSINATURAS (ELETRÔNICA) */}
                <View style={styles.signaturesContainer}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.electronicSignature}>
                            ASSINATURA ELETRÔNICA VALIDADA VIA TOKEN{'\n'}
                            Data: {formatDate(proposal?.created_at || contract.created_at)}
                        </Text>
                        <Text style={styles.electronicSignatureBold}>
                            CONVERSÃO DIGITAL SOLUÇÕES EM DESIGN LTDA{'\n'}
                            CNPJ: 51.523.000/0001-90
                        </Text>
                    </View>

                    <View style={styles.signatureBox}>
                        <Text style={styles.electronicSignature}>
                            ASSINATURA ELETRÔNICA VALIDADA VIA TOKEN{'\n'}
                            Data: {formatDate(contract.signed_at)}
                        </Text>
                        <Text style={styles.electronicSignatureBold}>
                            {contract.contractor_name}{'\n'}
                            Documento: {contract.contractor_document}
                        </Text>
                    </View>
                </View>

                {/* FOOTER FIXO */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Gerado por Conversão Digital - Sistema de Contratos</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }: any) => (
                        `Página ${pageNumber} de ${totalPages}`
                    )} />
                </View>
            </Page>
        </Document>
    )
}

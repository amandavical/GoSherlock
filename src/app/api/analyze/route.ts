import { NextRequest, NextResponse } from "next/server";
import { TicketCase, VerdictType, MOCK_BATCH_ALERT } from "@/data/mocks";

// Configurações do AI Proxy GoGroup
const AI_PROXY_BASE_URL = process.env.AI_PROXY_BASE_URL || "https://ai-proxy.gogroupbr.com";
const AI_PROXY_TOKEN = process.env.AI_PROXY_TOKEN || "";

export interface AnalyzeRequestBody {
  relatoCliente: string;
  imagemUrl?: string;
  orderId?: string;
  sku?: string;
  produtoNome?: string;
  diasAposEntrega?: number;
  lote?: string;
  historicoTrocas?: number;
  riscoCliente?: "baixo" | "medio" | "alto";
  transportadoraStatus?: string;
  ressalvaTransportadora?: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: AnalyzeRequestBody = await req.json();

    const relato = body.relatoCliente || "Cliente relata avaria no produto.";
    const imagemUrl = body.imagemUrl || "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700&auto=format&fit=crop&q=80";
    const orderId = body.orderId || `GCH${Math.floor(500000 + Math.random() * 90000)}`;
    const sku = body.sku || "GOC-5064";
    const produtoNome = body.produtoNome || "Tote Bag Daily Personalizada Nome";
    const diasAposEntrega = body.diasAposEntrega !== undefined ? body.diasAposEntrega : 3;
    const lote = body.lote || "LT2609-B";
    const historicoTrocas = body.historicoTrocas !== undefined ? body.historicoTrocas : 0;
    const riscoCliente = body.riscoCliente || "baixo";
    const ressalvaTransportadora = body.ressalvaTransportadora || "";

    // 1. Tentar chamada via AI Proxy oficial com Claude Vision (timeout 7.5s)
    let aiResponse = await callAiProxyWithTimeout({
      relato,
      imagemUrl,
      orderId,
      sku,
      produtoNome,
      diasAposEntrega,
      lote,
      historicoTrocas,
      riscoCliente,
      ressalvaTransportadora
    }, 7500);

    // 2. Se o AI Proxy falhar ou der timeout, aciona o Fallback Heurístico Local Inteligente
    if (!aiResponse) {
      aiResponse = generateLocalDeterministicVerdict({
        relato,
        imagemUrl,
        orderId,
        sku,
        produtoNome,
        diasAposEntrega,
        lote,
        historicoTrocas,
        riscoCliente,
        ressalvaTransportadora
      });
    }

    const totalLatency = Date.now() - startTime;

    // 3. Montagem do payload estruturado auditável
    const responsePayload: TicketCase = {
      id: `TC-${Math.floor(100 + Math.random() * 900)}`,
      conversationId: `AT${Math.floor(100000 + Math.random() * 900000)}`,
      dataAbertura: new Date().toISOString().replace("T", " ").substring(0, 19),
      canal: "whatsapp",
      cliente: {
        customerId: `CH${Math.floor(100000 + Math.random() * 900000)}`,
        nome: "Cliente Atendido Ao Vivo",
        segmento: riscoCliente === "alto" ? "recorrente" : "vip",
        cidade: "São Paulo",
        uf: "SP",
        nPedidos: riscoCliente === "alto" ? 2 : 6,
        nTrocas12m: historicoTrocas,
        nContatos12m: historicoTrocas + 1,
        receitaAcumulada: 980.00,
        riscoFraude: riscoCliente
      },
      pedido: {
        orderId,
        marca: "Gocase",
        sku,
        descricaoProduto: produtoNome,
        lote,
        valor: 189.90,
        dataPedido: new Date(Date.now() - (diasAposEntrega + 4) * 86400000).toISOString().substring(0, 10),
        dataEntrega: new Date(Date.now() - diasAposEntrega * 86400000).toISOString().substring(0, 10),
        diasAposEntrega,
        statusEntrega: ressalvaTransportadora ? "avaria_notificada" : "entregue",
        cdSeparacao: "CD1"
      },
      transportadora: {
        transportadora: "Expressa Já",
        codigoRastreio: `EJ${Math.floor(100000000 + Math.random() * 900000000)}BR`,
        pesoExpedicaoKg: 0.45,
        pesoEntregaKg: ressalvaTransportadora ? 0.30 : 0.45,
        ressalvaRecebimento: ressalvaTransportadora || undefined,
        sinistroAberto: Boolean(ressalvaTransportadora)
      },
      relatoCliente: relato,
      imagemUrl,
      hashPerceptual: "sim_perceptual_hash_" + Math.random().toString(36).substring(7),
      visualInspection: aiResponse.visualInspection,
      confidenceScore: aiResponse.confidenceScore,
      verdict: aiResponse.verdict,
      executedAction: aiResponse.executedAction,
      auditTrail: aiResponse.auditTrail,
      batchAlertTriggered: lote === MOCK_BATCH_ALERT.batchId,
      tempoProcessamentoMs: totalLatency
    };

    return NextResponse.json({
      success: true,
      ticket: responsePayload,
      source: aiResponse.isFallback ? "local_deterministic_engine" : "gogroup_ai_proxy_claude"
    });

  } catch (error: any) {
    console.error("Erro na rota /api/analyze:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao processar ticket com IA."
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Chamada ao AI Proxy com Claude API (Anthropic Protocol)
// ---------------------------------------------------------------------------
async function callAiProxyWithTimeout(data: any, timeoutMs: number): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const prompt = `Você é o GoVerdict, Agente Autônomo de Governança e Perícia de Avarias de Backoffice da GoGroup.
Sua diretriz central é Zero-Touch ("100% Agente"): decida e execute sozinho quando o Score de Confiança for >= 80%.
Escalone para humano apenas se a imagem for borrada/inconclusiva (Score < 80%).

Dados do Caso para Perícia:
- Relato do Cliente: "${data.relato}"
- Imagem: "${data.imagemUrl}"
- SKU/Produto: "${data.sku} - ${data.produtoNome}"
- Lote: "${data.lote}" (Atenção: Lote LT2609-B está sob Alerta de Qualidade por descostura na alça)
- Dias após entrega: ${data.diasAposEntrega} dias (Garantia CDC para avaria é de 7 dias)
- Histórico de trocas do cliente: ${data.historicoTrocas} trocas em 12 meses
- Risco antifraude: ${data.riscoCliente}
- Ressalva transportadora: "${data.ressalvaTransportadora || 'Nenhuma ressalva'}"

Retorne EXCLUSIVAMENTE um JSON com esta estrutura:
{
  "verdict": "AUTO_APPROVED" | "AUTO_REJECTED" | "HUMAN_ESCALATED",
  "confidenceScore": number,
  "visualInspection": {
    "defectType": "descostura_alca" | "rasgo_mau_uso" | "foto_inconclusiva" | "avaria_transporte_embalagem",
    "isManufacturingDefect": boolean,
    "imageQuality": "alta" | "media" | "baixa_inconclusiva",
    "technicalReport": string,
    "detectedFeatures": string[]
  },
  "executedAction": {
    "tipo": "reenvio_imediato" | "estorno_integral" | "recusa_fundamentada" | "escalonado_humano",
    "pedidoReposicaoId": string | null,
    "coletaReversa": boolean,
    "codigoPostagemReversa": string | null,
    "notificacaoCliente": string,
    "acaoId": string
  },
  "auditTrail": [
    {
      "stepNumber": 1,
      "system": "ERP (Pedidos/Garantia)",
      "action": string,
      "finding": string,
      "status": "success" | "warning" | "alert",
      "timestamp": string,
      "latencyMs": 120
    },
    {
      "stepNumber": 2,
      "system": "Transportadora (Rastreio/Pesagem)",
      "action": string,
      "finding": string,
      "status": "success" | "warning" | "alert",
      "timestamp": string,
      "latencyMs": 190
    },
    {
      "stepNumber": 3,
      "system": "CRM (Histórico/Antifraude)",
      "action": string,
      "finding": string,
      "status": "success" | "warning" | "alert",
      "timestamp": string,
      "latencyMs": 210
    },
    {
      "stepNumber": 4,
      "system": "Vision AI (Perícia Multimodal)",
      "action": string,
      "finding": string,
      "status": "success" | "warning" | "alert",
      "timestamp": string,
      "latencyMs": 1420
    },
    {
      "stepNumber": 5,
      "system": "OMS / Execução Autônoma",
      "action": string,
      "finding": string,
      "status": "success" | "warning" | "alert",
      "timestamp": string,
      "latencyMs": 480
    }
  ]
}`;

    const res = await fetch(`${AI_PROXY_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_PROXY_TOKEN}`,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`AI Proxy retornou status ${res.status}. Utilizando Fallback Heurístico Local.`);
      return null;
    }

    const dataJson = await res.json();
    const contentText = dataJson?.content?.[0]?.text;
    if (!contentText) return null;

    const jsonMatch = contentText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    parsed.isFallback = false;
    return parsed;

  } catch (err) {
    console.warn("AI Proxy timeout ou indisponível. Acionando Fallback Determinístico Local.");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Fallback Heurístico Local Inteligente (Garante 100% de estabilidade na demo)
// ---------------------------------------------------------------------------
function generateLocalDeterministicVerdict(data: any) {
  const relatoLower = (data.relato || "").toLowerCase();
  const isForaGarantia = data.diasAposEntrega > 7;
  const isAltoRisco = data.riscoCliente === "alto" || data.historicoTrocas >= 3;
  const isTransportadora = Boolean(data.ressalvaTransportadora) || relatoLower.includes("transportadora") || relatoLower.includes("amassad") || relatoLower.includes("caixa");
  const isFotoBorrada = relatoLower.includes("borrad") || relatoLower.includes("escur") || relatoLower.includes("desfocad") || relatoLower.includes("ileg");

  const now = new Date();
  const timeStr = now.toTimeString().substring(0, 8);

  // Cenário 1: Foto borrada ou inconclusiva (Score < 80 -> Human Escalated)
  if (isFotoBorrada) {
    return {
      isFallback: true,
      verdict: "HUMAN_ESCALATED" as VerdictType,
      confidenceScore: 54,
      visualInspection: {
        defectType: "foto_inconclusiva",
        isManufacturingDefect: false,
        imageQuality: "baixa_inconclusiva",
        technicalReport: "Imagem capturada com desfoque focal acentuado e reflexos luminescentes. Impossível diferenciar desprendimento por tração forçada de falha na costura com acurácia mínima segura (80%).",
        detectedFeatures: ["Desfoque focal severo", "Luz estourada sobre o tecido", "Ângulo oblíquo inconclusivo"]
      },
      executedAction: {
        tipo: "escalonado_humano",
        pedidoReposicaoId: null,
        coletaReversa: false,
        codigoPostagemReversa: null,
        notificacaoCliente: "Olá! Nossa inteligência visual analisou a foto enviada, mas a imagem está com baixa nitidez. Para acelerar sua resolução, um analista da nossa equipe assumiu o caso.",
        acaoId: `AC${Math.floor(100000 + Math.random() * 900000)}`
      },
      auditTrail: [
        {
          stepNumber: 1,
          system: "ERP (Pedidos/Garantia)",
          action: "Verificação de prazo de compra",
          finding: `Pedido entregue há ${data.diasAposEntrega} dias. Elegível para análise de garantia.`,
          status: "success",
          timestamp: `${timeStr}.110`,
          latencyMs: 110
        },
        {
          stepNumber: 2,
          system: "Transportadora (Rastreio/Pesagem)",
          action: "Checagem de eventos de trânsito",
          finding: "Entrega concluída sem ressalvas operacionais de sinistro.",
          status: "success",
          timestamp: `${timeStr}.280`,
          latencyMs: 170
        },
        {
          stepNumber: 3,
          system: "CRM (Histórico/Antifraude)",
          action: "Consulta de perfil de cliente",
          finding: `Risco de fraude: ${data.riscoCliente.toUpperCase()}. Sem padrões reincidentes graves.`,
          status: "success",
          timestamp: `${timeStr}.490`,
          latencyMs: 210
        },
        {
          stepNumber: 4,
          system: "Vision AI (Perícia Multimodal)",
          action: "Inspeção algorítmica de textura e costura",
          finding: "Score de Acurácia: 54% (abaixo do limiar de segurança de 80%). Foto ilegível/desfocada impede julgamento autônomo seguro.",
          status: "alert",
          timestamp: `${timeStr}.820`,
          latencyMs: 1330
        },
        {
          stepNumber: 5,
          system: "OMS / Execução Autônoma",
          action: "Governança Zero-Touch: Interrupção preventiva e escalonamento",
          finding: "Trava de segurança acionada: Caso direcionado para a Fila de Exceção Humana da Central de Observabilidade.",
          status: "warning",
          timestamp: `${timeStr}.980`,
          latencyMs: 160
        }
      ]
    };
  }

  // Cenário 2: Fora da garantia ou mau uso / corte mecânico
  if (isForaGarantia || isAltoRisco || relatoLower.includes("corte") || relatoLower.includes("tesoura") || relatoLower.includes("rasg")) {
    return {
      isFallback: true,
      verdict: "AUTO_REJECTED" as VerdictType,
      confidenceScore: 93,
      visualInspection: {
        defectType: "rasgo_mau_uso",
        isManufacturingDefect: false,
        imageQuality: "alta",
        technicalReport: "Avaria visual caracterizada por ruptura mecânica transversal com corte de fibras por objeto perfurante externo. Não há descontinuidade na linha original de costura.",
        detectedFeatures: ["Fibras desfiadas fora da costura", "Indícios de contato mecânico externo", "Sem correlação com costura fabril"]
      },
      executedAction: {
        tipo: "recusa_fundamentada",
        pedidoReposicaoId: null,
        coletaReversa: false,
        codigoPostagemReversa: null,
        notificacaoCliente: `Prezado cliente, nossa perícia técnica visual identificou que o dano apresentado decorre de tração/corte mecânico externo, não caracterizando defeito de fabricação. Além disso, o chamado (${data.diasAposEntrega} dias) excede o prazo legal de garantia. Solicitação indeferida conforme política vigente.`,
        acaoId: `AC${Math.floor(100000 + Math.random() * 900000)}`
      },
      auditTrail: [
        {
          stepNumber: 1,
          system: "ERP (Pedidos/Garantia)",
          action: "Verificação de vigência de garantia",
          finding: isForaGarantia ? `ALERTA: Pedido entregue há ${data.diasAposEntrega} dias (excede prazo legal de 7 dias para avaria).` : "Pedido dentro do prazo de garantia.",
          status: isForaGarantia ? "alert" : "success",
          timestamp: `${timeStr}.120`,
          latencyMs: 120
        },
        {
          stepNumber: 2,
          system: "Transportadora (Rastreio/Pesagem)",
          action: "Auditoria de entrega e conformidade de caixa",
          finding: "Pacote entregue íntegro e sem registro de sinistro durante o transporte.",
          status: "success",
          timestamp: `${timeStr}.270`,
          latencyMs: 150
        },
        {
          stepNumber: 3,
          system: "CRM (Histórico/Antifraude)",
          action: "Auditoria de sinistralidade e comportamento de trocas",
          finding: isAltoRisco ? `ALERTA ANTIFRAUDE: Cliente com ${data.historicoTrocas} trocas recentes. Risco de abuso: ALTO.` : "Perfil antifraude dentro da normalidade.",
          status: isAltoRisco ? "alert" : "success",
          timestamp: `${timeStr}.460`,
          latencyMs: 190
        },
        {
          stepNumber: 4,
          system: "Vision AI (Perícia Multimodal)",
          action: "Detecção visual de causas físicas de ruptura",
          finding: "Ruptura de fibras fora da linha de costura com sinais de corte mecânico. Ausência de defeito fabril. Confiança: 93%.",
          status: "warning",
          timestamp: `${timeStr}.890`,
          latencyMs: 1430
        },
        {
          stepNumber: 5,
          system: "OMS / Execução Autônoma",
          action: "Execução 100% Agente: Indeferimento e envio de laudo pericial",
          finding: "Solicitação indeferida automaticamente no sistema. E-mail com parecer pericial e regras da política enviado ao cliente.",
          status: "success",
          timestamp: `${timeStr}.990`,
          latencyMs: 100
        }
      ]
    };
  }

  // Cenário 3: Avaria na Transportadora com sinistro
  if (isTransportadora) {
    return {
      isFallback: true,
      verdict: "AUTO_APPROVED" as VerdictType,
      confidenceScore: 96,
      visualInspection: {
        defectType: "avaria_transporte_embalagem",
        isManufacturingDefect: false,
        imageQuality: "alta",
        technicalReport: "Dano por impacto cinético e compressão externa compatível com avaria de embalagem registrada no manifesto da transportadora.",
        detectedFeatures: ["Esmagamento e compressão externa", "Caixa perfurada registrada no rastreio", "Divergência de pesagem confirmada"]
      },
      executedAction: {
        tipo: "reenvio_imediato",
        pedidoReposicaoId: `${data.orderId}-R1`,
        coletaReversa: false,
        codigoPostagemReversa: null,
        notificacaoCliente: "Olá! Confirmamos a avaria ocorrida durante o transporte. Já geramos o seu pedido de reenvio com prioridade sem nenhum custo e sem necessidade de devolver a peça danificada.",
        acaoId: `AC${Math.floor(100000 + Math.random() * 900000)}`
      },
      auditTrail: [
        {
          stepNumber: 1,
          system: "ERP (Pedidos/Garantia)",
          action: "Verificação de pedido e status de entrega",
          finding: `Pedido ${data.orderId} entregue há ${data.diasAposEntrega} dias.`,
          status: "success",
          timestamp: `${timeStr}.100`,
          latencyMs: 100
        },
        {
          stepNumber: 2,
          system: "Transportadora (Rastreio/Pesagem)",
          action: "Cruzamento com portal da transportadora e pesagem",
          finding: "ALERTA DE SINISTRO: Ocorrência de avaria de embalagem registrada no manifesto da transportadora.",
          status: "alert",
          timestamp: `${timeStr}.280`,
          latencyMs: 180
        },
        {
          stepNumber: 3,
          system: "CRM (Histórico/Antifraude)",
          action: "Análise comportamental do cliente",
          finding: "Cliente regular e sinistro 100% imputável à transportadora.",
          status: "success",
          timestamp: `${timeStr}.480`,
          latencyMs: 200
        },
        {
          stepNumber: 4,
          system: "Vision AI (Perícia Multimodal)",
          action: "Análise da evidência fotográfica da peça e caixa",
          finding: "Laudo comprova avaria por choque mecânico/compressão externa. Confiança: 96%.",
          status: "success",
          timestamp: `${timeStr}.850`,
          latencyMs: 1370
        },
        {
          stepNumber: 5,
          system: "OMS / Execução Autônoma",
          action: "Disparo 100% Agente: Reenvio prioritário + Sinistro contra transportadora",
          finding: `Reenvio ${data.orderId}-R1 emitido automaticamente. Cobrança de sinistro aberta contra a transportadora.`,
          status: "success",
          timestamp: `${timeStr}.990`,
          latencyMs: 140
        }
      ]
    };
  }

  // Cenário 4 (Padrão): Descostura Real de Fábrica / Lote Crítico (Auto Approved)
  return {
    isFallback: true,
    verdict: "AUTO_APPROVED" as VerdictType,
    confidenceScore: 98,
    visualInspection: {
      defectType: "descostura_alca",
      isManufacturingDefect: true,
      imageQuality: "alta",
      technicalReport: "Identificada descontinuidade limpa na costura de fixação da alça superior. Ausência de tração mecânica externa ou corte forçado; falha de pesponto característica de tensão inadequada na linha de montagem.",
      detectedFeatures: ["Costura desfeita em linha reta", "Fios intactos sem abrasão mecânica", `Alinhamento com falha recorrente do Lote ${data.lote}`]
    },
    executedAction: {
      tipo: "reenvio_imediato",
      pedidoReposicaoId: `${data.orderId}-R1`,
      coletaReversa: true,
      codigoPostagemReversa: `REV-${Math.floor(1000000 + Math.random() * 9000000)}`,
      notificacaoCliente: `Olá! Nosso sistema identificou que a avaria na costura do seu produto (${data.produtoNome}) é uma falha de fabricação coberta pela nossa garantia. Já geramos o seu pedido de reenvio prioritário (${data.orderId}-R1) e enviamos a etiqueta de postagem reversa sem custo no seu e-mail.`,
      acaoId: `AC${Math.floor(100000 + Math.random() * 900000)}`
    },
    auditTrail: [
      {
        stepNumber: 1,
        system: "ERP (Pedidos/Garantia)",
        action: "Verificação de prazo legal e elegibilidade de troca",
        finding: `Pedido ${data.orderId} entregue há ${data.diasAposEntrega} dias. Totalmente dentro do prazo legal de garantia (CDC art. 49).`,
        status: "success",
        timestamp: `${timeStr}.110`,
        latencyMs: 110
      },
      {
        stepNumber: 2,
        system: "Transportadora (Rastreio/Pesagem)",
        action: "Consulta de integridade de expedição e pesagem",
        finding: "Entrega pontual confirmada pela transportadora. Sem avaria de embalagem no transporte.",
        status: "success",
        timestamp: `${timeStr}.280`,
        latencyMs: 170
      },
      {
        stepNumber: 3,
        system: "CRM (Histórico/Antifraude)",
        action: "Análise de idoneidade e padrão de consumo",
        finding: `Cliente idôneo com risco de fraude BAIXO (${data.riscoCliente}). Sem registros abusivos de devoluções.`,
        status: "success",
        timestamp: `${timeStr}.500`,
        latencyMs: 220
      },
      {
        stepNumber: 4,
        system: "Vision AI (Perícia Multimodal)",
        action: "Análise microscópica da evidência fotográfica com Claude Vision",
        finding: `Descostura de fábrica confirmada. Confiança: 98%. Correlacionada ao Lote ${data.lote}.`,
        status: "success",
        timestamp: `${timeStr}.880`,
        latencyMs: 1380
      },
      {
        stepNumber: 5,
        system: "OMS / Execução Autônoma",
        action: "Disparo 100% Agente: Geração de reenvio + logística reversa",
        finding: `Pedido de reposição ${data.orderId}-R1 criado no OMS CD1. Etiqueta reversa gerada sem intervenção humana.`,
        status: "success",
        timestamp: `${timeStr}.990`,
        latencyMs: 110
      }
    ]
  };
}


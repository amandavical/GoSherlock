// src/data/mocks.ts
// GoVerdict — Central de Governança, Observabilidade e Execução Autônoma de Backoffice (GoGroup)
// Modelagem aderente ao dicionário de dados oficial GoGroup (pedidos, clientes, anexos, transportadoras, OMS e lotes)

export type VerdictType = "AUTO_APPROVED" | "AUTO_REJECTED" | "HUMAN_ESCALATED";
export type ChannelType = "whatsapp" | "email" | "reclame_aqui";
export type SeverityType = "low" | "medium" | "high" | "critical";

export interface VisualInspection {
  defectType: "descostura_alca" | "rasgo_mau_uso" | "foto_inconclusiva" | "avaria_transporte_embalagem";
  isManufacturingDefect: boolean;
  imageQuality: "alta" | "media" | "baixa_inconclusiva";
  technicalReport: string;
  detectedFeatures: string[];
}

export interface AuditStep {
  stepNumber: number;
  system: "ERP (Pedidos/Garantia)" | "Transportadora (Rastreio/Pesagem)" | "CRM (Histórico/Antifraude)" | "Vision AI (Perícia Multimodal)" | "OMS / Execução Autônoma";
  action: string;
  finding: string;
  status: "success" | "warning" | "alert";
  timestamp: string;
  latencyMs: number;
}

export interface CustomerData {
  customerId: string; // formato CH + 6 dígitos
  nome: string;
  segmento: "novo" | "recorrente" | "fiel" | "vip";
  cidade: string;
  uf: string;
  nPedidos: number;
  nTrocas12m: number;
  nContatos12m: number;
  receitaAcumulada: number;
  riscoFraude: "baixo" | "medio" | "alto";
}

export interface OrderData {
  orderId: string; // GCH (Gocase) ou GBH (GoBeauté)
  marca: "Gocase" | "GoBeauté";
  sku: string;
  descricaoProduto: string;
  lote: string; // LT + AAMM + letra
  valor: number;
  dataPedido: string;
  dataEntrega: string;
  diasAposEntrega: number;
  statusEntrega: "entregue" | "em_transito" | "avaria_notificada";
  personalizacao?: string;
  cdSeparacao: "CD1" | "CD2";
}

export interface CarrierData {
  transportadora: "Expressa Já" | "ViaLog" | "Correio Ágil" | "Rápido Sul" | "TransNorte";
  codigoRastreio: string;
  pesoExpedicaoKg: number;
  pesoEntregaKg: number;
  ressalvaRecebimento?: string;
  sinistroAberto: boolean;
}

export interface ExecutedAction {
  tipo: "reenvio_imediato" | "estorno_integral" | "recusa_fundamentada" | "escalonado_humano";
  pedidoReposicaoId?: string; // OMS / GCH-R1
  coletaReversa: boolean;
  codigoPostagemReversa?: string;
  notificacaoCliente: string;
  acaoId: string;
}

export interface TicketCase {
  id: string; // AT + 6 dígitos
  conversationId: string;
  dataAbertura: string;
  canal: ChannelType;
  cliente: CustomerData;
  pedido: OrderData;
  transportadora: CarrierData;
  relatoCliente: string;
  imagemUrl: string;
  hashPerceptual: string;
  visualInspection: VisualInspection;
  confidenceScore: number; // 0 a 100
  verdict: VerdictType;
  executedAction: ExecutedAction;
  auditTrail: AuditStep[];
  batchAlertTriggered: boolean;
  tempoProcessamentoMs: number;
}

export interface BatchAlert {
  id: string;
  batchId: string; // Ex: LT2609-B
  sku: string;
  descricaoProduto: string;
  marca: string;
  fornecedor: string;
  totalCasosDetectados: number;
  taxaAumentoPct: number;
  defeitoPredominante: string;
  status: "ativo" | "bloqueado_no_erp" | "em_analise_qualidade";
  acaoRecomendada: string;
  dataDetecao: string;
}

export interface KPIMetrics {
  taxaAutonomiaZeroTouch: number; // Ex: 94.8%
  acuraciaScoreMedio: number; // Ex: 95.6%
  tempoMedioSegundos: number; // Ex: 3.2s
  ticketsProcessadosTotal: number;
  aprovadosAutomaticos: number;
  recusadosAutomaticos: number;
  escalonadosExcecao: number;
  fraudesEvitadasValor: number;
}

// ============================================================================
// ALERTA DE LOTE CRÍTICO (Inteligência Preventiva de Qualidade)
// ============================================================================
export const MOCK_BATCH_ALERT: BatchAlert = {
  id: "ALT-2026-09B",
  batchId: "LT2609-B",
  sku: "GOC-5064",
  descricaoProduto: "Tote Bag Daily Personalizada Nome",
  marca: "Gocase",
  fornecedor: "Confecção Têxtil Alfa (Brás-SP)",
  totalCasosDetectados: 18,
  taxaAumentoPct: 340,
  defeitoPredominante: "Descostura linear por tensão insuficiente na alça reforçada",
  status: "ativo",
  acaoRecomendada: "Bloquear expedição do lote LT2609-B no CD1 e notificar controle de qualidade têxtil.",
  dataDetecao: "2026-11-02 07:45:00"
};

// ============================================================================
// METRICAS EXECUTIVAS CONSOLIDADAS (Governança & Observabilidade)
// ============================================================================
export const MOCK_KPIS: KPIMetrics = {
  taxaAutonomiaZeroTouch: 94.8,
  acuraciaScoreMedio: 95.6,
  tempoMedioSegundos: 3.2,
  ticketsProcessadosTotal: 1248,
  aprovadosAutomaticos: 1042,
  recusadosAutomaticos: 141,
  escalonadosExcecao: 65,
  fraudesEvitadasValor: 38450.00
};

// ============================================================================
// 4 CASOS DE ALTA FIDELIDADE (Avaria, Descostura e Logística)
// ============================================================================
export const MOCK_TICKETS: TicketCase[] = [
  // CASO 1: APROVAÇÃO 100% AUTÔNOMA (Descostura Real de Fábrica + Lote Crítico)
  {
    id: "TC-001",
    conversationId: "AT104837",
    dataAbertura: "2026-11-02 07:15:22",
    canal: "whatsapp",
    cliente: {
      customerId: "CH246472",
      nome: "Mariana Albuquerque Lima",
      segmento: "vip",
      cidade: "São Paulo",
      uf: "SP",
      nPedidos: 8,
      nTrocas12m: 0,
      nContatos12m: 1,
      receitaAcumulada: 1420.50,
      riscoFraude: "baixo"
    },
    pedido: {
      orderId: "GCH525425",
      marca: "Gocase",
      sku: "GOC-5064",
      descricaoProduto: "Tote Bag Daily Personalizada Nome",
      lote: "LT2609-B",
      valor: 219.90,
      dataPedido: "2026-10-25 14:20:00",
      dataEntrega: "2026-10-30 11:45:00",
      diasAposEntrega: 3,
      statusEntrega: "entregue",
      personalizacao: "Mariana",
      cdSeparacao: "CD1"
    },
    transportadora: {
      transportadora: "Expressa Já",
      codigoRastreio: "EJ373290390BR",
      pesoExpedicaoKg: 0.48,
      pesoEntregaKg: 0.48,
      ressalvaRecebimento: undefined,
      sinistroAberto: false
    },
    relatoCliente: "Recebi minha Tote Bag há 3 dias e na primeira vez que usei a alça principal simplesmente descosturou inteira! Dá pra ver que a linha soltou da costura de reforço. Gostaria da troca com urgência.",
    imagemUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=700&auto=format&fit=crop&q=80",
    hashPerceptual: "bf9a7182dae39c41",
    visualInspection: {
      defectType: "descostura_alca",
      isManufacturingDefect: true,
      imageQuality: "alta",
      technicalReport: "Identificada descontinuidade na costura de fixação da alça superior. Ausência de arrebentamento por tração excessiva ou corte mecânico; desprendimento limpo da linha de pesponto característico de falha de arremate/tensão na costura de fábrica.",
      detectedFeatures: ["Costura desfeita em linha reta", "Fios intactos sem abrasão", "Alinhamento com falha recorrente do Lote LT2609-B"]
    },
    confidenceScore: 97,
    verdict: "AUTO_APPROVED",
    executedAction: {
      tipo: "reenvio_imediato",
      pedidoReposicaoId: "GCH525425-R1",
      coletaReversa: true,
      codigoPostagemReversa: "REV-9921448",
      notificacaoCliente: "Olá Mariana! Nosso sistema identificou que a avaria na costura da sua Tote Bag Daily é uma falha de fabricação coberta pela nossa garantia. Já geramos o seu pedido de reenvio com prioridade (GCH525425-R1) e enviamos a etiqueta de postagem reversa sem custo no seu e-mail.",
      acaoId: "AC000095"
    },
    batchAlertTriggered: true,
    tempoProcessamentoMs: 2450,
    auditTrail: [
      {
        stepNumber: 1,
        system: "ERP (Pedidos/Garantia)",
        action: "Verificação de prazo legal e elegibilidade de troca",
        finding: "Pedido GCH525425 entregue há 3 dias. Dentro do prazo de 7 dias de garantia de avaria (CDC art. 49).",
        status: "success",
        timestamp: "07:15:22.310",
        latencyMs: 140
      },
      {
        stepNumber: 2,
        system: "Transportadora (Rastreio/Pesagem)",
        action: "Consulta de integridade de expedição e peso",
        finding: "Expressa Já confirmou entrega pontual. Peso na saída (480g) compatível com a entrega. Sem sinistro no transporte.",
        status: "success",
        timestamp: "07:15:22.520",
        latencyMs: 210
      },
      {
        stepNumber: 3,
        system: "CRM (Histórico/Antifraude)",
        action: "Análise de idoneidade e padrão de consumo",
        finding: "Cliente VIP (8 pedidos, R$ 1.420,50 LTV, 0 trocas em 12 meses). Score de risco de fraude: BAIXO (0.02).",
        status: "success",
        timestamp: "07:15:22.750",
        latencyMs: 230
      },
      {
        stepNumber: 4,
        system: "Vision AI (Perícia Multimodal)",
        action: "Análise microscópica da evidência fotográfica com Claude Vision",
        finding: "Descostura limpa de pesponto na alça. Sem sinais de abrasão externa ou corte forçado. Confiança: 97%. Defeito de fabricação confirmado.",
        status: "success",
        timestamp: "07:15:24.120",
        latencyMs: 1370
      },
      {
        stepNumber: 5,
        system: "OMS / Execução Autônoma",
        action: "Disparo 100% Agente: Geração de reenvio + logística reversa",
        finding: "Pedido GCH525425-R1 criado no OMS CD1 com tag prioritária. Etiqueta reversa REV-9921448 emitida via Correio Ágil.",
        status: "success",
        timestamp: "07:15:24.760",
        latencyMs: 500
      }
    ]
  },

  // CASO 2: RECUSA 100% AUTÔNOMA (Mau Uso / Dano Externo / Fora de Garantia)
  {
    id: "TC-002",
    conversationId: "AT104840",
    dataAbertura: "2026-11-02 07:22:10",
    canal: "email",
    cliente: {
      customerId: "CH719022",
      nome: "Carlos Eduardo Nogueira",
      segmento: "recorrente",
      cidade: "Belo Horizonte",
      uf: "MG",
      nPedidos: 2,
      nTrocas12m: 3,
      nContatos12m: 6,
      receitaAcumulada: 230.00,
      riscoFraude: "alto"
    },
    pedido: {
      orderId: "GCH519080",
      marca: "Gocase",
      sku: "GOC-5060",
      descricaoProduto: "Necessaire Makeup Double Personalizada Nome",
      lote: "LT2604-A",
      valor: 89.90,
      dataPedido: "2026-06-12 10:11:00",
      dataEntrega: "2026-06-18 16:30:00",
      diasAposEntrega: 137,
      statusEntrega: "entregue",
      personalizacao: "Cadu",
      cdSeparacao: "CD1"
    },
    transportadora: {
      transportadora: "ViaLog",
      codigoRastreio: "VL70463875235",
      pesoExpedicaoKg: 0.21,
      pesoEntregaKg: 0.21,
      ressalvaRecebimento: undefined,
      sinistroAberto: false
    },
    relatoCliente: "O tecido e a costura da necessaire abriram sozinhos. Quero meu dinheiro de volta ou uma nova porque isso é defeito de qualidade do produto.",
    imagemUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=700&auto=format&fit=crop&q=80",
    hashPerceptual: "1a84f37bc902e64b",
    visualInspection: {
      defectType: "rasgo_mau_uso",
      isManufacturingDefect: false,
      imageQuality: "alta",
      technicalReport: "Avaria caracterizada por corte transversal irregular com rompimento das fibras da trama têxtil e marcas de atrito mecânico. Não há descontinuidade na linha de costura nem defeito de fabricação. Dano típico de contato com objeto perfurocortante externo.",
      detectedFeatures: ["Fibras desfiadas por perfuração", "Bordas queimadas/abrasivas", "Distante da linha de união/costura"]
    },
    confidenceScore: 94,
    verdict: "AUTO_REJECTED",
    executedAction: {
      tipo: "recusa_fundamentada",
      coletaReversa: false,
      notificacaoCliente: "Prezado Carlos, nossa perícia técnica visual identificou que o dano apresentado no tecido da Necessaire Makeup Double não se trata de falha na costura ou defeito de fábrica, mas sim de ruptura externa por tração/contato mecânico. Além disso, o pedido foi entregue há mais de 130 dias, excedendo o prazo legal de garantia. Por essa razão, a solicitação de troca foi indeferida de acordo com nossa política vigente.",
      acaoId: "AC000102"
    },
    batchAlertTriggered: false,
    tempoProcessamentoMs: 2180,
    auditTrail: [
      {
        stepNumber: 1,
        system: "ERP (Pedidos/Garantia)",
        action: "Verificação de vigência de garantia",
        finding: "Pedido GCH519080 entregue há 137 dias. Fora do prazo legal de 7 dias para avaria e de 90 dias de bens duráveis.",
        status: "alert",
        timestamp: "07:22:10.150",
        latencyMs: 120
      },
      {
        stepNumber: 2,
        system: "CRM (Histórico/Antifraude)",
        action: "Auditoria de sinistralidade e comportamento de trocas",
        finding: "Cliente possui 3 trocas registradas em 12 meses para apenas 2 compras (taxa anômala de 150%). Score de risco de abuso: ALTO (0.87).",
        status: "alert",
        timestamp: "07:22:10.320",
        latencyMs: 170
      },
      {
        stepNumber: 3,
        system: "Vision AI (Perícia Multimodal)",
        action: "Detecção visual de causas físicas de ruptura",
        finding: "Ruptura de fibras fora da linha de costura com sinais de corte mecânico. Ausência total de defeito fabril. Confiança: 94%.",
        status: "warning",
        timestamp: "07:22:11.890",
        latencyMs: 1570
      },
      {
        stepNumber: 4,
        system: "OMS / Execução Autônoma",
        action: "Execução 100% Agente: Indeferimento e envio de laudo pericial",
        finding: "Solicitação indeferida automaticamente no sistema. E-mail com parecer pericial e regras da política enviado ao cliente.",
        status: "success",
        timestamp: "07:22:12.330",
        latencyMs: 320
      }
    ]
  },

  // CASO 3: ESCALONAMENTO DE EXCEÇÃO (Foto Borrada / Inconclusiva — Score < 80%)
  {
    id: "TC-003",
    conversationId: "AT104845",
    dataAbertura: "2026-11-02 07:31:05",
    canal: "whatsapp",
    cliente: {
      customerId: "CH334912",
      nome: "Fernanda Cristina Rocha",
      segmento: "fiel",
      cidade: "Curitiba",
      uf: "PR",
      nPedidos: 4,
      nTrocas12m: 0,
      nContatos12m: 0,
      receitaAcumulada: 480.00,
      riscoFraude: "baixo"
    },
    pedido: {
      orderId: "GCH526011",
      marca: "Gocase",
      sku: "GOC-5058",
      descricaoProduto: "Connect Card Magsafe Personalizado Nome",
      lote: "LT2608-C",
      valor: 79.90,
      dataPedido: "2026-10-27 09:15:00",
      dataEntrega: "2026-10-31 15:10:00",
      diasAposEntrega: 2,
      statusEntrega: "entregue",
      personalizacao: "Fernanda",
      cdSeparacao: "CD2"
    },
    transportadora: {
      transportadora: "Rápido Sul",
      codigoRastreio: "RPS572758581",
      pesoExpedicaoKg: 0.05,
      pesoEntregaKg: 0.05,
      ressalvaRecebimento: undefined,
      sinistroAberto: false
    },
    relatoCliente: "O porta cartão veio com a lateral descosturada e solta, não consigo colocar o cartão sem cair.",
    imagemUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=700&auto=format&fit=crop&q=80",
    hashPerceptual: "0000000000000000",
    visualInspection: {
      defectType: "foto_inconclusiva",
      isManufacturingDefect: false,
      imageQuality: "baixa_inconclusiva",
      technicalReport: "Imagem capturada com forte desfoque por movimento (motion blur), reflexo especular na área do produto e ângulo contra a luz. Impossível aferir a integridade da costura ou borda selada com precisão algorítmica mínima.",
      detectedFeatures: ["Desfoque focal severo", "Iluminação insuficiente", "Resolução insuficiente da costura"]
    },
    confidenceScore: 52,
    verdict: "HUMAN_ESCALATED",
    executedAction: {
      tipo: "escalonado_humano",
      coletaReversa: false,
      notificacaoCliente: "Olá Fernanda! Recebemos sua mensagem sobre o Connect Card. Para garantir que resolveremos seu caso da melhor forma, nossa equipe de suporte está avaliando seu ticket e, se necessário, solicitaremos uma foto mais nítida da costura.",
      acaoId: "AC000109"
    },
    batchAlertTriggered: false,
    tempoProcessamentoMs: 1890,
    auditTrail: [
      {
        stepNumber: 1,
        system: "ERP (Pedidos/Garantia)",
        action: "Verificação de prazo de compra",
        finding: "Pedido GCH526011 entregue há 2 dias. Totalmente elegível dentro da garantia.",
        status: "success",
        timestamp: "07:31:05.120",
        latencyMs: 110
      },
      {
        stepNumber: 2,
        system: "CRM (Histórico/Antifraude)",
        action: "Consulta de perfil de cliente",
        finding: "Cliente Fiel com histórico positivo e sem registros de trocas abusivas.",
        status: "success",
        timestamp: "07:31:05.290",
        latencyMs: 170
      },
      {
        stepNumber: 3,
        system: "Vision AI (Perícia Multimodal)",
        action: "Avaliação pericial de qualidade da evidência visual",
        finding: "Score de Acurácia: 52% (abaixo do limiar de segurança de 80%). Foto ilegível/desfocada impede julgamento autônomo seguro.",
        status: "alert",
        timestamp: "07:31:06.650",
        latencyMs: 1360
      },
      {
        stepNumber: 4,
        system: "OMS / Execução Autônoma",
        action: "Governança Zero-Touch: Interrupção de automação e escalonamento",
        finding: "Regra de segurança acionada: Caso direcionado para a Fila de Exceção Humana da Central de Observabilidade.",
        status: "warning",
        timestamp: "07:31:06.940",
        latencyMs: 250
      }
    ]
  },

  // CASO 4: APROVAÇÃO 100% AUTÔNOMA (Avaria Física + Divergência no Transporte)
  {
    id: "TC-004",
    conversationId: "AT104850",
    dataAbertura: "2026-11-02 07:40:18",
    canal: "reclame_aqui",
    cliente: {
      customerId: "CH880199",
      nome: "Renata Vasconcelos Prado",
      segmento: "fiel",
      cidade: "Recife",
      uf: "PE",
      nPedidos: 5,
      nTrocas12m: 1,
      nContatos12m: 2,
      receitaAcumulada: 890.00,
      riscoFraude: "baixo"
    },
    pedido: {
      orderId: "GCH527180",
      marca: "Gocase",
      sku: "GOC-5066",
      descricaoProduto: "Mini Tote Personalizada Nome",
      lote: "LT2609-B",
      valor: 189.90,
      dataPedido: "2026-10-24 16:00:00",
      dataEntrega: "2026-10-31 17:20:00",
      diasAposEntrega: 2,
      statusEntrega: "avaria_notificada",
      personalizacao: "Renata",
      cdSeparacao: "CD1"
    },
    transportadora: {
      transportadora: "Correio Ágil",
      codigoRastreio: "CA650857963BR",
      pesoExpedicaoKg: 0.35,
      pesoEntregaKg: 0.22,
      ressalvaRecebimento: "Embalagem amassada com rasgadura lateral na triagem do hub Recife",
      sinistroAberto: true
    },
    relatoCliente: "Recebi a caixa toda rasgada e amassada pelo entregador. Quando abri, a Mini Tote estava esmagada e com a alça rompida pelo impacto. Um absurdo a falta de cuidado da transportadora!",
    imagemUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=700&auto=format&fit=crop&q=80",
    hashPerceptual: "4c7a8b9e01f23456",
    visualInspection: {
      defectType: "avaria_transporte_embalagem",
      isManufacturingDefect: false,
      imageQuality: "alta",
      technicalReport: "Evidência de avaria externa decorrente de impacto cinético no transporte: esmagamento estrutural, rompimento por tração forçada e correspondência direta com a violação da embalagem descrita no manifesto da transportadora.",
      detectedFeatures: ["Esmagamento lateral evidente", "Caixa perfurada no manifesto", "Divergência de peso no hub da transportadora"]
    },
    confidenceScore: 96,
    verdict: "AUTO_APPROVED",
    executedAction: {
      tipo: "reenvio_imediato",
      pedidoReposicaoId: "GCH527180-R1",
      coletaReversa: false,
      notificacaoCliente: "Prezada Renata, lamentamos profundamente o ocorrido com a entrega da sua Mini Tote. Nosso sistema confirmou a avaria ocorrida durante o transporte pelos Correio Ágil e já providenciou um novo envio prioritário (GCH527180-R1) sem qualquer custo para você, sem necessidade de devolver a peça avariada.",
      acaoId: "AC000115"
    },
    batchAlertTriggered: false,
    tempoProcessamentoMs: 2600,
    auditTrail: [
      {
        stepNumber: 1,
        system: "ERP (Pedidos/Garantia)",
        action: "Verificação de pedido e status de entrega",
        finding: "Pedido GCH527180 entregue há 2 dias. Produto: Mini Tote (GOC-5066).",
        status: "success",
        timestamp: "07:40:18.210",
        latencyMs: 130
      },
      {
        stepNumber: 2,
        system: "Transportadora (Rastreio/Pesagem)",
        action: "Cruzamento com portal da transportadora e pesagem",
        finding: "ALERTA DE SINISTRO: Correio Ágil registrou 'Embalagem amassada com rasgadura'. Peso caiu de 350g para 220g no hub Recife.",
        status: "alert",
        timestamp: "07:40:18.490",
        latencyMs: 280
      },
      {
        stepNumber: 3,
        system: "CRM (Histórico/Antifraude)",
        action: "Análise comportamental do cliente",
        finding: "Cliente Fiel com excelente histórico. Sinistro 100% imputável à transportadora.",
        status: "success",
        timestamp: "07:40:18.720",
        latencyMs: 230
      },
      {
        stepNumber: 4,
        system: "Vision AI (Perícia Multimodal)",
        action: "Análise da evidência fotográfica da peça e caixa",
        finding: "Laudo pericial comprova avaria por choque mecânico/compressão externa. Confiança: 96%.",
        status: "success",
        timestamp: "07:40:20.150",
        latencyMs: 1430
      },
      {
        stepNumber: 5,
        system: "OMS / Execução Autônoma",
        action: "Disparo 100% Agente: Reenvio imediato + Abertura de sinistro contra Correio Ágil",
        finding: "Reenvio prioritário GCH527180-R1 faturado com frete expresso. Chamado de indenização aberto contra a transportadora.",
        status: "success",
        timestamp: "07:40:20.810",
        latencyMs: 530
      }
    ]
  }
];


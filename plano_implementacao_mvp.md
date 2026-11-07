# Plano de Implementação do MVP — GoSherlock

> **Papel:** Arquiteto / Desenvolvedor Sênior reportando à **Tech Lead Amanda Vieira**  
> **Evento:** GoHacks (Hackathon GoGroup) — **Desafio 1 (Atendimento ao Cliente / Triagem de Avarias de Produto)**

---

## 1. Descrição Resumida da Solução

O **GoSherlock** é uma aplicação web de **Governança, Observabilidade e Execução Autônoma de Backoffice (Zero-Touch / 100% Agente)** desenvolvida para eliminar o principal gargalo operacional da GoGroup: a investigação manual e validação visual de reclamações de **avaria de produto (ex.: descostura em peças/acessórios, rasgos, falhas de zíper)**.

Em vez de uma fila de aprovação manual onde o analista humano perde 15 a 20 minutos por chamado alternando entre fotos no WhatsApp/Reclame Aqui, ERP, portal da transportadora e histórico de compras, o **GoSherlock**:
1. Consolida a evidência fotográfica e o relato do cliente.
2. Cruza automaticamente em tempo real os dados de ERP (garantia, lote), Transportadora (ressalvas e pesagem) e CRM (histórico antifraude).
3. Executa a perícia visual com modelo Multimodal (Claude Vision via GoGroup AI Proxy) gerando um Laudo Técnico e Score de Confiança/Acurácia.
4. Opera de forma **100% autônoma (Zero-Touch) para a vasta maioria dos casos ($\ge 80\%$ de confiança)**: gera a troca/reenvio ou recusa fundamentadamente sem intervenção humana.
5. Escala para revisão humana apenas exceções reais (fotos ilegíveis/inconclusivas com $< 80\%$ de confiança).
6. Identifica **anomalias em lote de fabricação** (ex.: pico de descosturas no Lote `#LT-2026-09B`), permitindo ao gestor estancar prejuízos na origem.

---

## 2. Arquitetura Proposta

```text
+-----------------------------------------------------------------------------------+
|                           FRONTEND (Next.js App Router)                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Header Executivo: KPIs (Taxa Autonomia 95%, Acurácia 96%, Tempo 3.2s)       |  |
|  +-----------------------------------------------------------------------------+  |
|  | Banner de Alerta Preventivo: Lote Crítico #LT-2026-09B (Descostura em massa)|  |
|  +-----------------------------------------------------------------------------+  |
|  | PAINEL DE GOVERNANÇA EM 3 COLUNAS:                                         |  |
|  |  [Col 1: Fila Execuções]   [Col 2: Evidência + Vision]   [Col 3: Auditoria]  |  |
|  +-----------------------------------------------------------------------------+  |
|  | Modal "Simular Novo Ticket Ao Vivo" (Demonstração interativa p/ jurados)    |  |
|  +-----------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | Fetch POST
                                           v
+-----------------------------------------------------------------------------------+
|                        BACKEND API ROUTE (Next.js Serverless)                     |
|                              `src/app/api/analyze/route.ts`                       |
+------------------------------------------+----------------------------------------+
         |                                 |                                 |
         v                                 v                                 v
+------------------+             +-------------------+             +-----------------+
|  Mocks Memória   |             |  GoGroup AI Proxy |             | Fallback Local  |
| (ERP, Transp.,   |             | (Claude 3.5/Haiku |             |  Determinístico |
| CRM, Casos Teste)|             |   Multimodal)     |             |  (Demo-Safe)    |
+------------------+             +-------------------+             +-----------------+
```

---

## 3. Fluxo Principal de Funcionamento (End-to-End)

1. **Ingestão do Chamado:** Recebe relato do cliente + imagem da avaria (peça com descostura/rasgo) + SKU/ID do Pedido.
2. **Coleta e Enriquecimento Automático:** A API busca os dados correlacionados no ERP (status da garantia, lote de fabricação), na Transportadora (check de entrega, avaria de caixa, pesagem no hub) e no CRM (LTV e histórico de sinistros).
3. **Inspeção Multimodal via IA:** A imagem é analisada pelo Claude Vision com prompt estrito de laudo técnico de alfaiataria/confecção.
4. **Cálculo do Veredito e Score:**
   - Se laudo positivo + garantia válida + sem fraude $\rightarrow$ `AUTO_APPROVED` (Dispara reenvio + logística reversa).
   - Se laudo negativo (mau uso visível / corte manual) ou fora de garantia $\rightarrow$ `AUTO_REJECTED` (Dispara negativa com laudo formal anexado).
   - Se imagem inconclusiva/escura/borrada (Score $< 80\%$) $\rightarrow$ `HUMAN_ESCALATED` (Direcionado para a fila de exceção humana com recomendação de nova foto).
5. **Auditoria & Observabilidade:** Cada milissegundo e decisão são persistidos na trilha de auditoria visual na Coluna 3. Se houver correlação com lote crítico, o alerta é atualizado no dashboard.

---

## 4. Como a IA Será Utilizada e Qual Ação Autônoma Executará

| Aspecto | Detalhamento Técnico |
| :--- | :--- |
| **Tarefa que executa** | Perícia visual de fotos de avarias têxteis/acessórios, classificação da raiz do defeito (fabricação vs. mau uso vs. transporte) e síntese do veredito executivo. |
| **Dados que recebe** | URL/Base64 da foto do produto avariado, descrição do cliente, dados do ERP (dias desde a entrega, tipo de produto, lote), dados da transportadora e histórico antifraude. |
| **Resultado que produz** | Objeto JSON estrito contendo: `verdict` (`AUTO_APPROVED` \| `AUTO_REJECTED` \| `HUMAN_ESCALATED`), `confidenceScore` (0-100), `visualInspection` (tipo de defeito, se é falha de fábrica, qualidade da foto, laudo técnico), `auditSteps` (passo a passo) e `executedAction`. |
| **Ação autônoma que executa** | **Zero-Touch:** Se aprovado, emite ordem de faturamento de reenvio + gera etiqueta de postagem reversa. Se recusado, emite e-mail fundamentado com laudo técnico ao cliente. Não aguarda aprovação de operador humano. |
| **Como é validado** | Validação de schema no retorno da API e checagem de regras de corte (se Score $\ge 80\%$, autoriza execução autônoma; se $< 80\%$, bloqueia a ação e escalona). |
| **O que acontece se falhar** | Timeout de 8 segundos no AI Proxy. Se a chamada falhar ou a chave falhar, o **Fallback Heurístico Local** entra em ação imediatamente, simulando a perícia com base nas regras de negócio pré-definidas para que a banca examinadora nunca veja uma tela de erro ou lentidão. |

---

## 5. Etapas Sequenciais de Implementação

### 🔹 Etapa 1: Dados Cruzados, Mocks e Tipos
- Criação dos modelos de dados TypeScript e dos 4 casos de alta fidelidade:
  1. *Descostura de Fábrica em Alça (Aprovação 100% Autônoma - Lote Crítico)*
  2. *Rasgo por Objeto Cortante / Mau Uso (Recusa 100% Autônoma)*
  3. *Foto Desfocada / Inconclusiva (Escalonamento para Humano)*
  4. *Avaria + Divergência de Peso no Transporte (Aprovação Autônoma + Cobrança Transportadora)*
- Estruturação do alerta preventivo de lote (`BATCH_ALERT`).

### 🔹 Etapa 2: Motor do Agente Autônomo e Rota da API
- Implementação de `src/app/api/analyze/route.ts` conectando ao AI Proxy (`https://ai-proxy.gogroupbr.com`) com autenticação via Bearer token (`AI_PROXY_TOKEN`).
- Inclusão da lógica de cruzamento de contexto (ERP + Transportadora + CRM).
- Implementação do Fallback Determinístico inteligente para resiliência na demo.

### 🔹 Etapa 3: Dashboard de Auditoria em 3 Colunas + Simulador Ao Vivo
- Construção da interface em `src/app/page.tsx` com Tailwind CSS e Lucide Icons:
  - Header com KPIs de Autonomia e Acurácia.
  - Banner dinâmico de Alerta de Lote com botão de ação.
  - Coluna 1: Lista de Casos e filtros de status.
  - Coluna 2: Detalhe do Chamado + Foto com Overlay de Perícia Visual.
  - Coluna 3: Linha do Tempo de Auditoria Passo a Passo + Ação Executada Sozinha.
  - Modal interativo "Simular Novo Ticket Ao Vivo" para testes na frente dos jurados.

---

## 6. Arquivos Criados ou Modificados por Etapa

| Etapa | Arquivos Envolvidos | Função Principal |
| :--- | :--- | :--- |
| **Setup Base** | `package.json`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `src/app/globals.css`, `src/app/layout.tsx` | Infraestrutura do Next.js (App Router), TypeScript e Tailwind |
| **Etapa 1** | `src/data/mocks.ts` | Definição de tipos, 4 casos de uso reais com imagens e lote |
| **Etapa 2** | `src/app/api/analyze/route.ts` | Endpoint de análise multimodal via AI Proxy com fallback |
| **Etapa 3** | `src/app/page.tsx`, componentes auxiliares | Dashboard de 3 colunas, KPIs, banner de lote e modal simulador |

---

## 7. Riscos Técnicos e Alternativas (Plano de Contingência)

1. **Risco: Latência ou instabilidade de rede no AI Proxy durante a apresentação dos jurados.**
   - *Mitigação:* Implementação de timeout curto com transição transparente para o motor de fallback local idêntico em resposta, garantindo resposta em $< 1$ segundo.
2. **Risco: Resposta da IA com formato JSON inválido.**
   - *Mitigação:* Prompt com instrução estrita de JSON e parse com `try/catch` higienizado com regex para extração de blocos `{}`.
3. **Risco: Carregamento lento de imagens externas na demo.**
   - *Mitigação:* Uso de imagens otimizadas do Unsplash com parâmetros de compressão direta (`w=600&auto=format&fit=crop&q=80`) e placeholders SVG estilizados inline como garantia secundária.

---

Aguardando sua **aprovação formal do plano** para prosseguir com a **Etapa 1**!

"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Ban, Bot, CheckCircle2, Clock, FileSearch, Lock, Package, ShieldAlert, ShieldCheck, ShieldX, Sparkles, Truck, UserRound, XCircle, Zap,
} from "lucide-react";
import {
  MOCK_BATCH_ALERT, MOCK_KPIS, MOCK_TICKETS,
  type AuditStep, type BatchAlert, type TicketCase, type VerdictType,
} from "@/data/mocks";
import SimulatorModal, { type AnalyzeResponse } from "@/components/SimulatorModal";
import GoSherlockLogo from "@/components/GoSherlockLogo";

type Filter = "todos" | VerdictType;
type Source = "ai" | "fallback" | "mock";
const MOCK_IDS = new Set(MOCK_TICKETS.map((t) => t.id));

const VERDICT_META: Record<VerdictType, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  AUTO_APPROVED: { label: "Aprovado automático", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", Icon: ShieldCheck },
  AUTO_REJECTED: { label: "Recusado automático", cls: "bg-rose-500/10 text-rose-400 border-rose-500/30", Icon: ShieldX },
  HUMAN_ESCALATED: { label: "Escalado p/ humano", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", Icon: ShieldAlert },
};

const STEP_CLS: Record<AuditStep["status"], string> = {
  success: "border-emerald-500 text-emerald-400",
  warning: "border-amber-500 text-amber-400",
  alert: "border-rose-500 text-rose-400",
};

const DEFECT_LABEL: Record<string, string> = {
  descostura_alca: "Descostura (fabricação)",
  rasgo_mau_uso: "Rasgo / mau uso",
  foto_inconclusiva: "Foto inconclusiva",
  avaria_transporte_embalagem: "Avaria de transporte",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Badge({ verdict }: { verdict: VerdictType }) {
  const { label, cls, Icon } = VERDICT_META[verdict];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      <Icon size={12} /> {label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-300">{score}%</span>
    </div>
  );
}

function Kpi({ Icon, label, value, hint }: { Icon: typeof Zap; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-slate-400"><Icon size={14} /> {label}</div>
      <div className="mt-1 text-2xl font-bold text-white tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [tickets, setTickets] = useState<TicketCase[]>(MOCK_TICKETS);
  const [sources, setSources] = useState<Record<string, Source>>({});
  const [selectedId, setSelectedId] = useState(MOCK_TICKETS[0].id);
  const [filter, setFilter] = useState<Filter>("todos");
  const [batch, setBatch] = useState<BatchAlert>(MOCK_BATCH_ALERT);
  const [showSim, setShowSim] = useState(false);
  const [note, setNote] = useState("");
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});

  const selected = tickets.find((t) => t.id === selectedId) ?? tickets[0];
  const visible = useMemo(() => tickets.filter((t) => filter === "todos" || t.verdict === filter), [tickets, filter]);
  const counts = useMemo(() => ({
    todos: tickets.length,
    AUTO_APPROVED: tickets.filter((t) => t.verdict === "AUTO_APPROVED").length,
    AUTO_REJECTED: tickets.filter((t) => t.verdict === "AUTO_REJECTED").length,
    HUMAN_ESCALATED: tickets.filter((t) => t.verdict === "HUMAN_ESCALATED").length,
  }), [tickets]);

  function ingest(r: AnalyzeResponse) {
    const source: Source = r.source === "gogroup_ai_proxy" ? "ai" : "fallback";
    setTickets((prev) => [r.ticket, ...prev.filter((t) => t.id !== r.ticket.id)]);
    setSources((s) => ({ ...s, [r.ticket.id]: source }));
    setSelectedId(r.ticket.id);
    setFilter("todos");
    setNote(source === "ai" ? "Perícia feita pela IA via AI Proxy." : "AI Proxy indisponível: motor determinístico local acionado.");
    if (r.ticket.batchAlertTriggered) setBatch((b) => ({ ...b, totalCasosDetectados: b.totalCasosDetectados + 1 }));
  }

  const src = sources[selected.id] ?? "mock";
  const blocked = batch.status === "bloqueado_no_erp";
  const showImg = selected.imagemUrl && !imgFailed[selected.id];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5">
      {/* Header + KPIs */}
      <header className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <GoSherlockLogo size="md" showTagline={true} />
          <button onClick={() => setShowSim(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]">
            <Sparkles size={16} /> Simular novo ticket ao vivo
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi Icon={Zap} label="Autonomia Zero-Touch" value={`${MOCK_KPIS.taxaAutonomiaZeroTouch}%`} hint={`${MOCK_KPIS.ticketsProcessadosTotal} tickets processados`} />
          <Kpi Icon={Activity} label="Acurácia média" value={`${MOCK_KPIS.acuraciaScoreMedio}%`} hint="score de confiança" />
          <Kpi Icon={Clock} label="Tempo médio" value={`${MOCK_KPIS.tempoMedioSegundos}s`} hint="vs 15–20 min manual" />
          <Kpi Icon={ShieldCheck} label="Fraudes evitadas" value={brl(MOCK_KPIS.fraudesEvitadasValor)} />
          <Kpi Icon={ShieldAlert} label="Exceções p/ humano" value={String(MOCK_KPIS.escalonadosExcecao)} hint={`${MOCK_KPIS.aprovadosAutomaticos} aprovados · ${MOCK_KPIS.recusadosAutomaticos} recusados`} />
        </div>
      </header>

      {/* Banner de lote */}
      <section className={`mb-4 rounded-xl border p-4 flex flex-wrap items-center gap-4 ${blocked ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/10"}`}>
        {blocked ? <Lock className="text-emerald-400" /> : <AlertTriangle className="text-rose-400 shrink-0" />}
        <div className="flex-1 min-w-[260px]">
          <div className="text-sm font-bold text-white">
            {blocked ? `Lote ${batch.batchId} bloqueado no ERP` : `Alerta preventivo: lote crítico ${batch.batchId}`}
            <span className="ml-2 text-xs font-normal text-slate-400">{batch.sku} · {batch.descricaoProduto} · {batch.fornecedor}</span>
          </div>
          <div className="text-xs text-slate-300 mt-0.5">
            {batch.totalCasosDetectados} casos detectados (+{batch.taxaAumentoPct}%) — {batch.defeitoPredominante}.
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{blocked ? "Expedição suspensa e controle de qualidade notificado." : batch.acaoRecomendada}</div>
        </div>
        {!blocked && (
          <button onClick={() => setBatch((b) => ({ ...b, status: "bloqueado_no_erp" }))} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-semibold">
            <Ban size={16} /> Bloquear lote no ERP
          </button>
        )}
      </section>

      {/* 3 colunas */}
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_380px]">
        {/* Col 1 — fila */}
        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-3 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto">
          <h2 className="px-1 mb-2 text-sm font-semibold text-slate-200">Fila de execuções</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {([
              ["todos", "Todos"], ["AUTO_APPROVED", "Aprovados"], ["AUTO_REJECTED", "Recusados"], ["HUMAN_ESCALATED", "Exceções"],
            ] as [Filter, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`text-xs rounded-full px-2.5 py-1 border ${filter === k ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                {l} ({counts[k]})
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {visible.map((t) => (
              <li key={t.id}>
                <button onClick={() => setSelectedId(t.id)} className={`w-full text-left rounded-lg border p-3 transition ${t.id === selected.id ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-600"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400">{!MOCK_IDS.has(t.id) ? "AO VIVO" : t.conversationId}</span>
                    <Badge verdict={t.verdict} />
                  </div>
                  <div className="text-sm font-medium text-white truncate">{t.pedido.descricaoProduto}</div>
                  <div className="text-xs text-slate-400 truncate mb-2">{t.cliente.nome} · {DEFECT_LABEL[t.visualInspection.defectType]}</div>
                  <ScoreBar score={t.confidenceScore} />
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="text-xs text-slate-500 px-1">Nenhum ticket neste filtro.</li>}
          </ul>
        </aside>

        {/* Col 2 — evidência + perícia */}
        <main className="rounded-xl border border-slate-800 bg-slate-900 p-4 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-white">{selected.pedido.descricaoProduto}</h2>
              <p className="text-xs text-slate-400">
                Pedido {selected.pedido.orderId} · Lote {selected.pedido.lote} · {selected.canal} · {selected.dataAbertura}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] rounded-full border border-slate-700 px-2 py-0.5 text-slate-400">
                {src === "ai" ? "Perícia: IA" : src === "fallback" ? "Perícia: motor local" : "Dado pré-validado"}
              </span>
              <Badge verdict={selected.verdict} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex items-center justify-center">
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.imagemUrl} alt="Evidência enviada pelo cliente" className="h-full w-full object-cover"
                  onError={() => setImgFailed((m) => ({ ...m, [selected.id]: true }))} />
              ) : (
                <div className="text-center text-slate-500 text-xs"><FileSearch className="mx-auto mb-1" /> Sem imagem disponível</div>
              )}
              <div className="absolute left-2 top-2 flex flex-col gap-1">
                <span className="rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">{DEFECT_LABEL[selected.visualInspection.defectType]}</span>
                <span className="rounded bg-black/70 px-2 py-0.5 text-[11px] text-slate-200">Qualidade: {selected.visualInspection.imageQuality.replace("_", " ")}</span>
                {selected.visualInspection.isManufacturingDefect && <span className="rounded bg-rose-600/90 px-2 py-0.5 text-[11px] font-semibold text-white">Defeito de fabricação</span>}
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <div className="text-[11px] text-slate-300 mb-1">Score de acurácia</div>
                <ScoreBar score={selected.confidenceScore} />
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Relato do cliente</div>
                <p className="text-slate-200 italic">“{selected.relatoCliente}”</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">Laudo técnico</div>
                <p className="text-slate-200">{selected.visualInspection.technicalReport}</p>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {selected.visualInspection.detectedFeatures.map((f) => (
                  <li key={f} className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{f}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-1 text-slate-400 mb-1"><UserRound size={13} /> Cliente (CRM)</div>
              <div className="text-slate-100 font-medium">{selected.cliente.nome}</div>
              <div className="text-slate-400">{selected.cliente.segmento} · {selected.cliente.nPedidos} pedidos · {selected.cliente.nTrocas12m} trocas/12m</div>
              <div className={selected.cliente.riscoFraude === "alto" ? "text-rose-400" : "text-emerald-400"}>Risco de fraude: {selected.cliente.riscoFraude}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-1 text-slate-400 mb-1"><Package size={13} /> Pedido (ERP)</div>
              <div className="text-slate-100 font-medium">{brl(selected.pedido.valor)}</div>
              <div className="text-slate-400">Entregue há {selected.pedido.diasAposEntrega} dia(s) · {selected.pedido.cdSeparacao}</div>
              <div className="text-slate-400">SKU {selected.pedido.sku}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-1 text-slate-400 mb-1"><Truck size={13} /> Transporte</div>
              <div className="text-slate-100 font-medium">{selected.transportadora.transportadora}</div>
              <div className="text-slate-400">{Math.round(selected.transportadora.pesoExpedicaoKg * 1000)}g → {Math.round(selected.transportadora.pesoEntregaKg * 1000)}g</div>
              <div className={selected.transportadora.sinistroAberto ? "text-rose-400" : "text-slate-400"}>
                {selected.transportadora.ressalvaRecebimento ?? "Sem ressalvas"}
              </div>
            </div>
          </div>

          {note && <p className="mt-4 text-xs text-slate-400">{note}</p>}
        </main>

        {/* Col 3 — auditoria + ação */}
        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-4 lg:max-h-[calc(100vh-330px)] lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-200">Trilha de auditoria</h2>
            <span className="text-[11px] text-slate-400 tabular-nums">{(selected.tempoProcessamentoMs / 1000).toFixed(1)}s total</span>
          </div>
          <ol className="space-y-3 border-l border-slate-800 ml-2">
            {selected.auditTrail.map((s) => (
              <li key={s.stepNumber} className="relative pl-5">
                <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 bg-slate-900 ${STEP_CLS[s.status]}`} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{s.system}</span>
                  <span className="text-[10px] text-slate-500 tabular-nums">{s.timestamp} · {s.latencyMs}ms</span>
                </div>
                <div className="text-[11px] text-slate-400">{s.action}</div>
                <div className={`text-xs mt-0.5 ${s.status === "alert" ? "text-rose-300" : s.status === "warning" ? "text-amber-300" : "text-slate-300"}`}>{s.finding}</div>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
              {selected.verdict === "AUTO_APPROVED" ? <CheckCircle2 size={14} className="text-emerald-400" /> : selected.verdict === "AUTO_REJECTED" ? <XCircle size={14} className="text-rose-400" /> : <ShieldAlert size={14} className="text-amber-400" />}
              Ação executada {selected.verdict === "HUMAN_ESCALATED" ? "(aguardando humano)" : "sozinha pelo agente"}
            </div>
            <dl className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between"><dt>ID da ação</dt><dd className="font-mono text-slate-200">{selected.executedAction.acaoId}</dd></div>
              <div className="flex justify-between"><dt>Tipo</dt><dd className="text-slate-200">{selected.executedAction.tipo.replace(/_/g, " ")}</dd></div>
              {selected.executedAction.pedidoReposicaoId && <div className="flex justify-between"><dt>Reposição</dt><dd className="font-mono text-slate-200">{selected.executedAction.pedidoReposicaoId}</dd></div>}
              {selected.executedAction.codigoPostagemReversa && <div className="flex justify-between"><dt>Logística reversa</dt><dd className="font-mono text-slate-200">{selected.executedAction.codigoPostagemReversa}</dd></div>}
            </dl>
            <div className="mt-3 text-[11px] font-semibold text-slate-400">Mensagem enviada ao cliente</div>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">{selected.executedAction.notificacaoCliente}</p>
          </div>
          {selected.batchAlertTriggered && (
            <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle size={13} className="inline mr-1" /> Caso correlacionado ao lote crítico {batch.batchId}.
            </div>
          )}
        </aside>
      </div>

      {showSim && <SimulatorModal onClose={() => setShowSim(false)} onResult={ingest} />}
    </div>
  );
}

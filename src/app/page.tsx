"use client";

import { useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, Ban, Bot, CheckCircle2, Clock, Cpu, Database, FileSearch, Lock,   ScanEye, ShieldAlert, ShieldCheck, ShieldX, Sparkles, Truck, UserRound, XCircle, Zap,
} from "lucide-react";
import {
  MOCK_BATCH_ALERT, MOCK_KPIS, MOCK_TICKETS,
  type AuditStep, type BatchAlert, type TicketCase, type VerdictType,
} from "@/data/mocks";
import SimulatorModal, { type AnalyzeResponse } from "@/components/SimulatorModal";
import GoSherlockLogo from "@/components/GoSherlockLogo";

type Filter = "todos" | VerdictType;
type Source = "ai" | "fallback" | "mock";
type Icon = typeof Zap;
const MOCK_IDS = new Set(MOCK_TICKETS.map((t) => t.id));

const VERDICT_META: Record<VerdictType, { label: string; short: string; cls: string; Icon: Icon }> = {
  AUTO_APPROVED: { label: "Aprovado automático", short: "Aprovado", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25", Icon: ShieldCheck },
  AUTO_REJECTED: { label: "Recusado automático", short: "Recusado", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/25", Icon: ShieldX },
  HUMAN_ESCALATED: { label: "Escalado p/ humano", short: "Exceção", cls: "bg-amber-400/10 text-amber-300 ring-amber-400/25", Icon: ShieldAlert },
};

const STEP_META: Record<AuditStep["status"], { ring: string; text: string }> = {
  success: { ring: "ring-emerald-400/40 bg-emerald-400/10 text-emerald-300", text: "text-slate-300" },
  warning: { ring: "ring-amber-400/40 bg-amber-400/10 text-amber-300", text: "text-amber-200" },
  alert: { ring: "ring-rose-400/40 bg-rose-400/10 text-rose-300", text: "text-rose-200" },
};

function systemIcon(system: string): Icon {
  const s = system.toLowerCase();
  if (s.startsWith("erp")) return Database;
  if (s.startsWith("crm")) return UserRound;
  if (s.startsWith("transp")) return Truck;
  if (s.startsWith("vision")) return ScanEye;
  return Bot;
}

const DEFECT_LABEL: Record<string, string> = {
  descostura_alca: "Descostura (fabricação)",
  rasgo_mau_uso: "Rasgo / mau uso",
  foto_inconclusiva: "Foto inconclusiva",
  avaria_transporte_embalagem: "Avaria de transporte",
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* Superfície de vidro com borda em gradiente fino (1px) */
const GLASS =
  "relative rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-xl shadow-2xl shadow-black/40 " +
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:p-px before:content-[''] " +
  "before:bg-gradient-to-b before:from-white/10 before:via-transparent before:to-blue-500/10 " +
  "before:[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)] before:[mask-composite:exclude]";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070B14]";

function Badge({ verdict, compact }: { verdict: VerdictType; compact?: boolean }) {
  const { label, short, cls, Icon } = VERDICT_META[verdict];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <Icon size={12} aria-hidden /> {compact ? short : label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const high = score >= 80;
  return (
    <div className="flex items-center gap-2" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Score de acurácia">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${high ? "bg-gradient-to-r from-blue-500 to-emerald-400" : "bg-gradient-to-r from-amber-500 to-amber-300"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-slate-300">{score}%</span>
    </div>
  );
}

function Kpi({ Icon, label, value, hint }: { Icon: Icon; label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2 text-[13px] text-slate-400"><Icon size={14} className="text-blue-400" aria-hidden /> {label}</div>
      <div className="text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</div>
      <div className="min-h-4 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function PanelTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-slate-100">{children}</h2>
      {aside}
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
  const [meta, setMeta] = useState<Record<string, { model?: string | null; reason?: string }>>({});
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
    setMeta((m) => ({ ...m, [r.ticket.id]: { model: r.model, reason: r.fallbackReason } }));
    setSelectedId(r.ticket.id);
    setFilter("todos");
    setNote(source === "ai" ? "" : `IA não utilizada — motor local acionado (${r.fallbackReason ?? "AI Proxy indisponível"}).`);
    if (r.ticket.batchAlertTriggered) setBatch((b) => ({ ...b, totalCasosDetectados: b.totalCasosDetectados + 1 }));
  }

  const src = sources[selected.id] ?? "mock";
  const blocked = batch.status === "bloqueado_no_erp";
  const showImg = selected.imagemUrl && !imgFailed[selected.id];
  const vision = selected.auditTrail.find((a) => a.system.startsWith("Vision"));
  const rootCause = selected.visualInspection.isManufacturingDefect
    ? "Defeito de fabricação"
    : DEFECT_LABEL[selected.visualInspection.defectType];
  const verdictText = VERDICT_META[selected.verdict].label;

  const filters: [Filter, string][] = [
    ["todos", "Todos"], ["AUTO_APPROVED", "Aprovados"], ["AUTO_REJECTED", "Recusados"], ["HUMAN_ESCALATED", "Exceções"],
  ];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#070B14] text-slate-200">
      {/* Atmosfera: dois halos distantes, sem competir com o conteúdo */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(37,99,235,0.14),transparent),radial-gradient(45%_50%_at_85%_0%,rgba(16,185,129,0.09),transparent)]" />

      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <GoSherlockLogo size="md" showTagline={true} />
          <button
            onClick={() => setShowSim(true)}
            className={`group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2.5 text-[15px] font-semibold text-slate-950 shadow-lg shadow-blue-500/25 transition duration-200 hover:shadow-emerald-400/30 hover:brightness-110 active:scale-[0.98] ${FOCUS}`}
          >
            <Sparkles size={16} aria-hidden className="transition-transform duration-300 group-hover:rotate-12" /> Simular novo ticket ao vivo
          </button>
        </header>

        {/* KPIs: uma faixa única, divisores finos em vez de cinco cards */}
        <section aria-label="Indicadores executivos" className={`${GLASS} mb-5 grid grid-cols-2 divide-slate-800/80 lg:grid-cols-4 lg:divide-x`}>
          <Kpi Icon={Zap} label="Autonomia Zero-Touch" value={`${MOCK_KPIS.taxaAutonomiaZeroTouch}%`} hint={`${MOCK_KPIS.ticketsProcessadosTotal} tickets processados`} />
          <Kpi Icon={Activity} label="Acurácia média" value={`${MOCK_KPIS.acuraciaScoreMedio}%`} hint="score de confiança" />
          <Kpi Icon={Clock} label="Tempo médio" value={`${MOCK_KPIS.tempoMedioSegundos}s`} hint="vs 15–20 min manual" />
          <Kpi Icon={ShieldCheck} label="Fraudes evitadas" value={brl(MOCK_KPIS.fraudesEvitadasValor)} hint={`${MOCK_KPIS.escalonadosExcecao} exceções p/ humano`} />
        </section>

        {/* Alerta de lote */}
        <section
          role="alert"
          className={`mb-5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 backdrop-blur-xl ${blocked ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-amber-400/30 bg-amber-400/[0.07]"}`}
        >
          <span className={blocked ? "text-emerald-300" : "text-amber-300"}>
            {blocked ? <Lock size={16} aria-hidden /> : <AlertTriangle size={16} aria-hidden />}
          </span>
          <p className="min-w-[260px] flex-1 text-[15px] text-slate-300">
            <span className="font-semibold text-white">
              {blocked ? `Lote ${batch.batchId} bloqueado no ERP` : `Lote crítico ${batch.batchId}`}
            </span>
            <span className="text-slate-400"> · {batch.totalCasosDetectados} casos (+{batch.taxaAumentoPct}%) · {batch.defeitoPredominante}. {blocked ? "Expedição suspensa." : ""}</span>
          </p>
          {!blocked && (
            <button
              onClick={() => setBatch((b) => ({ ...b, status: "bloqueado_no_erp" }))}
              className={`inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[15px] font-semibold text-amber-200 transition duration-200 hover:bg-amber-400/20 active:scale-[0.98] ${FOCUS}`}
            >
              <Ban size={16} aria-hidden /> Bloquear lote no ERP
            </button>
          )}
        </section>

        {/* 3 colunas */}
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)_380px]">
          {/* Col 1 — fila */}
          <aside className={`${GLASS} flex flex-col gap-4 p-4 lg:max-h-[calc(100vh-2.5rem)] lg:sticky lg:top-5`}>
            <PanelTitle aside={<span className="text-xs tabular-nums text-slate-500">{visible.length} de {tickets.length}</span>}>Fila de execuções</PanelTitle>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por veredito">
              {filters.map(([k, l]) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={filter === k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-2.5 py-1 text-[13px] font-medium transition duration-200 ${FOCUS} ${filter === k ? "bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-400/40" : "text-slate-400 ring-1 ring-inset ring-slate-800 hover:text-slate-200 hover:ring-slate-600"}`}
                >
                  {l} <span className="tabular-nums opacity-70">{counts[k]}</span>
                </button>
              ))}
            </div>
            <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
              {visible.map((t) => {
                const active = t.id === selected.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      aria-current={active}
                      className={`w-full rounded-xl border p-3.5 text-left transition duration-200 ease-out ${FOCUS} ${active
                        ? "border-blue-400/50 bg-gradient-to-br from-blue-500/[0.12] to-emerald-400/[0.05] shadow-lg shadow-blue-500/10"
                        : "border-slate-800/80 bg-slate-950/40 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900/70"}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          {!MOCK_IDS.has(t.id) ? <span className="text-emerald-300">AO VIVO</span> : t.conversationId}
                        </span>
                        <Badge verdict={t.verdict} compact />
                      </div>
                      <div className="truncate text-[15px] font-medium text-white">{t.pedido.descricaoProduto}</div>
                      <div className="mb-3 mt-0.5 truncate text-[13px] text-slate-400">{t.cliente.nome} · {DEFECT_LABEL[t.visualInspection.defectType]}</div>
                      <ScoreBar score={t.confidenceScore} />
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-1 py-6 text-center text-[13px] text-slate-500">Nenhum ticket neste filtro.</li>}
            </ul>
          </aside>

          {/* Col 2 — evidência + raio-X */}
          <main className={`${GLASS} min-w-0 p-5 sm:p-6`}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-white">{selected.pedido.descricaoProduto}</h2>
                <p className="mt-1 text-[13px] text-slate-400">
                  {selected.cliente.nome} · {brl(selected.pedido.valor)} · Pedido {selected.pedido.orderId} · Lote {selected.pedido.lote}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${src === "ai" ? "bg-blue-500/10 font-medium text-blue-200 ring-blue-400/30" : "text-slate-400 ring-slate-700"}`}>
                {src === "ai" && <Cpu size={12} aria-hidden />}
                {src === "ai" ? `Perícia por IA real · ${meta[selected.id]?.model ?? "AI Proxy"} · ${((vision?.latencyMs ?? 0) / 1000).toFixed(1)}s` : src === "fallback" ? "Perícia: motor local" : "Dado pré-validado"}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Foto com moldura e zoom suave */}
              <figure className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950 p-1 ring-1 ring-inset ring-slate-800 transition duration-300 hover:ring-blue-400/40">
                <div className="relative h-full w-full overflow-hidden rounded-lg">
                  {showImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.imagemUrl}
                      alt="Evidência enviada pelo cliente"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      onError={() => setImgFailed((m) => ({ ...m, [selected.id]: true }))}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-[13px] text-slate-500"><FileSearch aria-hidden /> Sem imagem disponível</div>
                  )}
                  <span className="absolute left-2.5 top-2.5 rounded-md bg-slate-950/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md">{DEFECT_LABEL[selected.visualInspection.defectType]}</span>
                </div>
              </figure>

              {/* Resumo executivo */}
              <div className="flex flex-col gap-4">
                <h3 className="text-[15px] font-semibold text-slate-100">Resumo executivo</h3>
                <dl className="space-y-4 text-[15px]">
                  <div>
                    <dt className="text-[13px] text-slate-400">Causa raiz</dt>
                    <dd className="mt-0.5 font-medium text-white">{rootCause}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-slate-400">Veredito</dt>
                    <dd className="mt-1"><Badge verdict={selected.verdict} /></dd>
                    <span className="sr-only">{verdictText}</span>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-blue-500/[0.10] to-emerald-400/[0.06] px-4 py-3 ring-1 ring-inset ring-blue-400/25">
                    <dt className="text-[13px] text-slate-400">Confiança da IA</dt>
                    <dd className="mt-0.5 text-4xl font-semibold tracking-tight text-white tabular-nums">{selected.confidenceScore}%</dd>
                    <div className="mt-2"><ScoreBar score={selected.confidenceScore} /></div>
                  </div>
                </dl>
                <p className="text-[13px] italic leading-relaxed text-slate-400">“{selected.relatoCliente}”</p>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="mb-2 text-[15px] font-semibold text-slate-100">Laudo técnico</h3>
              <p className="max-w-[70ch] text-[15px] leading-relaxed text-slate-300">{selected.visualInspection.technicalReport}</p>
            </div>

            {note && <p className="mt-5 rounded-lg bg-amber-400/[0.07] px-3 py-2 text-[13px] text-amber-300 ring-1 ring-inset ring-amber-400/25">{note}</p>}
          </main>

          {/* Col 3 — auditoria + ação */}
          <aside className={`${GLASS} flex flex-col gap-5 p-5 lg:max-h-[calc(100vh-2.5rem)] lg:sticky lg:top-5 lg:overflow-y-auto`}>
            <PanelTitle aside={<span className="text-xs tabular-nums text-slate-500">{(selected.tempoProcessamentoMs / 1000).toFixed(1)}s total</span>}>Trilha de auditoria</PanelTitle>

            <ol className="relative space-y-5">
              <span aria-hidden className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-blue-400/40 via-slate-700/60 to-emerald-400/40" />
              {selected.auditTrail.map((s) => {
                const SI = systemIcon(s.system);
                const m = STEP_META[s.status];
                return (
                  <li key={s.stepNumber} className="relative flex gap-3.5">
                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${m.ring}`}>
                      <SI size={15} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-white">{s.system}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">{s.latencyMs}ms</span>
                      </div>
                      <div className={`mt-0.5 text-[13px] leading-relaxed ${m.text}`}>{s.finding}</div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Decisão autônoma */}
            <div className="rounded-xl bg-gradient-to-br from-blue-500/[0.10] to-emerald-400/[0.06] p-4 ring-1 ring-inset ring-blue-400/25">
              <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-white">
                {selected.verdict === "AUTO_APPROVED" ? <CheckCircle2 size={16} className="text-emerald-300" aria-hidden /> : selected.verdict === "AUTO_REJECTED" ? <XCircle size={16} className="text-rose-300" aria-hidden /> : <ShieldAlert size={16} className="text-amber-300" aria-hidden />}
                {selected.verdict === "HUMAN_ESCALATED" ? "Ação pendente (aguardando humano)" : "Ação executada pelo agente"}
              </div>
              <dl className="space-y-1.5 text-[13px] text-slate-400">
                <div className="flex justify-between gap-3"><dt>ID da ação</dt><dd className="font-mono text-slate-200">{selected.executedAction.acaoId}</dd></div>
                <div className="flex justify-between gap-3"><dt>Tipo</dt><dd className="text-right text-slate-200">{selected.executedAction.tipo.replace(/_/g, " ")}</dd></div>
                {selected.executedAction.pedidoReposicaoId && <div className="flex justify-between gap-3"><dt>Reposição</dt><dd className="font-mono text-slate-200">{selected.executedAction.pedidoReposicaoId}</dd></div>}
                {selected.executedAction.codigoPostagemReversa && <div className="flex justify-between gap-3"><dt>Logística reversa</dt><dd className="font-mono text-slate-200">{selected.executedAction.codigoPostagemReversa}</dd></div>}
              </dl>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-slate-400">Mensagem enviada ao cliente <ArrowUpRight size={12} aria-hidden /></div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{selected.executedAction.notificacaoCliente}</p>
            </div>

            {selected.batchAlertTriggered && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-400/[0.07] p-3 text-[13px] text-amber-200 ring-1 ring-inset ring-amber-400/25">
                <AlertTriangle size={14} className="mt-px shrink-0" aria-hidden /> Caso correlacionado ao lote crítico {batch.batchId}.
              </div>
            )}
          </aside>
        </div>

        {showSim && <SimulatorModal onClose={() => setShowSim(false)} onResult={ingest} />}
      </div>
    </div>
  );
}

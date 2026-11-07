"use client";

import { useEffect, useState } from "react";
import { Check, Database, Loader2, Play, ScanEye, Truck, Upload, UserRound, X } from "lucide-react";
import type { TicketCase } from "@/data/mocks";

export interface AnalyzeResponse {
  success: boolean;
  source: "gogroup_ai_proxy" | "local_deterministic_engine";
  model?: string | null;
  fallbackReason?: string;
  ticket: TicketCase;
  error?: string;
}

interface Props {
  onClose: () => void;
  onResult: (r: AnalyzeResponse) => void;
}

const PRESETS = [
  { label: "Descostura na alça (fabricação)", relato: "A alça da minha bolsa descosturou inteira na primeira vez que usei, a linha soltou da costura.", dias: 3 },
  { label: "Rasgo por objeto cortante", relato: "O tecido rasgou do nada, tem um corte no meio da necessaire. Quero outra.", dias: 20 },
  { label: "Caixa amassada pela transportadora", relato: "A caixa chegou toda amassada e rasgada pelo entregador, a bolsa veio esmagada.", dias: 2 },
  { label: "Foto desfocada", relato: "O porta cartão veio descosturado mas a foto ficou borrada, desculpa.", dias: 2 },
];

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";
const inputCls = `w-full rounded-lg bg-slate-950/60 border border-slate-700/80 px-3 py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 transition focus:border-blue-400/60 ${FOCUS}`;
const labelCls = "block text-[13px] font-medium text-slate-400 mb-1.5";

const STEPS = [
  { Icon: Database, label: "ERP: pedido, lote e garantia" },
  { Icon: UserRound, label: "CRM: histórico e risco de fraude" },
  { Icon: Truck, label: "Transportadora: rastreio e pesagem" },
  { Icon: ScanEye, label: "Vision AI: perícia da foto" },
];

export default function SimulatorModal({ onClose, onResult }: Props) {
  const [relato, setRelato] = useState(PRESETS[0].relato);
  const [dias, setDias] = useState(PRESETS[0].dias);
  const [produto, setProduto] = useState("Tote Bag Daily Personalizada Nome");
  const [lote, setLote] = useState("LT2609-B");
  const [risco, setRisco] = useState<"baixo" | "medio" | "alto">("baixo");
  const [ressalva, setRessalva] = useState("");
  const [imagem, setImagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);

  // Avança a checklist visual enquanto a análise roda; o último passo (Vision) espera a resposta real.
  useEffect(() => {
    if (!loading) { setStep(0); return; }
    const id = setInterval(() => setStep((n) => Math.min(n + 1, STEPS.length - 1)), 1400);
    return () => clearInterval(id);
  }, [loading]);

  function applyPreset(i: number) {
    setRelato(PRESETS[i].relato);
    setDias(PRESETS[i].dias);
    setRessalva(i === 2 ? "Embalagem amassada com rasgadura na triagem" : "");
  }

  // Reduz a foto no navegador (lado maior 1280px, JPEG): fotos de celular passam de 5 MB e deixariam a IA lenta.
  function onFile(file?: File) {
    if (!file) return;
    setError("");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      setImagem(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("Não foi possível ler essa imagem.");
    };
    img.src = url;
  }

  async function submit() {
    setLoading(true);
    setError("");
    const body = {
      relatoCliente: relato,
      imagemUrl: imagem || undefined,
      produtoNome: produto,
      lote,
      diasAposEntrega: dias,
      riscoCliente: risco,
      historicoTrocas: risco === "alto" ? 3 : 0,
      ressalvaTransportadora: ressalva,
    };
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
      onResult(data as AnalyzeResponse);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao analisar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B14]/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="sim-title" className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id="sim-title" className="text-xl font-semibold tracking-tight text-white">Simular novo ticket ao vivo</h2>
            <p className="mt-1 text-[13px] text-slate-400">O agente cruza ERP, transportadora e CRM, pericia a foto e executa a ação sozinho.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className={`rounded-md p-1 text-slate-400 transition hover:text-white ${FOCUS}`}><X size={20} /></button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => applyPreset(i)} className={`rounded-full border border-slate-700/80 bg-slate-800/50 px-3 py-1.5 text-[13px] text-slate-200 transition hover:border-blue-400/50 hover:bg-blue-500/10 ${FOCUS}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>Relato do cliente</label>
            <textarea className={inputCls} rows={3} value={relato} onChange={(e) => setRelato(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Produto</label>
            <input className={inputCls} value={produto} onChange={(e) => setProduto(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Lote (LT2609-B dispara o alerta)</label>
            <input className={inputCls} value={lote} onChange={(e) => setLote(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Dias após a entrega</label>
            <input type="number" min={0} className={inputCls} value={dias} onChange={(e) => setDias(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Risco de fraude (CRM)</label>
            <select className={inputCls} value={risco} onChange={(e) => setRisco(e.target.value as typeof risco)}>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Ressalva da transportadora (opcional)</label>
            <input className={inputCls} value={ressalva} onChange={(e) => setRessalva(e.target.value)} placeholder="Ex.: Embalagem amassada na triagem" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Foto da avaria (URL ou upload)</label>
            <div className="flex gap-2">
              <input className={inputCls} value={imagem.startsWith("data:") ? "(imagem enviada)" : imagem} onChange={(e) => setImagem(e.target.value)} placeholder="https://..." />
              <label className="shrink-0 inline-flex items-center gap-1 px-3 rounded-lg bg-slate-800/60 border border-slate-700/80 text-[13px] cursor-pointer transition hover:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-400/70">
                <Upload size={14} /> Enviar
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
            {imagem ? (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem} alt="Pré-visualização" className="h-16 w-16 rounded-lg object-cover border border-slate-700" />
                <span className="text-[13px] text-emerald-300">A IA vai periciar esta foto.</span>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-amber-300">Sem foto, a IA não é chamada: o motor local decide só pelo relato.</p>
            )}
          </div>
        </div>

        {loading && (
          <ol className="mt-5 space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4" aria-live="polite">
            {STEPS.map(({ Icon, label }, i) => {
              const done = i < step, active = i === step;
              return (
                <li key={label} className={`flex items-center gap-3 text-[15px] transition-colors duration-300 ${done ? "text-emerald-300" : active ? "text-white" : "text-slate-500"}`}>
                  <span className="flex h-6 w-6 items-center justify-center">
                    {done ? <Check size={16} /> : active ? <Loader2 size={16} className="animate-spin text-blue-300" /> : <Icon size={16} />}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>
        )}

        {error && <p role="alert" className="mt-3 text-[15px] text-rose-300">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || relato.trim().length < 5}
          className={`mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-400 py-3 text-[15px] font-semibold text-slate-950 shadow-lg shadow-blue-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none ${FOCUS}`}
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> {imagem ? "IA periciando a foto… (até 10s)" : "Agente analisando…"}</> : <><Play size={16} /> Processar ticket</>}
        </button>
      </div>
    </div>
  );
}

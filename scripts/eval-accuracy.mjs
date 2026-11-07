// Mede a acurácia REAL da perícia visual: roda fotos rotuladas pela rota /api/analyze e compara
// o tipo de defeito devolvido pela IA com o rótulo verdadeiro.
//
// Uso:  1) npm run dev            (em outro terminal, com AI_PROXY_TOKEN no .env.local)
//       2) crie eval/cases.json   (veja eval/cases.example.json) e coloque as fotos em eval/images/
//       3) npm run eval
// Saída: src/data/eval-results.json (lido pelo KPI do dashboard) e uma tabela no terminal.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const BASE = process.env.EVAL_BASE_URL || "http://localhost:3000";
const CASES = join(ROOT, "eval", "cases.json");
const OUT = join(ROOT, "src", "data", "eval-results.json");
const TYPES = ["descostura_alca", "rasgo_mau_uso", "avaria_transporte_embalagem", "foto_inconclusiva"];
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

if (!existsSync(CASES)) {
  console.error("eval/cases.json não encontrado. Copie eval/cases.example.json e preencha com suas fotos rotuladas.");
  process.exit(1);
}
const cases = JSON.parse(readFileSync(CASES, "utf8"));
for (const c of cases) {
  if (!TYPES.includes(c.expected)) { console.error(`Caso ${c.id}: 'expected' deve ser um de ${TYPES.join(", ")}`); process.exit(1); }
  if (!existsSync(join(ROOT, "eval", "images", c.file))) { console.error(`Caso ${c.id}: arquivo eval/images/${c.file} não existe`); process.exit(1); }
}

function toDataUrl(file) {
  let path = join(ROOT, "eval", "images", file);
  const ext = extname(file).toLowerCase();
  if (!MIME[ext]) throw new Error(`Formato não suportado: ${file}`);
  try { // reduz para 1280px (igual ao navegador); sem sips, envia o original
    const tmp = join(tmpdir(), `eval-${Date.now()}-${file}`.replace(/[^\w.-]/g, "_"));
    execFileSync("sips", ["-Z", "1280", path, "--out", tmp], { stdio: "ignore" });
    path = tmp;
  } catch {}
  return `data:${MIME[ext]};base64,${readFileSync(path).toString("base64")}`;
}

const rows = [];
for (const c of cases) {
  const t0 = Date.now();
  let row = { id: c.id, expected: c.expected, got: null, ok: false, source: null, confidence: null, ms: 0, error: null };
  try {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // relato neutro de propósito: mede a foto, não as palavras do cliente
        relatoCliente: c.relato || "Cliente relata avaria no produto.",
        imagemUrl: toDataUrl(c.file),
        diasAposEntrega: 3,
        riscoCliente: "baixo",
        forceFallback: false,
      }),
      signal: AbortSignal.timeout(40_000),
    });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`);
    row = { ...row, got: data.ticket.visualInspection.defectType, source: data.source, confidence: data.ticket.confidenceScore, model: data.model ?? null };
    row.ok = row.got === c.expected;
  } catch (e) {
    row.error = e instanceof Error ? e.message : String(e);
  }
  row.ms = Date.now() - t0;
  rows.push(row);
  console.log(`${row.ok ? "OK  " : "ERRO"} ${c.id.padEnd(18)} esperado=${c.expected.padEnd(28)} obtido=${String(row.got).padEnd(28)} ${row.source ?? row.error} ${(row.ms / 1000).toFixed(1)}s`);
}

// Só conta como medida da IA o que foi respondido pela IA real; fallback e falhas ficam de fora e são reportados.
const valid = rows.filter((r) => r.source === "gogroup_ai_proxy");
const correct = valid.filter((r) => r.ok).length;
const perClass = Object.fromEntries(TYPES.map((t) => {
  const v = valid.filter((r) => r.expected === t);
  return [t, { n: v.length, correct: v.filter((r) => r.ok).length }];
}));
const result = {
  n: valid.length,
  correct,
  accuracy: valid.length ? Math.round((correct / valid.length) * 1000) / 10 : null,
  excluded: rows.length - valid.length,
  perClass,
  avgSeconds: valid.length ? Math.round(valid.reduce((a, r) => a + r.ms, 0) / valid.length / 100) / 10 : null,
  model: valid.find((r) => r.model)?.model ?? null,
  measuredAt: new Date().toISOString().slice(0, 10),
  errors: valid.filter((r) => !r.ok).map(({ id, expected, got, confidence }) => ({ id, expected, got, confidence })),
};
if (result.excluded > 0 && !process.argv.includes("--allow-partial")) {
  console.error(`\nMedição INCOMPLETA: ${result.excluded} caso(s) caíram no fallback ou deram erro (provável timeout da IA). Nada foi gravado; rode de novo (ou use --allow-partial).`);
  process.exit(2);
}
writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`\nAcurácia: ${result.accuracy ?? "n/d"}% (${correct} de ${valid.length} fotos)${result.excluded ? ` · ${result.excluded} caso(s) fora da conta (fallback/erro)` : ""}`);
console.log(`Gravado em src/data/eval-results.json`);

import { component$, useStore, $ } from "@builder.io/qwik";
import {
  ETAPAS, RAMOS, SEGURADORAS, avancar, brl, comissao, diasAte, faixa, renovar, resumo, seed,
  type Apolice, type Db, type Ramo,
} from "./data";

const KEY = "ancora-crm-v1";
const load = (): Db => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* dado corrompido: recomeça com a base fictícia */
  }
  return seed();
};
const save = (db: Db) => localStorage.setItem(KEY, JSON.stringify(db));
const hoje = new Date();

type View = "painel" | "apolices" | "renovacoes" | "sinistros";
const NAV: { id: View; label: string; icon: string }[] = [
  { id: "painel", label: "Painel", icon: "M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z" },
  { id: "apolices", label: "Apólices", icon: "M6 2h9l5 5v15H6zm8 1.5V8h4.5M9 13h8M9 17h8" },
  { id: "renovacoes", label: "Renovações", icon: "M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" },
  { id: "sinistros", label: "Sinistros", icon: "M12 3l9 16H3zM12 10v4M12 17h.01" },
];
const FAIXA_TXT: Record<string, string> = { vencida: "Vencida", "30": "até 30 dias", "60": "31–60 dias", "90": "61–90 dias", ok: "em dia" };

const Icon = (p: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={p.d} /></svg>
);

export const App = component$(() => {
  const s = useStore({
    db: load(), view: "painel" as View, q: "", ramo: "" as Ramo | "",
    novo: false, f: { clienteId: "c1", ramo: "Auto" as Ramo, seguradora: SEGURADORAS[0], premio: "2400", fim: "" },
  });
  const nomeCli = (id: string) => s.db.clientes.find((c) => c.id === id)?.nome ?? "—";
  const apo = (id: string) => s.db.apolices.find((a) => a.id === id);
  const r = resumo(s.db, hoje);
  const max = Math.max(...r.porRamo.map((x) => x.premio), 1);

  const lista = s.db.apolices
    .filter((a) => (!s.ramo || a.ramo === s.ramo) && (nomeCli(a.clienteId) + a.numero).toLowerCase().includes(s.q.toLowerCase()))
    .sort((a, b) => a.fim.localeCompare(b.fim));

  const proximas = [...s.db.apolices].sort((a, b) => a.fim.localeCompare(b.fim)).filter((a) => diasAte(a.fim, hoje) <= 90);

  const Row = (a: Apolice) => {
    const d = diasAte(a.fim, hoje);
    return (
      <li class="ren" key={a.id}>
        <div>
          <strong>{nomeCli(a.clienteId)}</strong>
          <span class="muted">{a.ramo} · {a.seguradora} · {a.numero}</span>
        </div>
        <span class={"pill f" + faixa(d)}>{d < 0 ? `venceu há ${-d} d` : `${d} dias`}</span>
        <button class="btn sm" onClick$={() => { s.db = renovar(s.db, a.id); save(s.db); }}>Renovar</button>
      </li>
    );
  };

  return (
    <div class="shell">
      <aside class="side">
        <div class="brand">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#e8b04a" /><g fill="none" stroke="#12304a" stroke-width="2.4" stroke-linecap="round"><circle cx="16" cy="9" r="2.6" /><path d="M16 12v13M10 16h12M7 20c1 4 5 6 9 6s8-2 9-6" /></g></svg>
          <div><b>Âncora</b><small>Corretora de seguros</small></div>
        </div>
        <nav aria-label="Principal">
          {NAV.map((n) => (
            <button key={n.id} class={{ on: s.view === n.id }} onClick$={() => (s.view = n.id)} aria-current={s.view === n.id ? "page" : undefined}>
              <Icon d={n.icon} /><span>{n.label}</span>
              {n.id === "renovacoes" && <em>{r.ren.vencida + r.ren["30"]}</em>}
            </button>
          ))}
        </nav>
        <p class="demo">Demo com dados fictícios, salvos só neste navegador.</p>
        <button class="reset" onClick$={() => { s.db = seed(); save(s.db); }}>Restaurar dados de exemplo</button>
      </aside>

      <main>
        <header class="top">
          <h1>{NAV.find((n) => n.id === s.view)!.label}</h1>
          <span class="tag">Dados fictícios</span>
        </header>

        {s.view === "painel" && (
          <>
            <section class="kpis">
              <div class="card"><span>Prêmio da carteira</span><b>{brl(r.premio)}</b><small>{s.db.apolices.length} apólices ativas</small></div>
              <div class="card"><span>Comissão anual prevista</span><b>{brl(r.com)}</b><small>média {(r.com / r.premio * 100).toFixed(1)}%</small></div>
              <div class="card warn"><span>Renovam em 30 dias</span><b>{r.ren["30"] + r.ren.vencida}</b><small>{r.ren.vencida} já vencida(s)</small></div>
              <div class="card"><span>Sinistros em curso</span><b>{r.abertos}</b><small>{brl(r.valorAberto)} reclamados</small></div>
            </section>
            <section class="grid2">
              <div class="panel">
                <h2>Prêmio por ramo</h2>
                <div class="bars">
                  {r.porRamo.map((x) => (
                    <div class="bar" key={x.ramo}>
                      <span>{x.ramo}</span>
                      <i style={{ width: `${(x.premio / max) * 100}%` }} />
                      <b>{brl(x.premio)}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div class="panel">
                <h2>Próximas renovações</h2>
                <ul class="list">{proximas.slice(0, 5).map(Row)}</ul>
              </div>
            </section>
          </>
        )}

        {s.view === "apolices" && (
          <section class="panel">
            <div class="tools">
              <input type="search" placeholder="Buscar cliente ou número" aria-label="Buscar" value={s.q} onInput$={(_, el) => (s.q = el.value)} />
              <select aria-label="Filtrar por ramo" value={s.ramo} onChange$={(_, el) => (s.ramo = el.value as Ramo | "")}>
                <option value="">Todos os ramos</option>
                {RAMOS.map((x) => <option key={x}>{x}</option>)}
              </select>
              <button class="btn" onClick$={() => (s.novo = !s.novo)}>{s.novo ? "Fechar" : "Nova apólice"}</button>
            </div>
            {s.novo && (
              <form class="form" preventdefault:submit onSubmit$={() => {
                const n = s.db.apolices.length + 1;
                s.db = { ...s.db, apolices: [...s.db.apolices, {
                  id: "a" + Date.now(), numero: `ANC-${3000 + n}-${n}`, clienteId: s.f.clienteId, ramo: s.f.ramo,
                  seguradora: s.f.seguradora, premio: Math.max(0, Number(s.f.premio) || 0), comissaoPct: 15,
                  fim: s.f.fim || new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
                }] };
                save(s.db); s.novo = false;
              }}>
                <label>Cliente<select value={s.f.clienteId} onChange$={(_, el) => (s.f.clienteId = el.value)}>{s.db.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></label>
                <label>Ramo<select value={s.f.ramo} onChange$={(_, el) => (s.f.ramo = el.value as Ramo)}>{RAMOS.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label>Seguradora<select value={s.f.seguradora} onChange$={(_, el) => (s.f.seguradora = el.value)}>{SEGURADORAS.map((x) => <option key={x}>{x}</option>)}</select></label>
                <label>Prêmio anual (R$)<input type="number" min="0" value={s.f.premio} onInput$={(_, el) => (s.f.premio = el.value)} /></label>
                <label>Vencimento<input type="date" value={s.f.fim} onInput$={(_, el) => (s.f.fim = el.value)} /></label>
                <button class="btn" type="submit">Salvar apólice</button>
              </form>
            )}
            <div class="tablewrap">
              <table>
                <thead><tr><th>Apólice</th><th>Cliente</th><th>Ramo</th><th>Prêmio</th><th>Comissão</th><th>Vence</th></tr></thead>
                <tbody>
                  {lista.map((a) => {
                    const d = diasAte(a.fim, hoje);
                    return (
                      <tr key={a.id}>
                        <td data-l="Apólice"><b>{a.numero}</b><small>{a.seguradora}</small></td>
                        <td data-l="Cliente">{nomeCli(a.clienteId)}</td>
                        <td data-l="Ramo">{a.ramo}</td>
                        <td data-l="Prêmio">{brl(a.premio)}</td>
                        <td data-l="Comissão">{brl(comissao(a))}</td>
                        <td data-l="Vence"><span class={"pill f" + faixa(d)}>{a.fim.split("-").reverse().join("/")}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lista.length === 0 && <p class="empty">Nenhuma apólice encontrada.</p>}
            </div>
          </section>
        )}

        {s.view === "renovacoes" && (
          <section class="cols">
            {(["vencida", "30", "60", "90"] as const).map((fx) => {
              const itens = proximas.filter((a) => faixa(diasAte(a.fim, hoje)) === fx);
              return (
                <div class="panel" key={fx}>
                  <h2>{FAIXA_TXT[fx]} <em>{itens.length}</em></h2>
                  <ul class="list">{itens.map(Row)}</ul>
                  {itens.length === 0 && <p class="empty">Nada por aqui.</p>}
                </div>
              );
            })}
          </section>
        )}

        {s.view === "sinistros" && (
          <section class="cols">
            {[...ETAPAS, "Negado" as const].map((et) => {
              const itens = s.db.sinistros.filter((x) => x.etapa === et);
              return (
                <div class="panel" key={et}>
                  <h2>{et} <em>{itens.length}</em></h2>
                  <ul class="list">
                    {itens.map((x) => (
                      <li class="sin" key={x.id}>
                        <strong>{x.descricao}</strong>
                        <span class="muted">{nomeCli(apo(x.apoliceId)?.clienteId ?? "")} · {apo(x.apoliceId)?.numero}</span>
                        <div class="row"><b>{brl(x.valor)}</b>
                          {et !== "Pago" && et !== "Negado" && (
                            <button class="btn sm" onClick$={$(() => { s.db = avancar(s.db, x.id); save(s.db); })}>Avançar</button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {itens.length === 0 && <p class="empty">Nenhum sinistro.</p>}
                </div>
              );
            })}
          </section>
        )}
      </main>

      <nav class="tabbar" aria-label="Navegação móvel">
        {NAV.map((n) => (
          <button key={n.id} class={{ on: s.view === n.id }} onClick$={() => (s.view = n.id)}><Icon d={n.icon} /><span>{n.label}</span></button>
        ))}
      </nav>
    </div>
  );
});

export type Ramo = "Auto" | "Residencial" | "Vida" | "Empresarial" | "Saúde" | "Viagem";
export interface Cliente { id: string; nome: string; cidade: string; tel: string }
export interface Apolice {
  id: string; numero: string; clienteId: string; ramo: Ramo; seguradora: string;
  premio: number; comissaoPct: number; fim: string;
}
export type EtapaSinistro = "Aberto" | "Em análise" | "Aprovado" | "Pago" | "Negado";
export interface Sinistro {
  id: string; apoliceId: string; descricao: string; valor: number; data: string; etapa: EtapaSinistro;
}
export interface Db { clientes: Cliente[]; apolices: Apolice[]; sinistros: Sinistro[] }

export const RAMOS: Ramo[] = ["Auto", "Residencial", "Vida", "Empresarial", "Saúde", "Viagem"];
export const ETAPAS: EtapaSinistro[] = ["Aberto", "Em análise", "Aprovado", "Pago"];
export const SEGURADORAS = ["Porto Fictício", "Mar Azul Seguros", "Aurora Vida", "Norte Garantia", "Cedro Seguradora"];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const DAY = 86400000;
export const addDays = (base: Date, d: number) => new Date(base.getTime() + d * DAY).toISOString().slice(0, 10);
export const diasAte = (iso: string, hoje: Date) =>
  Math.round((new Date(iso + "T00:00:00Z").getTime() - Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / DAY);

export type Faixa = "vencida" | "30" | "60" | "90" | "ok";
export function faixa(dias: number): Faixa {
  if (dias < 0) return "vencida";
  if (dias <= 30) return "30";
  if (dias <= 60) return "60";
  if (dias <= 90) return "90";
  return "ok";
}
export const comissao = (a: Apolice) => (a.premio * a.comissaoPct) / 100;

export function resumo(db: Db, hoje: Date) {
  const premio = db.apolices.reduce((s, a) => s + a.premio, 0);
  const com = db.apolices.reduce((s, a) => s + comissao(a), 0);
  const ren: Record<Faixa, number> = { vencida: 0, "30": 0, "60": 0, "90": 0, ok: 0 };
  for (const a of db.apolices) ren[faixa(diasAte(a.fim, hoje))]++;
  const abertos = db.sinistros.filter((s) => s.etapa !== "Pago" && s.etapa !== "Negado");
  const porRamo = RAMOS.map((r) => ({
    ramo: r, premio: db.apolices.filter((a) => a.ramo === r).reduce((s, a) => s + a.premio, 0),
  }));
  return { premio, com, ren, abertos: abertos.length, valorAberto: abertos.reduce((s, x) => s + x.valor, 0), porRamo };
}

/** Renova: vencimento +1 ano e reajuste de 6% no prêmio. */
export function renovar(db: Db, id: string): Db {
  return {
    ...db,
    apolices: db.apolices.map((a) => {
      if (a.id !== id) return a;
      const d = new Date(a.fim + "T00:00:00Z");
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      return { ...a, fim: d.toISOString().slice(0, 10), premio: Math.round(a.premio * 1.06) };
    }),
  };
}

export function avancar(db: Db, id: string): Db {
  return {
    ...db,
    sinistros: db.sinistros.map((s) => {
      if (s.id !== id) return s;
      const i = ETAPAS.indexOf(s.etapa);
      return i >= 0 && i < ETAPAS.length - 1 ? { ...s, etapa: ETAPAS[i + 1] } : s;
    }),
  };
}

export function seed(hoje = new Date()): Db {
  const nomes: [string, string][] = [
    ["Helena Marques", "Curitiba"], ["Rodrigo Tavares", "Londrina"], ["Padaria Estrela Ltda", "Maringá"],
    ["Beatriz Nogueira", "Curitiba"], ["Oficina Três Irmãos", "São José dos Pinhais"], ["Caio Ferraz", "Ponta Grossa"],
    ["Lívia Andrade", "Curitiba"], ["Clínica Bem Viver", "Cascavel"], ["Marcelo Duarte", "Curitiba"],
    ["Sofia Prado", "Londrina"], ["Transportes Ribeira", "Araucária"], ["Tiago Mendonça", "Maringá"],
  ];
  const clientes: Cliente[] = nomes.map(([nome, cidade], i) => ({
    id: "c" + (i + 1), nome, cidade, tel: `(41) 9${8000 + i * 137}-${1000 + i * 211}`,
  }));
  const offs = [-6, 4, 11, 19, 27, 33, 41, 52, 58, 66, 79, 88, 120, 150, 190, 240, 300, 330, 15, 47];
  const apolices: Apolice[] = offs.map((o, i) => ({
    id: "a" + (i + 1), numero: `ANC-${2400 + i * 17}-${i + 1}`,
    clienteId: clientes[i % clientes.length].id, ramo: RAMOS[i % RAMOS.length],
    seguradora: SEGURADORAS[i % SEGURADORAS.length],
    premio: 900 + ((i * 1370) % 9200), comissaoPct: [12, 15, 18, 10, 20][i % 5], fim: addDays(hoje, o),
  }));
  const desc = ["Colisão traseira", "Furto de equipamentos", "Vazamento e dano elétrico", "Internação de urgência", "Granizo no telhado", "Bagagem extraviada", "Roubo de veículo", "Incêndio parcial"];
  const etapas: EtapaSinistro[] = ["Aberto", "Em análise", "Aprovado", "Pago", "Em análise", "Aberto", "Negado", "Pago"];
  const sinistros: Sinistro[] = desc.map((d, i) => ({
    id: "s" + (i + 1), apoliceId: apolices[(i * 3) % apolices.length].id, descricao: d,
    valor: 1800 + i * 2650, data: addDays(hoje, -3 - i * 6), etapa: etapas[i],
  }));
  return { clientes, apolices, sinistros };
}

import { describe, expect, it } from "vitest";
import { addDays, avancar, diasAte, faixa, renovar, resumo, seed } from "./data";

const hoje = new Date(2026, 10, 7);
describe("dados", () => {
  it("classifica faixas de renovação", () => {
    expect(faixa(-1)).toBe("vencida");
    expect(faixa(30)).toBe("30");
    expect(faixa(31)).toBe("60");
    expect(faixa(91)).toBe("ok");
  });
  it("calcula dias até o vencimento", () => {
    expect(diasAte(addDays(hoje, 10), hoje)).toBe(10);
  });
  it("renova: +1 ano e reajuste de 6%", () => {
    const db = seed(hoje);
    const a = db.apolices[0];
    const r = renovar(db, a.id).apolices[0];
    expect(r.premio).toBe(Math.round(a.premio * 1.06));
    expect(Number(r.fim.slice(0, 4))).toBe(Number(a.fim.slice(0, 4)) + 1);
  });
  it("avança sinistro até Pago e para", () => {
    let db = seed(hoje);
    for (let i = 0; i < 6; i++) db = avancar(db, "s1");
    expect(db.sinistros[0].etapa).toBe("Pago");
  });
  it("resumo soma o prêmio da carteira", () => {
    const db = seed(hoje);
    expect(resumo(db, hoje).premio).toBe(db.apolices.reduce((s, a) => s + a.premio, 0));
  });
});

import { describe, it, expect } from "vitest";
import {
  normalizeCampaignName,
  isSameCampaign,
} from "./attendances-management-tab";

describe("Trava de Segurança de Transferência entre Carteiras", () => {
  it("normaliza nomes de carteira removendo acentos, espaços e caracteres especiais", () => {
    expect(normalizeCampaignName("Carteira_01")).toBe("carteira01");
    expect(normalizeCampaignName("Recuperação Sul")).toBe("recuperacaosul");
    expect(normalizeCampaignName("Campanha Principal")).toBe("campanhaprincipal");
    expect(normalizeCampaignName("Assessoria Norte")).toBe("assessorianorte");
  });

  it("permite transferência entre negociadores da mesma carteira (exata)", () => {
    expect(isSameCampaign("Carteira_01", "Carteira_01")).toBe(true);
    expect(isSameCampaign("Matriz", "Matriz")).toBe(true);
    expect(normalizeCampaignName("Recuperação Sul")).toBe("recuperacaosul");
    expect(isSameCampaign("Recuperação Sul", "Recuperação Sul")).toBe(true);
  });

  it("permite transferência quando há variação do prefixo Assessoria/Campanha", () => {
    expect(isSameCampaign("Assessoria Norte", "Norte")).toBe(true);
    expect(isSameCampaign("Norte", "Assessoria Norte")).toBe(true);
    expect(isSameCampaign("Campanha Central", "Central")).toBe(true);
    expect(isSameCampaign("Central", "Campanha Central")).toBe(true);
  });

  it("BLOQUEIA ESTREITAMENTE transferência entre carteiras distintas (Trava Anti-Erro)", () => {
    expect(isSameCampaign("Carteira_01", "Assessoria Norte")).toBe(false);
    expect(isSameCampaign("Carteira_01", "Norte")).toBe(false);
    expect(isSameCampaign("Matriz", "Carteira_01")).toBe(false);
    expect(isSameCampaign("Recuperação Sul", "Campanha Principal")).toBe(false);
    expect(isSameCampaign("Campanha Central", "Operação Leste")).toBe(false);
  });

  it("trata valores nulos, vazios ou indefinidos com segurança retornando false", () => {
    expect(isSameCampaign(null, "Carteira_01")).toBe(false);
    expect(isSameCampaign("Carteira_01", null)).toBe(false);
    expect(isSameCampaign(undefined, undefined)).toBe(false);
    expect(isSameCampaign("", "")).toBe(false);
    expect(isSameCampaign("   ", "Carteira_01")).toBe(false);
  });
});

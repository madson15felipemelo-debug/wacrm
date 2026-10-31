import { describe, it, expect } from "vitest";
import {
  normalizeCampaignName,
  isSameCampaign,
} from "./attendances-management-tab";

describe("Trava de Segurança de Transferência entre Carteiras", () => {
  it("normaliza nomes de carteira removendo acentos, espaços e caracteres especiais", () => {
    expect(normalizeCampaignName("Koerich_2631")).toBe("koerich2631");
    expect(normalizeCampaignName("Condor Recuperação")).toBe("condorrecuperacao");
    expect(normalizeCampaignName("Fácil Resultado")).toBe("facilresultado");
    expect(normalizeCampaignName("Assessoria Berlanda")).toBe("assessoriaberlanda");
  });

  it("permite transferência entre negociadores da mesma carteira (exata)", () => {
    expect(isSameCampaign("Koerich_2631", "Koerich_2631")).toBe(true);
    expect(isSameCampaign("Ambiental", "Ambiental")).toBe(true);
    expect(isSameCampaign("Condor Recuperação", "Condor Recuperação")).toBe(true);
    expect(isSameCampaign("Fácil Resultado", "Fácil Resultado")).toBe(true);
  });

  it("permite transferência quando há variação do prefixo Assessoria/Campanha", () => {
    expect(isSameCampaign("Assessoria Berlanda", "Berlanda")).toBe(true);
    expect(isSameCampaign("Berlanda", "Assessoria Berlanda")).toBe(true);
    expect(isSameCampaign("Assessoria Colombo", "Colombo")).toBe(true);
    expect(isSameCampaign("Colombo", "Assessoria Colombo")).toBe(true);
  });

  it("BLOQUEIA ESTREITAMENTE transferência entre carteiras distintas (Trava Anti-Erro)", () => {
    // Koerich NUNCA pode transferir para Berlanda
    expect(isSameCampaign("Koerich_2631", "Assessoria Berlanda")).toBe(false);
    expect(isSameCampaign("Koerich_2631", "Berlanda")).toBe(false);

    // Ambiental NUNCA pode transferir para Koerich
    expect(isSameCampaign("Ambiental", "Koerich_2631")).toBe(false);

    // Condor Recuperação NUNCA pode transferir para Fácil Resultado
    expect(isSameCampaign("Condor Recuperação", "Fácil Resultado")).toBe(false);

    // Colombo NUNCA pode transferir para PG Negócios
    expect(isSameCampaign("Assessoria Colombo", "PG Negócios")).toBe(false);

    // Nexus Cobrança NUNCA pode transferir para Ambiental
    expect(isSameCampaign("Nexus Cobrança", "Ambiental")).toBe(false);
  });

  it("trata valores nulos, vazios ou indefinidos com segurança retornando false", () => {
    expect(isSameCampaign(null, "Koerich_2631")).toBe(false);
    expect(isSameCampaign("Koerich_2631", null)).toBe(false);
    expect(isSameCampaign(undefined, undefined)).toBe(false);
    expect(isSameCampaign("", "")).toBe(false);
    expect(isSameCampaign("   ", "Koerich_2631")).toBe(false);
  });
});

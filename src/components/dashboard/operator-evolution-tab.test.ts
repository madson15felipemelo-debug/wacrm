import { describe, it, expect } from "vitest";
import type {
  OperatorEvolutionProfile,
  TrajectoryType,
  RiskLevel,
} from "@/lib/dashboard/operational-queries";

describe("Matriz de Risco Operacional & Evolução Histórica", () => {
  const sampleOperators: Partial<OperatorEvolutionProfile>[] = [
    {
      operatorId: "op-1",
      name: "Gabriel Souza",
      campaignName: "PG Negócios",
      trajectory: "degrading",
      riskLevel: "critical",
      riskScore: 82,
    },
    {
      operatorId: "op-2",
      name: "Thiago Alves",
      campaignName: "Nexus Cobrança",
      trajectory: "rapid_improving",
      riskLevel: "warning",
      riskScore: 54,
    },
    {
      operatorId: "op-3",
      name: "Ana Gomes",
      campaignName: "Condor Recuperação",
      trajectory: "stagnant",
      riskLevel: "warning",
      riskScore: 58,
    },
    {
      operatorId: "op-4",
      name: "Carlos Alves",
      campaignName: "Koerich_2631",
      trajectory: "rapid_improving",
      riskLevel: "stellar",
      riskScore: 22,
    },
  ];

  it("identifica corretamente operadores em risco crítico e em degradação", () => {
    const criticalDegrading = sampleOperators.filter(
      (op) => op.riskLevel === "critical" && op.trajectory === "degrading"
    );
    expect(criticalDegrading).toHaveLength(1);
    expect(criticalDegrading[0].name).toBe("Gabriel Souza");
  });

  it("filtra operadores em trajetória de forte evolução e recuperação de risco", () => {
    const rapidImproving = sampleOperators.filter(
      (op) => op.trajectory === "rapid_improving"
    );
    expect(rapidImproving).toHaveLength(2);
    expect(rapidImproving.map((o) => o.name)).toContain("Thiago Alves");
    expect(rapidImproving.map((o) => o.name)).toContain("Carlos Alves");
  });

  it("calcula score de eficiência inverso ao risco (100 - riskScore)", () => {
    const calcHealthScore = (risk: number) => 100 - risk;
    expect(calcHealthScore(82)).toBe(18); // Gabriel
    expect(calcHealthScore(54)).toBe(46); // Thiago
    expect(calcHealthScore(22)).toBe(78); // Carlos
  });
});

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  X,
  RotateCcw,
  Download,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DistributionCampaign,
  DistributionRulesConfig,
  DistributionAuditLog,
  CpfResponsibility,
} from "@/types";

type ActiveTab = "overview" | "campaigns" | "rules" | "audit";

interface KpiStats {
  totalReceived: number;
  distributedByCpf: number;
  distributedOperational: number;
  distributedManual: number;
  awaitingQueue: number;
  inTriage: number;
  inConflict: number;
  unassignedOpenChats: number;
  activeCampaigns: number;
  onlineOperators: number;
  avgDistributionMs: number;
}

interface CampaignDistributionVolume {
  name: string;
  count: number;
}

export default function DistributionPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [loading, setLoading] = useState(true);

  // KPIs & Stats
  const [kpis, setKpis] = useState<KpiStats | null>(null);
  const [campaignVolumes, setCampaignVolumes] = useState<CampaignDistributionVolume[]>([]);

  // Campaigns
  const [campaigns, setCampaigns] = useState<DistributionCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<DistributionCampaign | null>(null);
  const [campaignOperators, setCampaignOperators] = useState<any[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  // New Campaign Form
  const [newCampName, setNewCampName] = useState("");
  const [newCampCode, setNewCampCode] = useState("");
  const [newCampClient, setNewCampClient] = useState("Ambiental");
  const [newCampStrategy, setNewCampStrategy] = useState<"least_busy" | "round_robin" | "smart">("least_busy");
  const [newCampContingency, setNewCampContingency] = useState<"queue" | "substitute" | "supervisor">("queue");
  const [newCampMaxChats, setNewCampMaxChats] = useState("10");
  const [savingCampaign, setSavingCampaign] = useState(false);

  // Add Operator to Campaign
  const [isAddOperatorOpen, setIsAddOperatorOpen] = useState(false);
  const [accountMembers, setAccountMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [operatorCapacity, setOperatorCapacity] = useState("10");
  const [operatorIsSubstitute, setOperatorIsSubstitute] = useState(false);
  const [savingOperator, setSavingOperator] = useState(false);

  // CPF Responsibilities
  const [responsibilities, setResponsibilities] = useState<CpfResponsibility[]>([]);
  const [cpfSearch, setCpfSearch] = useState("");
  const [isCpfModalOpen, setIsCpfModalOpen] = useState(false);
  const [newCpf, setNewCpf] = useState("");
  const [newDebtorName, setNewDebtorName] = useState("");
  const [newContractRef, setNewContractRef] = useState("");
  const [newCpfCampaignId, setNewCpfCampaignId] = useState("");
  const [savingCpf, setSavingCpf] = useState(false);

  // CSV Bulk Import
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDefaultCampaignId, setCsvDefaultCampaignId] = useState("");
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    totalLines: number;
    invalidCpfCount: number;
    campaignBreakdown: Record<string, number>;
  } | null>(null);

  // Rules Config
  const [rules, setRules] = useState<DistributionRulesConfig | null>(null);
  const [savingRules, setSavingRules] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<DistributionAuditLog[]>([]);
  const [auditFilterStatus, setAuditFilterStatus] = useState<string>("all");
  const [auditSearchCpf, setAuditSearchCpf] = useState<string>("");
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Manual Reassignment Modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignConvId, setReassignConvId] = useState("");
  const [reassignTargetCampaignId, setReassignTargetCampaignId] = useState("");
  const [reassignTargetAgentId, setReassignTargetAgentId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/distribution/stats");
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setCampaignVolumes(data.campaignDistribution ?? []);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/distribution/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? []);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/distribution/rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (auditFilterStatus !== "all") params.set("status", auditFilterStatus);
      if (auditSearchCpf.trim()) params.set("cpf", auditSearchCpf.trim());
      params.set("limit", "50");

      const res = await fetch(`/api/distribution/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs ?? []);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingAudit(false);
    }
  }, [auditFilterStatus, auditSearchCpf]);

  const loadResponsibilities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (cpfSearch.trim()) params.set("search", cpfSearch.trim());
      params.set("limit", "30");

      const res = await fetch(`/api/distribution/responsibilities?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResponsibilities(data.responsibilities ?? []);
      }
    } catch {
      // Non-fatal
    }
  }, [cpfSearch]);

  const loadAccountMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setAccountMembers(data.members ?? []);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadStats(),
      loadCampaigns(),
      loadRules(),
      loadAuditLogs(),
      loadResponsibilities(),
      loadAccountMembers(),
    ]).finally(() => setLoading(false));
  }, [loadStats, loadCampaigns, loadRules, loadAuditLogs, loadResponsibilities, loadAccountMembers]);

  // Load operators when a campaign is selected
  const handleOpenCampaignDetails = async (campaign: DistributionCampaign) => {
    setSelectedCampaign(campaign);
    setLoadingOperators(true);
    try {
      const res = await fetch(`/api/distribution/campaigns/${campaign.id}`);
      if (res.ok) {
        const data = await res.json();
        setCampaignOperators(data.operators ?? []);
      }
    } catch {
      toast.error("Erro ao carregar equipe da assessoria.");
    } finally {
      setLoadingOperators(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName.trim()) {
      toast.error("Informe o nome da campanha / assessoria.");
      return;
    }
    setSavingCampaign(true);
    try {
      const res = await fetch("/api/distribution/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampName.trim(),
          code: newCampCode.trim() || null,
          client_name: newCampClient.trim() || "Ambiental",
          distribution_strategy: newCampStrategy,
          contingency_strategy: newCampContingency,
          max_concurrent_chats: Number(newCampMaxChats) || 10,
        }),
      });
      if (res.ok) {
        toast.success("Campanha criada com sucesso!");
        setIsCampaignModalOpen(false);
        setNewCampName("");
        setNewCampCode("");
        loadCampaigns();
        loadStats();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar campanha.");
      }
    } catch {
      toast.error("Erro de conexão ao criar campanha.");
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !selectedMemberId) {
      toast.error("Selecione um operador.");
      return;
    }
    setSavingOperator(true);
    try {
      const res = await fetch(`/api/distribution/campaigns/${selectedCampaign.id}/operators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMemberId,
          isSubstitute: operatorIsSubstitute,
          maxCapacity: Number(operatorCapacity) || 10,
          weight: 1,
        }),
      });
      if (res.ok) {
        toast.success("Operador vinculado à assessoria!");
        setIsAddOperatorOpen(false);
        setSelectedMemberId("");
        handleOpenCampaignDetails(selectedCampaign);
        loadCampaigns();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao vincular operador.");
      }
    } catch {
      toast.error("Erro de conexão ao vincular operador.");
    } finally {
      setSavingOperator(false);
    }
  };

  const handleRemoveOperator = async (userId: string) => {
    if (!selectedCampaign) return;
    try {
      const res = await fetch(
        `/api/distribution/campaigns/${selectedCampaign.id}/operators?userId=${userId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Operador removido da assessoria.");
        handleOpenCampaignDetails(selectedCampaign);
        loadCampaigns();
      } else {
        toast.error("Erro ao remover operador.");
      }
    } catch {
      toast.error("Erro de conexão.");
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rules) return;
    setSavingRules(true);
    try {
      const res = await fetch("/api/distribution/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        toast.success("Políticas de distribuição salvas com sucesso!");
        loadRules();
      } else {
        toast.error("Erro ao salvar regras.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar regras.");
    } finally {
      setSavingRules(false);
    }
  };

  const handleCreateCpfResponsibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpf.trim()) {
      toast.error("Informe o CPF.");
      return;
    }
    setSavingCpf(true);
    try {
      const res = await fetch("/api/distribution/responsibilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: newCpf.trim(),
          debtor_name: newDebtorName.trim() || null,
          contract_ref: newContractRef.trim() || null,
          campaign_id: newCpfCampaignId || null,
        }),
      });
      if (res.ok) {
        toast.success("Vínculo de CPF cadastrado!");
        setIsCpfModalOpen(false);
        setNewCpf("");
        setNewDebtorName("");
        setNewContractRef("");
        loadResponsibilities();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar CPF.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingCpf(false);
    }
  };

  const handleExecuteManualReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignConvId) {
      toast.error("ID da conversa não identificado.");
      return;
    }
    setReassigning(true);
    try {
      const res = await fetch("/api/distribution/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationIds: [reassignConvId],
          targetAgentId: reassignTargetAgentId || null,
          targetCampaignId: reassignTargetCampaignId || null,
          reason: reassignReason.trim() || "Transferência manual realizada pelo supervisor",
        }),
      });
      if (res.ok) {
        toast.success("Conversa transferida com sucesso!");
        setIsReassignModalOpen(false);
        setReassignConvId("");
        setReassignReason("");
        loadAuditLogs();
        loadStats();
      } else {
        toast.error("Falha ao reatribuir conversa.");
      }
    } catch {
      toast.error("Erro de conexão ao reatribuir.");
    } finally {
      setReassigning(false);
    }
  };

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error("Selecione um arquivo CSV para importar.");
      return;
    }
    setUploadingCsv(true);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      if (csvDefaultCampaignId) {
        formData.append("campaignId", csvDefaultCampaignId);
      }
      const res = await fetch("/api/distribution/responsibilities/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Importados com sucesso ${data.importedCount} CPFs!`);
        setImportSummary(data);
        loadResponsibilities();
        loadCampaigns();
        loadStats();
      } else {
        toast.error(data.error || "Erro ao importar arquivo CSV.");
      }
    } catch {
      toast.error("Erro de conexão ao enviar CSV.");
    } finally {
      setUploadingCsv(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "cpf,cliente,nome,contrato\n12345678901,Colombo,João da Silva,CTR-1001\n98765432100,Fácil Resultado,Maria Santos,CTR-1002\n11122233344,Berlanda,Carlos Souza,CTR-1003";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "exemplo_distribuicao_cpf.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Distribuição
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Roteamento de conversas por CPF, carteira e carga de operadores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadStats();
              loadCampaigns();
              loadAuditLogs();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCampaignModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Carteira
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mt-6 flex border-b border-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-4 w-4" />
          Visão Geral
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "campaigns"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Carteiras e CPFs ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "rules"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Regras
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="h-4 w-4" />
          Auditoria ({auditLogs.length})
        </button>
      </div>

      {loading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* TAB 1: VISÃO GERAL */}
      {!loading && activeTab === "overview" && (
        <div className="mt-6 space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total Recebidas
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-mono">{kpis?.totalReceived ?? 0}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conversas direcionadas
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Identificadas por CPF
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-mono text-foreground">
                  {kpis?.distributedByCpf ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vinculadas à carteira responsável
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Operadores Online
                </CardTitle>
                <Users className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-2xl font-semibold font-mono text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {kpis?.onlineOperators ?? 0}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ativos no momento
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fila & Triagem
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-mono text-foreground">
                  {(kpis?.awaitingQueue ?? 0) + (kpis?.inTriage ?? 0)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {kpis?.inTriage ?? 0} em triagem · {kpis?.awaitingQueue ?? 0} em fila
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Volume by Campaign Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="border border-border/80 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Distribuição por Campanha / Assessoria
                </CardTitle>
                <CardDescription>
                  Volume acumulado de atendimentos entregues a cada assessoria (Colombo, Berlanda, Condor, Fácil, PG, Nexus...)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaignVolumes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma conversa distribuída ainda.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {campaignVolumes.map((item) => {
                      const total = kpis?.totalReceived || 1;
                      const percent = Math.min(100, Math.round((item.count / total) * 100));
                      return (
                        <div key={item.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              {item.name}
                            </span>
                            <span className="text-muted-foreground">
                              {item.count} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/80">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status de Saúde das Filas</CardTitle>
                <CardDescription>Métricas operacionais de resposta e resolução</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Tempo Médio de Atribuição</p>
                      <p className="text-[11px] text-muted-foreground">Tempo até cair na caixa do operador</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {kpis?.avgDistributionMs ?? 0} ms
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Conflitos de Assessoria</p>
                      <p className="text-[11px] text-muted-foreground">CPFs com múltiplos credores</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-500">
                    {kpis?.inConflict ?? 0}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2.5">
                    <UserX className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-foreground">Aguardando na Fila</p>
                      <p className="text-[11px] text-muted-foreground">Sem operador online no momento</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {kpis?.awaitingQueue ?? 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPANHAS E RESPONSABILIDADES */}
      {!loading && activeTab === "campaigns" && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Campanhas / Assessorias de Cobrança
              </h2>
              <p className="text-xs text-muted-foreground">
                Equipes exclusivas por carteira (Berlanda, Colombo, Condor, Fácil, PG, Nexus...)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCsv}
                className="gap-2 text-muted-foreground hover:text-foreground"
                title="Baixar planilha de exemplo pronta (.csv)"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar Modelo CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportSummary(null);
                  setCsvFile(null);
                  setIsCsvImportOpen(true);
                }}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Importar Planilha CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCpfModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Vincular Novo CPF
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCampaignModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova Campanha / Assessoria
              </Button>
            </div>
          </div>

          {/* Campaigns Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((camp) => (
              <Card
                key={camp.id}
                className="cursor-pointer border border-border/80 transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => handleOpenCampaignDetails(camp)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {camp.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Contratante: <span className="font-medium text-foreground">{camp.client_name || "Ambiental"}</span>
                        {camp.code && ` · Código: ${camp.code}`}
                      </CardDescription>
                    </div>
                    <Badge variant={camp.is_active ? "default" : "secondary"}>
                      {camp.is_active ? "Ativa" : "Pausada"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2.5 text-center text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{camp.operators_count ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground">Negociadores</p>
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-500">
                        {camp.online_operators_count ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Online agora</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {camp.active_conversations_count ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Em chat</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Estratégia: <strong className="text-foreground uppercase">{camp.distribution_strategy}</strong></span>
                    <span className="flex items-center gap-1 text-primary">
                      Gerenciar equipe <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CPF Responsibilities Registry List */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Base de Responsabilidades de CPF (Mapeamento Cadastrado)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Quando o devedor digitar o CPF ou responder ao disparo, este mapeamento define a assessoria dona.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar CPF ou Nome..."
                    value={cpfSearch}
                    onChange={(e) => setCpfSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                    <tr>
                      <th className="p-3">CPF</th>
                      <th className="p-3">Devedor</th>
                      <th className="p-3">Contrato / Ref</th>
                      <th className="p-3">Assessoria / Campanha</th>
                      <th className="p-3">Credor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {responsibilities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          Nenhum vínculo de CPF encontrado. Clique em &quot;Vincular Novo CPF&quot; para cadastrar.
                        </td>
                      </tr>
                    ) : (
                      responsibilities.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono font-medium text-foreground">{r.cpf}</td>
                          <td className="p-3">{r.debtor_name || "—"}</td>
                          <td className="p-3 font-mono text-muted-foreground">{r.contract_ref || "—"}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                              {r.campaign?.name || "Triagem Geral"}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{r.creditor_name || "Ambiental"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REGRAS E POLÍTICAS DE DISTRIBUIÇÃO */}
      {!loading && activeTab === "rules" && rules && (
        <form onSubmit={handleSaveRules} className="mt-6 max-w-3xl space-y-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Modalidade Ativa de Distribuição</CardTitle>
              <CardDescription>
                Define como as novas mensagens recebidas no WhatsApp são roteadas para atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onClick={() => setRules({ ...rules, active_mode: "cpf_responsibility" })}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  rules.active_mode === "cpf_responsibility"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  checked={rules.active_mode === "cpf_responsibility"}
                  onChange={() => setRules({ ...rules, active_mode: "cpf_responsibility" })}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Modalidade 02 — Distribuição por Responsabilidade de CPF / Assessoria (Recomendado)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Identifica o CPF do devedor (no cadastro ou pelo fluxo de triagem), consulta qual assessoria (ex: Fácil, Berlanda, Colombo) é dona do contrato e encaminha exclusivamente para a equipe autorizada.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setRules({ ...rules, active_mode: "operational_smart" })}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  rules.active_mode === "operational_smart"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  checked={rules.active_mode === "operational_smart"}
                  onChange={() => setRules({ ...rules, active_mode: "operational_smart" })}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Modalidade 01 — Distribuição Operacional Inteligente (Fila Única)
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Distribui entre todos os operadores online da conta considerando disponibilidade e menor carga de conversas abertas.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setRules({ ...rules, active_mode: "manual" })}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  rules.active_mode === "manual"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  checked={rules.active_mode === "manual"}
                  onChange={() => setRules({ ...rules, active_mode: "manual" })}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Modalidade 03 — Distribuição Manual por Supervisores
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Não faz nenhuma atribuição automática. Todas as mensagens entram na fila de espera para um supervisor distribuir manualmente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Estratégia Padrão & Contingências</CardTitle>
              <CardDescription>
                Critérios operacionais quando houver operadores online disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-foreground">Estratégia Padrão</label>
                  <select
                    value={rules.default_strategy}
                    onChange={(e) =>
                      setRules({ ...rules, default_strategy: e.target.value as any })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                  >
                    <option value="least_busy">Least Busy (Quem tem menos conversas abertas)</option>
                    <option value="round_robin">Round Robin (Revezamento circular)</option>
                    <option value="smart">Smart (Ponderado por capacidade e peso)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">
                    Quando CPF não for identificado
                  </label>
                  <select
                    value={rules.fallback_behavior}
                    onChange={(e) =>
                      setRules({ ...rules, fallback_behavior: e.target.value as any })
                    }
                    className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                  >
                    <option value="triage">Enviar para Fila de Triagem Geral</option>
                    <option value="unassigned">Manter Não Atribuída</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Integração com API Externa de Identificação de Carteira
              </CardTitle>
              <CardDescription>
                Se a contratante (ex: Ambiental) possuir uma API REST para consulta de CPF em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Endpoint URL da API</label>
                <Input
                  placeholder="https://api.ambiental.com.br/v1/contratos/identificar-carteira"
                  value={rules.external_api_url || ""}
                  onChange={(e) => setRules({ ...rules, external_api_url: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Token de Autenticação (Bearer / Header)</label>
                <Input
                  type="password"
                  placeholder="Bearer eyJhbGciOi..."
                  value={rules.external_api_token || ""}
                  onChange={(e) => setRules({ ...rules, external_api_token: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={savingRules} className="gap-2">
              {savingRules ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar Políticas de Distribuição
            </Button>
          </div>
        </form>
      )}

      {/* TAB 4: HISTÓRICO E AUDITORIA */}
      {!loading && activeTab === "audit" && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Logs de Auditoria e Decisões do Motor
              </h2>
              <p className="text-xs text-muted-foreground">
                Registro imutável de cada direcionamento, assessoria identificada e motivo da escolha.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por CPF..."
                  value={auditSearchCpf}
                  onChange={(e) => setAuditSearchCpf(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <select
                value={auditFilterStatus}
                onChange={(e) => setAuditFilterStatus(e.target.value)}
                className="h-8 rounded-md border border-border bg-muted px-2.5 text-xs text-foreground"
              >
                <option value="all">Todos os Status</option>
                <option value="success">Sucesso</option>
                <option value="queued">Na Fila</option>
                <option value="triage">Triagem</option>
                <option value="conflict">Conflito</option>
                <option value="failed">Falha</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={loadAuditLogs}
                disabled={loadingAudit}
                className="h-8 gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${loadingAudit ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">CPF</th>
                    <th className="p-3">Assessoria / Campanha</th>
                    <th className="p-3">Operador Atribuído</th>
                    <th className="p-3">Modalidade</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Motivo da Decisão</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        Nenhum log de distribuição registrado ainda.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const dateFormatted = new Date(log.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      const statusColors: Record<string, string> = {
                        success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                        queued: "bg-amber-500/10 text-amber-500 border-amber-500/30",
                        triage: "bg-sky-500/10 text-sky-500 border-sky-500/30",
                        conflict: "bg-purple-500/10 text-purple-500 border-purple-500/30",
                        failed: "bg-red-500/10 text-red-500 border-red-500/30",
                      };

                      return (
                        <tr key={log.id} className="hover:bg-muted/20">
                          <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {dateFormatted}
                          </td>
                          <td className="p-3 font-mono font-medium text-foreground">
                            {log.cpf || "—"}
                          </td>
                          <td className="p-3 font-medium">
                            {log.campaign_name ? (
                              <Badge variant="outline" className="text-primary border-primary/30">
                                {log.campaign_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">Triagem Geral</span>
                            )}
                          </td>
                          <td className="p-3">
                            {log.assigned_agent_name ? (
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                {log.assigned_agent_name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Não atribuído</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground uppercase text-[10px]">
                            {log.distribution_mode}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={statusColors[log.status] || "bg-muted text-foreground"}
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td className="max-w-xs truncate p-3 text-muted-foreground" title={log.reason || ""}>
                            {log.reason || "—"}
                          </td>
                          <td className="p-3 text-right">
                            {log.conversation_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setReassignConvId(log.conversation_id!);
                                  setReassignTargetCampaignId(log.campaign_id || "");
                                  setIsReassignModalOpen(true);
                                }}
                                className="h-7 gap-1 text-[11px] text-primary hover:underline"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Reatribuir
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CRIAR NOVA CAMPANHA / ASSESSORIA */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCampaign}>
            <DialogHeader>
              <DialogTitle>Nova Campanha / Assessoria</DialogTitle>
              <DialogDescription>
                Cadastre uma nova assessoria de cobrança (ex: Assessoria Colombo, Berlanda, Fácil Resultado) para receber atendimentos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-medium text-foreground">Nome da Assessoria / Campanha</label>
                <Input
                  required
                  placeholder="Ex: Assessoria Colombo"
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground">Código de Identificação</label>
                  <Input
                    placeholder="Ex: COLOMBO"
                    value={newCampCode}
                    onChange={(e) => setNewCampCode(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="font-medium text-foreground">Cliente Contratante</label>
                  <Input
                    placeholder="Ex: Ambiental"
                    value={newCampClient}
                    onChange={(e) => setNewCampClient(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground">Estratégia de Distribuição da Equipe</label>
                <select
                  value={newCampStrategy}
                  onChange={(e) => setNewCampStrategy(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="least_busy">Least Busy (Priorizar operador com menos chats)</option>
                  <option value="round_robin">Round Robin (Revezamento circular)</option>
                  <option value="smart">Smart (Ponderado por capacidade e peso)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground">Contingência quando equipe estiver offline</label>
                <select
                  value={newCampContingency}
                  onChange={(e) => setNewCampContingency(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="queue">Manter na fila de espera da assessoria</option>
                  <option value="substitute">Direcionar para operador substituto</option>
                  <option value="supervisor">Direcionar para fila do supervisor</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCampaign}>
                {savingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Assessoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: DETALHES DA CAMPANHA & EQUIPE */}
      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">
                  {selectedCampaign?.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Contratante: {selectedCampaign?.client_name || "Ambiental"} · Estratégia: {selectedCampaign?.distribution_strategy}
                </DialogDescription>
              </div>
              <Button size="sm" onClick={() => setIsAddOperatorOpen(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Vincular Operador
              </Button>
            </div>
          </DialogHeader>

          <div className="py-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Negociadores Vinculados à Assessoria
            </h4>

            {loadingOperators ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : campaignOperators.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nenhum operador vinculado a esta assessoria ainda.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {campaignOperators.map((op) => (
                  <div key={op.id} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          op.presence_status === "online"
                            ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                            : "bg-muted-foreground/40"
                        }`}
                        title={op.presence_status === "online" ? "Online agora" : "Offline"}
                      />
                      <div>
                        <p className="font-semibold text-foreground">
                          {op.profile?.full_name || "Operador"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {op.profile?.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right text-[11px]">
                        <p className="font-medium text-foreground">
                          {op.active_chats} / {op.max_capacity} chats
                        </p>
                        <p className="text-muted-foreground">
                          {op.is_substitute ? "Substituto (Reserva)" : "Efetivo"}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOperator(op.user_id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        title="Remover da assessoria"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADICIONAR OPERADOR NA ASSESSORIA */}
      <Dialog open={isAddOperatorOpen} onOpenChange={setIsAddOperatorOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddOperator}>
            <DialogHeader>
              <DialogTitle>Vincular Operador à Assessoria</DialogTitle>
              <DialogDescription>
                Adicione um membro da equipe para atender exclusivamente aos clientes da {selectedCampaign?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-medium text-foreground">Selecione o Negociador</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Selecione um membro...</option>
                  {accountMembers
                    .filter((m) => m.role !== "viewer")
                    .map((m) => (
                      <option key={m.id || m.user_id} value={m.user_id}>
                        {m.name || m.email} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground">Capacidade Máxima de Chats Simultâneos</label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={operatorCapacity}
                  onChange={(e) => setOperatorCapacity(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="substitute"
                  checked={operatorIsSubstitute}
                  onChange={(e) => setOperatorIsSubstitute(e.target.checked)}
                />
                <label htmlFor="substitute" className="font-medium text-foreground cursor-pointer">
                  Operador Substituto (Reserva para contingências)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOperatorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingOperator}>
                {savingOperator ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: VINCULAR NOVO CPF */}
      <Dialog open={isCpfModalOpen} onOpenChange={setIsCpfModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateCpfResponsibility}>
            <DialogHeader>
              <DialogTitle>Vincular Responsabilidade de CPF</DialogTitle>
              <DialogDescription>
                Defina qual assessoria é dona deste CPF para direcionamento automático.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-medium text-foreground">CPF do Devedor</label>
                <Input
                  required
                  placeholder="000.000.000-00"
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground">Nome do Devedor (Opcional)</label>
                <Input
                  placeholder="Nome completo do devedor"
                  value={newDebtorName}
                  onChange={(e) => setNewDebtorName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground">Contrato / Carteira (Opcional)</label>
                <Input
                  placeholder="Ex: CONTRATO-12345"
                  value={newContractRef}
                  onChange={(e) => setNewContractRef(e.target.value)}
                  className="mt-1 font-mono text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground">Assessoria / Campanha Responsável</label>
                <select
                  required
                  value={newCpfCampaignId}
                  onChange={(e) => setNewCpfCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Selecione a assessoria...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.client_name || "Ambiental"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCpfModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCpf}>
                {savingCpf ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular CPF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: REATRIBUIÇÃO MANUAL PELO SUPERVISOR */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleExecuteManualReassign}>
            <DialogHeader>
              <DialogTitle>Transferência / Reatribuição Manual</DialogTitle>
              <DialogDescription>
                Como supervisor, transfira esta conversa entre assessorias ou designe um novo operador. Todas as transferências são auditadas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="font-medium text-foreground">Assessoria de Destino</label>
                <select
                  value={reassignTargetCampaignId}
                  onChange={(e) => setReassignTargetCampaignId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Fila Geral de Triagem</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground">Operador Específico (Opcional)</label>
                <select
                  value={reassignTargetAgentId}
                  onChange={(e) => setReassignTargetAgentId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Distribuição automática da fila</option>
                  {accountMembers
                    .filter((m) => m.role !== "viewer")
                    .map((m) => (
                      <option key={m.id || m.user_id} value={m.user_id}>
                        {m.name || m.email}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground">Motivo da Transferência (Obrigatório para Auditoria)</label>
                <textarea
                  required
                  placeholder="Ex: Transferido a pedido do contratante Ambiental para a assessoria Colombo."
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-muted p-2 text-xs text-foreground"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReassignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={reassigning}>
                {reassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Transferência"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: IMPORTAÇÃO EM MASSA VIA CSV */}
      <Dialog open={isCsvImportOpen} onOpenChange={setIsCsvImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleUploadCsv}>
            <DialogHeader className="pr-8">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importação de CPFs em Massa (CSV)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Vincule milhares de devedores às suas respectivas assessorias de cobrança (Modalidade 2).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* PASSO 1: CARD ESTRATÉGICO DO MODELO OFICIAL */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 transition-all">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Passo 1
                        </span>
                        <h4 className="text-xs font-bold text-foreground">
                          Baixar Planilha Modelo Oficial
                        </h4>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Use nossa planilha pronta com apenas 2 colunas: <strong>cpf</strong> e <strong>cliente</strong>.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={downloadSampleCsv}
                    className="shrink-0 gap-2 bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Modelo CSV
                  </Button>
                </div>

                {/* Exemplo visual claro das colunas */}
                <div className="mt-3 overflow-hidden rounded-lg border border-border/80 bg-background/80 p-2 text-[11px]">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>Exemplo de como sua planilha deve ficar:</span>
                    <span className="text-primary font-normal">Excel ou Google Sheets (.csv)</span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="rounded bg-muted/60 p-1.5">
                      <span className="font-bold text-foreground">cpf</span>
                      <p className="text-muted-foreground text-[10px]">12345678901</p>
                      <p className="text-muted-foreground text-[10px]">98765432100</p>
                    </div>
                    <div className="rounded bg-muted/60 p-1.5">
                      <span className="font-bold text-foreground">cliente</span>
                      <p className="text-muted-foreground text-[10px]">Colombo</p>
                      <p className="text-muted-foreground text-[10px]">Fácil Resultado</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASSO 2: ÁREA DE UPLOAD */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Passo 2
                  </span>
                  <label className="font-medium text-foreground text-xs">
                    Enviar Planilha Preenchida
                  </label>
                </div>

                <div className="rounded-lg border-2 border-dashed border-border/80 p-5 text-center transition-colors hover:border-primary/50">
                  <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-xs font-medium text-foreground">
                    {csvFile ? csvFile.name : "Clique para selecionar ou arraste o arquivo CSV"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Suporta arquivos .csv separados por vírgula (,) ou ponto-e-vírgula (;)
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="mt-3 cursor-pointer text-xs"
                  />
                </div>
              </div>

              {/* Campaign Override (Optional) */}
              <div>
                <label className="font-medium text-foreground">
                  Assessoria Específica (Opcional)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Selecione se toda a planilha pertencer à mesma assessoria. Se deixar em branco, o sistema lerá a coluna <strong>cliente/assessoria</strong> de cada linha da planilha.
                </p>
                <select
                  value={csvDefaultCampaignId}
                  onChange={(e) => setCsvDefaultCampaignId(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground"
                >
                  <option value="">Detectar pela coluna do arquivo (Multi-Assessoria)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (fixar todos nesta assessoria)
                    </option>
                  ))}
                </select>
              </div>

              {/* Import Summary Results */}
              {importSummary && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-foreground">
                  <div className="flex items-center gap-2 font-semibold text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Importação Concluída com Sucesso!
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-background/50 p-2">
                      <div className="text-base font-bold text-foreground">{importSummary.totalLines}</div>
                      <div className="text-[10px] text-muted-foreground">Linhas lidas</div>
                    </div>
                    <div className="rounded bg-background/50 p-2">
                      <div className="text-base font-bold text-emerald-500">{importSummary.importedCount}</div>
                      <div className="text-[10px] text-muted-foreground">CPFs Importados</div>
                    </div>
                    <div className="rounded bg-background/50 p-2">
                      <div className="text-base font-bold text-amber-500">{importSummary.invalidCpfCount}</div>
                      <div className="text-[10px] text-muted-foreground">Inválidos</div>
                    </div>
                  </div>

                  {Object.keys(importSummary.campaignBreakdown || {}).length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-muted-foreground text-[11px]">Distribuição por Assessoria:</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Object.entries(importSummary.campaignBreakdown).map(([name, count]) => (
                          <Badge key={name} variant="outline" className="text-[10px]">
                            {name}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCsvImportOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={uploadingCsv || !csvFile}>
                {uploadingCsv ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando base...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Iniciar Importação
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

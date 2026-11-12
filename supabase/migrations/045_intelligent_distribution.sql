-- ============================================================
-- 045_intelligent_distribution.sql
--
-- Motor de Distribuição Inteligente de Conversas (LM Core CRM)
--
-- Suporta as três modalidades operacionais:
--   1. Distribuição Operacional Inteligente (Round Robin, Least Busy, Smart)
--   2. Distribuição por Responsabilidade do CPF / Assessoria (Campanha)
--   3. Distribuição Manual por Supervisores com Auditoria Completa
--
-- Idempotente — seguro para executar múltiplas vezes.
-- ============================================================

-- 1. CAMPANHAS / ASSESSORIAS DE DISTRIBUIÇÃO
CREATE TABLE IF NOT EXISTS distribution_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  client_name TEXT,
  distribution_strategy TEXT NOT NULL DEFAULT 'least_busy'
    CHECK (distribution_strategy IN ('least_busy', 'round_robin', 'smart')),
  contingency_strategy TEXT NOT NULL DEFAULT 'queue'
    CHECK (contingency_strategy IN ('queue', 'substitute', 'supervisor')),
  max_concurrent_chats INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_campaigns_account
  ON distribution_campaigns(account_id);

CREATE INDEX IF NOT EXISTS idx_distribution_campaigns_code
  ON distribution_campaigns(account_id, code);

-- 2. OPERADORES VINCULADOS À CAMPANHA / ASSESSORIA
CREATE TABLE IF NOT EXISTS campaign_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES distribution_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_substitute BOOLEAN NOT NULL DEFAULT false,
  max_capacity INTEGER NOT NULL DEFAULT 10,
  weight INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_operators_campaign
  ON campaign_operators(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_operators_user
  ON campaign_operators(user_id);

-- 3. RESPONSABILIDADES DE CPF (MAPEAMENTO DEVEDOR -> ASSESSORIA / OPERADOR)
CREATE TABLE IF NOT EXISTS cpf_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contract_ref TEXT,
  debtor_name TEXT,
  creditor_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cpf_responsibilities_account_cpf
  ON cpf_responsibilities(account_id, cpf);

CREATE INDEX IF NOT EXISTS idx_cpf_responsibilities_campaign
  ON cpf_responsibilities(campaign_id);

-- 4. CONFIGURAÇÕES GLOBAIS DE DISTRIBUIÇÃO DA CONTA
CREATE TABLE IF NOT EXISTS distribution_rules_config (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  active_mode TEXT NOT NULL DEFAULT 'cpf_responsibility'
    CHECK (active_mode IN ('operational_smart', 'cpf_responsibility', 'manual')),
  default_strategy TEXT NOT NULL DEFAULT 'least_busy'
    CHECK (default_strategy IN ('round_robin', 'least_busy', 'smart')),
  external_api_url TEXT,
  external_api_token TEXT,
  fallback_behavior TEXT NOT NULL DEFAULT 'triage'
    CHECK (fallback_behavior IN ('triage', 'all_online', 'unassigned')),
  auto_distribute_on_inbound BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LOGS DE AUDITORIA E HISTÓRICO DE DISTRIBUIÇÃO
CREATE TABLE IF NOT EXISTS distribution_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  cpf TEXT,
  campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL,
  campaign_name TEXT,
  previous_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_agent_name TEXT,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  distribution_mode TEXT NOT NULL,
  strategy_used TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'queued', 'triage', 'conflict', 'failed')),
  reason TEXT,
  execution_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_distribution_audit_account
  ON distribution_audit_logs(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_distribution_audit_conversation
  ON distribution_audit_logs(conversation_id);

CREATE INDEX IF NOT EXISTS idx_distribution_audit_cpf
  ON distribution_audit_logs(account_id, cpf);

-- 6. EXTENSÃO DA TABELA CONVERSATIONS
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES distribution_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_campaign_id
  ON conversations(campaign_id);

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE distribution_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpf_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de SELECT e ALL baseadas em ser membro da conta
DROP POLICY IF EXISTS distribution_campaigns_member ON distribution_campaigns;
CREATE POLICY distribution_campaigns_member ON distribution_campaigns FOR ALL
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS campaign_operators_member ON campaign_operators;
CREATE POLICY campaign_operators_member ON campaign_operators FOR ALL
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS cpf_responsibilities_member ON cpf_responsibilities;
CREATE POLICY cpf_responsibilities_member ON cpf_responsibilities FOR ALL
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS distribution_rules_config_member ON distribution_rules_config;
CREATE POLICY distribution_rules_config_member ON distribution_rules_config FOR ALL
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS distribution_audit_logs_member ON distribution_audit_logs;
CREATE POLICY distribution_audit_logs_member ON distribution_audit_logs FOR ALL
  USING (is_account_member(account_id));

-- 8. PUBLICAÇÃO REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'distribution_campaigns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE distribution_campaigns;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'campaign_operators'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE campaign_operators;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'distribution_audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE distribution_audit_logs;
  END IF;
END $$;

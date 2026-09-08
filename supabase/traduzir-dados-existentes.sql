-- ============================================================
-- Traduz para pt-BR os dados que já existem no banco.
--
-- O funil, as etapas e o rótulo dos convites são LINHAS no banco,
-- criadas na primeira vez que a conta abriu cada tela — não são
-- textos de interface. Traduzir o código só muda o que for criado
-- daqui pra frente; o que já existe precisa deste UPDATE.
--
-- Como rodar: Supabase → SQL Editor → cole tudo → Run.
-- É seguro rodar mais de uma vez (só altera nomes ainda em inglês)
-- e não mexe em nada que você já tenha renomeado à mão.
-- ============================================================

begin;

-- ---- Funis ------------------------------------------------
update pipelines
   set name = 'Funil de vendas'
 where name = 'Sales Pipeline';

-- ---- Etapas do funil --------------------------------------
-- Casadas pelo nome exato do seed original. Etapas que você
-- mesmo criou ou renomeou ficam intactas.
update pipeline_stages
   set name = case name
                when 'New Lead'      then 'Novo lead'
                when 'Qualified'     then 'Qualificado'
                when 'Proposal Sent' then 'Proposta enviada'
                when 'Negotiation'   then 'Negociação'
                when 'Won'           then 'Ganho'
                when 'Lost'          then 'Perdido'
              end
 where name in (
   'New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'
 );

-- ---- Automações criadas a partir dos modelos --------------
update automations
   set name = case name
                when 'Welcome Message'     then 'Mensagem de boas-vindas'
                when 'Out of Office'       then 'Fora do expediente'
                when 'Lead Qualifier'      then 'Qualificador de leads'
                when 'Follow-up Reminder'  then 'Lembrete de retorno'
              end
 where name in (
   'Welcome Message', 'Out of Office', 'Lead Qualifier', 'Follow-up Reminder'
 );

-- ---- Fluxos criados a partir dos modelos ------------------
update flows
   set name = case name
                when 'Welcome menu' then 'Menu de boas-vindas'
                when 'FAQ bot'      then 'Bot de perguntas frequentes'
                when 'Lead capture' then 'Captura de leads'
              end
 where name in ('Welcome menu', 'FAQ bot', 'Lead capture');

-- Confira o resultado antes de confirmar. Se algo parecer errado,
-- troque o `commit` abaixo por `rollback` e rode de novo.
select 'pipelines' as tabela, name from pipelines
union all
select 'etapas',            name from pipeline_stages
union all
select 'automações',        name from automations
union all
select 'fluxos',            name from flows
order by tabela, name;

commit;

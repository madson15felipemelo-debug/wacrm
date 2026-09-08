-- ============================================================
-- Traduz e adapta para uma empresa de cobrança os dados que já
-- existem no banco.
--
-- O funil, as etapas e o rótulo dos convites são LINHAS no banco,
-- criadas na primeira vez que a conta abriu cada tela — não são
-- textos de interface. Traduzir o código só muda o que for criado
-- daqui pra frente; o que já existe precisa deste UPDATE.
--
-- Como rodar: Supabase → SQL Editor → cole tudo → Run.
-- É seguro rodar mais de uma vez (só altera nomes ainda no valor
-- original em inglês) e não mexe em nada que você já tenha
-- renomeado à mão.
-- ============================================================

begin;

-- ---- Funis ------------------------------------------------
update pipelines
   set name = 'Funil de cobrança'
 where name = 'Sales Pipeline';

-- ---- Etapas do funil --------------------------------------
-- Casadas pelo nome exato do seed original. Etapas que você
-- mesmo criou ou renomeou ficam intactas.
update pipeline_stages
   set name = case name
                when 'New Lead'      then 'Novo devedor'
                when 'Qualified'     then 'Devedor localizado'
                when 'Proposal Sent' then 'Proposta de acordo enviada'
                when 'Negotiation'   then 'Em negociação'
                when 'Won'           then 'Acordo fechado'
                when 'Lost'          then 'Sem acordo'
              end
 where name in (
   'New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'
 );

-- ---- Automações criadas a partir dos modelos --------------
update automations
   set name = case name
                when 'Welcome Message'     then 'Mensagem inicial de cobrança'
                when 'Out of Office'       then 'Fora do horário de atendimento'
                when 'Lead Qualifier'      then 'Qualificação do devedor'
                when 'Follow-up Reminder'  then 'Lembrete de pagamento'
              end
 where name in (
   'Welcome Message', 'Out of Office', 'Lead Qualifier', 'Follow-up Reminder'
 );

-- ---- Fluxos criados a partir dos modelos ------------------
update flows
   set name = case name
                when 'Welcome menu' then 'Menu inicial de atendimento'
                when 'FAQ bot'      then 'Bot de dúvidas sobre cobrança'
                when 'Lead capture' then 'Captura de dados do devedor'
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

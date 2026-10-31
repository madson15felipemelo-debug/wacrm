# Arquitetura e Fluxo de Distribuição de Mensagens

Este documento explica em detalhes **como funciona a chegada e a distribuição de mensagens no LM Core CRM (WACRM)**, respondendo diretamente à pergunta:
> *"Chegou uma mensagem nova — para qual operador logado ela vai?"*

---

## 1. Resumo Direto: Para quem vai a mensagem nova?

Hoje, no comportamento padrão nativo da plataforma:
* **A mensagem NÃO cai automaticamente na conta de um operador específico.**
* Ela fica **Não Atribuída** (`conversations.assigned_agent_id = NULL`).
* Ela cai na **Fila Geral** e aparece simultaneamente em tempo real para **TODOS os operadores da conta** na aba **"Todas"** e na aba **"Não atribuídas"** da Caixa de Entrada (`/inbox`).
* **Nenhum** operador a vê na sua aba **"Minhas"** até que alguém a assuma ("Atribuir a mim") ou que uma regra de automação/fluxo faça a atribuição.

---

## 2. O Ciclo de Vida da Mensagem (Passo a Passo)

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (WhatsApp)
    participant Meta as Meta Cloud API
    participant Webhook as API Webhook (/api/whatsapp/webhook)
    participant DB as Supabase (Postgres)
    participant Realtime as Supabase Realtime
    actor OperadorA as Operador A (Online)
    actor OperadorB as Operador B (Online)

    Cliente->>Meta: Envia mensagem ("Olá, gostaria de informações")
    Meta->>Webhook: POST Webhook (JSON com payload da mensagem)
    
    rect rgb(20, 25, 40)
        Note over Webhook,DB: Processamento do Webhook
        Webhook->>DB: 1. Identifica conta pelo phone_number_id
        Webhook->>DB: 2. Localiza ou cria Contato (com dedup de 9º dígito BR)
        Webhook->>DB: 3. Localiza ou cria Conversa (conversations)
        Note over DB: assigned_agent_id = NULL (Padrão)
        Webhook->>DB: 4. Insere Mensagem (messages, status = 'delivered')
        Webhook->>DB: 5. Atualiza Conversa (unread_count + 1, last_message_text)
    end

    rect rgb(25, 40, 25)
        Note over Webhook: Motores de Ação (Flows / Automations / AI)
        alt Há Fluxo de Atendimento Ativo (Flow)
            Webhook->>DB: Bot responde cliente interativamente
            opt Chega no nó Handoff (Transbordo)
                Webhook->>DB: Atribui operador específico se configurado
            end
        else Há Regra de Automação (Automation)
            Webhook->>DB: Dispara triggers (first_inbound_message / new_message_received)
            opt Ação: assign_conversation (Rodízio / Específico)
                Webhook->>DB: Atualiza assigned_agent_id da conversa
            end
        else Há IA (Auto-Reply)
            Webhook->>DB: IA responde; no limite/handoff direciona a um humano
        end
    end

    DB-->>Realtime: Evento de inserção / update
    Realtime-->>OperadorA: Notifica Inbox (/inbox)
    Realtime-->>OperadorB: Notifica Inbox (/inbox)

    Note over OperadorA,OperadorB: Conversa surge na aba "Não atribuídas" e "Todas".<br/>O primeiro que clicar em "Atribuir a mim" assume o cliente.
```

---

## 3. Como a Caixa de Entrada Separa as Mensagens

A Caixa de Entrada possui 5 abas de visualização com contadores em tempo real (definidas em `src/lib/inbox/views.ts`):

| Aba | Critério Técnico | Para quem aparece? |
|---|---|---|
| **Todas** | `status != 'closed'` | Para **todos** os membros da conta. |
| **Não atribuídas** | `assigned_agent_id IS NULL` | Para **todos** os operadores (esperando alguém assumir). |
| **Minhas** | `assigned_agent_id == currentUserId` | **Apenas** para o operador ao qual foi atribuída. |
| **Sem resposta** | `last_message_from == 'customer'` | Mostra conversas onde o cliente está aguardando retorno. |
| **Não lidas** | `unread_count > 0` | Mostra conversas com mensagens pendentes de leitura. |

---

## 4. Onde a Atribuição Acontece Atualmente

A plataforma suporta atribuição de conversas em 4 pontos:

### A. Manual (Pelo Operador na Inbox)
No topo da conversa aberta (`src/components/inbox/message-thread.tsx`), há um seletor de atendente:
* O operador clica em **"Atribuir a mim"** ou seleciona outro colega da lista.
* Isso dispara a atualização de `conversations.assigned_agent_id`.
* O trigger `notify_conversation_assigned` cria uma notificação com sininho no painel do operador escolhido.

### B. Por Fluxos de Chatbot (Flows)
No construtor visual de fluxos:
* O robô conversa com o cliente por botões/menus.
* Quando o cliente escolhe "Falar com atendente", o nó de **Handoff (Transbordo)** pode ter um `assign_to: "<id_do_operador>"`.

### C. Por IA (Auto-Reply Handoff)
Se a IA estiver ligada (`src/lib/ai/auto-reply.ts`):
* A IA tenta responder dúvidas usando a base de conhecimento.
* Se atingir o limite de mensagens ou o cliente pedir transbordo humano, ela direciona para o `handoffAgentId` configurado na IA.

### D. Por Regras de Automação (Automations Engine)
Em **Automações**:
* Gatilhos: *"Primeira mensagem recebida"* ou *"Nova mensagem recebida"*.
* Ação: **"Atribuir conversa"** (`assign_conversation`).
* Modos:
  1. **Específico**: Atribui sempre ao operador X selecionado.
  2. **Rodízio (Round-Robin)**: Distribui entre a equipe.

---

## 5. Como o Sistema Sabe Quem Está Logado? (Presença)

O sistema possui uma infraestrutura completa de presença (`member_presence` e `src/lib/presence.ts`):
* A cada **30 segundos**, cada aba aberta do navegador do operador envia um sinal de vida (*heartbeat*) através da função SQL `touch_presence()`.
* **Critério de Online**: O operador é considerado `online` se enviou batimento nos últimos **75 segundos** (`OFFLINE_AFTER_MS = 75_000`).
* Se fechar a aba ou fizer logout, após 75s o sistema passa a considerá-lo automaticamente como `offline`.

---

## 6. O Ponto de Ajuste: O "Rodízio" Anterior vs. Rodízio Inteligente

### Como estava antes:
No arquivo `src/lib/automations/engine.ts` (linhas 475–490), o modo `round_robin` possuía uma implementação provisória:
```typescript
if (cfg.mode === 'round_robin') {
  // Pegava apenas o primeiro perfil cadastrado no banco:
  const { data: profiles } = await db
    .from('profiles')
    .select('user_id')
    .eq('account_id', args.automation.account_id)
    .limit(1)
  agentId = profiles?.[0]?.user_id
}
```
* **Problema**: Sempre caía na mesma pessoa (o autor da automação / primeiro usuário do banco), ignorava quem estava logado e não fazia revezamento.

### Como fica com o Ajuste (Distribuição Inteligente entre Logados):
1. **Filtra apenas operadores ONLINE**: Consulta `member_presence` e seleciona quem está com status `online` nos últimos 75 segundos.
2. **Ignora perfis somente-leitura**: Perfis com papel `viewer` não recebem atendimentos; apenas `agent`, `admin` e `owner`.
3. **Balanceamento de Carga Justo (Least Busy)**: Entre os operadores que estão online, a mensagem vai para aquele que tem **menos conversas abertas no momento**.
4. **Desempate por antiguidade**: Se dois operadores tiverem o mesmo número de conversas abertas, ela vai para aquele que recebeu uma conversa há mais tempo.
5. **Fallback seguro**: Se **nenhum** operador estiver online no momento da mensagem, ela permanece na fila **"Não atribuídas"** para que a equipe veja assim que fizer login.

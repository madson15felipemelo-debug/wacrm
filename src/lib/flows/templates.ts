/**
 * Starter flow templates.
 *
 * Pre-canned flows users can clone with one click instead of
 * building from scratch. Each template is a plain JS object describing
 * the same shape `/api/flows` PUT accepts — name, trigger config,
 * entry_node_id, fallback_policy, nodes[] — keyed by a stable
 * `slug`.
 */

import type {
  CollectInputNodeConfig,
  ConditionNodeConfig,
  HandoffNodeConfig,
  KeywordTriggerConfig,
  SendButtonsNodeConfig,
  SendListNodeConfig,
  SendMessageNodeConfig,
  StartNodeConfig,
} from "./types";

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config:
    | StartNodeConfig
    | SendMessageNodeConfig
    | SendButtonsNodeConfig
    | SendListNodeConfig
    | CollectInputNodeConfig
    | ConditionNodeConfig
    | HandoffNodeConfig
    | Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  /** Used by the gallery to surface a relevant icon. lucide-react name. */
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: KeywordTriggerConfig | Record<string, unknown>;
  entry_node_id: string;
  nodes: FlowTemplateNode[];
}

// ============================================================
// 1. Apresentação do Serviço de WhatsApp & Para Quem Serve
// ============================================================
export const WHATSAPP_SERVICE_PRESENTATION: FlowTemplate = {
  slug: "whatsapp_service_presentation",
  name: "Apresentação do Serviço de WhatsApp & Para Quem Serve",
  description:
    "Fluxo comercial completo do Robô apresentando nosso serviço oficial de WhatsApp (CRM, Automação, IA e Disparos), explicando para quem ele serve por segmento e qualificando o cliente para o consultor.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: {
    keywords: [
      "oi",
      "olá",
      "ola",
      "whatsapp",
      "serviço",
      "servico",
      "conhecer",
      "funciona",
      "automação",
      "automacao",
      "crm",
      "planos",
      "preço",
      "preco",
    ],
    match_type: "contains",
  },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "boas_vindas" },
    },
    {
      node_key: "boas_vindas",
      node_type: "send_buttons",
      config: {
        header_text: "Automação & CRM Oficial WhatsApp",
        text: "Olá! 👋 Bem-vindo(a)!\n\nTransformamos o seu WhatsApp em uma central completa de atendimento, vendas e cobrança na API Oficial da Meta:\n\n• 🤖 Robôs de Fluxo e Agentes de IA 24h\n• 👥 Multi-atendimento com distribuição de filas\n• 🚀 Disparos em massa com alta entrega\n• 📊 Relatórios de SLA, TME, TMR e custos Meta\n\nO que você gostaria de ver agora?",
        footer_text: "Toque em uma opção abaixo para continuar",
        buttons: [
          {
            reply_id: "ver_servico",
            title: "O que fazemos",
            next_node_key: "apresentacao_servico",
          },
          {
            reply_id: "para_quem",
            title: "Para quem serve",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "falar_especialista",
            title: "Falar com consultor",
            next_node_key: "coletar_nome",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "apresentacao_servico",
      node_type: "send_buttons",
      config: {
        header_text: "Como funciona nosso serviço",
        text: "Nossa plataforma conecta seu número à API Oficial da Meta e organiza toda a sua operação em 4 pilares:\n\n1️⃣ *Automação + IA 24h*: O Robô faz a triagem imediata e o Agente de IA responde dúvidas, negocia e transfere para o humano na hora certa.\n2️⃣ *Caixa de Entrada & Filas*: Vários operadores no mesmo número, com distribuição automática e carteira fidelizada.\n3️⃣ *Disparos Oficiais*: Envio de lotes com controle de janela 24h e custos direto da Meta.\n4️⃣ *Gestão & SLA*: Auditoria completa de TME, TMR do operador e tabulações.",
        footer_text: "Veja se o sistema é ideal para o seu negócio",
        buttons: [
          {
            reply_id: "ir_para_quem",
            title: "Para quem serve?",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "quero_demo",
            title: "Quero demonstração",
            next_node_key: "coletar_nome",
          },
          {
            reply_id: "tirar_duvida",
            title: "Falar com consultor",
            next_node_key: "coletar_nome",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "menu_para_quem_serve",
      node_type: "send_list",
      config: {
        header_text: "Para quem nosso serviço serve?",
        text: "Atendemos empresas que precisam de escala, velocidade de resposta e controle total sobre a equipe no WhatsApp.\n\nSelecione abaixo o perfil da sua operação para ver como aplicamos no seu cenário:",
        footer_text: "Escolha o segmento da sua empresa",
        button_label: "Ver segmentos",
        sections: [
          {
            title: "Perfis de Operação",
            rows: [
              {
                reply_id: "seg_cobranca",
                title: "Cobrança e Crédito",
                description:
                  "Disparos em massa, triagem de CPF, IA negociadora e controle de acordos",
                next_node_key: "detalhe_cobranca",
              },
              {
                reply_id: "seg_vendas",
                title: "Comercial e Vendas",
                description:
                  "Qualificação rápida de leads, funil de vendas e distribuição por fila",
                next_node_key: "detalhe_vendas",
              },
              {
                reply_id: "seg_clinicas",
                title: "Clínicas e Escritórios",
                description:
                  "Agendamentos, lembretes de retorno e vários atendentes em 1 só número",
                next_node_key: "detalhe_servicos",
              },
              {
                reply_id: "seg_sac",
                title: "SAC e Alto Volume",
                description:
                  "Autoatendimento 24h, redução de fila e relatórios de TME/TMR e SLA",
                next_node_key: "detalhe_sac",
              },
            ],
          },
          {
            title: "Atendimento Direto",
            rows: [
              {
                reply_id: "seg_outro",
                title: "Outro segmento / Dúvidas",
                description:
                  "Falar direto com um especialista para avaliar minha operação",
                next_node_key: "coletar_nome",
              },
            ],
          },
        ],
      } as SendListNodeConfig,
    },
    {
      node_key: "detalhe_cobranca",
      node_type: "send_buttons",
      config: {
        header_text: "Ideal para Cobrança e Crédito",
        text: "Para *Assessorias de Cobrança, Securitizadoras e Financeiras*, entregamos:\n\n✅ Disparo ativo em lote com alta entregabilidade oficial Meta\n✅ Triagem automática e fidelização de carteira por CPF/operador\n✅ Agente de IA que negocia, quebra objeções e encaminha acordos\n✅ Relatórios executivos de acionamento → resposta → acordo e controle de TME/TMR",
        footer_text: "Deseja ver na prática ou conhecer outro perfil?",
        buttons: [
          {
            reply_id: "cob_demo",
            title: "Agendar demonstração",
            next_node_key: "coletar_nome",
          },
          {
            reply_id: "cob_outros",
            title: "Ver outros perfis",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "cob_servico",
            title: "Resumo do sistema",
            next_node_key: "apresentacao_servico",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "detalhe_vendas",
      node_type: "send_buttons",
      config: {
        header_text: "Ideal para Times Comerciais",
        text: "Para *Equipes de Vendas B2B e B2C*, nossa plataforma resolve a perda de leads por demora no atendimento:\n\n✅ Resposta imediata em segundos (24h por dia) com Robô + IA\n✅ Distribuição automática e justa de leads entre os vendedores\n✅ Funil Kanban, etiquetas de tabulação e lembretes de follow-up\n✅ Painel gerencial mostrando tempo de resposta (TMR) de cada vendedor",
        footer_text: "Deseja ver na prática ou conhecer outro perfil?",
        buttons: [
          {
            reply_id: "ven_demo",
            title: "Agendar demonstração",
            next_node_key: "coletar_nome",
          },
          {
            reply_id: "ven_outros",
            title: "Ver outros perfis",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "ven_servico",
            title: "Resumo do sistema",
            next_node_key: "apresentacao_servico",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "detalhe_servicos",
      node_type: "send_buttons",
      config: {
        header_text: "Clínicas, Escritórios e Serviços",
        text: "Para *Clínicas, Escritórios Jurídicos/Contábeis e Prestadores de Serviço*:\n\n✅ Centralize toda a equipe em um único número oficial de WhatsApp\n✅ Triagem inicial automática para direcionar ao setor correto\n✅ Controle de agendamentos, lembretes de retorno e histórico unificado\n✅ Visão transparente de custos da Meta e produtividade da recepção",
        footer_text: "Deseja ver na prática ou conhecer outro perfil?",
        buttons: [
          {
            reply_id: "srv_demo",
            title: "Agendar demonstração",
            next_node_key: "coletar_nome",
          },
          {
            reply_id: "srv_outros",
            title: "Ver outros perfis",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "srv_servico",
            title: "Resumo do sistema",
            next_node_key: "apresentacao_servico",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "detalhe_sac",
      node_type: "send_buttons",
      config: {
        header_text: "SAC e Operações de Alto Volume",
        text: "Para *Centrais de Atendimento e Suporte de Alto Volume*:\n\n✅ Retenção de dúvidas frequentes no Robô e Agente de IA sem fila humana\n✅ Transbordo inteligente para o operador já com resumo do caso\n✅ Monitoramento em tempo real da janela gratuita de 24h da Meta\n✅ Relatórios analíticos de SLA (<5 min), TME, TMR e TMA por atendente",
        footer_text: "Deseja ver na prática ou conhecer outro perfil?",
        buttons: [
          {
            reply_id: "sac_demo",
            title: "Agendar demonstração",
            next_node_key: "coletar_nome",
          },
          {
            reply_id: "sac_outros",
            title: "Ver outros perfis",
            next_node_key: "menu_para_quem_serve",
          },
          {
            reply_id: "sac_servico",
            title: "Resumo do sistema",
            next_node_key: "apresentacao_servico",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "coletar_nome",
      node_type: "collect_input",
      config: {
        prompt_text:
          "Perfeito! Para eu te conectar com nosso especialista comercial, como posso te chamar? (Digite seu nome)",
        var_key: "nome_cliente",
        next_node_key: "coletar_empresa",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "coletar_empresa",
      node_type: "collect_input",
      config: {
        prompt_text:
          "Prazer, {{vars.nome_cliente}}! Qual é o nome da sua empresa e quantos atendentes vocês têm hoje no WhatsApp?",
        var_key: "empresa_atendentes",
        next_node_key: "msg_confirmacao_handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "msg_confirmacao_handoff",
      node_type: "send_message",
      config: {
        text: "Obrigado, {{vars.nome_cliente}}! ✅ Já registrei seus dados ({{vars.empresa_atendentes}}) e estou transferindo sua conversa agora mesmo para um especialista apresentar a plataforma ao vivo.",
        next_node_key: "transferir_comercial",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "transferir_comercial",
      node_type: "handoff",
      config: {
        note: "Lead Comercial (Fluxo Apresentação WhatsApp) — Nome: {{vars.nome_cliente}} | Empresa/Equipe: {{vars.empresa_atendentes}}. Deseja conhecer o serviço / agendar demonstração.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 2. Menu de boas-vindas — the example from the owner's brief
// ============================================================
const WELCOME_MENU: FlowTemplate = {
  slug: "welcome_menu",
  name: "Menu de boas-vindas",
  description:
    "Recebe quem digita uma palavra-chave e encaminha para o atendente certo, conforme seja cliente novo ou já existente.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["suporte", "ajuda", "oi"], match_type: "contains" },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "welcome" },
    },
    {
      node_key: "welcome",
      node_type: "send_buttons",
      config: {
        text: "Oi! 👋 Bem-vindo ao suporte. Você já é nosso cliente ou está chegando agora?",
        footer_text: "Toque em um botão abaixo para continuar.",
        buttons: [
          {
            reply_id: "existing",
            title: "Já sou cliente",
            next_node_key: "existing_handoff",
          },
          {
            reply_id: "new",
            title: "Sou novo por aqui",
            next_node_key: "new_handoff",
          },
        ],
      } as SendButtonsNodeConfig,
    },
    {
      node_key: "existing_handoff",
      node_type: "handoff",
      config: {
        note: "Cliente existente precisa de ajuda — confira o histórico da conta antes de responder.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "new_handoff",
      node_type: "handoff",
      config: {
        note: "Cliente novo — envie os preços e o link de primeiros passos.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// 3. FAQ bot — list-message answers, fully automated
// ============================================================
const FAQ_BOT: FlowTemplate = {
  slug: "faq_bot",
  name: "Bot de perguntas frequentes",
  description:
    "Responde às dúvidas mais comuns automaticamente. O cliente escolhe um tema na lista, o bot envia a resposta e encerra.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: {
    keywords: ["dúvida", "duvidas", "informação"],
    match_type: "contains",
  },
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "topics" },
    },
    {
      node_key: "topics",
      node_type: "send_list",
      config: {
        text: "Com o que posso ajudar?",
        button_label: "Ver temas",
        sections: [
          {
            title: "Perguntas frequentes",
            rows: [
              {
                reply_id: "hours",
                title: "Horário de atendimento",
                next_node_key: "answer_hours",
              },
              {
                reply_id: "pricing",
                title: "Preços",
                next_node_key: "answer_pricing",
              },
              {
                reply_id: "refunds",
                title: "Política de reembolso",
                next_node_key: "answer_refunds",
              },
            ],
          },
          {
            title: "Outros",
            rows: [
              {
                reply_id: "human",
                title: "Falar com uma pessoa",
                next_node_key: "human_handoff",
              },
            ],
          },
        ],
      } as SendListNodeConfig,
    },
    {
      node_key: "answer_hours",
      node_type: "send_message",
      config: {
        text: "Atendemos de segunda a sexta, das 9h às 18h. Nos fins de semana, só casos urgentes.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_pricing",
      node_type: "send_message",
      config: {
        text: "Nossos planos começam em R$ 49/mês. Veja todos os detalhes em https://exemplo.com/precos.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "answer_refunds",
      node_type: "send_message",
      config: {
        text: "Reembolsamos em até 30 dias após a compra. Responda com o número do pedido que nós cuidamos disso.",
        next_node_key: "end",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "human_handoff",
      node_type: "handoff",
      config: {
        note: "O cliente pediu para falar com uma pessoa a partir do bot de perguntas frequentes.",
      } as HandoffNodeConfig,
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 4. Lead capture — collect_input chain, ends in a handoff
// ============================================================
const LEAD_CAPTURE: FlowTemplate = {
  slug: "lead_capture",
  name: "Captura de leads",
  description:
    "Recebe quem fala com você pela primeira vez, coleta nome, e-mail e empresa, e transfere para vendas com as respostas na nota.",
  icon: "UserPlus",
  trigger_type: "first_inbound_message",
  trigger_config: {},
  entry_node_id: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "intro" },
    },
    {
      node_key: "intro",
      node_type: "send_message",
      config: {
        text: "Boas-vindas! 👋 Vou fazer algumas perguntas rápidas para te encaminhar à pessoa certa.",
        next_node_key: "ask_name",
      } as SendMessageNodeConfig,
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: {
        prompt_text: "Qual é o seu nome?",
        var_key: "name",
        next_node_key: "ask_email",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_email",
      node_type: "collect_input",
      config: {
        prompt_text: "Obrigado, {{vars.name}}! Qual é o seu e-mail de trabalho?",
        var_key: "email",
        next_node_key: "ask_company",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "ask_company",
      node_type: "collect_input",
      config: {
        prompt_text: "Quase lá — qual é o nome da sua empresa?",
        var_key: "company",
        next_node_key: "handoff",
      } as CollectInputNodeConfig,
    },
    {
      node_key: "handoff",
      node_type: "handoff",
      config: {
        note: "Novo lead — nome={{vars.name}}, e-mail={{vars.email}}, empresa={{vars.company}}.",
      } as HandoffNodeConfig,
    },
  ],
};

// ============================================================
// Registry
// ============================================================

const TEMPLATES: Record<string, FlowTemplate> = {
  whatsapp_service_presentation: WHATSAPP_SERVICE_PRESENTATION,
  welcome_menu: WELCOME_MENU,
  faq_bot: FAQ_BOT,
  lead_capture: LEAD_CAPTURE,
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  robots: { index: true, follow: true },
};

// Public, unauthenticated page — required by Meta as the "Privacy
// policy URL" before an app using the WhatsApp Business API can be
// published. Content is generic but LGPD-aware; review/adjust the
// business details (name, contact, address) before relying on this
// for real compliance purposes.
export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-16 text-foreground">
      <h1 className="text-3xl font-bold">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 8 de setembro de 2026
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          Esta Política de Privacidade descreve como a <strong>Fácil Resultado</strong>{" "}
          ("nós", "nosso") coleta, usa e protege as informações de contatos e
          clientes que interagem conosco através do WhatsApp Business, no
          contexto do uso da API oficial do WhatsApp (Meta) integrada ao
          nosso sistema de CRM.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          1. Quais dados coletamos
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Número de telefone associado à sua conta do WhatsApp;</li>
          <li>Nome de exibição informado no seu perfil do WhatsApp;</li>
          <li>
            Conteúdo das mensagens trocadas conosco (texto, mídia, respostas a
            modelos de mensagem);
          </li>
          <li>
            Metadados de entrega e status das mensagens (enviada, entregue,
            lida).
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">
          2. Como usamos esses dados
        </h2>
        <p>Usamos as informações coletadas exclusivamente para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Atendimento e suporte ao cliente;</li>
          <li>Envio de comunicações comerciais solicitadas ou autorizadas;</li>
          <li>
            Organização do relacionamento comercial em nosso sistema interno
            de CRM (funis de venda, histórico de conversas);
          </li>
          <li>Cumprimento de obrigações legais e regulatórias aplicáveis.</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade.</p>

        <h2 className="text-lg font-semibold text-foreground">
          3. Compartilhamento de dados
        </h2>
        <p>
          Seus dados são processados através da infraestrutura da{" "}
          <strong>Meta Platforms, Inc.</strong> (WhatsApp Business Cloud API),
          necessária para o envio e recebimento de mensagens, e armazenados de
          forma segura em nossos servidores (Supabase), com controles de
          acesso e criptografia de credenciais sensíveis.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          4. Retenção de dados
        </h2>
        <p>
          Mantemos seus dados de conversa pelo tempo necessário para prestar
          o atendimento e cumprir obrigações legais, ou até que você solicite
          a exclusão.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          5. Seus direitos (LGPD)
        </h2>
        <p>
          Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018),
          você tem direito a:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Confirmar a existência de tratamento dos seus dados;</li>
          <li>Acessar, corrigir ou solicitar a exclusão dos seus dados;</li>
          <li>Revogar o consentimento para o recebimento de mensagens;</li>
          <li>Solicitar a portabilidade dos seus dados.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">
          6. Contato
        </h2>
        <p>
          Para exercer seus direitos ou esclarecer dúvidas sobre esta
          política, entre em contato pelo e-mail:{" "}
          <a
            href="mailto:madson15.felipemelo@gmail.com"
            className="text-primary underline"
          >
            madson15.felipemelo@gmail.com
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          7. Alterações a esta política
        </h2>
        <p>
          Podemos atualizar esta política periodicamente. A data da última
          atualização está sempre indicada no topo desta página.
        </p>
      </section>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  robots: { index: true, follow: true },
};

// Public, unauthenticated page — required by Meta's app-publish
// checklist alongside the privacy policy. Generic terms covering the
// WhatsApp Business messaging use case; review/adjust before relying
// on this for real legal compliance.
export default function TermsOfServicePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-16 text-foreground">
      <h1 className="text-3xl font-bold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 8 de setembro de 2026
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          Estes Termos de Uso regem o relacionamento entre a{" "}
          <strong>Fácil Resultado</strong> ("nós") e as pessoas que trocam
          mensagens conosco através do WhatsApp Business ("você").
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          1. Aceite dos termos
        </h2>
        <p>
          Ao iniciar ou responder a uma conversa conosco pelo WhatsApp, você
          concorda com estes Termos de Uso e com nossa{" "}
          <a href="/privacy-policy" className="text-primary underline">
            Política de Privacidade
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          2. Natureza do serviço
        </h2>
        <p>
          Utilizamos a API oficial do WhatsApp Business (Meta) para prestar
          atendimento, suporte e comunicação comercial. As mensagens trocadas
          são processadas por meio de um sistema de CRM próprio, sujeito às
          políticas da Meta Platforms, Inc. para o WhatsApp Business.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          3. Uso adequado
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Você concorda em não utilizar este canal para fins ilícitos,
            abusivos ou que violem os Termos de Serviço do WhatsApp;
          </li>
          <li>
            Reservamo-nos o direito de encerrar o atendimento em caso de uso
            indevido, spam ou conduta abusiva.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">
          4. Comunicações comerciais
        </h2>
        <p>
          Mensagens comerciais (promoções, novidades, lembretes) só são
          enviadas com seu consentimento prévio ou dentro das regras de
          janela de atendimento estabelecidas pela Meta. Você pode revogar
          esse consentimento a qualquer momento, respondendo "PARAR" ou
          entrando em contato pelo e-mail abaixo.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          5. Limitação de responsabilidade
        </h2>
        <p>
          Não nos responsabilizamos por indisponibilidades ou falhas
          decorrentes da infraestrutura do WhatsApp/Meta, fora do nosso
          controle.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          6. Alterações
        </h2>
        <p>
          Podemos atualizar estes termos periodicamente. A data da última
          atualização está sempre indicada no topo desta página.
        </p>

        <h2 className="text-lg font-semibold text-foreground">7. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{" "}
          <a
            href="mailto:madson15.felipemelo@gmail.com"
            className="text-primary underline"
          >
            madson15.felipemelo@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}

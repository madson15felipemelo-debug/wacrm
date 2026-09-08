import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusão de Dados",
  robots: { index: true, follow: true },
};

// Public, unauthenticated page — Meta's app-publish checklist asks for
// either a "Data deletion instructions URL" or a data-deletion request
// callback endpoint. We don't have an automated callback wired up, so
// this page documents the manual (email-based) request process instead.
export default function DataDeletionPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-16 text-foreground">
      <h1 className="text-3xl font-bold">Exclusão de Dados</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: 8 de setembro de 2026
      </p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/90">
        <p>
          Você pode solicitar a exclusão dos dados que coletamos sobre você
          através da nossa integração com o WhatsApp Business (número de
          telefone, nome de exibição e histórico de conversas) a qualquer
          momento.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          Como solicitar
        </h2>
        <p>Envie um e-mail para:</p>
        <p>
          <a
            href="mailto:madson15.felipemelo@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20dados"
            className="text-primary underline"
          >
            madson15.felipemelo@gmail.com
          </a>
        </p>
        <p>com o assunto "Solicitação de exclusão de dados", informando:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>O número de telefone associado à sua conta do WhatsApp;</li>
          <li>Seu nome, para localizarmos seu cadastro.</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Prazo</h2>
        <p>
          Processamos solicitações de exclusão em até <strong>15 dias
          corridos</strong> a partir do recebimento, conforme previsto na Lei
          Geral de Proteção de Dados (Lei nº 13.709/2018). Você receberá uma
          confirmação por e-mail assim que a exclusão for concluída.
        </p>

        <h2 className="text-lg font-semibold text-foreground">
          O que é excluído
        </h2>
        <p>
          Removemos permanentemente seu histórico de conversas, dados de
          contato e qualquer informação associada ao seu número de telefone
          em nosso CRM. Dados que sejamos legalmente obrigados a reter (por
          exemplo, para fins fiscais) podem ser mantidos pelo prazo exigido
          por lei, de forma isolada e não utilizada para outros fins.
        </p>

        <p className="pt-2">
          Consulte também nossa{" "}
          <a href="/privacy-policy" className="text-primary underline">
            Política de Privacidade
          </a>
          .
        </p>
      </section>
    </main>
  );
}

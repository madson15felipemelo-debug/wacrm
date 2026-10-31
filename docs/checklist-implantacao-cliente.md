# Checklist de Implantação — Cliente Novo

Roteiro passo a passo para conectar a API oficial do WhatsApp Business
de um cliente novo a uma instância do LM Core CRM e deixá-la pronta
para uso, do zero até o primeiro disparo em massa aprovado.

Escrito a partir da implantação real da conta "Fácil Resultado"
(setembro/2026), já sem os desvios e erros que apareceram naquela
primeira vez — siga na ordem, marcando cada item.

**Tempo esperado seguindo este roteiro:** 1h30–2h30, a maior parte
esperando aprovações da Meta (revisão de nome, verificação de negócio
se ainda não tiver, aprovação de template).

---

## 0. Antes de começar — dados que você precisa ter em mãos

- [ ] Nome do negócio do cliente (razão social ou nome fantasia)
- [ ] Número de telefone que será usado no WhatsApp Business (real,
      capaz de receber SMS/ligação, **sem WhatsApp pessoal ativo nele**)
- [ ] E-mail de contato do cliente
- [ ] Ramo de atuação do cliente (para adaptar nomes do funil,
      automações e templates — ex: cobrança, imobiliária, clínica)
- [ ] Acesso a uma conta do Facebook do cliente (ou seu, se for você
      quem administra) com **e-mail confirmado**

---

## 1. Meta Business Manager — verificação do negócio

1. Acesse [business.facebook.com](https://business.facebook.com).
2. Se o cliente ainda não tem um Business Portfolio, crie um novo.
3. Vá em **Configurações do negócio → Segurança → Verificação do
   negócio** (ou **Centro de Segurança**).
4. Envie os documentos pedidos (CNPJ, comprovante de endereço, etc.).
   - Pode levar de minutos a alguns dias para aprovar — **inicie este
     passo o quanto antes**, os próximos passos não dependem 100%
     dele, mas o número de telefone só vira "produção" de verdade
     depois de aprovado.

> 💡 Se o cliente ainda não tem CNPJ, pode verificar como pessoa
> física por enquanto e trocar depois — não precisa recriar nada,
> é só uma atualização cadastral.

---

## 2. Criar o app na Meta for Developers

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. **Create App** → tipo **Empresa** (Business).
3. Preencha nome do app (ex: "`<Cliente>` Conecta") e crie.
4. Dentro do app, vá em **Casos de utilização** → adicione
   **"Connect on WhatsApp"**.

---

## 3. Cadastrar e verificar o número de telefone

1. Dentro do fluxo "Connect on WhatsApp" → **Step 2. Production
   setup** → seção **"Register your WhatsApp phone number"**.
2. Clique em **Adicionar número de telefone**, informe o número real
   do cliente e o nome de exibição do negócio.
3. Verifique por SMS ou ligação.
   - ⚠️ **Se aparecer "Limite de códigos de verificação excedido"**:
     pare de tentar, espere ~1h e tente de novo (esse bloqueio da
     Meta reinicia a cada tentativa nova).
4. Anote os dois IDs que aparecem nessa tela:
   - **Phone Number ID**
   - **WhatsApp Business Account ID (WABA ID)**

### 3.1 Ativar 2FA na conta pessoal do Facebook (pré-requisito escondido)

Antes de tentar configurar o PIN de duas etapas do número, a Meta
exige que a **conta pessoal do Facebook** que administra tenha
autenticação de dois fatores ativada. Se pular este passo, a etapa
de PIN falha com um erro genérico ("The PIN could not be changed").

1. [business.facebook.com/security/2fac/settings](https://www.facebook.com/security/2fac/settings/)
   (ou Centro de Contas → Palavra-passe e segurança → Autenticação de
   dois fatores).
2. Ative para o perfil do **Facebook** (não Instagram/Threads).
3. Confirme com SMS ou app autenticador.

> Você **não precisa** conseguir ativar a "Verificação de dois
> passos" do número pela interface do WhatsApp Manager — essa tela
> às vezes trava com erro mesmo com o 2FA ativo. Pule direto para o
> passo 6 (registro via API), que define o PIN sozinho.

---

## 4. Usuário de sistema + token permanente

1. **Configurações do negócio → Utilizadores → Utilizadores do
   sistema** → **Adicionar** → nome (ex: "CRM Integração") → papel
   **Admin**.
2. Abra o usuário criado → **Atribuir ativos**:
   - Aba **Apps** → selecione o app do cliente → permissão **"Gerir
     app"** (acesso total) → confirme.
   - Se não conseguir atribuir a WABA pelo mesmo diálogo, vá em
     **Contas do WhatsApp** (barra lateral) → selecione a WABA do
     cliente → aba **Pessoas** → **Atribuir pessoas** → busque o
     usuário de sistema → acesso total.
3. De volta no usuário de sistema → **Gerar token**:
   - App: o do cliente
   - Duração: **Nunca** (permanente)
   - Permissões: `whatsapp_business_management` e
     `whatsapp_business_messaging` (não precisa marcar as demais)
4. **Copie o token na hora** — só é exibido uma vez.

---

## 5. Deploy da instância

Se for uma instância **nova e isolada** para este cliente:

1. Faça fork/clone do repositório base.
2. Crie um projeto novo no [Supabase](https://supabase.com) →
   rode as migrations do projeto.
3. Importe o repositório no [Vercel](https://vercel.com/new) →
   **Import .env** a partir do `.env.local` preenchido → clique em
   **Deploy**.
4. Depois do primeiro deploy, edite a variável
   `NEXT_PUBLIC_SITE_URL` para a URL real gerada (ex:
   `https://<projeto>.vercel.app`) — se ela tiver sido salva como
   tipo **Secret**, não dá para editar, precisa **deletar e recriar**
   como tipo **Config**. Depois, **Redeploy**.

Se for um **cliente adicional numa instância multi-conta já
existente**: pule este passo — o webhook já identifica cada cliente
pelo `phone_number_id`, então basta criar uma conta nova dentro do
CRM (ver seção 9) e configurar o WhatsApp dela.

### 5.1 Variáveis de ambiente obrigatórias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ENCRYPTION_KEY
META_APP_SECRET          ← pegue em Meta → App settings → Basic → App secret → Show
                            ⚠️ NÃO deixe o valor de exemplo "your-meta-app-secret"
                            do .env.local.example — isso rejeita TODO webhook
                            real com erro 401 "invalid signature" e é
                            silencioso (a Meta mostra "Successfully tested"
                            mesmo assim, porque o teste genérico dela nem
                            chega a validar assinatura do jeito que um
                            evento real valida). Confirme que tem 32
                            caracteres hexadecimais.
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_APP_LOCALE   → pt-BR
AUTOMATION_CRON_SECRET
```

---

## 6. Configurar o WhatsApp dentro do CRM

1. No CRM: **Configurações → WhatsApp**.
2. Preencha:
   - ID do número de telefone (passo 3)
   - ID da conta do WhatsApp Business (passo 3)
   - Token de acesso permanente (passo 4)
   - Token de verificação do webhook — invente um texto único por
     cliente (ex: `<cliente>-verify-2026`)
   - PIN de verificação em duas etapas — invente um PIN de 6 dígitos
     (não precisa ter sido criado antes na Meta; salvar aqui com PIN
     preenchido **é o que registra o número e define o PIN ao mesmo
     tempo**, via chamada `/register` da API)
3. **Salvar configuração**. Deve aparecer **"Registrado"**.

---

## 7. Configurar o webhook na Meta

1. Copie a **URL de callback do webhook** que aparece na mesma tela
   do CRM (`https://<dominio>/api/whatsapp/webhook`).
2. Na Meta: **Step 2 → Configure Webhooks**:
   - Callback URL: a URL copiada
   - Verify token: o mesmo valor do passo 6
   - **Verify and save**
3. Role até **Webhook fields** → ative o campo **`messages`**
   (mínimo necessário para receber mensagens).

> ⚠️ **Não use túnel local (ngrok/localtunnel) para isso.** É
> instável, cai sozinho, e a Meta acaba não validando de forma
> confiável. Faça o deploy real (seção 5) **antes** de configurar o
> webhook — economiza tempo e frustração.

---

## 8. Publicar o app

1. Meta → **Publicar** (Publish, barra lateral).
2. Preencha os campos pendentes em **App settings → Basic**:
   - **Privacy policy URL** — página `/privacy-policy` do CRM (já
     existe no template; ajuste o nome da empresa dentro do arquivo
     `src/app/privacy-policy/page.tsx` para o cliente)
   - **Terms of Service URL** — `/terms-of-service` (idem, ajustar)
   - **User data deletion instructions URL** — `/data-deletion` (idem)
   - **App icon** — pode reusar `public/brand/luma-mark.png` ou subir
     a logo do cliente
   - **Category** — "Negócio e Páginas"
3. Clique em **Publish**.

> ⚠️ **Enquanto "Unpublished", mensagens reais não chegam no
> webhook** — só testes manuais disparados pelo próprio painel da
> Meta (botão "Test" ao lado de cada campo de webhook). Não perca
> tempo tentando mandar mensagem real de teste antes de publicar.

---

## 9. Personalizar o CRM para o ramo do cliente

1. **Funis** → dropdown do funil → **Gerenciar funis** → renomeie o
   funil e as etapas para a linguagem do setor do cliente.
2. Se já existirem automações/fluxos de modelo (boas-vindas, FAQ,
   etc.), renomeie-os também pelo editor de cada um.
3. Se estiver adaptando dados que já existiam antes da tradução,
   ajuste e rode `supabase/traduzir-dados-existentes.sql` no SQL
   Editor do Supabase do cliente.

---

## 10. Criar e aprovar o primeiro template

1. **Modelos → Novo modelo**:
   - Nome: minúsculas/números/`_`
   - Categoria: prefira **Utility** para comunicações transacionais
     (cobrança, confirmação, lembrete) — aprovação tende a ser mais
     rápida e menos restritiva que "Marketing"
   - Idioma: `pt_BR`
   - Corpo com variáveis `{{1}}`, `{{2}}`... para personalização
2. Envie para aprovação. Acompanhe o status na mesma tela.
3. Evite linguagem agressiva/ameaçadora — a Meta rejeita, e (se for
   cobrança) a legislação brasileira também exige tom respeitoso.

---

## 11. Teste de ponta a ponta

1. Mande uma mensagem real de um celular pessoal para o número do
   cliente.
2. Confira se a conversa aparece em **Caixa de entrada** no CRM.
3. Se não chegar depois de confirmar ✓✓ (entregue) no celular:
   - Vercel → **Logs** → filtre por `/api/whatsapp/webhook` e mande
     a mensagem de novo, observando em tempo real.
   - `401 invalid signature` → `META_APP_SECRET` errado (ver seção 5.1).
   - Nenhuma linha aparece → app ainda "Unpublished", ou webhook
     field `messages` não está assinado.
4. Faça um disparo de teste (seção anterior deste projeto) com o
   template aprovado para um contato real.

---

## 12. Entrega ao cliente

- [ ] Apague conversas/contatos de teste criados durante a validação
- [ ] Repasse a URL de produção e credenciais de login
- [ ] Breve treinamento: Inbox, Funis, Disparos, Modelos
- [ ] Combine se o cliente gerencia o próprio Meta Business Manager
      ou se você mantém o acesso de administrador

---

## Erros mais comuns (resumo rápido para consulta futura)

| Sintoma | Causa | Solução |
|---|---|---|
| Supabase "Failed to fetch" no login | Projeto free tier pausado por inatividade | Resume project no dashboard Supabase |
| "The PIN could not be changed" | 2FA da conta pessoal do Facebook não ativado | Ativar 2FA (seção 3.1), depois salvar PIN direto no CRM |
| "Limite de códigos de verificação excedido" | Muitas tentativas de SMS/ligação seguidas | Esperar ~1h, tentar método alternativo |
| Webhook retorna 401 "invalid signature" nos Logs | `META_APP_SECRET` com valor de exemplo ou errado | Pegar valor real em App settings → Basic → mostrar |
| "Send to server" da Meta funciona mas mensagem real não chega | App ainda "Unpublished" | Completar checklist de Publish (seção 8) |
| Nada chega mesmo após publicar e testar | Webhook field `messages` não assinado, ou app errado subscrito na WABA | Conferir Webhook fields + `subscribed_apps_at` na tabela `whatsapp_config` |
| Túnel (ngrok/localtunnel) falha aleatoriamente | Infra gratuita instável | Não usar — fazer deploy real primeiro |
| Variável de ambiente salva como "Secret" não pode virar "Config" | Limitação do Vercel | Deletar a variável e recriar do zero já como Config |

quero # Guia Completo Passo a Passo — Como Subir uma Nova BM Blindada, Estável e Anti-Bloqueio

Este documento reúne o passo a passo completo para criar, verificar e conectar um novo **Portfólio Empresarial (BM)** em outro Gerenciador da Meta ao **LM Core CRM**, aplicando todas as práticas de **blindagem e estabilidade** para evitar bloqueios de conta, reprovação de nome de exibição e queda de qualidade do número.

> 📌 **Arquivo complementar no projeto:** Você também possui o roteiro técnico original em [`docs/checklist-implantacao-cliente.md`](./checklist-implantacao-cliente.md). Este guia expande aquele checklist com foco em **blindagem da BM, aprovação de nome e protocolo anti-bloqueio**.

---

## Parte 1 — Preparação e Blindagem do Ambiente (Antes de Criar a BM)

A maioria dos bloqueios imediatos da Meta ("Atividade incomum" ou restrição na criação da WABA) acontece por **sinais de risco no perfil ou navegador**. Siga estas 5 regras antes de começar:

1. **Perfil do Facebook "Hospedeiro" Real e Antigo:**
   - Use uma conta pessoal do Facebook real, com mais de 1 ano de criação e uso normal.
   - **Ative a Autenticação de Dois Fatores (2FA)** na conta pessoal do Facebook ([facebook.com/security/2fac/settings](https://www.facebook.com/security/2fac/settings/)) — preferencialmente via aplicativo autenticador (Google Authenticator / Authy) ou SMS. *Sem 2FA ativo no perfil pessoal, a Meta bloqueia a criação de Usuários do Sistema e o registro do PIN do número.*
2. **Isolamento de Navegador e IP:**
   - Crie um **Perfil novo no Google Chrome** exclusivo para administrar essa nova BM.
   - **NÃO use VPN** e não use aba anônima ao criar a BM ou cadastrar cartão. Use internet residencial/comercial fixa (ou roteamento 4G/5G do celular se o IP do escritório já teve BM bloqueada recentemente).
3. **Tenha sempre 2 Administradores na BM:**
   - Assim que criar a BM, convide um **2º perfil de confiança como Administrador de Backup**. Se um perfil pessoal sofrer checkpoint de selfie/documento, você continua operando a BM normalmente pelo segundo administrador.
4. **Cartão de Crédito Limpo (Nunca usado em BM bloqueada):**
   - Use um cartão de crédito (ou cartão virtual novo gerado no app do banco) que **nunca tenha sido vinculado a outra conta de anúncios ou BM restrita**.
5. **Chip / Número de Telefone Virgem de WhatsApp:**
   - O número precisa receber SMS ou ligação de voz.
   - **Importante:** Se o número já estiver aberto no aplicativo WhatsApp comum ou WhatsApp Business do celular, vá no celular em **Configurações → Conta → Apagar minha conta** antes de cadastrá-lo na API Oficial da Meta.

---

## Parte 2 — Criando e Verificando a BM (Para Estabilidade Máxima)

Uma BM **Verificada com CNPJ** tem muito mais tolerância a denúncias isoladas de destinatários e libera os níveis de disparo (`250` → `1.000` → `10.000` → `100.000` conversas/dia).

1. Acesse [business.facebook.com/overview](https://business.facebook.com/overview) (ou `business.facebook.com/settings`) e clique em **Criar uma conta / Portfólio empresarial**.
2. Vá em **Configurações do Negócio → Informações da Empresa**:
   - Preencha **exatamente** como consta no Cartão CNPJ da Receita Federal:
     - **Razão Social Legal**
     - **Endereço completo e CEP** (idêntico ao do cartão CNPJ)
     - **Telefone comercial**
     - **Site da empresa:** Precisa ser um domínio válido com `https://` que abra de verdade (não coloque link do Instagram nem site fora do ar).
     - **E-mail comercial:** Confirme o código que a Meta enviar para esse e-mail.
3. **Inicie a Verificação da Empresa (`Centro de Segurança`):**
   - Vá em **Configurações do Negócio → Centro de Segurança → Iniciar verificação**.
   - Anexe o **Cartão CNPJ emitido no site da Receita Federal** (PDF original) + **Contrato Social / Certificado MEI** + **Comprovante de endereço ou telefone** em nome da empresa.

---

## Parte 3 — Como Garantir que a Meta Aprove o Nome de Exibição de Primeira

O algoritmo da Meta recusa nomes de exibição (`DECLINED`) por 2 motivos principais. Siga esta regra ao escolher o nome do número:

1. **NUNCA use palavras financeiras restritas no Nome de Exibição:**
   - Palavras bloqueadas pelo robô da Meta (a menos que a empresa tenha autorização do Banco Central):
     - ❌ `Financeira`, `Crédito`, `Empréstimo`, `Banco`, `Cobrança`, `Recuperadora`, `Dívidas`, `Serasa`.
   - Palavras seguras que a Meta aprova sem restrição:
     - ✅ **`Soluções Empresariais`**, **`Assessoria Empresarial`**, **`Gestão e Relacionamento`**, **`Atendimento Oficial`**, **`Consultoria Empresarial`**, **`Soluções Digitais`**.
2. **Vínculo com a Razão Social ou Nome Fantasia do CNPJ:**
   - **Opção mais rápida (aprovação em minutos):** O nome de exibição contém o Nome Fantasia ou parte da Razão Social do CNPJ cadastrado na BM (ex.: se o CNPJ tem nome fantasia `Alpha Serviços`, use `Alpha Assessoria` ou `Central Alpha`).
   - **Se quiser usar uma marca diferente da Razão Social (ex.: `JM Assessoria Empresarial`):**
     - No rodapé do site informado na BM, precisa estar escrito: *"JM Assessoria Empresarial é uma marca operada por [RAZÃO SOCIAL DO CNPJ] — CNPJ XX.XXX.XXX/0001-XX"*.

---

## Parte 4 — Criando o App, Número e Token Permanente na Meta

### Passo 4.1 — Criar o App na Meta for Developers
1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Criar App**.
2. Escolha **Outro** → Tipo **Empresa (Business)**.
3. Dê um nome neutro (ex.: `Conecta Atendimento CRM`), selecione o **Portfólio Empresarial (BM)** criado na Parte 2 e confirme.
4. No painel do App, adicione o produto **WhatsApp** (*Configurar*).

### Passo 4.2 — Adicionar o Número de Telefone e Cartão na WABA
1. No menu lateral do App, vá em **WhatsApp → Configuração da API** (ou **Início Rápido**).
2. Role até a etapa **Adicionar número de telefone**:
   - Preencha o **Nome de Exibição** (seguindo as regras da Parte 3).
   - Categoria: **Serviços Profissionais** (evite colocar categoria "Finanças" para não acionar revisão bancária rigorosa).
   - Digite o número de telefone e valide o código por **SMS** ou **Ligação**.
3. Anote os 2 códigos que aparecem na tela:
   - **`Phone Number ID` (ID do número de telefone)**
   - **`WABA ID` (ID da conta do WhatsApp Business)**
4. Clique em **Adicionar forma de pagamento** (ou vá no Gerenciador do WhatsApp → **Configurações de Pagamento**) e cadastre o cartão de crédito da operação + defina o país **Brasil (BRL)**. *Sem cartão ativo na WABA, a Meta bloqueia o envio de templates.*

### Passo 4.3 — Criar Usuário do Sistema e Token Permanente (Que Nunca Expira)
1. Volte em [business.facebook.com/settings](https://business.facebook.com/settings) → **Usuários → Usuários do sistema**.
2. Clique em **Adicionar** → Nome: `CRM Oficial` → Função: **Administrador**.
3. Clique em **Atribuir ativos** para esse usuário do sistema:
   - **Apps** → Selecione o App criado → marque **Gerenciar aplicativo (Controle total)**.
   - **Contas do WhatsApp** → Selecione a conta do WhatsApp (WABA) → marque **Controle total (Gerenciar conta do WhatsApp)**.
4. Clique em **Gerar novo token**:
   - Selecione o App criado.
   - Expiração do token: **Nunca**.
   - Marque as 2 permissões obrigatórias:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Gere e **copie o Token Permanente**.

### Passo 4.4 — Publicar o App em Modo "Ao Vivo" (Live)
1. Em [developers.facebook.com/apps](https://developers.facebook.com/apps), abra o seu App → **Configurações do App → Básico**.
2. Preencha:
   - **URL da Política de Privacidade:** `https://SEU-DOMINIO-DO-CRM/privacy-policy`
   - **URL dos Termos de Serviço:** `https://SEU-DOMINIO-DO-CRM/terms-of-service`
   - **Exclusão de dados do usuário:** `https://SEU-DOMINIO-DO-CRM/data-deletion`
   - **Categoria:** Negócios e Páginas.
3. No topo da página do App, vire a chave de **Em desenvolvimento** para **Ao vivo (Publicado)**.
   > ⚠️ **Atenção:** Enquanto a chave não estiver em **Ao vivo**, a Meta não entrega as respostas dos clientes ao CRM.

---

## Parte 5 — Conectando a Nova BM ao LM Core CRM

1. **Conferir o `META_APP_SECRET` na Vercel (Importante ao trocar de App na Meta!):**
   - Se você criou um **App novo** em outro gerenciador da Meta, esse App tem um novo **`App Secret` (Chave Secreta do Aplicativo)** em **Configurações do App → Básico → Chave secreta do aplicativo → Mostrar**.
   - Vá no painel da **Vercel → Settings → Environment Variables**, atualize a variável **`META_APP_SECRET`** com a nova chave secreta de 32 caracteres desse novo App e faça um **Redeploy** rápido. *(Se o `META_APP_SECRET` na Vercel continuar sendo o do App antigo, o webhook recusará as mensagens do App novo com erro 401).*
2. **Conectar o Número no CRM:**
   - Abra o CRM em **Configurações → WhatsApp**.
   - Se havia um número antigo conectado, clique em **Redefinir configuração** no final da página.
   - Preencha:
     - **ID do Número de Telefone (`Phone Number ID`)**
     - **ID da Conta do WhatsApp Business (`WABA ID`)**
     - **Token de Acesso Permanente**
     - **Token de Verificação do Webhook** (ex.: `lmcore-webhook-2026`)
     - **PIN de 6 dígitos** (ex.: `123456` — o próprio CRM já registra o número e grava esse PIN na Meta ao salvar).
   - Clique em **Salvar configuração** (o banner deve ficar verde: **"Registrado"**).
3. **Apontar o Webhook na Meta:**
   - Em **Meta for Developers → WhatsApp → Configuração → Webhook**:
   - Cole a **URL do Webhook** (`https://SEU-DOMINIO/api/whatsapp/webhook`) e o **Token de Verificação** (`lmcore-webhook-2026`).
   - Clique em **Verificar e salvar**.
   - Em **Campos do Webhook**, clique em **Gerenciar** e ative **`messages`**.

---

## Parte 6 — Protocolo de Blindagem no Dia a Dia (Como Não Tomar Bloqueio no Número)

Mesmo com a BM verificada, o que derruba um número na API Oficial da Meta é a **Taxa de Bloqueio/Denúncia dos destinatários** quando recebem o disparo. Siga estas 4 práticas que já deixamos prontas no nosso CRM:

1. **SEMPRE coloque o botão de Opt-out (`Cancelar envio` ou `Não quero receber`) no Template:**
   - Quando você coloca um botão `QUICK_REPLY` escrito **`Cancelar envio`** no rodapé do template, o destinatário que não quer receber a mensagem clica em **`Cancelar envio`** em vez de clicar no botão nativo **"Denunciar / Bloquear"** do WhatsApp!
   - Para a Meta, o clique em `Cancelar envio` conta como uma **interação positiva (resposta normal)** — protege 100% a reputação da sua linha — e o nosso CRM já bloqueia aquele contato automaticamente para os próximos disparos!
2. **Rampa de Aquecimento (Maturação nos Primeiros 4 Dias de um Número Novo):**
   - Não dispare 2.000 mensagens no primeiro minuto de um chip recém-registrado. Siga a rampa:
     - **Dia 1:** 50 a 100 destinatários (preferencialmente base mais recente/responsiva).
     - **Dia 2:** 200 a 350 destinatários.
     - **Dia 3:** 500 a 800 destinatários.
     - **Dia 4 em diante:** Escala normal conforme o limite liberado pela Meta (`1.000/dia`, `10.000/dia`...).
3. **Monitore o Card "Saúde do Número" antes de cada Lote:**
   - No nosso CRM (no topo do **Painel** e em **Configurações → WhatsApp**), acompanhe o medidor **Saúde do Número**:
     - 🟢 **Boa (`GREEN`):** Pode disparar normalmente.
     - 🟡 **Média (`YELLOW`):** Reduza o volume pela metade por 48h e troque o texto do template por um tom mais consultivo.
     - 🔴 **Baixa (`RED`):** Pause novos disparos por 48h e atenda apenas quem responder na Caixa de Entrada até o status voltar para Médio/Bom.
4. **Cuidados no Texto do Template para Aprovação Rápida:**
   - Use sempre categoria **`Utility`**.
   - Evite palavras de coação direta como *"Penhora imediata"*, *"Bloqueio judicial de contas"* ou *"Seu CPF foi cancelado"*. Prefira termos institucionais como *"Comunicado extrajudicial"*, *"Pendência contratual em aberto"*, *"Proposta de regularização amigável"*.
   - Se o botão `URL` apontar para outro número de WhatsApp (`wa.me/55...`), pode digitar `wa.me/55...` normalmente no nosso CRM — o sistema já converte automaticamente para redirecionamento público `301` para a Meta aprovar sem bloquear.

/**
 * Tradutor e normalizador de erros do Supabase Auth para Português (Brasil).
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

export function isUserAlreadyRegisteredError(err: unknown): boolean {
  const msg = extractErrorMessage(err).toLowerCase().trim();
  return (
    msg.includes("user already registered") ||
    msg.includes("user_already_exists") ||
    msg.includes("already registered")
  );
}

export function translateAuthError(input?: unknown): string {
  const message = extractErrorMessage(input);
  if (!message) {
    return "Ocorreu um erro ao processar sua solicitação. Tente novamente.";
  }

  const lower = message.toLowerCase().trim();

  // Usuário já cadastrado
  if (isUserAlreadyRegisteredError(lower)) {
    return "Este e-mail já está cadastrado no sistema.";
  }

  // Credenciais inválidas (login)
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    lower.includes("invalid grant")
  ) {
    return "E-mail ou senha incorretos.";
  }

  // E-mail não confirmado
  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  }

  // Senha fraca / curta
  if (
    lower.includes("password should be at least 6 characters") ||
    lower.includes("password is too short")
  ) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  if (lower.includes("signup requires a valid password")) {
    return "Informe uma senha válida para prosseguir.";
  }

  // E-mail inválido
  if (
    lower.includes("email address is invalid") ||
    lower.includes("unable to validate email address") ||
    lower.includes("invalid email")
  ) {
    return "O endereço de e-mail informado é inválido.";
  }

  // Rate limit / Segurança
  if (
    lower.includes("for security purposes") ||
    lower.includes("rate limit") ||
    lower.includes("over email rate limit")
  ) {
    return "Por motivos de segurança, aguarde alguns instantes antes de tentar novamente.";
  }

  // Usuário não encontrado
  if (
    lower.includes("user not found") ||
    lower.includes("user does not exist")
  ) {
    return "Nenhuma conta foi encontrada com este e-mail.";
  }

  // Token expirado
  if (
    lower.includes("token has expired") ||
    lower.includes("token is invalid") ||
    lower.includes("otp expired")
  ) {
    return "O link ou código expirou. Solicite um novo.";
  }

  // Nova senha igual à anterior
  if (lower.includes("should be different from the old password")) {
    return "A nova senha deve ser diferente da senha anterior.";
  }

  // Falha de rede / conexão
  if (lower.includes("failed to fetch") || lower.includes("network error")) {
    return "Falha de conexão com o servidor. Verifique sua internet.";
  }

  // Retorna mensagem tratada ou o padrão
  return message;
}

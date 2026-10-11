/**
 * One entry of the `errors` array Meta attaches to a `failed` status
 * webhook event.
 */
export interface MetaStatusError {
  code?: number
  title?: string
  message?: string
  error_data?: { details?: string }
}

/**
 * Plain-language explanations for the delivery failures operators hit
 * most often. Anything not listed falls back to Meta's own text.
 */
const KNOWN_ERRORS: Record<number, string> = {
  131026: 'Número sem WhatsApp ou não pode receber mensagens.',
  131047: 'Fora da janela de 24h — envie um modelo aprovado.',
  131049: 'A Meta limitou o envio para este contato (excesso de mensagens de marketing).',
  131050: 'O contato optou por não receber mensagens de marketing.',
  131051: 'Tipo de mensagem não suportado.',
  131053: 'Falha ao enviar a mídia.',
  131056: 'Muitas mensagens para o mesmo número em pouco tempo.',
  132000: 'Quantidade de variáveis diferente da exigida pelo modelo.',
  132001: 'Modelo não existe ou não está aprovado neste idioma.',
  132015: 'Modelo pausado pela Meta por baixa qualidade.',
  132016: 'Modelo desativado pela Meta.',
  130472: 'A Meta não entregou por um experimento interno dela (não é erro do sistema).',
  131000: 'Erro desconhecido na Meta. Tente novamente mais tarde.',
}

/**
 * Turn Meta's `errors` array into the short text shown in the
 * broadcast recipient table. Returns null when there's nothing to show.
 */
export function describeMetaStatusError(
  errors: MetaStatusError[] | undefined,
): string | null {
  const err = errors?.[0]
  if (!err) return null

  const known = err.code != null ? KNOWN_ERRORS[err.code] : undefined
  const raw = err.error_data?.details || err.message || err.title || ''
  const text = known ?? (raw || 'Falha informada pela Meta.')
  return err.code != null ? `${text} (código ${err.code})` : text
}

import { describe, it, expect } from 'vitest'
import { isOptOutMessage } from './opt-out'

describe('isOptOutMessage', () => {
  it('matches the template button and the usual keywords', () => {
    for (const text of ['Cancelar envio', 'SAIR', 'parar', 'Pare!', 'Não quero receber', 'stop']) {
      expect(isOptOutMessage(text)).toBe(true)
    }
  })

  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(isOptOutMessage('  nao   QUERO mais receber.  ')).toBe(true)
  })

  it('only matches the whole message, never a word inside a sentence', () => {
    expect(isOptOutMessage('Quero o boleto')).toBe(false)
    expect(isOptOutMessage('não quero parar de pagar')).toBe(false)
    expect(isOptOutMessage('vou sair do trabalho e pago')).toBe(false)
  })

  it('handles empty input', () => {
    expect(isOptOutMessage('')).toBe(false)
    expect(isOptOutMessage(null)).toBe(false)
  })
})

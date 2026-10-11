import { describe, it, expect } from 'vitest'
import { isOptOutButton } from './opt-out'

describe('isOptOutButton', () => {
  it('matches the "Não quero receber" button and its variants', () => {
    for (const text of ['Não quero receber', 'NAO QUERO MAIS RECEBER', 'Não quero receber mensagens']) {
      expect(isOptOutButton(text)).toBe(true)
    }
  })

  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(isOptOutButton('  nao   QUERO receber.  ')).toBe(true)
  })

  it('does not treat flow words or other buttons as opt-out', () => {
    for (const text of ['Sair', 'Parar', 'Menu', 'Cancelar envio', 'Quero o boleto']) {
      expect(isOptOutButton(text)).toBe(false)
    }
  })

  it('handles empty input', () => {
    expect(isOptOutButton('')).toBe(false)
    expect(isOptOutButton(null)).toBe(false)
  })
})

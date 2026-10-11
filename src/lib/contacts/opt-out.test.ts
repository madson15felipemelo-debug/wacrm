import { describe, it, expect } from 'vitest'
import { isOptOutButton } from './opt-out'

describe('isOptOutButton', () => {
  it('matches the default buttons: "Não quero receber" and "Cancelar envio"', () => {
    expect(isOptOutButton('Não quero receber')).toBe(true)
    expect(isOptOutButton('Cancelar envio')).toBe(true)
  })

  it('ignores case, accents, punctuation and extra spaces', () => {
    expect(isOptOutButton('  nao   QUERO receber.  ')).toBe(true)
    expect(isOptOutButton('CANCELAR ENVIO!')).toBe(true)
  })

  it('does not treat flow words or other buttons as opt-out', () => {
    for (const text of ['Sair', 'Parar', 'Menu', 'Quero o boleto', 'Falar com atendente']) {
      expect(isOptOutButton(text)).toBe(false)
    }
  })

  it("uses the account's own list when given", () => {
    const buttons = ['Remover meu número']
    expect(isOptOutButton('remover meu numero', buttons)).toBe(true)
    expect(isOptOutButton('Cancelar envio', buttons)).toBe(false)
  })

  it('handles empty input and blank entries', () => {
    expect(isOptOutButton('')).toBe(false)
    expect(isOptOutButton(null)).toBe(false)
    expect(isOptOutButton('!!', ['', '  '])).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { describeMetaStatusError } from './meta-status-error'

describe('describeMetaStatusError', () => {
  it('returns null when Meta sent no errors', () => {
    expect(describeMetaStatusError(undefined)).toBeNull()
    expect(describeMetaStatusError([])).toBeNull()
  })

  it('translates known codes and keeps the code for support', () => {
    expect(
      describeMetaStatusError([{ code: 131026, title: 'Message undeliverable' }]),
    ).toBe('Número sem WhatsApp ou não pode receber mensagens. (código 131026)')
  })

  it("falls back to Meta's details, then message, then title", () => {
    expect(
      describeMetaStatusError([
        { code: 1, title: 'T', message: 'M', error_data: { details: 'D' } },
      ]),
    ).toBe('D (código 1)')
    expect(describeMetaStatusError([{ code: 1, title: 'T', message: 'M' }])).toBe(
      'M (código 1)',
    )
    expect(describeMetaStatusError([{ title: 'T' }])).toBe('T')
  })

  it('still says something when the error has no text', () => {
    expect(describeMetaStatusError([{}])).toBe('Falha informada pela Meta.')
  })
})

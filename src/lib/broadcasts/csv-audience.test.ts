import { describe, it, expect } from 'vitest'
import { fieldMatchKey, parseAudienceCsv, splitCsvLine } from './csv-audience'

describe('splitCsvLine', () => {
  it('splits plain cells and trims them', () => {
    expect(splitCsvLine('phone, nome ,valor')).toEqual(['phone', 'nome', 'valor'])
  })

  it('keeps commas inside quoted cells and unescapes doubled quotes', () => {
    expect(splitCsvLine('"Silva, João","diz ""oi"""')).toEqual([
      'Silva, João',
      'diz "oi"',
    ])
  })
})

describe('parseAudienceCsv', () => {
  it('requires a phone header', () => {
    expect(() => parseAudienceCsv('nome,valor\nJoão,10')).toThrow("'phone'")
  })

  it('turns every non-phone column into a template variable, in header order', () => {
    const csv = 'phone,nome,valor,vencimento\n5547999999999,João,R$ 120,10/10'
    const parsed = parseAudienceCsv(csv)
    expect(parsed.paramColumnCount).toBe(3)
    expect(parsed.rows).toEqual([
      { phone: '5547999999999', params: ['João', 'R$ 120', '10/10'], name: 'João' },
    ])
  })

  it('reads the contact name from a "name" or "nome" column, in any case', () => {
    expect(parseAudienceCsv('Name,phone\nAna,5547999999999').rows[0].name).toBe('Ana')
    expect(parseAudienceCsv('phone,NOME\n5547999999999,Bia').rows[0].name).toBe('Bia')
  })

  it('leaves the name empty when there is no name column or the cell is blank', () => {
    expect(parseAudienceCsv('phone,valor\n5547999999999,10').rows[0].name).toBeNull()
    expect(parseAudienceCsv('phone,nome\n5547999999999,').rows[0].name).toBeNull()
  })

  it('accepts a phone column in any position and CRLF line endings', () => {
    const csv = 'nome,phone\r\nMaria,5547988887777\r\n'
    const parsed = parseAudienceCsv(csv)
    expect(parsed.rows).toEqual([{ phone: '5547988887777', params: ['Maria'], name: 'Maria' }])
  })

  it('normalizes formatted phones to digits', () => {
    const parsed = parseAudienceCsv('phone\n+55 (47) 98888-7777')
    expect(parsed.rows[0].phone).toBe('5547988887777')
  })

  it('counts invalid phones and drops repeats, keeping the first', () => {
    const csv = [
      'phone,nome',
      '5547999999999,Primeiro',
      '5547999999999,Repetido',
      'abc,Invalido',
      ',Vazio',
    ].join('\n')
    const parsed = parseAudienceCsv(csv)
    expect(parsed.rows).toEqual([{ phone: '5547999999999', params: ['Primeiro'], name: 'Primeiro' }])
    expect(parsed.duplicateCount).toBe(1)
    expect(parsed.invalidCount).toBe(2)
  })

  it('ignores blank lines and a UTF-8 BOM before the header', () => {
    const csv = '﻿phone,nome\n\n5547999999999,Ana\n\n'
    const parsed = parseAudienceCsv(csv)
    expect(parsed.rows).toEqual([{ phone: '5547999999999', params: ['Ana'], name: 'Ana' }])
  })

  it('rejects an empty file', () => {
    expect(() => parseAudienceCsv('   \n  ')).toThrow('vazio')
  })
})

describe('parseAudienceCsv paramHeaders', () => {
  it('returns the non-phone headers in order, keeping their original case', () => {
    const parsed = parseAudienceCsv('Nome,phone,Contrato\nAna,5547999999999,123')
    expect(parsed.paramHeaders).toEqual(['Nome', 'Contrato'])
  })
})

describe('fieldMatchKey', () => {
  it('matches column and field names ignoring case, accents and separators', () => {
    expect(fieldMatchKey('Valor_da-Dívida')).toBe(fieldMatchKey('valor da divida'))
    expect(fieldMatchKey('  CPF ')).toBe('cpf')
  })
})

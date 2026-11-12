import { describe, it, expect } from 'vitest';
import { parseCpfCsv, detectDelimiter } from './csv-import';

describe('Cpf CSV Import Parser', () => {
  it('detects comma and semicolon delimiters accurately', () => {
    expect(detectDelimiter('cpf,carteira\n12345678901,Carteira A')).toBe(',');
    expect(detectDelimiter('cpf;carteira\n12345678901;Carteira A')).toBe(';');
  });

  it('parses standard 2-column CSV with CPF and Carteira', () => {
    const csv = `cpf,carteira
123.456.789-01,Carteira A
98765432100,Carteira B
11122233344,Carteira C`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(3);
    expect(res.invalidCpfCount).toBe(0);
    expect(res.rows[0]).toEqual({
      cpf: '12345678901',
      clientOrCampaign: 'Carteira A',
      debtorName: undefined,
      contractRef: undefined,
    });
    expect(res.rows[1]).toEqual({
      cpf: '98765432100',
      clientOrCampaign: 'Carteira B',
      debtorName: undefined,
      contractRef: undefined,
    });
  });

  it('handles semicolon separated CSV exported by Excel pt-BR', () => {
    const csv = `CPF;Carteira;Nome;Contrato
12345678901;Carteira A;João Silva;CTR-999
98765432100;Carteira B;Maria Souza;CTR-888`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].clientOrCampaign).toBe('Carteira A');
    expect(res.rows[0].debtorName).toBe('João Silva');
    expect(res.rows[0].contractRef).toBe('CTR-999');
  });

  it('filters out invalid or incomplete CPFs', () => {
    const csv = `cpf,carteira
123456,Carteira A
12345678901,Carteira A
invalido,Carteira B`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.invalidCpfCount).toBe(2);
    expect(res.rows[0].cpf).toBe('12345678901');
  });

  it('supports single-column CSV when default campaign is provided', () => {
    const csv = `12345678901
98765432100`;

    const res = parseCpfCsv(csv, 'Carteira Principal');
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].clientOrCampaign).toBe('Carteira Principal');
    expect(res.rows[1].clientOrCampaign).toBe('Carteira Principal');
  });
});

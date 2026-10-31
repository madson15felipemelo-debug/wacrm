import { describe, it, expect } from 'vitest';
import { parseCpfCsv, detectDelimiter } from './csv-import';

describe('Cpf CSV Import Parser', () => {
  it('detects comma and semicolon delimiters accurately', () => {
    expect(detectDelimiter('cpf,cliente\n12345678901,Colombo')).toBe(',');
    expect(detectDelimiter('cpf;cliente\n12345678901;Colombo')).toBe(';');
  });

  it('parses standard 2-column CSV with CPF and Cliente', () => {
    const csv = `cpf,cliente
123.456.789-01,Colombo
98765432100,Fácil Resultado
11122233344,Berlanda`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(3);
    expect(res.invalidCpfCount).toBe(0);
    expect(res.rows[0]).toEqual({
      cpf: '12345678901',
      clientOrCampaign: 'Colombo',
      debtorName: undefined,
      contractRef: undefined,
    });
    expect(res.rows[1]).toEqual({
      cpf: '98765432100',
      clientOrCampaign: 'Fácil Resultado',
      debtorName: undefined,
      contractRef: undefined,
    });
  });

  it('handles semicolon separated CSV exported by Excel pt-BR', () => {
    const csv = `CPF;Assessoria;Nome;Contrato
12345678901;Colombo;João Silva;CTR-999
98765432100;Berlanda;Maria Souza;CTR-888`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].clientOrCampaign).toBe('Colombo');
    expect(res.rows[0].debtorName).toBe('João Silva');
    expect(res.rows[0].contractRef).toBe('CTR-999');
  });

  it('filters out invalid or incomplete CPFs', () => {
    const csv = `cpf,cliente
123456,Colombo
12345678901,Colombo
invalido,Berlanda`;

    const res = parseCpfCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.invalidCpfCount).toBe(2);
    expect(res.rows[0].cpf).toBe('12345678901');
  });

  it('supports single-column CSV when default campaign is provided', () => {
    const csv = `12345678901
98765432100`;

    const res = parseCpfCsv(csv, 'Colombo');
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].clientOrCampaign).toBe('Colombo');
    expect(res.rows[1].clientOrCampaign).toBe('Colombo');
  });
});

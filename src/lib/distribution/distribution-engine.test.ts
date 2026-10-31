import { describe, expect, it } from 'vitest';
import {
  extractCpfFromText,
  sanitizeCpf,
  selectBestOperator,
  type CandidateStats,
} from './distribution-engine';

describe('sanitizeCpf & extractCpfFromText', () => {
  it('sanitizes valid 11-digit CPFs', () => {
    expect(sanitizeCpf('123.456.789-01')).toBe('12345678901');
    expect(sanitizeCpf('12345678901')).toBe('12345678901');
    expect(sanitizeCpf('12345')).toBeNull(); // invalid length
    expect(sanitizeCpf(null)).toBeNull();
  });

  it('extracts formatted and raw CPFs from free text', () => {
    expect(extractCpfFromText('Meu CPF é 123.456.789-00 por favor consultar')).toBe(
      '12345678900',
    );
    expect(extractCpfFromText('12345678900')).toBe('12345678900');
    expect(extractCpfFromText('Olá gostaria de falar com atendente')).toBeNull();
  });
});

describe('selectBestOperator (Modalidade 01 & Regras de Seleção)', () => {
  const baseOperator = (id: string): CandidateStats => ({
    userId: id,
    isSubstitute: false,
    maxCapacity: 10,
    weight: 1,
    isOnline: true,
    activeChats: 0,
    lastAssignedMs: 0,
  });

  it('skips offline operators', () => {
    const op1 = { ...baseOperator('op1'), isOnline: false, activeChats: 0 };
    const op2 = { ...baseOperator('op2'), isOnline: true, activeChats: 3 };

    const selected = selectBestOperator([op1, op2], 'least_busy');
    expect(selected?.userId).toBe('op2');
  });

  it('skips operators who reached max capacity', () => {
    const op1 = { ...baseOperator('op1'), isOnline: true, activeChats: 10, maxCapacity: 10 };
    const op2 = { ...baseOperator('op2'), isOnline: true, activeChats: 4, maxCapacity: 5 };

    const selected = selectBestOperator([op1, op2], 'least_busy');
    expect(selected?.userId).toBe('op2');
  });

  it('picks least busy operator among available', () => {
    const op1 = { ...baseOperator('op1'), activeChats: 5 };
    const op2 = { ...baseOperator('op2'), activeChats: 2 };
    const op3 = { ...baseOperator('op3'), activeChats: 4 };

    const selected = selectBestOperator([op1, op2, op3], 'least_busy');
    expect(selected?.userId).toBe('op2');
  });

  it('breaks tie in least busy using oldest last assignment time', () => {
    const op1 = { ...baseOperator('op1'), activeChats: 2, lastAssignedMs: 2000 };
    const op2 = { ...baseOperator('op2'), activeChats: 2, lastAssignedMs: 1000 }; // older

    const selected = selectBestOperator([op1, op2], 'least_busy');
    expect(selected?.userId).toBe('op2');
  });

  it('prefers primary operators over substitutes when primary is available', () => {
    const primary = { ...baseOperator('primary'), isSubstitute: false, activeChats: 3 };
    const substitute = { ...baseOperator('substitute'), isSubstitute: true, activeChats: 0 };

    const selected = selectBestOperator([primary, substitute], 'least_busy');
    expect(selected?.userId).toBe('primary');
  });

  it('uses substitute when all primary operators are full or offline', () => {
    const primary = {
      ...baseOperator('primary'),
      isSubstitute: false,
      isOnline: false,
      activeChats: 0,
    };
    const substitute = { ...baseOperator('substitute'), isSubstitute: true, activeChats: 1 };

    const selected = selectBestOperator([primary, substitute], 'least_busy');
    expect(selected?.userId).toBe('substitute');
  });

  it('executes round-robin strategy ordered by last assignment time', () => {
    const op1 = { ...baseOperator('op1'), lastAssignedMs: 5000, activeChats: 1 };
    const op2 = { ...baseOperator('op2'), lastAssignedMs: 1000, activeChats: 3 };

    const selected = selectBestOperator([op1, op2], 'round_robin');
    expect(selected?.userId).toBe('op2');
  });
});

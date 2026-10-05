import { isValidE164, sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils';

export interface AudienceRow {
  /** Digits-only phone, the form Meta and the contacts index use. */
  phone: string;
  /** Values of the non-phone columns, in header order → {{1}}, {{2}}… */
  params: string[];
}

export interface ParsedAudienceCsv {
  rows: AudienceRow[];
  /** Number of non-phone columns — how many template variables it can fill. */
  paramColumnCount: number;
  /** Rows dropped for an empty or invalid phone number. */
  invalidCount: number;
  /** Rows dropped as repeats of an earlier phone. */
  duplicateCount: number;
}

/** Split one CSV line, honouring double-quoted fields with commas. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse a broadcast audience CSV. The `phone` column is required; every
 * other column becomes a template variable in header order. Throws when
 * there's no `phone` header — the caller surfaces that to the user.
 */
export function parseAudienceCsv(text: string): ParsedAudienceCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^﻿/, ''))
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('O arquivo está vazio.');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const phoneIdx = headers.indexOf('phone');
  if (phoneIdx === -1) {
    throw new Error("O CSV precisa ter a coluna 'phone'.");
  }
  const paramIdxs = headers
    .map((_, idx) => idx)
    .filter((idx) => idx !== phoneIdx);

  const rows: AudienceRow[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const phone = sanitizePhoneForMeta(cells[phoneIdx] ?? '');
    if (!isValidE164(phone)) {
      invalidCount++;
      continue;
    }
    if (seen.has(phone)) {
      duplicateCount++;
      continue;
    }
    seen.add(phone);
    rows.push({
      phone,
      params: paramIdxs.map((idx) => cells[idx] ?? ''),
    });
  }

  return {
    rows,
    paramColumnCount: paramIdxs.length,
    invalidCount,
    duplicateCount,
  };
}

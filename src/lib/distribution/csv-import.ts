import { sanitizeCpf } from './distribution-engine';

export interface CpfCsvRow {
  cpf: string;
  clientOrCampaign?: string;
  debtorName?: string;
  contractRef?: string;
}

export interface ParseCpfCsvResult {
  rows: CpfCsvRow[];
  totalLines: number;
  invalidCpfCount: number;
  delimiter: ',' | ';' | '\t';
  headersFound: string[];
}

/**
 * Normalizes header string to match standard field names.
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Detect delimiter by counting occurrences in the first non-empty lines.
 */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
  let comma = 0;
  let semi = 0;
  let tab = 0;

  for (const line of lines) {
    comma += (line.match(/,/g) || []).length;
    semi += (line.match(/;/g) || []).length;
    tab += (line.match(/\t/g) || []).length;
  }

  if (tab > comma && tab > semi) return '\t';
  if (semi >= comma) return ';';
  return ',';
}

/**
 * Split a CSV line respecting quotes.
 */
export function splitCsvLine(line: string, delimiter: string = ','): string[] {
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
    } else if (ch === delimiter) {
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
 * Parse CSV text containing CPF and Client/Campaign columns.
 * Supports:
 * - 2 columns: cpf, cliente (or assessoria, campanha)
 * - 1 column: cpf only (fallback/single campaign mode)
 * - Extra columns: nome, contrato
 */
export function parseCpfCsv(text: string, defaultCampaignName?: string): ParseCpfCsvResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return {
      rows: [],
      totalLines: 0,
      invalidCpfCount: 0,
      delimiter: ',',
      headersFound: [],
    };
  }

  const delimiter = detectDelimiter(text);
  const rawHeaders = splitCsvLine(lines[0], delimiter);
  const normHeaders = rawHeaders.map(normalizeHeader);

  // Detect index of CPF column
  let cpfIdx = normHeaders.findIndex((h) => ['cpf', 'documento', 'doc', 'numcpf'].includes(h));
  // Detect index of Campaign/Client/Assessoria column
  let clientIdx = normHeaders.findIndex((h) =>
    ['cliente', 'assessoria', 'campanha', 'credor', 'carteira', 'filial', 'empresa'].includes(h)
  );
  // Detect debtor name
  let nameIdx = normHeaders.findIndex((h) => ['nome', 'devedor', 'nomedevedor', 'cliente_nome'].includes(h));
  // Detect contract reference
  let contractIdx = normHeaders.findIndex((h) => ['contrato', 'ref', 'numero_contrato', 'titulo'].includes(h));

  let startIndex = 1;

  // If header line didn't contain "cpf" but looks like raw data (e.g. 11 digits in cell 0)
  if (cpfIdx === -1) {
    const firstCellClean = sanitizeCpf(rawHeaders[0]);
    if (firstCellClean) {
      // No header row!
      cpfIdx = 0;
      clientIdx = rawHeaders.length > 1 ? 1 : -1;
      startIndex = 0;
    } else {
      // Default fallback: first column is CPF, second is client
      cpfIdx = 0;
      clientIdx = rawHeaders.length > 1 ? 1 : -1;
    }
  }

  const rows: CpfCsvRow[] = [];
  let invalidCpfCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const rawCpf = cells[cpfIdx] ?? '';
    const cleanCpf = sanitizeCpf(rawCpf);

    if (!cleanCpf) {
      invalidCpfCount++;
      continue;
    }

    const clientVal = clientIdx >= 0 ? cells[clientIdx] : defaultCampaignName;
    const nameVal = nameIdx >= 0 ? cells[nameIdx] : undefined;
    const contractVal = contractIdx >= 0 ? cells[contractIdx] : undefined;

    rows.push({
      cpf: cleanCpf,
      clientOrCampaign: (clientVal || defaultCampaignName)?.trim(),
      debtorName: nameVal?.trim(),
      contractRef: contractVal?.trim(),
    });
  }

  return {
    rows,
    totalLines: lines.length - startIndex,
    invalidCpfCount,
    delimiter,
    headersFound: rawHeaders,
  };
}

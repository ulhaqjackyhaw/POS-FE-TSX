/**
 * Utility to format receipt number using terminal code, date, and order sequence:
 * Format: [KODE_TERMINAL]/[YYYYMMDD]/[NO_TRANSAKSI]
 * Example: TRM-01/20261019/0142
 */
export function formatReceiptNumber(
  rawNumber?: string | null,
  terminalCode?: string | null,
  createdAt?: string | null
): string {
  const term = (terminalCode && terminalCode.trim()) ? terminalCode.trim().toUpperCase() : 'POS-01';
  
  const extractDate = (raw?: string | null): string => {
    if (!raw) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}${mm}${dd}`;
    } catch {
      return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
  };

  const datePart = extractDate(createdAt);

  if (!rawNumber || !rawNumber.trim()) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${term}/${datePart}/${rand}`;
  }

  const trimmed = rawNumber.trim();

  // If already standard formatted with slashes
  if (trimmed.includes('/')) {
    return trimmed;
  }

  // If INV-20261019-123456
  if (trimmed.startsWith('INV-')) {
    const parts = trimmed.split('-');
    const pDate = parts[1] && parts[1].length === 8 ? parts[1] : datePart;
    const pSeq = parts[2] ? parts[2].slice(-4).padStart(4, '0') : '0001';
    return `${term}/${pDate}/${pSeq}`;
  }

  // If REC-123456
  if (trimmed.startsWith('REC-')) {
    const pSeq = trimmed.slice(4).slice(-4).padStart(4, '0');
    return `${term}/${datePart}/${pSeq}`;
  }

  // Fallback cleanly formatted
  const safeSeq = trimmed.replace(/\D/g, '').slice(-4).padStart(4, '0') || '0001';
  return `${term}/${datePart}/${safeSeq}`;
}

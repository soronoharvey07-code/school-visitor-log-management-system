/**
 * Safely extracts integer from any ID representation (e.g. "0001", "#0002", "123", 4)
 */
export function parseIdNumber(id: any): number {
  if (typeof id === 'number' && !isNaN(id)) return id;
  if (!id) return 0;
  const cleaned = String(id).replace(/\D/g, '');
  if (!cleaned) return 0;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Finds the highest numerical Visitor ID across localStorage counter,
 * localStorage visitor records ('school-visitor-log'), and any additional provided visitor records.
 */
export function getHighestVisitorId(additionalVisitors?: any[]): number {
  let maxId = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storageVal = window.localStorage.getItem('visitor-id-sequence');
      if (storageVal) {
        const parsed = parseInt(storageVal, 10);
        if (!isNaN(parsed) && parsed > maxId) maxId = parsed;
      }

      const storedLogs = window.localStorage.getItem('school-visitor-log');
      if (storedLogs) {
        try {
          const list = JSON.parse(storedLogs);
          if (Array.isArray(list)) {
            for (const v of list) {
              const num = parseIdNumber(v.idNumber || v.visitor_number || v.visitorNumber || v.id_number || v.id);
              if (num > maxId) maxId = num;
            }
          }
        } catch (e) {}
      }
    }

    if (Array.isArray(additionalVisitors)) {
      for (const v of additionalVisitors) {
        if (!v) continue;
        const num = parseIdNumber(v.idNumber || v.visitor_number || v.visitorNumber || v.id_number || v.id);
        if (num > maxId) maxId = num;
      }
    }
  } catch (err) {
    console.warn('Error reading visitor ID sequence:', err);
  }
  return maxId;
}

/**
 * Returns the next available Visitor ID (formatted as e.g. "0004").
 * Detects the highest existing ID across all sources, increments by 1,
 * and saves the updated counter permanently to localStorage.
 */
export function getNextIdNumber(existingVisitors?: any[]): string {
  const highest = getHighestVisitorId(existingVisitors);
  const next = highest + 1;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('visitor-id-sequence', next.toString());
    }
  } catch (e) {}
  return next.toString().padStart(4, '0');
}

/**
 * Synchronizes the permanent ID sequence counter with the highest ID from a loaded list of visitors.
 */
export function syncIdSequence(visitors: any[]): number {
  const highest = getHighestVisitorId(visitors);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('visitor-id-sequence', highest.toString());
    }
  } catch (e) {}
  return highest;
}

/**
 * Resets the ID sequence counter to 0 (used when data is cleared).
 */
export function resetIdSequence(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('visitor-id-sequence');
      window.localStorage.setItem('visitor-id-sequence', '0');
    }
  } catch (e) {}
}



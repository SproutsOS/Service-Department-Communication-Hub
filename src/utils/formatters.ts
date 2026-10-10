import { RepairOrder, User } from '../types';

const MONTH_NAMES_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatMilitaryDate(dateInput?: string | number | Date): string {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_UPPER[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatMilitaryTime(dateInput?: string | number | Date): string {
  if (!dateInput) return '--:--';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMilitaryDateTime(dateInput?: string | number | Date): string {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return `${formatMilitaryDate(date)} ${formatMilitaryTime(date)}`;
}

export function formatDateTime(dateInput?: string | number | Date): string {
  if (!dateInput) return 'Not set';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_UPPER[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export function formatTimeOnly(dateInput?: string | number | Date): string {
  if (!dateInput) return '--:--';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatEtaBadge(etaStr?: string): { text: string; urgent: boolean; pastDue: boolean } {
  if (!etaStr) return { text: 'No ETA', urgent: false, pastDue: false };
  const etaDate = new Date(etaStr);
  if (isNaN(etaDate.getTime())) {
    const clean = etaStr.trim();
    const hasPrefix = clean.toLowerCase().startsWith('eta') || clean.toLowerCase().startsWith('in stock') || clean.toLowerCase().startsWith('backorder');
    return { 
      text: hasPrefix ? clean : `ETA: ${clean}`, 
      urgent: clean.toLowerCase().includes('vor') || clean.toLowerCase().includes('urgent'), 
      pastDue: false 
    };
  }

  const now = new Date();
  const diffMs = etaDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 0) {
    const absMins = Math.abs(diffMinutes);
    const absHours = Math.floor(absMins / 60);
    const remMins = absMins % 60;
    return {
      text: `Past due (${absHours > 0 ? `${absHours}h ` : ''}${remMins}m ago)`,
      urgent: true,
      pastDue: true,
    };
  }

  if (diffMinutes < 60) {
    return {
      text: `Arriving in ${diffMinutes} min (${formatTimeOnly(etaDate)})`,
      urgent: true,
      pastDue: false,
    };
  }

  // Check if today, tomorrow, or later
  const isSameDay = now.getFullYear() === etaDate.getFullYear() && 
                    now.getMonth() === etaDate.getMonth() && 
                    now.getDate() === etaDate.getDate();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow = tomorrow.getFullYear() === etaDate.getFullYear() && 
                     tomorrow.getMonth() === etaDate.getMonth() && 
                     tomorrow.getDate() === etaDate.getDate();

  if (isSameDay) {
    const hours = Math.floor(diffMinutes / 60);
    const remainingMins = diffMinutes % 60;
    return {
      text: `ETA Today ${formatTimeOnly(etaDate)} (${hours}h ${remainingMins}m)`,
      urgent: false,
      pastDue: false,
    };
  }

  if (isTomorrow) {
    return {
      text: `ETA Tomorrow at ${formatTimeOnly(etaDate)}`,
      urgent: false,
      pastDue: false,
    };
  }

  return {
    text: `ETA ${etaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${formatTimeOnly(etaDate)}`,
    urgent: false,
    pastDue: false,
  };
}

export function calculateDispatchedDuration(dispatchedAt?: string): string {
  if (!dispatchedAt) return 'Pending assignment';
  const dispatched = new Date(dispatchedAt);
  if (isNaN(dispatched.getTime())) return '';
  const now = new Date();
  const diffMinutes = Math.max(0, Math.floor((now.getTime() - dispatched.getTime()) / 60000));
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const minutes = diffMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m dispatched`;
  }
  return `${hours}h ${minutes}m dispatched`;
}

export const calculateAssignedDuration = calculateDispatchedDuration;

export function formatDurationSince(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const mins = diffMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

export function getDiagnosticStatusDetails(ro: {
  status: string;
  waitingDiagnosisAt?: string;
  diagnosisStartedAt?: string;
  dispatchedAt?: string;
  createdAt?: string;
}): {
  isWaiting: boolean;
  isDiagnosing: boolean;
  label: string;
  badgeClass: string;
  timeLabel: string;
  duration: string;
} | null {
  if (ro.status === 'WAITING_DIAGNOSTICS' || ro.status === 'WAITING_DIAGNOSIS') {
    const timestamp = ro.waitingDiagnosisAt || ro.dispatchedAt || ro.createdAt;
    const duration = formatDurationSince(timestamp);
    return {
      isWaiting: true,
      isDiagnosing: false,
      label: 'Waiting Diagnostics',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      timeLabel: timestamp ? `In queue since ${formatTimeOnly(timestamp)}` : 'In queue',
      duration: duration || 'Recently queued',
    };
  }

  if (ro.status === 'IN_DIAG' || ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_BAY') {
    const timestamp = ro.diagnosisStartedAt || ro.dispatchedAt;
    const duration = formatDurationSince(timestamp);
    return {
      isWaiting: false,
      isDiagnosing: true,
      label: 'In Diag',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      timeLabel: timestamp ? `Started at ${formatTimeOnly(timestamp)}` : 'Underway',
      duration: duration || 'Recently started',
    };
  }

  return null;
}

/**
 * Format a numeric or string price to exactly 2 decimal places (e.g., 52.5 -> "52.50", 12 -> "12.00").
 * Returns an empty string if value is undefined, null, or empty string.
 */
export function formatPrice(val?: number | string | null): string {
  if (val === undefined || val === null || val === '') return '';
  const clean = typeof val === 'string' ? val.replace(/[^0-9.-]/g, '') : val;
  if (clean === '') return '';
  const num = typeof clean === 'number' ? clean : Number(clean);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

/**
 * Format a numeric or string price with dollar sign and 2 decimal places (e.g., 52.5 -> "$52.50").
 * Returns fallback if value is undefined, null, or invalid.
 */
export function formatCurrency(val?: number | string | null, fallback = '$0.00'): string {
  if (val === undefined || val === null || val === '') return fallback;
  const clean = typeof val === 'string' ? val.replace(/[^0-9.-]/g, '') : val;
  if (clean === '') return fallback;
  const num = typeof clean === 'number' ? clean : Number(clean);
  if (isNaN(num)) return fallback;
  return `$${num.toFixed(2)}`;
}

/**
 * Standard shop labor hourly rates by Pay Type:
 * - Customer Pay: $165.00/hr
 * - Warranty: $121.78/hr
 * - Internal: $135.00/hr
 * - Extended Warranty: $165.00/hr
 */
export const PAY_TYPE_RATES = {
  CUSTOMER_PAY: 165.00,
  WARRANTY: 121.78,
  INTERNAL: 135.00,
  EXTENDED_WARRANTY: 165.00,
} as const;

export function getPayTypeRate(payType?: string): number {
  if (payType === 'WARRANTY') return 121.78;
  if (payType === 'INTERNAL') return 135.00;
  if (payType === 'EXTENDED_WARRANTY') return 165.00;
  return 165.00; // Customer Pay default
}

/**
 * Passes through the Repair Order intact without stripping or dropping customer concerns.
 */
export function cleanRO3700<T>(ro: T): T {
  if (!ro || typeof ro !== 'object') return ro;
  const anyRO = ro as any;
  const isApproved = Boolean(
    anyRO.status === 'APPROVED' ||
    anyRO.quote?.status === 'APPROVED' ||
    anyRO.quote?.approvedAt ||
    ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(anyRO.status)
  );

  if (!isApproved) return ro;

  let needsUpdate = false;
  let updatedParts = Array.isArray(anyRO.parts) ? [...anyRO.parts] : [];

  // If repair order is already PARTS_ORDERED or further in workflow, all non-declined parts must be marked as ORDERED
  const isPartsOrderedOrBeyond = ['PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(anyRO.status);

  updatedParts = updatedParts.map(p => {
    if (!p) return p;

    const isCompleteOrDeclined = [
      'ORDERED', 
      'DAILY_ORDER', 
      'LOCAL_PURCHASE', 
      'SPECIAL_ORDER', 
      'SPECIAL_ORDER_1_5_DAYS', 
      'VOR_UPGRADE', 
      'IN_TRANSIT', 
      'RECEIVED', 
      'ISSUED_TO_TECH', 
      'IN_STOCK', 
      'DECLINED', 
      'CANCELLED'
    ].includes(p.status);

    if (isPartsOrderedOrBeyond && !isCompleteOrDeclined) {
      needsUpdate = true;
      return {
        ...p,
        status: 'ORDERED',
        requestType: 'ORDER_NOW',
        orderedAt: p.orderedAt || anyRO.quote?.approvedAt || new Date().toISOString(),
        estimatedArrival: (p.estimatedArrival && !p.estimatedArrival.toLowerCase().includes('quote') && !p.estimatedArrival.toLowerCase().includes('estimate'))
          ? p.estimatedArrival
          : 'Special Order 1-5 Days',
      };
    }

    if (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY') {
      needsUpdate = true;
      return {
        ...p,
        status: 'ORDERED',
        requestType: 'ORDER_NOW',
        orderedAt: p.orderedAt || anyRO.quote?.approvedAt || new Date().toISOString(),
        estimatedArrival: p.estimatedArrival && !p.estimatedArrival.toLowerCase().includes('quote') && !p.estimatedArrival.toLowerCase().includes('estimate')
          ? p.estimatedArrival
          : 'Daily Order (Arriving ~5:00 PM)',
      };
    }
    return p;
  });

  // If quote contains partsItems not yet in ro.parts, include them as ordered parts
  if (anyRO.quote?.partsItems && Array.isArray(anyRO.quote.partsItems) && anyRO.quote.partsItems.length > 0) {
    anyRO.quote.partsItems.forEach((qp: any, idx: number) => {
      const existingMatch = updatedParts.find((p: any) => 
        (qp.sourcePartId && p.id === qp.sourcePartId) ||
        (qp.id && p.id === qp.id) ||
        (qp.partNumber && qp.partNumber !== 'TBD' && p.partNumber && p.partNumber.trim().toUpperCase() === qp.partNumber.trim().toUpperCase()) ||
        (qp.description && p.description && p.description.trim().toLowerCase() === qp.description.trim().toLowerCase())
      );
      if (existingMatch) {
        if (!qp.sourcePartId) {
          qp.sourcePartId = existingMatch.id;
        }
      } else {
        needsUpdate = true;
        updatedParts.push({
          id: qp.sourcePartId || qp.id || `qpart_approved_${anyRO.id || 'ro'}_${idx}`,
          partNumber: qp.partNumber || 'TBD',
          description: qp.description || 'Quoted Part',
          quantity: qp.quantity || 1,
          price: qp.unitPrice,
          status: 'ORDERED',
          requestType: 'ORDER_NOW',
          orderedAt: anyRO.quote.approvedAt || new Date().toISOString(),
          estimatedArrival: 'Daily Order (Arriving ~5:00 PM)',
          roLineNumber: qp.roLineNumber || 1,
        });
      }
    });
  }

  if (needsUpdate) {
    return {
      ...anyRO,
      parts: updatedParts,
    };
  }

  return ro;
}

/**
 * Parse line-indexed strings (e.g., "Line 1: findings\n\nLine 2: findings") or single strings into an array of lines.
 */
export function parseLineIndexedField(text: string | undefined, lineCount: number): string[] {
  const count = Math.max(1, lineCount);
  const result: string[] = Array(count).fill('');
  if (!text || !text.trim()) return result;

  const raw = text.trim();
  const linePattern = /(?:^|\n)\s*Line\s*(\d+)\s*:\s*/gi;
  const matches = [...raw.matchAll(linePattern)];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const lineNum = parseInt(match[1], 10);
      const startIdx = match.index! + match[0].length;
      const endIdx = (i + 1 < matches.length) ? matches[i + 1].index! : raw.length;
      const content = raw.slice(startIdx, endIdx).trim();
      const targetIdx = lineNum - 1;
      if (targetIdx >= 0 && targetIdx < count) {
        result[targetIdx] = content;
      }
    }
    return result;
  }

  // If no "Line X:" pattern, assign the entire text to Line 1
  result[0] = raw;
  return result;
}

export interface PartAvailabilityBadgeInfo {
  text: string;
  badgeClass: string;
  statusLabel: string;
}

/**
 * Returns formatted availability, ETA, and styling for a part item.
 */
export function getPartAvailabilityInfo(part: { status?: string; requestType?: string; estimatedArrival?: string }): PartAvailabilityBadgeInfo {
  const etaBadge = formatEtaBadge(part?.estimatedArrival);
  const status = (part?.status || '').toUpperCase();
  const requestType = (part?.requestType || '').toUpperCase();
  const isQuoteOnly = status === 'QUOTE_ONLY' || requestType === 'QUOTE_ONLY';

  if (status === 'IN_STOCK') {
    return {
      text: 'In Stock',
      statusLabel: 'In Stock',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    };
  }
  if (status === 'RECEIVED' || status === 'ISSUED_TO_TECH') {
    const lbl = status === 'ISSUED_TO_TECH' ? 'Issued to Tech' : 'Received at Shop';
    return {
      text: lbl,
      statusLabel: lbl,
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    };
  }
  if (isQuoteOnly) {
    return {
      text: 'Quote Only',
      statusLabel: 'Quote Only',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold',
    };
  }
  if (status === 'BACKORDERED') {
    return {
      text: `Backordered (${etaBadge.text})`,
      statusLabel: 'Backordered',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    };
  }
  if (status === 'SPECIAL_ORDER' || status === 'SPECIAL_ORDER_1_5_DAYS') {
    return {
      text: `Special Order (${etaBadge.text})`,
      statusLabel: 'Special Order',
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300 font-bold',
    };
  }
  if (status === 'DAILY_ORDER' || status === 'ORDERED' || status === 'IN_TRANSIT') {
    return {
      text: `Daily Order (${etaBadge.text})`,
      statusLabel: 'Daily Order',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    };
  }
  if (status === 'LOCAL_PURCHASE') {
    return {
      text: `Local Purchase (${etaBadge.text})`,
      statusLabel: 'Local Purchase',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
    };
  }
  if (status === 'REQUESTED' || status === 'NEEDED') {
    return {
      text: 'Requested (Pending Sourcing)',
      statusLabel: 'Requested',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 font-bold',
    };
  }
  return {
    text: etaBadge.text || 'Pending ETA',
    statusLabel: status || 'Pending',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
  };
}

/**
 * Filter all parts that belong to a specific 1-indexed RO line number.
 */
export function getLinePartsList(parts: any[] | undefined, lineNum: number, totalConcernsCount: number = 1): any[] {
  if (!parts || !Array.isArray(parts)) return [];
  return parts.filter(p => {
    if (p.roLineNumber !== undefined && p.roLineNumber !== null) {
      return Number(p.roLineNumber) === lineNum;
    }
    const match = p.notes?.match(/For Line (\d+)/i) || p.notes?.match(/Line (\d+)/i);
    if (match && parseInt(match[1], 10) === lineNum) {
      return true;
    }
    if (lineNum === 1 && totalConcernsCount <= 1) {
      return true;
    }
    return false;
  });
}

/**
 * Extract numeric digits from an RO ID string (e.g., "RO-10488" -> 10488, "10489" -> 10489)
 */
export function extractRONumber(id: string): number {
  if (!id) return 0;
  const match = id.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Compare two items with an `id` or `roNumber` property in numerical order.
 */
export function compareROsNumerically(a: { id?: string; roNumber?: string }, b: { id?: string; roNumber?: string }): number {
  const idA = a.id || a.roNumber || '';
  const idB = b.id || b.roNumber || '';
  const numA = extractRONumber(idA);
  const numB = extractRONumber(idB);
  if (numA !== numB && numA > 0 && numB > 0) {
    return numA - numB;
  }
  return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Sorts an array of Repair Orders (or items with id) in ascending numerical order.
 */
export function sortROsNumerically<T extends { id?: string; roNumber?: string }>(ros: T[]): T[] {
  return [...ros].sort(compareROsNumerically);
}

/**
 * Comprehensive search matching function for Repair Orders.
 * Supports searching by:
 * - Technician Name (primary tech, line-level assigned techs, time clock punches)
 * - Technician Number / Employee Number (e.g. "101", "#101", "Tech 101", "Tech #102")
 * - Technician User ID / Employee ID
 * - RO Number / ID ("RO-10488", "10488", "#10488")
 * - Customer Name & Customer Phone (including digits)
 * - Vehicle (Year, Make, Model, VIN, License Plate, Color)
 * - Advisor Name
 * - Service Bay
 * - Customer Complaints / Line Items / Parts (part number, description)
 */
export function matchesROSearch(
  ro: RepairOrder,
  searchQuery: string,
  users?: User[]
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const rawQuery = searchQuery.trim().toLowerCase();
  // Strip leading prefixes like "ro-", "ro #", "ro ", "tech ", "tech #", "technician ", "#"
  const cleanQuery = rawQuery
    .replace(/^(ro\s*#?|ro-|#)/i, '')
    .replace(/^(tech\s*#?|technician\s*#?)/i, '')
    .trim();

  // 1. Match RO Number / ID
  const roIdLower = ro.id.toLowerCase();
  if (roIdLower.includes(rawQuery) || (cleanQuery && roIdLower.includes(cleanQuery))) {
    return true;
  }
  const roNumeric = extractRONumber(ro.id);
  if (cleanQuery && /^\d+$/.test(cleanQuery) && roNumeric === parseInt(cleanQuery, 10)) {
    return true;
  }

  // 2. Match Customer Name & Phone Number
  if (ro.customerName && ro.customerName.toLowerCase().includes(rawQuery)) return true;
  if (ro.customerPhone) {
    if (ro.customerPhone.toLowerCase().includes(rawQuery)) return true;
    const rawPhoneDigits = ro.customerPhone.replace(/\D/g, '');
    const queryDigits = rawQuery.replace(/\D/g, '');
    if (queryDigits.length >= 3 && rawPhoneDigits.includes(queryDigits)) return true;
  }

  // 3. Match Vehicle Details
  const vehicleStr = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ${ro.vehicle.vin || ''} ${ro.vehicle.licensePlate || ''} ${ro.vehicle.color || ''}`.toLowerCase();
  if (vehicleStr.includes(rawQuery)) return true;
  if (cleanQuery && vehicleStr.includes(cleanQuery)) return true;

  // 4. Match Technician Name, Tech Number / Employee Number, and Tech ID
  // Primary Assigned Tech
  if (ro.techName && ro.techName.toLowerCase().includes(rawQuery)) return true;
  if (cleanQuery && ro.techName && ro.techName.toLowerCase().includes(cleanQuery)) return true;
  if (ro.techId && ro.techId.toLowerCase() === rawQuery) return true;

  // Line-Level Assigned Techs
  if (ro.concernTechNames && ro.concernTechNames.some(tn => tn && (tn.toLowerCase().includes(rawQuery) || (cleanQuery && tn.toLowerCase().includes(cleanQuery))))) {
    return true;
  }
  if (ro.concernTechIds && ro.concernTechIds.some(tid => tid && tid.toLowerCase() === rawQuery)) {
    return true;
  }

  // Tech User Lookup (by employeeNumber, ID, name)
  if (users && users.length > 0) {
    // Gather all tech IDs tied to this RO
    const assignedTechIds = new Set<string>();
    if (ro.techId) assignedTechIds.add(ro.techId);
    if (ro.concernTechIds) {
      ro.concernTechIds.forEach(id => {
        if (id) assignedTechIds.add(id);
      });
    }

    for (const techId of assignedTechIds) {
      const u = users.find(user => user.id === techId);
      if (u) {
        if (u.name.toLowerCase().includes(rawQuery)) return true;
        if (cleanQuery && u.name.toLowerCase().includes(cleanQuery)) return true;
        if (u.employeeNumber) {
          const emp = u.employeeNumber.toLowerCase();
          if (
            emp === rawQuery ||
            emp === cleanQuery ||
            `#${emp}` === rawQuery ||
            `tech ${emp}` === rawQuery ||
            `tech #${emp}` === rawQuery ||
            emp.includes(cleanQuery)
          ) {
            return true;
          }
        }
      }
    }

    // Match query against any technician user in system, then check if assigned to this RO
    const matchingTechUsers = users.filter(u => {
      const matchName = u.name.toLowerCase().includes(rawQuery) || (cleanQuery && u.name.toLowerCase().includes(cleanQuery));
      const matchEmp = u.employeeNumber && (
        u.employeeNumber.toLowerCase() === rawQuery ||
        u.employeeNumber.toLowerCase() === cleanQuery ||
        `#${u.employeeNumber.toLowerCase()}` === rawQuery ||
        `tech ${u.employeeNumber.toLowerCase()}` === rawQuery ||
        `tech #${u.employeeNumber.toLowerCase()}` === rawQuery ||
        u.employeeNumber.toLowerCase().includes(cleanQuery)
      );
      const matchId = u.id.toLowerCase() === rawQuery;
      return matchName || matchEmp || matchId;
    });

    if (matchingTechUsers.length > 0) {
      const matchingTechIds = new Set(matchingTechUsers.map(u => u.id));
      const matchingTechNames = new Set(matchingTechUsers.map(u => u.name.toLowerCase()));

      if (ro.techId && matchingTechIds.has(ro.techId)) return true;
      if (ro.techName && matchingTechNames.has(ro.techName.toLowerCase())) return true;
      if (ro.concernTechIds && ro.concernTechIds.some(id => id && matchingTechIds.has(id))) return true;
      if (ro.concernTechNames && ro.concernTechNames.some(name => name && matchingTechNames.has(name.toLowerCase()))) return true;
    }
  }

  // Time clock punches (technician employee number and punch tech name)
  if (ro.timePunches && ro.timePunches.length > 0) {
    const matchPunch = ro.timePunches.some(punch => {
      if (punch.techName && punch.techName.toLowerCase().includes(rawQuery)) return true;
      if (cleanQuery && punch.techName && punch.techName.toLowerCase().includes(cleanQuery)) return true;
      if (punch.techEmployeeNumber) {
        const emp = punch.techEmployeeNumber.toLowerCase();
        if (
          emp === rawQuery ||
          emp === cleanQuery ||
          `#${emp}` === rawQuery ||
          `tech ${emp}` === rawQuery ||
          `tech #${emp}` === rawQuery ||
          emp.includes(cleanQuery)
        ) {
          return true;
        }
      }
      return false;
    });
    if (matchPunch) return true;
  }

  // 5. Match Advisor Name
  if (ro.advisorName && ro.advisorName.toLowerCase().includes(rawQuery)) return true;

  // 6. Match Bay
  if (ro.bay && ro.bay.toLowerCase().includes(rawQuery)) return true;

  // 7. Match Customer Concerns & Line Items
  if (ro.primaryConcern && ro.primaryConcern.toLowerCase().includes(rawQuery)) return true;
  if (ro.concerns && ro.concerns.some(c => c && c.toLowerCase().includes(rawQuery))) return true;
  if (ro.diagnosticNotes && ro.diagnosticNotes.toLowerCase().includes(rawQuery)) return true;
  if (ro.cause && ro.cause.toLowerCase().includes(rawQuery)) return true;
  if (ro.correction && ro.correction.toLowerCase().includes(rawQuery)) return true;

  // 8. Match Parts
  if (ro.parts && ro.parts.some(p => (p.partNumber && p.partNumber.toLowerCase().includes(rawQuery)) || (p.description && p.description.toLowerCase().includes(rawQuery)))) {
    return true;
  }

  return false;
}


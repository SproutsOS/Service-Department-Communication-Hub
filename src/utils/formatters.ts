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
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return String(val);
  return num.toFixed(2);
}

/**
 * Format a numeric or string price with dollar sign and 2 decimal places (e.g., 52.5 -> "$52.50").
 * Returns fallback if value is undefined, null, or invalid.
 */
export function formatCurrency(val?: number | string | null, fallback = '$0.00'): string {
  if (val === undefined || val === null || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return fallback;
  return `$${num.toFixed(2)}`;
}

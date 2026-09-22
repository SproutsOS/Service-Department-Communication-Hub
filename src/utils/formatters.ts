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
  if (isNaN(etaDate.getTime())) return { text: etaStr, urgent: false, pastDue: false };

  const now = new Date();
  const diffMs = etaDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 0) {
    return {
      text: `Past due (${Math.abs(Math.floor(diffMinutes / 60))}h ${Math.abs(diffMinutes % 60)}m ago)`,
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

  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return {
    text: `ETA ${hours}h ${remainingMins}m (${formatTimeOnly(etaDate)})`,
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

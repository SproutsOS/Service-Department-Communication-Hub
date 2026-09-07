export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const now = new Date();
  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = 
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

export function formatTimeOnly(dateStr?: string): string {
  if (!dateStr) return '--:--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
      text: `Arriving in ${diffMinutes} min (${etaDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`,
      urgent: true,
      pastDue: false,
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return {
    text: `ETA ${hours}h ${remainingMins}m (${etaDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`,
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
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m in bay`;
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
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
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
  if (ro.status === 'WAITING_DIAGNOSIS') {
    const timestamp = ro.waitingDiagnosisAt || ro.dispatchedAt || ro.createdAt;
    const duration = formatDurationSince(timestamp);
    return {
      isWaiting: true,
      isDiagnosing: false,
      label: 'Waiting Diagnosis',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      timeLabel: timestamp ? `In queue since ${formatTimeOnly(timestamp)}` : 'In queue',
      duration: duration || 'Recently queued',
    };
  }

  if (ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_BAY') {
    const timestamp = ro.diagnosisStartedAt || ro.dispatchedAt;
    const duration = formatDurationSince(timestamp);
    return {
      isWaiting: false,
      isDiagnosing: true,
      label: 'Being Diagnosed',
      badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
      timeLabel: timestamp ? `Started at ${formatTimeOnly(timestamp)}` : 'Underway',
      duration: duration || 'Recently started',
    };
  }

  return null;
}

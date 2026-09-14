import { RepairOrder, CustomerContactRecord, CustomerContactType, CustomerContactOutcome } from '../types';
import { normalizeROStatus } from '../data/mockData';

export interface CadenceStatusInfo {
  status: 'OVERDUE' | 'DUE_TODAY' | 'CURRENT' | 'NOT_APPLICABLE';
  label: string;
  badgeClass: string;
  daysSinceLastContact: number;
  daysOverdue: number;
  isOverdue: boolean;
  isDueToday: boolean;
  needsCall: boolean;
  lastContactText: string;
  nextDueText: string;
}

/**
 * Calculates the next recommended contact date ensuring a twice-weekly cadence.
 * Defaults to 3 to 4 days out. If landing on Sunday, rolls to Monday.
 */
export function calculateNextContactDate(fromDate?: Date | string, daysAhead: number = 3.5): string {
  const baseDate = fromDate ? new Date(fromDate) : new Date();
  const nextDate = new Date(baseDate.getTime() + Math.round(daysAhead * 24 * 60 * 60 * 1000));
  
  // If landing on Sunday (day 0), push to Monday (day 1)
  if (nextDate.getDay() === 0) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate.toISOString().split('T')[0];
}

/**
 * Determines whether an RO qualifies for active customer contact cadence.
 * Vehicles that are waiting on parts, in diagnostics, waiting on estimate approval,
 * or actively in repair need at least twice-weekly proactive outreach.
 */
export function isEligibleForCadence(ro: RepairOrder): boolean {
  const norm = normalizeROStatus(ro.status);
  if (norm === 'CLOSED' || norm === 'COMPLETED' || norm === 'READY_FOR_PICKUP') {
    return false;
  }
  return true;
}

/**
 * Computes customer contact cadence health, overdue metrics, and visual badges.
 */
export function getContactCadenceStatus(ro: RepairOrder): CadenceStatusInfo {
  if (!isEligibleForCadence(ro)) {
    return {
      status: 'NOT_APPLICABLE',
      label: 'Closed / Complete',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      daysSinceLastContact: 0,
      daysOverdue: 0,
      isOverdue: false,
      isDueToday: false,
      needsCall: false,
      lastContactText: 'Vehicle pickup or closed',
      nextDueText: 'None scheduled',
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Reference date: last contact date, or ticket creation date if never contacted
  const lastContactTs = ro.lastContactDate ? new Date(ro.lastContactDate).getTime() : new Date(ro.createdAt).getTime();
  const msSinceContact = Math.max(0, now.getTime() - lastContactTs);
  const daysSinceContact = Math.floor(msSinceContact / (24 * 60 * 60 * 1000));

  let lastContactText = '';
  if (!ro.lastContactDate) {
    lastContactText = `No contact logged yet (${daysSinceContact}d since ticket created)`;
  } else if (daysSinceContact === 0) {
    lastContactText = `Contacted today by ${ro.lastContactBy || 'Advisor'}`;
  } else if (daysSinceContact === 1) {
    lastContactText = `Contacted yesterday by ${ro.lastContactBy || 'Advisor'}`;
  } else {
    lastContactText = `Contacted ${daysSinceContact}d ago by ${ro.lastContactBy || 'Advisor'}`;
  }

  // Check explicit nextContactDueDate if set
  if (ro.nextContactDueDate) {
    const dueDateStr = ro.nextContactDueDate.split('T')[0];
    const dueTime = new Date(`${dueDateStr}T23:59:59`).getTime();
    const startTime = new Date(`${dueDateStr}T00:00:00`).getTime();
    const nowTime = now.getTime();

    if (nowTime > dueTime) {
      // Overdue
      const overdueDays = Math.max(1, Math.floor((nowTime - dueTime) / (24 * 60 * 60 * 1000)));
      return {
        status: 'OVERDUE',
        label: `Call Overdue (${overdueDays}d)`,
        badgeClass: 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400/30 font-bold',
        daysSinceLastContact: daysSinceContact,
        daysOverdue: overdueDays,
        isOverdue: true,
        isDueToday: false,
        needsCall: true,
        lastContactText,
        nextDueText: `Was due on ${dueDateStr}`,
      };
    } else if (dueDateStr === todayStr) {
      // Due Today
      return {
        status: 'DUE_TODAY',
        label: 'Call Due Today',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30 font-bold',
        daysSinceLastContact: daysSinceContact,
        daysOverdue: 0,
        isOverdue: false,
        isDueToday: true,
        needsCall: true,
        lastContactText,
        nextDueText: 'Due today by end of business',
      };
    } else {
      // Current / scheduled
      return {
        status: 'CURRENT',
        label: `Next Call: ${dueDateStr}`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
        daysSinceLastContact: daysSinceContact,
        daysOverdue: 0,
        isOverdue: false,
        isDueToday: false,
        needsCall: false,
        lastContactText,
        nextDueText: `Scheduled for ${dueDateStr}`,
      };
    }
  }

  // Fallback if no nextContactDueDate: Twice per week cadence rule (every 3.5 days / 3 business days)
  if (daysSinceContact >= 4) {
    const overdueDays = daysSinceContact - 3;
    return {
      status: 'OVERDUE',
      label: `Call Overdue (${daysSinceContact}d since contact)`,
      badgeClass: 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400/30 font-bold',
      daysSinceLastContact: daysSinceContact,
      daysOverdue: overdueDays,
      isOverdue: true,
      isDueToday: false,
      needsCall: true,
      lastContactText,
      nextDueText: 'Twice-per-week cadence threshold exceeded',
    };
  } else if (daysSinceContact === 3) {
    return {
      status: 'DUE_TODAY',
      label: 'Call Due Today (3d cadence)',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/30 font-bold',
      daysSinceLastContact: daysSinceContact,
      daysOverdue: 0,
      isOverdue: false,
      isDueToday: true,
      needsCall: true,
      lastContactText,
      nextDueText: 'Due today for twice-weekly update',
    };
  } else {
    return {
      status: 'CURRENT',
      label: daysSinceContact === 0 ? 'Called Today' : `Called ${daysSinceContact}d ago`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
      daysSinceLastContact: daysSinceContact,
      daysOverdue: 0,
      isOverdue: false,
      isDueToday: false,
      needsCall: false,
      lastContactText,
      nextDueText: 'Next call due in ' + (3 - daysSinceContact) + ' day(s)',
    };
  }
}

export function formatContactType(type: CustomerContactType): { label: string; icon: string } {
  switch (type) {
    case 'PHONE_CALL':
      return { label: 'Phone Call', icon: 'Phone' };
    case 'LEFT_VOICEMAIL':
      return { label: 'Voicemail', icon: 'Voicemail' };
    case 'SMS':
      return { label: 'Text / SMS', icon: 'MessageSquare' };
    case 'IN_PERSON':
      return { label: 'In-Person', icon: 'User' };
    case 'EMAIL':
      return { label: 'Email', icon: 'Mail' };
    default:
      return { label: 'Contact', icon: 'Phone' };
  }
}

export function formatContactOutcome(outcome: CustomerContactOutcome): { label: string; color: string } {
  switch (outcome) {
    case 'SPOKE_WITH_CUSTOMER':
      return { label: 'Spoke with Customer', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    case 'LEFT_VOICEMAIL':
      return { label: 'Left Detailed Voicemail', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    case 'NO_ANSWER':
      return { label: 'No Answer', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'SENT_SMS_UPDATE':
      return { label: 'Sent SMS Status Update', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' };
    case 'CUSTOMER_APPROVED_DELAY':
      return { label: 'Customer Approved Delay', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    case 'CUSTOMER_REQUESTED_CALLBACK':
      return { label: 'Customer Requested Callback', color: 'text-orange-700 bg-orange-50 border-orange-200' };
    default:
      return { label: 'Updated', color: 'text-slate-700 bg-slate-50 border-slate-200' };
  }
}

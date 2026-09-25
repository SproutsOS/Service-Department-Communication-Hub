import { PartStatus } from '../types';

export interface ArrivalTimeFrameOption {
  id: string;
  label: string;
  shortLabel: string;
  status: PartStatus;
  targetDays?: number; // 0 = today, 1 = tomorrow, etc.
  targetTime?: string; // '14:00', '17:00', etc.
  isCustom?: boolean;
}

export const DEFAULT_ARRIVAL_TIMEFRAMES: ArrivalTimeFrameOption[] = [
  {
    id: 'IN_STOCK',
    label: 'In Stock (Ready Now in Parts Dept)',
    shortLabel: 'In Stock',
    status: 'IN_STOCK',
    targetDays: 0,
  },
  {
    id: 'LOCAL_PURCHASE',
    label: 'Local Purchase (AutoZone / O\'Reilly / Local Vendor)',
    shortLabel: 'Local Purchase',
    status: 'LOCAL_PURCHASE',
    targetDays: 0,
    targetTime: '13:00',
  },
  {
    id: 'TODAY_5PM',
    label: 'Today by 5:00 PM (Standard Daily Order)',
    shortLabel: 'Today 5:00 PM',
    status: 'DAILY_ORDER',
    targetDays: 0,
    targetTime: '17:00',
  },
  {
    id: 'TODAY_2PM',
    label: 'Today by 2:00 PM (Mid-Day Shuttle)',
    shortLabel: 'Today 2:00 PM',
    status: 'DAILY_ORDER',
    targetDays: 0,
    targetTime: '14:00',
  },
  {
    id: 'TOMORROW_MORNING',
    label: 'Tomorrow Morning (8:00 AM - 10:00 AM)',
    shortLabel: 'Tomorrow Morning',
    status: 'SPECIAL_ORDER_1_5_DAYS',
    targetDays: 1,
    targetTime: '09:00',
  },
  {
    id: 'TOMORROW_5PM',
    label: 'Tomorrow by 5:00 PM (Next Day Daily)',
    shortLabel: 'Tomorrow 5:00 PM',
    status: 'SPECIAL_ORDER_1_5_DAYS',
    targetDays: 1,
    targetTime: '17:00',
  },
  {
    id: '1_2_DAYS',
    label: '1 - 2 Business Days (Regional Hub)',
    shortLabel: '1 - 2 Days',
    status: 'SPECIAL_ORDER_1_5_DAYS',
    targetDays: 2,
    targetTime: '17:00',
  },
  {
    id: '3_5_DAYS',
    label: '3 - 5 Business Days (Ground Shipping)',
    shortLabel: '3 - 5 Days',
    status: 'SPECIAL_ORDER',
    targetDays: 4,
    targetTime: '17:00',
  },
  {
    id: '1_2_WEEKS',
    label: '1 - 2 Weeks (Direct Factory Order)',
    shortLabel: '1 - 2 Weeks',
    status: 'SPECIAL_ORDER',
    targetDays: 10,
    targetTime: '17:00',
  },
  {
    id: 'VOR_UPGRADE',
    label: 'VOR Upgrade (Critical Overnight Air)',
    shortLabel: 'VOR Overnight',
    status: 'VOR_UPGRADE',
    targetDays: 1,
    targetTime: '08:30',
  },
  {
    id: 'BACKORDERED',
    label: 'Backordered (National Backorder - ETA TBD)',
    shortLabel: 'Backordered (TBD)',
    status: 'BACKORDERED',
  },
];

const LOCAL_STORAGE_KEY = 'parts_custom_arrival_timeframes_v1';

export function getCustomArrivalTimeFrames(): ArrivalTimeFrameOption[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && item.id && item.label);
    }
  } catch (err) {
    console.warn('Failed to load custom arrival timeframes:', err);
  }
  return [];
}

export function saveCustomArrivalTimeFrame(label: string, customTime?: string, customDate?: string): ArrivalTimeFrameOption {
  const cleanLabel = label.trim();
  const id = `custom_tf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  let targetDays: number | undefined = undefined;
  let targetTime: string | undefined = customTime || undefined;

  if (customDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(customDate);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    targetDays = Math.max(0, Math.round(diffMs / (24 * 60 * 60 * 1000)));
  }

  // Infer appropriate PartStatus from label
  let status: PartStatus = 'SPECIAL_ORDER_1_5_DAYS';
  const upper = cleanLabel.toUpperCase();
  if (upper.includes('STOCK')) {
    status = 'IN_STOCK';
  } else if (upper.includes('LOCAL')) {
    status = 'LOCAL_PURCHASE';
  } else if (upper.includes('TODAY') || upper.includes('DAILY')) {
    status = 'DAILY_ORDER';
  } else if (upper.includes('VOR') || upper.includes('OVERNIGHT') || upper.includes('AIR') || upper.includes('EMERGENCY')) {
    status = 'VOR_UPGRADE';
  } else if (upper.includes('BACKORDER') || upper.includes('NO ETA')) {
    status = 'BACKORDERED';
  } else if (upper.includes('WEEK') || upper.includes('MONTH')) {
    status = 'SPECIAL_ORDER';
  }

  const newOption: ArrivalTimeFrameOption = {
    id,
    label: cleanLabel,
    shortLabel: cleanLabel.length > 22 ? `${cleanLabel.substring(0, 20)}...` : cleanLabel,
    status,
    targetDays,
    targetTime,
    isCustom: true,
  };

  try {
    const existing = getCustomArrivalTimeFrames();
    const updated = [...existing.filter(i => i.label.toLowerCase() !== cleanLabel.toLowerCase()), newOption];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save custom arrival timeframe to localStorage:', err);
  }

  return newOption;
}

export function deleteCustomArrivalTimeFrame(id: string): void {
  try {
    const existing = getCustomArrivalTimeFrames();
    const updated = existing.filter(i => i.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to delete custom arrival timeframe:', err);
  }
}

export function getAllArrivalTimeFrames(): ArrivalTimeFrameOption[] {
  const custom = getCustomArrivalTimeFrames();
  return [...DEFAULT_ARRIVAL_TIMEFRAMES, ...custom];
}

/**
 * Calculates estimatedArrival string (ISO date or formatted custom string)
 * and the matching PartStatus for a given timeframe option or custom text.
 */
export function computeEtaAndStatus(
  timeFrameId: string, 
  customText?: string, 
  customDate?: string, 
  customTime?: string
): { estimatedArrival: string; status: PartStatus } {
  if (timeFrameId === 'IN_STOCK') {
    return {
      estimatedArrival: new Date().toISOString(),
      status: 'IN_STOCK',
    };
  }

  if (timeFrameId === 'LOCAL_PURCHASE') {
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 90 * 60 * 1000); // 1.5 hours local pickup window
    return {
      estimatedArrival: arrivalDate.toISOString(),
      status: 'LOCAL_PURCHASE',
    };
  }

  if (timeFrameId === 'BACKORDERED') {
    return {
      estimatedArrival: 'Backordered - ETA TBD',
      status: 'BACKORDERED',
    };
  }

  // Check if it's one of the options
  const all = getAllArrivalTimeFrames();
  const found = all.find(tf => tf.id === timeFrameId);

  // If user provided a specific custom date & time
  if (customDate) {
    const [year, month, day] = customDate.split('-').map(Number);
    const [hours, minutes] = customTime ? customTime.split(':').map(Number) : [17, 0];
    const dateObj = new Date(year, month - 1, day, hours, minutes);
    return {
      estimatedArrival: dateObj.toISOString(),
      status: found ? found.status : 'SPECIAL_ORDER_1_5_DAYS',
    };
  }

  if (found) {
    if (found.targetDays !== undefined) {
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + found.targetDays);
      const [h, m] = found.targetTime ? found.targetTime.split(':').map(Number) : [17, 0];
      targetDate.setHours(h, m, 0, 0);
      return {
        estimatedArrival: targetDate.toISOString(),
        status: found.status,
      };
    }

    return {
      estimatedArrival: found.label,
      status: found.status,
    };
  }

  // If timeFrameId is a raw custom string label (or customText was provided)
  const effectiveText = customText?.trim() || timeFrameId;
  return {
    estimatedArrival: effectiveText,
    status: 'DAILY_ORDER',
  };
}

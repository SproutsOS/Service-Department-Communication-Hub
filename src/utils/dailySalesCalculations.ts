import { DailySalesRecord, DailySalesTotals, WedTueWeekSalesSummary, MonthlySalesSummary } from '../types/dailySales';
import { RepairOrder } from '../types';

export const DAILY_SALES_START_DATE = '2025-09-01';

/**
 * Normalizes a daily record so all numeric metrics default cleanly to 0.
 */
export function normalizeDailySalesRecord(raw: Partial<DailySalesRecord> & { date: string }): DailySalesRecord {
  return {
    date: raw.date,
    roCount: Math.max(0, Number(raw.roCount) || 0),
    techHours: Math.max(0, Number(raw.techHours) || 0),
    laborSales: Math.max(0, Number(raw.laborSales) || 0),
    partsSales: Math.max(0, Number(raw.partsSales) || 0),
    ...(raw.notes ? { notes: raw.notes } : { notes: '' }),
    ...(raw.updatedAt ? { updatedAt: raw.updatedAt } : {})
  };
}

/**
 * Computes totals and percentages for a single daily record
 */
export function computeDailyTotals(record: DailySalesRecord): DailySalesTotals {
  const roCount = Math.max(0, Number(record.roCount) || 0);
  const techHours = Math.max(0, Number(record.techHours) || 0);
  const laborSales = Math.max(0, Number(record.laborSales) || 0);
  const partsSales = Math.max(0, Number(record.partsSales) || 0);

  const totalSales = laborSales + partsSales;
  const avgSalesPerRO = roCount > 0 ? totalSales / roCount : 0;
  const effectiveLaborRate = techHours > 0 ? laborSales / techHours : 0;
  const hoursPerRO = roCount > 0 ? techHours / roCount : 0;

  const laborPct = totalSales > 0 ? (laborSales / totalSales) * 100 : 0;
  const partsPct = totalSales > 0 ? (partsSales / totalSales) * 100 : 0;

  return {
    date: record.date,
    roCount,
    techHours,
    laborSales,
    partsSales,
    totalSales,
    avgSalesPerRO,
    effectiveLaborRate,
    hoursPerRO,
    laborPct,
    partsPct,
  };
}

/**
 * Given a YYYY-MM-DD date string, calculates the Wednesday through Tuesday week period enclosing that date.
 */
export function getWedTueWeekPeriodForDate(dateStr: string): {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  weekId: string;
} {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

  // Calculate Wednesday start (3)
  const diffToWed = (dayOfWeek - 3 + 7) % 7;
  const wedStart = new Date(d);
  wedStart.setDate(d.getDate() - diffToWed);

  const tueEnd = new Date(wedStart);
  tueEnd.setDate(wedStart.getDate() + 6);

  const formatIso = (dateObj: Date) => {
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dy = String(dateObj.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  const startDate = formatIso(wedStart);
  const endDate = formatIso(tueEnd);

  const startMonthStr = wedStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonthStr = tueEnd.toLocaleDateString('en-US', { month: 'short' });
  const label = startMonthStr === endMonthStr
    ? `Pay Period: ${startMonthStr} ${wedStart.getDate()} - ${tueEnd.getDate()}, ${tueEnd.getFullYear()}`
    : `Pay Period: ${startMonthStr} ${wedStart.getDate()} - ${endMonthStr} ${tueEnd.getDate()}, ${tueEnd.getFullYear()}`;

  const weekId = `week_${startDate.replace(/-/g, '_')}_${endDate.replace(/-/g, '_')}`;

  return { startDate, endDate, label, weekId };
}

/**
 * Groups daily sales records by Wednesday-to-Tuesday payroll weeks.
 */
export function groupRecordsByWedTueWeeks(records: DailySalesRecord[]): WedTueWeekSalesSummary[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const map = new Map<string, {
    startDate: string;
    endDate: string;
    label: string;
    records: DailySalesRecord[];
  }>();

  records.forEach(r => {
    const info = getWedTueWeekPeriodForDate(r.date);
    const existing = map.get(info.weekId);
    if (existing) {
      existing.records.push(r);
    } else {
      map.set(info.weekId, {
        startDate: info.startDate,
        endDate: info.endDate,
        label: info.label,
        records: [r]
      });
    }
  });

  const summaries: WedTueWeekSalesSummary[] = [];

  map.forEach((value, weekId) => {
    let totalROCount = 0;
    let totalTechHours = 0;
    let totalLaborSales = 0;
    let totalPartsSales = 0;

    value.records.forEach(r => {
      const computed = computeDailyTotals(r);
      totalROCount += computed.roCount;
      totalTechHours += computed.techHours;
      totalLaborSales += computed.laborSales;
      totalPartsSales += computed.partsSales;
    });

    const totalSales = totalLaborSales + totalPartsSales;
    const avgSalesPerRO = totalROCount > 0 ? totalSales / totalROCount : 0;
    const daysCount = value.records.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyROCount = daysCount > 0 ? totalROCount / daysCount : 0;
    const avgDailyTechHours = daysCount > 0 ? totalTechHours / daysCount : 0;
    const effectiveLaborRate = totalTechHours > 0 ? totalLaborSales / totalTechHours : 0;
    const hoursPerRO = totalROCount > 0 ? totalTechHours / totalROCount : 0;

    const laborPct = totalSales > 0 ? (totalLaborSales / totalSales) * 100 : 0;
    const partsPct = totalSales > 0 ? (totalPartsSales / totalSales) * 100 : 0;

    summaries.push({
      weekId,
      weekStartDate: value.startDate,
      weekEndingDate: value.endDate,
      weekLabel: value.label,
      daysCount,
      totalROCount,
      totalTechHours,
      totalLaborSales,
      totalPartsSales,
      totalSales,
      avgSalesPerRO,
      avgDailySales,
      avgDailyROCount,
      avgDailyTechHours,
      effectiveLaborRate,
      hoursPerRO,
      laborPct,
      partsPct,
    });
  });

  // Sort descending by week ending date
  return summaries.sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate));
}

/**
 * Given a YYYY-MM-DD date string, calculates the Sunday through Saturday calendar week enclosing that date.
 */
export function getSunSatWeekPeriodForDate(dateStr: string): {
  startDate: string;
  endDate: string;
  label: string;
  weekId: string;
} {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  const d = new Date(year, month, day);
  const dayOfWeek = d.getDay(); // 0: Sun .. 6: Sat

  const sunStart = new Date(d);
  sunStart.setDate(d.getDate() - dayOfWeek);

  const satEnd = new Date(sunStart);
  satEnd.setDate(sunStart.getDate() + 6);

  const formatIso = (dateObj: Date) => {
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dy = String(dateObj.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  const startDate = formatIso(sunStart);
  const endDate = formatIso(satEnd);

  const startMonthStr = sunStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonthStr = satEnd.toLocaleDateString('en-US', { month: 'short' });
  const label = startMonthStr === endMonthStr
    ? `${startMonthStr} ${sunStart.getDate()} - ${satEnd.getDate()}, ${satEnd.getFullYear()}`
    : `${startMonthStr} ${sunStart.getDate()} - ${endMonthStr} ${satEnd.getDate()}, ${satEnd.getFullYear()}`;

  const weekId = `calweek_${startDate.replace(/-/g, '_')}_${endDate.replace(/-/g, '_')}`;

  return { startDate, endDate, label, weekId };
}

/**
 * Groups daily sales records by Sunday-to-Saturday calendar weeks.
 */
export function groupRecordsByCalendarWeeks(records: DailySalesRecord[]): WedTueWeekSalesSummary[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const map = new Map<string, {
    startDate: string;
    endDate: string;
    label: string;
    records: DailySalesRecord[];
  }>();

  records.forEach(r => {
    const info = getSunSatWeekPeriodForDate(r.date);
    const existing = map.get(info.weekId);
    if (existing) {
      existing.records.push(r);
    } else {
      map.set(info.weekId, {
        startDate: info.startDate,
        endDate: info.endDate,
        label: info.label,
        records: [r]
      });
    }
  });

  const summaries: WedTueWeekSalesSummary[] = [];

  map.forEach((value, weekId) => {
    let totalROCount = 0;
    let totalTechHours = 0;
    let totalLaborSales = 0;
    let totalPartsSales = 0;

    value.records.forEach(r => {
      const computed = computeDailyTotals(r);
      totalROCount += computed.roCount;
      totalTechHours += computed.techHours;
      totalLaborSales += computed.laborSales;
      totalPartsSales += computed.partsSales;
    });

    const totalSales = totalLaborSales + totalPartsSales;
    const avgSalesPerRO = totalROCount > 0 ? totalSales / totalROCount : 0;
    const daysCount = value.records.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyROCount = daysCount > 0 ? totalROCount / daysCount : 0;
    const avgDailyTechHours = daysCount > 0 ? totalTechHours / daysCount : 0;
    const effectiveLaborRate = totalTechHours > 0 ? totalLaborSales / totalTechHours : 0;
    const hoursPerRO = totalROCount > 0 ? totalTechHours / totalROCount : 0;

    const laborPct = totalSales > 0 ? (totalLaborSales / totalSales) * 100 : 0;
    const partsPct = totalSales > 0 ? (totalPartsSales / totalSales) * 100 : 0;

    summaries.push({
      weekId,
      weekStartDate: value.startDate,
      weekEndingDate: value.endDate,
      weekLabel: value.label,
      daysCount,
      totalROCount,
      totalTechHours,
      totalLaborSales,
      totalPartsSales,
      totalSales,
      avgSalesPerRO,
      avgDailySales,
      avgDailyROCount,
      avgDailyTechHours,
      effectiveLaborRate,
      hoursPerRO,
      laborPct,
      partsPct,
    });
  });

  return summaries.sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate));
}

/**
 * Groups daily sales records by Month (YYYY-MM).
 */
export function groupRecordsByMonth(records: DailySalesRecord[]): MonthlySalesSummary[] {
  if (!Array.isArray(records) || records.length === 0) return [];

  const map = new Map<string, {
    monthKey: string;
    monthLabel: string;
    year: number;
    month: number;
    records: DailySalesRecord[];
  }>();

  records.forEach(r => {
    const parts = r.date.split('-').map(Number);
    const yr = parts[0] || 2026;
    const mo = parts[1] || 1;
    const monthKey = `${yr}-${String(mo).padStart(2, '0')}`;

    const dateObj = new Date(yr, mo - 1, 15);
    const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const existing = map.get(monthKey);
    if (existing) {
      existing.records.push(r);
    } else {
      map.set(monthKey, {
        monthKey,
        monthLabel,
        year: yr,
        month: mo,
        records: [r]
      });
    }
  });

  const summaries: MonthlySalesSummary[] = [];

  map.forEach((value, monthKey) => {
    let totalROCount = 0;
    let totalTechHours = 0;
    let totalLaborSales = 0;
    let totalPartsSales = 0;

    value.records.forEach(r => {
      const computed = computeDailyTotals(r);
      totalROCount += computed.roCount;
      totalTechHours += computed.techHours;
      totalLaborSales += computed.laborSales;
      totalPartsSales += computed.partsSales;
    });

    const totalSales = totalLaborSales + totalPartsSales;
    const avgSalesPerRO = totalROCount > 0 ? totalSales / totalROCount : 0;
    const daysCount = value.records.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyROCount = daysCount > 0 ? totalROCount / daysCount : 0;
    const avgDailyTechHours = daysCount > 0 ? totalTechHours / daysCount : 0;
    const effectiveLaborRate = totalTechHours > 0 ? totalLaborSales / totalTechHours : 0;
    const hoursPerRO = totalROCount > 0 ? totalTechHours / totalROCount : 0;

    const laborPct = totalSales > 0 ? (totalLaborSales / totalSales) * 100 : 0;
    const partsPct = totalSales > 0 ? (totalPartsSales / totalSales) * 100 : 0;

    summaries.push({
      monthKey,
      monthLabel: value.monthLabel,
      year: value.year,
      month: value.month,
      daysCount,
      totalROCount,
      totalTechHours,
      totalLaborSales,
      totalPartsSales,
      totalSales,
      avgSalesPerRO,
      avgDailySales,
      avgDailyROCount,
      avgDailyTechHours,
      effectiveLaborRate,
      hoursPerRO,
      laborPct,
      partsPct,
    });
  });

  return summaries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

/**
 * Calculates auto-suggested daily RO count, tech hours, labor sales, and parts sales
 * from actual repair orders logged or closed on a specific date.
 */
export function calculateDailySalesFromROs(
  dateStr: string,
  repairOrders: RepairOrder[]
): {
  roCount: number;
  techHours: number;
  laborSales: number;
  partsSales: number;
} {
  const matchesDate = (isoStr?: string) => {
    if (!isoStr) return false;
    return isoStr.startsWith(dateStr);
  };

  const rosOnDate = repairOrders.filter(ro => {
    return matchesDate(ro.createdAt) || matchesDate(ro.updatedAt) || matchesDate(ro.completedAt) || matchesDate(ro.closedAt);
  });

  let totalTechHours = 0;
  let totalLaborSales = 0;
  let totalPartsSales = 0;

  rosOnDate.forEach(ro => {
    if (ro.quote) {
      const nonDeclinedLabor = (ro.quote.laborItems || []).filter(item => item.status !== 'DECLINED');
      const laborHoursFromItems = nonDeclinedLabor.reduce((sum, item) => sum + (Number(item.laborHours) || 0), 0);
      const laborCostFromItems = nonDeclinedLabor.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);

      totalTechHours += laborHoursFromItems > 0 ? laborHoursFromItems : (Number(ro.quote.totalLaborHours) || 0);
      totalLaborSales += laborCostFromItems > 0 ? laborCostFromItems : (Number(ro.quote.totalLaborCost) || 0);

      const nonDeclinedParts = (ro.quote.partsItems || []).filter(item => item.status !== 'DECLINED');
      const partsFromQuoteItems = nonDeclinedParts.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
      if (partsFromQuoteItems > 0) {
        totalPartsSales += partsFromQuoteItems;
      } else if (Number(ro.quote.totalPartsCost) > 0) {
        totalPartsSales += Number(ro.quote.totalPartsCost) || 0;
      } else {
        (ro.parts || []).forEach(part => {
          const qty = Number(part.quantity) || 1;
          const price = Number(part.price) || Number(part.cost) || 0;
          totalPartsSales += qty * price;
        });
      }
    } else {
      // Fallback from time punches & parts list if no quote is attached
      const punchMinutes = (ro.timePunches || []).reduce((sum, p) => sum + (Number(p.durationMinutes) || 0), 0);
      if (punchMinutes > 0) {
        totalTechHours += punchMinutes / 60;
      }
      (ro.parts || []).forEach(part => {
        const qty = Number(part.quantity) || 1;
        const price = Number(part.price) || Number(part.cost) || 0;
        totalPartsSales += qty * price;
      });
    }
  });

  return {
    roCount: rosOnDate.length,
    techHours: Math.round(totalTechHours * 100) / 100,
    laborSales: Math.round(totalLaborSales * 100) / 100,
    partsSales: Math.round(totalPartsSales * 100) / 100,
  };
}

/**
 * Ensures the Daily Sales & RO Entry Sheet spans every weekday (Mon–Fri) from
 * September 1, 2025 through today without overwriting any existing user entries.
 */
export function ensureDailySalesRange(existingRecords?: DailySalesRecord[]): DailySalesRecord[] {
  const byDate = new Map<string, DailySalesRecord>();

  if (Array.isArray(existingRecords)) {
    existingRecords.forEach(rec => {
      if (rec && typeof rec.date === 'string' && rec.date.trim()) {
        byDate.set(rec.date, normalizeDailySalesRecord(rec));
      }
    });
  }

  const start = new Date(2025, 8, 1); // Sept 1, 2025
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const curr = new Date(start);
  while (curr <= end) {
    const yr = curr.getFullYear();
    const mo = String(curr.getMonth() + 1).padStart(2, '0');
    const dy = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${dy}`;

    const dayOfWeek = curr.getDay(); // 0: Sun, 6: Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend && !byDate.has(dateStr)) {
      byDate.set(dateStr, {
        date: dateStr,
        roCount: 0,
        techHours: 0,
        laborSales: 0,
        partsSales: 0,
        notes: ''
      });
    }

    curr.setDate(curr.getDate() + 1);
  }

  // Sort descending (newest date first)
  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Seeds initial daily records starting from September 1, 2025 up to today.
 */
export function seedInitialDailyRecords(existingRecords?: DailySalesRecord[]): DailySalesRecord[] {
  return ensureDailySalesRange(existingRecords);
}

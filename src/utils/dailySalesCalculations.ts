import { DailySalesRecord, DailySalesTotals, WedTueWeekSalesSummary, MonthlySalesSummary } from '../types/dailySales';
import { RepairOrder } from '../types';

/**
 * Computes totals and percentages for a single daily record
 */
export function computeDailyTotals(record: DailySalesRecord): DailySalesTotals {
  const roCount = Math.max(0, Number(record.roCount) || 0);
  const cpSales = Math.max(0, Number(record.customerPaySales) || 0);
  const warrSales = Math.max(0, Number(record.warrantySales) || 0);
  const intSales = Math.max(0, Number(record.internalSales) || 0);

  const totalSales = cpSales + warrSales + intSales;
  const avgSalesPerRO = roCount > 0 ? totalSales / roCount : 0;

  const customerPayPct = totalSales > 0 ? (cpSales / totalSales) * 100 : 0;
  const warrantyPct = totalSales > 0 ? (warrSales / totalSales) * 100 : 0;
  const internalPct = totalSales > 0 ? (intSales / totalSales) * 100 : 0;

  return {
    date: record.date,
    roCount,
    customerPaySales: cpSales,
    warrantySales: warrSales,
    internalSales: intSales,
    totalSales,
    avgSalesPerRO,
    customerPayPct,
    warrantyPct,
    internalPct,
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
    let totalCustomerPay = 0;
    let totalWarranty = 0;
    let totalInternal = 0;

    value.records.forEach(r => {
      const computed = computeDailyTotals(r);
      totalROCount += computed.roCount;
      totalCustomerPay += computed.customerPaySales;
      totalWarranty += computed.warrantySales;
      totalInternal += computed.internalSales;
    });

    const totalSales = totalCustomerPay + totalWarranty + totalInternal;
    const avgSalesPerRO = totalROCount > 0 ? totalSales / totalROCount : 0;
    const daysCount = value.records.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyROCount = daysCount > 0 ? totalROCount / daysCount : 0;

    const customerPayPct = totalSales > 0 ? (totalCustomerPay / totalSales) * 100 : 0;
    const warrantyPct = totalSales > 0 ? (totalWarranty / totalSales) * 100 : 0;
    const internalPct = totalSales > 0 ? (totalInternal / totalSales) * 100 : 0;

    summaries.push({
      weekId,
      weekStartDate: value.startDate,
      weekEndingDate: value.endDate,
      weekLabel: value.label,
      daysCount,
      totalROCount,
      totalCustomerPaySales: totalCustomerPay,
      totalWarrantySales: totalWarranty,
      totalInternalSales: totalInternal,
      totalSales,
      avgSalesPerRO,
      avgDailySales,
      avgDailyROCount,
      customerPayPct,
      warrantyPct,
      internalPct,
    });
  });

  // Sort descending by week ending date
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
    let totalCustomerPay = 0;
    let totalWarranty = 0;
    let totalInternal = 0;

    value.records.forEach(r => {
      const computed = computeDailyTotals(r);
      totalROCount += computed.roCount;
      totalCustomerPay += computed.customerPaySales;
      totalWarranty += computed.warrantySales;
      totalInternal += computed.internalSales;
    });

    const totalSales = totalCustomerPay + totalWarranty + totalInternal;
    const avgSalesPerRO = totalROCount > 0 ? totalSales / totalROCount : 0;
    const daysCount = value.records.length;
    const avgDailySales = daysCount > 0 ? totalSales / daysCount : 0;
    const avgDailyROCount = daysCount > 0 ? totalROCount / daysCount : 0;

    const customerPayPct = totalSales > 0 ? (totalCustomerPay / totalSales) * 100 : 0;
    const warrantyPct = totalSales > 0 ? (totalWarranty / totalSales) * 100 : 0;
    const internalPct = totalSales > 0 ? (totalInternal / totalSales) * 100 : 0;

    summaries.push({
      monthKey,
      monthLabel: value.monthLabel,
      year: value.year,
      month: value.month,
      daysCount,
      totalROCount,
      totalCustomerPaySales: totalCustomerPay,
      totalWarrantySales: totalWarranty,
      totalInternalSales: totalInternal,
      totalSales,
      avgSalesPerRO,
      avgDailySales,
      avgDailyROCount,
      customerPayPct,
      warrantyPct,
      internalPct,
    });
  });

  return summaries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

/**
 * Calculates auto-suggested daily totals from actual repair orders created or closed on a specific date.
 */
export function calculateDailySalesFromROs(
  dateStr: string,
  repairOrders: RepairOrder[]
): {
  roCount: number;
  customerPaySales: number;
  warrantySales: number;
  internalSales: number;
} {
  const matchesDate = (isoStr?: string) => {
    if (!isoStr) return false;
    return isoStr.startsWith(dateStr);
  };

  const rosOnDate = repairOrders.filter(ro => {
    return matchesDate(ro.createdAt) || matchesDate(ro.updatedAt) || matchesDate(ro.completedAt) || matchesDate(ro.closedAt);
  });

  let cp = 0;
  let warr = 0;
  let int = 0;

  rosOnDate.forEach(ro => {
    const payTypes = ro.concernPayTypes || [];
    const mainPayType = payTypes[0] || 'CUSTOMER_PAY';

    let roPartsTotal = 0;
    (ro.parts || []).forEach(part => {
      const qty = Number(part.quantity) || 1;
      const price = Number(part.price) || Number(part.cost) || 0;
      roPartsTotal += qty * price;
    });

    const quoteTotal = Number(ro.quote?.grandTotal || ro.quote?.totalApprovedAmount) || 0;
    const totalROVal = quoteTotal > 0 ? quoteTotal : (roPartsTotal + 250);

    if (mainPayType === 'WARRANTY' || mainPayType === 'EXTENDED_WARRANTY') {
      warr += totalROVal;
    } else if (mainPayType === 'INTERNAL') {
      int += totalROVal;
    } else {
      cp += totalROVal;
    }
  });

  return {
    roCount: rosOnDate.length,
    customerPaySales: Math.round(cp * 100) / 100,
    warrantySales: Math.round(warr * 100) / 100,
    internalSales: Math.round(int * 100) / 100,
  };
}

/**
 * Seeds initial daily records starting from September 1, 2026 up to today (or Nov 10, 2026).
 * Pre-populates clean realistic dealership figures if empty.
 */
export function seedInitialDailyRecords(existingRecords?: DailySalesRecord[]): DailySalesRecord[] {
  if (Array.isArray(existingRecords) && existingRecords.length > 0) {
    return existingRecords;
  }

  // Pre-generate daily dates starting Sept 1, 2026 to Nov 10, 2026
  const records: DailySalesRecord[] = [];
  const start = new Date(2026, 8, 1); // Sept 1, 2026
  const end = new Date(2026, 10, 10); // Nov 10, 2026

  const curr = new Date(start);
  let dayIndex = 0;

  while (curr <= end) {
    const yr = curr.getFullYear();
    const mo = String(curr.getMonth() + 1).padStart(2, '0');
    const dy = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${dy}`;

    const dayOfWeek = curr.getDay(); // 0: Sun, 6: Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend) {
      // Realistic dealership daily variation
      const baseROs = 14 + (dayIndex % 7);
      const cp = 3200 + ((dayIndex * 170) % 1800);
      const warr = 1100 + ((dayIndex * 130) % 900);
      const int = 400 + ((dayIndex * 80) % 500);

      records.push({
        date: dateStr,
        roCount: baseROs,
        customerPaySales: cp,
        warrantySales: warr,
        internalSales: int,
        notes: dayOfWeek === 1 ? 'Monday busy intake' : dayOfWeek === 5 ? 'Friday quick turnarounds' : ''
      });
    }

    curr.setDate(curr.getDate() + 1);
    dayIndex++;
  }

  // Sort descending (newest date first)
  return records.sort((a, b) => b.date.localeCompare(a.date));
}

import { 
  EmployeePayType,
  EmployeeProfitabilityRow, 
  ComputedEmployeeRow, 
  ProfitabilityWeek, 
  WeekSummaryTotals, 
  RunningTotalsAccumulator 
} from '../types/employeeProfitability';

/**
 * Computes individual employee row figures given pay type and user-entered sales & profit
 */
export function computeEmployeeRow(
  row: EmployeeProfitabilityRow, 
  arg2?: number,
  arg3?: number
): ComputedEmployeeRow {
  const actualHours = Number(row.actualHours) || 0;
  const flaggedHours = Number(row.flaggedHours) || 0;
  const payRate = Number(row.payRate) || 0;
  const overtimeMult = Number(row.overtimeMultiplier ?? 1.5) || 1.5;
  const partsSales = Number(row.partsSales) || 0;

  // Determine burden %
  let defaultBurdenPct = 10;
  if (typeof arg3 === 'number') {
    defaultBurdenPct = arg3;
  } else if (typeof arg2 === 'number') {
    defaultBurdenPct = arg2 <= 50 ? arg2 : 10;
  }

  // 1. Efficiency Percentage = (Flagged Hours / Actual Hours) * 100
  const efficiencyPct = actualHours > 0 ? (flaggedHours / actualHours) * 100 : 0;

  // 2. Total Pay calculation depending on pay type:
  // - FLAT_RATE: Flagged Hours * Pay Rate
  // - HOURLY: Actual Hours * Pay Rate (with 1.5x OT after 40 hrs if overtimeMult > 1)
  // - SALARY: Fixed Pay Rate per week
  let totalPay = 0;
  if (row.payType === 'FLAT_RATE') {
    totalPay = flaggedHours * payRate;
  } else if (row.payType === 'HOURLY') {
    if (actualHours <= 40 || overtimeMult <= 1.0) {
      totalPay = actualHours * payRate;
    } else {
      const regularHours = 40;
      const otHours = actualHours - 40;
      totalPay = (regularHours * payRate) + (otHours * payRate * overtimeMult);
    }
  } else if (row.payType === 'SALARY') {
    totalPay = payRate;
  }

  // 3. Labor Sales: Direct user input (with fallback if opening older saved data)
  let laborSales = Number(row.laborSales);
  if (isNaN(laborSales) || row.laborSales === undefined || row.laborSales === null) {
    if (row.billedLaborRate && flaggedHours > 0) {
      laborSales = flaggedHours * row.billedLaborRate;
    } else {
      laborSales = 0;
    }
  }

  const laborRevenue = laborSales;
  const totalRevenue = laborSales + partsSales;

  // 4. Gross Profit ($): Labor Sales minus Total Pay
  const grossProfit = laborSales - totalPay;

  // Gross Profit % = (Gross Profit / Labor Sales) * 100
  const grossProfitPct = laborSales > 0 ? (grossProfit / laborSales) * 100 : 0;

  // 5. Net Profit ($): defaults to grossProfit
  let netProfit: number;
  if (row.manualNetProfit !== undefined && row.manualNetProfit !== null && !isNaN(Number(row.manualNetProfit))) {
    netProfit = Number(row.manualNetProfit);
  } else {
    netProfit = grossProfit;
  }
  const calculatedBurden = 0;

  const netProfitPct = laborSales > 0 ? (netProfit / laborSales) * 100 : 0;

  // Effective cost and revenue per attendance hour
  const effectiveCostPerHour = actualHours > 0 ? totalPay / actualHours : 0;
  const effectiveRevenuePerHour = actualHours > 0 ? totalRevenue / actualHours : 0;

  return {
    ...row,
    actualHours,
    flaggedHours,
    payRate,
    laborSales,
    grossProfit,
    efficiencyPct,
    totalPay,
    laborRevenue,
    totalRevenue,
    grossProfitPct,
    calculatedBurden,
    netProfit,
    netProfitPct,
    effectiveCostPerHour,
    effectiveRevenuePerHour,
  };
}

/**
 * Computes summary totals for an entire weekly sheet
 */
export function computeWeekSummary(week: ProfitabilityWeek): WeekSummaryTotals {
  const computedRows = (week.rows || []).map(r => 
    computeEmployeeRow(r, week.defaultBurdenPct)
  );

  let totalActualHours = 0;
  let totalFlaggedHours = 0;
  let totalPayroll = 0;
  let totalRevenue = 0;
  let totalGrossProfit = 0;
  let totalBurden = 0;
  let totalNetProfit = 0;

  computedRows.forEach(r => {
    totalActualHours += r.actualHours;
    totalFlaggedHours += r.flaggedHours;
    totalPayroll += r.totalPay;
    totalRevenue += r.totalRevenue;
    totalGrossProfit += r.grossProfit;
    totalBurden += r.calculatedBurden;
    totalNetProfit += r.netProfit;
  });

  const overallEfficiencyPct = totalActualHours > 0 
    ? (totalFlaggedHours / totalActualHours) * 100 
    : 0;

  const overallGrossProfitPct = totalRevenue > 0 
    ? (totalGrossProfit / totalRevenue) * 100 
    : 0;

  const overallNetProfitPct = totalRevenue > 0 
    ? (totalNetProfit / totalRevenue) * 100 
    : 0;

  const avgPayRate = computedRows.length > 0 
    ? totalPayroll / (totalActualHours || 1) 
    : 0;

  const avgRevenuePerHour = totalActualHours > 0 
    ? totalRevenue / totalActualHours 
    : 0;

  return {
    weekId: week.id,
    weekStartDate: week.weekStartDate,
    weekEndingDate: week.weekEndingDate,
    weekLabel: week.weekLabel,
    employeeCount: computedRows.length,
    totalActualHours,
    totalFlaggedHours,
    overallEfficiencyPct,
    totalPayroll,
    totalRevenue,
    totalGrossProfit,
    overallGrossProfitPct,
    totalBurden,
    totalNetProfit,
    overallNetProfitPct,
    avgPayRate,
    avgRevenuePerHour,
  };
}

/**
 * Computes running cumulative totals across all weeks in ledger
 */
export function computeRunningTotals(weeks: ProfitabilityWeek[]): RunningTotalsAccumulator {
  const summaries = weeks.map(computeWeekSummary);

  let totalActualHours = 0;
  let totalFlaggedHours = 0;
  let totalPayroll = 0;
  let totalRevenue = 0;
  let totalGrossProfit = 0;
  let totalBurden = 0;
  let totalNetProfit = 0;

  summaries.forEach(s => {
    totalActualHours += s.totalActualHours;
    totalFlaggedHours += s.totalFlaggedHours;
    totalPayroll += s.totalPayroll;
    totalRevenue += s.totalRevenue;
    totalGrossProfit += s.totalGrossProfit;
    totalBurden += s.totalBurden;
    totalNetProfit += s.totalNetProfit;
  });

  const totalWeeksCount = weeks.length;
  const cumulativeEfficiencyPct = totalActualHours > 0 
    ? (totalFlaggedHours / totalActualHours) * 100 
    : 0;

  const cumulativeGrossProfitPct = totalRevenue > 0 
    ? (totalGrossProfit / totalRevenue) * 100 
    : 0;

  const cumulativeNetProfitPct = totalRevenue > 0 
    ? (totalNetProfit / totalRevenue) * 100 
    : 0;

  const avgWeeklyRevenue = totalWeeksCount > 0 ? totalRevenue / totalWeeksCount : 0;
  const avgWeeklyGrossProfit = totalWeeksCount > 0 ? totalGrossProfit / totalWeeksCount : 0;
  const avgWeeklyNetProfit = totalWeeksCount > 0 ? totalNetProfit / totalWeeksCount : 0;

  return {
    totalWeeksCount,
    totalActualHours,
    totalFlaggedHours,
    cumulativeEfficiencyPct,
    totalPayroll,
    totalRevenue,
    totalGrossProfit,
    cumulativeGrossProfitPct,
    totalBurden,
    totalNetProfit,
    cumulativeNetProfitPct,
    avgWeeklyRevenue,
    avgWeeklyGrossProfit,
    avgWeeklyNetProfit,
  };
}

export interface EmployeeCumulativeRecord {
  employeeName: string;
  role: string;
  payType: string;
  weeksAppeared: number;
  totalActualHours: number;
  totalFlaggedHours: number;
  avgEfficiencyPct: number;
  totalPay: number;
  totalRevenue: number;
  totalGrossProfit: number;
  grossProfitPct: number;
  totalNetProfit: number;
  netProfitPct: number;
}

/**
 * Computes running cumulative totals grouped per employee across all recorded weeks
 */
export function computeEmployeeRunningTotals(weeks: ProfitabilityWeek[]): EmployeeCumulativeRecord[] {
  const map = new Map<string, {
    name: string;
    role: string;
    payType: string;
    weeksAppeared: number;
    actualHours: number;
    flaggedHours: number;
    totalPay: number;
    totalRevenue: number;
    totalGrossProfit: number;
    totalNetProfit: number;
  }>();

  weeks.forEach(w => {
    w.rows.forEach(r => {
      const computed = computeEmployeeRow(r, w.defaultBurdenPct);
      const key = (computed.name || 'Unnamed').trim().toLowerCase();
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.weeksAppeared += 1;
        existing.actualHours += computed.actualHours;
        existing.flaggedHours += computed.flaggedHours;
        existing.totalPay += computed.totalPay;
        existing.totalRevenue += computed.totalRevenue;
        existing.totalGrossProfit += computed.grossProfit;
        existing.totalNetProfit += computed.netProfit;
      } else {
        map.set(key, {
          name: computed.name || 'Unnamed',
          role: computed.role || '',
          payType: computed.payType,
          weeksAppeared: 1,
          actualHours: computed.actualHours,
          flaggedHours: computed.flaggedHours,
          totalPay: computed.totalPay,
          totalRevenue: computed.totalRevenue,
          totalGrossProfit: computed.grossProfit,
          totalNetProfit: computed.netProfit,
        });
      }
    });
  });

  const list: EmployeeCumulativeRecord[] = [];
  map.forEach(item => {
    const avgEfficiencyPct = item.actualHours > 0 ? (item.flaggedHours / item.actualHours) * 100 : 0;
    const grossProfitPct = item.totalRevenue > 0 ? (item.totalGrossProfit / item.totalRevenue) * 100 : 0;
    const netProfitPct = item.totalRevenue > 0 ? (item.totalNetProfit / item.totalRevenue) * 100 : 0;

    list.push({
      employeeName: item.name,
      role: item.role,
      payType: item.payType,
      weeksAppeared: item.weeksAppeared,
      totalActualHours: item.actualHours,
      totalFlaggedHours: item.flaggedHours,
      avgEfficiencyPct,
      totalPay: item.totalPay,
      totalRevenue: item.totalRevenue,
      totalGrossProfit: item.totalGrossProfit,
      grossProfitPct,
      totalNetProfit: item.totalNetProfit,
      netProfitPct,
    });
  });

  return list.sort((a, b) => b.totalGrossProfit - a.totalGrossProfit);
}

/**
 * Generates downloadable CSV content of a weekly sheet or comparison table
 */
export function exportWeekToCSV(week: ProfitabilityWeek): string {
  const computedRows = week.rows.map(r => computeEmployeeRow(r, week.defaultBurdenPct));
  const summary = computeWeekSummary(week);

  const headers = [
    'Employee Name',
    'Pay Type',
    'Actual Clock Hours',
    'Flagged / Billed Hours',
    'Efficiency %',
    'Rate of Pay ($)',
    'Total Pay ($)',
    'Labor Sales ($)',
    'Gross Profit ($)',
    'Gross Profit %',
    'Effective Cost/Hr ($)',
    'Effective Rev/Hr ($)'
  ];

  const lines: string[] = [];
  lines.push(`"Employee Profitability Ledger - ${week.weekLabel}"`);
  lines.push(`"Payroll Cycle: Wednesday to Tuesday | Ending: ${week.weekEndingDate}"`);
  lines.push('');
  lines.push(headers.map(h => `"${h}"`).join(','));

  computedRows.forEach(r => {
    const rowData = [
      r.name,
      r.payType,
      r.actualHours.toFixed(1),
      r.flaggedHours.toFixed(1),
      `${r.efficiencyPct.toFixed(1)}%`,
      `$${r.payRate.toFixed(2)}`,
      `$${r.totalPay.toFixed(2)}`,
      `$${r.laborSales.toFixed(2)}`,
      `$${r.grossProfit.toFixed(2)}`,
      `${r.grossProfitPct.toFixed(1)}%`,
      `$${r.effectiveCostPerHour.toFixed(2)}`,
      `$${r.effectiveRevenuePerHour.toFixed(2)}`
    ];
    lines.push(rowData.map(v => `"${v}"`).join(','));
  });

  lines.push('');
  lines.push([
    '"WEEK TOTALS / SUMMARY"',
    `"${computedRows.length} Employees"`,
    `"${summary.totalActualHours.toFixed(1)}"`,
    `"${summary.totalFlaggedHours.toFixed(1)}"`,
    `"${summary.overallEfficiencyPct.toFixed(1)}%"`,
    '""',
    `"$${summary.totalPayroll.toFixed(2)}"`,
    `"$${summary.totalRevenue.toFixed(2)}"`,
    `"$${summary.totalGrossProfit.toFixed(2)}"`,
    `"${summary.overallGrossProfitPct.toFixed(1)}%"`,
    '""',
    `"$${summary.avgRevenuePerHour.toFixed(2)}"`
  ].join(','));

  return lines.join('\r\n');
}

/**
 * Calculates the next Wednesday to Tuesday pay period after a given reference date (or current date).
 */
export function getNextWednesdayTuesdayPayPeriod(referenceDateStr?: string): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const formatIso = (d: Date) => {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  };

  if (referenceDateStr) {
    const parts = referenceDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // Reference is previous week ending date (Tuesday). Next starts Wednesday (+1 day)
      const prevEnd = new Date(parts[0], parts[1] - 1, parts[2]);
      const nextStart = new Date(prevEnd);
      nextStart.setDate(prevEnd.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextStart.getDate() + 6);

      const startMonth = nextStart.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = nextEnd.toLocaleDateString('en-US', { month: 'short' });
      const year = nextEnd.getFullYear();
      const label = startMonth === endMonth 
        ? `Pay Period: ${startMonth} ${nextStart.getDate()} - ${nextEnd.getDate()}, ${year}`
        : `Pay Period: ${startMonth} ${nextStart.getDate()} - ${endMonth} ${nextEnd.getDate()}, ${year}`;

      return {
        startDate: formatIso(nextStart),
        endDate: formatIso(nextEnd),
        label
      };
    }
  }

  // Calculate Wednesday through Tuesday period enclosing today
  const now = new Date();
  const day = now.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  const diffToWed = (day - 3 + 7) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToWed);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const year = end.getFullYear();
  const label = startMonth === endMonth 
    ? `Pay Period: ${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`
    : `Pay Period: ${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;

  return {
    startDate: formatIso(start),
    endDate: formatIso(end),
    label
  };
}

import { User } from '../types';

/**
 * Helper to strip any legacy sample employee rows from weeks data, unless present in staff list
 */
const SAMPLE_EMPLOYEE_NAMES = [
  'marcus vance',
  'jake reynolds',
  'bobby henderson',
  'tyler watson',
  'cody miller',
  'sarah jenkins'
];

export function removeSampleEmployees(weeks: ProfitabilityWeek[], usersList?: User[]): ProfitabilityWeek[] {
  if (!Array.isArray(weeks)) return [];
  const activeUserNames = new Set((usersList || []).map(u => (u.name || '').trim().toLowerCase()));

  return weeks.map(w => ({
    ...w,
    rows: (w.rows || []).filter(r => {
      const cleanName = (r.name || '').trim().toLowerCase();
      // If user exists in current staff roster (GitHub import or staff management), keep them!
      if (activeUserNames.has(cleanName)) return true;
      return !SAMPLE_EMPLOYEE_NAMES.includes(cleanName);
    })
  }));
}

/**
 * Synchronizes all active dealership staff members from the main User directory (AppContext / GitHub import)
 * into all weekly sheets in the Profitability Ledger.
 * Preserves all previously entered hours, pay rates, and labor sales for existing employees.
 */
export function syncStaffRosterToWeeks(
  weeksList: ProfitabilityWeek[],
  usersList: User[]
): ProfitabilityWeek[] {
  if (!Array.isArray(weeksList) || weeksList.length === 0) return weeksList;
  if (!Array.isArray(usersList) || usersList.length === 0) return weeksList;

  const activeUsers = usersList.filter(u => !u.isDeactivated && (u.name || '').trim().length > 0);
  if (activeUsers.length === 0) return weeksList;

  return weeksList.map(w => {
    const existingMap = new Map<string, EmployeeProfitabilityRow>();
    (w.rows || []).forEach(r => {
      const k = (r.name || '').trim().toLowerCase();
      if (k) existingMap.set(k, r);
    });

    const updatedRows: EmployeeProfitabilityRow[] = [];

    activeUsers.forEach((u, idx) => {
      const nameKey = (u.name || '').trim().toLowerCase();
      const existing = existingMap.get(nameKey);

      if (existing) {
        updatedRows.push(existing);
        existingMap.delete(nameKey);
      } else {
        let inferredPayType: EmployeePayType = 'FLAT_RATE';
        let payRate = 32.00;

        if (u.role === 'TECHNICIAN') {
          const titleLower = (u.title || '').toLowerCase();
          if (titleLower.includes('lube') || titleLower.includes('express') || titleLower.includes('oil')) {
            inferredPayType = 'HOURLY';
            payRate = 18.00;
          } else {
            inferredPayType = 'FLAT_RATE';
            payRate = 32.00;
          }
        } else if (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') {
          inferredPayType = 'SALARY';
          payRate = u.role === 'SERVICE_MANAGER' ? 1750.00 : 1250.00;
        } else {
          inferredPayType = 'HOURLY';
          payRate = 22.00;
        }

        updatedRows.push({
          id: `emp_staff_${u.id}_${w.id}_${idx}`,
          name: u.name,
          role: u.title || (u.role === 'TECHNICIAN' ? 'Technician' : u.role === 'SERVICE_ADVISOR' ? 'Service Advisor' : 'Staff'),
          payType: inferredPayType,
          actualHours: 40.0,
          flaggedHours: inferredPayType === 'FLAT_RATE' ? 40.0 : 0.0,
          payRate,
          laborSales: 0.00,
          grossProfit: 0.00,
          burdenType: 'PERCENT',
          burdenValue: w.defaultBurdenPct || 10.0,
          notes: ''
        });
      }
    });

    // Also keep any other custom rows user added directly to this week
    existingMap.forEach(customRow => {
      updatedRows.push(customRow);
    });

    return {
      ...w,
      updatedAt: new Date().toISOString(),
      rows: updatedRows
    };
  });
}

/**
 * Ensures that all user-added employees are present across ALL weeks in the ledger.
 * Preserves existing weekly figures (hours, sales) for employees already present on a week,
 * and adds missing employees to other weeks with standard defaults.
 */
export function ensureMasterRosterOnAllWeeks(weeksList: ProfitabilityWeek[], usersList?: User[]): ProfitabilityWeek[] {
  if (!Array.isArray(weeksList) || weeksList.length === 0) return weeksList;

  // First strip any legacy sample employees
  let cleanedWeeks = removeSampleEmployees(weeksList, usersList);

  // If users list was passed, sync staff roster first
  if (Array.isArray(usersList) && usersList.length > 0) {
    cleanedWeeks = syncStaffRosterToWeeks(cleanedWeeks, usersList);
  }

  // Map of unique user-added employees found across any week in the ledger
  const masterMap = new Map<string, EmployeeProfitabilityRow>();

  cleanedWeeks.forEach(w => {
    (w.rows || []).forEach(r => {
      const key = (r.name || '').trim().toLowerCase();
      if (!key) return;
      if (!masterMap.has(key)) {
        masterMap.set(key, r);
      }
    });
  });

  if (masterMap.size === 0) return cleanedWeeks;

  const masterList = Array.from(masterMap.values());

  return cleanedWeeks.map(w => {
    const existingNames = new Set((w.rows || []).map(r => (r.name || '').trim().toLowerCase()));
    const missingEmployees: EmployeeProfitabilityRow[] = [];

    masterList.forEach((m, idx) => {
      const key = (m.name || '').trim().toLowerCase();
      if (!existingNames.has(key)) {
        missingEmployees.push({
          id: `emp_${w.id}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          name: m.name,
          role: m.role || 'Technician',
          payType: m.payType || 'FLAT_RATE',
          actualHours: m.actualHours !== undefined ? m.actualHours : 40.0,
          flaggedHours: m.payType === 'FLAT_RATE' ? (m.flaggedHours !== undefined ? m.flaggedHours : 40.0) : 0.0,
          payRate: Number(m.payRate) || 0,
          overtimeMultiplier: Number(m.overtimeMultiplier) || 1.5,
          laborSales: 0.0,
          grossProfit: 0.0,
          burdenType: m.burdenType || 'PERCENT',
          burdenValue: m.burdenValue !== undefined ? m.burdenValue : 10.0,
          notes: m.notes || ''
        });
      }
    });

    if (missingEmployees.length === 0) return w;

    return {
      ...w,
      updatedAt: new Date().toISOString(),
      rows: [...(w.rows || []), ...missingEmployees]
    };
  });
}

/**
 * Automatically rolls over an employee roster from a previous week to a new week.
 * Copies employee names, roles, pay types, pay rates, and settings, but resets sales/profit
 * for a fresh week. Once created, weeks remain completely independent.
 */
export function rolloverRosterToNewWeek(
  sourceRows: EmployeeProfitabilityRow[],
  targetWeekId: string
): EmployeeProfitabilityRow[] {
  if (!Array.isArray(sourceRows) || sourceRows.length === 0) return [];
  return sourceRows.map((r, index) => ({
    id: `emp_${targetWeekId}_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    name: r.name,
    role: r.role || 'Technician',
    payType: r.payType || 'FLAT_RATE',
    actualHours: r.actualHours !== undefined ? r.actualHours : 40.0,
    flaggedHours: r.payType === 'FLAT_RATE' ? (r.flaggedHours !== undefined ? r.flaggedHours : 40.0) : 0.0,
    payRate: Number(r.payRate) || 0,
    overtimeMultiplier: Number(r.overtimeMultiplier) || 1.5,
    laborSales: 0.0,
    grossProfit: 0.0,
    burdenType: r.burdenType || 'PERCENT',
    burdenValue: r.burdenValue !== undefined ? r.burdenValue : 10.0,
    notes: r.notes || ''
  }));
}

/**
 * Legacy alias for backwards compatibility
 */
export function syncRosterFromSep2ToAllWeeks(
  weeksList: ProfitabilityWeek[],
  _overrideMasterRows?: EmployeeProfitabilityRow[]
): ProfitabilityWeek[] {
  return ensureMasterRosterOnAllWeeks(weeksList);
}

/**
 * Dealership Payroll Weeks:
 * Weekly payroll cycles strictly run Wednesday through Tuesday,
 * starting Wednesday, September 2, 2026.
 * All default weeks start with empty employee rows (no sample data).
 */
export const DEFAULT_PROFITABILITY_WEEKS: ProfitabilityWeek[] = [
  // Week 9: Oct 28 - Nov 3, 2026 (Current Active Week)
  {
    id: 'week_2026_11_03',
    weekStartDate: '2026-10-28',
    weekEndingDate: '2026-11-03',
    weekLabel: 'Pay Period: Oct 28 - Nov 3, 2026 (Current)',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-28T07:00:00Z',
    updatedAt: '2026-10-31T18:00:00Z',
    isLocked: false,
    notes: 'Active weekly cycle • Wednesday to Tuesday payroll',
    rows: []
  },
  // Week 8: Oct 21 - Oct 27, 2026
  {
    id: 'week_2026_10_27',
    weekStartDate: '2026-10-21',
    weekEndingDate: '2026-10-27',
    weekLabel: 'Pay Period: Oct 21 - Oct 27, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-21T07:00:00Z',
    updatedAt: '2026-10-27T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 7: Oct 14 - Oct 20, 2026
  {
    id: 'week_2026_10_20',
    weekStartDate: '2026-10-14',
    weekEndingDate: '2026-10-20',
    weekLabel: 'Pay Period: Oct 14 - Oct 20, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-14T07:00:00Z',
    updatedAt: '2026-10-20T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 6: Oct 7 - Oct 13, 2026
  {
    id: 'week_2026_10_13',
    weekStartDate: '2026-10-07',
    weekEndingDate: '2026-10-13',
    weekLabel: 'Pay Period: Oct 7 - Oct 13, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-07T07:00:00Z',
    updatedAt: '2026-10-13T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 5: Sep 30 - Oct 6, 2026
  {
    id: 'week_2026_10_06',
    weekStartDate: '2026-09-30',
    weekEndingDate: '2026-10-06',
    weekLabel: 'Pay Period: Sep 30 - Oct 6, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-09-30T07:00:00Z',
    updatedAt: '2026-10-06T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 4: Sep 23 - Sep 29, 2026
  {
    id: 'week_2026_09_29',
    weekStartDate: '2026-09-23',
    weekEndingDate: '2026-09-29',
    weekLabel: 'Pay Period: Sep 23 - Sep 29, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-09-23T07:00:00Z',
    updatedAt: '2026-09-29T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 3: Sep 16 - Sep 22, 2026
  {
    id: 'week_2026_09_22',
    weekStartDate: '2026-09-16',
    weekEndingDate: '2026-09-22',
    weekLabel: 'Pay Period: Sep 16 - Sep 22, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-09-16T07:00:00Z',
    updatedAt: '2026-09-22T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 2: Sep 9 - Sep 15, 2026
  {
    id: 'week_2026_09_15',
    weekStartDate: '2026-09-09',
    weekEndingDate: '2026-09-15',
    weekLabel: 'Pay Period: Sep 9 - Sep 15, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-09-09T07:00:00Z',
    updatedAt: '2026-09-15T18:00:00Z',
    isLocked: true,
    notes: 'Completed payroll cycle',
    rows: []
  },
  // Week 1: Sep 2 - Sep 8, 2026 (Initial Starting Week)
  {
    id: 'week_2026_09_08',
    weekStartDate: '2026-09-02',
    weekEndingDate: '2026-09-08',
    weekLabel: 'Pay Period: Sep 2 - Sep 8, 2026 (Starting Week)',
    defaultBurdenPct: 10.0,
    createdAt: '2026-09-02T07:00:00Z',
    updatedAt: '2026-09-08T18:00:00Z',
    isLocked: true,
    notes: 'Payroll starting period: Wednesday, Sep 2 through Tuesday, Sep 8, 2026',
    rows: []
  }
];


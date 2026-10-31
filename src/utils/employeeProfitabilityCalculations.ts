import { 
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

/**
 * Propagates the employee roster from Pay Period Sep 2 - Sep 8 across all other pay periods in the ledger,
 * completely replacing any sample placeholder employees (e.g. Marcus Vance, Jake Reynolds) with the user's
 * real entered staff.
 */
export function syncRosterFromSep2ToAllWeeks(
  weeksList: ProfitabilityWeek[],
  overrideMasterRows?: EmployeeProfitabilityRow[]
): ProfitabilityWeek[] {
  if (!Array.isArray(weeksList) || weeksList.length === 0) return weeksList;

  // Locate the Sep 2 - Sep 8 starting week
  const sep2Week = weeksList.find(w => 
    w.id === 'week_2026_09_08' || 
    w.weekStartDate === '2026-09-02' ||
    w.weekEndingDate === '2026-09-08' ||
    (w.weekLabel && w.weekLabel.toLowerCase().includes('sep 2'))
  ) || weeksList[weeksList.length - 1];

  let masterRows = overrideMasterRows;
  if (!masterRows || masterRows.length === 0) {
    if (sep2Week && Array.isArray(sep2Week.rows) && sep2Week.rows.length > 0) {
      masterRows = sep2Week.rows;
    }
  }

  if (!masterRows || masterRows.length === 0) return weeksList;

  return weeksList.map(w => {
    // If it's the Sep 2 week itself and no override was passed, preserve it exactly as the user entered
    if (sep2Week && w.id === sep2Week.id && !overrideMasterRows) {
      return w;
    }

    // For other weeks: keep strictly the employees from masterRows
    const updatedRows: EmployeeProfitabilityRow[] = masterRows!.map((m, index) => {
      const existing = w.rows.find(r => r.name.trim().toLowerCase() === m.name.trim().toLowerCase());
      if (existing) {
        return {
          ...existing,
          role: m.role || existing.role,
          payType: m.payType || existing.payType,
          payRate: m.payRate !== undefined ? m.payRate : existing.payRate,
          overtimeMultiplier: m.overtimeMultiplier || existing.overtimeMultiplier || 1.5,
          burdenType: m.burdenType || existing.burdenType || 'PERCENT',
          burdenValue: m.burdenValue !== undefined ? m.burdenValue : (existing.burdenValue || 10.0),
          notes: m.notes || existing.notes || ''
        };
      }

      return {
        id: `emp_${w.id}_${index}_${m.name.replace(/\s+/g, '_').toLowerCase()}`,
        name: m.name,
        role: m.role || 'Technician',
        payType: m.payType || 'FLAT_RATE',
        actualHours: m.actualHours !== undefined ? m.actualHours : 40.0,
        flaggedHours: m.flaggedHours !== undefined ? m.flaggedHours : (m.payType === 'FLAT_RATE' ? 40.0 : 0.0),
        payRate: m.payRate !== undefined ? m.payRate : 30.0,
        overtimeMultiplier: m.overtimeMultiplier || 1.5,
        laborSales: m.laborSales !== undefined ? m.laborSales : 0.0,
        grossProfit: 0.0,
        burdenType: m.burdenType || 'PERCENT',
        burdenValue: m.burdenValue !== undefined ? m.burdenValue : 10.0,
        notes: m.notes || ''
      };
    });

    return {
      ...w,
      updatedAt: new Date().toISOString(),
      rows: updatedRows
    };
  });
}

/**
 * Standard dealership employee roster template
 */
const BASE_ROSTER_ROWS: EmployeeProfitabilityRow[] = [
  {
    id: 'emp_row_1',
    name: 'Marcus Vance',
    role: 'Master Diagnostic Tech',
    payType: 'FLAT_RATE',
    actualHours: 40.0,
    flaggedHours: 54.0,
    payRate: 36.00,
    laborSales: 8100.00,
    grossProfit: 6156.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Heavy line & complex diagnostics',
  },
  {
    id: 'emp_row_2',
    name: 'Jake Reynolds',
    role: 'A-Level Tech',
    payType: 'FLAT_RATE',
    actualHours: 40.0,
    flaggedHours: 48.0,
    payRate: 30.00,
    laborSales: 7200.00,
    grossProfit: 5760.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Transmissions, recalls & suspension work',
  },
  {
    id: 'emp_row_3',
    name: 'Bobby Henderson',
    role: 'B-Level Technician',
    payType: 'FLAT_RATE',
    actualHours: 39.0,
    flaggedHours: 41.5,
    payRate: 26.00,
    laborSales: 6225.00,
    grossProfit: 5146.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Brakes, scheduled services & water pumps',
  },
  {
    id: 'emp_row_4',
    name: 'Tyler Watson',
    role: 'Lube / Express Tech',
    payType: 'HOURLY',
    actualHours: 41.5,
    flaggedHours: 35.0,
    payRate: 19.00,
    overtimeMultiplier: 1.5,
    laborSales: 4200.00,
    grossProfit: 3397.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Quick service, MPIs & tire rotations',
  },
  {
    id: 'emp_row_5',
    name: 'Cody Miller',
    role: 'Senior Service Advisor',
    payType: 'SALARY',
    actualHours: 45.0,
    flaggedHours: 62.0,
    payRate: 1350.00,
    laborSales: 9300.00,
    grossProfit: 7950.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Lead advisor drive management & MPI upsells',
  },
  {
    id: 'emp_row_6',
    name: 'Sarah Jenkins',
    role: 'Service Advisor',
    payType: 'SALARY',
    actualHours: 42.0,
    flaggedHours: 50.0,
    payRate: 1100.00,
    laborSales: 7500.00,
    grossProfit: 6400.00,
    burdenType: 'PERCENT',
    burdenValue: 10.0,
    notes: 'Customer follow-up calls & repair quotes',
  },
];

/**
 * Dealership Payroll Weeks:
 * Weekly payroll cycles strictly run Wednesday through Tuesday,
 * starting Wednesday, September 2, 2026.
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
    rows: BASE_ROSTER_ROWS.map(r => ({
      ...r,
      id: `${r.id}_w9`,
    }))
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
    notes: 'Completed payroll • Strong flat rate technician efficiency',
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w8', actualHours: 40.0, flaggedHours: 56.5, laborSales: 8475.00, grossProfit: 6441.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w8', actualHours: 40.0, flaggedHours: 49.0, laborSales: 7350.00, grossProfit: 5880.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w8', actualHours: 38.5, flaggedHours: 42.0, laborSales: 6300.00, grossProfit: 5208.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w8', actualHours: 42.0, flaggedHours: 36.0, laborSales: 4320.00, grossProfit: 3503.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w8', actualHours: 45.0, flaggedHours: 64.0, laborSales: 9600.00, grossProfit: 8250.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w8', actualHours: 42.0, flaggedHours: 51.0, laborSales: 7650.00, grossProfit: 6550.00 },
    ]
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
    notes: 'Completed payroll • High diagnostic repair volume',
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w7', actualHours: 40.0, flaggedHours: 53.0, laborSales: 7950.00, grossProfit: 6042.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w7', actualHours: 40.0, flaggedHours: 47.5, laborSales: 7125.00, grossProfit: 5700.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w7', actualHours: 39.0, flaggedHours: 40.0, laborSales: 6000.00, grossProfit: 4960.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w7', actualHours: 40.0, flaggedHours: 34.0, laborSales: 4080.00, grossProfit: 3320.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w7', actualHours: 45.0, flaggedHours: 61.0, laborSales: 9150.00, grossProfit: 7800.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w7', actualHours: 41.5, flaggedHours: 49.0, laborSales: 7350.00, grossProfit: 6250.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w6', actualHours: 40.0, flaggedHours: 55.0, laborSales: 8250.00, grossProfit: 6270.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w6', actualHours: 40.0, flaggedHours: 48.0, laborSales: 7200.00, grossProfit: 5760.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w6', actualHours: 40.0, flaggedHours: 43.0, laborSales: 6450.00, grossProfit: 5332.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w6', actualHours: 41.0, flaggedHours: 35.5, laborSales: 4260.00, grossProfit: 3469.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w6', actualHours: 45.0, flaggedHours: 63.0, laborSales: 9450.00, grossProfit: 8100.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w6', actualHours: 42.0, flaggedHours: 50.0, laborSales: 7500.00, grossProfit: 6400.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w5', actualHours: 40.0, flaggedHours: 52.0, laborSales: 7800.00, grossProfit: 5928.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w5', actualHours: 40.0, flaggedHours: 46.0, laborSales: 6900.00, grossProfit: 5520.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w5', actualHours: 39.0, flaggedHours: 39.5, laborSales: 5925.00, grossProfit: 4898.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w5', actualHours: 40.0, flaggedHours: 33.0, laborSales: 3960.00, grossProfit: 3200.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w5', actualHours: 44.0, flaggedHours: 59.0, laborSales: 8850.00, grossProfit: 7500.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w5', actualHours: 42.0, flaggedHours: 48.0, laborSales: 7200.00, grossProfit: 6100.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w4', actualHours: 40.0, flaggedHours: 54.5, laborSales: 8175.00, grossProfit: 6213.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w4', actualHours: 40.0, flaggedHours: 48.5, laborSales: 7275.00, grossProfit: 5820.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w4', actualHours: 40.0, flaggedHours: 41.0, laborSales: 6150.00, grossProfit: 5084.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w4', actualHours: 42.0, flaggedHours: 35.0, laborSales: 4200.00, grossProfit: 3383.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w4', actualHours: 45.0, flaggedHours: 62.0, laborSales: 9300.00, grossProfit: 7950.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w4', actualHours: 42.0, flaggedHours: 49.0, laborSales: 7350.00, grossProfit: 6250.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w3', actualHours: 40.0, flaggedHours: 53.5, laborSales: 8025.00, grossProfit: 6099.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w3', actualHours: 40.0, flaggedHours: 47.0, laborSales: 7050.00, grossProfit: 5640.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w3', actualHours: 38.0, flaggedHours: 40.5, laborSales: 6075.00, grossProfit: 5022.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w3', actualHours: 40.0, flaggedHours: 34.0, laborSales: 4080.00, grossProfit: 3320.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w3', actualHours: 44.0, flaggedHours: 60.0, laborSales: 9000.00, grossProfit: 7650.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w3', actualHours: 42.0, flaggedHours: 48.0, laborSales: 7200.00, grossProfit: 6100.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w2', actualHours: 40.0, flaggedHours: 51.0, laborSales: 7650.00, grossProfit: 5814.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w2', actualHours: 40.0, flaggedHours: 45.0, laborSales: 6750.00, grossProfit: 5400.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w2', actualHours: 39.0, flaggedHours: 39.0, laborSales: 5850.00, grossProfit: 4836.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w2', actualHours: 40.0, flaggedHours: 33.0, laborSales: 3960.00, grossProfit: 3200.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w2', actualHours: 43.0, flaggedHours: 58.0, laborSales: 8700.00, grossProfit: 7350.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w2', actualHours: 41.0, flaggedHours: 47.0, laborSales: 7050.00, grossProfit: 5950.00 },
    ]
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
    rows: [
      { ...BASE_ROSTER_ROWS[0], id: 'emp_row_1_w1', actualHours: 40.0, flaggedHours: 52.5, laborSales: 7875.00, grossProfit: 5985.00 },
      { ...BASE_ROSTER_ROWS[1], id: 'emp_row_2_w1', actualHours: 40.0, flaggedHours: 46.0, laborSales: 6900.00, grossProfit: 5520.00 },
      { ...BASE_ROSTER_ROWS[2], id: 'emp_row_3_w1', actualHours: 40.0, flaggedHours: 39.0, laborSales: 5850.00, grossProfit: 4836.00 },
      { ...BASE_ROSTER_ROWS[3], id: 'emp_row_4_w1', actualHours: 42.0, flaggedHours: 34.0, laborSales: 4080.00, grossProfit: 3263.00 },
      { ...BASE_ROSTER_ROWS[4], id: 'emp_row_5_w1', actualHours: 45.0, flaggedHours: 60.0, laborSales: 9000.00, grossProfit: 7650.00 },
      { ...BASE_ROSTER_ROWS[5], id: 'emp_row_6_w1', actualHours: 42.0, flaggedHours: 48.0, laborSales: 7200.00, grossProfit: 6100.00 },
    ]
  }
];


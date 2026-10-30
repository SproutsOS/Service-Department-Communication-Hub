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

  // 4. Gross Profit ($): Direct user input (or fallback to laborSales - totalPay if unentered)
  let grossProfit = Number(row.grossProfit);
  if (isNaN(grossProfit) || row.grossProfit === undefined || row.grossProfit === null) {
    grossProfit = laborSales > 0 ? Math.max(0, laborSales - totalPay) : 0;
  }

  // Gross Profit % = (Gross Profit / Labor Sales) * 100
  const grossProfitPct = laborSales > 0 ? (grossProfit / laborSales) * 100 : 0;

  // 5. Burden / Overhead Cost:
  // Fixed $ or Percentage of Pay (defaults to defaultBurdenPct)
  const burdenType = row.burdenType || 'PERCENT';
  const burdenVal = Number(row.burdenValue ?? defaultBurdenPct);
  const calculatedBurden = burdenType === 'FIXED' 
    ? burdenVal 
    : (totalPay * (burdenVal / 100));

  // 6. Net Profit ($): Manual override if entered, or Gross Profit - calculatedBurden
  let netProfit: number;
  if (row.manualNetProfit !== undefined && row.manualNetProfit !== null && !isNaN(Number(row.manualNetProfit))) {
    netProfit = Number(row.manualNetProfit);
  } else {
    netProfit = grossProfit - calculatedBurden;
  }

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
    'Burden & Overhead ($)',
    'Net Profit ($)',
    'Net Profit %',
    'Effective Cost/Hr ($)',
    'Effective Rev/Hr ($)'
  ];

  const lines: string[] = [];
  lines.push(`"Employee Profitability Ledger - ${week.weekLabel}"`);
  lines.push(`"Week Ending: ${week.weekEndingDate} | Overhead Burden: ${week.defaultBurdenPct}%"`);
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
      `$${r.calculatedBurden.toFixed(2)}`,
      `$${r.netProfit.toFixed(2)}`,
      `${r.netProfitPct.toFixed(1)}%`,
      `$${r.effectiveCostPerHour.toFixed(2)}`,
      `$${r.effectiveRevenuePerHour.toFixed(2)}`
    ];
    lines.push(rowData.map(v => `"${v}"`).join(','));
  });

  lines.push('');
  lines.push([
    '"WEEK TOTALS / SUMMARY"',
    `"${computedRows.length} Employees"`,
    '""',
    `"${summary.totalActualHours.toFixed(1)}"`,
    `"${summary.totalFlaggedHours.toFixed(1)}"`,
    `"${summary.overallEfficiencyPct.toFixed(1)}%"`,
    '""',
    `"$${summary.totalPayroll.toFixed(2)}"`,
    `"$${summary.totalRevenue.toFixed(2)}"`,
    `"$${summary.totalGrossProfit.toFixed(2)}"`,
    `"${summary.overallGrossProfitPct.toFixed(1)}%"`,
    `"$${summary.totalBurden.toFixed(2)}"`,
    `"$${summary.totalNetProfit.toFixed(2)}"`,
    `"${summary.overallNetProfitPct.toFixed(1)}%"`,
    '""',
    `"$${summary.avgRevenuePerHour.toFixed(2)}"`
  ].join(','));

  return lines.join('\r\n');
}

/**
 * Starter benchmark weeks with realistic dealership staff:
 * Features Salary, Flat Rate, and Hourly employees
 */
export const DEFAULT_PROFITABILITY_WEEKS: ProfitabilityWeek[] = [
  {
    id: 'week_2026_10_24',
    weekEndingDate: '2026-10-24',
    weekLabel: 'Week Ending Oct 24, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-24T18:00:00Z',
    updatedAt: '2026-10-24T18:00:00Z',
    isLocked: false,
    notes: 'Standard pay period • Solid dealership shop efficiency at 116.8%',
    rows: [
      {
        id: 'emp_row_1',
        name: 'Marcus Vance',
        role: 'Master Diagnostic Tech',
        payType: 'FLAT_RATE',
        actualHours: 40.0,
        flaggedHours: 52.5,
        payRate: 36.00, // $36.00 / flagged hr (Pay = $1,890.00)
        laborSales: 7875.00,
        grossProfit: 5985.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Top flat-rate producer, diesel diagnostics & recall jobs',
      },
      {
        id: 'emp_row_2',
        name: 'Jake Reynolds',
        role: 'A-Level Tech',
        payType: 'FLAT_RATE',
        actualHours: 40.0,
        flaggedHours: 46.0,
        payRate: 30.00, // $30.00 / flagged hr (Pay = $1,380.00)
        laborSales: 6900.00,
        grossProfit: 5520.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Transmission replacements, front brakes & suspensions',
      },
      {
        id: 'emp_row_3',
        name: 'Bobby Henderson',
        role: 'B-Level Technician',
        payType: 'FLAT_RATE',
        actualHours: 40.0,
        flaggedHours: 39.0,
        payRate: 26.00, // $26.00 / flagged hr (Pay = $1,014.00)
        laborSales: 5850.00,
        grossProfit: 4836.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Brakes, steering linkage & cooling systems',
      },
      {
        id: 'emp_row_4',
        name: 'Tyler Watson',
        role: 'Lube / Express Tech',
        payType: 'HOURLY',
        actualHours: 42.0, // 40 reg + 2 OT (Pay = $817.00)
        flaggedHours: 34.0,
        payRate: 19.00,
        overtimeMultiplier: 1.5,
        laborSales: 4080.00,
        grossProfit: 3263.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Express oil changes, tire rotations & multi-point inspections',
      },
      {
        id: 'emp_row_5',
        name: 'Cody Miller',
        role: 'Senior Service Advisor',
        payType: 'SALARY',
        actualHours: 45.0,
        flaggedHours: 60.0,
        payRate: 1350.00, // $1,350.00 / week salary base
        laborSales: 9000.00,
        grossProfit: 7650.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Service desk drive management & customer follow-up cadence',
      },
      {
        id: 'emp_row_6',
        name: 'Sarah Jenkins',
        role: 'Service Advisor',
        payType: 'SALARY',
        actualHours: 42.0,
        flaggedHours: 48.0,
        payRate: 1100.00, // $1,100.00 / week salary base
        laborSales: 7200.00,
        grossProfit: 6100.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Recall appointment scheduling & internal recon tickets',
      },
    ]
  },
  {
    id: 'week_2026_10_31',
    weekEndingDate: '2026-10-31',
    weekLabel: 'Week Ending Oct 31, 2026',
    defaultBurdenPct: 10.0,
    createdAt: '2026-10-31T18:00:00Z',
    updatedAt: '2026-10-31T18:00:00Z',
    isLocked: false,
    notes: 'Heavy transmission week • Outstanding gross margins',
    rows: [
      {
        id: 'emp_row_1',
        name: 'Marcus Vance',
        role: 'Master Diagnostic Tech',
        payType: 'FLAT_RATE',
        actualHours: 40.0,
        flaggedHours: 58.0, // Produced 58 flagged hrs (Pay = $2,088.00)
        payRate: 36.00,
        laborSales: 8700.00,
        grossProfit: 6612.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Completed 2 EcoDiesel high-pressure pumps & wiring diagnosis',
      },
      {
        id: 'emp_row_2',
        name: 'Jake Reynolds',
        role: 'A-Level Tech',
        payType: 'FLAT_RATE',
        actualHours: 40.0,
        flaggedHours: 49.5, // Produced 49.5 hrs (Pay = $1,485.00)
        payRate: 30.00,
        laborSales: 7425.00,
        grossProfit: 5940.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Completed warranty engine tear-down and intake heater relay updates',
      },
      {
        id: 'emp_row_3',
        name: 'Bobby Henderson',
        role: 'B-Level Technician',
        payType: 'FLAT_RATE',
        actualHours: 38.0,
        flaggedHours: 42.0, // Produced 42 hrs (Pay = $1,092.00)
        payRate: 26.00,
        laborSales: 6300.00,
        grossProfit: 5208.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Finished brake jobs & 30k interval services',
      },
      {
        id: 'emp_row_4',
        name: 'Tyler Watson',
        role: 'Lube / Express Tech',
        payType: 'HOURLY',
        actualHours: 40.0,
        flaggedHours: 36.0,
        payRate: 19.00, // Pay = $760.00
        overtimeMultiplier: 1.5,
        laborSales: 4320.00,
        grossProfit: 3560.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Express oil changes & battery replacements',
      },
      {
        id: 'emp_row_5',
        name: 'Cody Miller',
        role: 'Senior Service Advisor',
        payType: 'SALARY',
        actualHours: 45.0,
        flaggedHours: 65.0,
        payRate: 1350.00,
        laborSales: 9750.00,
        grossProfit: 8400.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Record tire and brake upsell volume',
      },
      {
        id: 'emp_row_6',
        name: 'Sarah Jenkins',
        role: 'Service Advisor',
        payType: 'SALARY',
        actualHours: 43.0,
        flaggedHours: 52.0,
        payRate: 1100.00,
        laborSales: 7800.00,
        grossProfit: 6700.00,
        burdenType: 'PERCENT',
        burdenValue: 10.0,
        notes: 'Customer follow-up cadence calls completed on schedule',
      },
    ]
  }
];

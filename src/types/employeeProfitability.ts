export type EmployeePayType = 'SALARY' | 'FLAT_RATE' | 'HOURLY';

export interface EmployeeProfitabilityRow {
  id: string;
  name: string;
  role: string;
  payType: EmployeePayType;
  actualHours: number; // Clocked attendance hours (e.g., 40.0)
  flaggedHours: number; // Flat-rate / billable hours produced (e.g., 52.5)
  payRate: number; // $/hr for Hourly/Flat-rate, or Weekly Fixed $ for Salary
  laborSales: number; // Direct user input: Labor Sales in dollars (e.g. 5200.00)
  grossProfit: number; // Direct user input: Gross Profit in dollars (e.g. 3850.00)
  manualNetProfit?: number; // Optional user override for Net Profit in dollars
  overtimeMultiplier?: number; // Overtime rate for hourly over 40 hrs (default 1.5, or 1.0 for straight time)
  billedLaborRate?: number; // Kept optional for legacy saved data compatibility
  partsSales?: number; // Optional parts sales generated
  partsCost?: number; // Optional parts cost
  burdenType?: 'PERCENT' | 'FIXED'; // Burden/overhead: percentage of wage or fixed dollar amount
  burdenValue?: number; // e.g., 10 (for 10% taxes/benefits) or 150 (for $150 stall overhead)
  notes?: string;
}

export interface ComputedEmployeeRow extends EmployeeProfitabilityRow {
  efficiencyPct: number; // (flaggedHours / actualHours) * 100
  totalPay: number; // Calculated payroll cost
  laborRevenue: number; // Same as laborSales
  totalRevenue: number; // Labor sales + parts sales
  grossProfit: number; // User entered gross profit (or auto-calc if blank)
  grossProfitPct: number; // (grossProfit / laborSales) * 100
  calculatedBurden: number; // Burden/overhead cost in dollars
  netProfit: number; // Net profit in dollars (manual override or grossProfit - burden)
  netProfitPct: number; // (netProfit / laborSales) * 100
  effectiveCostPerHour: number; // totalPay / actualHours
  effectiveRevenuePerHour: number; // totalRevenue / actualHours
}

export interface ProfitabilityWeek {
  id: string;
  weekStartDate?: string; // YYYY-MM-DD (e.g. Wednesday 2026-09-02)
  weekEndingDate: string; // YYYY-MM-DD (e.g. Tuesday 2026-09-08)
  weekLabel: string; // e.g. "Pay Period: Sep 2 - Sep 8, 2026"
  defaultBilledRate?: number; // Optional legacy field
  defaultBurdenPct: number; // Default % overhead allocation (e.g., 10.0%)
  rows: EmployeeProfitabilityRow[];
  notes?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummaryTotals {
  weekId: string;
  weekStartDate?: string;
  weekEndingDate: string;
  weekLabel: string;
  employeeCount: number;
  totalActualHours: number;
  totalFlaggedHours: number;
  overallEfficiencyPct: number;
  totalPayroll: number;
  totalRevenue: number;
  totalGrossProfit: number;
  overallGrossProfitPct: number;
  totalBurden: number;
  totalNetProfit: number;
  overallNetProfitPct: number;
  avgPayRate: number;
  avgRevenuePerHour: number;
}

export interface RunningTotalsAccumulator {
  totalWeeksCount: number;
  totalActualHours: number;
  totalFlaggedHours: number;
  cumulativeEfficiencyPct: number;
  totalPayroll: number;
  totalRevenue: number;
  totalGrossProfit: number;
  cumulativeGrossProfitPct: number;
  totalBurden: number;
  totalNetProfit: number;
  cumulativeNetProfitPct: number;
  avgWeeklyRevenue: number;
  avgWeeklyGrossProfit: number;
  avgWeeklyNetProfit: number;
}

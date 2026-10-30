export type EmployeePayType = 'SALARY' | 'FLAT_RATE' | 'HOURLY';

export interface EmployeeProfitabilityRow {
  id: string;
  name: string;
  role: string;
  payType: EmployeePayType;
  actualHours: number; // Clocked attendance hours (e.g., 40.0)
  flaggedHours: number; // Flat-rate / billable hours produced (e.g., 52.5)
  payRate: number; // $/hr for Hourly/Flat-rate, or Weekly Fixed $ for Salary
  overtimeMultiplier?: number; // Overtime rate for hourly over 40 hrs (default 1.5, or 1.0 for straight time)
  billedLaborRate?: number; // Retail / effective customer billed rate (e.g., 150.00)
  manualLaborSales?: number | null; // Optional manual override for total labor sales produced
  partsSales?: number; // Optional parts sales generated (e.g. for Advisors)
  partsCost?: number; // Optional parts cost
  burdenType?: 'PERCENT' | 'FIXED'; // Burden/overhead: percentage of wage or fixed dollar amount
  burdenValue?: number; // e.g., 10 (for 10% taxes/benefits) or 150 (for $150 stall overhead)
  notes?: string;
}

export interface ComputedEmployeeRow extends EmployeeProfitabilityRow {
  efficiencyPct: number; // (flaggedHours / actualHours) * 100
  totalPay: number; // Calculated payroll cost
  laborRevenue: number; // Revenue from labor
  totalRevenue: number; // Labor + Parts revenue
  grossProfit: number; // totalRevenue - totalPay
  grossProfitPct: number; // (grossProfit / totalRevenue) * 100
  calculatedBurden: number; // Burden/overhead cost in dollars
  netProfit: number; // grossProfit - calculatedBurden
  netProfitPct: number; // (netProfit / totalRevenue) * 100
  effectiveCostPerHour: number; // totalPay / actualHours
  effectiveRevenuePerHour: number; // totalRevenue / actualHours
}

export interface ProfitabilityWeek {
  id: string;
  weekEndingDate: string; // YYYY-MM-DD
  weekLabel: string; // e.g. "Week Ending Oct 30, 2026"
  defaultBilledRate: number; // Default $/hr for this week (e.g., 150.00)
  defaultBurdenPct: number; // Default % overhead allocation (e.g., 10.0%)
  rows: EmployeeProfitabilityRow[];
  notes?: string;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummaryTotals {
  weekId: string;
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

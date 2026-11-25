export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  roCount: number;
  actualHours?: number; // Clocked / attendance technician hours
  techHours: number; // Flagged / billed technician hours
  laborSales: number;
  partsSales: number;
  notes?: string;
  updatedAt?: string;
}

export interface DailySalesTotals {
  date: string;
  roCount: number;
  actualHours: number;
  techHours: number; // Flag hours
  efficiencyPct: number; // (techHours / actualHours) * 100
  laborSales: number;
  partsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  effectiveLaborRate: number; // laborSales / flagHours
  hoursPerRO: number; // flagHours / roCount
  laborPct: number;
  partsPct: number;
}

export interface WedTueWeekSalesSummary {
  weekId: string;
  weekStartDate: string;
  weekEndingDate: string;
  weekLabel: string;
  daysCount: number;
  totalROCount: number;
  totalActualHours: number;
  totalTechHours: number; // Total Flag hours
  efficiencyPct: number;
  totalLaborSales: number;
  totalPartsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
  avgDailyActualHours: number;
  avgDailyTechHours: number;
  effectiveLaborRate: number;
  hoursPerRO: number;
  laborPct: number;
  partsPct: number;
}

export interface MonthlySalesSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  year: number;
  month: number;
  daysCount: number;
  totalROCount: number;
  totalActualHours: number;
  totalTechHours: number; // Total Flag hours
  efficiencyPct: number;
  totalLaborSales: number;
  totalPartsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
  avgDailyActualHours: number;
  avgDailyTechHours: number;
  effectiveLaborRate: number;
  hoursPerRO: number;
  laborPct: number;
  partsPct: number;
}

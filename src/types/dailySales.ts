export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  roCount: number;
  techHours: number;
  laborSales: number;
  partsSales: number;
  notes?: string;
  updatedAt?: string;
}

export interface DailySalesTotals {
  date: string;
  roCount: number;
  techHours: number;
  laborSales: number;
  partsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  effectiveLaborRate: number;
  hoursPerRO: number;
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
  totalTechHours: number;
  totalLaborSales: number;
  totalPartsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
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
  totalTechHours: number;
  totalLaborSales: number;
  totalPartsSales: number;
  totalSales: number; // Total Parts & Labor
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
  avgDailyTechHours: number;
  effectiveLaborRate: number;
  hoursPerRO: number;
  laborPct: number;
  partsPct: number;
}

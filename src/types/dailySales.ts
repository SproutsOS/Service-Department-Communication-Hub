export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  roCount: number;
  customerPaySales: number;
  warrantySales: number;
  internalSales: number;
  notes?: string;
  updatedAt?: string;
}

export interface DailySalesTotals {
  date: string;
  roCount: number;
  customerPaySales: number;
  warrantySales: number;
  internalSales: number;
  totalSales: number;
  avgSalesPerRO: number;
  customerPayPct: number;
  warrantyPct: number;
  internalPct: number;
}

export interface WedTueWeekSalesSummary {
  weekId: string;
  weekStartDate: string;
  weekEndingDate: string;
  weekLabel: string;
  daysCount: number;
  totalROCount: number;
  totalCustomerPaySales: number;
  totalWarrantySales: number;
  totalInternalSales: number;
  totalSales: number;
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
  customerPayPct: number;
  warrantyPct: number;
  internalPct: number;
}

export interface MonthlySalesSummary {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  year: number;
  month: number;
  daysCount: number;
  totalROCount: number;
  totalCustomerPaySales: number;
  totalWarrantySales: number;
  totalInternalSales: number;
  totalSales: number;
  avgSalesPerRO: number;
  avgDailySales: number;
  avgDailyROCount: number;
  customerPayPct: number;
  warrantyPct: number;
  internalPct: number;
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Printer,
  Calendar,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  Info
} from 'lucide-react';
import { ProfitabilityWeek, ComputedEmployeeRow } from '../types/employeeProfitability';
import { DailySalesRecord, DailySalesTotals } from '../types/dailySales';
import { computeEmployeeRow, computeWeekSummary } from '../utils/employeeProfitabilityCalculations';
import {
  computeDailyTotals,
  normalizeDailySalesRecord,
  shiftIsoDateByDays,
  parseIsoDateLocal,
  formatDateWithWeekday
} from '../utils/dailySalesCalculations';
import { subscribeToDailySales } from '../lib/firestoreSync';
import { formatCurrency } from '../utils/formatters';
import { printIsolatedDocument } from '../utils/printUtils';

const STORAGE_KEY_DAILY_SALES = 'dealership_daily_sales_records_v1';

export type AuditMetricKey = 'FLAG_HOURS' | 'ACTUAL_HOURS' | 'LABOR_SALES';
export type AuditGrouping = 'WEEKLY' | 'MONTHLY';

interface FlagHoursReconciliationReportProps {
  weeks: ProfitabilityWeek[];
}

interface DayAuditEntry {
  date: string;
  dayName: string;
  totals: DailySalesTotals;
  hasActivity: boolean;
}

interface WeekReconciliationRow {
  weekId: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  monthKey: string;
  monthLabel: string;
  employeeCount: number;
  employeeRows: ComputedEmployeeRow[];
  ledgerFlagHours: number;
  ledgerActualHours: number;
  ledgerLaborSales: number;
  trackerDaysWithData: number;
  trackerFlagHours: number;
  trackerActualHours: number;
  trackerLaborSales: number;
  trackerROCount: number;
  dailyBreakdown: DayAuditEntry[];
}

interface MonthlyReconciliationRow {
  monthKey: string;
  monthLabel: string;
  weekCount: number;
  weekRangeLabel: string;
  ledgerFlagHours: number;
  ledgerActualHours: number;
  ledgerLaborSales: number;
  trackerFlagHours: number;
  trackerActualHours: number;
  trackerLaborSales: number;
  trackerROCount: number;
  includedWeeks: WeekReconciliationRow[];
}

function loadDailySalesFromLocal(): DailySalesRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DAILY_SALES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(r => r && typeof r.date === 'string')
          .map(r => normalizeDailySalesRecord(r));
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function getMetricValues(
  row: {
    ledgerFlagHours: number;
    ledgerActualHours: number;
    ledgerLaborSales: number;
    trackerFlagHours: number;
    trackerActualHours: number;
    trackerLaborSales: number;
  },
  metric: AuditMetricKey
): { ledger: number; tracker: number } {
  if (metric === 'ACTUAL_HOURS') {
    return { ledger: row.ledgerActualHours, tracker: row.trackerActualHours };
  }
  if (metric === 'LABOR_SALES') {
    return { ledger: row.ledgerLaborSales, tracker: row.trackerLaborSales };
  }
  return { ledger: row.ledgerFlagHours, tracker: row.trackerFlagHours };
}

function formatMetricValue(val: number, metric: AuditMetricKey): string {
  if (metric === 'LABOR_SALES') return formatCurrency(val);
  return `${val.toFixed(2)} hrs`;
}

function formatSignedMetricDiff(diff: number, metric: AuditMetricKey): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const abs = Math.abs(diff);
  if (metric === 'LABOR_SALES') return `${sign}${formatCurrency(abs)}`;
  return `${sign}${abs.toFixed(2)} hrs`;
}

function getReconciliationStatus(
  ledger: number,
  tracker: number,
  metric: AuditMetricKey
): {
  code: 'MATCHED' | 'LEDGER_HIGHER' | 'TRACKER_HIGHER' | 'NO_DATA' | 'NO_TRACKER' | 'NO_LEDGER';
  label: string;
  badgeClass: string;
} {
  const tolerance = metric === 'LABOR_SALES' ? 1.0 : 0.1;
  const diff = ledger - tracker;

  if (ledger <= 0 && tracker <= 0) {
    return {
      code: 'NO_DATA',
      label: 'No Entries Yet',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    };
  }
  if (ledger > 0 && tracker <= 0) {
    return {
      code: 'NO_TRACKER',
      label: 'Missing in Tracker',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    };
  }
  if (ledger <= 0 && tracker > 0) {
    return {
      code: 'NO_LEDGER',
      label: 'Missing in Ledger',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    };
  }
  if (Math.abs(diff) <= tolerance) {
    return {
      code: 'MATCHED',
      label: 'Matched',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  }
  if (diff > 0) {
    return {
      code: 'LEDGER_HIGHER',
      label: 'Ledger Higher',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  }
  return {
    code: 'TRACKER_HIGHER',
    label: 'Tracker Higher',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };
}

export const FlagHoursReconciliationReport: React.FC<FlagHoursReconciliationReportProps> = ({
  weeks
}) => {
  const [dailyRecords, setDailyRecords] = useState<DailySalesRecord[]>(() => loadDailySalesFromLocal());
  const [selectedMetric, setSelectedMetric] = useState<AuditMetricKey>('FLAG_HOURS');
  const [grouping, setGrouping] = useState<AuditGrouping>('WEEKLY');
  const [rangePreset, setRangePreset] = useState<'ALL' | '4W' | '8W' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  // Live Firestore subscription to Daily RO & Sales Tracker so numbers stay synchronized in real time
  useEffect(() => {
    const unsubscribe = subscribeToDailySales((cloudRecords) => {
      if (cloudRecords && Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        setDailyRecords(
          cloudRecords
            .filter(r => r && typeof r.date === 'string')
            .map(r => normalizeDailySalesRecord(r))
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // Build map of Daily Sales records by YYYY-MM-DD
  const dailyMap = useMemo(() => {
    const map = new Map<string, DailySalesRecord>();
    dailyRecords.forEach(r => {
      if (r?.date) map.set(r.date, r);
    });
    return map;
  }, [dailyRecords]);

  // Build week-by-week reconciliation rows aligned on exact Wed–Tue payroll dates
  const allWeekRows: WeekReconciliationRow[] = useMemo(() => {
    const sortedWeeks = [...weeks].sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate));

    return sortedWeeks.map(w => {
      const endDate = w.weekEndingDate;
      const startDate = w.weekStartDate || shiftIsoDateByDays(endDate, -6);

      const summary = computeWeekSummary(w);
      const employeeRows = (w.rows || []).map(r => computeEmployeeRow(r, w.defaultBurdenPct));

      const dailyBreakdown: DayAuditEntry[] = [];
      let trackerDaysWithData = 0;
      let trackerFlagHours = 0;
      let trackerActualHours = 0;
      let trackerLaborSales = 0;
      let trackerROCount = 0;

      for (let i = 0; i < 7; i += 1) {
        const dStr = shiftIsoDateByDays(startDate, i);
        const rec = dailyMap.get(dStr);
        const totals = computeDailyTotals(
          rec || { date: dStr, roCount: 0, actualHours: 0, techHours: 0, laborSales: 0, partsSales: 0 }
        );
        const hasActivity =
          totals.roCount > 0 ||
          totals.actualHours > 0 ||
          totals.techHours > 0 ||
          totals.laborSales > 0 ||
          totals.partsSales > 0;

        if (hasActivity) trackerDaysWithData += 1;
        trackerFlagHours += totals.techHours;
        trackerActualHours += totals.actualHours;
        trackerLaborSales += totals.laborSales;
        trackerROCount += totals.roCount;

        const dayName = parseIsoDateLocal(dStr).toLocaleDateString('en-US', { weekday: 'short' });
        dailyBreakdown.push({
          date: dStr,
          dayName,
          totals,
          hasActivity,
        });
      }

      const endParts = endDate.split('-').map(Number);
      const monthKey = endDate.slice(0, 7);
      const monthLabel = new Date(
        endParts[0] || 2026,
        (endParts[1] || 1) - 1,
        15
      ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        weekId: w.id,
        weekLabel: w.weekLabel,
        startDate,
        endDate,
        monthKey,
        monthLabel,
        employeeCount: employeeRows.length,
        employeeRows,
        ledgerFlagHours: summary.totalFlaggedHours,
        ledgerActualHours: summary.totalActualHours,
        ledgerLaborSales: summary.totalRevenue,
        trackerDaysWithData,
        trackerFlagHours,
        trackerActualHours,
        trackerLaborSales,
        trackerROCount,
        dailyBreakdown,
      };
    });
  }, [weeks, dailyMap]);

  // Apply range filter
  const filteredWeekRows = useMemo(() => {
    if (rangePreset === '4W') return allWeekRows.slice(0, 4);
    if (rangePreset === '8W') return allWeekRows.slice(0, 8);
    if (rangePreset === 'CUSTOM') {
      return allWeekRows.filter(row => {
        if (customStartDate && row.endDate < customStartDate) return false;
        if (customEndDate && row.startDate > customEndDate) return false;
        return true;
      });
    }
    return allWeekRows;
  }, [allWeekRows, rangePreset, customStartDate, customEndDate]);

  // Monthly rollups built strictly from the matched Wed–Tue weeks so both sides cover identical dates
  const monthlyRows: MonthlyReconciliationRow[] = useMemo(() => {
    const map = new Map<string, MonthlyReconciliationRow>();
    filteredWeekRows.forEach(w => {
      const existing = map.get(w.monthKey);
      if (existing) {
        existing.weekCount += 1;
        existing.ledgerFlagHours += w.ledgerFlagHours;
        existing.ledgerActualHours += w.ledgerActualHours;
        existing.ledgerLaborSales += w.ledgerLaborSales;
        existing.trackerFlagHours += w.trackerFlagHours;
        existing.trackerActualHours += w.trackerActualHours;
        existing.trackerLaborSales += w.trackerLaborSales;
        existing.trackerROCount += w.trackerROCount;
        existing.includedWeeks.push(w);
      } else {
        map.set(w.monthKey, {
          monthKey: w.monthKey,
          monthLabel: w.monthLabel,
          weekCount: 1,
          weekRangeLabel: '',
          ledgerFlagHours: w.ledgerFlagHours,
          ledgerActualHours: w.ledgerActualHours,
          ledgerLaborSales: w.ledgerLaborSales,
          trackerFlagHours: w.trackerFlagHours,
          trackerActualHours: w.trackerActualHours,
          trackerLaborSales: w.trackerLaborSales,
          trackerROCount: w.trackerROCount,
          includedWeeks: [w],
        });
      }
    });

    return Array.from(map.values())
      .map(m => {
        const sorted = [...m.includedWeeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
        const firstStart = sorted[0]?.startDate || '';
        const lastEnd = sorted[sorted.length - 1]?.endDate || '';
        return {
          ...m,
          weekRangeLabel: firstStart && lastEnd ? `${firstStart} to ${lastEnd}` : '',
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredWeekRows]);

  // Aggregate summary totals across filtered weeks
  const totals = useMemo(() => {
    let ledgerTotal = 0;
    let trackerTotal = 0;
    let matchedCount = 0;
    let varianceCount = 0;
    let activePeriodCount = 0;

    filteredWeekRows.forEach(w => {
      const { ledger, tracker } = getMetricValues(w, selectedMetric);
      ledgerTotal += ledger;
      trackerTotal += tracker;
      const status = getReconciliationStatus(ledger, tracker, selectedMetric);
      if (status.code !== 'NO_DATA') {
        activePeriodCount += 1;
        if (status.code === 'MATCHED') {
          matchedCount += 1;
        } else {
          varianceCount += 1;
        }
      }
    });

    const netDiff = ledgerTotal - trackerTotal;
    const base = Math.max(ledgerTotal, trackerTotal);
    const matchRatePct = base > 0 ? Math.max(0, (1 - Math.abs(netDiff) / base) * 100) : 100;
    const pctVariance = trackerTotal > 0 ? (netDiff / trackerTotal) * 100 : null;

    return {
      ledgerTotal,
      trackerTotal,
      netDiff,
      matchRatePct,
      pctVariance,
      matchedCount,
      varianceCount,
      activePeriodCount,
    };
  }, [filteredWeekRows, selectedMetric]);

  const metricTitle =
    selectedMetric === 'FLAG_HOURS'
      ? 'Flagged Hours'
      : selectedMetric === 'ACTUAL_HOURS'
      ? 'Actual Hours'
      : 'Labor Sales ($)';

  // CSV Export
  const handleExportCSV = () => {
    const lines: string[] = [];
    lines.push('"Flag Hours & Payroll Reconciliation Report — Profitability Ledger vs. Daily RO & Sales Tracker"');
    lines.push(`"Generated","${new Date().toLocaleDateString()}"`);
    lines.push('');
    lines.push(
      [
        'Pay Period',
        'Start Date',
        'End Date',
        'Ledger Flag Hrs',
        'Daily Tracker Flag Hrs',
        'Flag Hrs Diff (Ledger - Tracker)',
        'Flag Status',
        'Ledger Actual Hrs',
        'Daily Tracker Actual Hrs',
        'Actual Hrs Diff',
        'Ledger Labor Sales ($)',
        'Daily Tracker Labor Sales ($)',
        'Labor Sales Diff ($)'
      ]
        .map(h => `"${h}"`)
        .join(',')
    );

    filteredWeekRows.forEach(w => {
      const flagDiff = w.ledgerFlagHours - w.trackerFlagHours;
      const actualDiff = w.ledgerActualHours - w.trackerActualHours;
      const laborDiff = w.ledgerLaborSales - w.trackerLaborSales;
      const flagStatus = getReconciliationStatus(w.ledgerFlagHours, w.trackerFlagHours, 'FLAG_HOURS');
      lines.push(
        [
          w.weekLabel,
          w.startDate,
          w.endDate,
          w.ledgerFlagHours.toFixed(2),
          w.trackerFlagHours.toFixed(2),
          flagDiff.toFixed(2),
          flagStatus.label,
          w.ledgerActualHours.toFixed(2),
          w.trackerActualHours.toFixed(2),
          actualDiff.toFixed(2),
          `$${w.ledgerLaborSales.toFixed(2)}`,
          `$${w.trackerLaborSales.toFixed(2)}`,
          `$${laborDiff.toFixed(2)}`
        ]
          .map(v => `"${v}"`)
          .join(',')
      );
    });

    const csv = lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Flag_Hours_Reconciliation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    printIsolatedDocument(
      'flag-hours-reconciliation-printable-sheet',
      `Flag Hours Audit — Ledger vs Daily Tracker`
    );
  };

  return (
    <div className="space-y-5">

      {/* ===================================================================== */}
      {/* TOP HEADER & CONTROLS BAR                                              */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Flag Hours Audit — Profitability Ledger vs. Daily RO &amp; Sales Tracker
              </h2>
              <p className="text-[11px] text-slate-500">
                Reconciles every Wednesday–Tuesday pay period between technician payroll hours and daily billed RO entries in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Audit</span>
            </button>
          </div>
        </div>

        {/* Filter Row: Metric Toggle, Grouping Toggle, Range Presets */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Metric Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Compare:
            </span>
            <div className="bg-slate-100 p-0.5 rounded-lg inline-flex border border-slate-200">
              {([
                { id: 'FLAG_HOURS', label: 'Flagged Hours', icon: <Clock className="w-3 h-3" /> },
                { id: 'ACTUAL_HOURS', label: 'Actual Hours', icon: <Clock className="w-3 h-3" /> },
                { id: 'LABOR_SALES', label: 'Labor Sales ($)', icon: <DollarSign className="w-3 h-3" /> },
              ] as const).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMetric(m.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all inline-flex items-center gap-1 ${
                    selectedMetric === m.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grouping & Date Range */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-slate-100 p-0.5 rounded-lg inline-flex border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setGrouping('WEEKLY');
                  setExpandedRowKey(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  grouping === 'WEEKLY'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Pay Week (Wed–Tue)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGrouping('MONTHLY');
                  setExpandedRowKey(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                  grouping === 'MONTHLY'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Rollup
              </button>
            </div>

            <div className="flex items-center gap-1">
              {([
                { id: 'ALL', label: `All (${allWeekRows.length}w)` },
                { id: '4W', label: 'Last 4 Wks' },
                { id: '8W', label: 'Last 8 Wks' },
                { id: 'CUSTOM', label: 'Date Range' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRangePreset(p.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                    rangePreset === p.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {rangePreset === 'CUSTOM' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <label className="font-bold text-slate-600">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900"
            />
            <label className="font-bold text-slate-600 ml-1">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900"
            />
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 4 SUMMARY RECONCILIATION KPI CARDS                                     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Profitability Ledger Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Profitability Ledger (Paid)</span>
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {formatMetricValue(totals.ledgerTotal, selectedMetric)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {metricTitle} across {filteredWeekRows.length} pay {filteredWeekRows.length === 1 ? 'period' : 'periods'}
          </span>
        </div>

        {/* 2. Daily RO & Sales Tracker Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Daily RO Tracker (Billed)</span>
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {formatMetricValue(totals.trackerTotal, selectedMetric)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Matching exact Wed–Tue dates from Daily Log
          </span>
        </div>

        {/* 3. Net Variance (Ledger - Tracker) */}
        <div
          className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 shadow-2xs ${
            Math.abs(totals.netDiff) <= (selectedMetric === 'LABOR_SALES' ? 1 : 0.1)
              ? 'border-l-emerald-500'
              : totals.netDiff > 0
              ? 'border-l-rose-600'
              : 'border-l-indigo-600'
          }`}
        >
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
            Net Variance (Ledger − Tracker)
          </span>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              Math.abs(totals.netDiff) <= (selectedMetric === 'LABOR_SALES' ? 1 : 0.1)
                ? 'text-emerald-700'
                : totals.netDiff > 0
                ? 'text-rose-700'
                : 'text-indigo-700'
            }`}
          >
            {formatSignedMetricDiff(totals.netDiff, selectedMetric)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {Math.abs(totals.netDiff) <= (selectedMetric === 'LABOR_SALES' ? 1 : 0.1)
              ? 'Balanced within tolerance'
              : totals.netDiff > 0
              ? 'Ledger exceeds Daily Tracker'
              : 'Daily Tracker exceeds Ledger'}
            {totals.pctVariance !== null && ` (${totals.pctVariance >= 0 ? '+' : ''}${totals.pctVariance.toFixed(1)}%)`}
          </span>
        </div>

        {/* 4. Reconciliation Match Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 block">
            Reconciliation Match Rate
          </span>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">
            {totals.matchRatePct.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {totals.matchedCount} matched • {totals.varianceCount} with variance ({totals.activePeriodCount} active wks)
          </span>
        </div>
      </div>

      {/* Helpful Interpretation Note */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-blue-950">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>How to read variance:</strong> A positive difference (<strong className="text-rose-700">+</strong>) means technicians were paid more {metricTitle.toLowerCase()} on the Profitability Ledger than were logged on the Daily RO Tracker (potential unbilled time or missing daily entries). Click any row below to inspect technician-by-technician vs. day-by-day numbers.
        </span>
      </div>

      {/* ===================================================================== */}
      {/* WEEKLY PAY PERIOD RECONCILIATION TABLE                                 */}
      {/* ===================================================================== */}
      {grouping === 'WEEKLY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Pay Period Reconciliation ({filteredWeekRows.length} Weeks • {metricTitle})
            </span>
            <span className="text-[11px] text-slate-500">
              Click any week row to expand Technician Breakdown vs. Daily Log Breakdown
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5">Pay Period (Wed–Tue)</th>
                  <th className="px-3 py-2.5 text-right text-blue-900">Ledger {metricTitle}</th>
                  <th className="px-3 py-2.5 text-right text-emerald-900">Daily Tracker {metricTitle}</th>
                  <th className="px-3 py-2.5 text-right">Difference (Ledger − Tracker)</th>
                  <th className="px-3 py-2.5 text-right">% Variance</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredWeekRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No pay periods found in this date range.
                    </td>
                  </tr>
                ) : (
                  filteredWeekRows.map(row => {
                    const { ledger, tracker } = getMetricValues(row, selectedMetric);
                    const diff = ledger - tracker;
                    const pct = tracker > 0 ? (diff / tracker) * 100 : null;
                    const status = getReconciliationStatus(ledger, tracker, selectedMetric);
                    const isExpanded = expandedRowKey === row.weekId;

                    return (
                      <React.Fragment key={row.weekId}>
                        <tr
                          onClick={() => setExpandedRowKey(isExpanded ? null : row.weekId)}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-3 text-slate-500">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-blue-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-black text-slate-900">{row.weekLabel}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {row.startDate} → {row.endDate} • {row.employeeCount} staff • {row.trackerDaysWithData}/7 active days in tracker
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-black text-blue-950 text-sm">
                            {formatMetricValue(ledger, selectedMetric)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-black text-emerald-900 text-sm">
                            {formatMetricValue(tracker, selectedMetric)}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-mono font-black text-sm ${
                              status.code === 'MATCHED' || status.code === 'NO_DATA'
                                ? 'text-emerald-700'
                                : diff > 0
                                ? 'text-rose-700'
                                : 'text-indigo-700'
                            }`}
                          >
                            {formatSignedMetricDiff(diff, selectedMetric)}
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-700">
                            {pct === null ? (
                              <span className="text-slate-400">--</span>
                            ) : (
                              <span>
                                {pct > 0 ? '+' : ''}
                                {pct.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${status.badgeClass}`}
                            >
                              {status.code === 'MATCHED' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : status.code !== 'NO_DATA' ? (
                                <AlertTriangle className="w-3 h-3" />
                              ) : null}
                              <span>{status.label}</span>
                            </span>
                          </td>
                        </tr>

                        {/* Expandable Side-by-Side Drill-Down */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={7} className="p-4 border-t border-slate-200">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                {/* Left Panel: Employee Profitability Ledger Tech Breakdown */}
                                <div className="bg-white rounded-xl border border-blue-200 overflow-hidden shadow-2xs">
                                  <div className="px-3.5 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                                      Profitability Ledger — By Employee ({row.employeeRows.length})
                                    </span>
                                    <span className="text-xs font-mono font-black text-blue-800">
                                      Flag: {row.ledgerFlagHours.toFixed(2)}h
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                                          <th className="px-3 py-2">Employee</th>
                                          <th className="px-2.5 py-2 text-right">Actual Hrs</th>
                                          <th className="px-2.5 py-2 text-right text-blue-900">Flag Hrs</th>
                                          <th className="px-3 py-2 text-right">Labor Sales</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {row.employeeRows.map(emp => (
                                          <tr key={emp.id} className="hover:bg-blue-50/30">
                                            <td className="px-3 py-1.5 font-bold text-slate-900">
                                              {emp.name}
                                              <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                                                {emp.payType.replace('_', ' ')}
                                              </span>
                                            </td>
                                            <td className="px-2.5 py-1.5 text-right font-mono text-slate-600">
                                              {emp.actualHours > 0 ? emp.actualHours.toFixed(2) : '—'}
                                            </td>
                                            <td className="px-2.5 py-1.5 text-right font-mono font-black text-blue-900">
                                              {emp.flaggedHours > 0 ? emp.flaggedHours.toFixed(2) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                                              {formatCurrency(emp.laborRevenue)}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr className="bg-blue-50/60 font-black border-t border-blue-200">
                                          <td className="px-3 py-2 text-blue-950 uppercase text-[11px]">Ledger Total</td>
                                          <td className="px-2.5 py-2 text-right font-mono text-slate-800">
                                            {row.ledgerActualHours.toFixed(2)}h
                                          </td>
                                          <td className="px-2.5 py-2 text-right font-mono text-blue-950">
                                            {row.ledgerFlagHours.toFixed(2)}h
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-900">
                                            {formatCurrency(row.ledgerLaborSales)}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Right Panel: Daily RO & Sales Tracker Day-by-Day Breakdown */}
                                <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                                  <div className="px-3.5 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                                      Daily RO Tracker — Day by Day ({row.startDate} to {row.endDate})
                                    </span>
                                    <span className="text-xs font-mono font-black text-emerald-800">
                                      Flag: {row.trackerFlagHours.toFixed(2)}h
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                                          <th className="px-3 py-2">Date</th>
                                          <th className="px-2 py-2 text-center">ROs</th>
                                          <th className="px-2.5 py-2 text-right">Actual Hrs</th>
                                          <th className="px-2.5 py-2 text-right text-emerald-900">Flag Hrs</th>
                                          <th className="px-3 py-2 text-right">Labor Sales</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {row.dailyBreakdown.map(day => (
                                          <tr
                                            key={day.date}
                                            className={day.hasActivity ? 'hover:bg-emerald-50/30' : 'text-slate-400 bg-slate-50/40'}
                                          >
                                            <td className="px-3 py-1.5 font-mono font-bold whitespace-nowrap">
                                              {formatDateWithWeekday(day.date)}
                                            </td>
                                            <td className="px-2 py-1.5 text-center font-mono">
                                              {day.totals.roCount > 0 ? day.totals.roCount : '—'}
                                            </td>
                                            <td className="px-2.5 py-1.5 text-right font-mono">
                                              {day.totals.actualHours > 0 ? day.totals.actualHours.toFixed(2) : '—'}
                                            </td>
                                            <td className="px-2.5 py-1.5 text-right font-mono font-black text-emerald-900">
                                              {day.totals.techHours > 0 ? day.totals.techHours.toFixed(2) : '—'}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono">
                                              {day.totals.laborSales > 0 ? formatCurrency(day.totals.laborSales) : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                        <tr className="bg-emerald-50/60 font-black border-t border-emerald-200">
                                          <td className="px-3 py-2 text-emerald-950 uppercase text-[11px]">Tracker Total</td>
                                          <td className="px-2 py-2 text-center font-mono text-purple-900">
                                            {row.trackerROCount}
                                          </td>
                                          <td className="px-2.5 py-2 text-right font-mono text-slate-800">
                                            {row.trackerActualHours.toFixed(2)}h
                                          </td>
                                          <td className="px-2.5 py-2 text-right font-mono text-emerald-950">
                                            {row.trackerFlagHours.toFixed(2)}h
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-900">
                                            {formatCurrency(row.trackerLaborSales)}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}

                {/* Grand Totals Footer */}
                {filteredWeekRows.length > 0 && (
                  <tr className="bg-slate-900 text-white font-black">
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 uppercase tracking-wider text-xs">
                      Grand Total ({filteredWeekRows.length} Pay Periods)
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-blue-300">
                      {formatMetricValue(totals.ledgerTotal, selectedMetric)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-emerald-300">
                      {formatMetricValue(totals.trackerTotal, selectedMetric)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-amber-300">
                      {formatSignedMetricDiff(totals.netDiff, selectedMetric)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-slate-300">
                      {totals.pctVariance !== null
                        ? `${totals.pctVariance > 0 ? '+' : ''}${totals.pctVariance.toFixed(1)}%`
                        : '--'}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-emerald-300">
                      {totals.matchRatePct.toFixed(1)}% Match
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MONTHLY ROLLUP RECONCILIATION TABLE                                    */}
      {/* ===================================================================== */}
      {grouping === 'MONTHLY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Monthly Reconciliation Rollup ({monthlyRows.length} Months • {metricTitle})
            </span>
            <span className="text-[11px] text-slate-500">
              Groups Wed–Tue pay periods by pay-period end month so both sides cover identical dates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-3 py-2.5">Month (Pay Periods Included)</th>
                  <th className="px-3 py-2.5 text-right text-blue-900">Ledger {metricTitle}</th>
                  <th className="px-3 py-2.5 text-right text-emerald-900">Daily Tracker {metricTitle}</th>
                  <th className="px-3 py-2.5 text-right">Difference</th>
                  <th className="px-3 py-2.5 text-right">% Variance</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {monthlyRows.map(m => {
                  const { ledger, tracker } = getMetricValues(m, selectedMetric);
                  const diff = ledger - tracker;
                  const pct = tracker > 0 ? (diff / tracker) * 100 : null;
                  const status = getReconciliationStatus(ledger, tracker, selectedMetric);
                  const isExpanded = expandedRowKey === m.monthKey;

                  return (
                    <React.Fragment key={m.monthKey}>
                      <tr
                        onClick={() => setExpandedRowKey(isExpanded ? null : m.monthKey)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3 py-3 text-slate-500">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-black text-slate-900">{m.monthLabel}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {m.weekCount} pay {m.weekCount === 1 ? 'week' : 'weeks'} ({m.weekRangeLabel})
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-black text-blue-950 text-sm">
                          {formatMetricValue(ledger, selectedMetric)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-black text-emerald-900 text-sm">
                          {formatMetricValue(tracker, selectedMetric)}
                        </td>
                        <td
                          className={`px-3 py-3 text-right font-mono font-black text-sm ${
                            status.code === 'MATCHED' || status.code === 'NO_DATA'
                              ? 'text-emerald-700'
                              : diff > 0
                              ? 'text-rose-700'
                              : 'text-indigo-700'
                          }`}
                        >
                          {formatSignedMetricDiff(diff, selectedMetric)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-700">
                          {pct === null ? '--' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${status.badgeClass}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={7} className="p-4 border-t border-slate-200">
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                                    <th className="px-3 py-2">Included Pay Period</th>
                                    <th className="px-3 py-2 text-right">Ledger</th>
                                    <th className="px-3 py-2 text-right">Daily Tracker</th>
                                    <th className="px-3 py-2 text-right">Difference</th>
                                    <th className="px-3 py-2 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {m.includedWeeks.map(w => {
                                    const vals = getMetricValues(w, selectedMetric);
                                    const wDiff = vals.ledger - vals.tracker;
                                    const wStatus = getReconciliationStatus(vals.ledger, vals.tracker, selectedMetric);
                                    return (
                                      <tr key={w.weekId}>
                                        <td className="px-3 py-2 font-bold text-slate-800">
                                          {w.weekLabel}{' '}
                                          <span className="font-mono text-[10px] text-slate-400">
                                            ({w.startDate} → {w.endDate})
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-blue-900">
                                          {formatMetricValue(vals.ledger, selectedMetric)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-900">
                                          {formatMetricValue(vals.tracker, selectedMetric)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-black">
                                          {formatSignedMetricDiff(wDiff, selectedMetric)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${wStatus.badgeClass}`}>
                                            {wStatus.label}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HIDDEN ISOLATED PRINTABLE SHEET                                        */}
      {/* ===================================================================== */}
      <div id="flag-hours-reconciliation-printable-sheet" className="hidden">
        <div className="p-6 space-y-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                {metricTitle} Reconciliation Report — Ledger vs. Daily RO Tracker
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Wednesday–Tuesday Payroll Cycle Audit • {filteredWeekRows.length} Pay Periods
              </p>
            </div>
            <div className="text-right text-xs">
              <div>Printed: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Ledger Total</span>
              <strong className="font-mono text-sm">{formatMetricValue(totals.ledgerTotal, selectedMetric)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Daily Tracker Total</span>
              <strong className="font-mono text-sm">{formatMetricValue(totals.trackerTotal, selectedMetric)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Variance</span>
              <strong className="font-mono text-sm">{formatSignedMetricDiff(totals.netDiff, selectedMetric)}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Match Rate</span>
              <strong className="font-mono text-sm">{totals.matchRatePct.toFixed(1)}%</strong>
            </div>
          </div>

          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
            <thead className="bg-slate-100 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-2">Pay Period (Wed–Tue)</th>
                <th className="p-2">Date Range</th>
                <th className="p-2 text-right">Ledger</th>
                <th className="p-2 text-right">Daily Tracker</th>
                <th className="p-2 text-right">Difference</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredWeekRows.map(w => {
                const { ledger, tracker } = getMetricValues(w, selectedMetric);
                const diff = ledger - tracker;
                const status = getReconciliationStatus(ledger, tracker, selectedMetric);
                return (
                  <tr key={w.weekId}>
                    <td className="p-2 font-bold">{w.weekLabel}</td>
                    <td className="p-2 font-mono">{w.startDate} to {w.endDate}</td>
                    <td className="p-2 text-right font-mono">{formatMetricValue(ledger, selectedMetric)}</td>
                    <td className="p-2 text-right font-mono">{formatMetricValue(tracker, selectedMetric)}</td>
                    <td className="p-2 text-right font-mono font-bold">{formatSignedMetricDiff(diff, selectedMetric)}</td>
                    <td className="p-2 text-center font-bold">{status.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

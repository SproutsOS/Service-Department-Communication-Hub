import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Maximize2,
  Minimize2,
  Calendar,
  Hash,
  Clock,
  DollarSign,
  Wrench,
  Layers
} from 'lucide-react';
import { DailySalesRecord } from '../types/dailySales';
import {
  computeDailyTotals,
  groupRecordsByWedTueWeeks,
  groupRecordsByMonth,
  DAILY_SALES_START_DATE
} from '../utils/dailySalesCalculations';
import { formatCurrency } from '../utils/formatters';

export type CategoryGraphKey =
  | 'RO_COUNT'
  | 'ACTUAL_HOURS'
  | 'TECH_HOURS'
  | 'EFFICIENCY_PCT'
  | 'LABOR_SALES'
  | 'PARTS_SALES'
  | 'TOTAL_PARTS_LABOR'
  | 'AVG_PER_RO';

export type GraphTimeframe = 'DAILY' | 'WEEKLY_WED_TUE' | 'MONTHLY';

interface GraphDataPoint {
  key: string;
  shortLabel: string;
  fullLabel: string;
  roCount: number;
  actualHours: number;
  techHours: number;
  efficiencyPct: number;
  laborSales: number;
  partsSales: number;
  totalSales: number;
  avgPerRO: number;
}

interface DailySalesCategoryGraphsProps {
  records: DailySalesRecord[];
  startDate: string;
  endDate: string;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  timeframe: GraphTimeframe;
  onChangeTimeframe: (tf: GraphTimeframe) => void;
  focusedCategory: CategoryGraphKey | null;
  onChangeFocusedCategory: (cat: CategoryGraphKey | null) => void;
  todayIso: string;
  variant?: 'embedded' | 'modal';
}

interface CategoryConfig {
  key: CategoryGraphKey;
  title: string;
  subtitle: string;
  stroke: string;
  fillStart: string;
  badgeClass: string;
  valueClass: string;
  icon: React.ReactNode;
  getValue: (pt: GraphDataPoint) => number;
  formatValue: (val: number) => string;
  formatShortAxis: (val: number) => string;
  computePeriodTotalOrAvg: (pts: GraphDataPoint[], totals: RangeSummary) => { label: string; value: string };
}

interface RangeSummary {
  totalROs: number;
  totalActualHours: number;
  totalTechHours: number;
  efficiencyPct: number;
  totalLabor: number;
  totalParts: number;
  totalSales: number;
  avgPerRO: number;
}

const formatIsoLocal = (d: Date): string => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
};

const parseIsoLocal = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 2025, (m || 1) - 1, d || 1);
};

const formatCompactCurrency = (val: number): string => {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(val)}`;
};

export const DailySalesCategoryGraphs: React.FC<DailySalesCategoryGraphsProps> = ({
  records,
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  timeframe,
  onChangeTimeframe,
  focusedCategory,
  onChangeFocusedCategory,
  todayIso,
  variant = 'embedded'
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const isDark = variant === 'modal';

  // Filter records to selected date range
  const filteredRecords = useMemo(() => {
    const start = startDate || DAILY_SALES_START_DATE;
    const end = endDate || todayIso;
    return records.filter(r => r.date >= start && r.date <= end);
  }, [records, startDate, endDate, todayIso]);

  // Build ordered chart data points for the active timeframe
  const dataPoints: GraphDataPoint[] = useMemo(() => {
    if (timeframe === 'DAILY') {
      return [...filteredRecords]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(r => {
          const c = computeDailyTotals(r);
          return {
            key: r.date,
            shortLabel: r.date.slice(5),
            fullLabel: r.date,
            roCount: c.roCount,
            actualHours: Math.round(c.actualHours * 10) / 10,
            techHours: Math.round(c.techHours * 10) / 10,
            efficiencyPct: Math.round(c.efficiencyPct * 10) / 10,
            laborSales: Math.round(c.laborSales * 100) / 100,
            partsSales: Math.round(c.partsSales * 100) / 100,
            totalSales: Math.round(c.totalSales * 100) / 100,
            avgPerRO: Math.round(c.avgSalesPerRO * 100) / 100,
          };
        });
    }

    if (timeframe === 'WEEKLY_WED_TUE') {
      const weeks = groupRecordsByWedTueWeeks(filteredRecords);
      return [...weeks]
        .sort((a, b) => a.weekEndingDate.localeCompare(b.weekEndingDate))
        .map(w => ({
          key: w.weekId,
          shortLabel: `${w.weekStartDate.slice(5)}–${w.weekEndingDate.slice(5)}`,
          fullLabel: w.weekLabel.replace('Pay Period: ', ''),
          roCount: w.totalROCount,
          actualHours: Math.round(w.totalActualHours * 10) / 10,
          techHours: Math.round(w.totalTechHours * 10) / 10,
          efficiencyPct: Math.round(w.efficiencyPct * 10) / 10,
          laborSales: Math.round(w.totalLaborSales * 100) / 100,
          partsSales: Math.round(w.totalPartsSales * 100) / 100,
          totalSales: Math.round(w.totalSales * 100) / 100,
          avgPerRO: Math.round(w.avgSalesPerRO * 100) / 100,
        }));
    }

    const months = groupRecordsByMonth(filteredRecords);
    return [...months]
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(m => ({
        key: m.monthKey,
        shortLabel: `${m.monthLabel.slice(0, 3)} '${String(m.year).slice(-2)}`,
        fullLabel: m.monthLabel,
        roCount: m.totalROCount,
        actualHours: Math.round(m.totalActualHours * 10) / 10,
        techHours: Math.round(m.totalTechHours * 10) / 10,
        efficiencyPct: Math.round(m.efficiencyPct * 10) / 10,
        laborSales: Math.round(m.totalLaborSales * 100) / 100,
        partsSales: Math.round(m.totalPartsSales * 100) / 100,
        totalSales: Math.round(m.totalSales * 100) / 100,
        avgPerRO: Math.round(m.avgSalesPerRO * 100) / 100,
      }));
  }, [filteredRecords, timeframe]);

  // Range summary across filtered records
  const rangeSummary: RangeSummary = useMemo(() => {
    let totalROs = 0;
    let totalActualHours = 0;
    let totalTechHours = 0;
    let totalLabor = 0;
    let totalParts = 0;

    filteredRecords.forEach(r => {
      const c = computeDailyTotals(r);
      totalROs += c.roCount;
      totalActualHours += c.actualHours;
      totalTechHours += c.techHours;
      totalLabor += c.laborSales;
      totalParts += c.partsSales;
    });

    const totalSales = totalLabor + totalParts;
    const avgPerRO = totalROs > 0 ? totalSales / totalROs : 0;
    const efficiencyPct = totalActualHours > 0 ? (totalTechHours / totalActualHours) * 100 : 0;

    return {
      totalROs,
      totalActualHours,
      totalTechHours,
      efficiencyPct,
      totalLabor,
      totalParts,
      totalSales,
      avgPerRO,
    };
  }, [filteredRecords]);

  // Preset Handlers
  const applyPreset = (preset: '7D' | '30D' | '90D' | 'MTD' | 'LAST_MONTH' | 'ALL') => {
    const today = parseIsoLocal(todayIso);
    let nextStart = DAILY_SALES_START_DATE;
    let nextEnd = todayIso;

    if (preset === '7D') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      nextStart = formatIsoLocal(d);
    } else if (preset === '30D') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      nextStart = formatIsoLocal(d);
    } else if (preset === '90D') {
      const d = new Date(today);
      d.setDate(d.getDate() - 89);
      nextStart = formatIsoLocal(d);
    } else if (preset === 'MTD') {
      nextStart = `${todayIso.slice(0, 7)}-01`;
    } else if (preset === 'LAST_MONTH') {
      const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      nextStart = formatIsoLocal(firstOfLastMonth);
      nextEnd = formatIsoLocal(lastOfLastMonth);
    } else if (preset === 'ALL') {
      nextStart = DAILY_SALES_START_DATE;
      nextEnd = todayIso;
    }

    if (nextStart < DAILY_SALES_START_DATE) nextStart = DAILY_SALES_START_DATE;
    if (nextEnd < nextStart) nextEnd = nextStart;

    onChangeStartDate(nextStart);
    onChangeEndDate(nextEnd);
    setHoveredIdx(null);
  };

  // Detect active preset highlight
  const activePreset = useMemo(() => {
    if (startDate === DAILY_SALES_START_DATE && endDate === todayIso) return 'ALL';
    if (endDate === todayIso) {
      const today = parseIsoLocal(todayIso);
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      if (startDate === formatIsoLocal(d7)) return '7D';

      const d30 = new Date(today);
      d30.setDate(d30.getDate() - 29);
      if (startDate === formatIsoLocal(d30)) return '30D';

      const d90 = new Date(today);
      d90.setDate(d90.getDate() - 89);
      if (startDate === formatIsoLocal(d90)) return '90D';

      if (startDate === `${todayIso.slice(0, 7)}-01`) return 'MTD';
    }
    const today = parseIsoLocal(todayIso);
    const firstLastMo = formatIsoLocal(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const endLastMo = formatIsoLocal(new Date(today.getFullYear(), today.getMonth(), 0));
    if (startDate === firstLastMo && endDate === endLastMo) return 'LAST_MONTH';
    return 'CUSTOM';
  }, [startDate, endDate, todayIso]);

  const categories: CategoryConfig[] = useMemo(() => [
    {
      key: 'RO_COUNT',
      title: '# of Repair Orders',
      subtitle: 'Ticket volume across selected date range',
      stroke: isDark ? '#c084fc' : '#9333ea',
      fillStart: isDark ? 'rgba(192,132,252,0.28)' : 'rgba(147,51,234,0.16)',
      badgeClass: isDark ? 'bg-purple-950 text-purple-300 border-purple-700/60' : 'bg-purple-50 text-purple-800 border-purple-200',
      valueClass: isDark ? 'text-purple-300' : 'text-purple-800',
      icon: <Hash className="w-4 h-4" />,
      getValue: (pt) => pt.roCount,
      formatValue: (v) => `${Math.round(v)} ROs`,
      formatShortAxis: (v) => `${Math.round(v)}`,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: `${totals.totalROs} ROs` }),
    },
    {
      key: 'ACTUAL_HOURS',
      title: 'Actual Hours',
      subtitle: 'Clocked / attendance technician hours',
      stroke: isDark ? '#94a3b8' : '#475569',
      fillStart: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(71,85,105,0.16)',
      badgeClass: isDark ? 'bg-slate-800 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-300',
      valueClass: isDark ? 'text-slate-200' : 'text-slate-800',
      icon: <Clock className="w-4 h-4" />,
      getValue: (pt) => pt.actualHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      formatShortAxis: (v) => `${v.toFixed(0)}h`,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: `${totals.totalActualHours.toFixed(1)} hrs` }),
    },
    {
      key: 'TECH_HOURS',
      title: 'Flag Hours',
      subtitle: 'Billed / turned flat-rate technician hours',
      stroke: isDark ? '#818cf8' : '#4f46e5',
      fillStart: isDark ? 'rgba(129,140,248,0.28)' : 'rgba(79,70,229,0.16)',
      badgeClass: isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60' : 'bg-indigo-50 text-indigo-800 border-indigo-200',
      valueClass: isDark ? 'text-indigo-300' : 'text-indigo-800',
      icon: <Clock className="w-4 h-4" />,
      getValue: (pt) => pt.techHours,
      formatValue: (v) => `${v.toFixed(1)} hrs`,
      formatShortAxis: (v) => `${v.toFixed(0)}h`,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: `${totals.totalTechHours.toFixed(1)} hrs` }),
    },
    {
      key: 'EFFICIENCY_PCT',
      title: 'Shop Efficiency %',
      subtitle: 'Flag Hours divided by Actual Hours',
      stroke: isDark ? '#38bdf8' : '#0284c7',
      fillStart: isDark ? 'rgba(56,189,248,0.28)' : 'rgba(2,132,199,0.16)',
      badgeClass: isDark ? 'bg-sky-950 text-sky-300 border-sky-700/60' : 'bg-sky-50 text-sky-800 border-sky-200',
      valueClass: isDark ? 'text-sky-300' : 'text-sky-800',
      icon: <TrendingUp className="w-4 h-4" />,
      getValue: (pt) => pt.efficiencyPct,
      formatValue: (v) => `${v.toFixed(1)}%`,
      formatShortAxis: (v) => `${Math.round(v)}%`,
      computePeriodTotalOrAvg: (_pts, totals) => ({
        label: 'Range Efficiency',
        value: totals.totalActualHours > 0 ? `${totals.efficiencyPct.toFixed(1)}%` : '--',
      }),
    },
    {
      key: 'LABOR_SALES',
      title: 'Total Labor Sales ($)',
      subtitle: 'Labor revenue trend',
      stroke: isDark ? '#60a5fa' : '#2563eb',
      fillStart: isDark ? 'rgba(96,165,250,0.28)' : 'rgba(37,99,235,0.16)',
      badgeClass: isDark ? 'bg-blue-950 text-blue-300 border-blue-700/60' : 'bg-blue-50 text-blue-800 border-blue-200',
      valueClass: isDark ? 'text-blue-300' : 'text-blue-800',
      icon: <Wrench className="w-4 h-4" />,
      getValue: (pt) => pt.laborSales,
      formatValue: (v) => formatCurrency(v),
      formatShortAxis: formatCompactCurrency,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: formatCurrency(totals.totalLabor) }),
    },
    {
      key: 'PARTS_SALES',
      title: 'Total Parts Sales ($)',
      subtitle: 'Parts revenue trend',
      stroke: isDark ? '#fbbf24' : '#d97706',
      fillStart: isDark ? 'rgba(251,191,36,0.28)' : 'rgba(217,119,6,0.16)',
      badgeClass: isDark ? 'bg-amber-950 text-amber-300 border-amber-700/60' : 'bg-amber-50 text-amber-800 border-amber-200',
      valueClass: isDark ? 'text-amber-300' : 'text-amber-800',
      icon: <Layers className="w-4 h-4" />,
      getValue: (pt) => pt.partsSales,
      formatValue: (v) => formatCurrency(v),
      formatShortAxis: formatCompactCurrency,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: formatCurrency(totals.totalParts) }),
    },
    {
      key: 'TOTAL_PARTS_LABOR',
      title: 'Total Parts & Labor ($)',
      subtitle: 'Combined Parts + Labor revenue',
      stroke: isDark ? '#34d399' : '#059669',
      fillStart: isDark ? 'rgba(52,211,153,0.30)' : 'rgba(5,150,105,0.18)',
      badgeClass: isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
      valueClass: isDark ? 'text-emerald-300' : 'text-emerald-700',
      icon: <DollarSign className="w-4 h-4" />,
      getValue: (pt) => pt.totalSales,
      formatValue: (v) => formatCurrency(v),
      formatShortAxis: formatCompactCurrency,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Total', value: formatCurrency(totals.totalSales) }),
    },
    {
      key: 'AVG_PER_RO',
      title: 'Average $ / RO',
      subtitle: 'Total Parts & Labor divided by # of ROs',
      stroke: isDark ? '#2dd4bf' : '#0d9488',
      fillStart: isDark ? 'rgba(45,212,191,0.28)' : 'rgba(13,148,136,0.16)',
      badgeClass: isDark ? 'bg-teal-950 text-teal-300 border-teal-700/60' : 'bg-teal-50 text-teal-800 border-teal-200',
      valueClass: isDark ? 'text-teal-300' : 'text-teal-800',
      icon: <TrendingUp className="w-4 h-4" />,
      getValue: (pt) => pt.avgPerRO,
      formatValue: (v) => formatCurrency(v),
      formatShortAxis: formatCompactCurrency,
      computePeriodTotalOrAvg: (_pts, totals) => ({ label: 'Range Avg', value: formatCurrency(totals.avgPerRO) }),
    },
  ], [isDark]);

  const visibleCategories = useMemo(() => {
    if (!focusedCategory) return categories;
    return categories.filter(c => c.key === focusedCategory);
  }, [categories, focusedCategory]);

  const activePoint = hoveredIdx !== null && dataPoints[hoveredIdx] ? dataPoints[hoveredIdx] : null;

  return (
    <div className="space-y-4">

      {/* Date Range + Timeframe Controls Bar */}
      <div
        className={`rounded-xl border p-3.5 space-y-3 ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-white'
            : 'bg-white border-slate-200 shadow-sm text-slate-900'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-black uppercase tracking-wider mr-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Range:</span>
            </span>
            {([
              { id: '7D', label: 'Last 7 Days' },
              { id: '30D', label: 'Last 30 Days' },
              { id: 'MTD', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
              { id: '90D', label: 'Last 90 Days' },
              { id: 'ALL', label: 'All (Sept 1, 2025+)' },
            ] as const).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  activePreset === p.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Grouping / Timeframe Toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Group By:
            </span>
            <div className={`p-0.5 rounded-lg inline-flex border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              {([
                { id: 'DAILY', label: 'Daily' },
                { id: 'WEEKLY_WED_TUE', label: 'Wed–Tue Weeks' },
                { id: 'MONTHLY', label: 'Monthly' },
              ] as const).map(tf => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => {
                    onChangeTimeframe(tf.id);
                    setHoveredIdx(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                    timeframe === tf.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Start / End Date Inputs + Active Hover Readout */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/20">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <label className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>From:</label>
            <input
              type="date"
              min={DAILY_SALES_START_DATE}
              max={endDate}
              value={startDate}
              onChange={(e) => {
                if (!e.target.value) return;
                const val = e.target.value < DAILY_SALES_START_DATE ? DAILY_SALES_START_DATE : e.target.value;
                onChangeStartDate(val);
                if (val > endDate) onChangeEndDate(val);
                setHoveredIdx(null);
              }}
              className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />

            <label className={`font-bold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>To:</label>
            <input
              type="date"
              min={startDate || DAILY_SALES_START_DATE}
              value={endDate}
              onChange={(e) => {
                if (!e.target.value) return;
                onChangeEndDate(e.target.value);
                if (e.target.value < startDate) onChangeStartDate(e.target.value);
                setHoveredIdx(null);
              }}
              className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />

            <span className={`text-[11px] font-mono ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ({filteredRecords.length} {filteredRecords.length === 1 ? 'day' : 'days'} • {dataPoints.length} {timeframe === 'DAILY' ? 'pts' : timeframe === 'WEEKLY_WED_TUE' ? 'wks' : 'mos'})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {focusedCategory && (
              <button
                type="button"
                onClick={() => onChangeFocusedCategory(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Show All 8 Category Graphs</span>
              </button>
            )}
            {activePoint ? (
              <div className={`px-3 py-1 rounded-lg border font-mono text-[11px] font-bold ${
                isDark ? 'bg-slate-900 border-slate-700 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                Inspecting: {activePoint.fullLabel} • {activePoint.roCount} ROs • Act {activePoint.actualHours.toFixed(1)}h / Flag {activePoint.techHours.toFixed(1)}h • {formatCurrency(activePoint.totalSales)}
              </div>
            ) : (
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hover over any graph to compare all categories on that date
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Empty State or Grid */}
      {dataPoints.length < 2 ? (
        <div
          className={`p-10 rounded-xl border text-center font-bold text-sm ${
            isDark
              ? 'bg-slate-950 border-slate-800 text-slate-400'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          Not enough data points in this date range ({startDate} to {endDate}) to draw line graphs. Try picking a wider date range or switching Group By to Daily.
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            focusedCategory ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
          }`}
        >
          {visibleCategories.map(cat => {
            const values = dataPoints.map(cat.getValue);
            const maxVal = Math.max(...values, 1);
            const avgVal = values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
            const summaryBadge = cat.computePeriodTotalOrAvg(dataPoints, rangeSummary);

            const isExpanded = focusedCategory === cat.key;
            const width = isExpanded ? 920 : 540;
            const height = isExpanded ? 290 : 210;
            const padLeft = 52;
            const padRight = 18;
            const padTop = 18;
            const padBottom = 30;
            const plotW = width - padLeft - padRight;
            const plotH = height - padTop - padBottom;

            const coords = dataPoints.map((pt, i) => {
              const x = padLeft + (i / (dataPoints.length - 1 || 1)) * plotW;
              const y = padTop + plotH - (cat.getValue(pt) / maxVal) * plotH;
              return { x, y, pt, val: cat.getValue(pt) };
            });

            const linePath = coords.reduce((acc, c, i) => `${acc}${i === 0 ? 'M' : ' L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`, '');
            const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;
            const avgY = padTop + plotH - (avgVal / maxVal) * plotH;

            const midPt = dataPoints[Math.floor((dataPoints.length - 1) / 2)];
            const hoveredCoord = hoveredIdx !== null && coords[hoveredIdx] ? coords[hoveredIdx] : null;
            const gradId = `grad_${variant}_${cat.key}`;

            const sliceWidth = plotW / Math.max(coords.length - 1, 1);

            return (
              <div
                key={cat.key}
                className={`rounded-xl border p-4 flex flex-col gap-2.5 transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`p-1.5 rounded-lg border ${cat.badgeClass}`}>
                        {cat.icon}
                      </span>
                      <div>
                        <h3 className={`text-sm font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {cat.title}
                        </h3>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cat.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {hoveredCoord ? hoveredCoord.pt.fullLabel : summaryBadge.label}
                      </span>
                      <span className={`text-sm sm:text-base font-black font-mono ${cat.valueClass}`}>
                        {hoveredCoord ? cat.formatValue(hoveredCoord.val) : summaryBadge.value}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onChangeFocusedCategory(isExpanded ? null : cat.key)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title={isExpanded ? 'Show all category graphs' : `Expand ${cat.title}`}
                    >
                      {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* SVG Graph */}
                <div className="w-full" onMouseLeave={() => setHoveredIdx(null)}>
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={cat.stroke} stopOpacity={isDark ? 0.28 : 0.2} />
                        <stop offset="100%" stopColor={cat.stroke} stopOpacity={0.01} />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid Lines + Y-axis labels */}
                    {[0, 0.5, 1].map((ratio, idx) => {
                      const y = padTop + plotH * (1 - ratio);
                      const labelVal = maxVal * ratio;
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={padLeft + plotW}
                            y2={y}
                            stroke={isDark ? '#1e293b' : '#e2e8f0'}
                            strokeWidth="1"
                          />
                          <text
                            x={padLeft - 6}
                            y={y + 3.5}
                            textAnchor="end"
                            fontSize="10"
                            fontFamily="monospace"
                            fill={isDark ? '#94a3b8' : '#64748b'}
                          >
                            {cat.formatShortAxis(labelVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Period Average Dashed Line */}
                    <line
                      x1={padLeft}
                      y1={avgY}
                      x2={padLeft + plotW}
                      y2={avgY}
                      stroke={cat.stroke}
                      strokeOpacity={0.55}
                      strokeWidth="1.25"
                      strokeDasharray="4,4"
                    />

                    {/* Soft Area Fill + Line */}
                    <path d={areaPath} fill={`url(#${gradId})`} />
                    <path
                      d={linePath}
                      fill="none"
                      stroke={cat.stroke}
                      strokeWidth={isExpanded ? 3 : 2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Show visible dots when density is reasonable */}
                    {coords.length <= 45 &&
                      coords.map((c, idx) => (
                        <circle
                          key={c.pt.key}
                          cx={c.x}
                          cy={c.y}
                          r={hoveredIdx === idx ? 5.5 : 3}
                          fill={cat.stroke}
                          stroke={isDark ? '#020617' : '#ffffff'}
                          strokeWidth="1.5"
                        />
                      ))}

                    {/* Crosshair & Active Point Dot when hovering */}
                    {hoveredCoord && (
                      <g>
                        <line
                          x1={hoveredCoord.x}
                          y1={padTop}
                          x2={hoveredCoord.x}
                          y2={padTop + plotH}
                          stroke={isDark ? '#64748b' : '#94a3b8'}
                          strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                        <circle
                          cx={hoveredCoord.x}
                          cy={hoveredCoord.y}
                          r="6"
                          fill={cat.stroke}
                          stroke={isDark ? '#020617' : '#ffffff'}
                          strokeWidth="2"
                        />
                      </g>
                    )}

                    {/* X-axis Start / Mid / End labels */}
                    <text
                      x={padLeft}
                      y={height - 8}
                      textAnchor="start"
                      fontSize="10"
                      fontFamily="monospace"
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {dataPoints[0].shortLabel}
                    </text>
                    {dataPoints.length >= 3 && midPt && (
                      <text
                        x={padLeft + plotW / 2}
                        y={height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fontFamily="monospace"
                        fill={isDark ? '#94a3b8' : '#64748b'}
                      >
                        {midPt.shortLabel}
                      </text>
                    )}
                    <text
                      x={padLeft + plotW}
                      y={height - 8}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="monospace"
                      fill={isDark ? '#94a3b8' : '#64748b'}
                    >
                      {dataPoints[dataPoints.length - 1].shortLabel}
                    </text>

                    {/* Full-height invisible hover columns so every point is easy to inspect */}
                    {coords.map((c, idx) => {
                      const colX = Math.max(padLeft, c.x - sliceWidth / 2);
                      const colW = Math.max(4, sliceWidth);
                      return (
                        <rect
                          key={`hit_${c.pt.key}`}
                          x={colX}
                          y={padTop}
                          width={colW}
                          height={plotH}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredIdx(idx)}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Card Footer Avg */}
                <div className={`flex items-center justify-between text-[11px] font-mono pt-1 border-t ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                  <span>
                    Avg / {timeframe === 'DAILY' ? 'Day' : timeframe === 'WEEKLY_WED_TUE' ? 'Week' : 'Month'}: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{cat.formatValue(avgVal)}</strong>
                  </span>
                  <span>
                    Peak: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{cat.formatValue(maxVal)}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

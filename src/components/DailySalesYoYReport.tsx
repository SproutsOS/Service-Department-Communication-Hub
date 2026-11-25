import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Hash,
  Info,
  Layers,
  Printer,
  Wrench,
  Minus
} from 'lucide-react';
import { DailySalesRecord } from '../types/dailySales';
import {
  DAILY_SALES_START_DATE,
  YoYDailyMatchMode,
  YoYWeekCycle,
  buildDailyYoYComparison,
  buildWeeklyYoYComparison,
  buildMonthlyYoYComparison,
  buildMonthlyYoYHistory,
  groupRecordsByMonth,
  shiftIsoDateByDays,
  formatDateWithWeekday
} from '../utils/dailySalesCalculations';
import { formatCurrency } from '../utils/formatters';
import { printIsolatedDocument } from '../utils/printUtils';

export type YoYReportMode = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface DailySalesYoYReportProps {
  records: DailySalesRecord[];
  todayIso: string;
}

interface MetricRowSpec {
  key: string;
  label: string;
  currentVal: number;
  priorVal: number;
  format: (v: number) => string;
  formatDelta: (delta: number) => string;
  highlight?: boolean;
  accentBarClass: string;
}

function calcPctChange(current: number, prior: number): number | null {
  if (prior <= 0) {
    if (current <= 0) return 0;
    return null; // Prior year was 0, current > 0 -> show "New" / "—"
  }
  return ((current - prior) / prior) * 100;
}

function formatSignedNumber(val: number, decimals = 0): string {
  const prefix = val > 0 ? '+' : val < 0 ? '−' : '';
  const abs = Math.abs(val);
  return `${prefix}${decimals > 0 ? abs.toFixed(decimals) : Math.round(abs).toLocaleString()}`;
}

function formatSignedCurrency(val: number): string {
  const prefix = val > 0 ? '+' : val < 0 ? '−' : '';
  return `${prefix}${formatCurrency(Math.abs(val))}`;
}

export const DailySalesYoYReport: React.FC<DailySalesYoYReportProps> = ({
  records,
  todayIso
}) => {
  const [mode, setMode] = useState<YoYReportMode>('DAILY');

  // Daily controls
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [dailyMatchMode, setDailyMatchMode] = useState<YoYDailyMatchMode>('SAME_WEEKDAY');

  // Weekly controls
  const [weeklyAnchorDate, setWeeklyAnchorDate] = useState<string>(todayIso);
  const [weekCycle, setWeekCycle] = useState<YoYWeekCycle>('WED_TUE');

  // Monthly controls
  const availableMonths = useMemo(() => groupRecordsByMonth(records), [records]);
  const currentMonthKey = todayIso.slice(0, 7);
  const todayDayNum = Number(todayIso.slice(8, 10)) || 1;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    () => availableMonths[0]?.monthKey || currentMonthKey
  );
  const [useMtdForCurrentMonth, setUseMtdForCurrentMonth] = useState<boolean>(true);

  const isViewingCurrentMonth = selectedMonthKey === currentMonthKey;

  // Compute active YoY comparison
  const comparison = useMemo(() => {
    if (mode === 'DAILY') {
      return buildDailyYoYComparison(records, selectedDate, dailyMatchMode);
    }
    if (mode === 'WEEKLY') {
      return buildWeeklyYoYComparison(records, weeklyAnchorDate, weekCycle);
    }
    return buildMonthlyYoYComparison(records, selectedMonthKey, {
      mtdCutoffDay: isViewingCurrentMonth && useMtdForCurrentMonth ? todayDayNum : null,
    });
  }, [
    mode,
    records,
    selectedDate,
    dailyMatchMode,
    weeklyAnchorDate,
    weekCycle,
    selectedMonthKey,
    isViewingCurrentMonth,
    useMtdForCurrentMonth,
    todayDayNum,
  ]);

  // Monthly history table for Monthly mode
  const monthlyHistory = useMemo(() => {
    return buildMonthlyYoYHistory(records, todayIso);
  }, [records, todayIso]);

  const { current, prior } = comparison;

  const metricRows: MetricRowSpec[] = useMemo(() => [
    {
      key: 'roCount',
      label: '# of Repair Orders',
      currentVal: current.roCount,
      priorVal: prior.roCount,
      format: (v) => `${Math.round(v).toLocaleString()} ROs`,
      formatDelta: (d) => `${formatSignedNumber(d, 0)} ROs`,
      accentBarClass: 'bg-purple-600',
    },
    {
      key: 'techHours',
      label: 'Tech Hours',
      currentVal: current.techHours,
      priorVal: prior.techHours,
      format: (v) => `${v.toFixed(1)} hrs`,
      formatDelta: (d) => `${formatSignedNumber(d, 1)} hrs`,
      accentBarClass: 'bg-indigo-600',
    },
    {
      key: 'laborSales',
      label: 'Total Labor Sales ($)',
      currentVal: current.laborSales,
      priorVal: prior.laborSales,
      format: formatCurrency,
      formatDelta: formatSignedCurrency,
      accentBarClass: 'bg-blue-600',
    },
    {
      key: 'partsSales',
      label: 'Total Parts Sales ($)',
      currentVal: current.partsSales,
      priorVal: prior.partsSales,
      format: formatCurrency,
      formatDelta: formatSignedCurrency,
      accentBarClass: 'bg-amber-500',
    },
    {
      key: 'totalSales',
      label: 'Total Parts & Labor ($)',
      currentVal: current.totalSales,
      priorVal: prior.totalSales,
      format: formatCurrency,
      formatDelta: formatSignedCurrency,
      highlight: true,
      accentBarClass: 'bg-emerald-600',
    },
    {
      key: 'avgSalesPerRO',
      label: 'Average $ / RO',
      currentVal: current.avgSalesPerRO,
      priorVal: prior.avgSalesPerRO,
      format: formatCurrency,
      formatDelta: formatSignedCurrency,
      accentBarClass: 'bg-teal-600',
    },
    {
      key: 'effectiveLaborRate',
      label: 'Effective Labor Rate ($/hr)',
      currentVal: current.effectiveLaborRate,
      priorVal: prior.effectiveLaborRate,
      format: (v) => `${formatCurrency(v)}/hr`,
      formatDelta: (d) => `${formatSignedCurrency(d)}/hr`,
      accentBarClass: 'bg-sky-600',
    },
    {
      key: 'hoursPerRO',
      label: 'Hours / RO',
      currentVal: current.hoursPerRO,
      priorVal: prior.hoursPerRO,
      format: (v) => `${v.toFixed(2)} hrs`,
      formatDelta: (d) => `${formatSignedNumber(d, 2)} hrs`,
      accentBarClass: 'bg-slate-600',
    },
  ], [current, prior]);

  // Step month helper
  const stepMonth = (delta: number) => {
    const [yr, mo] = selectedMonthKey.split('-').map(Number);
    const nextDate = new Date(yr || 2026, (mo || 1) - 1 + delta, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    if (nextKey < DAILY_SALES_START_DATE.slice(0, 7)) return;
    setSelectedMonthKey(nextKey);
  };

  // CSV Export for active YoY comparison
  const handleExportYoYCSV = () => {
    const lines: string[] = [];
    const modeLabel = mode === 'DAILY' ? 'Daily' : mode === 'WEEKLY' ? 'Weekly' : 'Monthly';
    lines.push(`"Year-over-Year (${modeLabel}) Sales & RO Comparison Report"`);
    lines.push(`"Current Period","${current.label} (${current.startDate} to ${current.endDate})"`);
    lines.push(`"Prior Year Period","${prior.label} (${prior.startDate} to ${prior.endDate})"`);
    lines.push('');
    lines.push(['Metric', 'This Year', 'Last Year', 'Difference', '% Change'].map(h => `"${h}"`).join(','));

    metricRows.forEach(row => {
      const delta = row.currentVal - row.priorVal;
      const pct = calcPctChange(row.currentVal, row.priorVal);
      const pctLabel = pct === null ? 'N/A' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
      lines.push(
        [row.label, row.format(row.currentVal), row.format(row.priorVal), row.formatDelta(delta), pctLabel]
          .map(v => `"${v}"`)
          .join(',')
      );
    });

    if (mode !== 'MONTHLY' && comparison.dayBreakdown.length > 0) {
      lines.push('');
      lines.push('"Day-by-Day Breakdown"');
      lines.push(
        ['Day', 'This Year Date', 'Last Year Date', 'TY ROs', 'LY ROs', 'TY Hrs', 'LY Hrs', 'TY Total ($)', 'LY Total ($)', 'Diff ($)', '% Change']
          .map(h => `"${h}"`)
          .join(',')
      );
      comparison.dayBreakdown.forEach(d => {
        const diff = d.current.totalSales - d.prior.totalSales;
        const pct = calcPctChange(d.current.totalSales, d.prior.totalSales);
        lines.push(
          [
            d.dayName,
            d.currentDate,
            d.priorDate,
            d.current.roCount,
            d.prior.roCount,
            d.current.techHours.toFixed(1),
            d.prior.techHours.toFixed(1),
            `$${d.current.totalSales.toFixed(2)}`,
            `$${d.prior.totalSales.toFixed(2)}`,
            formatSignedCurrency(diff),
            pct === null ? 'N/A' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
          ]
            .map(v => `"${v}"`)
            .join(',')
        );
      });
    }

    const csv = lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `YoY_${modeLabel}_Report_${current.startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintYoY = () => {
    const modeLabel = mode === 'DAILY' ? 'Daily' : mode === 'WEEKLY' ? 'Weekly' : 'Monthly';
    printIsolatedDocument('daily-sales-yoy-printable-sheet', `YoY ${modeLabel} Sales Comparison - ${current.label}`);
  };

  // Helper badge for % change
  const renderDeltaBadge = (currentVal: number, priorVal: number, compact = false) => {
    const delta = currentVal - priorVal;
    const pct = calcPctChange(currentVal, priorVal);
    if (pct === null) {
      return (
        <span className={`inline-flex items-center gap-0.5 rounded font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}>
          No LY Base
        </span>
      );
    }
    if (Math.abs(delta) < 0.005) {
      return (
        <span className={`inline-flex items-center gap-0.5 rounded font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}>
          <Minus className="w-3 h-3" />
          0.0%
        </span>
      );
    }
    const isUp = delta > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded font-mono font-black border ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
        } ${
          isUp
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : 'bg-rose-100 text-rose-800 border-rose-200'
        }`}
      >
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isUp ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    );
  };

  // Filtered breakdown rows for monthly (show only days with activity in either year, or all days if none)
  const monthlyActiveDays = useMemo(() => {
    if (mode !== 'MONTHLY') return [];
    const active = comparison.dayBreakdown.filter(d => d.currentHasData || d.priorHasData);
    return active;
  }, [mode, comparison.dayBreakdown]);

  // SVG Grouped Bar Chart data (Revenue Categories)
  const revenueBars = [
    { label: 'Labor Sales', cur: current.laborSales, pri: prior.laborSales },
    { label: 'Parts Sales', cur: current.partsSales, pri: prior.partsSales },
    { label: 'Total Parts & Labor', cur: current.totalSales, pri: prior.totalSales },
  ];
  const maxRevenueVal = Math.max(
    ...revenueBars.flatMap(b => [b.cur, b.pri]),
    1
  );

  // Month options (ensure selectedMonthKey is always in dropdown even if no entries yet)
  const monthDropdownOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableMonths.forEach(m => map.set(m.monthKey, m.monthLabel));
    if (!map.has(selectedMonthKey)) {
      const [yr, mo] = selectedMonthKey.split('-').map(Number);
      const label = new Date(yr || 2026, (mo || 1) - 1, 15).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      map.set(selectedMonthKey, label);
    }
    return Array.from(map.entries())
      .map(([monthKey, monthLabel]) => ({ monthKey, monthLabel }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [availableMonths, selectedMonthKey]);

  return (
    <div className="space-y-5">

      {/* ===================================================================== */}
      {/* TOP CONTROL BAR                                                        */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Year-over-Year (YoY) Comparison Report
              </h2>
              <p className="text-[11px] text-slate-500">
                Compare any Day, Week, or Month directly against the same period one year ago.
              </p>
            </div>
          </div>

          {/* Timeframe Switcher + Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-xl inline-flex border border-slate-200">
              {([
                { id: 'DAILY', label: 'Daily YoY' },
                { id: 'WEEKLY', label: 'Weekly YoY' },
                { id: 'MONTHLY', label: 'Monthly YoY' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportYoYCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintYoY}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Period Picker Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {mode === 'DAILY' && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const prev = shiftIsoDateByDays(selectedDate, -1);
                    if (prev >= DAILY_SALES_START_DATE) setSelectedDate(prev);
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="date"
                    min={DAILY_SALES_START_DATE}
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(shiftIsoDateByDays(selectedDate, 1))}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {selectedDate !== todayIso && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayIso)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Match Prior Year By:
                </span>
                <div className="bg-slate-100 p-0.5 rounded-lg inline-flex border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDailyMatchMode('SAME_WEEKDAY')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      dailyMatchMode === 'SAME_WEEKDAY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Same Day of Week (52 Wks Ago)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyMatchMode('CALENDAR_DATE')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      dailyMatchMode === 'CALENDAR_DATE'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Exact Calendar Date
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'WEEKLY' && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const prev = shiftIsoDateByDays(weeklyAnchorDate, -7);
                    if (prev >= DAILY_SALES_START_DATE) setWeeklyAnchorDate(prev);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Week</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Week Containing:</span>
                  <input
                    type="date"
                    min={DAILY_SALES_START_DATE}
                    value={weeklyAnchorDate}
                    onChange={(e) => e.target.value && setWeeklyAnchorDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyAnchorDate(shiftIsoDateByDays(weeklyAnchorDate, 7))}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Next Week</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                {weeklyAnchorDate !== todayIso && (
                  <button
                    type="button"
                    onClick={() => setWeeklyAnchorDate(todayIso)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    This Week
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Week Cycle:
                </span>
                <div className="bg-slate-100 p-0.5 rounded-lg inline-flex border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWeekCycle('WED_TUE')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      weekCycle === 'WED_TUE'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Wed–Tue Payroll Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekCycle('SUN_SAT')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      weekCycle === 'SUN_SAT'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sun–Sat Calendar Week
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'MONTHLY' && (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-900 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {monthDropdownOptions.map(opt => (
                    <option key={opt.monthKey} value={opt.monthKey}>
                      {opt.monthLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {selectedMonthKey !== currentMonthKey && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonthKey(currentMonthKey)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    Current Month
                  </button>
                )}
              </div>

              {isViewingCurrentMonth && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Pace Scope:
                  </span>
                  <div className="bg-slate-100 p-0.5 rounded-lg inline-flex border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setUseMtdForCurrentMonth(true)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                        useMtdForCurrentMonth
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Month-to-Date (Day 1–{todayDayNum})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseMtdForCurrentMonth(false)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                        !useMtdForCurrentMonth
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Full Month vs Full Month
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* PERIOD MATCH BANNER                                                    */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border-2 border-emerald-200 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              This Year • {current.subLabel}
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-1.5">
              {current.label}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {current.startDate === current.endDate
                ? current.startDate
                : `${current.startDate} to ${current.endDate}`}{' '}
              • {current.daysWithData} {current.daysWithData === 1 ? 'active day' : 'active days'} logged
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total P&amp;L</span>
            <span className="text-lg sm:text-xl font-black font-mono text-emerald-700">
              {formatCurrency(current.totalSales)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-slate-200 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
              Last Year • {prior.subLabel}
            </span>
            <div className="text-base sm:text-lg font-black text-slate-800 mt-1.5">
              {prior.label}
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              {prior.startDate === prior.endDate
                ? prior.startDate
                : `${prior.startDate} to ${prior.endDate}`}{' '}
              • {prior.daysWithData} {prior.daysWithData === 1 ? 'active day' : 'active days'} logged
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total P&amp;L</span>
            <span className="text-lg sm:text-xl font-black font-mono text-slate-700">
              {formatCurrency(prior.totalSales)}
            </span>
          </div>
        </div>
      </div>

      {comparison.priorStartsBeforeTracking && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Heads up:</strong> The prior-year comparison period ({prior.startDate}) falls before your tracker start date of <strong>September 1, 2025</strong>. Dates from <strong>September 1, 2026</strong> onward have full year-over-year history available.
          </span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5 CORE KPI VARIANCE CARDS                                              */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {
            title: 'Total Parts & Labor',
            icon: <DollarSign className="w-4 h-4 text-emerald-700" />,
            borderClass: 'border-l-emerald-600',
            cur: current.totalSales,
            pri: prior.totalSales,
            fmt: formatCurrency,
            fmtDelta: formatSignedCurrency,
          },
          {
            title: '# of Repair Orders',
            icon: <Hash className="w-4 h-4 text-purple-700" />,
            borderClass: 'border-l-purple-600',
            cur: current.roCount,
            pri: prior.roCount,
            fmt: (v: number) => `${Math.round(v).toLocaleString()}`,
            fmtDelta: (d: number) => `${formatSignedNumber(d, 0)} ROs`,
          },
          {
            title: 'Tech Hours',
            icon: <Clock className="w-4 h-4 text-indigo-700" />,
            borderClass: 'border-l-indigo-600',
            cur: current.techHours,
            pri: prior.techHours,
            fmt: (v: number) => `${v.toFixed(1)}h`,
            fmtDelta: (d: number) => `${formatSignedNumber(d, 1)}h`,
          },
          {
            title: 'Total Labor Sales',
            icon: <Wrench className="w-4 h-4 text-blue-700" />,
            borderClass: 'border-l-blue-600',
            cur: current.laborSales,
            pri: prior.laborSales,
            fmt: formatCurrency,
            fmtDelta: formatSignedCurrency,
          },
          {
            title: 'Total Parts Sales',
            icon: <Layers className="w-4 h-4 text-amber-700" />,
            borderClass: 'border-l-amber-500',
            cur: current.partsSales,
            pri: prior.partsSales,
            fmt: formatCurrency,
            fmtDelta: formatSignedCurrency,
          },
        ].map(card => {
          const diff = card.cur - card.pri;
          return (
            <div
              key={card.title}
              className={`bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 ${card.borderClass} shadow-2xs flex flex-col justify-between gap-2`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                  {card.icon}
                  <span>{card.title}</span>
                </span>
              </div>

              <div>
                <div className="text-xl font-black font-mono text-slate-900">
                  {card.fmt(card.cur)}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Last Yr: <strong className="text-slate-700">{card.fmt(card.pri)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                <span
                  className={`text-[11px] font-mono font-extrabold ${
                    diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'
                  }`}
                >
                  {card.fmtDelta(diff)}
                </span>
                {renderDeltaBadge(card.cur, card.pri, true)}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* SIDE-BY-SIDE METRICS TABLE + VISUAL BAR CHART                          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Full Metrics Comparison Table */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Side-by-Side Category Comparison
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {current.label} vs. {prior.label}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right text-emerald-800">This Year</th>
                  <th className="px-3 py-2.5 text-right text-slate-600">Last Year</th>
                  <th className="px-3 py-2.5 text-right">Difference</th>
                  <th className="px-3.5 py-2.5 text-right">% Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {metricRows.map(row => {
                  const diff = row.currentVal - row.priorVal;
                  return (
                    <tr
                      key={row.key}
                      className={
                        row.highlight
                          ? 'bg-emerald-50/70 font-black border-y border-emerald-200'
                          : 'hover:bg-slate-50/80 transition-colors'
                      }
                    >
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${row.accentBarClass}`} />
                          <span>{row.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                        {row.format(row.currentVal)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-600">
                        {row.format(row.priorVal)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-black ${
                          diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500'
                        }`}
                      >
                        {row.formatDelta(diff)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {renderDeltaBadge(row.currentVal, row.priorVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visual Grouped Bar Comparison Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Revenue Comparison Visual
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-600 mb-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
                This Year
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" />
                Last Year
              </span>
            </div>

            <div className="space-y-4">
              {revenueBars.map(item => {
                const curPct = Math.min(100, (item.cur / maxRevenueVal) * 100);
                const priPct = Math.min(100, (item.pri / maxRevenueVal) * 100);
                return (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-slate-800">{item.label}</span>
                      {renderDeltaBadge(item.cur, item.pri, true)}
                    </div>

                    {/* This Year Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-700 w-7">TY</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${curPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-black text-slate-900 w-20 text-right">
                          {formatCurrency(item.cur)}
                        </span>
                      </div>

                      {/* Last Year Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 w-7">LY</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-slate-400 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${priPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-slate-600 w-20 text-right">
                          {formatCurrency(item.pri)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume mini comparison */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/80">
              <span className="text-[10px] font-black uppercase text-purple-800 block">RO Volume</span>
              <div className="font-mono font-black text-slate-900 mt-0.5">
                {current.roCount} <span className="text-slate-400 font-normal">vs</span> {prior.roCount}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-[10px] font-black uppercase text-indigo-800 block">Tech Hours</span>
              <div className="font-mono font-black text-slate-900 mt-0.5">
                {current.techHours.toFixed(1)}h <span className="text-slate-400 font-normal">vs</span> {prior.techHours.toFixed(1)}h
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONTEXTUAL DETAIL BREAKDOWN                                            */}
      {/* ===================================================================== */}
      {mode === 'DAILY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              7-Day Rolling YoY Snapshot (Ending {formatDateWithWeekday(selectedDate)})
            </span>
            <span className="text-[11px] text-slate-500">
              Click any row to inspect that day
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2.5">This Year</th>
                  <th className="px-3 py-2.5">Last Year Match</th>
                  <th className="px-2.5 py-2.5 text-center">ROs (TY / LY)</th>
                  <th className="px-2.5 py-2.5 text-center">Hours (TY / LY)</th>
                  <th className="px-3 py-2.5 text-right">TY Total P&amp;L</th>
                  <th className="px-3 py-2.5 text-right">LY Total P&amp;L</th>
                  <th className="px-3 py-2.5 text-right">Variance</th>
                  <th className="px-3 py-2.5 text-right">% YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {comparison.dayBreakdown.map(row => {
                  const isSelected = row.currentDate === selectedDate;
                  const diff = row.current.totalSales - row.prior.totalSales;
                  return (
                    <tr
                      key={row.currentDate}
                      onClick={() => setSelectedDate(row.currentDate)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 font-bold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-slate-400 font-sans mr-1.5">{row.dayName}</span>
                        {row.currentDate}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateWithWeekday(row.priorDate)}
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-mono">
                        <strong className="text-purple-900">{row.current.roCount}</strong>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{row.prior.roCount}</span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-mono">
                        <strong className="text-indigo-900">{row.current.techHours.toFixed(1)}</strong>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{row.prior.techHours.toFixed(1)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                        {formatCurrency(row.current.totalSales)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(row.prior.totalSales)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-black ${
                          diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {formatSignedCurrency(diff)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {renderDeltaBadge(row.current.totalSales, row.prior.totalSales, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'WEEKLY' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Day-by-Day Weekly Breakdown ({current.label} vs. {prior.label})
            </span>
            <span className="text-[11px] text-slate-500">
              Each weekday aligned 1-to-1 against the exact same weekday 52 weeks earlier
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                  <th className="px-3 py-2.5">Weekday</th>
                  <th className="px-3 py-2.5">This Year</th>
                  <th className="px-3 py-2.5">Last Year</th>
                  <th className="px-2.5 py-2.5 text-center">ROs (TY / LY)</th>
                  <th className="px-2.5 py-2.5 text-center">Hours (TY / LY)</th>
                  <th className="px-3 py-2.5 text-right">TY Total P&amp;L</th>
                  <th className="px-3 py-2.5 text-right">LY Total P&amp;L</th>
                  <th className="px-3 py-2.5 text-right">Variance</th>
                  <th className="px-3 py-2.5 text-right">% YoY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {comparison.dayBreakdown.map(row => {
                  const diff = row.current.totalSales - row.prior.totalSales;
                  return (
                    <tr key={row.currentDate} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-3 py-2.5 font-black text-slate-900">{row.dayName}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-800 whitespace-nowrap">{row.currentDate}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{row.priorDate}</td>
                      <td className="px-2.5 py-2.5 text-center font-mono">
                        <strong className="text-purple-900">{row.current.roCount}</strong>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{row.prior.roCount}</span>
                      </td>
                      <td className="px-2.5 py-2.5 text-center font-mono">
                        <strong className="text-indigo-900">{row.current.techHours.toFixed(1)}</strong>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{row.prior.techHours.toFixed(1)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                        {formatCurrency(row.current.totalSales)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                        {formatCurrency(row.prior.totalSales)}
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-black ${
                          diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {formatSignedCurrency(diff)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {renderDeltaBadge(row.current.totalSales, row.prior.totalSales, true)}
                      </td>
                    </tr>
                  );
                })}
                {/* Weekly Total Footer Row */}
                <tr className="bg-emerald-50/80 border-t-2 border-emerald-200 font-black">
                  <td colSpan={3} className="px-3 py-2.5 uppercase tracking-wider text-emerald-950">
                    Week Total
                  </td>
                  <td className="px-2.5 py-2.5 text-center font-mono">
                    <span className="text-purple-900">{current.roCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-600">{prior.roCount}</span>
                  </td>
                  <td className="px-2.5 py-2.5 text-center font-mono">
                    <span className="text-indigo-900">{current.techHours.toFixed(1)}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-600">{prior.techHours.toFixed(1)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-900">
                    {formatCurrency(current.totalSales)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                    {formatCurrency(prior.totalSales)}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono ${
                      current.totalSales - prior.totalSales >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatSignedCurrency(current.totalSales - prior.totalSales)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {renderDeltaBadge(current.totalSales, prior.totalSales, true)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mode === 'MONTHLY' && (
        <div className="space-y-4">
          {/* Month-by-Month YoY History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                All Months Year-over-Year Overview
              </span>
              <span className="text-[11px] text-slate-500">
                Click any month row to load its detailed YoY breakdown above
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                    <th className="px-3.5 py-2.5">Month</th>
                    <th className="px-3 py-2.5 text-center">ROs (TY / LY)</th>
                    <th className="px-3 py-2.5 text-center">Tech Hrs (TY / LY)</th>
                    <th className="px-3 py-2.5 text-right">TY Total P&amp;L</th>
                    <th className="px-3 py-2.5 text-right">LY Total P&amp;L</th>
                    <th className="px-3 py-2.5 text-right">Variance</th>
                    <th className="px-3.5 py-2.5 text-right">% YoY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyHistory.map(row => {
                    const isSelected = row.monthKey === selectedMonthKey;
                    const diff = row.current.totalSales - row.prior.totalSales;
                    return (
                      <tr
                        key={row.monthKey}
                        onClick={() => setSelectedMonthKey(row.monthKey)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/80 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-black text-slate-900 whitespace-nowrap">
                          {row.monthLabel}
                          {row.monthKey === currentMonthKey && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              MTD
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <strong className="text-purple-900">{row.current.roCount}</strong>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{row.prior.roCount}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          <strong className="text-indigo-900">{row.current.techHours.toFixed(1)}</strong>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{row.prior.techHours.toFixed(1)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-black text-slate-900">
                          {formatCurrency(row.current.totalSales)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                          {formatCurrency(row.prior.totalSales)}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono font-black ${
                            diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'
                          }`}
                        >
                          {formatSignedCurrency(diff)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          {renderDeltaBadge(row.current.totalSales, row.prior.totalSales, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Days inside Selected Month */}
          {monthlyActiveDays.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Active Days in {current.label} vs. {prior.label} ({monthlyActiveDays.length} Days with Activity)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                      <th className="px-3 py-2.5">Day of Month</th>
                      <th className="px-2.5 py-2.5 text-center">ROs (TY / LY)</th>
                      <th className="px-2.5 py-2.5 text-center">Hours (TY / LY)</th>
                      <th className="px-3 py-2.5 text-right">TY Total P&amp;L</th>
                      <th className="px-3 py-2.5 text-right">LY Total P&amp;L</th>
                      <th className="px-3 py-2.5 text-right">Variance</th>
                      <th className="px-3 py-2.5 text-right">% YoY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {monthlyActiveDays.map(row => {
                      const diff = row.current.totalSales - row.prior.totalSales;
                      return (
                        <tr key={row.dayName} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">{row.dayName}</td>
                          <td className="px-2.5 py-2 text-center font-mono">
                            <strong className="text-purple-900">{row.current.roCount}</strong>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-600">{row.prior.roCount}</span>
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono">
                            <strong className="text-indigo-900">{row.current.techHours.toFixed(1)}</strong>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-600">{row.prior.techHours.toFixed(1)}</span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-black text-slate-900">
                            {formatCurrency(row.current.totalSales)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600">
                            {formatCurrency(row.prior.totalSales)}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono font-black ${
                              diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-400'
                            }`}
                          >
                            {formatSignedCurrency(diff)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {renderDeltaBadge(row.current.totalSales, row.prior.totalSales, true)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* HIDDEN ISOLATED PRINTABLE SHEET                                        */}
      {/* ===================================================================== */}
      <div id="daily-sales-yoy-printable-sheet" className="hidden">
        <div className="p-6 space-y-5 text-slate-900 font-sans">
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">
                Year-over-Year ({mode === 'DAILY' ? 'Daily' : mode === 'WEEKLY' ? 'Weekly' : 'Monthly'}) Sales &amp; RO Report
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {current.label} ({current.subLabel}) vs. {prior.label} ({prior.subLabel})
              </p>
            </div>
            <div className="text-right text-xs">
              <div>Printed: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
            <thead className="bg-slate-100 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">This Year</th>
                <th className="p-2 text-right">Last Year</th>
                <th className="p-2 text-right">Difference</th>
                <th className="p-2 text-right">% Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {metricRows.map(row => {
                const diff = row.currentVal - row.priorVal;
                const pct = calcPctChange(row.currentVal, row.priorVal);
                return (
                  <tr key={row.key} className={row.highlight ? 'bg-slate-100 font-bold' : ''}>
                    <td className="p-2 font-bold">{row.label}</td>
                    <td className="p-2 text-right font-mono">{row.format(row.currentVal)}</td>
                    <td className="p-2 text-right font-mono">{row.format(row.priorVal)}</td>
                    <td className="p-2 text-right font-mono">{row.formatDelta(diff)}</td>
                    <td className="p-2 text-right font-mono">
                      {pct === null ? 'N/A' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {mode === 'WEEKLY' && (
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase">Day-by-Day Weekly Breakdown</h2>
              <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
                <thead className="bg-slate-100 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-1.5">Day</th>
                    <th className="p-1.5">This Year</th>
                    <th className="p-1.5">Last Year</th>
                    <th className="p-1.5 text-center">ROs (TY/LY)</th>
                    <th className="p-1.5 text-center">Hrs (TY/LY)</th>
                    <th className="p-1.5 text-right">TY Total</th>
                    <th className="p-1.5 text-right">LY Total</th>
                    <th className="p-1.5 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparison.dayBreakdown.map(d => (
                    <tr key={d.currentDate}>
                      <td className="p-1.5 font-bold">{d.dayName}</td>
                      <td className="p-1.5 font-mono">{d.currentDate}</td>
                      <td className="p-1.5 font-mono">{d.priorDate}</td>
                      <td className="p-1.5 text-center font-mono">{d.current.roCount} / {d.prior.roCount}</td>
                      <td className="p-1.5 text-center font-mono">{d.current.techHours.toFixed(1)} / {d.prior.techHours.toFixed(1)}</td>
                      <td className="p-1.5 text-right font-mono">{formatCurrency(d.current.totalSales)}</td>
                      <td className="p-1.5 text-right font-mono">{formatCurrency(d.prior.totalSales)}</td>
                      <td className="p-1.5 text-right font-mono">{formatSignedCurrency(d.current.totalSales - d.prior.totalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

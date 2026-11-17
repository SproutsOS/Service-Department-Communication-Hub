import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Receipt, 
  ShieldCheck, 
  Wrench, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Sparkles, 
  X, 
  ArrowUpRight, 
  ArrowDownRight,
  Sliders,
  Award,
  Layers,
  FileSpreadsheet,
  Hash,
  Minus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DailySalesRecord, DailySalesTotals } from '../types/dailySales';
import { 
  computeDailyTotals, 
  groupRecordsByWedTueWeeks, 
  groupRecordsByCalendarWeeks,
  groupRecordsByMonth, 
  seedInitialDailyRecords, 
  ensureDailySalesRange,
  DAILY_SALES_START_DATE,
  calculateDailySalesFromROs,
  getWedTueWeekPeriodForDate,
  getSunSatWeekPeriodForDate
} from '../utils/dailySalesCalculations';
import { formatCurrency } from '../utils/formatters';
import { syncDailySalesToCloud, subscribeToDailySales } from '../lib/firestoreSync';

const STORAGE_KEY_DAILY_SALES = 'dealership_daily_sales_records_v1';

interface DailySalesTrackerBoardProps {
  onBackToDashboard?: () => void;
}

export const DailySalesTrackerBoard: React.FC<DailySalesTrackerBoardProps> = ({
  onBackToDashboard
}) => {
  const { repairOrders } = useApp();

  // Load records from persistent storage and ensure dates start Sept 1, 2025 to present
  const [records, setRecords] = useState<DailySalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_SALES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureDailySalesRange(parsed);
        }
      }
    } catch {
      // ignore
    }
    return seedInitialDailyRecords();
  });

  // Active view tab: 'DAILY' | 'WEEKLY_WED_TUE' | 'MONTHLY' | 'RO_COUNT'
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY_WED_TUE' | 'MONTHLY' | 'RO_COUNT'>('DAILY');
  const [roViewGrouping, setRoViewGrouping] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [roWeekCycle, setRoWeekCycle] = useState<'WED_TUE' | 'SUN_SAT'>('WED_TUE');

  const todayIso = useMemo(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  }, []);

  const [selectedRODate, setSelectedRODate] = useState<string>(todayIso);

  // Trend Graph Modal / View State
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [graphMetric, setGraphMetric] = useState<'AVG_PER_RO' | 'SALES_BREAKDOWN' | 'RO_COUNT'>('AVG_PER_RO');
  const [graphTimeframe, setGraphTimeframe] = useState<'DAILY' | 'WEEKLY_WED_TUE' | 'MONTHLY'>('DAILY');

  // Month filter for Daily Entry sheet
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // New Date Entry Modal state
  const [isAddDateModalOpen, setIsAddDateModalOpen] = useState(false);
  const [newDateInput, setNewDateInput] = useState(() => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
  });

  const focusedInputsRef = useRef<number>(0);
  const pendingCloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingCloudWriteRef = useRef<boolean>(false);
  const inFlightCloudSyncRef = useRef<number>(0);
  const lastLocalEditAtRef = useRef<number>(0);
  const latestRecordsRef = useRef<DailySalesRecord[]>(records);

  useEffect(() => {
    latestRecordsRef.current = records;
  }, [records]);

  const flushCloudSync = useCallback(() => {
    if (pendingCloudTimerRef.current) {
      clearTimeout(pendingCloudTimerRef.current);
      pendingCloudTimerRef.current = null;
    }
    if (!hasPendingCloudWriteRef.current) return;
    hasPendingCloudWriteRef.current = false;

    inFlightCloudSyncRef.current += 1;
    lastLocalEditAtRef.current = Date.now();
    Promise.resolve(syncDailySalesToCloud(latestRecordsRef.current)).finally(() => {
      inFlightCloudSyncRef.current = Math.max(0, inFlightCloudSyncRef.current - 1);
      lastLocalEditAtRef.current = Date.now();
    });
  }, []);

  useEffect(() => {
    return () => {
      flushCloudSync();
    };
  }, [flushCloudSync]);

  // Save records helper (debounced by default during typing; immediate for buttons)
  const saveRecords = useCallback(
    (updated: DailySalesRecord[], options?: { immediate?: boolean }) => {
      const sorted = [...updated].sort((a, b) => b.date.localeCompare(a.date));
      latestRecordsRef.current = sorted;
      setRecords(sorted);
      try {
        localStorage.setItem(STORAGE_KEY_DAILY_SALES, JSON.stringify(sorted));
      } catch {
        // ignore
      }

      hasPendingCloudWriteRef.current = true;
      lastLocalEditAtRef.current = Date.now();

      if (pendingCloudTimerRef.current) {
        clearTimeout(pendingCloudTimerRef.current);
        pendingCloudTimerRef.current = null;
      }

      if (options?.immediate) {
        flushCloudSync();
      } else {
        pendingCloudTimerRef.current = setTimeout(() => {
          flushCloudSync();
        }, 500);
      }
    },
    [flushCloudSync]
  );

  // Subscribe to real-time Firestore updates without clobbering active typing or pending writes
  useEffect(() => {
    const unsubscribe = subscribeToDailySales((cloudRecords) => {
      if (cloudRecords && Array.isArray(cloudRecords) && cloudRecords.length > 0) {
        const now = Date.now();
        if (
          focusedInputsRef.current > 0 ||
          hasPendingCloudWriteRef.current ||
          pendingCloudTimerRef.current !== null ||
          inFlightCloudSyncRef.current > 0 ||
          now - lastLocalEditAtRef.current < 2500
        ) {
          return;
        }
        const normalizedCloud = ensureDailySalesRange(cloudRecords);
        latestRecordsRef.current = normalizedCloud;
        setRecords(normalizedCloud);
        try {
          localStorage.setItem(STORAGE_KEY_DAILY_SALES, JSON.stringify(normalizedCloud));
        } catch {
          // ignore
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Compute Wednesday–Tuesday Weekly Rollups
  const wedTueWeeksList = useMemo(() => {
    return groupRecordsByWedTueWeeks(records);
  }, [records]);

  // Compute Sunday–Saturday Calendar Weekly Rollups
  const calendarWeeksList = useMemo(() => {
    return groupRecordsByCalendarWeeks(records);
  }, [records]);

  // Compute Monthly Rollups
  const monthlyList = useMemo(() => {
    return groupRecordsByMonth(records);
  }, [records]);

  // Overall Running Metrics
  const overallTotals = useMemo(() => {
    let totalROs = 0;
    let totalCP = 0;
    let totalWarr = 0;
    let totalInt = 0;

    records.forEach(r => {
      const c = computeDailyTotals(r);
      totalROs += c.roCount;
      totalCP += c.customerPaySales;
      totalWarr += c.warrantySales;
      totalInt += c.internalSales;
    });

    const totalSales = totalCP + totalWarr + totalInt;
    const avgSalesPerRO = totalROs > 0 ? totalSales / totalROs : 0;
    const daysCount = records.length;
    const avgROsPerDay = daysCount > 0 ? totalROs / daysCount : 0;

    return {
      daysCount,
      totalROs,
      avgROsPerDay,
      totalCP,
      totalWarr,
      totalInt,
      totalSales,
      avgSalesPerRO,
      cpPct: totalSales > 0 ? (totalCP / totalSales) * 100 : 0,
      warrPct: totalSales > 0 ? (totalWarr / totalSales) * 100 : 0,
      intPct: totalSales > 0 ? (totalInt / totalSales) * 100 : 0,
    };
  }, [records]);

  // Day / Week / Month RO Count Summary derived from selectedRODate
  const roPeriodOverview = useMemo(() => {
    const dayRecord = records.find(r => r.date === selectedRODate);
    const dayROCount = dayRecord ? Math.max(0, Number(dayRecord.roCount) || 0) : 0;

    const activeWeeks = roWeekCycle === 'WED_TUE' ? wedTueWeeksList : calendarWeeksList;
    const weekInfo =
      roWeekCycle === 'WED_TUE'
        ? getWedTueWeekPeriodForDate(selectedRODate)
        : getSunSatWeekPeriodForDate(selectedRODate);
    const weekIdx = activeWeeks.findIndex(w => w.weekId === weekInfo.weekId);
    const currentWeek = weekIdx >= 0 ? activeWeeks[weekIdx] : null;
    const prevWeek = weekIdx >= 0 && weekIdx + 1 < activeWeeks.length ? activeWeeks[weekIdx + 1] : null;

    const monthKey = selectedRODate.slice(0, 7);
    const monthParts = monthKey.split('-').map(Number);
    const monthLabelFallback = new Date(
      monthParts[0] || 2026,
      (monthParts[1] || 1) - 1,
      15
    ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthIdx = monthlyList.findIndex(m => m.monthKey === monthKey);
    const currentMonth = monthIdx >= 0 ? monthlyList[monthIdx] : null;
    const prevMonth = monthIdx >= 0 && monthIdx + 1 < monthlyList.length ? monthlyList[monthIdx + 1] : null;

    return {
      dayRecordExists: Boolean(dayRecord),
      dayROCount,
      weekLabel: weekInfo.label.replace('Pay Period: ', ''),
      weekROCount: currentWeek ? currentWeek.totalROCount : 0,
      weekDaysCount: currentWeek ? currentWeek.daysCount : 0,
      weekAvgDailyROs: currentWeek ? currentWeek.avgDailyROCount : 0,
      weekDeltaROs:
        currentWeek && prevWeek ? currentWeek.totalROCount - prevWeek.totalROCount : null,
      monthLabel: currentMonth ? currentMonth.monthLabel : monthLabelFallback,
      monthROCount: currentMonth ? currentMonth.totalROCount : 0,
      monthDaysCount: currentMonth ? currentMonth.daysCount : 0,
      monthAvgDailyROs: currentMonth ? currentMonth.avgDailyROCount : 0,
      monthDeltaROs:
        currentMonth && prevMonth ? currentMonth.totalROCount - prevMonth.totalROCount : null,
    };
  }, [records, selectedRODate, roWeekCycle, wedTueWeeksList, calendarWeeksList, monthlyList]);

  // Handle inline updates (or upsert if date doesn't exist yet) to a daily record
  const handleUpdateRecord = (
    dateStr: string,
    updates: Partial<DailySalesRecord>,
    options?: { immediate?: boolean }
  ) => {
    const current = latestRecordsRef.current;
    const exists = current.some(r => r.date === dateStr);
    const now = new Date().toISOString();
    const updated = exists
      ? current.map(r => (r.date === dateStr ? { ...r, ...updates, updatedAt: now } : r))
      : [
          {
            date: dateStr,
            roCount: 0,
            customerPaySales: 0,
            warrantySales: 0,
            internalSales: 0,
            ...updates,
            updatedAt: now
          },
          ...current
        ];
    saveRecords(updated, options);
  };

  // Stepper helper for quick RO Count adjustments
  const handleStepROCount = (dateStr: string, delta: number) => {
    const existing = latestRecordsRef.current.find(r => r.date === dateStr);
    const currentCount = existing ? Math.max(0, Number(existing.roCount) || 0) : 0;
    const nextCount = Math.max(0, currentCount + delta);
    handleUpdateRecord(dateStr, { roCount: nextCount }, { immediate: true });
  };

  // Handle auto-calculating totals from repair orders for a given date
  const handleAutoFillFromROs = (dateStr: string) => {
    const autoData = calculateDailySalesFromROs(dateStr, repairOrders);
    handleUpdateRecord(
      dateStr,
      {
        roCount: autoData.roCount,
        customerPaySales: autoData.customerPaySales,
        warrantySales: autoData.warrantySales,
        internalSales: autoData.internalSales
      },
      { immediate: true }
    );
    triggerSaveToast(`Auto-calculated figures from ROs for ${dateStr}.`);
  };

  // Handle adding a new date record
  const handleAddDateRecord = () => {
    if (!newDateInput) return;
    if (records.some(r => r.date === newDateInput)) {
      setSelectedRODate(newDateInput);
      setSelectedMonthFilter('ALL');
      setSearchQuery(newDateInput);
      setIsAddDateModalOpen(false);
      triggerSaveToast(`Selected existing record for ${newDateInput}.`);
      return;
    }
    const autoData = calculateDailySalesFromROs(newDateInput, repairOrders);
    const newRec: DailySalesRecord = {
      date: newDateInput,
      roCount: autoData.roCount,
      customerPaySales: autoData.customerPaySales,
      warrantySales: autoData.warrantySales,
      internalSales: autoData.internalSales,
      updatedAt: new Date().toISOString()
    };
    saveRecords([newRec, ...records]);
    setSelectedRODate(newDateInput);
    setIsAddDateModalOpen(false);
    triggerSaveToast(`Added record for ${newDateInput}.`);
  };

  // Toast alert
  const triggerSaveToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Filtered daily records
  const filteredDailyRecords = useMemo(() => {
    let list = records;
    if (selectedMonthFilter !== 'ALL') {
      list = list.filter(r => r.date.startsWith(selectedMonthFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => r.date.includes(q) || (r.notes && r.notes.toLowerCase().includes(q)));
    }
    return list;
  }, [records, selectedMonthFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Wednesday-Tuesday Week',
      'RO Count',
      'Customer Pay Sales ($)',
      'Warranty Sales ($)',
      'Internal Sales ($)',
      'Total Sales ($)',
      'Average $/RO ($)',
      'Customer Pay %',
      'Warranty %',
      'Internal %',
      'Notes'
    ];

    const lines: string[] = [];
    lines.push('"Daily Repair Order Count & Sales Tracker (Starts Sept 1, 2025)"');
    lines.push('"Payroll Cycle: Wednesday through Tuesday"');
    lines.push('');
    lines.push(headers.map(h => `"${h}"`).join(','));

    records.forEach(r => {
      const c = computeDailyTotals(r);
      const weekInfo = getWedTueWeekPeriodForDate(r.date);
      const row = [
        r.date,
        weekInfo.label,
        c.roCount,
        `$${c.customerPaySales.toFixed(2)}`,
        `$${c.warrantySales.toFixed(2)}`,
        `$${c.internalSales.toFixed(2)}`,
        `$${c.totalSales.toFixed(2)}`,
        `$${c.avgSalesPerRO.toFixed(2)}`,
        `${c.customerPayPct.toFixed(1)}%`,
        `${c.warrantyPct.toFixed(1)}%`,
        `${c.internalPct.toFixed(1)}%`,
        r.notes || ''
      ];
      lines.push(row.map(v => `"${v}"`).join(','));
    });

    const csv = lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_RO_Sales_Tracker_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate SVG Line Graph Data Points
  const graphDataPoints = useMemo(() => {
    if (graphTimeframe === 'DAILY') {
      const sortedAsc = [...records].sort((a, b) => a.date.localeCompare(b.date));
      return sortedAsc.map(r => {
        const c = computeDailyTotals(r);
        return {
          key: r.date,
          label: r.date.substring(5), // MM-DD
          fullLabel: r.date,
          avgPerRO: Math.round(c.avgSalesPerRO),
          totalSales: Math.round(c.totalSales),
          cpSales: Math.round(c.customerPaySales),
          warrSales: Math.round(c.warrantySales),
          intSales: Math.round(c.internalSales),
          roCount: c.roCount,
        };
      });
    } else if (graphTimeframe === 'WEEKLY_WED_TUE') {
      const sortedAsc = [...wedTueWeeksList].sort((a, b) => a.weekEndingDate.localeCompare(b.weekEndingDate));
      return sortedAsc.map(w => {
        return {
          key: w.weekId,
          label: `${w.weekStartDate.substring(5)} - ${w.weekEndingDate.substring(5)}`,
          fullLabel: w.weekLabel,
          avgPerRO: Math.round(w.avgSalesPerRO),
          totalSales: Math.round(w.totalSales),
          cpSales: Math.round(w.totalCustomerPaySales),
          warrSales: Math.round(w.totalWarrantySales),
          intSales: Math.round(w.totalInternalSales),
          roCount: w.totalROCount,
        };
      });
    } else {
      const sortedAsc = [...monthlyList].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
      return sortedAsc.map(m => {
        return {
          key: m.monthKey,
          label: m.monthLabel.split(' ')[0], // Month Name
          fullLabel: m.monthLabel,
          avgPerRO: Math.round(m.avgSalesPerRO),
          totalSales: Math.round(m.totalSales),
          cpSales: Math.round(m.totalCustomerPaySales),
          warrSales: Math.round(m.totalWarrantySales),
          intSales: Math.round(m.totalInternalSales),
          roCount: m.totalROCount,
        };
      });
    }
  }, [records, wedTueWeeksList, monthlyList, graphTimeframe]);

  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden text-slate-900">
      
      {/* Top Header */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Daily Repair Order & Sales Tracker
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase tracking-widest">
                  Starts Sept 1, 2025
                </span>
                {saveToast && (
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 animate-in fade-in">
                    ✓ {saveToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track daily RO count, Customer Pay / Warranty / Internal sales, Average $/RO, and Wednesday–Tuesday payroll weeks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Tabs */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center flex-wrap gap-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('DAILY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'DAILY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Daily Log</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('WEEKLY_WED_TUE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'WEEKLY_WED_TUE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Wed–Tue Weeks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'MONTHLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Monthly Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('RO_COUNT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'RO_COUNT'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>RO Count (Day/Wk/Mo)</span>
              </button>
            </div>

            {/* Line Graph Button */}
            <button
              type="button"
              onClick={() => setShowGraphModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1.5 border border-blue-400/40"
              title="Open Interactive Line Graph Charts"
            >
              <TrendingUp className="w-4 h-4 text-yellow-300 animate-pulse" />
              <span>📈 Trend Line Graphs</span>
            </button>

            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          
          {/* 1. Avg $/RO */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-2 lg:col-span-2 bg-gradient-to-br from-emerald-50/50 to-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                Overall Average $ / RO
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                {overallTotals.totalROs} Total ROs
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-1">
              {formatCurrency(overallTotals.avgSalesPerRO)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Average sales revenue produced per Repair Order across all recorded days.
            </p>
          </div>

          {/* 2. Total Sales */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Total Revenue
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(overallTotals.totalSales)}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {overallTotals.daysCount} Days Logged
            </span>
          </div>

          {/* 3. Customer Pay Sales */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-blue-600">
            <span className="text-xs font-black text-blue-900 uppercase tracking-wider block">
              Customer Pay
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(overallTotals.totalCP)}
            </div>
            <span className="text-xs font-bold text-blue-600 mt-0.5 block">
              {overallTotals.cpPct.toFixed(1)}% of total sales
            </span>
          </div>

          {/* 4. Warranty Sales */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-purple-600">
            <span className="text-xs font-black text-purple-900 uppercase tracking-wider block">
              Warranty Sales
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(overallTotals.totalWarr)}
            </div>
            <span className="text-xs font-bold text-purple-600 mt-0.5 block">
              {overallTotals.warrPct.toFixed(1)}% of total sales
            </span>
          </div>

          {/* 5. Internal Sales */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs border-l-4 border-l-amber-600">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider block">
              Internal Sales
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-1">
              {formatCurrency(overallTotals.totalInt)}
            </div>
            <span className="text-xs font-bold text-amber-600 mt-0.5 block">
              {overallTotals.intPct.toFixed(1)}% of total sales
            </span>
          </div>
        </div>

        {/* RO Count by Day, Week & Month Strip */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                  RO Count Tracker — Day, Week &amp; Month
                </h2>
                <p className="text-[11px] text-slate-500">
                  Track daily ticket volume alongside weekly and monthly totals ({overallTotals.totalROs} total ROs logged • {overallTotals.avgROsPerDay.toFixed(1)} avg/day).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[11px] font-bold text-slate-600">Focus Date:</label>
              <input
                type="date"
                min={DAILY_SALES_START_DATE}
                value={selectedRODate}
                onChange={(e) => e.target.value && setSelectedRODate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
              {selectedRODate !== todayIso && (
                <button
                  type="button"
                  onClick={() => setSelectedRODate(todayIso)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('RO_COUNT')}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
              >
                Open Full RO Count View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Day RO Count Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Day RO Count ({selectedRODate})
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoFillFromROs(selectedRODate)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-pointer"
                  title="Auto-count ROs logged on this date"
                >
                  Auto-Count ROs
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {roPeriodOverview.dayROCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500">ROs</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepROCount(selectedRODate, -1)}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer"
                    title="Subtract 1 RO"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={roPeriodOverview.dayROCount}
                    onFocus={() => {
                      focusedInputsRef.current += 1;
                    }}
                    onChange={(e) =>
                      handleUpdateRecord(selectedRODate, {
                        roCount: Math.max(0, Number(e.target.value) || 0)
                      })
                    }
                    onBlur={() => {
                      focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                      flushCloudSync();
                    }}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-mono font-black text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepROCount(selectedRODate, 1)}
                    className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                    title="Add 1 RO"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>
                  {roPeriodOverview.dayRecordExists
                    ? `Shop Avg: ${overallTotals.avgROsPerDay.toFixed(1)} ROs/day`
                    : 'No entry yet for this date — adjust above to start'}
                </span>
              </div>
            </div>

            {/* Week RO Count Card */}
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-900">
                  Week RO Count
                </span>
                <div className="inline-flex rounded-md bg-white border border-purple-200 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setRoWeekCycle('WED_TUE')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      roWeekCycle === 'WED_TUE' ? 'bg-purple-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Wed–Tue
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoWeekCycle('SUN_SAT')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      roWeekCycle === 'SUN_SAT' ? 'bg-purple-600 text-white' : 'text-slate-600'
                    }`}
                  >
                    Sun–Sat
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-purple-900">
                    {roPeriodOverview.weekROCount}
                  </span>
                  <span className="text-xs font-bold text-purple-700">ROs</span>
                </div>
                {roPeriodOverview.weekDeltaROs !== null && (
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded font-mono ${
                      roPeriodOverview.weekDeltaROs >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {roPeriodOverview.weekDeltaROs >= 0 ? '+' : ''}
                    {roPeriodOverview.weekDeltaROs} vs prev wk
                  </span>
                )}
              </div>

              <div className="text-[11px] text-purple-800/80 flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{roPeriodOverview.weekLabel}</span>
                <span className="font-mono shrink-0">
                  {roPeriodOverview.weekDaysCount}d • {roPeriodOverview.weekAvgDailyROs.toFixed(1)}/day
                </span>
              </div>
            </div>

            {/* Month RO Count Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Month RO Count
                </span>
                <span className="text-[11px] font-bold text-emerald-800 truncate">
                  {roPeriodOverview.monthLabel}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-emerald-900">
                    {roPeriodOverview.monthROCount}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">ROs</span>
                </div>
                {roPeriodOverview.monthDeltaROs !== null && (
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded font-mono ${
                      roPeriodOverview.monthDeltaROs >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {roPeriodOverview.monthDeltaROs >= 0 ? '+' : ''}
                    {roPeriodOverview.monthDeltaROs} vs prev mo
                  </span>
                )}
              </div>

              <div className="text-[11px] text-emerald-800/80 flex items-center justify-between gap-2">
                <span>{roPeriodOverview.monthDaysCount} days logged</span>
                <span className="font-mono font-bold">
                  {roPeriodOverview.monthAvgDailyROs.toFixed(1)} ROs/day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'DAILY' && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search date or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="ALL">All Months (From Sept 1, 2025)</option>
                  {monthlyList.map(m => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.monthLabel}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsAddDateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add / Select Date</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DAILY ENTRY SHEET */}
        {activeTab === 'DAILY' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Daily Sales & RO Entry Sheet ({filteredDailyRecords.length} Days)
              </span>
              <span className="text-[11px] text-slate-500">
                Click any cell to edit • Auto-calculates Total Sales & Avg $/RO
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Wed–Tue Pay Period</th>
                    <th className="px-4 py-3 text-center">RO Count</th>
                    <th className="px-4 py-3">Customer Pay ($)</th>
                    <th className="px-4 py-3">Warranty Sales ($)</th>
                    <th className="px-4 py-3">Internal Sales ($)</th>
                    <th className="px-4 py-3 text-right">Total Sales ($)</th>
                    <th className="px-4 py-3 text-right">Average $/RO ($)</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDailyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500 font-medium">
                        No daily records found for this filter. Click "+ Add / Select Date" above.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRecords.map(record => {
                      const computed = computeDailyTotals(record);
                      const weekInfo = getWedTueWeekPeriodForDate(record.date);

                      return (
                        <tr key={record.date} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-3 font-mono font-black text-slate-900 whitespace-nowrap">
                            {record.date}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600 text-[11px] whitespace-nowrap">
                            {weekInfo.label.replace('Pay Period: ', '')}
                          </td>
                          {/* RO Count */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={record.roCount}
                              onFocus={() => {
                                focusedInputsRef.current += 1;
                              }}
                              onChange={(e) => handleUpdateRecord(record.date, { roCount: Number(e.target.value) || 0 })}
                              onBlur={() => {
                                focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                                flushCloudSync();
                              }}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center font-mono font-black text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                            />
                          </td>
                          {/* Customer Pay Sales */}
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={record.customerPaySales}
                                onFocus={() => {
                                  focusedInputsRef.current += 1;
                                }}
                                onChange={(e) => handleUpdateRecord(record.date, { customerPaySales: Number(e.target.value) || 0 })}
                                onBlur={() => {
                                  focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                                  flushCloudSync();
                                }}
                                className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-300 rounded font-mono font-extrabold text-xs text-blue-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                              />
                            </div>
                          </td>
                          {/* Warranty Sales */}
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={record.warrantySales}
                                onFocus={() => {
                                  focusedInputsRef.current += 1;
                                }}
                                onChange={(e) => handleUpdateRecord(record.date, { warrantySales: Number(e.target.value) || 0 })}
                                onBlur={() => {
                                  focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                                  flushCloudSync();
                                }}
                                className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-300 rounded font-mono font-extrabold text-xs text-purple-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                              />
                            </div>
                          </td>
                          {/* Internal Sales */}
                          <td className="px-4 py-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={record.internalSales}
                                onFocus={() => {
                                  focusedInputsRef.current += 1;
                                }}
                                onChange={(e) => handleUpdateRecord(record.date, { internalSales: Number(e.target.value) || 0 })}
                                onBlur={() => {
                                  focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                                  flushCloudSync();
                                }}
                                className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-300 rounded font-mono font-extrabold text-xs text-amber-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                              />
                            </div>
                          </td>
                          {/* Total Sales */}
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                            {formatCurrency(computed.totalSales)}
                          </td>
                          {/* Avg $/RO */}
                          <td className="px-4 py-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap bg-emerald-50/50">
                            {formatCurrency(computed.avgSalesPerRO)}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleAutoFillFromROs(record.date)}
                              className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded border border-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                              title="Auto-calculate figures from closed Repair Orders on this date"
                            >
                              Auto-Fill ROs
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: WEDNESDAY - TUESDAY WEEKLY ROLLUP */}
        {activeTab === 'WEEKLY_WED_TUE' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Wednesday – Tuesday Payroll Week Sales Summaries ({wedTueWeeksList.length} Weeks)
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">
                Aligned with Dealership Payroll Cycle
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3">Pay Period</th>
                    <th className="px-4 py-3 text-center">Days Logged</th>
                    <th className="px-4 py-3 text-center">Total RO Count</th>
                    <th className="px-4 py-3 text-center">Avg ROs / Day</th>
                    <th className="px-4 py-3 text-right">Customer Pay ($)</th>
                    <th className="px-4 py-3 text-right">Warranty Sales ($)</th>
                    <th className="px-4 py-3 text-right">Internal Sales ($)</th>
                    <th className="px-4 py-3 text-right">Total Sales ($)</th>
                    <th className="px-4 py-3 text-right bg-emerald-100/60 text-emerald-900">Weekly Avg $/RO ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {wedTueWeeksList.map(week => (
                    <tr key={week.weekId} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {week.weekLabel}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {week.daysCount} Days
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-black text-purple-900 text-sm">
                        {week.totalROCount}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {week.avgDailyROCount.toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-900">
                        {formatCurrency(week.totalCustomerPaySales)}
                        <span className="block text-[10px] text-blue-600 font-normal">{week.customerPayPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-900">
                        {formatCurrency(week.totalWarrantySales)}
                        <span className="block text-[10px] text-purple-600 font-normal">{week.warrantyPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-900">
                        {formatCurrency(week.totalInternalSales)}
                        <span className="block text-[10px] text-amber-600 font-normal">{week.internalPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-slate-950 text-sm">
                        {formatCurrency(week.totalSales)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm bg-emerald-50/70">
                        {formatCurrency(week.avgSalesPerRO)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MONTHLY SUMMARY */}
        {activeTab === 'MONTHLY' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Monthly Sales & RO Summaries ({monthlyList.length} Months)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Monthly cumulative performance & average sales per ticket
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-center">Days Recorded</th>
                    <th className="px-4 py-3 text-center">Total RO Count</th>
                    <th className="px-4 py-3 text-center">Avg ROs / Day</th>
                    <th className="px-4 py-3 text-right">Customer Pay ($)</th>
                    <th className="px-4 py-3 text-right">Warranty Sales ($)</th>
                    <th className="px-4 py-3 text-right">Internal Sales ($)</th>
                    <th className="px-4 py-3 text-right">Total Revenue ($)</th>
                    <th className="px-4 py-3 text-right bg-emerald-100/60 text-emerald-900">Monthly Avg $/RO ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyList.map(month => (
                    <tr key={month.monthKey} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-4 py-3.5 font-black text-slate-900 text-sm whitespace-nowrap">
                        {month.monthLabel}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {month.daysCount} Days
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-black text-purple-900 text-sm">
                        {month.totalROCount}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {month.avgDailyROCount.toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-900">
                        {formatCurrency(month.totalCustomerPaySales)}
                        <span className="block text-[10px] text-blue-600 font-normal">{month.customerPayPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-900">
                        {formatCurrency(month.totalWarrantySales)}
                        <span className="block text-[10px] text-purple-600 font-normal">{month.warrantyPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-900">
                        {formatCurrency(month.totalInternalSales)}
                        <span className="block text-[10px] text-amber-600 font-normal">{month.internalPct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-slate-950 text-sm">
                        {formatCurrency(month.totalSales)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-700 text-sm bg-emerald-50/70">
                        {formatCurrency(month.avgSalesPerRO)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: DEDICATED RO COUNT TRACKER (BY DAY, WEEK & MONTH) */}
        {activeTab === 'RO_COUNT' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  RO Count Breakdown
                </span>
                <div className="inline-flex rounded-lg bg-slate-200 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRoViewGrouping('DAY')}
                    className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                      roViewGrouping === 'DAY' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Day ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoViewGrouping('WEEK')}
                    className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                      roViewGrouping === 'WEEK' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Week ({(roWeekCycle === 'WED_TUE' ? wedTueWeeksList : calendarWeeksList).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoViewGrouping('MONTH')}
                    className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
                      roViewGrouping === 'MONTH' ? 'bg-white text-purple-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    By Month ({monthlyList.length})
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {roViewGrouping === 'WEEK' && (
                  <div className="inline-flex rounded-lg bg-slate-100 border border-slate-300 p-0.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRoWeekCycle('WED_TUE')}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        roWeekCycle === 'WED_TUE' ? 'bg-purple-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Wed–Tue Payroll Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoWeekCycle('SUN_SAT')}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        roWeekCycle === 'SUN_SAT' ? 'bg-purple-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Sun–Sat Calendar Week
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setGraphMetric('RO_COUNT');
                    setGraphTimeframe(
                      roViewGrouping === 'DAY'
                        ? 'DAILY'
                        : roViewGrouping === 'WEEK'
                        ? 'WEEKLY_WED_TUE'
                        : 'MONTHLY'
                    );
                    setShowGraphModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>View RO Count Graph</span>
                </button>
              </div>
            </div>

            {roViewGrouping === 'DAY' && (() => {
              const maxDayRO = Math.max(...records.map(r => Math.max(0, Number(r.roCount) || 0)), 1);
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Week</th>
                        <th className="px-4 py-3 text-center">RO Count</th>
                        <th className="px-4 py-3 w-48">Daily Volume</th>
                        <th className="px-4 py-3 text-right">Total Sales</th>
                        <th className="px-4 py-3 text-right">Avg $/RO</th>
                        <th className="px-4 py-3 text-center">Quick Fill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {records.map(record => {
                        const computed = computeDailyTotals(record);
                        const weekInfo =
                          roWeekCycle === 'WED_TUE'
                            ? getWedTueWeekPeriodForDate(record.date)
                            : getSunSatWeekPeriodForDate(record.date);
                        const barPct = Math.min(100, Math.round((computed.roCount / maxDayRO) * 100));
                        const dateParts = record.date.split('-').map(Number);
                        const dayName = new Date(
                          dateParts[0] || 2026,
                          (dateParts[1] || 1) - 1,
                          dateParts[2] || 1
                        ).toLocaleDateString('en-US', { weekday: 'short' });

                        return (
                          <tr key={record.date} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-3 font-mono font-black text-slate-900 whitespace-nowrap">
                              <span className="text-slate-500 font-sans mr-1.5">{dayName}</span>
                              {record.date}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium text-[11px] whitespace-nowrap">
                              {weekInfo.label.replace('Pay Period: ', '')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStepROCount(record.date, -1)}
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={record.roCount}
                                  onFocus={() => {
                                    focusedInputsRef.current += 1;
                                  }}
                                  onChange={(e) =>
                                    handleUpdateRecord(record.date, {
                                      roCount: Math.max(0, Number(e.target.value) || 0)
                                    })
                                  }
                                  onBlur={() => {
                                    focusedInputsRef.current = Math.max(0, focusedInputsRef.current - 1);
                                    flushCloudSync();
                                  }}
                                  className="w-14 px-1.5 py-1 bg-white border border-slate-300 rounded text-center font-mono font-black text-xs text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepROCount(record.date, 1)}
                                  className="p-1 rounded bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-800 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-2.5 rounded-full transition-all"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(computed.totalSales)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(computed.avgSalesPerRO)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleAutoFillFromROs(record.date)}
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded border border-slate-300 text-[10px] font-bold cursor-pointer"
                              >
                                Auto-Fill ROs
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {roViewGrouping === 'WEEK' && (() => {
              const activeWeeks = roWeekCycle === 'WED_TUE' ? wedTueWeeksList : calendarWeeksList;
              const maxWeekRO = Math.max(...activeWeeks.map(w => w.totalROCount), 1);
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3">
                          {roWeekCycle === 'WED_TUE' ? 'Wed–Tue Payroll Week' : 'Sun–Sat Calendar Week'}
                        </th>
                        <th className="px-4 py-3 text-center">Days Logged</th>
                        <th className="px-4 py-3 text-center">Total RO Count</th>
                        <th className="px-4 py-3 text-center">Avg ROs / Day</th>
                        <th className="px-4 py-3 text-center">vs Prior Week</th>
                        <th className="px-4 py-3 w-48">Weekly Volume</th>
                        <th className="px-4 py-3 text-right">Total Revenue</th>
                        <th className="px-4 py-3 text-right">Avg $/RO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {activeWeeks.map((week, idx) => {
                        const prev = idx + 1 < activeWeeks.length ? activeWeeks[idx + 1] : null;
                        const delta = prev ? week.totalROCount - prev.totalROCount : null;
                        const barPct = Math.min(100, Math.round((week.totalROCount / maxWeekRO) * 100));
                        return (
                          <tr key={week.weekId} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                              {week.weekLabel.replace('Pay Period: ', '')}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                              {week.daysCount} Days
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-black text-purple-900 text-sm">
                              {week.totalROCount} ROs
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800">
                              {week.avgDailyROCount.toFixed(1)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold">
                              {delta === null ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                    delta >= 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {delta >= 0 ? '+' : ''}
                                  {delta}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-2.5 rounded-full transition-all"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(week.totalSales)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(week.avgSalesPerRO)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {roViewGrouping === 'MONTH' && (() => {
              const maxMonthRO = Math.max(...monthlyList.map(m => m.totalROCount), 1);
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] uppercase font-black text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3 text-center">Days Logged</th>
                        <th className="px-4 py-3 text-center">Total RO Count</th>
                        <th className="px-4 py-3 text-center">Avg ROs / Day</th>
                        <th className="px-4 py-3 text-center">vs Prior Month</th>
                        <th className="px-4 py-3 w-48">Monthly Volume</th>
                        <th className="px-4 py-3 text-right">Total Revenue</th>
                        <th className="px-4 py-3 text-right">Avg $/RO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {monthlyList.map((month, idx) => {
                        const prev = idx + 1 < monthlyList.length ? monthlyList[idx + 1] : null;
                        const delta = prev ? month.totalROCount - prev.totalROCount : null;
                        const barPct = Math.min(100, Math.round((month.totalROCount / maxMonthRO) * 100));
                        return (
                          <tr key={month.monthKey} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="px-4 py-3.5 font-black text-slate-900 text-sm whitespace-nowrap">
                              {month.monthLabel}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                              {month.daysCount} Days
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-black text-purple-900 text-sm">
                              {month.totalROCount} ROs
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800">
                              {month.avgDailyROCount.toFixed(1)}
                            </td>
                            <td className="px-4 py-3.5 text-center font-mono font-bold">
                              {delta === null ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                    delta >= 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {delta >= 0 ? '+' : ''}
                                  {delta}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-2.5 rounded-full transition-all"
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                              {formatCurrency(month.totalSales)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(month.avgSalesPerRO)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE LINE GRAPH MODAL                                               */}
      {/* ========================================================================= */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 text-white rounded-2xl border-2 border-slate-700 shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <TrendingUp className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Sales & Average $/RO Trend Line Graphs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Visual performance trends over time starting Sept 1, 2025.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="px-6 py-3 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              
              {/* Metric Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graph Metric:</span>
                <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGraphMetric('AVG_PER_RO')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphMetric === 'AVG_PER_RO' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Avg $/RO ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphMetric('SALES_BREAKDOWN')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphMetric === 'SALES_BREAKDOWN' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sales Breakdown ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphMetric('RO_COUNT')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphMetric === 'RO_COUNT' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    RO Volume Count
                  </button>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeframe:</span>
                <div className="bg-slate-800 p-1 rounded-lg flex items-center border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setGraphTimeframe('DAILY')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphTimeframe === 'DAILY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphTimeframe('WEEKLY_WED_TUE')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphTimeframe === 'WEEKLY_WED_TUE' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Wed–Tue Weeks
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphTimeframe('MONTHLY')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      graphTimeframe === 'MONTHLY' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Interactive Line Chart Canvas */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              
              {graphDataPoints.length < 2 ? (
                <div className="p-12 text-center text-slate-400 font-bold">
                  Not enough data points to plot trend graph. Please add more daily records.
                </div>
              ) : (
                <div className="bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-800 relative">
                  
                  {/* Legend */}
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                      {graphMetric === 'AVG_PER_RO' && (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block shadow-xs" />
                          <span className="font-extrabold text-emerald-300">Average $/RO Trend ($)</span>
                        </div>
                      )}
                      {graphMetric === 'SALES_BREAKDOWN' && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                            <span className="font-bold text-blue-300">Customer Pay ($)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                            <span className="font-bold text-purple-300">Warranty ($)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                            <span className="font-bold text-amber-300">Internal ($)</span>
                          </div>
                        </>
                      )}
                      {graphMetric === 'RO_COUNT' && (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-400 inline-block" />
                          <span className="font-extrabold text-purple-300">RO Count (Tickets)</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {graphDataPoints.length} Data Points
                    </span>
                  </div>

                  {/* SVG Chart Rendering */}
                  {(() => {
                    const width = 800;
                    const height = 300;
                    const padding = 40;

                    // Extract values depending on metric
                    const getVal = (pt: typeof graphDataPoints[0]) => {
                      if (graphMetric === 'AVG_PER_RO') return pt.avgPerRO;
                      if (graphMetric === 'RO_COUNT') return pt.roCount;
                      return pt.totalSales;
                    };

                    const maxVal = Math.max(...graphDataPoints.map(getVal), 10);

                    const points = graphDataPoints.map((pt, i) => {
                      const x = padding + (i / (graphDataPoints.length - 1 || 1)) * (width - 2 * padding);
                      const y = height - padding - (getVal(pt) / maxVal) * (height - 2 * padding);
                      return { x, y, pt };
                    });

                    const pathD = points.reduce((acc, p, i) => {
                      return `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
                    }, '');

                    // Secondary lines for breakdown mode
                    const cpPoints = graphDataPoints.map((pt, i) => {
                      const x = padding + (i / (graphDataPoints.length - 1 || 1)) * (width - 2 * padding);
                      const y = height - padding - (pt.cpSales / maxVal) * (height - 2 * padding);
                      return { x, y };
                    });
                    const cpPathD = cpPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                    const warrPoints = graphDataPoints.map((pt, i) => {
                      const x = padding + (i / (graphDataPoints.length - 1 || 1)) * (width - 2 * padding);
                      const y = height - padding - (pt.warrSales / maxVal) * (height - 2 * padding);
                      return { x, y };
                    });
                    const warrPathD = warrPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                    const intPoints = graphDataPoints.map((pt, i) => {
                      const x = padding + (i / (graphDataPoints.length - 1 || 1)) * (width - 2 * padding);
                      const y = height - padding - (pt.intSales / maxVal) * (height - 2 * padding);
                      return { x, y };
                    });
                    const intPathD = intPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                    return (
                      <div className="w-full overflow-x-auto">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                          {/* Grid Lines */}
                          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
                          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
                          
                          {/* Mid grid line */}
                          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="4,4" />

                          {/* Render line(s) */}
                          {graphMetric === 'SALES_BREAKDOWN' ? (
                            <>
                              <path d={cpPathD} fill="none" stroke="#3b82f6" strokeWidth="3" />
                              <path d={warrPathD} fill="none" stroke="#a855f7" strokeWidth="3" />
                              <path d={intPathD} fill="none" stroke="#f59e0b" strokeWidth="3" />
                            </>
                          ) : (
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke={graphMetric === 'AVG_PER_RO' ? '#34d399' : '#c084fc'} 
                              strokeWidth="4" 
                              strokeLinecap="round"
                            />
                          )}

                          {/* Data points */}
                          {points.map((p, idx) => (
                            <g key={p.pt.key} className="cursor-pointer" onMouseEnter={() => setHoveredPointIndex(idx)}>
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r={hoveredPointIndex === idx ? "7" : "4"} 
                                fill={graphMetric === 'AVG_PER_RO' ? '#34d399' : graphMetric === 'RO_COUNT' ? '#c084fc' : '#ffffff'} 
                                stroke="#0f172a" 
                                strokeWidth="2" 
                              />
                            </g>
                          ))}
                        </svg>

                        {/* Hover Tooltip Box */}
                        {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                          <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700 text-xs flex items-center justify-between animate-in fade-in">
                            <div>
                              <span className="font-extrabold text-white text-sm">
                                {points[hoveredPointIndex].pt.fullLabel}
                              </span>
                              <div className="text-slate-300 font-mono mt-1 space-x-3">
                                <span>RO Count: <strong>{points[hoveredPointIndex].pt.roCount}</strong></span>
                                <span>Total Sales: <strong>{formatCurrency(points[hoveredPointIndex].pt.totalSales)}</strong></span>
                                <span className="text-emerald-400 font-bold">Avg $/RO: <strong>{formatCurrency(points[hoveredPointIndex].pt.avgPerRO)}</strong></span>
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-slate-400 font-mono">
                              <div>CP: {formatCurrency(points[hoveredPointIndex].pt.cpSales)}</div>
                              <div>Warr: {formatCurrency(points[hoveredPointIndex].pt.warrSales)}</div>
                              <div>Int: {formatCurrency(points[hoveredPointIndex].pt.intSales)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Close Chart Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / SELECT DATE MODAL                                                    */}
      {/* ========================================================================= */}
      {isAddDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">
                Add / Edit Daily Record
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Date (Starts Sept 1, 2025):</label>
                <input
                  type="date"
                  min={DAILY_SALES_START_DATE}
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                If date already exists, this will scroll to it. If it doesn't, a new record will be initialized and pre-filled.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsAddDateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDateRecord}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Add / Select Date
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

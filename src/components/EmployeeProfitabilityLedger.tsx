import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Table, 
  FileSpreadsheet, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  Calendar, 
  DollarSign, 
  Percent, 
  Clock, 
  Award, 
  Users, 
  ArrowUpDown, 
  Copy, 
  Check, 
  RefreshCw, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown, 
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Lock,
  Unlock,
  Building,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  EmployeePayType, 
  EmployeeProfitabilityRow, 
  ProfitabilityWeek,
  WeekSummaryTotals 
} from '../types/employeeProfitability';
import { 
  computeEmployeeRow, 
  computeWeekSummary, 
  computeRunningTotals, 
  computeEmployeeRunningTotals, 
  exportWeekToCSV, 
  DEFAULT_PROFITABILITY_WEEKS,
  getNextWednesdayTuesdayPayPeriod
} from '../utils/employeeProfitabilityCalculations';
import { formatCurrency } from '../utils/formatters';
import { printIsolatedDocument } from '../utils/printUtils';

const STORAGE_KEY_PROFITABILITY_WEEKS = 'dealership_employee_profitability_weeks_v4_wed_tue';

interface EmployeeProfitabilityLedgerProps {
  onBackToDashboard?: () => void;
}

export const EmployeeProfitabilityLedger: React.FC<EmployeeProfitabilityLedgerProps> = ({ 
  onBackToDashboard 
}) => {
  const { users, lockProfitLedger, openProfitLedgerPasswordModal } = useApp();

  // Load weeks from isolated persistent storage, with fallback to default realistic template weeks starting Wed Sep 2, 2026
  const [weeks, setWeeks] = useState<ProfitabilityWeek[]>(() => {
    try {
      const savedV4 = localStorage.getItem('dealership_employee_profitability_weeks_v4_wed_tue');
      if (savedV4) {
        const parsed = JSON.parse(savedV4);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PROFITABILITY_WEEKS;
  });

  // Active view tab: 'SPREADSHEET' | 'COMPARISON' | 'RUNNING_TOTALS'
  const [activeTab, setActiveTab] = useState<'SPREADSHEET' | 'COMPARISON' | 'RUNNING_TOTALS'>('SPREADSHEET');

  // Currently selected week ID
  const [selectedWeekId, setSelectedWeekId] = useState<string>(() => {
    return weeks[0]?.id || '';
  });

  // Search filter inside the active spreadsheet
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state for the spreadsheet
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Comparison specific selector (compare week A vs week B)
  const [compareWeekAId, setCompareWeekAId] = useState<string>(() => weeks[0]?.id || '');
  const [compareWeekBId, setCompareWeekBId] = useState<string>(() => weeks[1]?.id || weeks[0]?.id || '');

  // Auto-save alert toast
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Sync to local storage whenever weeks change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFITABILITY_WEEKS, JSON.stringify(weeks));
    } catch {
      // ignore
    }
  }, [weeks]);

  // Active week object
  const activeWeek = useMemo(() => {
    return weeks.find(w => w.id === selectedWeekId) || weeks[0] || null;
  }, [weeks, selectedWeekId]);

  // Compute active week summary
  const activeWeekSummary = useMemo(() => {
    if (!activeWeek) return null;
    return computeWeekSummary(activeWeek);
  }, [activeWeek]);

  // Compute multi-week running totals
  const runningTotals = useMemo(() => {
    return computeRunningTotals(weeks);
  }, [weeks]);

  // Compute employee cumulative records across all weeks
  const employeeCumulativeRecords = useMemo(() => {
    return computeEmployeeRunningTotals(weeks);
  }, [weeks]);

  // Computed and filtered rows for current week
  const computedRows = useMemo(() => {
    if (!activeWeek) return [];
    const list = activeWeek.rows.map(r => 
      computeEmployeeRow(r, activeWeek.defaultBurdenPct)
    );

    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = list.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.role.toLowerCase().includes(q) ||
        r.payType.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return filtered.sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeWeek, searchQuery, sortField, sortDirection]);

  // Handle updates to a row in the active week
  const handleUpdateRow = (rowId: string, updates: Partial<EmployeeProfitabilityRow>) => {
    if (!activeWeek) return;
    setWeeks(prevWeeks => 
      prevWeeks.map(w => {
        if (w.id !== activeWeek.id) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          rows: w.rows.map(r => r.id === rowId ? { ...r, ...updates } : r)
        };
      })
    );
  };

  // Add new employee row to active week
  const handleAddRow = () => {
    if (!activeWeek) return;
    const newRow: EmployeeProfitabilityRow = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Employee',
      role: 'Technician',
      payType: 'FLAT_RATE',
      actualHours: 40.0,
      flaggedHours: 40.0,
      payRate: 30.00,
      laborSales: 0.00,
      grossProfit: 0.00,
      burdenType: 'PERCENT',
      burdenValue: activeWeek.defaultBurdenPct || 10.0,
      notes: ''
    };

    setWeeks(prevWeeks => 
      prevWeeks.map(w => {
        if (w.id !== activeWeek.id) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          rows: [...w.rows, newRow]
        };
      })
    );
  };

  // Delete an employee row from active week
  const handleDeleteRow = (rowId: string, name: string) => {
    if (!activeWeek) return;
    if (confirm(`Remove ${name || 'this employee'} from this week's spreadsheet?`)) {
      setWeeks(prevWeeks => 
        prevWeeks.map(w => {
          if (w.id !== activeWeek.id) return w;
          return {
            ...w,
            updatedAt: new Date().toISOString(),
            rows: w.rows.filter(r => r.id !== rowId)
          };
        })
      );
    }
  };

  // Duplicate an employee row in active week
  const handleDuplicateRow = (row: EmployeeProfitabilityRow) => {
    if (!activeWeek) return;
    const clone: EmployeeProfitabilityRow = {
      ...row,
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${row.name} (Copy)`
    };
    setWeeks(prevWeeks => 
      prevWeeks.map(w => {
        if (w.id !== activeWeek.id) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          rows: [...w.rows, clone]
        };
      })
    );
  };

  // Update sheet-level settings (Billed rate, Burden %, Date, Label)
  const handleUpdateWeekMeta = (updates: Partial<ProfitabilityWeek>) => {
    if (!activeWeek) return;
    setWeeks(prevWeeks => 
      prevWeeks.map(w => w.id === activeWeek.id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w)
    );
  };

  // Create a new week (Wednesday to Tuesday payroll cycle)
  const handleCreateNewWeek = (copyFromCurrent: boolean = true) => {
    // Find newest week ending date to advance to next Wednesday - Tuesday pay period
    const newestWeek = weeks[0];
    const { startDate, endDate, label } = getNextWednesdayTuesdayPayPeriod(newestWeek?.weekEndingDate);
    const newWeekId = `week_${endDate.replace(/-/g, '_')}_${Date.now()}`;

    let newRows: EmployeeProfitabilityRow[] = [];
    if (copyFromCurrent && activeWeek && activeWeek.rows.length > 0) {
      newRows = activeWeek.rows.map(r => ({
        ...r,
        id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actualHours: 40.0,
        flaggedHours: 0.0, // Clear flagged hours so user enters fresh production
        laborSales: 0.0, // Clear sales for fresh week
        grossProfit: 0.0, // Clear gross profit for fresh week
      }));
    } else {
      newRows = [
        {
          id: `emp_${Date.now()}_1`,
          name: 'Marcus Vance',
          role: 'Master Diagnostic Tech',
          payType: 'FLAT_RATE',
          actualHours: 40.0,
          flaggedHours: 0.0,
          payRate: 36.00,
          laborSales: 0.00,
          grossProfit: 0.00,
          burdenType: 'PERCENT',
          burdenValue: 10.0,
        }
      ];
    }

    const newWeek: ProfitabilityWeek = {
      id: newWeekId,
      weekStartDate: startDate,
      weekEndingDate: endDate,
      weekLabel: label,
      defaultBurdenPct: activeWeek?.defaultBurdenPct || 10.0,
      rows: newRows,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Wednesday through Tuesday payroll period'
    };

    setWeeks([newWeek, ...weeks]);
    setSelectedWeekId(newWeekId);
    triggerSaveToast(`Created new pay-period sheet: ${label}`);
  };

  // Delete current week
  const handleDeleteCurrentWeek = () => {
    if (!activeWeek) return;
    if (weeks.length <= 1) {
      alert('You must have at least one weekly sheet in your ledger.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${activeWeek.weekLabel}"? This action cannot be undone.`)) {
      const remaining = weeks.filter(w => w.id !== activeWeek.id);
      setWeeks(remaining);
      setSelectedWeekId(remaining[0]?.id || '');
      triggerSaveToast('Week deleted.');
    }
  };

  // Reset all to Wednesday-Tuesday payroll schedule starting September 2, 2026
  const handleResetToDefaultTemplate = () => {
    if (confirm('Reset ledger to the Wednesday-Tuesday payroll schedule starting September 2, 2026? Any custom entries will be restored to default.')) {
      setWeeks(DEFAULT_PROFITABILITY_WEEKS);
      setSelectedWeekId(DEFAULT_PROFITABILITY_WEEKS[0].id);
      triggerSaveToast('Restored Wednesday-Tuesday payroll schedule (Starts Sep 2, 2026).');
    }
  };

  // Quick 1-click import of employee names from dealership staff roster
  const handleImportStaffFromRoster = () => {
    if (!activeWeek) return;
    const existingNames = new Set(activeWeek.rows.map(r => r.name.toLowerCase().trim()));
    const newStaffRows: EmployeeProfitabilityRow[] = [];

    users.forEach(u => {
      const name = (u.name || '').trim();
      if (!name || existingNames.has(name.toLowerCase())) return;

      let inferredPayType: EmployeePayType = 'FLAT_RATE';
      let payRate = 30.00;

      if (u.role === 'TECHNICIAN') {
        const titleLower = (u.title || '').toLowerCase();
        if (titleLower.includes('lube') || titleLower.includes('express') || titleLower.includes('oil')) {
          inferredPayType = 'HOURLY';
          payRate = 18.00;
        } else {
          inferredPayType = 'FLAT_RATE';
          payRate = 32.00;
        }
      } else if (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') {
        inferredPayType = 'SALARY';
        payRate = u.role === 'SERVICE_MANAGER' ? 1750.00 : 1250.00;
      }

      newStaffRows.push({
        id: `emp_roster_${u.id}_${Date.now()}`,
        name: u.name,
        role: u.title || (u.role === 'TECHNICIAN' ? 'Technician' : u.role === 'SERVICE_ADVISOR' ? 'Service Advisor' : 'Staff'),
        payType: inferredPayType,
        actualHours: 40.0,
        flaggedHours: inferredPayType === 'FLAT_RATE' ? 40.0 : 0.0,
        payRate,
        laborSales: 0.00,
        grossProfit: 0.00,
        burdenType: 'PERCENT',
        burdenValue: activeWeek.defaultBurdenPct || 10.0,
        notes: `Imported from roster (${u.role.replace('_', ' ')})`
      });
    });

    if (newStaffRows.length === 0) {
      alert('All staff from your employee roster are already listed in this week.');
      return;
    }

    setWeeks(prevWeeks => 
      prevWeeks.map(w => {
        if (w.id !== activeWeek.id) return w;
        return {
          ...w,
          updatedAt: new Date().toISOString(),
          rows: [...w.rows, ...newStaffRows]
        };
      })
    );
    triggerSaveToast(`Imported ${newStaffRows.length} team members from roster.`);
  };

  // CSV Export download
  const handleExportCSV = () => {
    if (!activeWeek) return;
    const csv = exportWeekToCSV(activeWeek);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Profitability_${activeWeek.weekEndingDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Document
  const handlePrint = () => {
    if (!activeWeek) return;
    printIsolatedDocument('profitability-printable-sheet', `Profitability Ledger - ${activeWeek.weekLabel}`);
  };

  const triggerSaveToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Sort click handler
  const handleSortClick = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Comparison weeks
  const weekA = useMemo(() => weeks.find(w => w.id === compareWeekAId) || weeks[0], [weeks, compareWeekAId]);
  const weekB = useMemo(() => weeks.find(w => w.id === compareWeekBId) || weeks[1] || weeks[0], [weeks, compareWeekBId]);
  const summaryA = useMemo(() => weekA ? computeWeekSummary(weekA) : null, [weekA]);
  const summaryB = useMemo(() => weekB ? computeWeekSummary(weekB) : null, [weekB]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden text-slate-900">
      
      {/* Top Header & Navigation Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Employee Profitability Ledger
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/60 uppercase tracking-widest">
                  Independent Spreadsheet
                </span>
                {saveToast && (
                  <span className="text-xs text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50 animate-in fade-in">
                    ✓ {saveToast}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Track Actual vs. Flagged Hours, Salary / Flat Rate / Hourly pay, Labor Sales, and Gross vs. Net Profit margins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Tabs */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('SPREADSHEET')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'SPREADSHEET'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPARISON')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'COMPARISON'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Weekly Compare</span>
                {weeks.length > 1 && (
                  <span className="text-[10px] bg-slate-900 px-1.5 py-0.2 rounded font-mono text-slate-300">
                    {weeks.length} Wks
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('RUNNING_TOTALS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'RUNNING_TOTALS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Running Totals & YTD</span>
              </button>
            </div>

            {/* Header Controls: Lock, Password Settings, and Back */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  lockProfitLedger();
                  if (onBackToDashboard) onBackToDashboard();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-800/50 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                title="Lock Profit Ledger immediately"
              >
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Lock</span>
              </button>

              <button
                type="button"
                onClick={openProfitLedgerPasswordModal}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Change Profit Ledger Password"
              >
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Password</span>
              </button>

              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    lockProfitLedger();
                    onBackToDashboard();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  ← Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        
        {/* ========================================================================= */}
        {/* TAB 1: INTERACTIVE SPREADSHEET                                            */}
        {/* ========================================================================= */}
        {activeTab === 'SPREADSHEET' && activeWeek && activeWeekSummary && (
          <div className="space-y-4">
            
            {/* Sheet Control Bar (Week Selector, New Week, Settings, Export) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left: Week Selector & Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Pay Period:</span>
                  <select
                    value={selectedWeekId}
                    onChange={(e) => setSelectedWeekId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {weeks.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.weekLabel} ({w.rows.length} Staff)
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hidden sm:inline-flex items-center gap-1">
                    Wed – Tue
                  </span>
                </div>

                {/* Week Action Buttons */}
                <button
                  type="button"
                  onClick={() => handleCreateNewWeek(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Create a new week using this week's staff roster and pay rates"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Week</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportStaffFromRoster}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
                  title="Import team members from the main dealership employee roster"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sync Names from Staff</span>
                </button>

                {weeks.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentWeek}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                    title="Delete current week from ledger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Week</span>
                  </button>
                )}
              </div>

              {/* Right: Export & Actions */}
              <div className="flex items-center gap-3 flex-wrap">

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Download as Microsoft Excel / CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Print official clean management summary sheet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>

            </div>

            {/* Scorecard KPI Cards for Active Week */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* 1. Hours Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Actual vs Flagged
                </span>
                <div className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                  {activeWeekSummary.totalActualHours.toFixed(1)} <span className="text-xs font-normal text-slate-400">/</span> {activeWeekSummary.totalFlaggedHours.toFixed(1)}
                </div>
                <span className="text-[10px] text-slate-500">
                  Clock vs. Billable Hrs
                </span>
              </div>

              {/* 2. Efficiency Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Shop Efficiency
                </span>
                <div className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                  activeWeekSummary.overallEfficiencyPct >= 100 
                    ? 'text-emerald-600' 
                    : activeWeekSummary.overallEfficiencyPct >= 85 
                    ? 'text-blue-600' 
                    : 'text-amber-600'
                }`}>
                  {activeWeekSummary.overallEfficiencyPct.toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-500">
                  Target: 100%+
                </span>
              </div>

              {/* 3. Total Payroll */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Total Payroll Cost
                </span>
                <div className="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">
                  {formatCurrency(activeWeekSummary.totalPayroll)}
                </div>
                <span className="text-[10px] text-slate-500">
                  Wage & Salary Sum
                </span>
              </div>

              {/* 4. Total Labor Revenue */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Total Revenue
                </span>
                <div className="text-base sm:text-lg font-black text-blue-900 font-mono mt-0.5">
                  {formatCurrency(activeWeekSummary.totalRevenue)}
                </div>
                <span className="text-[10px] text-slate-500">
                  Labor & Parts Produced
                </span>
              </div>

              {/* 5. Gross Profit */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs bg-emerald-50/20">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Gross Profit ($ & %)
                </span>
                <div className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5">
                  {formatCurrency(activeWeekSummary.totalGrossProfit)}
                </div>
                <span className="text-[10px] font-bold text-emerald-800">
                  {activeWeekSummary.overallGrossProfitPct.toFixed(1)}% Margin
                </span>
              </div>

              {/* 6. Net Profit */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs bg-indigo-50/20">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Net Profit ($ & %)
                </span>
                <div className="text-base sm:text-lg font-black text-indigo-700 font-mono mt-0.5">
                  {formatCurrency(activeWeekSummary.totalNetProfit)}
                </div>
                <span className="text-[10px] font-bold text-indigo-800">
                  {activeWeekSummary.overallNetProfitPct.toFixed(1)}% Margin
                </span>
              </div>

            </div>

            {/* Interactive Spreadsheet Table Container */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden flex flex-col">
              
              {/* Search & Table Actions Header */}
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search employee, role, or pay type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs w-60 sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Employee Row</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Spreadsheet Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800 whitespace-nowrap">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th 
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('name')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Employee Name</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3">Pay Type</th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('actualHours')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Actual Hrs</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('flaggedHours')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Flagged Hrs</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('efficiencyPct')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Efficiency %</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right">Rate of Pay</th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('totalPay')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Total Pay ($)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('laborSales')}
                      >
                        <div className="flex items-center justify-end gap-1 text-emerald-300">
                          <span>Labor Sales ($)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('grossProfit')}
                      >
                        <div className="flex items-center justify-end gap-1 text-emerald-300">
                          <span>Gross Profit ($)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('grossProfitPct')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Gross %</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('netProfit')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Net Profit ($)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th 
                        className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-800"
                        onClick={() => handleSortClick('netProfitPct')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Net %</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {computedRows.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-500">
                          <p className="font-semibold text-sm">No employees listed in this sheet.</p>
                          <p className="text-xs text-slate-400 mt-1">Click "+ Add Employee Row" or "Sync Names from Staff" above.</p>
                        </td>
                      </tr>
                    ) : (
                      computedRows.map((r, index) => {
                        const isFlatRate = r.payType === 'FLAT_RATE';
                        const isHourly = r.payType === 'HOURLY';
                        const isSalary = r.payType === 'SALARY';

                        return (
                          <tr 
                            key={r.id} 
                            className="hover:bg-blue-50/40 transition-colors whitespace-nowrap group"
                          >
                            {/* # Index */}
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>

                            {/* Employee Name */}
                            <td className="py-1.5 px-2 font-bold text-slate-900 min-w-[160px]">
                              <input
                                type="text"
                                value={r.name}
                                onChange={(e) => handleUpdateRow(r.id, { name: e.target.value })}
                                className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-bold text-slate-900 focus:outline-hidden"
                                placeholder="Employee Name"
                              />
                            </td>

                            {/* Pay Type Selector (Salary / Flat Rate / Hourly) */}
                            <td className="py-1.5 px-2 min-w-[120px]">
                              <select
                                value={r.payType}
                                onChange={(e) => handleUpdateRow(r.id, { payType: e.target.value as EmployeePayType })}
                                className={`px-2 py-1 text-xs font-bold rounded border cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500 ${
                                  isSalary 
                                    ? 'bg-purple-50 text-purple-800 border-purple-300' 
                                    : isFlatRate 
                                    ? 'bg-blue-50 text-blue-800 border-blue-300' 
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <option value="FLAT_RATE">FLAT RATE</option>
                                <option value="HOURLY">HOURLY</option>
                                <option value="SALARY">SALARY</option>
                              </select>
                            </td>

                            {/* Actual Hours (Clock Hours) */}
                            <td className="py-1.5 px-2 text-right min-w-[85px]">
                              <input
                                type="number"
                                step="0.5"
                                value={r.actualHours}
                                onChange={(e) => handleUpdateRow(r.id, { actualHours: Number(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 text-right font-mono font-bold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-slate-900 focus:outline-hidden"
                              />
                            </td>

                            {/* Flagged Hours (Billed / Produced) */}
                            <td className="py-1.5 px-2 text-right min-w-[85px]">
                              <input
                                type="number"
                                step="0.5"
                                value={r.flaggedHours}
                                onChange={(e) => handleUpdateRow(r.id, { flaggedHours: Number(e.target.value) || 0 })}
                                className="w-20 px-2 py-1 text-right font-mono font-bold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-slate-900 focus:outline-hidden"
                              />
                            </td>

                            {/* Efficiency % (Computed) */}
                            <td className="py-1.5 px-3 text-right font-mono font-black text-xs min-w-[90px]">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                r.efficiencyPct >= 115 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : r.efficiencyPct >= 100 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : r.efficiencyPct >= 85 
                                  ? 'bg-blue-50 text-blue-700' 
                                  : 'bg-amber-50 text-amber-800'
                              }`}>
                                {r.efficiencyPct.toFixed(1)}%
                              </span>
                            </td>

                            {/* Rate of Pay ($/hr or $/wk) */}
                            <td className="py-1.5 px-2 text-right min-w-[110px]">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs">$</span>
                                <input
                                  type="number"
                                  step={isSalary ? '50' : '0.5'}
                                  value={r.payRate}
                                  onChange={(e) => handleUpdateRow(r.id, { payRate: Number(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 text-right font-mono font-bold bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded text-slate-900 focus:outline-hidden"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {isSalary ? '/wk' : '/hr'}
                                </span>
                              </div>
                            </td>

                            {/* Total Pay ($ Computed) */}
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700 text-xs min-w-[95px]">
                              {formatCurrency(r.totalPay)}
                            </td>

                            {/* Labor Sales ($ Direct Input) */}
                            <td className="py-1.5 px-2 text-right min-w-[125px]">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs font-semibold">$</span>
                                <input
                                  type="number"
                                  step="10"
                                  value={r.laborSales ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    handleUpdateRow(r.id, { laborSales: val });
                                  }}
                                  placeholder="0.00"
                                  className="w-24 px-2 py-1 text-right font-mono font-bold bg-white/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded text-slate-900 focus:outline-hidden"
                                />
                              </div>
                            </td>

                            {/* Gross Profit ($ Direct Input) */}
                            <td className="py-1.5 px-2 text-right min-w-[125px]">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs font-semibold">$</span>
                                <input
                                  type="number"
                                  step="10"
                                  value={r.grossProfit ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    handleUpdateRow(r.id, { grossProfit: val });
                                  }}
                                  placeholder="0.00"
                                  className={`w-24 px-2 py-1 text-right font-mono font-black bg-white/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded focus:outline-hidden ${
                                    r.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Gross Profit % (Computed) */}
                            <td className="py-1.5 px-3 text-right font-mono font-black text-[11px] min-w-[85px]">
                              <span className={r.grossProfitPct >= 65 ? 'text-emerald-700 font-extrabold' : 'text-amber-700'}>
                                {r.grossProfitPct.toFixed(1)}%
                              </span>
                            </td>

                            {/* Net Profit ($ User Input or defaults to Gross Profit) */}
                            <td className="py-1.5 px-2 text-right min-w-[125px]">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs font-semibold">$</span>
                                <input
                                  type="number"
                                  step="10"
                                  value={r.manualNetProfit !== undefined && r.manualNetProfit !== null ? r.manualNetProfit : (r.grossProfit ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    handleUpdateRow(r.id, { manualNetProfit: val });
                                  }}
                                  placeholder="0.00"
                                  className={`w-24 px-2 py-1 text-right font-mono font-black bg-white/70 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded focus:outline-hidden ${
                                    r.netProfit >= 0 ? 'text-indigo-700' : 'text-red-600'
                                  }`}
                                />
                              </div>
                            </td>

                            {/* Net Profit % (Computed) */}
                            <td className="py-1.5 px-3 text-right font-mono font-black text-[11px] min-w-[85px]">
                              <span className={r.netProfitPct >= 50 ? 'text-indigo-800 font-extrabold' : 'text-amber-800'}>
                                {r.netProfitPct.toFixed(1)}%
                              </span>
                            </td>

                            {/* Row Action Controls */}
                            <td className="py-1.5 px-2 text-center min-w-[70px]">
                              <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(r)}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-200 transition-colors"
                                  title="Duplicate row"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(r.id, r.name)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Summary Footer Row */}
                  {computedRows.length > 0 && (
                    <tfoot className="bg-slate-900 text-white font-mono font-bold text-xs border-t-2 border-slate-700 whitespace-nowrap">
                      <tr>
                        <td className="py-3 px-3 text-center text-slate-400">Σ</td>
                        <td className="py-3 px-3 uppercase text-[11px] font-black">
                          WEEK TOTALS ({computedRows.length})
                        </td>
                        <td className="py-3 px-3 text-slate-400">--</td>
                        <td className="py-3 px-3 text-right text-white">
                          {activeWeekSummary.totalActualHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-3 text-right text-white">
                          {activeWeekSummary.totalFlaggedHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-black">
                          {activeWeekSummary.overallEfficiencyPct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">--</td>
                        <td className="py-3 px-3 text-right text-rose-300 font-black">
                          {formatCurrency(activeWeekSummary.totalPayroll)}
                        </td>
                        <td className="py-3 px-3 text-right text-white font-black">
                          {formatCurrency(activeWeekSummary.totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-black">
                          {formatCurrency(activeWeekSummary.totalGrossProfit)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-300 font-black">
                          {activeWeekSummary.overallGrossProfitPct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-300 font-black">
                          {formatCurrency(activeWeekSummary.totalNetProfit)}
                        </td>
                        <td className="py-3 px-3 text-right text-indigo-200 font-black">
                          {activeWeekSummary.overallNetProfitPct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">--</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Table Bottom Help Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span><strong>FLAT RATE:</strong> Flagged Hrs × Pay Rate</span>
                  <span>•</span>
                  <span><strong>HOURLY:</strong> Actual Hrs × Pay Rate (1.5x OT after 40h)</span>
                  <span>•</span>
                  <span><strong>SALARY:</strong> Fixed Weekly Base Pay</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleResetToDefaultTemplate}
                    className="text-[11px] text-slate-500 hover:text-blue-700 underline cursor-pointer"
                  >
                    Restore Default Sample Template
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WEEKLY COMPARISON (SIDE-BY-SIDE & VARIANCES)                       */}
        {/* ========================================================================= */}
        {activeTab === 'COMPARISON' && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Week-Over-Week Comparison & Trends
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compare weekly labor production, total payroll cost, shop efficiency, and profitability across recorded weeks.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCreateNewWeek(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Next Week</span>
              </button>
            </div>

            {/* 1. All Weeks Comparative Grid Table */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="p-3 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
                <span>Summary Ledger of All Recorded Pay Periods ({weeks.length} Weeks)</span>
                <span className="text-[11px] text-slate-400 font-normal">Click any week to jump to its spreadsheet</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-300 whitespace-nowrap">
                      <th className="py-2.5 px-3">Pay Period</th>
                      <th className="py-2.5 px-3 text-center">Staff Count</th>
                      <th className="py-2.5 px-3 text-right">Actual Hours</th>
                      <th className="py-2.5 px-3 text-right">Flagged Hours</th>
                      <th className="py-2.5 px-3 text-right">Efficiency %</th>
                      <th className="py-2.5 px-3 text-right">Total Payroll</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      <th className="py-2.5 px-3 text-right">Gross Profit ($)</th>
                      <th className="py-2.5 px-3 text-right">Gross %</th>
                      <th className="py-2.5 px-3 text-right">Net Profit ($)</th>
                      <th className="py-2.5 px-3 text-right">Net %</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {weeks.map((w, idx) => {
                      const summary = computeWeekSummary(w);
                      const prevWeek = weeks[idx + 1] ? computeWeekSummary(weeks[idx + 1]) : null;
                      const flaggedDiff = prevWeek ? summary.totalFlaggedHours - prevWeek.totalFlaggedHours : null;
                      const gpDiff = prevWeek ? summary.totalGrossProfit - prevWeek.totalGrossProfit : null;

                      return (
                        <tr 
                          key={w.id}
                          className={`hover:bg-slate-50 transition-colors whitespace-nowrap ${
                            w.id === selectedWeekId ? 'bg-blue-50/40 font-semibold' : ''
                          }`}
                        >
                          {/* Label */}
                          <td className="py-3 px-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{w.weekLabel}</span>
                              {w.id === selectedWeekId && (
                                <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Staff Count */}
                          <td className="py-3 px-3 text-center font-mono">
                            {summary.employeeCount}
                          </td>

                          {/* Actual Hours */}
                          <td className="py-3 px-3 text-right font-mono">
                            {summary.totalActualHours.toFixed(1)}h
                          </td>

                          {/* Flagged Hours */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            <div className="flex items-center justify-end gap-1">
                              <span>{summary.totalFlaggedHours.toFixed(1)}h</span>
                              {flaggedDiff !== null && (
                                <span className={`text-[10px] font-bold ${flaggedDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  ({flaggedDiff >= 0 ? `+${flaggedDiff.toFixed(1)}` : flaggedDiff.toFixed(1)})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Efficiency % */}
                          <td className="py-3 px-3 text-right font-mono font-black">
                            <span className={summary.overallEfficiencyPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                              {summary.overallEfficiencyPct.toFixed(1)}%
                            </span>
                          </td>

                          {/* Total Payroll */}
                          <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold">
                            {formatCurrency(summary.totalPayroll)}
                          </td>

                          {/* Total Revenue */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(summary.totalRevenue)}
                          </td>

                          {/* Gross Profit */}
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700">
                            <div className="flex items-center justify-end gap-1">
                              <span>{formatCurrency(summary.totalGrossProfit)}</span>
                              {gpDiff !== null && (
                                <span className={`text-[10px] font-bold ${gpDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  ({gpDiff >= 0 ? `+${formatCurrency(gpDiff)}` : `-${formatCurrency(Math.abs(gpDiff))}`})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Gross % */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                            {summary.overallGrossProfitPct.toFixed(1)}%
                          </td>

                          {/* Net Profit */}
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-indigo-700">
                            {formatCurrency(summary.totalNetProfit)}
                          </td>

                          {/* Net % */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-indigo-800">
                            {summary.overallNetProfitPct.toFixed(1)}%
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWeekId(w.id);
                                setActiveTab('SPREADSHEET');
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 rounded border border-blue-200 transition-colors"
                            >
                              Open Sheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Direct Side-by-Side Two-Week Variance Analysis */}
            {weeks.length >= 2 && summaryA && summaryB && (
              <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-blue-600" />
                    <span>Side-by-Side Head-to-Head Comparison</span>
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Week A:</span>
                      <select 
                        value={compareWeekAId} 
                        onChange={(e) => setCompareWeekAId(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold cursor-pointer"
                      >
                        {weeks.map(w => <option key={w.id} value={w.id}>{w.weekLabel}</option>)}
                      </select>
                    </div>

                    <span className="text-slate-400 font-bold">vs</span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Week B:</span>
                      <select 
                        value={compareWeekBId} 
                        onChange={(e) => setCompareWeekBId(e.target.value)}
                        className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold cursor-pointer"
                      >
                        {weeks.map(w => <option key={w.id} value={w.id}>{w.weekLabel}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Variance Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  
                  {/* Flagged Hours Variance */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Flagged Hours Variance</span>
                    <div className="text-lg font-black font-mono mt-1 flex items-baseline gap-1.5">
                      <span>{summaryA.totalFlaggedHours.toFixed(1)}h</span>
                      <span className="text-xs font-normal text-slate-400">vs</span>
                      <span>{summaryB.totalFlaggedHours.toFixed(1)}h</span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${
                      summaryA.totalFlaggedHours >= summaryB.totalFlaggedHours ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {summaryA.totalFlaggedHours >= summaryB.totalFlaggedHours ? '▲' : '▼'} {(summaryA.totalFlaggedHours - summaryB.totalFlaggedHours).toFixed(1)} hrs difference
                    </div>
                  </div>

                  {/* Efficiency Variance */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Efficiency Difference</span>
                    <div className="text-lg font-black font-mono mt-1 flex items-baseline gap-1.5">
                      <span>{summaryA.overallEfficiencyPct.toFixed(1)}%</span>
                      <span className="text-xs font-normal text-slate-400">vs</span>
                      <span>{summaryB.overallEfficiencyPct.toFixed(1)}%</span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${
                      summaryA.overallEfficiencyPct >= summaryB.overallEfficiencyPct ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {summaryA.overallEfficiencyPct >= summaryB.overallEfficiencyPct ? '▲' : '▼'} {(summaryA.overallEfficiencyPct - summaryB.overallEfficiencyPct).toFixed(1)}% difference
                    </div>
                  </div>

                  {/* Gross Profit Variance */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Gross Profit Variance</span>
                    <div className="text-lg font-black font-mono mt-1 flex items-baseline gap-1.5">
                      <span>{formatCurrency(summaryA.totalGrossProfit)}</span>
                      <span className="text-xs font-normal text-slate-400">vs</span>
                      <span>{formatCurrency(summaryB.totalGrossProfit)}</span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${
                      summaryA.totalGrossProfit >= summaryB.totalGrossProfit ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {summaryA.totalGrossProfit >= summaryB.totalGrossProfit ? '▲ +' : '▼ '} {formatCurrency(summaryA.totalGrossProfit - summaryB.totalGrossProfit)}
                    </div>
                  </div>

                  {/* Net Profit Margin Variance */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase block">Net Margin Difference</span>
                    <div className="text-lg font-black font-mono mt-1 flex items-baseline gap-1.5">
                      <span>{summaryA.overallNetProfitPct.toFixed(1)}%</span>
                      <span className="text-xs font-normal text-slate-400">vs</span>
                      <span>{summaryB.overallNetProfitPct.toFixed(1)}%</span>
                    </div>
                    <div className={`text-xs font-bold mt-1 ${
                      summaryA.overallNetProfitPct >= summaryB.overallNetProfitPct ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {summaryA.overallNetProfitPct >= summaryB.overallNetProfitPct ? '▲ +' : '▼ '} {(summaryA.overallNetProfitPct - summaryB.overallNetProfitPct).toFixed(1)}% margin shift
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RUNNING TOTALS & LIFETIME EMPLOYEE ACCUMULATOR                      */}
        {/* ========================================================================= */}
        {activeTab === 'RUNNING_TOTALS' && (
          <div className="space-y-6">
            
            {/* Top Scoreboard Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>Cumulative Running Totals (YTD / Multi-Week)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Continuous cumulative production, total wages paid, gross profits generated, and overall blended margin.
                  </p>
                </div>
                <div className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-300 border border-slate-700">
                  {runningTotals.totalWeeksCount} Completed Weeks Recorded
                </div>
              </div>

              {/* Running KPI Totals */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Cumulative Clock Hrs</span>
                  <div className="text-lg font-mono font-black text-white mt-1">
                    {runningTotals.totalActualHours.toFixed(1)} hrs
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Cumulative Flagged Hrs</span>
                  <div className="text-lg font-mono font-black text-amber-400 mt-1">
                    {runningTotals.totalFlaggedHours.toFixed(1)} hrs
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Blended Efficiency %</span>
                  <div className="text-lg font-mono font-black text-emerald-400 mt-1">
                    {runningTotals.cumulativeEfficiencyPct.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Cumulative Payroll</span>
                  <div className="text-lg font-mono font-black text-rose-400 mt-1">
                    {formatCurrency(runningTotals.totalPayroll)}
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Cumulative Revenue</span>
                  <div className="text-lg font-mono font-black text-blue-300 mt-1">
                    {formatCurrency(runningTotals.totalRevenue)}
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-black block">Cumulative Gross Profit</span>
                  <div className="text-lg font-mono font-black text-emerald-400 mt-1">
                    {formatCurrency(runningTotals.totalGrossProfit)}
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold">
                    {runningTotals.cumulativeGrossProfitPct.toFixed(1)}% Margin
                  </span>
                </div>
              </div>
            </div>

            {/* Per-Employee Cumulative Table */}
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Individual Employee Lifetime / Multi-Week Totals</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Sorted by Total Gross Profit Generated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800 whitespace-nowrap">
                      <th className="py-2.5 px-3">Employee Name</th>
                      <th className="py-2.5 px-3">Pay Type</th>
                      <th className="py-2.5 px-3 text-center">Weeks Logged</th>
                      <th className="py-2.5 px-3 text-right">Total Actual Hrs</th>
                      <th className="py-2.5 px-3 text-right">Total Flagged Hrs</th>
                      <th className="py-2.5 px-3 text-right">Avg Efficiency %</th>
                      <th className="py-2.5 px-3 text-right">Total Pay ($)</th>
                      <th className="py-2.5 px-3 text-right">Revenue Produced</th>
                      <th className="py-2.5 px-3 text-right">Gross Profit ($)</th>
                      <th className="py-2.5 px-3 text-right">Gross Margin %</th>
                      <th className="py-2.5 px-3 text-right">Net Profit ($)</th>
                      <th className="py-2.5 px-3 text-right">Net Margin %</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {employeeCumulativeRecords.map((emp) => (
                      <tr key={emp.employeeName} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {emp.employeeName}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.payType === 'SALARY' ? 'bg-purple-100 text-purple-800' :
                            emp.payType === 'FLAT_RATE' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {emp.payType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">
                          {emp.weeksAppeared}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {emp.totalActualHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {emp.totalFlaggedHours.toFixed(1)}h
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black">
                          <span className={emp.avgEfficiencyPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                            {emp.avgEfficiencyPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold">
                          {formatCurrency(emp.totalPay)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(emp.totalRevenue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">
                          {formatCurrency(emp.totalGrossProfit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                          {emp.grossProfitPct.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-indigo-700">
                          {formatCurrency(emp.totalNetProfit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-indigo-800">
                          {emp.netProfitPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Hidden Isolated Printable Sheet */}
      {activeWeek && activeWeekSummary && (
        <div id="profitability-printable-sheet" className="hidden">
          <div className="p-8 space-y-6 text-slate-900 font-sans">
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">Dealership Employee Profitability & Hours Ledger</h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{activeWeek.weekLabel} • Payroll Cycle: Wednesday to Tuesday</p>
              </div>
              <div className="text-right text-xs">
                <div>Printed: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {/* Scorecard */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Hours</span>
                <div className="font-mono font-bold text-sm">{activeWeekSummary.totalActualHours.toFixed(1)} Act / {activeWeekSummary.totalFlaggedHours.toFixed(1)} Flag</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Shop Efficiency</span>
                <div className="font-mono font-bold text-sm text-emerald-700">{activeWeekSummary.overallEfficiencyPct.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Gross Profit</span>
                <div className="font-mono font-bold text-sm text-emerald-700">{formatCurrency(activeWeekSummary.totalGrossProfit)} ({activeWeekSummary.overallGrossProfitPct.toFixed(1)}%)</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Net Profit</span>
                <div className="font-mono font-bold text-sm text-indigo-700">{formatCurrency(activeWeekSummary.totalNetProfit)} ({activeWeekSummary.overallNetProfitPct.toFixed(1)}%)</div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
              <thead className="bg-slate-100 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-2">Employee</th>
                  <th className="p-2">Pay Type</th>
                  <th className="p-2 text-right">Actual Hrs</th>
                  <th className="p-2 text-right">Flagged Hrs</th>
                  <th className="p-2 text-right">Efficiency %</th>
                  <th className="p-2 text-right">Rate</th>
                  <th className="p-2 text-right">Total Pay</th>
                  <th className="p-2 text-right">Labor Sales</th>
                  <th className="p-2 text-right">Gross Profit</th>
                  <th className="p-2 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeWeek.rows.map(r => {
                  const comp = computeEmployeeRow(r, activeWeek.defaultBurdenPct);
                  return (
                    <tr key={r.id}>
                      <td className="p-2 font-bold">{comp.name}</td>
                      <td className="p-2">{comp.payType}</td>
                      <td className="p-2 text-right font-mono">{comp.actualHours.toFixed(1)}</td>
                      <td className="p-2 text-right font-mono font-bold">{comp.flaggedHours.toFixed(1)}</td>
                      <td className="p-2 text-right font-mono">{comp.efficiencyPct.toFixed(1)}%</td>
                      <td className="p-2 text-right font-mono">${comp.payRate.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(comp.totalPay)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(comp.totalRevenue)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(comp.grossProfit)} ({comp.grossProfitPct.toFixed(1)}%)</td>
                      <td className="p-2 text-right font-mono font-bold">{formatCurrency(comp.netProfit)} ({comp.netProfitPct.toFixed(1)}%)</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

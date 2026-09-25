import React, { useState } from 'react';
import { 
  Clock, 
  RotateCcw, 
  ArrowLeft,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface DayPunch {
  dayName: string;
  in1: string;
  out1: string;
  in2: string;
  out2: string;
}

const DEFAULT_DAYS: DayPunch[] = [
  { dayName: 'Monday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Tuesday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Wednesday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Thursday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Friday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Saturday', in1: '', out1: '', in2: '', out2: '' },
  { dayName: 'Sunday', in1: '', out1: '', in2: '', out2: '' },
];

const PUNCH_FIELDS: (keyof DayPunch)[] = ['in1', 'out1', 'in2', 'out2'];

/**
 * Normalizes input string to standard military time "HH:MM" (00:00 to 23:59).
 * Accepts:
 *   "0800" -> "08:00"
 *   "800"  -> "08:00"
 *   "1300" -> "13:00"
 *   "1730" -> "17:30"
 *   "8"    -> "08:00"
 *   "17"   -> "17:00"
 *   "08:00"-> "08:00"
 *   "5pm"  -> "17:00"
 */
export function normalizeMilitaryTime(raw: string): string {
  if (!raw) return '';
  const s = raw.trim().replace(/\s+/g, '');
  if (!s) return '';

  // Already standard HH:MM
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h >= 0 && h <= 24 && m >= 0 && m < 60) {
      if (h === 24) h = 0;
      return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
    }
  }

  // Pure digits: 1 to 4 digits (e.g. 800, 0800, 1300, 1730, 8, 17)
  const digitsOnly = s.match(/^(\d{1,4})$/);
  if (digitsOnly) {
    const val = digitsOnly[1];
    let h = 0;
    let m = 0;
    if (val.length === 1 || val.length === 2) {
      h = parseInt(val, 10);
      m = 0;
    } else if (val.length === 3) {
      h = parseInt(val.slice(0, 1), 10);
      m = parseInt(val.slice(1), 10);
    } else if (val.length === 4) {
      h = parseInt(val.slice(0, 2), 10);
      m = parseInt(val.slice(2), 10);
    }
    if (h >= 0 && h <= 24 && m >= 0 && m < 60) {
      if (h === 24) h = 0;
      return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
    }
  }

  // Gracefully support 12-hour typing like "5pm" or "1:30pm" by converting to military
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const ap = ampmMatch[3].toLowerCase();
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
    }
  }

  return raw;
}

export function parseMilitaryToMinutes(timeStr: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;
  const norm = normalizeMilitaryTime(timeStr);
  const match = norm.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

function calculateShiftMinutes(inStr: string, outStr: string): number {
  const inMin = parseMilitaryToMinutes(inStr);
  const outMin = parseMilitaryToMinutes(outStr);
  if (inMin === null || outMin === null) return 0;
  if (outMin >= inMin) {
    return outMin - inMin;
  } else {
    // Overnight shift: clocks in late night and clocks out next morning
    return (outMin + 24 * 60) - inMin;
  }
}

function formatMinutesToHoursMins(totalMinutes: number): string {
  if (totalMinutes === 0) return '0h 00m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
}

interface TimeCardCalculatorProps {
  onBackToDashboard?: () => void;
}

export const TimeCardCalculator: React.FC<TimeCardCalculatorProps> = ({ onBackToDashboard }) => {
  const { currentUser } = useApp();
  const isManager = currentUser.role === 'SERVICE_MANAGER';

  // 7 Days punch data: purely in-memory, no persistence
  const [days, setDays] = useState<DayPunch[]>(DEFAULT_DAYS);

  // Security guard: restricted only to Service Manager
  if (!isManager) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
        <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Restricted Manager Tool</h3>
        <p className="text-sm text-slate-600 mt-1">
          The Time Card Calculator is strictly designated for the Service Manager. Your active account ({currentUser.name}) does not have permission.
        </p>
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Return to My Workspace
          </button>
        )}
      </div>
    );
  }

  // Update punch field as user types
  const handlePunchChange = (index: number, field: keyof DayPunch, value: string) => {
    setDays(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Normalize on blur (e.g. typing "0800" or "800" formats to "08:00")
  const handlePunchBlur = (index: number, field: keyof DayPunch, value: string) => {
    if (!value.trim()) return;
    const normalized = normalizeMilitaryTime(value);
    setDays(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: normalized };
      return next;
    });
  };

  const handleClearDay = (index: number) => {
    setDays(prev => {
      const next = [...prev];
      next[index] = { ...next[index], in1: '', out1: '', in2: '', out2: '' };
      return next;
    });
  };

  const handleClearAll = () => {
    setDays(DEFAULT_DAYS);
    setTimeout(() => {
      const first = document.getElementById('punch-input-0') as HTMLInputElement | null;
      if (first) {
        first.focus();
        first.select();
      }
    }, 50);
  };

  // Handle Enter key navigation (press Enter to move to next punch input, Shift+Enter to move back)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    dayIdx: number,
    field: keyof DayPunch
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Normalize current value immediately on Enter
      const currentValue = days[dayIdx][field];
      if (currentValue && currentValue.trim()) {
        const normalized = normalizeMilitaryTime(currentValue);
        setDays(prev => {
          const next = [...prev];
          next[dayIdx] = { ...next[dayIdx], [field]: normalized };
          return next;
        });
      }

      const fieldIdx = PUNCH_FIELDS.indexOf(field);
      const currentFlat = dayIdx * 4 + fieldIdx;
      const totalInputs = 7 * 4; // 28 inputs total (7 days x 4 punches)

      const targetFlat = e.shiftKey
        ? (currentFlat - 1 + totalInputs) % totalInputs
        : (currentFlat + 1) % totalInputs;

      const nextInput = document.getElementById(`punch-input-${targetFlat}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowDown') {
      // Move to same punch column on next day
      e.preventDefault();
      const fieldIdx = PUNCH_FIELDS.indexOf(field);
      const nextDayIdx = (dayIdx + 1) % 7;
      const targetFlat = nextDayIdx * 4 + fieldIdx;
      const nextInput = document.getElementById(`punch-input-${targetFlat}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      // Move to same punch column on previous day
      e.preventDefault();
      const fieldIdx = PUNCH_FIELDS.indexOf(field);
      const prevDayIdx = (dayIdx - 1 + 7) % 7;
      const targetFlat = prevDayIdx * 4 + fieldIdx;
      const nextInput = document.getElementById(`punch-input-${targetFlat}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Calculations per day
  const dailyCalculations = days.map(day => {
    const shift1Min = calculateShiftMinutes(day.in1, day.out1);
    const shift2Min = calculateShiftMinutes(day.in2, day.out2);
    const totalMin = shift1Min + shift2Min;
    const decimalHours = totalMin / 60;

    return {
      shift1Min,
      shift2Min,
      totalMin,
      formattedHrmin: formatMinutesToHoursMins(totalMin),
      decimalHours: Number(decimalHours.toFixed(2))
    };
  });

  // Weekly Total
  const totalWeeklyMinutes = dailyCalculations.reduce((sum, d) => sum + d.totalMin, 0);
  const totalWeeklyHours = Number((totalWeeklyMinutes / 60).toFixed(2));

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Return to Master Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2 rounded-xl bg-slate-900 text-white shadow-2xs">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Time Card Calculator
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500 font-medium">
                Military Time (00:00 – 23:59)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Press Enter ↵ to advance
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Result Banner with Clear All Action */}
      <div className="bg-white p-4 rounded-xl border-2 border-slate-900 shadow-2xs flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Hours
          </div>
          <div className="text-xs text-slate-400 font-medium mt-0.5">
            {formatMinutesToHoursMins(totalWeeklyMinutes)} exact
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-emerald-700 font-mono tracking-tight">
              {totalWeeklyHours.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-slate-600">hrs</span>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          <button
            type="button"
            onClick={handleClearAll}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow"
            title="Clear all inputs and reset to 0"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-300" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* 7-DAY TIME CLOCK CALCULATOR (IN - OUT - IN - OUT) */}
      <div className="bg-white rounded-xl border-2 border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="px-4 py-3 w-36">Day</th>
                <th className="px-4 py-3 text-center bg-slate-800 border-l border-r border-slate-700" colSpan={2}>
                  Shift 1
                </th>
                <th className="px-4 py-3 text-center bg-slate-850 border-r border-slate-700" colSpan={2}>
                  Shift 2
                </th>
                <th className="px-4 py-3 text-center w-36">Total</th>
                <th className="px-3 py-3 text-center w-16">Clear</th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                <th className="px-4 py-2">Day of Week</th>
                <th className="px-3 py-2 text-center text-slate-800 bg-slate-200/60">IN</th>
                <th className="px-3 py-2 text-center text-slate-800 bg-slate-200/60 border-r border-slate-300">OUT</th>
                <th className="px-3 py-2 text-center text-slate-800 bg-slate-200/30">IN</th>
                <th className="px-3 py-2 text-center text-slate-800 bg-slate-200/30 border-r border-slate-300">OUT</th>
                <th className="px-4 py-2 text-center">Hours</th>
                <th className="px-3 py-2 text-center"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-xs">
              {days.map((day, idx) => {
                const calc = dailyCalculations[idx];
                const hasHours = calc.totalMin > 0;
                const isWeekend = day.dayName === 'Saturday' || day.dayName === 'Sunday';

                return (
                  <tr 
                    key={day.dayName}
                    className={`transition-colors ${
                      hasHours 
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/70' 
                        : isWeekend 
                        ? 'bg-slate-50/60 hover:bg-slate-100/60' 
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    {/* Day Name */}
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${hasHours ? 'bg-emerald-600' : 'bg-slate-300'}`}></span>
                        <span>{day.dayName}</span>
                      </div>
                    </td>

                    {/* Shift 1 IN */}
                    <td className="px-2 py-2 text-center bg-slate-50/40">
                      <input
                        id={`punch-input-${idx * 4 + 0}`}
                        type="text"
                        inputMode="numeric"
                        value={day.in1}
                        onChange={e => handlePunchChange(idx, 'in1', e.target.value)}
                        onBlur={e => handlePunchBlur(idx, 'in1', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, 'in1')}
                        onFocus={e => e.target.select()}
                        placeholder="00:00"
                        maxLength={5}
                        className="w-24 text-xs font-mono font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        title={`${day.dayName} Shift 1 IN (Press Enter to advance)`}
                      />
                    </td>

                    {/* Shift 1 OUT */}
                    <td className="px-2 py-2 text-center bg-slate-50/40 border-r border-slate-200">
                      <input
                        id={`punch-input-${idx * 4 + 1}`}
                        type="text"
                        inputMode="numeric"
                        value={day.out1}
                        onChange={e => handlePunchChange(idx, 'out1', e.target.value)}
                        onBlur={e => handlePunchBlur(idx, 'out1', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, 'out1')}
                        onFocus={e => e.target.select()}
                        placeholder="00:00"
                        maxLength={5}
                        className="w-24 text-xs font-mono font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        title={`${day.dayName} Shift 1 OUT (Press Enter to advance)`}
                      />
                    </td>

                    {/* Shift 2 IN */}
                    <td className="px-2 py-2 text-center bg-slate-50/20">
                      <input
                        id={`punch-input-${idx * 4 + 2}`}
                        type="text"
                        inputMode="numeric"
                        value={day.in2}
                        onChange={e => handlePunchChange(idx, 'in2', e.target.value)}
                        onBlur={e => handlePunchBlur(idx, 'in2', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, 'in2')}
                        onFocus={e => e.target.select()}
                        placeholder="00:00"
                        maxLength={5}
                        className="w-24 text-xs font-mono font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        title={`${day.dayName} Shift 2 IN (Press Enter to advance)`}
                      />
                    </td>

                    {/* Shift 2 OUT */}
                    <td className="px-2 py-2 text-center bg-slate-50/20 border-r border-slate-200">
                      <input
                        id={`punch-input-${idx * 4 + 3}`}
                        type="text"
                        inputMode="numeric"
                        value={day.out2}
                        onChange={e => handlePunchChange(idx, 'out2', e.target.value)}
                        onBlur={e => handlePunchBlur(idx, 'out2', e.target.value)}
                        onKeyDown={e => handleKeyDown(e, idx, 'out2')}
                        onFocus={e => e.target.select()}
                        placeholder="00:00"
                        maxLength={5}
                        className="w-24 text-xs font-mono font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-2xs"
                        title={`${day.dayName} Shift 2 OUT (Press Enter to advance)`}
                      />
                    </td>

                    {/* Daily Total Output */}
                    <td className="px-4 py-2 text-center whitespace-nowrap">
                      <div className="font-mono text-sm font-black text-slate-900">
                        {calc.decimalHours.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">hrs</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {calc.formattedHrmin}
                      </div>
                    </td>

                    {/* Row Clear */}
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleClearDay(idx)}
                        disabled={!day.in1 && !day.out1 && !day.in2 && !day.out2}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Clear day"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer: Total Row */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-950">
                <td className="px-4 py-3 font-black text-xs uppercase tracking-wider">
                  Total:
                </td>
                <td colSpan={4} className="px-4 py-3 text-xs text-slate-400 text-center">
                  7-Day Total Hours
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="font-mono text-base font-black text-emerald-400">
                    {totalWeeklyHours.toFixed(2)} hrs
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {formatMinutesToHoursMins(totalWeeklyMinutes)}
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    title="Clear all punches"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Quick Action Bottom Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 rounded shadow-2xs text-slate-800">
            Enter ↵
          </kbd>
          <span>to advance to the next punch</span>
        </div>

        <button
          type="button"
          onClick={handleClearAll}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          title="Clear all inputs and reset to 0"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Clear All Punches</span>
        </button>
      </div>
    </div>
  );
};

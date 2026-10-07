import React from 'react';
import { Clock, Plus, Trash2, History } from 'lucide-react';
import { RepairOrder, WarrantyLaborTimePunch } from '../types';
import { formatMilitaryDateTime } from '../utils/formatters';
import { useApp } from '../context/AppContext';

interface LineTimePunchesSectionProps {
  ro: RepairOrder;
  lineNum: number;
  lineTitle?: string;
  onAddPastPunch?: (lineNum: number, lineTitle?: string) => void;
}

export const LineTimePunchesSection: React.FC<LineTimePunchesSectionProps> = ({
  ro,
  lineNum,
  lineTitle,
  onAddPastPunch
}) => {
  const { currentUser, deleteTimePunch } = useApp();
  const punches = ro.timePunches || [];

  const totalLinesCount = (ro.concerns?.length || (ro.primaryConcern ? 1 : 0)) + (ro.recommendations?.length || 0);

  // Get punches for this line
  const linePunches = punches.filter(p => {
    if (totalLinesCount <= 1 && (!p.roLineNumber || p.roLineNumber === 1)) return true;
    return p.roLineNumber === lineNum;
  });

  // Active punch on this line
  const activeLinePunch = punches.find(p => !p.clockOut && (totalLinesCount <= 1 || p.roLineNumber === lineNum));

  // Calculate total minutes for this line
  const totalMinutes = linePunches.reduce((acc, p) => {
    if (p.durationMinutes) {
      return acc + p.durationMinutes;
    } else if (p.clockIn && !p.clockOut) {
      const elapsed = Math.max(1, Math.round((Date.now() - new Date(p.clockIn).getTime()) / 60000));
      return acc + elapsed;
    }
    return acc;
  }, 0);

  const totalHoursFormatted = (totalMinutes / 60).toFixed(2);
  const totalHoursInt = Math.floor(totalMinutes / 60);
  const totalMinsInt = totalMinutes % 60;

  const formatPunchTime = (isoString?: string) => {
    if (!isoString) return 'In-Progress (Active)';
    return formatMilitaryDateTime(isoString);
  };

  return (
    <div className="bg-white p-3 rounded-lg border-2 border-slate-300 space-y-2 shadow-2xs text-xs">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-black text-slate-900">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Line {lineNum} Labor Time Clock Logs</span>
          </div>
          {activeLinePunch ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeLinePunch.techName} Clocked In</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-black text-xs px-2.5 py-1 bg-blue-50 text-blue-950 rounded border border-blue-300">
            Line Total: {totalHoursInt}h {totalMinsInt}m ({totalHoursFormatted} hrs)
          </span>

          {onAddPastPunch && (
            <button
              type="button"
              onClick={() => onAddPastPunch(lineNum, lineTitle)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title={`Add past punch to Line ${lineNum}`}
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Add Past Punch</span>
            </button>
          )}
        </div>
      </div>

      {linePunches.length === 0 ? (
        <div className="py-2 px-3 bg-slate-50 rounded border border-dashed border-slate-300 text-slate-500 text-center italic text-[11px]">
          No time clock punches logged for Line {lineNum} yet. Use "Clock In" on the header or "+ Add Past Punch" to record labor time.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black text-slate-700 uppercase">
                <th className="py-1.5 px-2 text-center w-8">#</th>
                <th className="py-1.5 px-2">Technician</th>
                <th className="py-1.5 px-2">Phase</th>
                <th className="py-1.5 px-2">Clock In (Start)</th>
                <th className="py-1.5 px-2">Clock Out (End)</th>
                <th className="py-1.5 px-2 text-right">Elapsed</th>
                <th className="py-1.5 px-2">Work Notes</th>
                {(currentUser.role === 'TECHNICIAN' || currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                  <th className="py-1.5 px-2 text-center w-8"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {linePunches.map((punch, idx) => {
                const isPunchActive = !punch.clockOut;
                const durationHrs = punch.durationMinutes ? (punch.durationMinutes / 60).toFixed(2) : '--';
                const durationFormatted = punch.durationMinutes 
                  ? `${Math.floor(punch.durationMinutes / 60)}h ${punch.durationMinutes % 60}m (${durationHrs}h)` 
                  : 'Active';

                return (
                  <tr key={punch.id || idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-500 text-[11px]">{idx + 1}</td>
                    <td className="py-1.5 px-2 font-bold text-slate-900 whitespace-nowrap text-[11px]">
                      {punch.techName}
                      {punch.techEmployeeNumber && (
                        <span className="text-[10px] font-mono text-slate-500 block">
                          #{punch.techEmployeeNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                        {punch.operationType || 'REPAIR'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-800 whitespace-nowrap text-[11px]">
                      {formatPunchTime(punch.clockIn)}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-slate-800 whitespace-nowrap text-[11px]">
                      {isPunchActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300 text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>In-Progress</span>
                        </span>
                      ) : (
                        formatPunchTime(punch.clockOut)
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-black text-right whitespace-nowrap text-[11px] text-slate-900">
                      {durationFormatted}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 text-[11px] max-w-xs truncate">
                      {punch.notes || '--'}
                    </td>
                    {(currentUser.role === 'TECHNICIAN' || currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                      <td className="py-1.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove punch #${idx + 1} (${punch.techName}) from Line ${lineNum}?`)) {
                              deleteTimePunch(ro.id, punch.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove punch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

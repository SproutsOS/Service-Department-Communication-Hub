import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Play, 
  Square, 
  Plus, 
  Printer, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  ShieldCheck, 
  History, 
  AlertCircle,
  Wrench,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, WarrantyLaborTimePunch, WarrantyOperationType } from '../types';

interface WarrantyTimeClockSectionProps {
  ro: RepairOrder;
  compact?: boolean;
}

export const WarrantyTimeClockSection: React.FC<WarrantyTimeClockSectionProps> = ({ 
  ro, 
  compact = false 
}) => {
  const { 
    currentUser, 
    clockInToRO, 
    clockOutOfRO, 
    addManualTimePunch, 
    deleteTimePunch,
    openWarrantyPrintModal 
  } = useApp();

  const punches = ro.timePunches || [];

  // Determine if currentUser is currently clocked in to this RO
  const myActivePunch = useMemo(() => {
    return punches.find(p => !p.clockOut && p.techId === currentUser.id);
  }, [punches, currentUser.id]);

  // Determine if ANY tech is clocked in
  const anyActivePunch = useMemo(() => {
    return punches.find(p => !p.clockOut);
  }, [punches]);

  // Live timer for active punch
  const [activeElapsedSecs, setActiveElapsedSecs] = useState<number>(0);

  useEffect(() => {
    const activePunch = myActivePunch || anyActivePunch;
    if (!activePunch) {
      setActiveElapsedSecs(0);
      return;
    }

    const calcElapsed = () => {
      const inMs = new Date(activePunch.clockIn).getTime();
      const diffSecs = Math.max(0, Math.floor((Date.now() - inMs) / 1000));
      setActiveElapsedSecs(diffSecs);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [myActivePunch, anyActivePunch]);

  // Quick inputs
  const [clockInNotes, setClockInNotes] = useState('');
  const [clockInOpType, setClockInOpType] = useState<WarrantyOperationType>('REPAIR');
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Manual past punch modal state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('08:00');
  const [manualEndTime, setManualEndTime] = useState('09:30');
  const [manualTechName, setManualTechName] = useState(currentUser.name);
  const [manualOpType, setManualOpType] = useState<WarrantyOperationType>('REPAIR');
  const [manualNotes, setManualNotes] = useState('');

  // Format seconds to hh:mm:ss
  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate cumulative minutes across closed punches + active punch
  const totalMinutes = useMemo(() => {
    return punches.reduce((acc, p) => {
      if (p.durationMinutes) return acc + p.durationMinutes;
      if (p.clockIn && !p.clockOut) {
        const inMs = new Date(p.clockIn).getTime();
        const mins = Math.max(1, Math.round((Date.now() - inMs) / 60000));
        return acc + mins;
      }
      return acc;
    }, 0);
  }, [punches, activeElapsedSecs]);

  const totalHoursFormatted = (totalMinutes / 60).toFixed(2);
  const totalHoursInt = Math.floor(totalMinutes / 60);
  const totalMinsInt = totalMinutes % 60;

  const handleClockIn = () => {
    const res = clockInToRO(ro.id, clockInNotes, clockInOpType);
    setActionFeedback(res.message);
    setClockInNotes('');
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleClockOut = () => {
    const punchToClose = myActivePunch || anyActivePunch;
    if (!punchToClose) return;
    const res = clockOutOfRO(ro.id, punchToClose.id, clockOutNotes);
    setActionFeedback(res.message);
    setClockOutNotes('');
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleAddManualPunch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const clockInISO = new Date(`${manualDate}T${manualStartTime}:00`).toISOString();
      const clockOutISO = new Date(`${manualDate}T${manualEndTime}:00`).toISOString();

      addManualTimePunch(ro.id, {
        techId: currentUser.id,
        techName: manualTechName.trim() || currentUser.name,
        techEmployeeNumber: currentUser.employeeNumber,
        clockIn: clockInISO,
        clockOut: clockOutISO,
        operationType: manualOpType,
        notes: manualNotes.trim() || undefined,
      });

      setIsManualModalOpen(false);
      setManualNotes('');
      setActionFeedback(`Manual time punch recorded successfully.`);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      alert('Invalid date or time entered. Please verify the timestamps.');
    }
  };

  const formatPunchTime = (isoString?: string) => {
    if (!isoString) return 'In-Progress';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
    } catch {
      return isoString;
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
      className="bg-white rounded-xl border-2 border-slate-300 shadow-2xs overflow-hidden"
    >
      
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 rounded-lg text-white shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight">Warranty Labor Time Clock</h4>
              {myActivePunch ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>CLOCKED IN ({formatTimer(activeElapsedSecs)})</span>
                </span>
              ) : anyActivePunch ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{anyActivePunch.techName} Clocked In</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  CLOCKED OUT
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Official multi-punch warranty labor verification with itemized start & end times
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Add past or offline warranty punch"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Past Punch</span>
          </button>

          <button
            type="button"
            onClick={() => openWarrantyPrintModal(ro.id)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Cause & Correction with all Start & End Times"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Warranty Sheet 🖨️</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Main Interactive Controls */}
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        {myActivePunch ? (
          /* Active Punch Bar - Clock Out */
          <div className="bg-white p-4 rounded-xl border-2 border-emerald-500 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 shrink-0">
                  <Play className="w-5 h-5 fill-emerald-600 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Currently Active On Ticket #{ro.id}
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {myActivePunch.techName}
                    {myActivePunch.techEmployeeNumber && (
                      <span className="text-xs font-mono font-normal text-slate-500 ml-1.5">
                        (Emp #{myActivePunch.techEmployeeNumber})
                      </span>
                    )}
                    <span className="ml-2 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {myActivePunch.operationType || 'REPAIR'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] text-slate-500 font-bold uppercase">Elapsed Time</div>
                <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  {formatTimer(activeElapsedSecs)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Started at {new Date(myActivePunch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={clockOutNotes}
                onChange={(e) => setClockOutNotes(e.target.value)}
                placeholder="Optional punch notes (e.g., Replaced alternator, tensioned serpentine belt, verified 14.2V output)..."
                className="w-full px-3 py-2 text-xs border-2 border-slate-400 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={handleClockOut}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-colors shadow-xs cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Clock Out of Ticket</span>
              </button>
            </div>
          </div>
        ) : (
          /* Clock In Form */
          <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>Clock In to Start Work Session on RO #{ro.id}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Logged for technician: <strong className="text-slate-800">{currentUser.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <select
                  value={clockInOpType}
                  onChange={(e) => setClockInOpType(e.target.value as WarrantyOperationType)}
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-slate-400 rounded-lg text-slate-800 bg-white"
                >
                  <option value="DIAGNOSTIC">Diagnostic Scan & Testing</option>
                  <option value="REPAIR">Component Repair / Assembly</option>
                  <option value="ROAD_TEST">Road Test & Verification</option>
                  <option value="WAITING_PARTS">Teardown / Staging</option>
                  <option value="GENERAL">General Warranty Service</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2">
                <input
                  type="text"
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  placeholder="Optional session objective (e.g., Pulling intake manifold to inspect gaskets)..."
                  className="w-full px-3 py-2 text-xs border-2 border-slate-400 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={handleClockIn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Clock In</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics & Punch History */}
      <div className="p-4 space-y-3">
        
        {/* Total Time Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Punches</div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {punches.length} {punches.length === 1 ? 'Session' : 'Sessions'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Total Hours (Decimal)</div>
            <div className="text-base font-black text-blue-900 mt-0.5">
              {totalHoursFormatted} hrs
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-[10px] uppercase font-bold text-slate-500">Standard Duration</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {totalHoursInt}h {totalMinsInt}m
            </div>
          </div>

          <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200">
            <div className="text-[10px] uppercase font-bold text-blue-700">Official Print</div>
            <button
              type="button"
              onClick={() => openWarrantyPrintModal(ro.id)}
              className="mt-0.5 text-xs font-bold text-blue-800 hover:text-blue-950 underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Punch Log Table */}
        {punches.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500 italic">
            No time clock punches recorded on this repair order yet. Technicians can click "Clock In" above to start warranty labor tracking.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th className="py-2 px-2.5">Technician</th>
                  <th className="py-2 px-2.5">Phase</th>
                  <th className="py-2 px-2.5">Start Time</th>
                  <th className="py-2 px-2.5">End Time</th>
                  <th className="py-2 px-2.5 text-right">Elapsed</th>
                  <th className="py-2 px-2.5">Work Notes</th>
                  {(currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                    <th className="py-2 px-2.5 w-12 text-center">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {punches.map((punch, idx) => {
                  const durationHrs = punch.durationMinutes ? (punch.durationMinutes / 60).toFixed(2) : '--';
                  const durationFormatted = punch.durationMinutes 
                    ? `${Math.floor(punch.durationMinutes / 60)}h ${punch.durationMinutes % 60}m (${durationHrs}h)` 
                    : 'Active';

                  return (
                    <tr key={punch.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {punch.techName}
                        {punch.techEmployeeNumber && (
                          <span className="text-[10px] font-mono text-slate-500 block">
                            #{punch.techEmployeeNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                          {punch.operationType || 'REPAIR'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                        {formatPunchTime(punch.clockIn)}
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                        {punch.clockOut ? (
                          formatPunchTime(punch.clockOut)
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active ({formatTimer(activeElapsedSecs)})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                        {durationFormatted}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 text-[11px] max-w-xs truncate">
                        {punch.notes || '--'}
                      </td>
                      {(currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                        <td className="py-2 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove time punch #${idx + 1} for ${punch.techName}?`)) {
                                deleteTimePunch(ro.id, punch.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete punch entry"
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

      {/* Manual Past Punch Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-xl border-2 border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Past / Manual Warranty Labor Punch</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualPunch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Technician Name</label>
                <input
                  type="text"
                  value={manualTechName}
                  onChange={(e) => setManualTechName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-400 rounded-lg text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operation / Phase</label>
                <select
                  value={manualOpType}
                  onChange={(e) => setManualOpType(e.target.value as WarrantyOperationType)}
                  className="w-full px-3 py-2 font-bold border-2 border-slate-400 rounded-lg text-slate-800"
                >
                  <option value="DIAGNOSTIC">Diagnostic Scan & Testing</option>
                  <option value="REPAIR">Component Repair / Assembly</option>
                  <option value="ROAD_TEST">Road Test & Verification</option>
                  <option value="WAITING_PARTS">Teardown / Staging</option>
                  <option value="GENERAL">General Warranty Service</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock In</label>
                  <input
                    type="time"
                    value={manualStartTime}
                    onChange={(e) => setManualStartTime(e.target.value)}
                    className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clock Out</label>
                  <input
                    type="time"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                    className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Description / Warranty Notes</label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Diagnosed open circuit on wire harness, soldered wire splice and heat shrunk..."
                  className="w-full px-3 py-2 border-2 border-slate-400 rounded-lg text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

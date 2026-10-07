import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Wrench, 
  Clock, 
  Package, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  Play, 
  Square,
  Calendar, 
  Send,
  Truck,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  FileText,
  ExternalLink,
  Calculator,
  Copy,
  Printer,
  ShieldCheck,
  Loader2,
  ArrowRight,
  UserCheck,
  Plus,
  Trash2,
  X,
  Eye,
  ShoppingCart,
  Gauge,
  Car,
  History,
  Search,
  Ban,
  PauseCircle,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { ROStatus, RepairOrder, ConcernPayType, WarrantyOperationType } from '../types';
import { formatDateTime, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails, formatTimeOnly, parseLineIndexedField, sortROsNumerically, matchesROSearch } from '../utils/formatters';
import { ROCard } from './ROCard';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { LinePartsSection } from './LinePartsSection';
import { LinePhotoSection } from './LinePhotoSection';
import { LineTimePunchesSection } from './LineTimePunchesSection';
import { TechTestDriveModal } from './TechTestDriveModal';
import { ROStickyNoteBanner, ROStickyNoteChip, AddStickyNoteButton } from './ROStickyNoteBadge';

interface TechCauseCorrectionSectionProps {
  ro: RepairOrder;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
}

export const InlineOutMilesBox: React.FC<{ ro: RepairOrder }> = ({ ro }) => {
  const { updateOutMileage } = useApp();
  const inMiles = ro.vehicle.mileage ?? 0;
  const initialOut = ro.outMileage ?? ro.vehicle.outMileage;
  const [val, setVal] = useState<string>(initialOut !== undefined ? String(initialOut) : '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const currentOut = ro.outMileage ?? ro.vehicle.outMileage;
    if (currentOut !== undefined) {
      setVal(String(currentOut));
    }
  }, [ro.outMileage, ro.vehicle.outMileage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setVal(nextVal);
    const num = nextVal.trim() === '' ? undefined : Number(nextVal);
    if (nextVal.trim() === '' || (!isNaN(Number(nextVal)) && Number(nextVal) >= 0)) {
      updateOutMileage(ro.id, num);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const parsedOut = val.trim() !== '' && !isNaN(Number(val)) ? Number(val) : undefined;
  const diff = parsedOut !== undefined && inMiles > 0 ? parsedOut - inMiles : undefined;

  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg text-xs font-bold border-2 border-slate-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 shadow-2xs transition-all"
    >
      <Gauge className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span className="text-slate-700 font-bold whitespace-nowrap">Miles Out:</span>
      <input
        type="number"
        value={val}
        onChange={handleChange}
        placeholder="Enter Out Miles"
        className="w-24 sm:w-28 px-2 py-0.5 text-xs font-black text-slate-900 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden text-center"
      />
      <span className="text-slate-500 text-[11px] font-bold">mi</span>
      {diff !== undefined && diff >= 0 && (
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap hidden sm:inline">
          +{diff.toFixed(1)} mi
        </span>
      )}
      {isSaved && (
        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
          <Check className="w-3 h-3 text-emerald-600" /> Saved
        </span>
      )}
    </div>
  );
};

interface PastPunchModalProps {
  ro: RepairOrder;
  lineNum?: number;
  lineDescription?: string;
  onClose: () => void;
}

export const TechPastPunchModal: React.FC<PastPunchModalProps> = ({ ro, lineNum, lineDescription, onClose }) => {
  const { currentUser, addManualTimePunch } = useApp();
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('08:00');
  const [manualEndTime, setManualEndTime] = useState('09:30');
  const [manualTechName, setManualTechName] = useState(currentUser.name);
  const [manualOpType, setManualOpType] = useState<WarrantyOperationType>('REPAIR');
  const [manualNotes, setManualNotes] = useState(lineNum ? `Line ${lineNum}${lineDescription ? `: ${lineDescription}` : ''}` : '');

  const handleSubmit = (e: React.FormEvent) => {
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
        roLineNumber: lineNum ? Number(lineNum) : undefined,
        notes: manualNotes.trim() || (lineNum ? `Line ${lineNum}` : undefined),
      });

      onClose();
    } catch {
      alert('Invalid date or time entered. Please verify the timestamps.');
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
    >
      <div className="bg-white w-full max-w-md rounded-xl border-2 border-slate-700 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-blue-600" />
            <span>Add Past Labor Punch {lineNum ? `(Line ${lineNum})` : ''}</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Technician Name</label>
            <input
              type="text"
              value={manualTechName}
              onChange={(e) => setManualTechName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-400 rounded-lg text-slate-900 bg-white"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Operation / Phase</label>
            <select
              value={manualOpType}
              onChange={(e) => setManualOpType(e.target.value as WarrantyOperationType)}
              className="w-full px-3 py-2 font-bold border-2 border-slate-400 rounded-lg text-slate-800 bg-white cursor-pointer"
            >
              <option value="REPAIR">Component Repair / Assembly</option>
              <option value="DIAGNOSTIC">Diagnostic Scan & Testing</option>
              <option value="ROAD_TEST">Road Test & Verification</option>
              <option value="WAITING_PARTS">Teardown / Staging</option>
              <option value="GENERAL">General Labor / Service</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clock In</label>
              <input
                type="time"
                value={manualStartTime}
                onChange={(e) => setManualStartTime(e.target.value)}
                className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs bg-white"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Clock Out</label>
              <input
                type="time"
                value={manualEndTime}
                onChange={(e) => setManualEndTime(e.target.value)}
                className="w-full px-2 py-2 border-2 border-slate-400 rounded-lg text-slate-900 text-xs bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Work Description / Punch Notes</label>
            <textarea
              rows={2}
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="e.g. Completed repair and tested system..."
              className="w-full px-3 py-2 border-2 border-slate-400 rounded-lg text-slate-900 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
            >
              Save Past Punch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TechCauseCorrectionSection: React.FC<TechCauseCorrectionSectionProps> = ({ ro, onRequestParts }) => {
  const { 
    updateTechCauseAndCorrection, 
    openQuoteModal, 
    currentUser, 
    addRepairOrderConcern,
    updateConcernPayType,
    updateConcernTech,
    users,
    clockInToRO,
    clockOutOfRO,
    updateLineLaborHours,
    deletePartItem,
    updatePartItem,
    updateRecommendedService,
    deleteRecommendedService
  } = useApp();

  const canSelectPayType = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';
  const canAssignTech = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';

  const myActivePunch = ro.timePunches?.find(
    p => p.techId === currentUser.id && p.clockIn && !p.clockOut
  );
  const anyActivePunch = ro.timePunches?.find(
    p => p.clockIn && !p.clockOut
  );
  const activePunch = myActivePunch || (currentUser.role !== 'TECHNICIAN' ? anyActivePunch : undefined);
  const isClockedIn = Boolean(activePunch);

  // Manual Past Punch Modal state
  const [pastPunchModal, setPastPunchModal] = useState<{ isOpen: boolean; lineNum?: number; concernText?: string } | null>(null);

  // Live timer for active punch
  const [activeElapsedSecs, setActiveElapsedSecs] = useState<number>(0);

  useEffect(() => {
    if (!activePunch) {
      setActiveElapsedSecs(0);
      return;
    }
    const inMs = new Date(activePunch.clockIn).getTime();
    const updateElapsed = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - inMs) / 1000));
      setActiveElapsedSecs(diffSecs);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activePunch?.id, activePunch?.clockIn]);

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const recommendations = ro.recommendations || [];

  // Genuine customer complaints (excluding any that match active recommendations to prevent duplicate line cards)
  const lines = useMemo(() => {
    const rawList = (ro.concerns && ro.concerns.length > 0)
      ? ro.concerns
      : [ro.primaryConcern || 'Customer Concern'];

    if (recommendations.length === 0) return rawList;

    const recNames = new Set(
      recommendations.map(r => r.serviceName.trim().toLowerCase())
    );

    // Keep primary concern at index 0, filter any subsequent concerns that match recommendations
    const filtered = rawList.filter((c, idx) => {
      if (idx === 0) return true;
      return !recNames.has(c.trim().toLowerCase());
    });

    return filtered.length > 0 ? filtered : rawList;
  }, [ro.concerns, ro.primaryConcern, recommendations]);

  // Track recommendation fields inside TechCauseCorrectionSection
  const [recHours, setRecHours] = useState<Record<string, string>>({});
  const [recCauses, setRecCauses] = useState<Record<string, string>>({});
  const [recCorrections, setRecCorrections] = useState<Record<string, string>>({});
  const recDebounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const focusedRecFieldRef = useRef<{ recId: string; field: 'cause' | 'correction' | 'hours' } | null>(null);

  useEffect(() => {
    const nextH: Record<string, string> = {};
    const nextC: Record<string, string> = {};
    const nextCorr: Record<string, string> = {};

    recommendations.forEach(rec => {
      if (focusedRecFieldRef.current?.recId === rec.id) {
        nextH[rec.id] = recHours[rec.id] ?? (rec.laborHours !== undefined ? String(rec.laborHours) : '');
        nextC[rec.id] = recCauses[rec.id] ?? (rec.cause || '');
        nextCorr[rec.id] = recCorrections[rec.id] ?? (rec.correction || '');
      } else {
        nextH[rec.id] = rec.laborHours !== undefined ? String(rec.laborHours) : '';
        nextC[rec.id] = rec.cause || '';
        nextCorr[rec.id] = rec.correction || '';
      }
    });

    setRecHours(nextH);
    setRecCauses(nextC);
    setRecCorrections(nextCorr);
  }, [ro.recommendations]);

  const handleRecCauseChange = (recId: string, val: string) => {
    setRecCauses(prev => ({ ...prev, [recId]: val }));
    if (recDebounceTimersRef.current[`cause_${recId}`]) {
      clearTimeout(recDebounceTimersRef.current[`cause_${recId}`]);
    }
    recDebounceTimersRef.current[`cause_${recId}`] = setTimeout(() => {
      updateRecommendedService(ro.id, recId, { cause: val });
    }, 600);
  };

  const handleRecCorrectionChange = (recId: string, val: string) => {
    setRecCorrections(prev => ({ ...prev, [recId]: val }));
    if (recDebounceTimersRef.current[`corr_${recId}`]) {
      clearTimeout(recDebounceTimersRef.current[`corr_${recId}`]);
    }
    recDebounceTimersRef.current[`corr_${recId}`] = setTimeout(() => {
      updateRecommendedService(ro.id, recId, { correction: val });
    }, 600);
  };

  const handleRecHoursChange = (recId: string, val: string, globalLineNum: number) => {
    setRecHours(prev => ({ ...prev, [recId]: val }));
    if (recDebounceTimersRef.current[`hours_${recId}`]) {
      clearTimeout(recDebounceTimersRef.current[`hours_${recId}`]);
    }
    recDebounceTimersRef.current[`hours_${recId}`] = setTimeout(() => {
      updateLineLaborHours(ro.id, globalLineNum - 1, val);
    }, 600);
  };

  // Track requested labor hours per line (mirrored to quote)
  const [lineHours, setLineHours] = useState<string[]>(() => {
    return lines.map((_, idx) => {
      const matched = ro.quote?.laborItems?.find(item => item.roLineNumber === idx + 1);
      return (matched?.laborHours !== undefined && matched.laborHours !== null && matched.laborHours !== 0)
        ? String(matched.laborHours)
        : '';
    });
  });

  const focusedHoursIdxRef = useRef<number | null>(null);
  const hoursDebounceTimerRef = useRef<Record<number, NodeJS.Timeout>>({});

  useEffect(() => {
    setLineHours(prev => {
      return lines.map((_, idx) => {
        if (focusedHoursIdxRef.current === idx) {
          return prev[idx] || '';
        }
        const matched = ro.quote?.laborItems?.find(item => item.roLineNumber === idx + 1);
        return (matched?.laborHours !== undefined && matched.laborHours !== null && matched.laborHours !== 0)
          ? String(matched.laborHours)
          : '';
      });
    });
  }, [ro.quote?.laborItems, lines.length]);

  const handleLineHoursChange = (idx: number, val: string) => {
    setLineHours(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });

    if (hoursDebounceTimerRef.current[idx]) {
      clearTimeout(hoursDebounceTimerRef.current[idx]);
    }

    hoursDebounceTimerRef.current[idx] = setTimeout(() => {
      updateLineLaborHours(ro.id, idx, val);
    }, 600);
  };

  const handleLineHoursBlur = (idx: number) => {
    focusedHoursIdxRef.current = null;
    if (hoursDebounceTimerRef.current[idx]) {
      clearTimeout(hoursDebounceTimerRef.current[idx]);
      delete hoursDebounceTimerRef.current[idx];
    }
    const currentVal = lineHours[idx] || '0';
    updateLineLaborHours(ro.id, idx, currentVal);
  };

  const [causes, setCauses] = useState<string[]>(() => {
    if (ro.concernCauses && ro.concernCauses.length > 0) {
      return Array.from({ length: lines.length }, (_, i) => ro.concernCauses?.[i] || '');
    }
    return parseLineIndexedField(ro.cause || ro.diagnosticNotes, lines.length);
  });

  const [corrections, setCorrections] = useState<string[]>(() => {
    if (ro.concernCorrections && ro.concernCorrections.length > 0) {
      return Array.from({ length: lines.length }, (_, i) => ro.concernCorrections?.[i] || '');
    }
    return parseLineIndexedField(ro.correction, lines.length);
  });

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewingPartsLineIndex, setViewingPartsLineIndex] = useState<number | null>(null);

  // Quick inline add concern line
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineText, setNewLineText] = useState('');
  const [newLinePayType, setNewLinePayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [newLineHours, setNewLineHours] = useState('');
  const [newLineRequestParts, setNewLineRequestParts] = useState(false);

  // Focus tracking to prevent cursor jumping when typing during real-time Firestore sync
  const focusedFieldRef = useRef<{ index: number; field: 'cause' | 'correction' } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestValuesRef = useRef<{ causes: string[]; corrections: string[] }>({ causes, corrections });

  // Sync state whenever ro prop changes, but NOT while technician is actively focused on a specific textarea
  useEffect(() => {
    const lineCount = lines.length;
    const freshCauses = (ro.concernCauses && ro.concernCauses.length > 0)
      ? Array.from({ length: lineCount }, (_, i) => ro.concernCauses?.[i] || '')
      : parseLineIndexedField(ro.cause || ro.diagnosticNotes, lineCount);

    const freshCorrections = (ro.concernCorrections && ro.concernCorrections.length > 0)
      ? Array.from({ length: lineCount }, (_, i) => ro.concernCorrections?.[i] || '')
      : parseLineIndexedField(ro.correction, lineCount);

    setCauses(prev => {
      const updated = Array.from({ length: lineCount }, (_, i) => {
        if (focusedFieldRef.current?.index === i && focusedFieldRef.current?.field === 'cause') {
          return prev[i] || '';
        }
        return freshCauses[i] ?? '';
      });
      latestValuesRef.current.causes = updated;
      return updated;
    });

    setCorrections(prev => {
      const updated = Array.from({ length: lineCount }, (_, i) => {
        if (focusedFieldRef.current?.index === i && focusedFieldRef.current?.field === 'correction') {
          return prev[i] || '';
        }
        return freshCorrections[i] ?? '';
      });
      latestValuesRef.current.corrections = updated;
      return updated;
    });
  }, [ro.cause, ro.correction, ro.diagnosticNotes, ro.concernCauses, ro.concernCorrections, lines.length]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const completedLinesCount = lines.filter((_, i) => Boolean(causes[i]?.trim() && corrections[i]?.trim())).length;
  const totalLinesCount = lines.length;
  const isComplete = totalLinesCount > 0 && completedLinesCount === totalLinesCount;
  const hasContent = causes.some(c => c?.trim()) || corrections.some(c => c?.trim());

  // Debounced auto-save function
  const triggerAutoSave = (newCauses: string[], newCorrections: string[]) => {
    latestValuesRef.current = { causes: newCauses, corrections: newCorrections };
    setAutoSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const combinedCause = lines.length > 1
        ? newCauses.map((c, i) => c.trim() ? `Line ${i + 1}: ${c.trim()}` : '').filter(Boolean).join('\n\n')
        : (newCauses[0] || '').trim();

      const combinedCorrection = lines.length > 1
        ? newCorrections.map((c, i) => c.trim() ? `Line ${i + 1}: ${c.trim()}` : '').filter(Boolean).join('\n\n')
        : (newCorrections[0] || '').trim();

      updateTechCauseAndCorrection(ro.id, combinedCause, combinedCorrection, {
        isAutoSave: true,
        concernCauses: newCauses,
        concernCorrections: newCorrections
      });
      setAutoSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);
  };

  // Immediate save on blur
  const handleBlurSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const { causes: c, corrections: corr } = latestValuesRef.current;
    const combinedCause = lines.length > 1
      ? c.map((val, i) => val.trim() ? `Line ${i + 1}: ${val.trim()}` : '').filter(Boolean).join('\n\n')
      : (c[0] || '').trim();

    const combinedCorrection = lines.length > 1
      ? corr.map((val, i) => val.trim() ? `Line ${i + 1}: ${val.trim()}` : '').filter(Boolean).join('\n\n')
      : (corr[0] || '').trim();

    updateTechCauseAndCorrection(ro.id, combinedCause, combinedCorrection, {
      isAutoSave: true,
      concernCauses: c,
      concernCorrections: corr
    });
    setAutoSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleManualSave = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const { causes: c, corrections: corr } = latestValuesRef.current;
    const combinedCause = lines.length > 1
      ? c.map((val, i) => val.trim() ? `Line ${i + 1}: ${val.trim()}` : '').filter(Boolean).join('\n\n')
      : (c[0] || '').trim();

    const combinedCorrection = lines.length > 1
      ? corr.map((val, i) => val.trim() ? `Line ${i + 1}: ${val.trim()}` : '').filter(Boolean).join('\n\n')
      : (corr[0] || '').trim();

    const success = updateTechCauseAndCorrection(ro.id, combinedCause, combinedCorrection, {
      isAutoSave: false,
      notify: true,
      concernCauses: c,
      concernCorrections: corr
    });
    if (success) {
      setAutoSaveStatus('saved');
      setIsSavedRecently(true);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setIsSavedRecently(false), 2500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleManualSave(e);
    }
  };

  const handleCauseChange = (index: number, val: string) => {
    setCauses(prev => {
      const next = [...prev];
      next[index] = val;
      latestValuesRef.current.causes = next;
      triggerAutoSave(next, latestValuesRef.current.corrections);
      return next;
    });
  };

  const handleCorrectionChange = (index: number, val: string) => {
    setCorrections(prev => {
      const next = [...prev];
      next[index] = val;
      latestValuesRef.current.corrections = next;
      triggerAutoSave(latestValuesRef.current.causes, next);
      return next;
    });
  };

  const handleAddLineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineText.trim()) return;
    const lineIndex = lines.length;
    const submittedText = newLineText.trim();
    const parsedHours = newLineHours.trim();
    const shouldReqParts = newLineRequestParts;

    const added = addRepairOrderConcern(
      ro.id, 
      submittedText, 
      newLinePayType, 
      undefined, 
      undefined, 
      parsedHours ? Number(parsedHours) : undefined
    );

    if (added) {
      setNewLineText('');
      setNewLineHours('');
      setNewLinePayType('CUSTOMER_PAY');
      setNewLineRequestParts(false);
      setIsAddingLine(false);

      if (shouldReqParts && onRequestParts) {
        onRequestParts(lineIndex, submittedText);
      }
    }
  };

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="bg-white rounded-xl border-2 border-slate-400 overflow-hidden shadow-2xs transition-all"
    >
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-slate-50/90 border-b-2 border-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-100/90 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${isComplete ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-blue-100 text-blue-700 border-blue-300'}`}>
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                Cause & Correction
              </span>
              {isComplete ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> All Lines Documented
                </span>
              ) : hasContent ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-400">
                  {completedLinesCount} of {totalLinesCount} Lines Documented
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-400">
                  Pending Entry
                </span>
              )}
              {/* Auto-Save Live Badge */}
              {autoSaveStatus === 'saving' ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Auto-Saving...
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Auto-Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSavedRecently && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border-2 border-emerald-400 animate-in fade-in flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Saved!
            </span>
          )}
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 p-1 rounded-md"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-4 bg-white" onKeyDown={handleKeyDown}>
          {/* Line-by-Line Cause & Correction Sections */}
          <div className="space-y-4">
            {lines.map((concernText, idx) => {
              const lineCause = causes[idx] || '';
              const lineCorrection = corrections[idx] || '';
              const isLineComplete = Boolean(lineCause.trim() && lineCorrection.trim());
              const isLinePartiallyDone = Boolean(lineCause.trim() || lineCorrection.trim()) && !isLineComplete;
              const isMyLine = ro.concernTechIds?.[idx] === currentUser.id;
              const payType: ConcernPayType = ro.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
              const assignedTechName = ro.concernTechNames?.[idx] || ro.techName;

              const lineParts = (ro.parts || []).filter(p => {
                if (p.roLineNumber !== undefined) {
                  return p.roLineNumber === idx + 1;
                }
                if (p.notes && (p.notes.includes(`Line ${idx + 1}`) || p.notes.includes(`line ${idx + 1}`))) {
                  return true;
                }
                if (lines.length === 1) {
                  return true;
                }
                return false;
              });

              return (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border-2 transition-all space-y-3 shadow-2xs ${
                    isLineComplete 
                      ? 'bg-slate-50/80 border-emerald-400' 
                      : isMyLine
                      ? 'bg-blue-50/40 border-blue-400'
                      : 'bg-slate-50/60 border-slate-300'
                  }`}
                >
                  {/* Line Identification Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-black px-3 py-1 bg-slate-900 text-white rounded-lg uppercase tracking-wider shadow-2xs">
                        Line {idx + 1}
                      </span>

                      {/* Line Authorization Decision Badge: Approved / Denied / Waiting on Approval */}
                      {(() => {
                        const lineNum = idx + 1;
                        const explicitStatus = ro.concernStatuses?.[idx] || ro.quote?.lineStatuses?.[lineNum];

                        if (explicitStatus === 'APPROVED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          );
                        }

                        if (explicitStatus === 'DECLINED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-rose-700">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Denied</span>
                            </span>
                          );
                        }

                        // If whole RO is in approved state
                        if (ro.status === 'APPROVED' || ro.quote?.status === 'APPROVED' || ['PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(ro.status)) {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          );
                        }

                        // If whole RO is denied
                        if (ro.status === 'DENIED' || ro.quote?.status === 'DECLINED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-rose-700">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Denied</span>
                            </span>
                          );
                        }

                        // If quote / estimate is submitted, or if awaiting approval / estimate done / findings completed
                        if (ro.status === 'WAITING_FOR_APPROVAL' || ro.status === 'WAITING_APPROVAL' || ro.status === 'ESTIMATE_DONE' || ro.quote?.status === 'SUBMITTED' || isLineComplete || (lineHours[idx] && Number(lineHours[idx]) > 0)) {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-purple-700 text-white rounded-md flex items-center gap-1 shadow-xs border border-purple-800">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Waiting on Approval</span>
                            </span>
                          );
                        }

                        return null;
                      })()}

                      {canSelectPayType ? (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 px-1 hidden xs:inline uppercase tracking-wider">Type:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateConcernPayType(ro.id, idx, 'CUSTOMER_PAY');
                            }}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              payType === 'CUSTOMER_PAY'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Customer Pay"
                          >
                            Customer Pay
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateConcernPayType(ro.id, idx, 'WARRANTY');
                            }}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              payType === 'WARRANTY'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Warranty"
                          >
                            Warranty
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateConcernPayType(ro.id, idx, 'INTERNAL');
                            }}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              payType === 'INTERNAL'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Internal"
                          >
                            Internal
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateConcernPayType(ro.id, idx, 'EXTENDED_WARRANTY');
                            }}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              payType === 'EXTENDED_WARRANTY'
                                ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Extended Warranty"
                          >
                            Extended Warranty
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-bold px-3 py-1 rounded-md border shadow-2xs ${
                          payType === 'CUSTOMER_PAY'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : payType === 'WARRANTY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : payType === 'INTERNAL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {payType === 'CUSTOMER_PAY' ? 'Customer Pay' : payType === 'WARRANTY' ? 'Warranty' : payType === 'INTERNAL' ? 'Internal' : 'Extended Warranty'}
                        </span>
                      )}

                      {isLineComplete ? (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Line {idx + 1} Documented
                        </span>
                      ) : isLinePartiallyDone ? (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Line {idx + 1} Partially Documented
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
                          Line {idx + 1} Pending
                        </span>
                      )}

                      {/* Clock In / Out Button directly to the right of Line status */}
                      {(() => {
                        const isLineClockedIn = isClockedIn && (activePunch?.roLineNumber === idx + 1 || (!activePunch?.roLineNumber && idx === 0));
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLineClockedIn) {
                                clockOutOfRO(ro.id, activePunch?.id, `Clocked out from Line ${idx + 1}`);
                              } else {
                                clockInToRO(
                                  ro.id, 
                                  `Working on Line ${idx + 1}: ${concernText.slice(0, 50)}`, 
                                  payType === 'WARRANTY' ? 'REPAIR' : 'GENERAL',
                                  idx + 1
                                );
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                              isLineClockedIn
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-300'
                                : isClockedIn
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 hover:shadow-xs active:scale-95'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:shadow-xs active:scale-95'
                            }`}
                            title={
                              isLineClockedIn 
                                ? `Clocked in on RO #${ro.id} Line ${idx + 1} since ${new Date(activePunch!.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatElapsed(activeElapsedSecs)}). Click to clock out.` 
                                : isClockedIn
                                ? `Switch punch to RO #${ro.id} Line ${idx + 1} (will auto clock out of current punch)`
                                : `Clock in to start working on RO #${ro.id} Line ${idx + 1}`
                            }
                          >
                            {isLineClockedIn ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                <Square className="w-3 h-3 fill-white" />
                                <span>Clock Out ({formatElapsed(activeElapsedSecs)})</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isClockedIn ? `Switch to Line ${idx + 1}` : 'Clock In'}</span>
                              </>
                            )}
                          </button>
                        );
                      })()}

                      {/* Add Past Punch Button directly to the right of Clock In */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastPunchModal({ isOpen: true, lineNum: idx + 1, concernText });
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                        title={`Log a completed past labor punch for Line ${idx + 1}`}
                      >
                        <History className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>+ Past Punch</span>
                      </button>

                      {/* Inline Labor Hours Requested Input for Line {idx + 1} (Syncs to Quote) */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border-2 border-slate-400 shadow-sm hover:border-blue-500 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 transition-all"
                        title={`Enter labor hours requested for Line ${idx + 1} — automatically updates the repair quote`}
                      >
                        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider shrink-0">
                          Hours:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="99"
                          placeholder="0.0"
                          value={lineHours[idx] ?? ''}
                          onFocus={() => {
                            focusedHoursIdxRef.current = idx;
                          }}
                          onChange={(e) => handleLineHoursChange(idx, e.target.value)}
                          onBlur={() => handleLineHoursBlur(idx)}
                          className="w-16 sm:w-20 text-sm font-black text-slate-950 bg-slate-100 hover:bg-slate-50 focus:bg-white px-2 py-1 rounded border border-slate-300 focus:border-blue-600 text-center focus:outline-none transition-colors"
                        />
                        <span className="text-xs font-black text-slate-600 pr-0.5">hrs</span>
                      </div>

                      {/* Request Parts directly to the right of hours entry box */}
                      {onRequestParts && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestParts(idx, concernText);
                          }}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title={`Request required parts for Line ${idx + 1} from the Parts Department`}
                        >
                          <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Request Parts</span>
                        </button>
                      )}

                      {/* Parts Buttons directly to the right of Request Parts */}
                      {(() => {
                        const isPartOrdered = (p: typeof lineParts[0]) => 
                          p.status === 'ORDERED' || 
                          p.status === 'IN_TRANSIT' || 
                          p.status === 'IN_STOCK' || 
                          p.status === 'RECEIVED' || 
                          p.status === 'ISSUED_TO_TECH' ||
                          p.status === 'DAILY_ORDER' ||
                          p.status === 'LOCAL_PURCHASE' ||
                          p.status === 'SPECIAL_ORDER' ||
                          p.status === 'SPECIAL_ORDER_1_5_DAYS' ||
                          p.status === 'VOR_UPGRADE';

                        const isPartQuoteOnly = (p: typeof lineParts[0]) => 
                          !isPartOrdered(p) && 
                          p.status !== 'APPROVED' &&
                          p.status !== 'DECLINED' &&
                          p.status !== 'CANCELLED' &&
                          (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY');

                        const isPartRequested = (p: typeof lineParts[0]) => 
                          !isPartOrdered(p) && 
                          p.status !== 'DECLINED' &&
                          p.status !== 'CANCELLED' &&
                          !isPartQuoteOnly(p);

                        const isPartDeclined = (p: typeof lineParts[0]) =>
                          p.status === 'DECLINED' || p.status === 'CANCELLED';

                        const orderedParts = lineParts.filter(isPartOrdered);
                        const quotedParts = lineParts.filter(isPartQuoteOnly);
                        const requestedParts = lineParts.filter(isPartRequested);
                        const declinedParts = lineParts.filter(isPartDeclined);

                        const isOpen = viewingPartsLineIndex === idx;

                        return (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* 1. Parts Ordered Button */}
                            {orderedParts.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPartsLineIndex(isOpen ? null : idx);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  isOpen
                                    ? 'bg-amber-600 text-white border-amber-700 ring-2 ring-amber-300'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
                                }`}
                                title={`View ${orderedParts.length} parts ordered for Line ${idx + 1}`}
                              >
                                <Truck className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-white' : 'text-amber-600'}`} />
                                <span>Parts Ordered</span>
                                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                                  isOpen ? 'bg-white text-slate-900' : 'bg-amber-600 text-white'
                                }`}>
                                  {orderedParts.length}
                                </span>
                              </button>
                            )}

                            {/* 2. Parts on Quote Button (Waiting on Approval) */}
                            {quotedParts.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPartsLineIndex(isOpen ? null : idx);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  isOpen
                                    ? 'bg-purple-700 text-white border-purple-800 ring-2 ring-purple-300'
                                    : 'bg-purple-50 hover:bg-purple-100 text-purple-950 border-purple-300'
                                }`}
                                title={`View ${quotedParts.length} parts on quote waiting on approval for Line ${idx + 1}`}
                              >
                                <Calculator className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-white' : 'text-purple-600'}`} />
                                <span>Parts on Quote</span>
                                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                                  isOpen ? 'bg-white text-slate-900' : 'bg-purple-600 text-white'
                                }`}>
                                  {quotedParts.length}
                                </span>
                              </button>
                            )}

                            {/* 3. Parts Requested Button (if not covered above) */}
                            {requestedParts.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPartsLineIndex(isOpen ? null : idx);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  isOpen
                                    ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300'
                                    : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                                }`}
                                title={`View ${requestedParts.length} parts requested for Line ${idx + 1}`}
                              >
                                <Eye className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-white' : 'text-blue-600'}`} />
                                <span>Parts Requested</span>
                                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                                  isOpen ? 'bg-white text-slate-900' : 'bg-blue-600 text-white'
                                }`}>
                                  {requestedParts.length}
                                </span>
                              </button>
                            )}

                            {/* 4. Parts Declined Button */}
                            {declinedParts.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingPartsLineIndex(isOpen ? null : idx);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                                  isOpen
                                    ? 'bg-red-700 text-white border-red-800 ring-2 ring-red-300'
                                    : 'bg-red-50 hover:bg-red-100 text-red-900 border-red-300'
                                }`}
                                title={`View ${declinedParts.length} declined parts for Line ${idx + 1}`}
                              >
                                <Ban className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-white' : 'text-red-600'}`} />
                                <span>Parts Declined</span>
                                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                                  isOpen ? 'bg-white text-slate-900' : 'bg-red-600 text-white'
                                }`}>
                                  {declinedParts.length}
                                </span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Line Technician Selector / Display */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                      <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
                      {canAssignTech ? (
                        <select
                          value={ro.concernTechIds?.[idx] || ''}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            const tId = e.target.value;
                            const t = users.find(u => u.id === tId);
                            updateConcernTech(ro.id, idx, tId, t?.name);
                          }}
                          className={`text-xs font-bold bg-white border rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer ${
                            ro.concernTechIds?.[idx] === currentUser.id
                              ? 'border-blue-500 text-blue-800 bg-blue-50/50'
                              : 'border-slate-300 text-slate-800'
                          }`}
                          title="Assign technician to this line"
                        >
                          <option value="">{ro.techName ? `(Primary: ${ro.techName})` : 'Unassigned'}</option>
                          {users.filter(u => u.role === 'TECHNICIAN').map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name}{t.id === currentUser.id ? ' (You)' : ''}{t.employeeNumber ? ` #${t.employeeNumber}` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs font-bold text-slate-800">
                          {assignedTechName || ro.techName || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable Parts Requested / Ordered / Quoted for Line {idx + 1} Section */}
                  {viewingPartsLineIndex === idx && (() => {
                    const isPartOrdered = (p: typeof lineParts[0]) => 
                      p.status === 'ORDERED' || 
                      p.status === 'IN_TRANSIT' || 
                      p.status === 'IN_STOCK' || 
                      p.status === 'RECEIVED' || 
                      p.status === 'ISSUED_TO_TECH' ||
                      p.status === 'DAILY_ORDER' ||
                      p.status === 'LOCAL_PURCHASE' ||
                      p.status === 'SPECIAL_ORDER' ||
                      p.status === 'SPECIAL_ORDER_1_5_DAYS' ||
                      p.status === 'VOR_UPGRADE';

                    const isPartQuoteOnly = (p: typeof lineParts[0]) => 
                      !isPartOrdered(p) && 
                      p.status !== 'APPROVED' &&
                      p.status !== 'DECLINED' &&
                      p.status !== 'CANCELLED' &&
                      (p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY');

                    const orderedParts = lineParts.filter(isPartOrdered);
                    const quotedParts = lineParts.filter(isPartQuoteOnly);
                    const hasOrderedParts = orderedParts.length > 0;
                    const hasQuotedParts = quotedParts.length > 0;

                    return (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`p-3.5 rounded-xl border-2 space-y-2.5 shadow-xs animate-in fade-in duration-150 ${
                          hasOrderedParts 
                            ? 'bg-amber-50/80 border-amber-300' 
                            : hasQuotedParts
                            ? 'bg-purple-50/80 border-purple-300'
                            : 'bg-blue-50/80 border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {hasOrderedParts ? (
                              <Truck className="w-4 h-4 text-amber-700" />
                            ) : hasQuotedParts ? (
                              <Calculator className="w-4 h-4 text-purple-700" />
                            ) : (
                              <Package className="w-4 h-4 text-blue-700" />
                            )}
                            <span className={`text-xs font-black uppercase tracking-wider ${
                              hasOrderedParts ? 'text-amber-950' : hasQuotedParts ? 'text-purple-950' : 'text-blue-950'
                            }`}>
                              {hasOrderedParts && hasQuotedParts
                                ? `Line ${idx + 1} Parts Breakdown`
                                : hasOrderedParts
                                ? `Parts Ordered for Line ${idx + 1}`
                                : hasQuotedParts
                                ? `Parts on Quote (Pending Approval) for Line ${idx + 1}`
                                : `Parts Requested for Line ${idx + 1}`}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {orderedParts.length > 0 && (
                                <span className="px-2 py-0.5 text-white text-[10px] font-black rounded-full bg-amber-600">
                                  {orderedParts.length} Ordered
                                </span>
                              )}
                              {quotedParts.length > 0 && (
                                <span className="px-2 py-0.5 text-white text-[10px] font-black rounded-full bg-purple-600">
                                  {quotedParts.length} on Quote
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {onRequestParts && (
                              <button
                                type="button"
                                onClick={() => onRequestParts(idx, concernText)}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Request More Parts</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingPartsLineIndex(null)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              title="Close parts list"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {lineParts.length === 0 ? (
                          <div className="bg-white p-3 rounded-lg border border-dashed border-slate-300 text-center space-y-2">
                            <p className="text-xs font-semibold text-slate-600">No parts have been requested or ordered for Line {idx + 1} yet.</p>
                            {onRequestParts && (
                              <button
                                type="button"
                                onClick={() => onRequestParts(idx, concernText)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>+ Request Parts for Line {idx + 1}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {lineParts.map((part) => {
                              const etaBadge = formatEtaBadge(part.estimatedArrival);
                              const isThisPartOrdered = isPartOrdered(part);
                              const isThisPartQuoteOnly = isPartQuoteOnly(part);
                              const isThisPartApproved = part.status === 'APPROVED';

                              return (
                                <div 
                                  key={part.id} 
                                  className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-300 shadow-2xs gap-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-slate-700 text-[11px] font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        #{part.partNumber || 'TBD'}
                                      </span>
                                      <span className="font-bold text-slate-900 break-words">{part.description}</span>
                                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                        Qty: {part.quantity}
                                      </span>
                                      {/* Order Now / Quote Only switchable toggle */}
                                      {isThisPartOrdered ? (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0 flex items-center gap-1">
                                          <Truck className="w-3 h-3 text-amber-700" />
                                          <span>Ordered</span>
                                        </span>
                                      ) : isThisPartApproved ? (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                          Approved
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-300 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updatePartItem(ro.id, part.id, {
                                                requestType: 'ORDER_NOW',
                                                status: 'REQUESTED',
                                                estimatedArrival: part.estimatedArrival === 'Price Quote Needed' ? 'Pending Parts Counter' : part.estimatedArrival,
                                              });
                                            }}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                              !isThisPartQuoteOnly
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                            title="Change to Parts Requested / Order Now"
                                          >
                                            <ShoppingCart className="w-2.5 h-2.5 shrink-0" />
                                            <span>Order Now</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updatePartItem(ro.id, part.id, {
                                                requestType: 'QUOTE_ONLY',
                                                status: 'QUOTE_ONLY',
                                                estimatedArrival: 'Price Quote Needed',
                                              });
                                            }}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                              isThisPartQuoteOnly
                                                ? 'bg-purple-600 text-white shadow-2xs'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                            }`}
                                            title="Change to Quote Only"
                                          >
                                            <Calculator className="w-2.5 h-2.5 shrink-0" />
                                            <span>Quote Only</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {part.notes && !part.notes.startsWith('For Line') && (
                                      <p className="text-[11px] text-slate-500 mt-0.5 italic">{part.notes}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                      part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : isThisPartOrdered
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 font-extrabold'
                                        : isThisPartApproved
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                        : isThisPartQuoteOnly
                                        ? 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold'
                                        : 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                                    }`}>
                                      {part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                        ? (part.status === 'ISSUED_TO_TECH' ? 'Issued to Tech' : 'Parts In / Received')
                                        : isThisPartOrdered
                                        ? (part.status === 'IN_STOCK' ? 'In Stock' : 'Parts Ordered')
                                        : isThisPartApproved
                                        ? 'Approved'
                                        : isThisPartQuoteOnly
                                        ? 'On Quote (Pending Approval)'
                                        : 'Parts Requested'}
                                    </span>
                                    {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && isThisPartOrdered && (
                                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                        etaBadge.pastDue ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'
                                      }`}>
                                        {etaBadge.text}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deletePartItem(ro.id, part.id);
                                      }}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                      title="Remove this part request"
                                    >
                                      <Trash2 className="w-3 h-3 text-rose-600" />
                                      <span>Remove Part</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Customer Concern / Additional Concern Found for Line {idx + 1} */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-start gap-2 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-700">
                        {idx === 0 ? `Line ${idx + 1} Customer Concern: ` : `Line ${idx + 1} Additional Concern Found: `}
                      </span>
                      <span className="text-slate-900 font-medium break-words">{concernText}</span>
                    </div>
                  </div>

                  {/* Line {idx + 1} Cause */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Line {idx + 1} Cause</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={lineCause}
                      onFocus={() => {
                        focusedFieldRef.current = { index: idx, field: 'cause' };
                      }}
                      onChange={(e) => handleCauseChange(idx, e.target.value)}
                      onBlur={() => {
                        focusedFieldRef.current = null;
                        handleBlurSave();
                      }}
                      placeholder={`Type Line ${idx + 1} cause...`}
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Line {idx + 1} Correction */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Line {idx + 1} Correction</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={lineCorrection}
                      onFocus={() => {
                        focusedFieldRef.current = { index: idx, field: 'correction' };
                      }}
                      onChange={(e) => handleCorrectionChange(idx, e.target.value)}
                      onBlur={() => {
                        focusedFieldRef.current = null;
                        handleBlurSave();
                      }}
                      placeholder={`Type Line ${idx + 1} correction...`}
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Line Labor Time Clock Logs per Line */}
                  <LineTimePunchesSection 
                    ro={ro} 
                    lineNum={idx + 1} 
                    lineTitle={concernText} 
                    onAddPastPunch={(num, title) => setPastPunchModal({ isOpen: true, lineNum: num, concernText: title })} 
                  />

                  {/* Integrated Line Parts: Part Name, Price, Qty, Availability */}
                  <LinePartsSection ro={ro} lineNum={idx + 1} />

                  {/* Line Evidence & Inspection Photos (Take Photo on each line) */}
                  <LinePhotoSection 
                    roId={ro.id} 
                    roLineNumber={idx + 1} 
                    concernIndex={idx} 
                    photos={ro.linePhotos} 
                    lineTitle={concernText} 
                  />
                </div>
              );
            })}

            {/* Inspection Findings & Recommended Services (Sequential Lines following Concerns) */}
            {recommendations.map((rec, recIdx) => {
              const globalLineNum = lines.length + recIdx + 1;
              const recCause = recCauses[rec.id] !== undefined ? recCauses[rec.id] : (rec.cause || '');
              const recCorr = recCorrections[rec.id] !== undefined ? recCorrections[rec.id] : (rec.correction || '');
              const recHrs = recHours[rec.id] !== undefined ? recHours[rec.id] : (rec.laborHours !== undefined ? String(rec.laborHours) : '');
              const isRecComplete = Boolean(recCause.trim() && recCorr.trim());
              const isRecPartiallyDone = Boolean(recCause.trim() || recCorr.trim());
              const lineParts = (ro.parts || []).filter(p => p.roLineNumber === globalLineNum);
              const recPayType = rec.payType || 'CUSTOMER_PAY';

              return (
                <div key={rec.id} className="p-3.5 bg-amber-50/40 rounded-xl border-2 border-amber-300 space-y-3 shadow-xs">
                  {/* Top Bar: Pay Type, Status, Clock In/Out, Hours, Request Parts, Tech assignment & Remove */}
                  <div className="flex items-center justify-between gap-2.5 flex-wrap pb-2.5 border-b border-amber-200">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <span className="px-3 py-1 rounded-lg bg-amber-700 text-white font-black text-xs shadow-2xs">
                          Line {globalLineNum}
                        </span>
                        <span className="text-amber-900 font-bold text-xs hidden sm:inline">21-Pt Inspection Finding</span>
                      </span>

                      {/* Recommendation Line Authorization Decision Badge */}
                      {(() => {
                        if (rec.status === 'APPROVED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          );
                        }

                        if (rec.status === 'DECLINED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-rose-700">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Denied</span>
                            </span>
                          );
                        }

                        const explicitStatus = ro.quote?.lineStatuses?.[globalLineNum];
                        if (explicitStatus === 'APPROVED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          );
                        }
                        if (explicitStatus === 'DECLINED') {
                          return (
                            <span className="text-xs font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-md flex items-center gap-1 shadow-xs border border-rose-700">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Denied</span>
                            </span>
                          );
                        }

                        return (
                          <span className="text-xs font-black uppercase px-2.5 py-1 bg-purple-700 text-white rounded-md flex items-center gap-1 shadow-xs border border-purple-800">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Waiting on Approval</span>
                          </span>
                        );
                      })()}

                      {/* Pay Type Badge / Selector */}
                      {canSelectPayType ? (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs">
                          <span className="text-xs font-bold text-slate-500 px-1 hidden xs:inline uppercase tracking-wider">Type:</span>
                          <button
                            type="button"
                            onClick={() => updateRecommendedService(ro.id, rec.id, { payType: 'CUSTOMER_PAY' })}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              recPayType === 'CUSTOMER_PAY'
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Customer Pay
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRecommendedService(ro.id, rec.id, { payType: 'WARRANTY' })}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              recPayType === 'WARRANTY'
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Warranty
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRecommendedService(ro.id, rec.id, { payType: 'INTERNAL' })}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              recPayType === 'INTERNAL'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Internal
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRecommendedService(ro.id, rec.id, { payType: 'EXTENDED_WARRANTY' })}
                            className={`px-3 py-1 rounded text-xs font-extrabold border transition-colors cursor-pointer ${
                              recPayType === 'EXTENDED_WARRANTY'
                                ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Extended Warranty
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-bold px-3 py-1 rounded-md border shadow-2xs ${
                          recPayType === 'CUSTOMER_PAY'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : recPayType === 'WARRANTY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : recPayType === 'INTERNAL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-teal-50 text-teal-700 border-teal-200'
                        }`}>
                          {recPayType === 'CUSTOMER_PAY' ? 'Customer Pay' : recPayType === 'WARRANTY' ? 'Warranty' : recPayType === 'INTERNAL' ? 'Internal' : 'Extended Warranty'}
                        </span>
                      )}

                      {/* Urgency Badge */}
                      <span className={`text-xs font-black uppercase px-3 py-1 rounded-md border flex items-center gap-1.5 shadow-2xs ${
                        rec.urgency === 'SAFETY'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{rec.urgency === 'SAFETY' ? 'Immediate Concern' : 'Recommended'}</span>
                      </span>

                      {/* Documentation Status Badge */}
                      {isRecComplete ? (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Line {globalLineNum} Documented
                        </span>
                      ) : isRecPartiallyDone ? (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Line {globalLineNum} Partially Documented
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
                          Line {globalLineNum} Pending
                        </span>
                      )}

                      {/* Clock In / Out Button for this recommendation line */}
                      {(() => {
                        const isRecLineClockedIn = isClockedIn && (activePunch?.roLineNumber === globalLineNum);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRecLineClockedIn) {
                                clockOutOfRO(ro.id, activePunch?.id, `Clocked out from Line ${globalLineNum}`);
                              } else {
                                clockInToRO(
                                  ro.id, 
                                  `Working on Line ${globalLineNum}: ${rec.serviceName.slice(0, 50)}`, 
                                  recPayType === 'WARRANTY' ? 'REPAIR' : 'GENERAL',
                                  globalLineNum
                                );
                              }
                            }}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black border flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                              isRecLineClockedIn
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-300'
                                : isClockedIn
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 hover:shadow-xs active:scale-95'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:shadow-xs active:scale-95'
                            }`}
                            title={
                              isRecLineClockedIn 
                                ? `Clocked in on RO #${ro.id} Line ${globalLineNum} since ${new Date(activePunch!.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatElapsed(activeElapsedSecs)}). Click to clock out.` 
                                : isClockedIn
                                ? `Switch punch to Line ${globalLineNum} (will auto clock out of current punch)`
                                : `Clock in to work on Line ${globalLineNum}`
                            }
                          >
                            {isRecLineClockedIn ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                <Square className="w-3 h-3 fill-white" />
                                <span>Clock Out ({formatElapsed(activeElapsedSecs)})</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isClockedIn ? `Switch to Line ${globalLineNum}` : 'Clock In'}</span>
                              </>
                            )}
                          </button>
                        );
                      })()}

                      {/* Add Past Punch Button directly to the right of Clock In */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastPunchModal({ isOpen: true, lineNum: globalLineNum, concernText: rec.serviceName });
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                        title={`Log a completed past labor punch for Line ${globalLineNum}`}
                      >
                        <History className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>+ Past Punch</span>
                      </button>

                      {/* Labor Hours requested input for Line (Syncs to Quote and Recommendation) */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border-2 border-slate-400 shadow-sm hover:border-blue-500 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200 transition-all"
                        title={`Enter labor hours for Line ${globalLineNum} — automatically updates the repair quote`}
                      >
                        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider shrink-0">
                          Hours:
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="99"
                          placeholder="0.0"
                          value={recHrs}
                          onFocus={() => {
                            focusedRecFieldRef.current = { recId: rec.id, field: 'hours' };
                          }}
                          onChange={(e) => handleRecHoursChange(rec.id, e.target.value, globalLineNum)}
                          onBlur={() => {
                            focusedRecFieldRef.current = null;
                            if (recDebounceTimersRef.current[`hours_${rec.id}`]) {
                              clearTimeout(recDebounceTimersRef.current[`hours_${rec.id}`]);
                              delete recDebounceTimersRef.current[`hours_${rec.id}`];
                            }
                            const currentVal = recHours[rec.id] !== undefined ? recHours[rec.id] : (recHrs || '0');
                            updateLineLaborHours(ro.id, globalLineNum - 1, currentVal);
                          }}
                          className="w-16 sm:w-20 text-sm font-black text-slate-950 bg-slate-100 hover:bg-slate-50 focus:bg-white px-2 py-1 rounded border border-slate-300 focus:border-blue-600 text-center focus:outline-none transition-colors"
                        />
                        <span className="text-xs font-black text-slate-600 pr-0.5">hrs</span>
                      </div>

                      {/* Remove Line Button directly to the right of hours */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRecommendedService(ro.id, rec.id);
                        }}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        title={`Remove Line ${globalLineNum}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Remove Line</span>
                      </button>

                      {/* Request Parts for this line */}
                      {onRequestParts && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestParts(globalLineNum - 1, rec.serviceName);
                          }}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title={`Request required parts for Line ${globalLineNum} from the Parts Department`}
                        >
                          <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Request Parts</span>
                        </button>
                      )}

                      {/* Parts Requested Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPartsLineIndex(viewingPartsLineIndex === (globalLineNum - 1) ? null : (globalLineNum - 1));
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          viewingPartsLineIndex === (globalLineNum - 1)
                            ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300'
                            : lineParts.length > 0
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                        title={`View parts requested for Line ${globalLineNum}`}
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Parts Requested</span>
                        {lineParts.length > 0 && (
                          <span className={`px-2 py-0.5 text-xs font-black rounded-full ${
                            viewingPartsLineIndex === (globalLineNum - 1) ? 'bg-white text-blue-900' : 'bg-blue-600 text-white'
                          }`}>
                            {lineParts.length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 21-Point Inspection Finding Header banner */}
                  <div className="bg-amber-100/80 p-2.5 rounded-lg border border-amber-300 text-xs flex items-start justify-between gap-2 shadow-2xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-extrabold text-amber-950">
                          <span>Line {globalLineNum} Inspection Finding: </span>
                          <span className="text-blue-900">{rec.serviceName}</span>
                        </div>
                        {rec.notes && (
                          <div className="text-[11px] text-amber-900 mt-0.5 italic">
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line {globalLineNum} Cause */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                        <span>Line {globalLineNum} Cause</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={recCause}
                      onFocus={() => {
                        focusedRecFieldRef.current = { recId: rec.id, field: 'cause' };
                      }}
                      onChange={(e) => handleRecCauseChange(rec.id, e.target.value)}
                      onBlur={() => {
                        focusedRecFieldRef.current = null;
                        updateRecommendedService(ro.id, rec.id, { cause: recCause });
                      }}
                      placeholder={`Type Line ${globalLineNum} cause...`}
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Line {globalLineNum} Correction */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Line {globalLineNum} Correction</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={recCorr}
                      onFocus={() => {
                        focusedRecFieldRef.current = { recId: rec.id, field: 'correction' };
                      }}
                      onChange={(e) => handleRecCorrectionChange(rec.id, e.target.value)}
                      onBlur={() => {
                        focusedRecFieldRef.current = null;
                        updateRecommendedService(ro.id, rec.id, { correction: recCorr });
                      }}
                      placeholder={`Type Line ${globalLineNum} correction...`}
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Line Labor Time Clock Logs for this Recommendation Line */}
                  <LineTimePunchesSection 
                    ro={ro} 
                    lineNum={globalLineNum} 
                    lineTitle={rec.serviceName} 
                    onAddPastPunch={(num, title) => setPastPunchModal({ isOpen: true, lineNum: num, concernText: title })} 
                  />

                  {/* Integrated Line Parts for this Recommendation Line */}
                  <LinePartsSection ro={ro} lineNum={globalLineNum} />

                  {/* Line Evidence & Inspection Photos */}
                  <LinePhotoSection 
                    roId={ro.id} 
                    roLineNumber={globalLineNum} 
                    concernIndex={globalLineNum - 1} 
                    photos={ro.linePhotos} 
                    lineTitle={rec.serviceName} 
                  />
                </div>
              );
            })}
          </div>

          {/* Option to Add Additional Concern Found Line */}
          {!isAddingLine ? (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setIsAddingLine(true)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Additional Concern Found Line {lines.length + recommendations.length + 1}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddLineSubmit} className="p-3.5 bg-blue-50/70 rounded-xl border-2 border-blue-300 space-y-3 shadow-xs">
              <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Additional Concern Found (Line {lines.length + recommendations.length + 1})</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsAddingLine(false); 
                    setNewLineText(''); 
                    setNewLineHours(''); 
                    setNewLinePayType('CUSTOMER_PAY'); 
                    setNewLineRequestParts(false); 
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Concern description */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Describe Concern / Diagnostic Finding:
                </label>
                <input
                  type="text"
                  value={newLineText}
                  onChange={(e) => setNewLineText(e.target.value)}
                  placeholder={`Describe additional concern found for Line ${lines.length + recommendations.length + 1} (e.g., Leaking water pump, worn front lower control arm bushings)...`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Functionality: Pay Type, Labor Hours, and Request Parts toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Pay Type */}
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type:</span>
                    <select
                      value={newLinePayType}
                      onChange={(e) => setNewLinePayType(e.target.value as ConcernPayType)}
                      className="text-xs font-bold bg-transparent text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      <option value="CUSTOMER_PAY">Customer Pay</option>
                      <option value="WARRANTY">Warranty</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="EXTENDED_WARRANTY">Extended Warranty</option>
                    </select>
                  </div>

                  {/* Labor Hours input */}
                  <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border-2 border-slate-400 shadow-2xs">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Hours:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99"
                      placeholder="0.0"
                      value={newLineHours}
                      onChange={(e) => setNewLineHours(e.target.value)}
                      className="w-16 text-sm font-black text-slate-950 bg-slate-100 hover:bg-slate-50 focus:bg-white px-2 py-0.5 rounded border border-slate-300 text-center focus:outline-none focus:border-blue-600"
                      title="Requested labor hours for this line (syncs to quote)"
                    />
                    <span className="text-xs font-black text-slate-600 pr-0.5">hrs</span>
                  </div>

                  {/* Request Parts immediate toggle */}
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-300 cursor-pointer hover:bg-slate-50 select-none">
                    <input
                      type="checkbox"
                      checked={newLineRequestParts}
                      onChange={(e) => setNewLineRequestParts(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>Request Parts for Line {lines.length + recommendations.length + 1}</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { 
                      setIsAddingLine(false); 
                      setNewLineText(''); 
                      setNewLineHours(''); 
                      setNewLinePayType('CUSTOMER_PAY'); 
                      setNewLineRequestParts(false); 
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newLineText.trim()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Add Line {lines.length + recommendations.length + 1}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tech Quick Actions: ProDemand Labor Lookup, Copy VIN, Current Miles, Miles Out & Quote Builder */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2.5 flex-wrap">
              <a
                href="https://www.prodemand.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-colors"
                title="Lookup OEM flat-rate labor times in Pro Demand"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Pro Demand Labor Times ↗</span>
              </a>

              {ro.vehicle.vin && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ro.vehicle.vin);
                    alert(`Copied VIN to clipboard: ${ro.vehicle.vin}`);
                  }}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-mono font-bold border-2 border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                  title="Copy VIN for Pro Demand"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy VIN</span>
                </button>
              )}

              {/* Current Miles (Miles In) */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs">
                <Gauge className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-500 font-medium">Current Miles:</span>
                <span className="font-extrabold text-slate-900 font-mono">
                  {ro.vehicle.mileage !== undefined ? `${Number(ro.vehicle.mileage).toLocaleString()} mi` : 'N/A'}
                </span>
              </div>

              {/* Box for Miles Out */}
              <InlineOutMilesBox ro={ro} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const loggedHours = ro.quote?.laborItems 
                  ? ro.quote.laborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0) 
                  : 0;
                return (
                  <button
                    type="button"
                    onClick={() => openQuoteModal(ro.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                      loggedHours > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                    }`}
                    title="Enter the amount of time it will take to do the job"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{loggedHours > 0 ? `Total Labor Time: ${loggedHours.toFixed(1)} hrs` : '+ Enter Total Labor Time'}</span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-emerald-800">Auto-Save active:</span>
              <span>All line entries save automatically in real-time.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSave}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 border-2 cursor-pointer ${
                  isSavedRecently || autoSaveStatus === 'saved'
                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                }`}
                title="Information saves automatically as you type. Click to force immediate sync."
              >
                {autoSaveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Auto-Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Auto-Saved ✓</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Past Punch Modal */}
      {pastPunchModal?.isOpen && (
        <TechPastPunchModal
          ro={ro}
          lineNum={pastPunchModal.lineNum}
          lineDescription={pastPunchModal.concernText}
          onClose={() => setPastPunchModal(null)}
        />
      )}
    </div>
  );
};

interface TechPartsRequestModalProps {
  ro: RepairOrder | null;
  lineIndex?: number;
  lineText?: string;
  onClose: () => void;
}

interface RequestedPartLine {
  id: string;
  description: string;
  partNumber: string;
  quantity: number;
  requestType?: 'ORDER_NOW' | 'QUOTE_ONLY';
}

export const TechPartsRequestModal: React.FC<TechPartsRequestModalProps> = ({ ro, lineIndex, lineText, onClose }) => {
  const { addMultiplePartOrders, updateROStatus } = useApp();
  const [requestType, setRequestType] = useState<'ORDER_NOW' | 'QUOTE_ONLY'>('ORDER_NOW');
  const [partsList, setPartsList] = useState<RequestedPartLine[]>([
    { id: `part_${Date.now()}_1`, description: '', partNumber: '', quantity: 1, requestType: 'ORDER_NOW' }
  ]);
  const [notes, setNotes] = useState('');
  const [finishDiag, setFinishDiag] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNotes('');
    setRequestType('ORDER_NOW');
    setPartsList([
      { id: `part_${Date.now()}_1`, description: '', partNumber: '', quantity: 1, requestType: 'ORDER_NOW' }
    ]);
  }, [lineIndex, lineText, ro?.id]);

  if (!ro) return null;

  const handleAddPartLine = () => {
    setPartsList(prev => [
      ...prev,
      { 
        id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
        description: '', 
        partNumber: '', 
        quantity: 1, 
        requestType: requestType || 'ORDER_NOW'
      }
    ]);
  };

  const handleRemovePartLine = (id: string) => {
    if (partsList.length <= 1) {
      setPartsList([{ id: `part_${Date.now()}_1`, description: '', partNumber: '', quantity: 1, requestType: 'ORDER_NOW' }]);
      return;
    }
    setPartsList(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePartLine = (id: string, field: keyof RequestedPartLine, value: any) => {
    setPartsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleStepQuantity = (id: string, delta: number) => {
    setPartsList(prev => prev.map(item => {
      if (item.id !== id) return item;
      const current = Number(item.quantity) || 1;
      return { ...item, quantity: Math.max(1, Math.min(99, current + delta)) };
    }));
  };

  const validPartsCount = partsList.filter(p => p.description.trim().length > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validParts = partsList.filter(p => p.description.trim().length > 0);
    if (validParts.length === 0) {
      alert('Please enter at least one part description to submit a parts request.');
      return;
    }

    setIsSubmitting(true);
    const hasOrderNow = validParts.some(p => (p.requestType || requestType) === 'ORDER_NOW');

    const partsToOrder = validParts.map(p => {
      const itemReqType = p.requestType || requestType;
      return {
        description: p.description.trim(),
        partNumber: p.partNumber.trim() || 'TBD',
        quantity: Math.max(1, Number(p.quantity) || 1),
        status: itemReqType === 'QUOTE_ONLY' ? 'QUOTE_ONLY' : 'REQUESTED',
        requestType: itemReqType,
        vendor: 'Shop Inventory / Supplier',
        estimatedArrival: itemReqType === 'QUOTE_ONLY' ? 'Price Quote Needed' : 'Pending Parts Counter',
        notes: notes.trim() || (lineIndex !== undefined ? `For Line ${lineIndex + 1}` : undefined),
        roLineNumber: lineIndex !== undefined ? lineIndex + 1 : undefined,
      };
    });

    addMultiplePartOrders(ro.id, partsToOrder);

    if (hasOrderNow && finishDiag && (ro.status === 'BEING_DIAGNOSED' || ro.status === 'WAITING_DIAGNOSIS')) {
      updateROStatus(ro.id, 'WAITING_PARTS');
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-4xl lg:max-w-5xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              requestType === 'QUOTE_ONLY' 
                ? 'bg-purple-400/20 text-purple-300 border-purple-400/30' 
                : 'bg-amber-400/20 text-amber-400 border-amber-400/30'
            }`}>
              {requestType === 'QUOTE_ONLY' ? <Calculator className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Technician Parts Request</h3>
                <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded-full ${
                  requestType === 'QUOTE_ONLY'
                    ? 'bg-purple-500/30 border-purple-400/40 text-purple-200'
                    : 'bg-blue-500/30 border-blue-400/40 text-blue-200'
                }`}>
                  {requestType === 'QUOTE_ONLY' ? 'Quote Only' : 'Order Now'}
                </span>
                <span className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-extrabold rounded-full">
                  {partsList.length} {partsList.length === 1 ? 'Part' : 'Parts'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                RO #{ro.id} • {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                {ro.vehicle.vin && <span className="font-mono text-slate-400 ml-1.5 hidden sm:inline">({ro.vehicle.vin})</span>}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Line Reference Banner */}
        {lineIndex !== undefined && lineText && (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-xs shrink-0">
            <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-black text-blue-900 uppercase tracking-wider">
                {lineIndex === 0 ? `For Line ${lineIndex + 1} (Customer Concern): ` : `For Line ${lineIndex + 1} (Additional Concern Found): `}
              </span>
              <span className="text-slate-800 font-medium break-words">{lineText}</span>
            </div>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Section: Parts List */}
          <div className="space-y-3">
            <div className="pb-1 border-b border-slate-200 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Required Parts, Quantities & Request Options <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Specify each required part with its quantity and whether to order immediately or quote only
                </p>
              </div>
            </div>

            {/* List of dynamic part rows */}
            <div className="space-y-2.5">
              {partsList.map((part, index) => (
                <div 
                  key={part.id} 
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 flex-1">
                      Part #{index + 1}
                    </span>
                    {partsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePartLine(part.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove this part"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                    {/* Description */}
                    <div className="sm:col-span-4 lg:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Part Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus={index === 0}
                        value={part.description}
                        onChange={(e) => handleUpdatePartLine(part.id, 'description', e.target.value)}
                        placeholder={index === 0 ? "e.g. Front ceramic brake pad set" : index === 1 ? "e.g. Front brake rotors (pair)" : "e.g. Caliper slide pin kit"}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Part # */}
                    <div className="sm:col-span-3 lg:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Part # (Optional)
                      </label>
                      <input
                        type="text"
                        value={part.partNumber}
                        onChange={(e) => handleUpdatePartLine(part.id, 'partNumber', e.target.value)}
                        placeholder="e.g. 58101-3QA10"
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                      />
                    </div>

                    {/* Quantity with +/- stepper */}
                    <div className="sm:col-span-2 lg:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Quantity
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleStepQuantity(part.id, -1)}
                          disabled={part.quantity <= 1}
                          className="px-2 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold border border-slate-300 rounded-l-lg text-xs cursor-pointer disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={part.quantity === 0 || (part.quantity as any) === '' ? '' : part.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdatePartLine(part.id, 'quantity', val === '' ? 1 : Math.max(1, parseInt(val) || 1));
                          }}
                          className="w-full text-center py-2 bg-white border-y border-slate-300 text-xs font-extrabold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStepQuantity(part.id, 1)}
                          className="px-2 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-r-lg text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Order Now & Quote Only to the right of Quantity */}
                    <div className="sm:col-span-3 lg:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Request Option
                      </label>
                      <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg border border-slate-300">
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdatePartLine(part.id, 'requestType', 'ORDER_NOW');
                            setRequestType('ORDER_NOW');
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            (part.requestType || requestType) === 'ORDER_NOW'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Order parts immediately"
                        >
                          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Order Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdatePartLine(part.id, 'requestType', 'QUOTE_ONLY');
                            setRequestType('QUOTE_ONLY');
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            (part.requestType || requestType) === 'QUOTE_ONLY'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Check price & availability only (do not order yet)"
                        >
                          <Calculator className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Quote Only</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Another Button */}
            <div className="flex items-center pt-1">
              <button
                type="button"
                onClick={handleAddPartLine}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border-2 border-blue-300 hover:border-blue-400 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>+ Add Another Part</span>
              </button>
            </div>
          </div>

          {/* Technician Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Technician Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Diagnosis Finished Toggle */}
          {(ro.status === 'BEING_DIAGNOSED' || ro.status === 'WAITING_DIAGNOSIS') && (
            <label className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer">
              <input
                type="checkbox"
                checked={finishDiag}
                onChange={(e) => setFinishDiag(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-blue-900">
                {requestType === 'QUOTE_ONLY'
                  ? 'Mark Diagnosis Finished & Move RO to "Waiting on Quote / Parts"'
                  : 'Mark Diagnosis Finished & Move RO to "Waiting on Parts"'}
              </span>
            </label>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-500">
              {validPartsCount} of {partsList.length} part{partsList.length === 1 ? '' : 's'} filled
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                  requestType === 'QUOTE_ONLY'
                    ? 'bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-600/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {requestType === 'QUOTE_ONLY' ? 'Request Parts Quote' : 'Submit Parts Order'}
                  {validPartsCount > 0 ? ` (${validPartsCount} ${validPartsCount === 1 ? 'Part' : 'Parts'})` : ''}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TechWorkflowStepperProps {
  ro: RepairOrder;
  compact?: boolean;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
  onTestDrive?: (ro: RepairOrder) => void;
}

export const TechWorkflowStepper: React.FC<TechWorkflowStepperProps> = ({
  ro,
  compact = false,
  onRequestParts,
  onTestDrive
}) => {
  const { updateROStatus, startDiagnosis, currentUser } = useApp();
  const normStatus = normalizeROStatus(ro.status);

  // Workflow Stages:
  // 1: Diag (WAITING_DIAGNOSTICS, IN_DIAG, DIAG_PAUSED)
  // 2: Estimate & Parts (ESTIMATE_DONE, WAITING_FOR_APPROVAL, APPROVED, PARTS_ORDERED, PARTS_IN_TO_TECH)
  // 3: Repair (REPAIR_IN_PROGRESS)
  // 4: Finish & Complete (REPAIR_COMPLETE, READY_FOR_PICKUP, COMPLETED, CLOSED)

  const isDiag = normStatus === 'WAITING_DIAGNOSTICS' || normStatus === 'IN_DIAG' || normStatus === 'DIAG_PAUSED';
  const isEstimateParts = normStatus === 'ESTIMATE_DONE' || normStatus === 'WAITING_FOR_APPROVAL' || normStatus === 'APPROVED' || normStatus === 'PARTS_ORDERED' || normStatus === 'PARTS_IN_TO_TECH';
  const isRepair = normStatus === 'REPAIR_IN_PROGRESS';
  const isComplete = normStatus === 'REPAIR_COMPLETE' || normStatus === 'READY_FOR_PICKUP' || normStatus === 'COMPLETED' || normStatus === 'CLOSED';

  const handleStartDiag = (e: React.MouseEvent) => {
    e.stopPropagation();
    startDiagnosis(ro.id);
  };

  const handlePauseDiag = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateROStatus(ro.id, 'DIAG_PAUSED');
  };

  const handleDiagDoneNoParts = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isAlreadyApproved = ro.status === 'APPROVED' || ro.quote?.status === 'APPROVED' || (ro.concernStatuses && ro.concernStatuses.length > 0 && ro.concernStatuses.every(s => s === 'APPROVED'));
    const targetStatus = isAlreadyApproved ? 'APPROVED' : 'ESTIMATE_DONE';
    updateROStatus(
      ro.id, 
      targetStatus, 
      `Diagnosis completed by tech ${currentUser.name} — No parts required (Labor Only).`
    );
  };

  const handleFinishDiag = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRequestParts) {
      onRequestParts(1, ro.primaryConcern || 'Diagnosis Complete');
    } else {
      updateROStatus(ro.id, 'ESTIMATE_DONE');
    }
  };

  const handleStartRepair = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateROStatus(ro.id, 'REPAIR_IN_PROGRESS');
  };

  const handleRoadTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTestDrive) {
      onTestDrive(ro);
    }
  };

  const handleFinishRepair = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasOutMiles = ro.outMileage !== undefined || ro.vehicle?.outMileage !== undefined;
    if (!hasOutMiles) {
      const confirmFinish = confirm(`RO #${ro.id} does not have Out Miles recorded yet. Would you like to mark the repair complete now?`);
      if (!confirmFinish) return;
    }
    updateROStatus(ro.id, 'REPAIR_COMPLETE');
  };

  if (compact) {
    return (
      <div 
        onClick={e => e.stopPropagation()} 
        className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 mt-2"
      >
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span>Workflow Stage:</span>
          <span className="font-extrabold text-blue-700">
            {isDiag ? '1. Diagnostics' : isEstimateParts ? '2. Parts & Approval' : isRepair ? '3. Repair' : '4. Completed'}
          </span>
        </div>

        {/* Quick Transition Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Diag Actions */}
          {normStatus === 'WAITING_DIAGNOSTICS' && (
            <button
              type="button"
              onClick={handleStartDiag}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] rounded flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start Diag</span>
            </button>
          )}

          {normStatus === 'IN_DIAG' && (
            <>
              <button
                type="button"
                onClick={handlePauseDiag}
                className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-[10px] rounded flex items-center gap-1 cursor-pointer"
                title="Pause Diagnosis"
              >
                <PauseCircle className="w-3 h-3" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={handleDiagDoneNoParts}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Finish Diagnosis — No parts needed (Labor Only)"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Diag Done (No Parts)</span>
              </button>
              <button
                type="button"
                onClick={handleFinishDiag}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Finish Diagnosis & Request Parts / Quote"
              >
                <Package className="w-3 h-3" />
                <span>Diag & Parts</span>
              </button>
            </>
          )}

          {normStatus === 'DIAG_PAUSED' && (
            <button
              type="button"
              onClick={handleStartDiag}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded flex items-center gap-1 shadow-2xs"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Resume Diag</span>
            </button>
          )}

          {/* Parts / Estimate Stages */}
          {isEstimateParts && normStatus !== 'APPROVED' && normStatus !== 'PARTS_IN_TO_TECH' && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300">
              <Package className="w-3.5 h-3.5 text-purple-600" />
              <span>Awaiting Parts / Approval</span>
            </div>
          )}

          {/* Repair Stage Start Button */}
          {(normStatus === 'APPROVED' || normStatus === 'PARTS_IN_TO_TECH') && (
            <button
              type="button"
              onClick={handleStartRepair}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-black text-[11px] rounded flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <Wrench className="w-3 h-3" />
              <span>Start Repair</span>
            </button>
          )}

          {/* In Repair Actions */}
          {normStatus === 'REPAIR_IN_PROGRESS' && (
            <>
              {onTestDrive && (
                <button
                  type="button"
                  onClick={handleRoadTest}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded flex items-center gap-1 shadow-2xs"
                  title="Test Drive & Mileage Verification"
                >
                  <Car className="w-3 h-3" />
                  <span>Road Test</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFinishRepair}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
                title="Mark all repairs complete"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Finish & Complete</span>
              </button>
            </>
          )}

          {/* Complete Stage */}
          {isComplete && (
            <div className="flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Repair Complete ✓</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full Station Banner Stepper Mode
  return (
    <div className="bg-white rounded-xl border-2 border-slate-300 p-3 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Technician Stage Workflow Progression
          </span>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>Current Status:</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
              {STATUS_CONFIG[ro.status]?.label || ro.status.replace(/_/g, ' ')}
            </span>
          </h4>
        </div>

        {/* Action Controls for Active Stage */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Diag buttons */}
          {normStatus === 'WAITING_DIAGNOSTICS' && (
            <button
              type="button"
              onClick={handleStartDiag}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Diagnosis (Clock In)</span>
            </button>
          )}

          {normStatus === 'IN_DIAG' && (
            <>
              <button
                type="button"
                onClick={handlePauseDiag}
                className="px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Pause Diag</span>
              </button>
              <button
                type="button"
                onClick={handleDiagDoneNoParts}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Complete diagnosis with labor only — No parts needed"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Diag Done (No Parts Needed)</span>
              </button>
              <button
                type="button"
                onClick={handleFinishDiag}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Complete diagnosis and request parts from Parts Department"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Finish Diag & Request Parts</span>
              </button>
            </>
          )}

          {normStatus === 'DIAG_PAUSED' && (
            <button
              type="button"
              onClick={handleStartDiag}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Diagnosis</span>
            </button>
          )}

          {/* 2. Repair buttons */}
          {(normStatus === 'APPROVED' || normStatus === 'PARTS_IN_TO_TECH') && (
            <button
              type="button"
              onClick={handleStartRepair}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Start Repair (In Progress)</span>
            </button>
          )}

          {normStatus === 'REPAIR_IN_PROGRESS' && (
            <>
              {onTestDrive && (
                <button
                  type="button"
                  onClick={handleRoadTest}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Road Test & Out Miles</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFinishRepair}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Finish & Complete RO ✓</span>
              </button>
            </>
          )}

          {isComplete && (
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Repair Finished & Verified Complete ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Stepper Progress Visual Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Step 1: Diag */}
        <div className={`p-2.5 rounded-lg border-2 flex items-center gap-2.5 ${
          isDiag
            ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300/40 text-amber-950 font-bold'
            : (isEstimateParts || isRepair || isComplete)
            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 font-semibold'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
            isDiag
              ? 'bg-amber-600 text-white animate-pulse'
              : (isEstimateParts || isRepair || isComplete)
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}>
            {(isEstimateParts || isRepair || isComplete) ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs">1. Diagnostics</div>
            <div className="text-[10px] text-slate-500 truncate">Scan & diagnose</div>
          </div>
        </div>

        {/* Step 2: Parts & Estimate */}
        <div className={`p-2.5 rounded-lg border-2 flex items-center gap-2.5 ${
          isEstimateParts
            ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-300/40 text-indigo-950 font-bold'
            : (isRepair || isComplete)
            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 font-semibold'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
            isEstimateParts
              ? 'bg-indigo-600 text-white animate-pulse'
              : (isRepair || isComplete)
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}>
            {(isRepair || isComplete) ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs">2. Parts & Quote</div>
            <div className="text-[10px] text-slate-500 truncate">Pricing & approval</div>
          </div>
        </div>

        {/* Step 3: Repair */}
        <div className={`p-2.5 rounded-lg border-2 flex items-center gap-2.5 ${
          isRepair
            ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-300/40 text-cyan-950 font-bold'
            : isComplete
            ? 'border-emerald-400 bg-emerald-50/40 text-emerald-900 font-semibold'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
            isRepair
              ? 'bg-cyan-600 text-white animate-pulse'
              : isComplete
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}>
            {isComplete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '3'}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs">3. In Repair</div>
            <div className="text-[10px] text-slate-500 truncate">Perform repair</div>
          </div>
        </div>

        {/* Step 4: Finish */}
        <div className={`p-2.5 rounded-lg border-2 flex items-center gap-2.5 ${
          isComplete
            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400/40 text-emerald-950 font-bold'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
            isComplete
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}>
            {isComplete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '4'}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs">4. Complete</div>
            <div className="text-[10px] text-slate-500 truncate">Verified & finished</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TechCompactCardProps {
  ro: RepairOrder;
  onClick: () => void;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
  onTestDrive?: (ro: RepairOrder) => void;
}

export const TechCompactCard: React.FC<TechCompactCardProps> = ({ ro, onClick }) => {
  const { currentUser } = useApp();
  const statusCfg = STATUS_CONFIG[ro.status] || STATUS_CONFIG.WAITING_DIAGNOSTICS;
  const etaBadge = formatEtaBadge(ro.promisedTime);

  // Active punch for current technician
  const myPunch = ro.timePunches?.find(
    p => p.techId === currentUser.id && p.clockIn && !p.clockOut
  );
  const [elapsedSecs, setElapsedSecs] = useState<number>(() => {
    if (!myPunch) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(myPunch.clockIn).getTime()) / 1000));
  });

  useEffect(() => {
    if (!myPunch) {
      setElapsedSecs(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - new Date(myPunch.clockIn).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [myPunch?.clockIn]);

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const concernsList = (ro.concerns && ro.concerns.length > 0)
    ? ro.concerns
    : [ro.primaryConcern || 'General Inspection'];

  const loggedHours = ro.quote?.laborItems 
    ? ro.quote.laborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0) 
    : 0;

  const partsCount = (ro.parts || []).length;
  const photosCount = (ro.vehiclePhotos?.length || 0) + (ro.linePhotos?.length || 0);

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl border-2 transition-all p-4 flex flex-col justify-between cursor-pointer hover:shadow-md ${
        myPunch 
          ? 'border-emerald-500 ring-2 ring-emerald-400/40 shadow-sm' 
          : ro.isUrgent
          ? 'border-red-400 hover:border-red-500 shadow-2xs'
          : 'border-slate-300 hover:border-blue-500 shadow-2xs'
      }`}
    >
      <div className="space-y-2.5">
        {/* Top Header: RO ID, Status, Waiter, Urgent, ETA */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs">
              #{ro.id}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>
              {statusCfg.label}
            </span>
            {ro.isWaiter && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                Waiter
              </span>
            )}
          </div>

          {ro.promisedTime && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              etaBadge.pastDue 
                ? 'bg-red-100 text-red-800 border-red-300' 
                : etaBadge.urgent 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {etaBadge.text}
            </span>
          )}
        </div>

        {/* Customer & Vehicle Info */}
        <div>
          <h4 className="text-sm font-bold text-slate-900 truncate">
            {ro.customerName}
          </h4>
          <p className="text-xs text-slate-600 font-medium truncate">
            {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
            {ro.vehicle.vin && <span className="font-mono text-slate-400 ml-1.5">• {ro.vehicle.vin.slice(-6)}</span>}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
            <span>Current Miles: <strong className="text-slate-800 font-mono">{ro.vehicle.mileage ? Number(ro.vehicle.mileage).toLocaleString() : 'N/A'}</strong></span>
            <span>•</span>
            <span>Out Miles: <strong className={`font-mono ${(ro.outMileage || ro.vehicle.outMileage) ? 'text-emerald-700' : 'text-slate-400'}`}>{(ro.outMileage || ro.vehicle.outMileage) ? Number(ro.outMileage || ro.vehicle.outMileage).toLocaleString() : '--'}</strong></span>
          </div>
        </div>

        {/* Pinned Sticky Note on Tech Card */}
        {ro.stickyNote && (
          <div className="pt-1">
            <ROStickyNoteChip roId={ro.id} stickyNote={ro.stickyNote} />
          </div>
        )}

        {/* Active Clocked In Banner on the card */}
        {myPunch && (
          <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-300 text-emerald-950 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Clocked In: Line {myPunch.roLineNumber || 1}</span>
            </span>
            <span className="font-mono font-black text-emerald-800">
              {formatElapsed(elapsedSecs)}
            </span>
          </div>
        )}

        {/* Complaints List Summary */}
        <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Lines ({concernsList.length}):</span>
            {loggedHours > 0 && (
              <span className="text-blue-700 font-extrabold font-mono">
                {loggedHours.toFixed(1)} hrs logged
              </span>
            )}
          </div>
          <div className="space-y-1">
            {concernsList.slice(0, 2).map((c, i) => (
              <p key={i} className="text-slate-700 text-xs font-medium truncate">
                <strong className="text-slate-900 font-semibold">L{i + 1}:</strong> {c}
              </p>
            ))}
            {concernsList.length > 2 && (
              <p className="text-[11px] text-slate-400 font-semibold italic">
                +{concernsList.length - 2} more line{concernsList.length - 2 > 1 ? 's' : ''}...
              </p>
            )}
          </div>
        </div>

        {/* Quick Workflow Stage Progression Bar (Diag -> Parts -> Repair -> Finish) */}
        <TechWorkflowStepper ro={ro} compact={true} />
      </div>

      {/* Footer Details & Action indicator */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          {partsCount > 0 && (
            <span className="flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
              <Package className="w-3 h-3" />
              <span>{partsCount} part{partsCount === 1 ? '' : 's'}</span>
            </span>
          )}
          {photosCount > 0 && (
            <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              <span>{photosCount} photo{photosCount === 1 ? '' : 's'}</span>
            </span>
          )}
          {(() => {
            const unreadMessages = (ro.messages || []).filter(m => !(m.readBy || []).includes(currentUser.id));
            const hasUnreadUrgent = unreadMessages.some(m => m.isUrgent);
            const hasUnread = unreadMessages.length > 0;
            if (!ro.messages || ro.messages.length === 0) return null;

            return (
              <span className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border ${
                hasUnreadUrgent 
                  ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-2xs font-black ring-1 ring-red-400' 
                  : hasUnread 
                  ? 'bg-blue-600 text-white border-blue-500 font-bold'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                <MessageSquare className="w-3 h-3" />
                {hasUnreadUrgent ? <span>URGENT</span> : hasUnread ? <span>NEW</span> : null}
              </span>
            );
          })()}
        </div>

        <span className="text-blue-600 font-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
          <span>Open Station</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};

interface TechROStationModalProps {
  ro: RepairOrder | null;
  onClose: () => void;
  onRequestParts: (lineIndex?: number, lineText?: string) => void;
  onTestDrive: (ro: RepairOrder) => void;
}

export const TechROStationModal: React.FC<TechROStationModalProps> = ({
  ro,
  onClose,
  onRequestParts,
  onTestDrive
}) => {
  const { sendMessage, markROMessagesAsRead, updateOutMileage, currentUser, users } = useApp();
  if (!ro) return null;
  const statusCfg = STATUS_CONFIG[ro.status] || STATUS_CONFIG.WAITING_DIAGNOSTICS;

  const unreadMessages = (ro.messages || []).filter(m => !(m.readBy || []).includes(currentUser.id));
  const hasUnreadUrgentMessage = unreadMessages.some(m => m.isUrgent);
  const hasUnreadMessage = unreadMessages.length > 0;

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isUrgentReply, setIsUrgentReply] = useState(false);

  // Out Miles entry & auto-save state
  const [outMilesInput, setOutMilesInput] = useState<string>(
    ro.outMileage !== undefined && ro.outMileage !== null 
      ? String(ro.outMileage) 
      : ro.vehicle?.outMileage !== undefined && ro.vehicle?.outMileage !== null 
      ? String(ro.vehicle.outMileage) 
      : ''
  );
  const [outMilesSaved, setOutMilesSaved] = useState(false);
  const outMilesDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (ro) {
      const val = ro.outMileage ?? ro.vehicle?.outMileage;
      setOutMilesInput(val !== undefined && val !== null ? String(val) : '');
    }
  }, [ro?.id, ro?.outMileage, ro?.vehicle?.outMileage]);

  const saveOutMilesDirectly = useCallback((valueStr: string) => {
    if (!ro) return;
    const cleanStr = valueStr.trim();
    if (cleanStr === '') {
      updateOutMileage(ro.id, undefined);
      setOutMilesSaved(true);
      setTimeout(() => setOutMilesSaved(false), 2500);
      return;
    }
    const num = Number(cleanStr);
    if (!isNaN(num) && num >= 0) {
      updateOutMileage(ro.id, num);
      setOutMilesSaved(true);
      setTimeout(() => setOutMilesSaved(false), 2500);
    }
  }, [ro, updateOutMileage]);

  const handleOutMilesChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    setOutMilesInput(cleaned);
    if (outMilesDebounceRef.current) {
      clearTimeout(outMilesDebounceRef.current);
    }
    outMilesDebounceRef.current = setTimeout(() => {
      saveOutMilesDirectly(cleaned);
    }, 500);
  };

  const handleSaveOutMiles = () => {
    if (outMilesDebounceRef.current) {
      clearTimeout(outMilesDebounceRef.current);
    }
    saveOutMilesDirectly(outMilesInput);
  };

  // When chat is open and unread messages arrive or are present, mark them as read
  useEffect(() => {
    if (isChatOpen && hasUnreadMessage) {
      markROMessagesAsRead(ro.id);
    }
  }, [isChatOpen, hasUnreadMessage, ro.id, markROMessagesAsRead]);

  const toggleChat = () => {
    const nextState = !isChatOpen;
    setIsChatOpen(nextState);
    if (nextState && (hasUnreadMessage || unreadMessages.length > 0)) {
      markROMessagesAsRead(ro.id);
    }
  };

  const handleSendTechMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(ro.id, chatInput.trim(), isUrgentReply);
    setChatInput('');
    setIsUrgentReply(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-100 overflow-hidden animate-in fade-in duration-150"
    >
      <div
        className="bg-slate-100 w-full h-full flex flex-col overflow-hidden"
      >
        {/* Modal Header Bar - Full Screen Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 border-b border-slate-800 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5 flex-wrap">
            <span className="font-mono text-lg font-black px-3.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-xs shrink-0">
              #{ro.id}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-base sm:text-lg text-white">{ro.customerName}</span>
                {ro.customerPhone && (
                  <span className="text-sm text-slate-300 font-mono font-semibold">({ro.customerPhone})</span>
                )}
                {ro.isWaiter && (
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    Waiter
                  </span>
                )}
              </div>

              {/* Vehicle & VIN & Advisor - Larger font */}
              <p className="text-sm sm:text-base text-slate-200 font-bold flex items-center gap-2 flex-wrap">
                <span className="text-white font-extrabold">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
                <span className="text-slate-500">•</span>
                <span>VIN: <span className="font-mono text-blue-300 font-bold tracking-wide">{ro.vehicle.vin || 'N/A'}</span></span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300 font-medium text-xs sm:text-sm">Advisor: <strong className="text-white">{ro.advisorName}</strong></span>
              </p>

              {/* Current Miles & Out Miles - Larger font with automatic save */}
              <div className="flex items-center gap-3 sm:gap-4 text-sm text-slate-200 mt-1.5 font-semibold flex-wrap">
                <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-600 shadow-2xs">
                  <span className="text-slate-300 text-xs uppercase tracking-wider font-bold">Current Miles:</span>
                  <span className="font-mono text-base font-black text-white">
                    {ro.vehicle.mileage !== undefined && ro.vehicle.mileage !== null && Number(ro.vehicle.mileage) > 0
                      ? `${Number(ro.vehicle.mileage).toLocaleString()} mi`
                      : 'N/A'}
                  </span>
                </span>

                <div className="flex items-center gap-2 bg-slate-800/95 px-3.5 py-1.5 rounded-lg border-2 border-emerald-400/90 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30 flex-wrap">
                  <span className="text-emerald-300 text-xs uppercase tracking-wider font-black flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Out Miles:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Type out miles..."
                      value={outMilesInput}
                      onChange={(e) => handleOutMilesChange(e.target.value)}
                      onBlur={handleSaveOutMiles}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveOutMiles();
                        }
                      }}
                      className="w-28 sm:w-36 px-2.5 py-1 bg-slate-900 text-emerald-300 font-mono font-black text-sm sm:text-base rounded-md border-2 border-emerald-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-400/60 focus:outline-none placeholder:text-emerald-200/80 placeholder:text-xs placeholder:font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-xs"
                      title="Enter Out Miles (automatically saves as you type)"
                    />
                    {outMilesSaved && (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-400 animate-in fade-in">
                        ✓ Auto-Saved
                      </span>
                    )}
                    {(() => {
                      const outNum = Number(outMilesInput);
                      const inNum = Number(ro.vehicle.mileage);
                      if (!isNaN(outNum) && outNum > 0 && !isNaN(inNum) && inNum > 0 && outNum >= inNum) {
                        const diff = outNum - inNum;
                        return (
                          <span className="text-xs text-emerald-200 font-mono font-black ml-1 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                            (+{diff.toFixed(1)} mi)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Live Communication Toggle Button (Blinks red when urgent message is present, stops when opened) */}
            <button
              type="button"
              onClick={toggleChat}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                hasUnreadUrgentMessage
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-2 ring-red-400'
                  : hasUnreadMessage
                  ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400'
                  : isChatOpen
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
              }`}
              title="Open / close live communication chat with Service Advisor"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-200" />
              <span>Live Chat</span>
              {hasUnreadUrgentMessage && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
              {!hasUnreadUrgentMessage && hasUnreadMessage && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping"></span>}
            </button>

            {/* Sticky Note Pin Button */}
            <AddStickyNoteButton 
              roId={ro.id} 
              hasNote={Boolean(ro.stickyNote)} 
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Close Technician Station"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body - Full Screen View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Pinned Sticky Note Banner (At Top of Tech Station) */}
          {ro.stickyNote && (
            <ROStickyNoteBanner 
              roId={ro.id} 
              stickyNote={ro.stickyNote} 
              allowAdd={false}
            />
          )}

          {/* Main Technician Workflow Progression Stepper (Diag -> Parts -> Repair -> Road Test -> Finish) */}
          <TechWorkflowStepper 
            ro={ro} 
            onRequestParts={onRequestParts} 
            onTestDrive={onTestDrive} 
          />

          {/* Inter-Department Live Communication Thread Section (Only visible when user clicks Live Chat button) */}
          {isChatOpen && (
            <div className={`p-4 bg-white rounded-xl border-2 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 ${
              hasUnreadUrgentMessage ? 'border-red-400 ring-2 ring-red-300/40' : 'border-blue-400'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${hasUnreadUrgentMessage ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <span>Live Advisor & Shop Communication Thread</span>
                      {hasUnreadUrgentMessage && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          Urgent Message
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Direct channel with Service Advisor ({ro.advisorName}) & Service Management
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                    title="Close chat thread"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="max-h-56 overflow-y-auto space-y-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {(!ro.messages || ro.messages.length === 0) ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    No messages yet on RO #{ro.id}. Type below to send a message to the Service Advisor.
                  </div>
                ) : (
                  ro.messages.map(msg => {
                    const isSelf = msg.senderId === currentUser.id;
                    const sender = users.find(u => u.id === msg.senderId);
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-slate-700">
                            {msg.senderName}
                          </span>
                          {sender?.employeeNumber && (
                            <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 text-slate-700">
                              {sender.employeeNumber}
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-600 font-bold uppercase">
                            {msg.senderRole.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div 
                          className={`max-w-lg p-2.5 rounded-xl text-xs leading-relaxed ${
                            msg.isUrgent
                              ? 'bg-red-100 text-red-950 border-2 border-red-400 font-bold shadow-2xs'
                              : isSelf
                              ? 'bg-blue-600 text-white rounded-br-xs shadow-2xs'
                              : 'bg-white text-slate-900 rounded-bl-xs border border-slate-300 shadow-2xs'
                          }`}
                        >
                          {msg.isUrgent && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-red-700 uppercase tracking-wider mb-0.5">
                              <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                              <span>Urgent Message</span>
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendTechMessage} className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUrgentReply}
                      onChange={e => setIsUrgentReply(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Flag as Urgent Push Notification
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">Press Enter to send</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Reply to ${ro.advisorName} regarding RO #${ro.id}...`}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 text-xs sm:text-sm px-3.5 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs bg-white text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer border-2 border-blue-700"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tech Cause & Correction Section with Clock In/Out, Hours, Request Parts on each line */}
          <TechCauseCorrectionSection 
            ro={ro} 
            onRequestParts={onRequestParts} 
          />

          {/* 21-Point Vehicle Multi-Point Inspection (MPI) & Recommendations Matrix */}
          <TechRecommendationsSection 
            ro={ro} 
            onRequestParts={onRequestParts} 
          />
        </div>
      </div>
    </div>
  );
};

export const TechDashboard: React.FC = () => {
  const { 
    currentUser, 
    users,
    repairOrders, 
    setSelectedRO,
    updateROStatus, 
    startDiagnosis,
    openDirectChat,
    openQuoteModal,
    updateConcernPayType,
    updateConcernTech
  } = useApp();

  const [selectedTechROId, setSelectedTechROId] = useState<string | null>(null);
  const selectedTechRO = repairOrders.find(r => r.id === selectedTechROId) || null;

  const [partsModalRO, setPartsModalRO] = useState<RepairOrder | null>(null);
  const [partsModalLine, setPartsModalLine] = useState<{ index?: number; text?: string }>({});
  const [testDriveModalRO, setTestDriveModalRO] = useState<RepairOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter to this technician's assigned active ROs (exclude closed, completed, and archived)
  const myROs = repairOrders.filter(ro => 
    (ro.techId === currentUser.id || ro.concernTechIds?.includes(currentUser.id)) &&
    ro.status !== 'CLOSED' &&
    ro.status !== 'COMPLETED' &&
    !ro.isArchived
  );

  const activeROs = myROs.filter(ro => 
    normalizeROStatus(ro.status) !== 'REPAIR_COMPLETE' && 
    normalizeROStatus(ro.status) !== 'READY_FOR_PICKUP'
  );

  const filterAndSortROs = (list: RepairOrder[]) => {
    let filtered = list;
    if (searchQuery.trim()) {
      filtered = list.filter(ro => matchesROSearch(ro, searchQuery, users));
    }
    return sortROsNumerically(filtered);
  };

  const filteredActiveROs = filterAndSortROs(activeROs);
  const displayList = filteredActiveROs;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-800 text-white rounded-xl p-5 sm:p-6 border border-slate-700 shadow-sm relative">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-600 ring-2 ring-blue-400 text-white font-bold text-base flex items-center justify-center shrink-0">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">{currentUser.name}</h1>
                {currentUser.employeeNumber && (
                  <span className="text-lg sm:text-xl font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {currentUser.employeeNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {currentUser.title}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider block">
              Assigned Total:
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
              {activeROs.length}
            </span>
          </div>
        </div>

        {/* Quick Metrics including Diagnostic Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-700 text-xs">
          <div>
            <span className="text-amber-400 text-[11px] uppercase font-bold tracking-wider block">Waiting Diag:</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length}
            </span>
          </div>
          <div>
            <span className="text-blue-400 text-[11px] uppercase font-bold tracking-wider block">In Diag:</span>
            <span className="text-2xl font-black text-blue-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length}
            </span>
          </div>
          <div>
            <span className="text-yellow-400 text-[11px] uppercase font-bold tracking-wider block">Diag Paused:</span>
            <span className="text-2xl font-black text-yellow-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'DIAG_PAUSED').length}
            </span>
          </div>
          <div>
            <span className="text-indigo-400 text-[11px] uppercase font-bold tracking-wider block">Waiting on Approval:</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE' || normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL' || normalizeROStatus(r.status) === 'APPROVED').length}
            </span>
          </div>
          <div>
            <span className="text-orange-400 text-[11px] uppercase font-bold tracking-wider block">Parts on Order:</span>
            <span className="text-2xl font-black text-orange-400 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length}
            </span>
          </div>
          <div>
            <span className="text-cyan-400 text-[11px] uppercase font-bold tracking-wider block">In Repair:</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS').length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar & Active Repair Orders Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Search Bar to the left */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search RO, customer, vehicle, concern..."
            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Active Repair Orders badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-black text-blue-900 shadow-2xs">
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            <span>Active Repair Orders ({filteredActiveROs.length})</span>
          </div>
        </div>
      </div>

      {/* Small Cards Grid for Each Repair Order (Opens Technician Station on Click) */}
      {displayList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">
            {searchQuery ? 'No Matching Repair Orders Found' : 'Your Work Queue is Clear'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery 
              ? `No repair orders matched your search "${searchQuery}".` 
              : 'No repair orders currently in this queue. When a Service Advisor assigns work to you, it will show up here immediately.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {displayList.map(ro => (
            <TechCompactCard
              key={ro.id}
              ro={ro}
              onClick={() => setSelectedTechROId(ro.id)}
            />
          ))}
        </div>
      )}

      {/* Technician Opened Station Modal */}
      {selectedTechRO && (
        <TechROStationModal
          ro={selectedTechRO}
          onClose={() => setSelectedTechROId(null)}
          onRequestParts={(lineIndex, lineText) => {
            setPartsModalRO(selectedTechRO);
            setPartsModalLine({ index: lineIndex, text: lineText });
          }}
          onTestDrive={(targetRO) => {
            setTestDriveModalRO(targetRO);
          }}
        />
      )}

      {/* Technician Parts Request Modal */}
      <TechPartsRequestModal 
        ro={partsModalRO} 
        lineIndex={partsModalLine.index}
        lineText={partsModalLine.text}
        onClose={() => {
          setPartsModalRO(null);
          setPartsModalLine({});
        }} 
      />

      {/* Technician Road Test & Out Miles Verification Modal */}
      <TechTestDriveModal
        ro={testDriveModalRO}
        onClose={() => setTestDriveModalRO(null)}
      />
    </div>
  );
};

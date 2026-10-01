import React, { useState, useEffect, useRef } from 'react';
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
  ShoppingCart
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { ROStatus, RepairOrder, ConcernPayType } from '../types';
import { formatDateTime, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails, formatTimeOnly, parseLineIndexedField } from '../utils/formatters';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { WarrantyTimeClockSection } from './WarrantyTimeClockSection';
import { LinePartsSection } from './LinePartsSection';
import { LinePhotoSection } from './LinePhotoSection';

interface TechCauseCorrectionSectionProps {
  ro: RepairOrder;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
}

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
    updatePartItem
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

  const lines = (ro.concerns && ro.concerns.length > 0)
    ? ro.concerns
    : [ro.primaryConcern || 'Customer Concern'];

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
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black px-2.5 py-0.5 bg-slate-900 text-white rounded-md uppercase tracking-wider shadow-2xs">
                        Line {idx + 1}
                      </span>
                      {isMyLine && (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-md uppercase tracking-wider shadow-2xs">
                          Your Line
                        </span>
                      )}

                      {canSelectPayType ? (
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300">
                          <span className="text-[10px] font-bold text-slate-500 px-1 hidden xs:inline uppercase tracking-wider">Type:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateConcernPayType(ro.id, idx, 'CUSTOMER_PAY');
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
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
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
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
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              payType === 'INTERNAL'
                                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Internal"
                          >
                            Internal
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          payType === 'CUSTOMER_PAY'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : payType === 'WARRANTY'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {payType === 'CUSTOMER_PAY' ? 'Customer Pay' : payType === 'WARRANTY' ? 'Warranty' : 'Internal'}
                        </span>
                      )}

                      {isLineComplete ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Line {idx + 1} Documented
                        </span>
                      ) : isLinePartiallyDone ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Line {idx + 1} Partially Documented
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300">
                          Line {idx + 1} Pending
                        </span>
                      )}

                      {/* Clock In / Out Button directly to the right of Line status */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isClockedIn) {
                            clockOutOfRO(ro.id, activePunch?.id, `Clocked out from Line ${idx + 1}`);
                          } else {
                            clockInToRO(
                              ro.id, 
                              `Working on Line ${idx + 1}: ${concernText.slice(0, 50)}`, 
                              payType === 'WARRANTY' ? 'REPAIR' : 'GENERAL'
                            );
                          }
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          isClockedIn
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-300 shadow-xs'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:shadow-xs active:scale-95'
                        }`}
                        title={
                          isClockedIn 
                            ? `Clocked in on RO #${ro.id} since ${new Date(activePunch!.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${formatElapsed(activeElapsedSecs)}). Click to clock out.` 
                            : `Clock in to start working on RO #${ro.id}`
                        }
                      >
                        {isClockedIn ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            <Square className="w-2.5 h-2.5 fill-white" />
                            <span>Clock Out ({formatElapsed(activeElapsedSecs)})</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-2.5 h-2.5 fill-current" />
                            <span>Clock In</span>
                          </>
                        )}
                      </button>

                      {/* Inline Labor Hours Requested Input for Line {idx + 1} (Syncs to Quote) */}
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border-2 border-slate-300 shadow-2xs hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                        title={`Enter labor hours requested for Line ${idx + 1} — automatically updates the repair quote`}
                      >
                        <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
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
                          className="w-12 text-xs font-bold text-slate-900 bg-transparent text-center focus:outline-hidden"
                        />
                        <span className="text-[10px] font-bold text-slate-500 pr-0.5">hrs</span>
                      </div>

                      {/* Request Parts directly to the right of hours entry box */}
                      {onRequestParts && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestParts(idx, concernText);
                          }}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title={`Request required parts for Line ${idx + 1} from the Parts Department`}
                        >
                          <Package className="w-3 h-3 text-amber-600" />
                          <span>Request Parts</span>
                        </button>
                      )}

                      {/* See Parts Ordered Button directly to the right of Request Parts */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingPartsLineIndex(viewingPartsLineIndex === idx ? null : idx);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          viewingPartsLineIndex === idx
                            ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300'
                            : lineParts.length > 0
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                        title={`View parts ordered for Line ${idx + 1}`}
                      >
                        <Eye className="w-3 h-3 text-blue-600" />
                        <span>See Parts Ordered</span>
                        {lineParts.length > 0 && (
                          <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                            viewingPartsLineIndex === idx ? 'bg-white text-blue-900' : 'bg-blue-600 text-white'
                          }`}>
                            {lineParts.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Line Technician Selector / Display */}
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-300">
                      <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
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
                          className={`text-[11px] font-bold bg-white border rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer ${
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
                        <span className="text-[11px] font-bold text-slate-800">
                          {assignedTechName || ro.techName || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable Parts Ordered for Line {idx + 1} Section */}
                  {viewingPartsLineIndex === idx && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 bg-blue-50/80 rounded-xl border-2 border-blue-300 space-y-2.5 shadow-xs animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-700" />
                          <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                            Parts Ordered for Line {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                            {lineParts.length} {lineParts.length === 1 ? 'Part' : 'Parts'}
                          </span>
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
                            const isROApproved = Boolean(
                              ro.status === 'APPROVED' || 
                              ro.quote?.status === 'APPROVED' || 
                              ro.quote?.approvedAt || 
                              ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(ro.status)
                            );
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
                                    {isROApproved ? (
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
                                              status: part.status === 'QUOTE_ONLY' ? 'REQUESTED' : part.status,
                                              estimatedArrival: part.estimatedArrival === 'Price Quote Needed' ? 'Pending Parts Counter' : part.estimatedArrival,
                                            });
                                          }}
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                            (part.requestType === 'ORDER_NOW' || (!part.requestType && part.status !== 'QUOTE_ONLY'))
                                              ? 'bg-blue-600 text-white shadow-2xs'
                                              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                                          }`}
                                          title="Change to Order Now"
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
                                            (part.requestType === 'QUOTE_ONLY' || part.status === 'QUOTE_ONLY')
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
                                      : isROApproved && (part.requestType === 'QUOTE_ONLY' || part.status === 'QUOTE_ONLY')
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                      : part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY'
                                      ? 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold'
                                      : part.status === 'REQUESTED'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                                  }`}>
                                    {isROApproved && (part.requestType === 'QUOTE_ONLY' || part.status === 'QUOTE_ONLY')
                                      ? 'Approved (Order Now)'
                                      : part.requestType === 'QUOTE_ONLY' || part.status === 'QUOTE_ONLY'
                                      ? 'Quote Only'
                                      : part.status.replace(/_/g, ' ')}
                                  </span>
                                  {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
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
                  )}

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
                      placeholder={`Type Line ${idx + 1} cause findings (e.g., Code P0300 - cylinder 3 spark plug fouled with oil due to leaking valve cover spark plug tube seal)...`}
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
                      placeholder={`Type Line ${idx + 1} correction performed (e.g., Replaced valve cover gasket and spark plug tube seals, installed new plugs, cleared codes, road tested 5 miles)...`}
                      className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

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
                <span>+ Additional Concern Found Line {lines.length + 1}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddLineSubmit} className="p-3.5 bg-blue-50/70 rounded-xl border-2 border-blue-300 space-y-3 shadow-xs">
              <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Additional Concern Found (Line {lines.length + 1})</span>
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
                  placeholder={`Describe additional concern found for Line ${lines.length + 1} (e.g., Leaking water pump, worn front lower control arm bushings)...`}
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
                    </select>
                  </div>

                  {/* Labor Hours input */}
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-slate-300 shadow-2xs">
                    <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hours:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99"
                      placeholder="0.0"
                      value={newLineHours}
                      onChange={(e) => setNewLineHours(e.target.value)}
                      className="w-12 text-xs font-bold text-slate-900 bg-transparent text-center focus:outline-hidden"
                      title="Requested labor hours for this line (syncs to quote)"
                    />
                    <span className="text-[10px] font-bold text-slate-500 pr-0.5">hrs</span>
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
                    <span>Request Parts for Line {lines.length + 1}</span>
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
                    Add Line {lines.length + 1}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Tech Quick Actions: ProDemand Labor Lookup & Quote Builder & Request Parts */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
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

export const TechDashboard: React.FC = () => {
  const { 
    currentUser, 
    users,
    repairOrders, 
    updateROStatus, 
    startDiagnosis,
    openDirectChat,
    openQuoteModal,
    updateConcernPayType,
    updateConcernTech
  } = useApp();

  const [partsModalRO, setPartsModalRO] = useState<RepairOrder | null>(null);
  const [partsModalLine, setPartsModalLine] = useState<{ index?: number; text?: string }>({});

  const canSelectPayType = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';
  const canAssignTech = currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR';

  // Filter to this technician's assigned ROs (primary tech or assigned to an individual line)
  const myROs = repairOrders.filter(ro => ro.techId === currentUser.id || ro.concernTechIds?.includes(currentUser.id));

  const activeROs = myROs.filter(ro => 
    ro.status !== 'CLOSED' && 
    ro.status !== 'COMPLETED' && 
    normalizeROStatus(ro.status) !== 'REPAIR_COMPLETE' && 
    normalizeROStatus(ro.status) !== 'READY_FOR_PICKUP'
  );
  const completedROs = myROs.filter(ro => 
    ro.status === 'CLOSED' || 
    ro.status === 'COMPLETED' || 
    normalizeROStatus(ro.status) === 'REPAIR_COMPLETE' || 
    normalizeROStatus(ro.status) === 'READY_FOR_PICKUP'
  );

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const displayList = activeTab === 'ACTIVE' ? activeROs : completedROs;

  const handleQuickStatus = (e: React.MouseEvent, roId: string, newStatus: ROStatus) => {
    e.stopPropagation();
    updateROStatus(roId, newStatus, `1-tap status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus} by ${currentUser.name}`);
  };

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
          <div>
            <span className="text-emerald-400 text-[11px] uppercase font-bold tracking-wider block">Finished:</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {completedROs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'ACTIVE' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Active Repair Orders ({activeROs.length})
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'COMPLETED' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Finished ({completedROs.length})
        </button>
      </div>

      {/* Technician Jobs List with 1-Click Status Controls */}
      <div className="space-y-4">
        {displayList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Your Work Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">
              No repair orders currently in this queue. When a Service Advisor assigns work to you, it will show up here immediately with real-time push alerts.
            </p>
          </div>
        ) : (
          displayList.map(ro => {
            const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;

            return (
              <div
                key={ro.id}
                id={`tech-ro-card-${ro.id}`}
                className={`bg-white rounded-xl border-2 p-5 shadow-sm space-y-4 ${
                  ro.isUrgent || ro.isWaiter
                    ? 'border-red-400 ring-2 ring-red-400/20'
                    : 'border-slate-400'
                }`}
              >
                {/* Status Updates (Moved above repair order number) */}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="pb-3 border-b border-slate-200"
                >
                  <div className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Status Updates:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'WAITING_DIAGNOSTICS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'WAITING_DIAGNOSTICS'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Waiting Diag
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'IN_DIAG')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'IN_DIAG'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      In Diag
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'ESTIMATE_DONE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'ESTIMATE_DONE'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Estimate Done
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'PARTS_IN_TO_TECH')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'PARTS_IN_TO_TECH'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Parts In / To Tech
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'REPAIR_IN_PROGRESS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'REPAIR_IN_PROGRESS'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Repair in Progress
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'REPAIR_COMPLETE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'REPAIR_COMPLETE'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Repair Complete
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleQuickStatus(e, ro.id, 'READY_FOR_PICKUP')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white ml-auto cursor-pointer"
                    >
                      Ready for Pickup
                    </button>
                  </div>
                </div>

                {/* Header: RO, Customer, Vehicle, Assigned Time */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-blue-600">#{ro.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border-2 ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                      {ro.isUrgent && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md border-2 border-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" /> HIGH PRIORITY
                        </span>
                      )}
                      {ro.isWaiter && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md border-2 border-red-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-red-600" /> WAITER
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {ro.customerName} • {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-slate-500">
                    <div className="flex items-center sm:justify-end gap-1 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {calculateDispatchedDuration(ro.dispatchedAt)}
                    </div>
                    <div className="mt-1 flex items-center sm:justify-end gap-2.5 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1.5 shadow-2xs">
                        Advisor: <span className="text-blue-700 font-black">{ro.advisorName}</span>
                        {(() => {
                          const adv = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
                          return adv?.employeeNumber ? (
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">
                              #{adv.employeeNumber}
                            </span>
                          ) : null;
                        })()}
                      </span>
                      {ro.advisorId && ro.advisorId !== currentUser.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDirectChat(ro.advisorId);
                          }}
                          className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl border-2 border-blue-700 inline-flex items-center gap-2 transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
                          title={`Direct message advisor ${ro.advisorName}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Chat with {ro.advisorName.split(' ')[0]}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tech Tools: ProDemand Labor Lookup, Repair Quote & Parts Request */}
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-xl border-2 border-slate-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href="https://www.prodemand.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-blue-700"
                      title="Open Pro Demand for OEM flat-rate labor times"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Pro Demand Labor ↗</span>
                    </a>

                    {ro.vehicle.vin && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ro.vehicle.vin);
                          alert(`Copied VIN: ${ro.vehicle.vin}`);
                        }}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-mono font-bold border-2 border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                        title="Copy VIN for Pro Demand"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>Copy VIN</span>
                      </button>
                    )}
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
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border-2 transition-all cursor-pointer shadow-xs ${
                            loggedHours > 0
                              ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                              : 'bg-slate-900 hover:bg-black text-white border-slate-900'
                          }`}
                          title="Enter labor time required to do the job"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{loggedHours > 0 ? `Total Labor Time: ${loggedHours.toFixed(1)} hrs` : '+ Enter Total Labor Time'}</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* Diagnostic Phase Callout: Waiting vs Being Diagnosed */}
                {ro.status === 'WAITING_DIAGNOSIS' && (
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Vehicle is Waiting to be Diagnosed</span>
                      </div>
                      <div className="text-xs text-amber-800 mt-0.5 font-medium">
                        Assigned to you • In queue since {formatTimeOnly(ro.waitingDiagnosisAt)} ({formatDurationSince(ro.waitingDiagnosisAt)} wait)
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startDiagnosis(ro.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg border-2 border-blue-700 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Begin Diagnosis Now</span>
                    </button>
                  </div>
                )}

                {ro.status === 'BEING_DIAGNOSED' && (
                  <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span>Vehicle is Being Diagnosed</span>
                      </div>
                      <div className="text-xs text-blue-800 mt-0.5 font-medium">
                        Diagnostic testing & scan underway • Started at {formatTimeOnly(ro.diagnosisStartedAt)} ({formatDurationSince(ro.diagnosisStartedAt)} active)
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPartsModalRO(ro);
                          setPartsModalLine({});
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-amber-600 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                        title="Diagnostic finished — request required parts from the Parts Department"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Finish Diag & Request Parts</span>
                      </button>
                      <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full border-2 border-blue-300 uppercase tracking-wider">
                        Active Inspection
                      </span>
                    </div>
                  </div>
                )}

                {/* Technician Diagnosis & Repair Documentation: Cause & Correction */}
                <TechCauseCorrectionSection 
                  ro={ro} 
                  onRequestParts={(lineIdx, lineTxt) => {
                    setPartsModalRO(ro);
                    setPartsModalLine({ index: lineIdx, text: lineTxt });
                  }} 
                />

                {/* Official Warranty Labor Time Clock & Multi-Punch Tracking */}
                <WarrantyTimeClockSection ro={ro} />

                {/* Technician Additional Recommended Services (21-Point Inspection & MPI Findings) */}
                <TechRecommendationsSection 
                  ro={ro} 
                  onRequestParts={(lineIdx, lineTxt) => {
                    setPartsModalRO(ro);
                    setPartsModalLine({ index: lineIdx, text: lineTxt });
                  }}
                />

                {/* Card Footer: Technician Station Details & Advisor Direct Communication */}
                <div 
                  id={`tech-ro-card-footer-${ro.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 -mx-5 -mb-5 px-5 py-3.5 rounded-b-xl bg-slate-50/90"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      Advisor: <span className="text-blue-900 font-black">{ro.advisorName}</span>
                    </span>
                    {ro.advisorId && ro.advisorId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirectChat(ro.advisorId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold border border-blue-700 transition-all cursor-pointer text-xs shadow-xs hover:shadow-sm"
                        title={`Direct message advisor ${ro.advisorName}`}
                      >
                        <MessageSquare className="w-4 h-4 text-white" />
                        <span>Chat with {ro.advisorName.split(' ')[0]}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
};

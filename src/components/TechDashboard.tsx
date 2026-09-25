import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Clock, 
  Package, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  Play, 
  Calendar, 
  Send,
  Truck,
  Award,
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
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { ROStatus, RepairOrder, ConcernPayType } from '../types';
import { formatDateTime, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails, formatTimeOnly } from '../utils/formatters';
import { TechRecommendationsSection } from './TechRecommendationsSection';
import { WarrantyTimeClockSection } from './WarrantyTimeClockSection';

interface TechCauseCorrectionSectionProps {
  ro: RepairOrder;
  onRequestParts?: () => void;
}

const TechCauseCorrectionSection: React.FC<TechCauseCorrectionSectionProps> = ({ ro, onRequestParts }) => {
  const { updateTechCauseAndCorrection, openQuoteModal } = useApp();
  const [cause, setCause] = useState(ro.cause || ro.diagnosticNotes || '');
  const [correction, setCorrection] = useState(ro.correction || '');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Focus tracking to prevent cursor jumping when spacebar is pressed during background autosave
  const isCauseFocusedRef = useRef(false);
  const isCorrectionFocusedRef = useRef(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestValuesRef = useRef({ cause, correction });

  // Sync state whenever ro prop changes, but NOT while the technician is actively focused and typing
  useEffect(() => {
    const currentROCause = ro.cause || ro.diagnosticNotes || '';
    const currentROCorrection = ro.correction || '';
    if (!isCauseFocusedRef.current && currentROCause !== cause) {
      setCause(currentROCause);
      latestValuesRef.current.cause = currentROCause;
    }
    if (!isCorrectionFocusedRef.current && currentROCorrection !== correction) {
      setCorrection(currentROCorrection);
      latestValuesRef.current.correction = currentROCorrection;
    }
  }, [ro.cause, ro.correction, ro.diagnosticNotes]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const hasContent = Boolean(cause.trim() || correction.trim());
  const isComplete = Boolean(cause.trim() && correction.trim());

  // Debounced auto-save function
  const triggerAutoSave = (newCause: string, newCorrection: string) => {
    latestValuesRef.current = { cause: newCause, correction: newCorrection };
    setAutoSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      updateTechCauseAndCorrection(ro.id, newCause, newCorrection, { isAutoSave: true });
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
    const { cause: c, correction: corr } = latestValuesRef.current;
    updateTechCauseAndCorrection(ro.id, c, corr, { isAutoSave: true });
    setAutoSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const handleManualSave = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const success = updateTechCauseAndCorrection(ro.id, cause, correction, { isAutoSave: false, notify: true });
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
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Documented
                </span>
              ) : hasContent ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-400">
                  Partially Documented
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
        <div className="p-3.5 space-y-3 bg-white" onKeyDown={handleKeyDown}>
          {/* Cause Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>Cause</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={cause}
              onFocus={() => {
                isCauseFocusedRef.current = true;
              }}
              onChange={(e) => {
                const val = e.target.value;
                setCause(val);
                triggerAutoSave(val, correction);
              }}
              onBlur={() => {
                isCauseFocusedRef.current = false;
                handleBlurSave();
              }}
              placeholder="Type cause findings (e.g., Code P0300 - cylinder 3 spark plug fouled with oil due to leaking valve cover spark plug tube seal)..."
              className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Correction Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Correction</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={correction}
              onFocus={() => {
                isCorrectionFocusedRef.current = true;
              }}
              onChange={(e) => {
                const val = e.target.value;
                setCorrection(val);
                triggerAutoSave(cause, val);
              }}
              onBlur={() => {
                isCorrectionFocusedRef.current = false;
                handleBlurSave();
              }}
              placeholder="Type correction performed (e.g., Replaced valve cover gasket and spark plug tube seals, installed new plugs, cleared codes, road tested 5 miles)..."
              className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Tech Quick Actions: ProDemand Labor Lookup & Quote Builder & Request Parts */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="https://www.prodemand.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-colors"
                title="Lookup OEM flat-rate labor times in Mitchell 1 ProDemand"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ProDemand Labor Times ↗</span>
              </a>

              {ro.vehicle.vin && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ro.vehicle.vin);
                    alert(`Copied VIN to clipboard: ${ro.vehicle.vin}`);
                  }}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-mono font-bold border-2 border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                  title="Copy VIN for ProDemand"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy VIN</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onRequestParts && (
                <button
                  type="button"
                  onClick={onRequestParts}
                  className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer shadow-2xs"
                  title="Request required parts from the Parts Department counter"
                >
                  <Package className="w-3.5 h-3.5 text-amber-600" />
                  <span>Request Parts</span>
                </button>
              )}

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
                    <span>{loggedHours > 0 ? `Labor Time: ${loggedHours.toFixed(1)} hrs` : '+ Enter Labor Time'}</span>
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
              <span>All typed information is saved automatically in real-time.</span>
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
  onClose: () => void;
}

interface RequestedPartLine {
  id: string;
  description: string;
  partNumber: string;
  quantity: number;
}

const TechPartsRequestModal: React.FC<TechPartsRequestModalProps> = ({ ro, onClose }) => {
  const { addPartOrder, updateROStatus } = useApp();
  const [partsList, setPartsList] = useState<RequestedPartLine[]>([
    { id: `part_${Date.now()}_1`, description: '', partNumber: '', quantity: 1 }
  ]);
  const [notes, setNotes] = useState('');
  const [finishDiag, setFinishDiag] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ro) return null;

  const handleAddPartLine = () => {
    setPartsList(prev => [
      ...prev,
      { 
        id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, 
        description: '', 
        partNumber: '', 
        quantity: 1 
      }
    ]);
  };

  const handleRemovePartLine = (id: string) => {
    if (partsList.length <= 1) {
      setPartsList([{ id: `part_${Date.now()}_1`, description: '', partNumber: '', quantity: 1 }]);
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
    validParts.forEach(p => {
      addPartOrder(ro.id, {
        description: p.description.trim(),
        partNumber: p.partNumber.trim() || 'TBD',
        quantity: Math.max(1, Number(p.quantity) || 1),
        status: 'REQUESTED',
        vendor: 'Shop Inventory / Supplier',
        estimatedArrival: 'Pending Parts Counter',
        notes: notes.trim() || undefined,
      });
    });

    if (finishDiag && (ro.status === 'BEING_DIAGNOSED' || ro.status === 'WAITING_DIAGNOSIS')) {
      updateROStatus(ro.id, 'WAITING_PARTS');
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full border-2 border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Technician Parts Request</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-extrabold rounded-full">
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Section: Parts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Required Parts & Quantities <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Specify each required part with its own distinct quantity
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPartLine}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Part</span>
              </button>
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
                    <div className="sm:col-span-6">
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
                    <div className="sm:col-span-3">
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
                    <div className="sm:col-span-3">
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
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Another Button */}
            <button
              type="button"
              onClick={handleAddPartLine}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Part</span>
            </button>
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
              placeholder="e.g. Customer is waiting in lounge, please source ASAP or check local warehouse delivery."
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
                Mark Diagnosis Finished & Move RO to "Waiting on Parts"
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
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  Submit {validPartsCount > 0 ? `${validPartsCount} ` : ''}
                  Part{validPartsCount === 1 ? '' : 's'} to Parts Counter
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
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-blue-400" />
                  <span>{currentUser.certificationLevel || currentUser.bayNumber || 'Technician'}</span>
                </span>
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

        {/* Quick Bay Metrics including Diagnostic Breakdown */}
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
            <h3 className="text-sm font-bold text-slate-800">Your Bay Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">
              No repair orders currently in this queue. When a Service Advisor assigns work to your bay, it will show up here immediately with real-time push alerts.
            </p>
          </div>
        ) : (
          displayList.map(ro => {
            const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
            const hasPartsETA = ro.parts.some(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED');

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
                      title="Open Mitchell 1 ProDemand for OEM flat-rate labor times"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ProDemand Labor ↗</span>
                    </a>

                    {ro.vehicle.vin && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ro.vehicle.vin);
                          alert(`Copied VIN: ${ro.vehicle.vin}`);
                        }}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-mono font-bold border-2 border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer"
                        title="Copy VIN for ProDemand"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>Copy VIN</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPartsModalRO(ro)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-600 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Request parts needed from the Parts Department"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Request Parts</span>
                    </button>

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
                          <span>{loggedHours > 0 ? `Labor Time: ${loggedHours.toFixed(1)} hrs` : '+ Enter Labor Time'}</span>
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
                        Staged in bay • In queue since {formatTimeOnly(ro.waitingDiagnosisAt)} ({formatDurationSince(ro.waitingDiagnosisAt)} wait)
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

                {/* Customer Complaints & Concerns */}
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  onMouseDown={(e) => e.stopPropagation()} 
                  className="bg-slate-50 p-3 rounded-lg border-2 border-slate-300 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Customer Complaints & Concerns:</span>
                    </span>
                    {ro.concerns && ro.concerns.length > 1 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                        {ro.concerns.length} Line Items
                      </span>
                    )}
                  </div>

                  {/* Complaint Lines with Pay Type Selector (Customer Pay, Warranty, Internal) */}
                  <div className="space-y-2">
                    {((ro.concerns && ro.concerns.length > 0) ? ro.concerns : [ro.primaryConcern || 'Customer Concern']).map((concern, idx) => {
                      const currentPayType: ConcernPayType = ro.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-lg border-2 border-slate-300 shadow-2xs">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded uppercase tracking-wider shrink-0 mt-0.5">
                              Line {idx + 1}
                            </span>
                            {ro.concernTechIds?.[idx] === currentUser.id && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-600 text-white rounded uppercase tracking-wider shrink-0 mt-0.5 shadow-2xs">
                                Your Line
                              </span>
                            )}
                            <span className="text-slate-800 font-medium leading-relaxed break-words">{concern}</span>
                          </div>

                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center"
                          >
                            {canSelectPayType ? (
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-md border border-slate-300">
                                <span className="text-[10px] font-bold text-slate-500 mr-1 hidden xs:inline uppercase tracking-wider">Type:</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConcernPayType(ro.id, idx, 'CUSTOMER_PAY');
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentPayType === 'CUSTOMER_PAY'
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
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
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentPayType === 'WARRANTY'
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
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
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                    currentPayType === 'INTERNAL'
                                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                  }`}
                                  title="Internal"
                                >
                                  Internal
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  currentPayType === 'CUSTOMER_PAY'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : currentPayType === 'WARRANTY'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                  {currentPayType === 'CUSTOMER_PAY' ? 'Customer Pay' : currentPayType === 'WARRANTY' ? 'Warranty' : 'Internal'}
                                </span>
                              </div>
                            )}

                            {/* Line Technician Selector */}
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">
                              <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
                              {canAssignTech ? (
                                <select
                                  value={ro.concernTechIds?.[idx] || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const tId = e.target.value;
                                    const t = users.find(u => u.id === tId);
                                    updateConcernTech(ro.id, idx, tId, t?.name);
                                  }}
                                  className={`text-[11px] font-bold bg-white border rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer ${
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
                                  {ro.concernTechNames?.[idx] || ro.techName || 'Unassigned'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Technician Diagnosis & Repair Documentation: Cause & Correction */}
                <TechCauseCorrectionSection ro={ro} onRequestParts={() => setPartsModalRO(ro)} />

                {/* Official Warranty Labor Time Clock & Multi-Punch Tracking */}
                <WarrantyTimeClockSection ro={ro} />

                {/* Technician Additional Recommended Services (MPI Upsells / Filter / Tires / Scheduled Maint) */}
                <TechRecommendationsSection ro={ro} />

                {/* Prominent Parts Arrival Tracker */}
                {ro.parts.length > 0 ? (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-50 p-3 rounded-lg border-2 border-slate-300 space-y-2 select-text"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-orange-600" />
                        Parts Ordered & Estimated Arrival Time
                      </span>
                      <div className="flex items-center gap-2">
                        {hasPartsETA && (
                          <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-300">
                            Live Delivery
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPartsModalRO(ro)}
                          className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Request More Parts</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {ro.parts.map(part => {
                        const etaBadge = formatEtaBadge(part.estimatedArrival);
                        return (
                          <div 
                            key={part.id} 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-between text-xs bg-white p-2 rounded-md border-2 border-slate-300"
                          >
                            <div className="truncate pr-2">
                              <span className="font-mono text-slate-500 text-[11px] mr-1.5 font-bold">#{part.partNumber}</span>
                              <span className="font-semibold text-slate-800">{part.description}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : 'bg-orange-100 text-orange-700 border-orange-300'
                              }`}>
                                {part.status.replace('_', ' ')}
                              </span>
                              {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  etaBadge.pastDue ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'
                                }`}>
                                  {etaBadge.text}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span>Need parts or shop supplies for this repair order?</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setPartsModalRO(ro)}
                      className="px-2.5 py-1 rounded text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                      <span>Request Parts</span>
                    </button>
                  </div>
                )}

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
                  <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs">
                    <span>Assigned Bay: <strong className="text-slate-900 font-bold">{ro.bay ? `Bay ${ro.bay}` : 'Standard Bay'}</strong></span>
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
        onClose={() => setPartsModalRO(null)} 
      />
    </div>
  );
};

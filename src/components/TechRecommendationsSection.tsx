import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  RepairOrder, 
  RecommendedService, 
  ConcernPayType,
  InspectionCategory,
  InspectionChecklistItem,
  InspectionItemStatus,
  InspectionResultItem
} from '../types';
import { useApp } from '../context/AppContext';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { TechPartsRequestModal } from './TechDashboard';
import { InspectionPrintModal } from './InspectionPrintModal';
import { formatEtaBadge } from '../utils/formatters';
import { 
  Plus, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  ClipboardCheck, 
  Wrench, 
  Package, 
  ShoppingCart, 
  Calculator, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  Loader2, 
  FileText,
  Layers,
  RotateCcw,
  Printer
} from 'lucide-react';

interface TechRecommendationsSectionProps {
  ro: RepairOrder;
  compact?: boolean;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
}

const PRESET_SERVICES = [
  { label: 'Engine Air Filter', category: 'AIR_FILTER' as const, defaultUrgency: 'RECOMMENDED' as const, defaultHours: 0.3 },
  { label: 'Cabin Air Filter', category: 'CABIN_FILTER' as const, defaultUrgency: 'RECOMMENDED' as const, defaultHours: 0.4 },
  { label: 'Tires (Replace / Rotate)', category: 'TIRES' as const, defaultUrgency: 'SAFETY' as const, defaultHours: 1.0 },
  { label: 'Scheduled Maintenance', category: 'SCHEDULED_MAINT' as const, defaultUrgency: 'RECOMMENDED' as const, defaultHours: 1.5 },
  { label: 'Front Brake Pads & Rotors', category: 'BRAKES' as const, defaultUrgency: 'SAFETY' as const, defaultHours: 2.0 },
  { label: 'Rear Brake Pads & Rotors', category: 'BRAKES' as const, defaultUrgency: 'SAFETY' as const, defaultHours: 2.0 },
  { label: 'Battery Replacement', category: 'BATTERY' as const, defaultUrgency: 'RECOMMENDED' as const, defaultHours: 0.5 },
  { label: 'Wiper Blades (Front & Rear)', category: 'WIPERS' as const, defaultUrgency: 'RECOMMENDED' as const, defaultHours: 0.2 },
];

const CATEGORY_CONFIG: Record<InspectionCategory, { title: string; icon: string; bg: string; border: string }> = {
  UNDER_HOOD: {
    title: '1. Under Hood & Fluid Levels (6 Points)',
    icon: '🚗',
    bg: 'bg-blue-50/60',
    border: 'border-blue-200',
  },
  BRAKES_SUSPENSION: {
    title: '2. Brakes & Suspension (5 Points)',
    icon: '🛑',
    bg: 'bg-amber-50/60',
    border: 'border-amber-200',
  },
  TIRES_WHEELS: {
    title: '3. Tires & Wheel Conditions (5 Points)',
    icon: '🛞',
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
  },
  UNDERBODY_EXTERIOR: {
    title: '4. Underbody, Battery & Exterior (5 Points)',
    icon: '⚡',
    bg: 'bg-purple-50/60',
    border: 'border-purple-200',
  },
};

export const TechRecommendationsSection: React.FC<TechRecommendationsSectionProps> = ({ 
  ro: initialRO, 
  compact = false,
  onRequestParts
}) => {
  const { 
    currentUser, 
    users,
    repairOrders,
    addRecommendedService, 
    updateRecommendedService,
    deleteRecommendedService,
    updateRecommendedServiceStatus,
    setInspectionItemResult,
    passAllInspectionItems,
    resetROInspection,
    inspectionChecklist,
    deletePartItem,
    updatePartItem
  } = useApp();

  const ro = repairOrders.find(r => r.id === initialRO.id) || initialRO;

  const isTech = currentUser.role === 'TECHNICIAN';
  const isAdvisorOrMgr = currentUser.role === 'SERVICE_ADVISOR' || currentUser.role === 'SERVICE_MANAGER';

  // Section toggle state (default expanded)
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);
  const [isInspectionGridOpen, setIsInspectionGridOpen] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Recommendations state
  const recommendations = ro.recommendations || [];
  const pendingCount = recommendations.filter(r => r.status === 'PENDING').length;
  const approvedCount = recommendations.filter(r => r.status === 'APPROVED').length;

  // Inspection Sheet & Checklist data
  const effectiveChecklist = inspectionChecklist && inspectionChecklist.length > 0 
    ? inspectionChecklist 
    : DEFAULT_INSPECTION_CHECKLIST;

  const inspectionItemsMap = ro.inspection?.items || {};
  const totalChecklistCount = effectiveChecklist.filter(i => i.isEnabled !== false).length;

  const passedCount = useMemo(() => {
    return Object.values(inspectionItemsMap).filter(i => i.status === 'PASSED').length;
  }, [inspectionItemsMap]);

  const attentionCount = useMemo(() => {
    return Object.values(inspectionItemsMap).filter(i => i.status === 'FUTURE_ATTENTION').length;
  }, [inspectionItemsMap]);

  const safetyCount = useMemo(() => {
    return Object.values(inspectionItemsMap).filter(i => i.status === 'IMMEDIATE_ATTENTION').length;
  }, [inspectionItemsMap]);

  const naCount = useMemo(() => {
    return Object.values(inspectionItemsMap).filter(i => i.status === 'NOT_APPLICABLE').length;
  }, [inspectionItemsMap]);

  const totalInspected = passedCount + attentionCount + safetyCount + naCount;
  const isInspectionComplete = totalChecklistCount > 0 && totalInspected >= totalChecklistCount;

  // Internal parts modal state (if onRequestParts is not provided externally)
  const [internalPartsRO, setInternalPartsRO] = useState<RepairOrder | null>(null);
  const [internalPartsLine, setInternalPartsLine] = useState<{ index?: number; text?: string }>({});

  const handleOpenPartsModal = (lineIdx?: number, lineTxt?: string) => {
    if (onRequestParts) {
      onRequestParts(lineIdx, lineTxt);
    } else {
      setInternalPartsRO(ro);
      setInternalPartsLine({ index: lineIdx, text: lineTxt });
    }
  };

  // Expandable parts ordered drawer per recommendation line
  const [viewingPartsLineIndex, setViewingPartsLineIndex] = useState<number | null>(null);

  // Add recommendation form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [category, setCategory] = useState<RecommendedService['category']>('AIR_FILTER');
  const [urgency, setUrgency] = useState<'SAFETY' | 'RECOMMENDED'>('RECOMMENDED');
  const [formHours, setFormHours] = useState('');
  const [formPayType, setFormPayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [formCause, setFormCause] = useState('');
  const [formCorrection, setFormCorrection] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Local state for recommendation line edits with debounced auto-save
  const [recLaborHours, setRecLaborHours] = useState<Record<string, string>>({});
  const [recCauses, setRecCauses] = useState<Record<string, string>>({});
  const [recCorrections, setRecCorrections] = useState<Record<string, string>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const [lastSavedTime, setLastSavedTime] = useState<Record<string, string>>({});

  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const focusedFieldRef = useRef<{ recId: string; field: 'hours' | 'cause' | 'correction' } | null>(null);

  // Initialize local edit state from recommendations
  useEffect(() => {
    const nextHours: Record<string, string> = {};
    const nextCauses: Record<string, string> = {};
    const nextCorrections: Record<string, string> = {};

    recommendations.forEach(rec => {
      if (focusedFieldRef.current?.recId === rec.id) {
        // Keep current focused values to avoid cursor jumping
        nextHours[rec.id] = recLaborHours[rec.id] ?? (rec.laborHours !== undefined ? String(rec.laborHours) : '');
        nextCauses[rec.id] = recCauses[rec.id] ?? (rec.cause || '');
        nextCorrections[rec.id] = recCorrections[rec.id] ?? (rec.correction || '');
      } else {
        nextHours[rec.id] = rec.laborHours !== undefined && rec.laborHours !== null ? String(rec.laborHours) : '';
        nextCauses[rec.id] = rec.cause || '';
        nextCorrections[rec.id] = rec.correction || '';
      }
    });

    setRecLaborHours(nextHours);
    setRecCauses(nextCauses);
    setRecCorrections(nextCorrections);
  }, [ro.recommendations]);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  const triggerRecAutoSave = (recId: string, updates: Partial<RecommendedService>) => {
    setAutoSaveStatus(prev => ({ ...prev, [recId]: 'saving' }));

    if (debounceTimersRef.current[recId]) {
      clearTimeout(debounceTimersRef.current[recId]);
    }

    debounceTimersRef.current[recId] = setTimeout(() => {
      updateRecommendedService(ro.id, recId, updates);
      setAutoSaveStatus(prev => ({ ...prev, [recId]: 'saved' }));
      setLastSavedTime(prev => ({ 
        ...prev, 
        [recId]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      }));
    }, 600);
  };

  const handleHoursChange = (recId: string, val: string) => {
    setRecLaborHours(prev => ({ ...prev, [recId]: val }));
    const numHours = val.trim() === '' ? undefined : Number(val);
    triggerRecAutoSave(recId, { laborHours: numHours });
  };

  const handleCauseChange = (recId: string, val: string) => {
    setRecCauses(prev => ({ ...prev, [recId]: val }));
    triggerRecAutoSave(recId, { cause: val });
  };

  const handleCorrectionChange = (recId: string, val: string) => {
    setRecCorrections(prev => ({ ...prev, [recId]: val }));
    triggerRecAutoSave(recId, { correction: val });
  };

  const handleSelectPreset = (preset: typeof PRESET_SERVICES[0]) => {
    setSelectedPreset(preset.label);
    setCustomServiceName(preset.label);
    setCategory(preset.category);
    setUrgency(preset.defaultUrgency);
    setFormHours(preset.defaultHours ? String(preset.defaultHours) : '');
    setFormCause(`${preset.label} condition inspected and replacement / service recommended.`);
    setFormCorrection(`Perform ${preset.label} and verify operation.`);
    setIsFormOpen(true);
  };

  const handleCustomClick = () => {
    setSelectedPreset('CUSTOM');
    setCustomServiceName('');
    setCategory('OTHER');
    setUrgency('RECOMMENDED');
    setFormHours('');
    setFormCause('');
    setFormCorrection('');
    setIsFormOpen(true);
  };

  const handleSubmitNewRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceTitle = customServiceName.trim();
    if (!serviceTitle) return;

    setIsSubmitting(true);
    const success = addRecommendedService(ro.id, {
      serviceName: serviceTitle,
      category,
      urgency,
      laborHours: formHours.trim() ? Number(formHours) : undefined,
      payType: formPayType,
      cause: formCause.trim() || undefined,
      correction: formCorrection.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (success) {
      setStatusFeedback(`Added "${serviceTitle}" (Line ${recommendations.length + 1}) to Repair Order!`);
      setCustomServiceName('');
      setFormHours('');
      setFormCause('');
      setFormCorrection('');
      setNotes('');
      setSelectedPreset('');
      setIsFormOpen(false);
      setTimeout(() => setStatusFeedback(null), 4000);
    }
    setIsSubmitting(false);
  };

  const handleReviewStatus = (recId: string, status: 'APPROVED' | 'DECLINED', reason?: string) => {
    updateRecommendedServiceStatus(ro.id, recId, status, reason);
  };

  // Helper to find all recommendations matching an inspection item
  const findMatchingRecs = (itemId: string, item: InspectionChecklistItem) => {
    const recName = (item.defaultRecommendationName || '').toLowerCase().trim();
    const itemName = item.name.toLowerCase().trim();
    const itemNumPrefix = `${item.order}.`;

    return recommendations.filter(r => {
      if (r.inspectionItemId && r.inspectionItemId === itemId) return true;
      const sName = (r.serviceName || '').toLowerCase().trim();
      if (recName && (sName.includes(recName) || recName.includes(sName))) return true;
      if (itemName && (sName.includes(itemName) || itemName.includes(sName))) return true;
      if (r.cause && (r.cause.toLowerCase().includes(itemName) || (recName && r.cause.toLowerCase().includes(recName)) || r.cause.includes(itemId) || r.cause.includes(itemNumPrefix))) return true;
      return false;
    });
  };

  const findLinkedRec = (itemId: string, item: InspectionChecklistItem) => {
    const matching = findMatchingRecs(itemId, item);
    return matching[0];
  };

  // 21-Point Inspection Checklist Item Status change
  const handleSetInspectionStatus = (item: InspectionChecklistItem, status: InspectionItemStatus) => {
    const existing = inspectionItemsMap[item.id];

    setInspectionItemResult(ro.id, item.id, {
      status,
      name: item.name,
      category: item.category,
      measurementValue: existing?.measurementValue || '',
      notes: status === 'PASSED' || status === 'NOT_APPLICABLE' ? '' : (existing?.notes || ''),
    });

    if (status === 'PASSED') {
      setStatusFeedback(`Marked "${item.name}" as Checked & OK.`);
    } else if (status === 'FUTURE_ATTENTION') {
      setStatusFeedback(`Marked "${item.name}" for Future Attention (Yellow).`);
    } else if (status === 'IMMEDIATE_ATTENTION') {
      setStatusFeedback(`Marked "${item.name}" for Immediate Attention (Red).`);
    } else if (status === 'NOT_APPLICABLE') {
      setStatusFeedback(`Marked "${item.name}" as N/A.`);
    }
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  // Handle Quick-Chip Click inside expanded inspection item box
  const handleQuickChipClick = (item: InspectionChecklistItem, chipText: string) => {
    const existing = inspectionItemsMap[item.id];
    const currentNotes = existing?.notes || '';
    const newNotes = currentNotes ? `${currentNotes}, ${chipText}` : chipText;

    // Update inspection item note
    setInspectionItemResult(ro.id, item.id, {
      notes: newNotes,
      name: item.name,
      category: item.category,
    });

    // Sync to linked recommendation line
    const linked = findLinkedRec(item.id, item);
    const updatedRecName = `${item.name} (${chipText})`;
    const updatedCause = `${item.name} inspected: ${chipText}.`;
    const updatedCorrection = `Perform ${chipText} / ${item.defaultRecommendationName || 'replacement'} as needed and test.`;

    if (linked) {
      updateRecommendedService(ro.id, linked.id, {
        serviceName: linked.serviceName === item.name || linked.serviceName === item.defaultRecommendationName ? updatedRecName : linked.serviceName,
        notes: newNotes,
        cause: linked.cause ? `${linked.cause} [${chipText}]` : updatedCause,
        correction: linked.correction || updatedCorrection,
      });
    } else {
      const urgency = existing?.status === 'IMMEDIATE_ATTENTION' ? 'SAFETY' : 'RECOMMENDED';
      addRecommendedService(ro.id, {
        serviceName: updatedRecName,
        category: item.category === 'TIRES_WHEELS' ? 'TIRES' : item.category === 'BRAKES_SUSPENSION' ? 'BRAKES' : item.category === 'UNDER_HOOD' ? 'AIR_FILTER' : 'OTHER',
        urgency,
        inspectionItemId: item.id,
        cause: updatedCause,
        correction: updatedCorrection,
        notes: newNotes,
        laborHours: item.category === 'TIRES_WHEELS' ? 1.0 : item.category === 'BRAKES_SUSPENSION' ? 2.0 : 0.5,
        payType: 'CUSTOMER_PAY'
      });
    }

    setStatusFeedback(`Updated finding: "${chipText}" linked to Recommendation Line!`);
    setTimeout(() => setStatusFeedback(null), 3000);
  };

  // Handle Custom Notes Typing inside expanded inspection item box
  const handleInspectionNotesChange = (item: InspectionChecklistItem, noteText: string) => {
    setInspectionItemResult(ro.id, item.id, {
      notes: noteText,
      name: item.name,
      category: item.category,
    });

    const linked = findLinkedRec(item.id, item);
    if (linked) {
      updateRecommendedService(ro.id, linked.id, {
        notes: noteText,
        cause: noteText ? `${item.name} finding: ${noteText}` : linked.cause,
      });
    }
  };

  const handleSetMeasurement = (item: InspectionChecklistItem, val: string) => {
    setInspectionItemResult(ro.id, item.id, {
      measurementValue: val,
      name: item.name,
      category: item.category,
    });
  };

  // Group checklist items by category
  const categories: InspectionCategory[] = ['UNDER_HOOD', 'BRAKES_SUSPENSION', 'TIRES_WHEELS', 'UNDERBODY_EXTERIOR'];

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      onMouseDown={(e) => e.stopPropagation()}
      className="bg-white rounded-xl border-2 border-slate-400 overflow-hidden shadow-2xs transition-all space-y-0"
    >
      {/* Main Step 3 Header */}
      <div 
        onClick={() => setIsSectionExpanded(!isSectionExpanded)}
        className="p-3 bg-slate-50/90 border-b-2 border-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-100/90 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg border bg-blue-100 text-blue-700 border-blue-300">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                Step 3: 21-Point Inspection & Recommended Services
              </span>

              {/* Inspection Progress Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                isInspectionComplete
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : totalInspected > 0
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-slate-200 text-slate-700 border-slate-300'
              }`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {totalInspected} of {totalChecklistCount} Inspected
              </span>

              {/* Safety & Attention Badges */}
              {safetyCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  {safetyCount} Safety
                </span>
              )}

              {attentionCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {attentionCount} Attention
                </span>
              )}

              {/* Recommendations Badges */}
              {pendingCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {pendingCount} Awaiting Approval
                </span>
              )}

              {approvedCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  {approvedCount} Authorized
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Print MPI Sheet & Recommendations Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPrintModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-md transition-all shadow-2xs hover:shadow-xs cursor-pointer border border-slate-700 active:scale-95"
            title="Preview and print official 21-Point Multi-Point Inspection (MPI) sheet & recommendations"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Print MPI Sheet</span>
          </button>

          {/* Quick 1-Click Pass All 21 Points Button */}
          {isTech && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                passAllInspectionItems(ro.id);
                setStatusFeedback('All 21 inspection points marked PASSED / OK!');
                setTimeout(() => setStatusFeedback(null), 3000);
              }}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
              title="Quickly mark all 21 checklist points as Passed (Green / OK)"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pass All 21 Points</span>
            </button>
          )}

          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 p-1 rounded-md"
            title={isSectionExpanded ? "Collapse" : "Expand"}
          >
            {isSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Step 3 Body */}
      {isSectionExpanded && (
        <div className="p-3.5 space-y-4 bg-white">
          {/* Status Feedback Toast */}
          {statusFeedback && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. 21-POINT MULTI-POINT INSPECTION (MPI) CHECKLIST SECTION */}
          {/* ========================================================================= */}
          <div className="rounded-xl border-2 border-slate-300 bg-slate-50/70 p-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  <span>21-Point Vehicle Multi-Point Inspection Sheet (MPI)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {passedCount} OK • {attentionCount} Attention • {safetyCount} Safety
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPrintModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                  title="Print official 21-point vehicle inspection report"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Print Report</span>
                </button>

                {isTech && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      passAllInspectionItems(ro.id);
                      setStatusFeedback('All 21 inspection points marked PASSED / OK!');
                      setTimeout(() => setStatusFeedback(null), 3000);
                    }}
                    className="inline-flex sm:hidden items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Pass All</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsInspectionGridOpen(!isInspectionGridOpen)}
                  className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isInspectionGridOpen ? 'Collapse Checklist' : 'Show 21 Points Checklist'}</span>
                  {isInspectionGridOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* 21-Point Inspection Grid by Category */}
            {isInspectionGridOpen && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
                {categories.map((catKey) => {
                  const catConfig = CATEGORY_CONFIG[catKey];
                  const itemsInCat = effectiveChecklist.filter(i => i.category === catKey && i.isEnabled !== false);

                  return (
                    <div 
                      key={catKey}
                      className={`rounded-lg border ${catConfig.border} ${catConfig.bg} p-2.5 space-y-2`}
                    >
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5 border-b border-slate-200/80 pb-1.5">
                        <span>{catConfig.icon}</span>
                        <span>{catConfig.title}</span>
                      </div>

                      <div className="space-y-2">
                        {itemsInCat.map((item) => {
                          const result = inspectionItemsMap[item.id];
                          const hasResult = Boolean(result);
                          const status = result?.status;
                          const isPassed = hasResult && status === 'PASSED';
                          const isFuture = hasResult && status === 'FUTURE_ATTENTION';
                          const isImmediate = hasResult && status === 'IMMEDIATE_ATTENTION';
                          const isNA = hasResult && status === 'NOT_APPLICABLE';
                          const isAttentionOrSafety = isFuture || isImmediate;
                          const linkedRec = findLinkedRec(item.id, item);
                          const linkedRecIndex = linkedRec ? recommendations.findIndex(r => r.id === linkedRec.id) : -1;

                          return (
                            <div 
                              key={item.id}
                              className={`rounded-lg border transition-all shadow-2xs ${
                                isImmediate
                                  ? 'bg-red-50/70 border-red-400 border-l-4 border-l-red-600 p-2.5 space-y-2'
                                  : isFuture
                                  ? 'bg-amber-50/70 border-amber-400 border-l-4 border-l-amber-500 p-2.5 space-y-2'
                                  : isPassed
                                  ? 'bg-emerald-50/40 border-emerald-300 border-l-4 border-l-emerald-600 p-2'
                                  : isNA
                                  ? 'bg-slate-50 border-slate-300 p-2'
                                  : 'bg-white border-slate-200 p-2 hover:border-slate-300'
                              }`}
                            >
                              {/* Main Item Header Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-bold ${
                                      isImmediate ? 'text-red-950 font-black' : isFuture ? 'text-amber-950 font-black' : isPassed ? 'text-emerald-950' : 'text-slate-900'
                                    }`}>
                                      {item.order}. {item.name}
                                    </span>
                                    {item.hasMeasurement && (
                                      <div className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px] shadow-2xs">
                                        <span className="text-slate-600 font-semibold">{item.measurementLabel || item.measurementUnit}:</span>
                                        <input
                                          type="text"
                                          value={result?.measurementValue || ''}
                                          onChange={(e) => handleSetMeasurement(item, e.target.value)}
                                          placeholder={item.measurementUnit || 'value'}
                                          className="w-12 px-1 py-0.2 bg-white border border-slate-300 rounded font-bold text-center text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 4-way Status Selector Buttons with High-Contrast Distinct Styles */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* 🟢 OK Button - Highlighted in Green when selected */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetInspectionStatus(item, 'PASSED')}
                                    className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isPassed
                                        ? 'bg-emerald-600 text-white border-2 border-emerald-700 shadow-md font-black ring-2 ring-emerald-400 scale-[1.03]'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 font-bold shadow-2xs'
                                    }`}
                                    title="Checked and OK (Passed)"
                                  >
                                    <span>🟢</span>
                                    <span>OK</span>
                                  </button>

                                  {/* 🟡 Future Button - Highlighted in Yellow when selected */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetInspectionStatus(item, 'FUTURE_ATTENTION')}
                                    className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isFuture
                                        ? 'bg-yellow-400 text-black border-2 border-yellow-500 shadow-md font-black ring-2 ring-yellow-300 scale-[1.03]'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-yellow-50 hover:border-yellow-400 font-bold shadow-2xs'
                                    }`}
                                    title="May require future attention (Recommended)"
                                  >
                                    <span>🟡</span>
                                    <span>Future</span>
                                  </button>

                                  {/* 🔴 Immediate Button - Highlighted in Red when selected */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetInspectionStatus(item, 'IMMEDIATE_ATTENTION')}
                                    className={`px-3 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isImmediate
                                        ? 'bg-red-600 text-white border-2 border-red-700 shadow-md font-black ring-2 ring-red-400 scale-[1.03]'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-red-50 hover:border-red-400 font-bold shadow-2xs'
                                    }`}
                                    title="Immediate safety or mechanical concern (Critical)"
                                  >
                                    <span>🔴</span>
                                    <span>Immediate</span>
                                  </button>

                                  {/* ⚪ N/A Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetInspectionStatus(item, 'NOT_APPLICABLE')}
                                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                      isNA
                                        ? 'bg-slate-700 text-white border-2 border-slate-800 shadow-md font-black ring-2 ring-slate-400 scale-[1.03]'
                                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 hover:text-slate-900 font-bold shadow-2xs'
                                    }`}
                                    title="Not Applicable"
                                  >
                                    <span>⚪</span>
                                    <span>N/A</span>
                                  </button>
                                </div>
                              </div>

                              {/* INLINE SPECIFIC FINDING & COMPONENT DETAILS (Expands on Yellow / Red) */}
                              {isAttentionOrSafety && (
                                <div className={`p-2.5 rounded-md border text-xs space-y-2 animate-in fade-in duration-150 ${
                                  status === 'IMMEDIATE_ATTENTION' 
                                    ? 'bg-red-50/80 border-red-300' 
                                    : 'bg-amber-50/80 border-amber-300'
                                }`}>
                                  <div className="flex items-center justify-between gap-1 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                      status === 'IMMEDIATE_ATTENTION' ? 'text-red-900' : 'text-amber-900'
                                    }`}>
                                      {status === 'IMMEDIATE_ATTENTION' ? <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                                      <span>{status === 'IMMEDIATE_ATTENTION' ? 'Specific Safety Finding Details' : 'Specific Attention Finding Details'}:</span>
                                    </span>

                                    {linkedRecIndex >= 0 ? (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1 shadow-2xs">
                                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                                          <span>Linked to</span>
                                          <span className="text-blue-700 font-black">Line {linkedRecIndex + 1}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (linkedRec) {
                                              deleteRecommendedService(ro.id, linkedRec.id);
                                              setStatusFeedback(`Removed Line item "${linkedRec.serviceName}".`);
                                              setTimeout(() => setStatusFeedback(null), 3000);
                                            }
                                          }}
                                          className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 transition-colors cursor-pointer"
                                          title="Remove this line from recommendations"
                                        >
                                          ✕ Remove Line
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const recName = item.defaultRecommendationName || item.name;
                                          addRecommendedService(ro.id, {
                                            serviceName: recName,
                                            category: item.category === 'TIRES_WHEELS' ? 'TIRES' : item.category === 'BRAKES_SUSPENSION' ? 'BRAKES' : item.category === 'UNDER_HOOD' ? 'AIR_FILTER' : 'OTHER',
                                            urgency: status === 'IMMEDIATE_ATTENTION' ? 'SAFETY' : 'RECOMMENDED',
                                            inspectionItemId: item.id,
                                            cause: `${item.name} finding: ${result?.notes || 'Future maintenance recommended.'}`,
                                            correction: `Perform ${recName}`,
                                            laborHours: item.category === 'TIRES_WHEELS' ? 1.0 : item.category === 'BRAKES_SUSPENSION' ? 2.0 : 0.5,
                                            payType: 'CUSTOMER_PAY'
                                          });
                                          setStatusFeedback(`Created recommendation line for "${recName}"!`);
                                          setTimeout(() => setStatusFeedback(null), 3000);
                                        }}
                                        className="text-[10px] font-bold text-blue-700 bg-white hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-300 transition-colors cursor-pointer shadow-2xs"
                                      >
                                        + Add to Recommendation Lines
                                      </button>
                                    )}
                                  </div>

                                  {/* Quick 1-Tap Component Sub-Selection Chips */}
                                  {item.quickChips && item.quickChips.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-[10px] font-extrabold text-slate-700">
                                        Tap Specific Component / Issue:
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {item.quickChips.map((chip) => {
                                          const isSelected = Boolean(
                                            result?.notes?.includes(chip) || 
                                            linkedRec?.notes?.includes(chip) || 
                                            linkedRec?.serviceName?.includes(chip) ||
                                            linkedRec?.cause?.includes(chip)
                                          );

                                          return (
                                            <button
                                              key={chip}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleQuickChipClick(item, chip);
                                              }}
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer shadow-2xs ${
                                                isSelected
                                                  ? 'bg-blue-600 text-white border-blue-700 font-black ring-1 ring-blue-300'
                                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-400'
                                              }`}
                                              title={`Tag "${chip}" on Line ${linkedRecIndex >= 0 ? linkedRecIndex + 1 : ''}`}
                                            >
                                              + {chip}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Specific Finding Notes Input */}
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-extrabold text-slate-700">
                                      Detailed Observation & Location Notes (Updates Line Cause):
                                    </label>
                                    <input
                                      type="text"
                                      value={result?.notes || ''}
                                      onChange={(e) => handleInspectionNotesChange(item, e.target.value)}
                                      placeholder={`e.g. ${item.name} finding details, which side, leak severity, part needing replacement...`}
                                      className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. RECOMMENDED SERVICES & FINDINGS (3 C's / LINE 1, LINE 2 FORMAT) */}
          {/* ========================================================================= */}
          <div className="space-y-3 pt-1 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <span>Recommended Services & Inspection Findings (Lines)</span>
                </span>
                {recommendations.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                    {recommendations.length} {recommendations.length === 1 ? 'Line Item' : 'Line Items'}
                  </span>
                )}
              </div>

              {/* Add Line Toggle Button */}
              {isTech && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFormOpen(!isFormOpen);
                  }}
                  className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isFormOpen ? 'Close Form' : '+ Add Recommended Service / Finding'}</span>
                  {isFormOpen ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              )}
            </div>

            {/* Quick 1-Tap Presets Bar (when form is not open) */}
            {isTech && !isFormOpen && (
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Quick 1-Tap Recommendation Presets:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_SERVICES.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPreset(p);
                      }}
                      className="text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>+ {p.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomClick();
                    }}
                    className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                  >
                    + Other Custom Line...
                  </button>
                </div>
              </div>
            )}

            {/* Inline Add New Recommendation Form */}
            {isFormOpen && (
              <form 
                onSubmit={handleSubmitNewRecommendation}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl border-2 border-blue-400 p-3.5 space-y-3 shadow-sm"
              >
                <div className="text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <span>Create Recommended Service Line</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Notifies Service Advisor for customer quote & authorization
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Service Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Recommended Service / Finding Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      placeholder="e.g. Front Brake Pad & Rotor Replacement, Engine Air Filter..."
                      className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  {/* Labor Hours Requested */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Labor Hours</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99"
                      value={formHours}
                      onChange={(e) => setFormHours(e.target.value)}
                      placeholder="e.g. 1.5"
                      className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as RecommendedService['category'])}
                      className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    >
                      <option value="AIR_FILTER">Air Filter (Engine)</option>
                      <option value="CABIN_FILTER">Cabin Air Filter</option>
                      <option value="TIRES">Tires / Alignment</option>
                      <option value="SCHEDULED_MAINT">Scheduled Maintenance</option>
                      <option value="BRAKES">Brakes (Pads / Rotors)</option>
                      <option value="BATTERY">Battery & Charging</option>
                      <option value="WIPERS">Wiper Blades</option>
                      <option value="OTHER">Other Recommended Item</option>
                    </select>
                  </div>

                  {/* Urgency Selection */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUrgency('RECOMMENDED');
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          urgency === 'RECOMMENDED'
                            ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Recommended</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUrgency('SAFETY');
                        }}
                        className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          urgency === 'SAFETY'
                            ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>Immediate Safety</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Line Cause & Line Correction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Line Cause / Inspection Findings
                    </label>
                    <textarea
                      rows={2}
                      value={formCause}
                      onChange={(e) => setFormCause(e.target.value)}
                      placeholder="e.g. Front brake pads measured 3mm, nearing minimum safety threshold..."
                      className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Line Correction / Recommended Action
                    </label>
                    <textarea
                      rows={2}
                      value={formCorrection}
                      onChange={(e) => setFormCorrection(e.target.value)}
                      placeholder="e.g. Install new ceramic front brake pads and resurface front brake rotors..."
                      className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !customServiceName.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Submit Recommendation to Advisor</span>
                  </button>
                </div>
              </form>
            )}

            {/* List of Recommended Lines Styled Exactly like Cause & Correction (Line 1, Line 2...) */}
            {recommendations.length === 0 ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <span>No additional recommended services or inspection findings logged on this repair order.</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                  All 21 Points Clean
                </span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recommendations.map((rec, idx) => {
                  const lineIndex = idx;
                  const isApproved = rec.status === 'APPROVED';
                  const isDeclined = rec.status === 'DECLINED';
                  const isPending = rec.status === 'PENDING';
                  const isMyLine = rec.requestedByTechId === currentUser.id;
                  const payType: ConcernPayType = rec.payType || 'CUSTOMER_PAY';
                  const assignedTechName = rec.techName || rec.requestedByTechName || currentUser.name;

                  // Find parts attached to this recommendation line
                  const lineParts = (ro.parts || []).filter(p => {
                    if (p.notes && (p.notes.includes(rec.serviceName) || p.notes.includes(`Line ${lineIndex + 1}`))) {
                      return true;
                    }
                    return false;
                  });

                  const currentHours = recLaborHours[rec.id] ?? (rec.laborHours !== undefined ? String(rec.laborHours) : '');
                  const currentCause = recCauses[rec.id] ?? (rec.cause || '');
                  const currentCorrection = recCorrections[rec.id] ?? (rec.correction || '');
                  const autoStatus = autoSaveStatus[rec.id] || 'idle';
                  const lastSaved = lastSavedTime[rec.id];

                  return (
                    <div 
                      key={rec.id}
                      className={`p-3.5 rounded-xl border-2 transition-all space-y-3 shadow-2xs ${
                        isApproved
                          ? 'bg-emerald-50/40 border-emerald-400'
                          : isDeclined
                          ? 'bg-slate-100 border-slate-300 opacity-80'
                          : rec.urgency === 'SAFETY'
                          ? 'bg-red-50/30 border-red-300'
                          : 'bg-slate-50/80 border-slate-300'
                      }`}
                    >
                      {/* Line Identification Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black px-2.5 py-0.5 bg-slate-900 text-white rounded-md uppercase tracking-wider shadow-2xs">
                            Line {lineIndex + 1}
                          </span>

                          {isMyLine && (
                            <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-md uppercase tracking-wider shadow-2xs">
                              Your Line
                            </span>
                          )}

                          {/* Pay Type Selector / Badge */}
                          {isAdvisorOrMgr || isTech ? (
                            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRecommendedService(ro.id, rec.id, { payType: 'CUSTOMER_PAY' });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  payType === 'CUSTOMER_PAY'
                                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Customer Pay
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRecommendedService(ro.id, rec.id, { payType: 'WARRANTY' });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  payType === 'WARRANTY'
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                Warranty
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateRecommendedService(ro.id, rec.id, { payType: 'INTERNAL' });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                  payType === 'INTERNAL'
                                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
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

                          {/* Urgency Badge */}
                          {rec.urgency === 'SAFETY' ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                              <span>Safety Concern</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                              <span>Recommended Maint</span>
                            </span>
                          )}

                          {/* Approval Status Badge */}
                          {isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Customer Approval
                            </span>
                          )}
                          {isApproved && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                              <CheckCircle className="w-3 h-3" />
                              Authorized by Customer
                            </span>
                          )}
                          {isDeclined && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-slate-500" />
                              Declined
                            </span>
                          )}

                          {/* Auto-save status */}
                          {autoStatus === 'saving' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Auto-Saving...
                            </span>
                          )}
                          {autoStatus === 'saved' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Saved {lastSaved ? `at ${lastSaved}` : ''}
                            </span>
                          )}

                          {/* Labor Hours Requested Input for Line {idx + 1} */}
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border-2 border-slate-300 shadow-2xs hover:border-blue-400 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                            title={`Enter labor hours requested for Line ${lineIndex + 1} — automatically updates the repair quote`}
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
                              value={currentHours}
                              onFocus={() => {
                                focusedFieldRef.current = { recId: rec.id, field: 'hours' };
                              }}
                              onChange={(e) => handleHoursChange(rec.id, e.target.value)}
                              onBlur={() => {
                                focusedFieldRef.current = null;
                              }}
                              className="w-12 text-xs font-bold text-slate-900 bg-transparent text-center focus:outline-hidden"
                            />
                            <span className="text-[10px] font-bold text-slate-500 pr-0.5">hrs</span>
                          </div>

                          {/* Request Parts Button for Line */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPartsModal(lineIndex, rec.serviceName);
                            }}
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            title={`Request required parts for Line ${lineIndex + 1} from the Parts Department`}
                          >
                            <Package className="w-3 h-3 text-amber-600" />
                            <span>Request Parts</span>
                          </button>

                          {/* See Parts Ordered Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingPartsLineIndex(viewingPartsLineIndex === lineIndex ? null : lineIndex);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                              viewingPartsLineIndex === lineIndex
                                ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300'
                                : lineParts.length > 0
                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                            title={`View parts ordered for Line ${lineIndex + 1}`}
                          >
                            <Eye className="w-3 h-3 text-blue-600" />
                            <span>See Parts Ordered</span>
                            {lineParts.length > 0 && (
                              <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                                viewingPartsLineIndex === lineIndex ? 'bg-white text-blue-900' : 'bg-blue-600 text-white'
                              }`}>
                                {lineParts.length}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Tech Selector & Delete Action */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-300">
                            <Wrench className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden xs:inline shrink-0">Tech:</span>
                            {isAdvisorOrMgr ? (
                              <select
                                value={rec.techId || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  const tId = e.target.value;
                                  const t = users.find(u => u.id === tId);
                                  updateRecommendedService(ro.id, rec.id, { techId: tId, techName: t?.name });
                                }}
                                className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                              >
                                <option value="">{ro.techName ? `(Primary: ${ro.techName})` : 'Unassigned'}</option>
                                {users.filter(u => u.role === 'TECHNICIAN').map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}{t.id === currentUser.id ? ' (You)' : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-800">
                                {assignedTechName || ro.techName || 'Unassigned'}
                              </span>
                            )}
                          </div>

                          {/* Delete Line Button */}
                          {(isTech || isAdvisorOrMgr) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteRecommendedService(ro.id, rec.id);
                                setStatusFeedback(`Removed Line ${lineIndex + 1}: "${rec.serviceName}"`);
                                setTimeout(() => setStatusFeedback(null), 3000);
                              }}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                              title={`Delete Line ${lineIndex + 1}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Parts Ordered Drawer for Line {idx + 1} */}
                      {viewingPartsLineIndex === lineIndex && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="p-3 bg-blue-50/80 rounded-xl border-2 border-blue-300 space-y-2.5 shadow-xs animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-700" />
                              <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                                Parts Ordered for Line {lineIndex + 1} ({rec.serviceName})
                              </span>
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                                {lineParts.length} {lineParts.length === 1 ? 'Part' : 'Parts'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPartsModal(lineIndex, rec.serviceName)}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Request More Parts</span>
                              </button>
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
                              <p className="text-xs font-semibold text-slate-600">No parts requested for Line {lineIndex + 1} yet.</p>
                              <button
                                type="button"
                                onClick={() => handleOpenPartsModal(lineIndex, rec.serviceName)}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Package className="w-3.5 h-3.5" />
                                <span>+ Request Parts for Line {lineIndex + 1}</span>
                              </button>
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
                                        {/* Order Now / Quote Only Toggle */}
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
                                            >
                                              <Calculator className="w-2.5 h-2.5 shrink-0" />
                                              <span>Quote Only</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                        part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : isROApproved && (part.requestType === 'QUOTE_ONLY' || part.status === 'QUOTE_ONLY')
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                                          : part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY'
                                          ? 'bg-purple-100 text-purple-800 border-purple-300 font-extrabold'
                                          : 'bg-blue-100 text-blue-800 border-blue-300'
                                      }`}>
                                        {part.status.replace(/_/g, ' ')}
                                      </span>
                                      {part.estimatedArrival && (
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
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Finding / Recommendation Title Header */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-700 shrink-0">
                            Line {lineIndex + 1} Finding / Service:
                          </span>
                          <input
                            type="text"
                            value={rec.serviceName}
                            onChange={(e) => triggerRecAutoSave(rec.id, { serviceName: e.target.value })}
                            className="font-extrabold text-slate-900 bg-transparent flex-1 focus:outline-hidden border-b border-transparent focus:border-blue-400"
                          />
                        </div>

                        {/* Advisor/Manager Approval Controls */}
                        {isAdvisorOrMgr && isPending && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() => handleReviewStatus(rec.id, 'APPROVED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Customer authorized this service"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReviewStatus(rec.id, 'DECLINED', 'Customer declined at this time')}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors cursor-pointer"
                              title="Customer declined this service"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Line {idx + 1} Cause / Findings */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                            <span>Line {lineIndex + 1} Cause / Inspection Findings</span>
                          </label>
                        </div>
                        <textarea
                          rows={2}
                          value={currentCause}
                          onFocus={() => {
                            focusedFieldRef.current = { recId: rec.id, field: 'cause' };
                          }}
                          onChange={(e) => handleCauseChange(rec.id, e.target.value)}
                          onBlur={() => {
                            focusedFieldRef.current = null;
                          }}
                          placeholder={`Type Line ${lineIndex + 1} cause / inspection findings (e.g. Engine air filter heavily loaded with dirt, carbon, and road debris restricting intake airflow)...`}
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>

                      {/* Line {idx + 1} Correction / Recommended Action */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            <span>Line {lineIndex + 1} Correction / Recommended Service</span>
                          </label>
                        </div>
                        <textarea
                          rows={2}
                          value={currentCorrection}
                          onFocus={() => {
                            focusedFieldRef.current = { recId: rec.id, field: 'correction' };
                          }}
                          onChange={(e) => handleCorrectionChange(rec.id, e.target.value)}
                          onBlur={() => {
                            focusedFieldRef.current = null;
                          }}
                          placeholder={`Type Line ${lineIndex + 1} recommended corrective action (e.g. Replace engine air filter with new OEM element, clean airbox housing, test airflow)...`}
                          className="w-full px-3 py-2 border-2 border-slate-600 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Parts Request Modal Fallback (when opened directly inside this component) */}
      {internalPartsRO && (
        <TechPartsRequestModal
          ro={internalPartsRO}
          lineIndex={internalPartsLine.index}
          lineText={internalPartsLine.text}
          onClose={() => {
            setInternalPartsRO(null);
            setInternalPartsLine({});
          }}
        />
      )}

      {/* Official Printable 21-Point Inspection & Recommendations Modal */}
      {isPrintModalOpen && (
        <InspectionPrintModal
          ro={ro}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

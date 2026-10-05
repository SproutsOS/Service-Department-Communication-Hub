import React, { useState, useMemo } from 'react';
import { 
  RepairOrder, 
  InspectionCategory,
  InspectionChecklistItem,
  InspectionItemStatus
} from '../types';
import { useApp } from '../context/AppContext';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { TechPartsRequestModal } from './TechDashboard';
import { InspectionPrintModal } from './InspectionPrintModal';
import { LinePartsSection } from './LinePartsSection';
import { LinePhotoSection } from './LinePhotoSection';
import { 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ClipboardCheck, 
  Check, 
  Printer,
  Package,
  Plus,
  Trash2,
  Pencil,
  XCircle,
  Ban,
  X,
  Wrench
} from 'lucide-react';

interface TechRecommendationsSectionProps {
  ro: RepairOrder;
  compact?: boolean;
  onRequestParts?: (lineIndex?: number, lineText?: string) => void;
}

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
    repairOrders,
    addRecommendedService, 
    updateRecommendedService,
    deleteRecommendedService,
    setInspectionItemResult,
    passAllInspectionItems,
    inspectionChecklist
  } = useApp();

  const ro = repairOrders.find(r => r.id === initialRO.id) || initialRO;

  const isTech = currentUser.role === 'TECHNICIAN';

  // Base customer concerns count so inspection findings continue sequentially (e.g. Line 1 -> Line 2)
  const baseConcernsCount = (ro.concerns && ro.concerns.length > 0)
    ? ro.concerns.length
    : (ro.primaryConcern ? 1 : 0);

  // Section toggle state (default expanded)
  const [isSectionExpanded, setIsSectionExpanded] = useState(true);
  const [isInspectionGridOpen, setIsInspectionGridOpen] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

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

  // Helper to find exact concern line index for an inspection item
  const findLinkedLineNumber = (itemId: string, item: InspectionChecklistItem): number => {
    const recName = (item.defaultRecommendationName || '').toLowerCase().trim();
    const itemName = item.name.toLowerCase().trim();
    
    if (ro.concerns && ro.concerns.length > 0) {
      const idx = ro.concerns.findIndex(c => {
        const cLower = c.toLowerCase().trim();
        return (recName && (cLower === recName || cLower.includes(recName) || recName.includes(cLower))) ||
               (itemName && (cLower === itemName || cLower.includes(itemName) || itemName.includes(cLower)));
      });
      if (idx >= 0) return idx + 1;
    }

    const matchingRec = findLinkedRec(itemId, item);
    if (matchingRec) {
      const recIdx = recommendations.findIndex(r => r.id === matchingRec.id);
      if (recIdx >= 0) {
        return (ro.concerns?.length || 1);
      }
    }
    return -1;
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
      setStatusFeedback(`Marked "${item.name}" for Future Attention (Yellow). Added to Lines above.`);
    } else if (status === 'IMMEDIATE_ATTENTION') {
      setStatusFeedback(`Marked "${item.name}" for Immediate Attention (Red). Added to Lines above.`);
    } else if (status === 'NOT_APPLICABLE') {
      setStatusFeedback(`Marked "${item.name}" as N/A.`);
    }
    setTimeout(() => setStatusFeedback(null), 3000);
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
                Step 3: 21-Point Vehicle Inspection (MPI)
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
                    <Check className="w-3.5 h-3.5" />
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
                          const linkedLineNum = (isImmediate || isFuture) ? findLinkedLineNumber(item.id, item) : -1;

                          return (
                            <div 
                              key={item.id}
                              className={`rounded-lg border transition-all shadow-2xs p-2 ${
                                isImmediate
                                  ? 'bg-red-50/70 border-red-400 border-l-4 border-l-red-600'
                                  : isFuture
                                  ? 'bg-amber-50/70 border-amber-400 border-l-4 border-l-amber-500'
                                  : isPassed
                                  ? 'bg-emerald-50/40 border-emerald-300 border-l-4 border-l-emerald-600'
                                  : isNA
                                  ? 'bg-slate-50 border-slate-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
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
                                    {linkedLineNum > 0 && (
                                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shadow-2xs">
                                        → Line {linkedLineNum}
                                      </span>
                                    )}
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
          {/* 2. REQUESTED SERVICES & 21-POINT INSPECTION FINDINGS (JOB LINES SUMMARY) */}
          {/* ========================================================================= */}
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50/40 p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-700" />
                  <span>Inspection Findings & Job Lines Created ({recommendations.length})</span>
                </span>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                    {pendingCount} Awaiting Authorization
                  </span>
                )}
                {approvedCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                    {approvedCount} Authorized
                  </span>
                )}
              </div>
            </div>

            {recommendations.length === 0 ? (
              <div className="p-4 rounded-lg bg-white border border-dashed border-amber-300 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">No additional issues flagged on inspection yet.</p>
                <p className="text-[11px] text-slate-400">When the technician marks an inspection point as 🔴 Immediate or 🟡 Future Attention, the job line is automatically created on the Repair Order.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recommendations.map((rec, recIdx) => {
                  const checkItem = effectiveChecklist.find(i => i.id === rec.inspectionItemId);
                  const linkedLine = checkItem 
                    ? findLinkedLineNumber(checkItem.id, checkItem) 
                    : findLinkedLineNumber(rec.id, { id: rec.id, name: rec.serviceName, category: 'UNDER_HOOD', order: 1 });
                  const globalLineNum = linkedLine > 0 ? linkedLine : (recIdx + 2);
                  const isImmediate = rec.urgency === 'SAFETY';
                  const recPayType = rec.payType || 'CUSTOMER_PAY';
                  const recStatus = rec.status || 'PENDING';

                  return (
                    <div 
                      key={rec.id}
                      className={`rounded-xl border-2 transition-all p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs bg-white ${
                        recStatus === 'APPROVED'
                          ? 'border-emerald-400 ring-1 ring-emerald-300'
                          : recStatus === 'DECLINED'
                          ? 'border-rose-300 bg-rose-50/20'
                          : isImmediate
                          ? 'border-red-400 ring-1 ring-red-300'
                          : 'border-amber-300'
                      }`}
                    >
                      {/* Left: Line badge, finding name, severity, tech */}
                      <div className="flex items-center gap-2.5 flex-wrap min-w-0 flex-1">
                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-2xs shrink-0">
                          Line {globalLineNum}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-slate-900 break-words">
                              {rec.serviceName}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow-2xs flex items-center gap-1 ${
                              isImmediate
                                ? 'bg-red-100 text-red-950 border-red-300'
                                : 'bg-amber-100 text-amber-950 border-amber-300'
                            }`}>
                              <AlertTriangle className="w-3 h-3" />
                              <span>{isImmediate ? '🔴 Immediate Safety' : '🟡 Future Attention'}</span>
                            </span>
                            {recStatus === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                <span>Approved</span>
                              </span>
                            ) : recStatus === 'DECLINED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs">
                                <XCircle className="w-3 h-3 text-rose-700" />
                                <span>Declined</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs">
                                <Clock className="w-3 h-3 text-purple-700" />
                                <span>Waiting on Approval</span>
                              </span>
                            )}
                          </div>

                          {(rec.cause || rec.correction) && (
                            <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                              {rec.cause && <span>Cause: <strong className="font-mono text-amber-900">{rec.cause}</strong></span>}
                              {rec.correction && <span>• Correction: <strong className="font-mono text-emerald-900">{rec.correction}</strong></span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
                        {/* Request Parts for this line */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onRequestParts) {
                              onRequestParts(globalLineNum - 1, rec.serviceName);
                            } else {
                              setInternalPartsRO(ro);
                              setInternalPartsLine({ index: globalLineNum - 1, text: rec.serviceName });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          title="Request parts for this line"
                        >
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                          <span>Request Parts</span>
                        </button>

                        {/* Approve / Reset Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const next = recStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
                            updateRecommendedService(ro.id, rec.id, { status: next });
                            setStatusFeedback(next === 'APPROVED' ? `✓ Authorized Line ${globalLineNum}: ${rec.serviceName}` : `Reset Line ${globalLineNum} to Pending`);
                            setTimeout(() => setStatusFeedback(null), 3000);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer border ${
                            recStatus === 'APPROVED'
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{recStatus === 'APPROVED' ? 'Approved ✓' : 'Authorize'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove inspection recommendation for "${rec.serviceName}"?`)) {
                              deleteRecommendedService(ro.id, rec.id);
                              setStatusFeedback(`Removed "${rec.serviceName}"`);
                              setTimeout(() => setStatusFeedback(null), 3000);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete recommendation line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

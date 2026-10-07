import React, { useState, useMemo } from 'react';
import { 
  RepairOrder, 
  InspectionCategory,
  InspectionChecklistItem,
  InspectionItemStatus
} from '../types';
import { useApp } from '../context/AppContext';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { InspectionPrintModal } from './InspectionPrintModal';
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
    const matchingRec = findLinkedRec(itemId, item);
    if (matchingRec) {
      const recIdx = recommendations.findIndex(r => r.id === matchingRec.id);
      if (recIdx >= 0) {
        return baseConcernsCount + recIdx + 1;
      }
    }
    return -1;
  };

  // 21-Point Inspection Checklist Item Status change
  const handleSetInspectionStatus = (item: InspectionChecklistItem, status: InspectionItemStatus) => {
    const existing = inspectionItemsMap[item.id];
    const existingConcern = existing?.concern || existing?.notes || '';

    setInspectionItemResult(ro.id, item.id, {
      status,
      name: item.name,
      category: item.category,
      measurementValue: existing?.measurementValue || '',
      notes: status === 'PASSED' || status === 'NOT_APPLICABLE' ? '' : (existing?.notes || ''),
      concern: status === 'IMMEDIATE_ATTENTION' ? existingConcern : undefined,
    });

    const matchingRec = findLinkedRec(item.id, item);

    if (status === 'IMMEDIATE_ATTENTION') {
      if (!matchingRec) {
        addRecommendedService(ro.id, {
          serviceName: existingConcern.trim() ? `${item.name}: ${existingConcern.trim()}` : item.name,
          inspectionItemId: item.id,
          urgency: 'SAFETY',
          payType: 'CUSTOMER_PAY',
          laborHours: 0,
          notes: existingConcern,
        });
      }
      setStatusFeedback(`Marked "${item.name}" for Immediate Concern (Red) — added to Job Lines.`);
    } else {
      if (matchingRec) {
        deleteRecommendedService(ro.id, matchingRec.id);
      }
      if (status === 'PASSED') {
        setStatusFeedback(`Marked "${item.name}" as Checked & OK.`);
      } else if (status === 'FUTURE_ATTENTION') {
        setStatusFeedback(`Marked "${item.name}" for Future Attention (Yellow) — enter advisory notes below.`);
      } else if (status === 'NOT_APPLICABLE') {
        setStatusFeedback(`Marked "${item.name}" as N/A.`);
      }
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

              {/* Immediate & Attention Badges */}
              {safetyCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  {safetyCount} Immediate
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
                  {passedCount} OK • {attentionCount} Attention • {safetyCount} Immediate
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
                          const linkedLineNum = isImmediate ? findLinkedLineNumber(item.id, item) : -1;

                          return (
                            <div 
                              key={item.id}
                              className={`rounded-lg border transition-all shadow-2xs p-2.5 ${
                                isImmediate
                                  ? 'bg-red-50/70 border-red-400 border-l-4 border-l-red-600'
                                  : isFuture
                                  ? 'bg-amber-50/80 border-amber-400 border-l-4 border-l-amber-500'
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
                                    title="May require future attention (Recommended - saves notes without creating RO job line)"
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
                                    title="Immediate concern (Creates active RO Line & parts request)"
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

                              {/* In-Place Notes Box for Future Attention (Yellow) */}
                              {isFuture && (
                                <div className="mt-2.5 pt-2 border-t border-amber-300/80 space-y-1.5 animate-fadeIn">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-950">
                                    <span className="flex items-center gap-1">
                                      <span>📝</span>
                                      <span>Future Attention Notes & Advisory:</span>
                                    </span>
                                    <span className="text-[10px] text-amber-800 font-medium">
                                      Saved to 21-Point Inspection Report
                                    </span>
                                  </div>
                                  <textarea
                                    value={result?.notes || ''}
                                    onChange={(e) => {
                                      setInspectionItemResult(ro.id, item.id, {
                                        notes: e.target.value,
                                        status: 'FUTURE_ATTENTION',
                                        name: item.name,
                                        category: item.category,
                                        measurementValue: result?.measurementValue || '',
                                      });
                                    }}
                                    placeholder={`Enter future maintenance / advisory notes for ${item.name} (e.g., "Pads at 4mm — recheck next service", "Tires at 4/32 tread — recommend replacement in 5,000 miles")...`}
                                    rows={2}
                                    className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-amber-500 shadow-2xs"
                                  />
                                </div>
                              )}

                              {/* In-Place Concern Input for Immediate Attention (Red) */}
                              {isImmediate && (
                                <div className="mt-2.5 pt-2 border-t border-red-300/80 space-y-1.5 animate-fadeIn">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-red-950">
                                    <span className="flex items-center gap-1">
                                      <span>🔴</span>
                                      <span>Inspection Finding Concern (Technician Input):</span>
                                    </span>
                                    <span className="text-[10px] text-red-800 font-bold bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                                      Listed as Inspection Finding
                                    </span>
                                  </div>
                                  <textarea
                                    value={result?.concern !== undefined ? result.concern : (result?.notes || '')}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setInspectionItemResult(ro.id, item.id, {
                                        concern: val,
                                        notes: val,
                                        status: 'IMMEDIATE_ATTENTION',
                                        name: item.name,
                                        category: item.category,
                                        measurementValue: result?.measurementValue || '',
                                      });
                                      const matchingRec = findLinkedRec(item.id, item);
                                      if (matchingRec) {
                                        updateRecommendedService(ro.id, matchingRec.id, {
                                          serviceName: val.trim() ? `${item.name}: ${val.trim()}` : item.name,
                                          notes: val,
                                        });
                                      }
                                    }}
                                    placeholder={`Enter technician finding / concern for ${item.name} (e.g., "Front brake pads worn to 1mm, metal contact on rotor", "Left CV axle boot torn slinging grease")...`}
                                    rows={2}
                                    className="w-full text-xs p-2 bg-white border-2 border-red-300 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500 shadow-2xs"
                                  />
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
        </div>
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

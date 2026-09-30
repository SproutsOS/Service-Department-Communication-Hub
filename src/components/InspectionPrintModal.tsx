import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Clock, 
  Wrench, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  Tag,
  User as UserIcon, 
  Car, 
  Calendar,
  Layers
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, InspectionCategory, InspectionChecklistItem } from '../types';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { formatMilitaryDate, formatMilitaryDateTime } from '../utils/formatters';

interface InspectionPrintModalProps {
  ro: RepairOrder | null;
  onClose: () => void;
}

const CATEGORY_TITLES: Record<InspectionCategory, string> = {
  UNDER_HOOD: '1. Under Hood & Fluid Levels',
  BRAKES_SUSPENSION: '2. Brakes & Suspension Components',
  TIRES_WHEELS: '3. Tires & Wheel Conditions',
  UNDERBODY_EXTERIOR: '4. Underbody, Battery & Exterior Components',
};

export const InspectionPrintModal: React.FC<InspectionPrintModalProps> = ({ ro: initialRO, onClose }) => {
  const { shopName, currentUser, inspectionChecklist, repairOrders } = useApp();
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!initialRO) return null;

  // Always use latest live RO data from AppContext
  const ro = repairOrders.find(r => r.id === initialRO.id) || initialRO;

  const checklist = inspectionChecklist && inspectionChecklist.length > 0 
    ? inspectionChecklist 
    : DEFAULT_INSPECTION_CHECKLIST;

  const inspectionMap = ro.inspection?.items || {};
  const recommendations = ro.recommendations || [];

  // Helper to get matching recommendation if any
  const findLinkedRec = (item: InspectionChecklistItem) => {
    const itemId = item.id;
    const recName = (item.defaultRecommendationName || '').toLowerCase().trim();
    const itemName = item.name.toLowerCase().trim();

    return recommendations.find(r => {
      if (r.inspectionItemId && r.inspectionItemId === itemId) return true;
      const sName = (r.serviceName || '').toLowerCase().trim();
      if (recName && (sName.includes(recName) || recName.includes(sName))) return true;
      if (itemName && (sName.includes(itemName) || itemName.includes(sName))) return true;
      if (r.cause && (r.cause.toLowerCase().includes(itemName) || (recName && r.cause.toLowerCase().includes(recName)) || r.cause.includes(itemId))) return true;
      return false;
    });
  };

  // Helper to determine status for an item
  const getItemStatus = (item: InspectionChecklistItem) => {
    const res = inspectionMap[item.id];
    const linkedRec = findLinkedRec(item);

    // If marked immediate attention or linked safety recommendation -> Immediate (Red)
    if (res?.status === 'IMMEDIATE_ATTENTION' || linkedRec?.urgency === 'SAFETY') {
      return {
        status: 'IMMEDIATE_ATTENTION' as const,
        label: '🔴 Immediate',
        isImmediate: true,
        isAttention: false,
        isPassed: false,
        isNA: false,
        notes: res?.notes || linkedRec?.cause || linkedRec?.notes || '',
        measurement: res?.measurementValue || '',
      };
    }

    // If marked future attention or linked recommendation -> Attention (Yellow)
    if (res?.status === 'FUTURE_ATTENTION' || linkedRec?.urgency === 'RECOMMENDED') {
      return {
        status: 'FUTURE_ATTENTION' as const,
        label: '🟡 Attention',
        isImmediate: false,
        isAttention: true,
        isPassed: false,
        isNA: false,
        notes: res?.notes || linkedRec?.cause || linkedRec?.notes || '',
        measurement: res?.measurementValue || '',
      };
    }

    // If marked Not Applicable
    if (res?.status === 'NOT_APPLICABLE') {
      return {
        status: 'NOT_APPLICABLE' as const,
        label: '⚪ N/A',
        isImmediate: false,
        isAttention: false,
        isPassed: false,
        isNA: true,
        notes: res?.notes || '',
        measurement: res?.measurementValue || '',
      };
    }

    // Default to Passed / OK
    return {
      status: 'PASSED' as const,
      label: '🟢 OK',
      isImmediate: false,
      isAttention: false,
      isPassed: true,
      isNA: false,
      notes: res?.notes || '',
      measurement: res?.measurementValue || '',
    };
  };

  const activeItems = checklist.filter(i => i.isEnabled !== false);
  let passedCount = 0;
  let attentionCount = 0;
  let safetyCount = 0;
  let naCount = 0;

  activeItems.forEach(item => {
    const itemInfo = getItemStatus(item);
    if (itemInfo.isImmediate) safetyCount++;
    else if (itemInfo.isAttention) attentionCount++;
    else if (itemInfo.isNA) naCount++;
    else passedCount++;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const categories: InspectionCategory[] = ['UNDER_HOOD', 'BRAKES_SUSPENSION', 'TIRES_WHEELS', 'UNDERBODY_EXTERIOR'];
    
    const lines: string[] = [
      `======================================================`,
      `21-POINT MULTI-POINT INSPECTION (MPI) REPORT`,
      `Dealership / Shop: ${shopName}`,
      `Repair Order #: ${ro.id}`,
      `Date: ${ro.createdAt ? formatMilitaryDate(ro.createdAt) : 'N/A'}`,
      `Customer: ${ro.customerName} | Phone: ${ro.customerPhone}`,
      `Vehicle: ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`,
      `VIN: ${ro.vehicle.vin}`,
      `Mileage: ${ro.vehicle.mileage.toLocaleString()} mi`,
      `Service Advisor: ${ro.advisorName} | Tech: ${ro.inspection?.completedByTechName || ro.techName || 'Unassigned'}`,
      `======================================================`,
      `INSPECTION SCORECARD:`,
      `  • Passed / OK: ${passedCount}`,
      `  • Future Attention: ${attentionCount}`,
      `  • Immediate Safety: ${safetyCount}`,
      `======================================================`,
      `CHECKLIST FINDINGS:`,
    ];

    categories.forEach(cat => {
      lines.push(`\n[${CATEGORY_TITLES[cat]}]:`);
      const items = checklist.filter(i => i.category === cat && i.isEnabled !== false);
      items.forEach(item => {
        const itemInfo = getItemStatus(item);
        let detail = `  ${item.order}. ${item.name}: ${itemInfo.label}`;
        if (itemInfo.measurement) {
          detail += ` (${itemInfo.measurement} ${item.measurementUnit || ''})`;
        }
        if (itemInfo.notes) {
          detail += ` - Note: "${itemInfo.notes}"`;
        }
        lines.push(detail);
      });
    });

    if (recommendations.length > 0) {
      lines.push(`\n======================================================`);
      lines.push(`RECOMMENDED SERVICES & ESTIMATED LABOR (LINES):`);
      recommendations.forEach((rec, idx) => {
        lines.push(`\nLINE ${idx + 1}: ${rec.serviceName}`);
        lines.push(`  Priority: ${rec.urgency === 'SAFETY' ? 'Immediate Safety Concern' : 'Recommended Maintenance'}`);
        lines.push(`  Status: ${rec.status === 'APPROVED' ? 'Customer Authorized' : rec.status === 'DECLINED' ? 'Declined' : 'Awaiting Authorization'}`);
        if (rec.laborHours) lines.push(`  Labor Hours: ${rec.laborHours} hrs`);
        if (rec.cause) lines.push(`  Cause: ${rec.cause}`);
        if (rec.correction) lines.push(`  Correction: ${rec.correction}`);
        if (rec.notes) lines.push(`  Notes: ${rec.notes}`);
      });
    }

    lines.push(`\n======================================================`);
    lines.push(`Inspected By: ${ro.inspection?.completedByTechName || ro.techName || currentUser.name}`);
    lines.push(`Printed on ${formatMilitaryDateTime(new Date())}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const categories: InspectionCategory[] = ['UNDER_HOOD', 'BRAKES_SUSPENSION', 'TIRES_WHEELS', 'UNDERBODY_EXTERIOR'];

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto no-print"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border-2 border-slate-700 animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Screen Header Controls (Excluded from Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b-2 border-slate-700 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">
                  21-Point Multi-Point Inspection Sheet (MPI)
                </h2>
                <span className="text-xs font-mono font-bold bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded border border-blue-400/40">
                  RO #{ro.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official dealership vehicle inspection report & customer recommendations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Copy formatted text report to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Report!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer ring-2 ring-blue-400/40"
              title="Print official MPI document (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print MPI Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white">
          <div 
            id="printable-inspection-document"
            className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 space-y-6"
          >
            {/* Top Dealership Banner & Meta Header */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {shopName}
                  </div>
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Service Department • Multi-Point Inspection & Quality Verification
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-slate-900 text-white font-mono text-sm sm:text-base font-black px-3 py-1 rounded">
                    REPAIR ORDER #{ro.id}
                  </div>
                  <div className="text-[11px] font-bold text-slate-600 mt-1">
                    Date: {ro.createdAt ? formatMilitaryDate(ro.createdAt) : formatMilitaryDate(new Date())}
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Identification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Customer:</span>
                  <span className="font-bold text-slate-900">{ro.customerName}</span>
                  <span className="text-[11px] text-slate-600 block">{ro.customerPhone}</span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Vehicle:</span>
                  <span className="font-bold text-slate-900">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
                  <span className="text-[11px] text-slate-600 block">Mileage: {ro.vehicle.mileage.toLocaleString()} mi</span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">VIN:</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">{ro.vehicle.vin}</span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Staff Assigned:</span>
                  <span className="font-semibold text-slate-800 block">Advisor: <strong className="font-bold">{ro.advisorName}</strong></span>
                  <span className="font-semibold text-slate-800 block">Tech: <strong className="font-bold">{ro.inspection?.completedByTechName || ro.techName || 'Assigned Tech'}</strong></span>
                </div>
              </div>
            </div>

            {/* Scorecard Bar */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-300 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                <span>21-Point Inspection Summary Scorecard</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  🟢 {passedCount} Checked & OK
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  🟡 {attentionCount} Future Attention
                </span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 border border-red-300">
                  🔴 {safetyCount} Immediate Safety
                </span>
                {naCount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 border border-slate-300">
                    ⚪ {naCount} N/A
                  </span>
                )}
              </div>
            </div>

            {/* 21-Point Checklist 4-Category Matrix */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                21-Point Inspection Checklist Results
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((catKey) => {
                  const itemsInCat = checklist.filter(i => i.category === catKey && i.isEnabled !== false);

                  return (
                    <div key={catKey} className="border border-slate-300 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-black text-xs text-slate-900 uppercase">
                        {CATEGORY_TITLES[catKey]}
                      </div>
                      <div className="divide-y divide-slate-200 text-xs">
                        {itemsInCat.map((item) => {
                          const itemInfo = getItemStatus(item);

                          return (
                            <div 
                              key={item.id} 
                              className={`p-2 flex flex-col gap-1 ${
                                itemInfo.isImmediate 
                                  ? 'bg-red-50/60' 
                                  : itemInfo.isAttention 
                                  ? 'bg-amber-50/60' 
                                  : 'bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-800">
                                  {item.order}. {item.name}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {itemInfo.measurement && (
                                    <span className="font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300 text-slate-700">
                                      {itemInfo.measurement} {item.measurementUnit || ''}
                                    </span>
                                  )}
                                  
                                  {/* The badge changes to Immediate (Red), Attention (Yellow), OK (Green), or N/A (Grey) */}
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                    itemInfo.isImmediate 
                                      ? 'bg-red-600 text-white border-red-700' 
                                      : itemInfo.isAttention 
                                      ? 'bg-amber-500 text-white border-amber-600' 
                                      : itemInfo.isNA
                                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                                      : 'bg-emerald-600 text-white border-emerald-700'
                                  }`}>
                                    {itemInfo.label}
                                  </span>
                                </div>
                              </div>

                              {/* Item Findings / Notes */}
                              {itemInfo.notes && (
                                <div className="text-[11px] font-semibold text-slate-700 italic pl-3 border-l-2 border-slate-400">
                                  Note: {itemInfo.notes}
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
            </div>

            {/* Recommended Services & Numbered Lines (Line 1, Line 2...) */}
            {recommendations.length > 0 && (
              <div className="space-y-3 pt-3 border-t-2 border-slate-300">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span>Recommended Services & Inspection Findings (Lines)</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-600">
                    {recommendations.length} {recommendations.length === 1 ? 'Recommendation' : 'Recommendations'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {recommendations.map((rec, idx) => {
                    const isApproved = rec.status === 'APPROVED';
                    const isDeclined = rec.status === 'DECLINED';

                    return (
                      <div 
                        key={rec.id}
                        className="p-3 rounded-lg border-2 border-slate-300 bg-white space-y-1.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200 pb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black px-2 py-0.5 bg-slate-900 text-white rounded text-xs uppercase">
                              Line {idx + 1}
                            </span>
                            <span className="font-black text-slate-900 text-sm">
                              {rec.serviceName}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              rec.urgency === 'SAFETY' ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {rec.urgency === 'SAFETY' ? '⚠️ Immediate Safety' : '🛡️ Recommended'}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              {rec.payType === 'WARRANTY' ? 'Warranty' : rec.payType === 'INTERNAL' ? 'Internal' : 'Customer Pay'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {rec.laborHours !== undefined && rec.laborHours !== null && (
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                {rec.laborHours} hrs labor
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                              isApproved 
                                ? 'bg-emerald-600 text-white border-emerald-700' 
                                : isDeclined 
                                ? 'bg-slate-200 text-slate-700 border-slate-300' 
                                : 'bg-amber-100 text-amber-900 border-amber-300'
                            }`}>
                              {isApproved ? '✓ Authorized' : isDeclined ? 'Declined' : 'Pending Authorization'}
                            </span>
                          </div>
                        </div>

                        {rec.cause && (
                          <div>
                            <span className="font-black text-slate-700">Cause / Inspection Findings: </span>
                            <span className="text-slate-900">{rec.cause}</span>
                          </div>
                        )}

                        {rec.correction && (
                          <div>
                            <span className="font-black text-slate-700">Correction / Recommended Action: </span>
                            <span className="text-slate-900">{rec.correction}</span>
                          </div>
                        )}

                        {rec.notes && !rec.notes.includes(rec.cause || '') && (
                          <div className="text-slate-600 italic">
                            <span className="font-bold">Notes: </span>
                            <span>{rec.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer & Technician Signature Line (For Print) */}
            <div className="pt-6 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Technician Certification:
                </div>
                <div className="border-b border-slate-400 h-6"></div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Tech Signature ({ro.inspection?.completedByTechName || ro.techName || 'Technician'})</span>
                  <span>Date: __________________</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Customer Acknowledgment:
                </div>
                <div className="border-b border-slate-400 h-6"></div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Customer Signature ({ro.customerName})</span>
                  <span>Date: __________________</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="p-4 bg-slate-900 border-t-2 border-slate-700 flex items-center justify-between gap-3 shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-400/40"
          >
            <Printer className="w-4 h-4" />
            <span>Print MPI Document (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

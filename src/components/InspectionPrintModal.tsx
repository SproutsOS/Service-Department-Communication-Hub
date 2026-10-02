import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Layers,
  Gauge,
  MapPin,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, InspectionCategory, InspectionChecklistItem } from '../types';
import { DEFAULT_INSPECTION_CHECKLIST } from '../data/defaultInspectionChecklist';
import { formatMilitaryDate, formatMilitaryDateTime } from '../utils/formatters';

const DEALERSHIP_ADDRESS = '2100 HWY 49, SEMINARY, MS 39479';
const DEALERSHIP_PHONE = '601-765-2066';

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

  const inMiles = ro.vehicle.mileage ?? 0;
  const outMiles = ro.outMileage ?? ro.vehicle.outMileage;
  const testDriveDistance = outMiles !== undefined && inMiles > 0 ? Math.max(0, outMiles - inMiles) : undefined;
  const testDriveNotes = ro.testDriveNotes || (ro.testDriveCompleted || outMiles !== undefined ? 'Road test verified normal vehicle operation and performance.' : '');

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
    document.body.classList.add('printing-inspection');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-inspection');
    }, 1000);
  };

  const handleCopySummary = () => {
    const categories: InspectionCategory[] = ['UNDER_HOOD', 'BRAKES_SUSPENSION', 'TIRES_WHEELS', 'UNDERBODY_EXTERIOR'];
    
    const lines: string[] = [
      `======================================================`,
      `21-POINT MULTI-POINT INSPECTION (MPI) REPORT`,
      `Dealership / Shop: ${shopName || 'Precision Dealership Service'}`,
      `Repair Order #: ${ro.id}`,
      `Date: ${ro.createdAt ? formatMilitaryDate(ro.createdAt) : 'N/A'}`,
      `Customer: ${ro.customerName} | Phone: ${ro.customerPhone}`,
      `Vehicle: ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`,
      `VIN: ${ro.vehicle.vin}`,
      `Intake Mileage (In Miles): ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`,
      outMiles !== undefined ? `Out Miles (Post-Test Drive): ${outMiles.toLocaleString()} mi (+${testDriveDistance?.toFixed(1) || 0} mi drive)` : 'Out Miles: Pending',
      testDriveNotes ? `Road Test Notes: ${testDriveNotes}` : '',
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

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const categories: InspectionCategory[] = ['UNDER_HOOD', 'BRAKES_SUSPENSION', 'TIRES_WHEELS', 'UNDERBODY_EXTERIOR'];

  return (
    <>
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
              <p className="text-xs text-slate-300">
                Official Multi-Point Inspection, Recommended Services & Out Miles Verification Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Copy text summary of inspection"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-400/40"
              title="Print official MPI document (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screen Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm space-y-6">
            {/* Top Dealership Banner */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {shopName || 'Precision Dealership Service'}
                  </div>
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Service Department • Multi-Point Inspection & Quality Verification
                  </div>
                  <div className="text-xs font-medium text-slate-700 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{DEALERSHIP_ADDRESS}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Phone: <strong className="font-bold text-slate-950">{DEALERSHIP_PHONE}</strong></span>
                    </span>
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

              {/* Customer & Vehicle Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Customer:</span>
                  <span className="font-bold text-slate-900">{ro.customerName}</span>
                  <span className="text-[11px] text-slate-600 block">{ro.customerPhone}</span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Vehicle:</span>
                  <span className="font-bold text-slate-900">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
                  <span className="text-[11px] text-slate-700 block font-bold">
                    In: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
                  </span>
                  {outMiles !== undefined && (
                    <span className="text-[11px] text-emerald-700 block font-bold">
                      Out: {outMiles.toLocaleString()} mi {testDriveDistance !== undefined ? `(+${testDriveDistance.toFixed(1)} mi drive)` : ''}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">VIN:</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px]">{ro.vehicle.vin}</span>
                  {ro.vehicle.licensePlate && (
                    <span className="text-[11px] text-slate-600 block">Plate: {ro.vehicle.licensePlate}</span>
                  )}
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

            {/* 21-Point Checklist Matrix */}
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
                              className={`p-2.5 flex items-start justify-between gap-2 ${
                                itemInfo.isImmediate ? 'bg-red-50/60' : itemInfo.isAttention ? 'bg-amber-50/60' : 'bg-white'
                              }`}
                            >
                              <div className="space-y-0.5 pr-2">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span className="font-mono text-slate-400 text-[10px]">#{item.order}</span>
                                  <span>{item.name}</span>
                                </div>
                                {itemInfo.notes && (
                                  <div className="text-[11px] text-slate-700 italic">
                                    Note: {itemInfo.notes}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`inline-block font-black text-[10px] px-2 py-0.5 rounded uppercase border ${
                                  itemInfo.isImmediate 
                                    ? 'bg-red-600 text-white border-red-700' 
                                    : itemInfo.isAttention 
                                    ? 'bg-amber-500 text-slate-950 border-amber-600' 
                                    : itemInfo.isNA 
                                    ? 'bg-slate-200 text-slate-700 border-slate-300' 
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}>
                                  {itemInfo.label}
                                </span>
                                {itemInfo.measurement && (
                                  <span className="block font-mono text-[10px] font-bold text-slate-600 mt-0.5">
                                    {itemInfo.measurement} {item.measurementUnit || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommended Services Section */}
            {recommendations.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
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
                              {rec.payType === 'WARRANTY' ? 'Warranty' : rec.payType === 'INTERNAL' ? 'Internal' : rec.payType === 'EXTENDED_WARRANTY' ? 'Extended Warranty' : 'Customer Pay'}
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

            {/* Customer & Technician Signature Line */}
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

    {/* Official Standalone Printable MPI Document (Portal to document.body for 100% clean printing) */}
    {typeof document !== 'undefined' && createPortal(
      <div 
        id="printable-inspection-document"
        className="bg-white text-black max-w-4xl mx-auto space-y-4 font-sans text-xs"
      >
        {/* Dealership Banner */}
        <div className="border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black text-black uppercase tracking-tight">
                {shopName || 'Precision Dealership Service'}
              </div>
              <div className="text-xs font-black text-black uppercase tracking-wider mt-0.5">
                SERVICE DEPARTMENT • 21-POINT MULTI-POINT INSPECTION & QUALITY REPORT
              </div>
              <div className="text-xs text-black font-bold mt-1.5 leading-snug">
                <div>{DEALERSHIP_ADDRESS}</div>
                <div className="text-[12px] font-black mt-0.5">Phone: {DEALERSHIP_PHONE}</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block bg-white text-black font-mono text-sm font-black px-3 py-1 rounded border-2 border-black">
                RO #{ro.id}
              </div>
              <div className="text-[11px] font-black text-black mt-1 font-mono">
                Date: {ro.createdAt ? formatMilitaryDate(ro.createdAt) : formatMilitaryDate(new Date())}
              </div>
              <div className="text-[10px] text-black font-mono">
                Printed: {formatMilitaryDateTime(new Date())}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Grid */}
        <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border-2 border-black text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-black block">Customer:</span>
            <span className="font-black text-black text-sm block">{ro.customerName}</span>
            <span className="text-[11px] text-black block font-bold">{ro.customerPhone}</span>
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-black block">Vehicle:</span>
            <span className="font-black text-black text-sm block">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
            <span className="text-[11px] text-black block font-bold">
              In Miles: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
            </span>
            {outMiles !== undefined && (
              <span className="text-[11px] text-black block font-black">
                Out Miles: {outMiles.toLocaleString()} mi {testDriveDistance !== undefined ? `(+${testDriveDistance.toFixed(1)} mi drive)` : ''}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-black block">Identification:</span>
            <span className="font-mono font-black text-black bg-white px-1.5 py-0.5 rounded border border-black inline-block text-[11px]">
              VIN: {ro.vehicle.vin}
            </span>
            {ro.vehicle.licensePlate && (
              <span className="text-[11px] text-black block mt-0.5 font-bold">Plate: {ro.vehicle.licensePlate}</span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black uppercase text-black block">Staff Assigned:</span>
            <span className="text-black font-semibold block">Advisor: <strong className="font-black text-black">{ro.advisorName}</strong></span>
            <span className="text-black font-semibold block">Tech: <strong className="font-black text-black">{ro.inspection?.completedByTechName || ro.techName || 'Assigned Tech'}</strong></span>
          </div>
        </div>

        {/* Scorecard Bar */}
        <div className="inspection-print-section bg-white p-2.5 rounded border-2 border-black flex items-center justify-between gap-2 text-xs font-black">
          <span className="uppercase tracking-wider">21-Point Inspection Scorecard Summary:</span>
          <div className="flex items-center gap-3">
            <span>🟢 {passedCount} OK</span>
            <span>🟡 {attentionCount} Attention</span>
            <span>🔴 {safetyCount} Immediate Safety</span>
            {naCount > 0 && <span>⚪ {naCount} N/A</span>}
          </div>
        </div>

        {/* 21-Point Checklist Results Table */}
        <div className="inspection-print-section space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-black border-b-2 border-black pb-1">
            21-Point Checklist Inspection Matrix
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((catKey) => {
              const itemsInCat = checklist.filter(i => i.category === catKey && i.isEnabled !== false);

              return (
                <div key={catKey} className="border-2 border-black rounded overflow-hidden">
                  <div className="bg-slate-100 px-2 py-1 border-b-2 border-black font-black text-[11px] text-black uppercase">
                    {CATEGORY_TITLES[catKey]}
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      {itemsInCat.map((item) => {
                        const itemInfo = getItemStatus(item);

                        return (
                          <tr key={item.id} className="border-b border-black/30">
                            <td className="py-1 px-2 font-mono font-bold text-black w-6 text-center border-r border-black/30 text-[10px]">
                              #{item.order}
                            </td>
                            <td className="py-1 px-2 font-bold text-black border-r border-black/30 text-[11px]">
                              {item.name}
                              {itemInfo.notes && (
                                <div className="text-[10px] text-black italic font-normal">
                                  {itemInfo.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-1 px-2 text-right w-24 whitespace-nowrap">
                              <span className="font-mono font-black text-[10px] uppercase">
                                {itemInfo.label}
                              </span>
                              {itemInfo.measurement && (
                                <span className="block font-mono text-[9px] text-black">
                                  {itemInfo.measurement} {item.measurementUnit || ''}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Services Section */}
        {recommendations.length > 0 && (
          <div className="inspection-print-section space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-black border-b-2 border-black pb-1 flex justify-between">
              <span>Technician Recommended Services & Action Items</span>
              <span>{recommendations.length} Line Items</span>
            </div>

            <table className="w-full text-left text-xs border-collapse border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase">
                  <th className="py-1 px-2 border-r border-black w-12 text-center">Line #</th>
                  <th className="py-1 px-2 border-r border-black">Service Description & Findings</th>
                  <th className="py-1 px-2 border-r border-black w-24">Priority</th>
                  <th className="py-1 px-2 border-r border-black w-20 text-center">Labor</th>
                  <th className="py-1 px-2 w-28 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec, idx) => (
                  <tr key={rec.id || idx} className="border-b border-black/40">
                    <td className="py-1.5 px-2 font-mono font-black text-center border-r border-black/40">
                      Line {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-black/40">
                      <div className="font-black text-black">{rec.serviceName}</div>
                      {rec.cause && (
                        <div className="text-[10px] text-black">
                          <strong>Finding / Cause:</strong> {rec.cause}
                        </div>
                      )}
                      {rec.correction && (
                        <div className="text-[10px] text-black">
                          <strong>Recommended Action:</strong> {rec.correction}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-[10px] uppercase border-r border-black/40">
                      {rec.urgency === 'SAFETY' ? '⚠️ IMMEDIATE' : 'RECOMMENDED'}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-center border-r border-black/40">
                      {rec.laborHours !== undefined ? `${rec.laborHours} hrs` : '--'}
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono font-black text-[10px] uppercase">
                      {rec.status === 'APPROVED' ? '✓ APPROVED' : rec.status === 'DECLINED' ? 'DECLINED' : 'PENDING'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Customer & Technician Signatures */}
        <div className="inspection-print-section pt-3 border-t-2 border-black grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-black block">Certified Technician Certification:</span>
            <div className="border-b-2 border-black h-8"></div>
            <div className="flex justify-between text-[10px] font-bold text-black">
              <span>Signature ({ro.inspection?.completedByTechName || ro.techName || 'Certified Technician'})</span>
              <span>Date: __________________</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-black block">Customer Acknowledgement:</span>
            <div className="border-b-2 border-black h-8"></div>
            <div className="flex justify-between text-[10px] font-bold text-black">
              <span>Signature ({ro.customerName})</span>
              <span>Date: __________________</span>
            </div>
          </div>
        </div>

      </div>,
      document.body
    )}
    </>
  );
};

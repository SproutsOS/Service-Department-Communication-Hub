import React, { useState, useEffect, useCallback } from 'react';
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
  User as UserIcon, 
  Car, 
  Calendar,
  AlertCircle,
  Gauge,
  CheckCircle2,
  MapPin,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WarrantyLaborTimePunch } from '../types';
import { formatMilitaryDate, formatMilitaryTime, formatMilitaryDateTime } from '../utils/formatters';
import { printIsolatedDocument } from '../utils/printUtils';

const DEALERSHIP_ADDRESS = '2100 HWY 49, SEMINARY, MS 39479';
const DEALERSHIP_PHONE = '601-765-2066';

interface UnifiedJobLine {
  lineNum: number;
  title: string;
  type: 'CUSTOMER_CONCERN' | 'INSPECTION_FINDING';
  payType: string;
  cause: string;
  correction: string;
  notes?: string;
}

export const WarrantyPrintModal: React.FC = () => {
  const { 
    activeWarrantyPrintRO, 
    closeWarrantyPrintModal, 
    shopName, 
    currentUser 
  } = useApp();

  const [copied, setCopied] = useState(false);

  const ro = activeWarrantyPrintRO;

  const handlePrint = useCallback(() => {
    if (!ro) return;
    const title = `Warranty Verification - RO #${ro.id} - ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`;
    printIsolatedDocument('printable-warranty-document', title);
  }, [ro]);

  // Close on Escape key or print on Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWarrantyPrintModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWarrantyPrintModal, handlePrint]);

  if (!activeWarrantyPrintRO) return null;

  const punches: WarrantyLaborTimePunch[] = ro.timePunches || [];

  const inMiles = ro.vehicle.mileage ?? 0;
  const outMiles = ro.outMileage ?? ro.vehicle.outMileage;
  const testDriveDistance = outMiles !== undefined && inMiles > 0 ? Math.max(0, outMiles - inMiles) : undefined;
  const testDriveNotes = ro.testDriveNotes || (ro.testDriveCompleted || outMiles !== undefined ? 'Road test verified repairs resolved. Normal vehicle operation confirmed.' : '');

  // Calculate total minutes across all closed punches + active punch elapsed
  const totalMinutes = punches.reduce((acc, p) => {
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

  const baseConcerns = (ro.concerns && ro.concerns.length > 0) 
    ? ro.concerns 
    : (ro.primaryConcern ? [ro.primaryConcern] : ['Customer reported vehicle performance concern']);

  const recommendations = ro.recommendations || [];

  // Unified list of all jobs on this RO (Customer Complaints + Inspection Findings) in strict sequential order
  const jobLines: UnifiedJobLine[] = [
    ...baseConcerns.map((concern, idx) => ({
      lineNum: idx + 1,
      title: concern,
      type: 'CUSTOMER_CONCERN' as const,
      payType: ro.concernPayTypes?.[idx] || 'WARRANTY',
      cause: ro.concernCauses?.[idx] || (idx === 0 && (ro.cause || ro.diagnosticNotes) ? (ro.cause || ro.diagnosticNotes) : '') || '',
      correction: ro.concernCorrections?.[idx] || (idx === 0 && ro.correction ? ro.correction : '') || '',
      notes: ''
    })),
    ...recommendations.map((rec, rIdx) => ({
      lineNum: baseConcerns.length + rIdx + 1,
      title: rec.serviceName,
      type: 'INSPECTION_FINDING' as const,
      payType: rec.payType || 'CUSTOMER_PAY',
      cause: rec.cause || '',
      correction: rec.correction || '',
      notes: rec.notes || ''
    }))
  ];

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Active / In-Progress';
    return formatMilitaryDateTime(isoString);
  };

  // Helper to get punches assigned to a specific line number (1-based lineNum)
  const getLinePunches = (lineNum: number): WarrantyLaborTimePunch[] => {
    if (jobLines.length === 1) {
      return punches;
    }
    return punches.filter(p => p.roLineNumber === lineNum);
  };

  // Helper to calculate total minutes for specific punches
  const getLineTotalMinutes = (linePunchesList: WarrantyLaborTimePunch[]): number => {
    return linePunchesList.reduce((acc, p) => {
      if (p.durationMinutes) {
        return acc + p.durationMinutes;
      } else if (p.clockIn && !p.clockOut) {
        const elapsed = Math.max(1, Math.round((Date.now() - new Date(p.clockIn).getTime()) / 60000));
        return acc + elapsed;
      }
      return acc;
    }, 0);
  };

  // Unassigned punches when multiple lines exist
  const unassignedPunches = jobLines.length > 1 
    ? punches.filter(p => !p.roLineNumber || p.roLineNumber < 1 || p.roLineNumber > jobLines.length)
    : [];

  const handleCopySummary = () => {
    const lines: string[] = [
      `======================================================`,
      `WARRANTY REPAIR DOCUMENTATION & TIME VERIFICATION`,
      `Shop / Dealership: ${shopName || 'Precision Dealership Service'}`,
      `Repair Order #: ${ro.id}`,
      `Date Created: ${ro.createdAt ? formatMilitaryDate(ro.createdAt) : 'N/A'}`,
      `Customer: ${ro.customerName} | Phone: ${ro.customerPhone}`,
      `Vehicle: ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`,
      `VIN: ${ro.vehicle.vin}`,
      `Intake Mileage (In Miles): ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`,
      outMiles !== undefined ? `Out Miles (Post-Test Drive): ${outMiles.toLocaleString()} mi (+${testDriveDistance?.toFixed(1) || 0} mi drive)` : `Out Miles: Pending`,
      testDriveNotes ? `Road Test Notes: ${testDriveNotes}` : '',
      `Service Advisor: ${ro.advisorName} | Tech: ${ro.techName || 'Unassigned'}`,
      `======================================================`,
      `ITEMIZED JOB LINES (COMPLAINT, CAUSE, CORRECTION & LABOR TIME):`,
    ];

    jobLines.forEach((job) => {
      const linePunches = getLinePunches(job.lineNum);
      const lineMins = getLineTotalMinutes(linePunches);
      const lineHrsFormatted = (lineMins / 60).toFixed(2);
      const lineHrsInt = Math.floor(lineMins / 60);
      const lineMinsInt = lineMins % 60;

      lines.push(`\n------------------------------------------------------`);
      lines.push(`LINE ${job.lineNum} [${job.payType}] (${job.type === 'INSPECTION_FINDING' ? '21-Point Inspection Finding' : 'Customer Concern'}):`);
      lines.push(`  • COMPLAINT:  ${job.title}`);
      lines.push(`  • CAUSE:      ${job.cause || 'Pending diagnosis / root cause documentation'}`);
      lines.push(`  • CORRECTION: ${job.correction || 'Pending corrective repair documentation'}`);
      lines.push(`  • LABOR TIME: ${lineHrsFormatted} hrs (${lineHrsInt}h ${lineMinsInt}m) [${linePunches.length} punch session${linePunches.length === 1 ? '' : 's'}]`);
      if (linePunches.length > 0) {
        linePunches.forEach((p, pIdx) => {
          const start = formatDateTime(p.clockIn);
          const end = p.clockOut ? formatDateTime(p.clockOut) : 'Active / In Progress';
          const dur = p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)} hrs (${p.durationMinutes} min)` : 'In Progress';
          lines.push(`     Punch #${pIdx + 1}: ${p.techName}${p.techEmployeeNumber ? ` (#${p.techEmployeeNumber})` : ''} | Phase: ${p.operationType || 'REPAIR'} | Start: ${start} | End: ${end} | Elapsed: ${dur}${p.notes ? ` | Notes: ${p.notes}` : ''}`);
        });
      }
    });

    if (unassignedPunches.length > 0) {
      lines.push(`\n------------------------------------------------------`);
      lines.push(`GENERAL / SHOP LABOR TIME PUNCHES:`);
      unassignedPunches.forEach((p, pIdx) => {
        const start = formatDateTime(p.clockIn);
        const end = p.clockOut ? formatDateTime(p.clockOut) : 'Active / In Progress';
        const dur = p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)} hrs (${p.durationMinutes} min)` : 'In Progress';
        lines.push(`  Punch #${pIdx + 1}: ${p.techName} | Phase: ${p.operationType || 'REPAIR'} | Start: ${start} | End: ${end} | Elapsed: ${dur}${p.notes ? ` | Notes: ${p.notes}` : ''}`);
      });
    }

    lines.push(`\n======================================================`);
    lines.push(`TOTAL CUMULATIVE WARRANTY LABOR TIME: ${totalHoursFormatted} hrs (${totalHoursInt}h ${totalMinsInt}m) across ${punches.length} punch sessions`);

    lines.push(`\nROAD TEST & OUT MILEAGE VERIFICATION:`);
    lines.push(`  Intake Odometer: ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`);
    lines.push(`  Out Odometer: ${outMiles !== undefined ? `${outMiles.toLocaleString()} mi` : 'Not recorded'}`);
    lines.push(`  Test Drive Distance: ${testDriveDistance !== undefined ? `${testDriveDistance.toFixed(1)} miles driven` : '0 miles'}`);
    lines.push(`  Road Test Observations: ${testDriveNotes || 'Road test completed - verified resolved'}`);
    lines.push(`  Completed By: ${ro.testDriveCompletedBy || ro.techName || currentUser.name}`);

    if (ro.parts && ro.parts.length > 0) {
      lines.push(`\nINSTALLED PARTS:`);
      ro.parts.forEach(pt => {
        lines.push(`  - Part #${pt.partNumber}: ${pt.description} (Qty: ${pt.quantity}) [${pt.status}]`);
      });
    }

    navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto no-print"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border-2 border-slate-700 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Screen Header (Excluded from Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b-2 border-slate-700 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Warranty Documentation & Time Verification</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs font-mono font-bold rounded border border-blue-400/40">
                  RO #{ro.id}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Itemized Complaint, Cause, Correction & Labor Time per Line Item, Road Test Verification, and Punch Logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Copy text formatted for warranty claim submission"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Sheet</span>
            </button>

            <button
              type="button"
              onClick={closeWarrantyPrintModal}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Screen Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
          
          <div className="bg-white p-6 sm:p-8 rounded-xl border-2 border-slate-300 shadow-sm max-w-3xl mx-auto space-y-6 text-slate-900">
            
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {shopName || 'Woolwine CDJR'}
                  </div>
                  <div className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-0.5">
                    Warranty Repair & Labor Time Verification Record
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
                  <div className="inline-block px-3 py-1 bg-slate-950 text-white font-mono font-black text-sm rounded">
                    RO #{ro.id}
                  </div>
                  {ro.createdAt && (
                    <div className="text-[11px] text-slate-600 font-medium mt-1 font-mono">
                      RO Date: {formatMilitaryDate(ro.createdAt)}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 font-mono">
                    Print Date: {formatMilitaryDateTime(new Date())}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Printed By: {currentUser.name} ({currentUser.role.replace(/_/g, ' ')})
                  </div>
                </div>
              </div>
            </div>

            {/* RO & Vehicle Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Name</span>
                <span className="font-bold text-slate-900">{ro.customerName}</span>
                <span className="text-slate-600 block text-[11px]">{ro.customerPhone}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle Year/Make/Model</span>
                <span className="font-bold text-slate-900">
                  {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                </span>
                <span className="text-slate-700 block text-[11px] font-bold">
                  In: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
                </span>
                {outMiles !== undefined && (
                  <span className="text-emerald-700 block text-[11px] font-bold">
                    Out: {outMiles.toLocaleString()} mi {testDriveDistance !== undefined ? `(+${testDriveDistance.toFixed(1)} mi drive)` : ''}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle VIN (17-Digit)</span>
                <span className="font-mono font-black text-slate-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 inline-block text-[11px]">
                  {ro.vehicle.vin}
                </span>
                {ro.vehicle.licensePlate && (
                  <span className="text-slate-600 block text-[11px] mt-0.5">
                    Plate: {ro.vehicle.licensePlate}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Service Team</span>
                <span className="font-medium text-slate-800 block">
                  Advisor: <strong className="font-bold">{ro.advisorName}</strong>
                </span>
                <span className="font-medium text-slate-800 block">
                  Tech: <strong className="font-bold">{ro.techName || 'Unassigned'}</strong>
                </span>
                {ro.createdAt && (
                  <span className="text-slate-500 block text-[11px]">
                    Date: {formatMilitaryDate(ro.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* UNIFIED JOB LINES: Line 1, 2, 3... Complaint, Cause, Correction & Time Together */}
            <div className="space-y-5">
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-blue-600 rounded text-white"><Wrench className="w-3.5 h-3.5" /></span>
                  <span>Itemized Job Lines — Complaint, Cause, Correction & Labor Time</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  {jobLines.length} {jobLines.length === 1 ? 'Job Line' : 'Job Lines'}
                </span>
              </div>

              {jobLines.map((job) => {
                const linePunches = getLinePunches(job.lineNum);
                const lineMins = getLineTotalMinutes(linePunches);
                const lineHrsFormatted = (lineMins / 60).toFixed(2);
                const lineHrsInt = Math.floor(lineMins / 60);
                const lineMinsInt = lineMins % 60;

                return (
                  <div key={job.lineNum} className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs space-y-0">
                    
                    {/* Line Header */}
                    <div className="bg-slate-900 text-white p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-black bg-blue-600 text-white px-2.5 py-1 rounded shadow-2xs">
                          LINE {job.lineNum}
                        </span>
                        <span className="font-bold text-xs uppercase tracking-wide text-slate-200">
                          {job.type === 'INSPECTION_FINDING' ? '21-Point Inspection Finding' : `Job #${job.lineNum} Customer Complaint`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-200 rounded border border-blue-400/40">
                          {job.payType}
                        </span>
                        <span className="font-mono text-xs font-black bg-slate-800 text-emerald-400 px-2.5 py-0.5 rounded border border-slate-700">
                          Time: {lineHrsInt}h {lineMinsInt}m ({lineHrsFormatted} hrs)
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 bg-white">
                      {/* Complaint / Finding */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          1. {job.type === 'INSPECTION_FINDING' ? 'Inspection Finding / Concern:' : 'Customer Complaint / Concern:'}
                        </span>
                        <p className="font-bold text-slate-950 text-xs leading-relaxed">
                          {job.title}
                        </p>
                      </div>

                      {/* Cause */}
                      <div className="bg-amber-50/60 p-3 rounded-lg border-2 border-amber-300 text-xs">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-900 block mb-1">
                          2. Cause (Diagnostic Finding / Root Cause):
                        </span>
                        <p className="font-mono text-slate-950 font-medium leading-relaxed whitespace-pre-wrap">
                          {job.cause || <span className="italic text-slate-400">Diagnosis / root cause pending documentation</span>}
                        </p>
                      </div>

                      {/* Correction */}
                      <div className="bg-emerald-50/60 p-3 rounded-lg border-2 border-emerald-300 text-xs">
                        <span className="text-[10px] font-mono font-bold uppercase text-emerald-900 block mb-1">
                          3. Correction (Repair Performed / Action Taken):
                        </span>
                        <p className="font-mono text-slate-950 font-medium leading-relaxed whitespace-pre-wrap">
                          {job.correction || <span className="italic text-slate-400">Corrective repair pending documentation</span>}
                        </p>
                      </div>

                      {/* Labor Time for this Job */}
                      <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="font-black text-slate-900 flex items-center gap-1.5 uppercase">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>4. Warranty Labor Time Log for Line {job.lineNum}</span>
                          </div>
                          <span className="font-mono font-bold text-blue-900 text-xs">
                            {linePunches.length} punch session{linePunches.length === 1 ? '' : 's'} logged
                          </span>
                        </div>

                        {linePunches.length === 0 ? (
                          <div className="p-2 bg-white rounded border border-dashed border-slate-300 text-center text-xs text-slate-500 italic">
                            No specific time clock punches logged under Line {job.lineNum} yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-300 rounded bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                                  <th className="py-1.5 px-2 text-center w-8">#</th>
                                  <th className="py-1.5 px-2">Technician</th>
                                  <th className="py-1.5 px-2">Phase</th>
                                  <th className="py-1.5 px-2">Clock In</th>
                                  <th className="py-1.5 px-2">Clock Out</th>
                                  <th className="py-1.5 px-2 text-right">Elapsed</th>
                                  <th className="py-1.5 px-2">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {linePunches.map((punch, pIdx) => {
                                  const inText = formatDateTime(punch.clockIn);
                                  const outText = punch.clockOut ? formatDateTime(punch.clockOut) : 'In Progress (Active)';
                                  const durationHrs = punch.durationMinutes ? (punch.durationMinutes / 60).toFixed(2) : '--';
                                  const durationFormatted = punch.durationMinutes 
                                    ? `${Math.floor(punch.durationMinutes / 60)}h ${punch.durationMinutes % 60}m (${durationHrs} hrs)` 
                                    : 'Active';

                                  return (
                                    <tr key={punch.id || pIdx} className="hover:bg-slate-50">
                                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-500 text-[11px]">
                                        {pIdx + 1}
                                      </td>
                                      <td className="py-1 px-2 font-bold text-slate-900 whitespace-nowrap text-[11px]">
                                        {punch.techName}
                                        {punch.techEmployeeNumber && (
                                          <span className="text-[10px] font-mono text-slate-500 block">
                                            #{punch.techEmployeeNumber}
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 text-[11px]">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                                          {punch.operationType || 'REPAIR'}
                                        </span>
                                      </td>
                                      <td className="py-1 px-2 font-mono text-slate-800 whitespace-nowrap text-[11px]">
                                        {inText}
                                      </td>
                                      <td className="py-1 px-2 font-mono text-slate-800 whitespace-nowrap text-[11px]">
                                        {punch.clockOut ? (
                                          outText
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300 text-[10px]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span>Active</span>
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 font-mono font-bold text-slate-900 text-right whitespace-nowrap text-[11px]">
                                        {durationFormatted}
                                      </td>
                                      <td className="py-1 px-2 text-slate-600 text-[11px] max-w-xs truncate">
                                        {punch.notes || '--'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* General / Unassigned Punches (if any) */}
            {unassignedPunches.length > 0 && (
              <div className="bg-slate-50 rounded-xl border border-slate-300 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-900 uppercase">
                  <span>General / Shop Labor Time Punches (Unassigned to specific line)</span>
                  <span>{unassignedPunches.length} Sessions</span>
                </div>
                <div className="overflow-x-auto border border-slate-300 rounded bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                        <th className="py-1.5 px-2 text-center w-8">#</th>
                        <th className="py-1.5 px-2">Technician</th>
                        <th className="py-1.5 px-2">Phase</th>
                        <th className="py-1.5 px-2">Clock In</th>
                        <th className="py-1.5 px-2">Clock Out</th>
                        <th className="py-1.5 px-2 text-right">Elapsed</th>
                        <th className="py-1.5 px-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {unassignedPunches.map((punch, pIdx) => {
                        const inText = formatDateTime(punch.clockIn);
                        const outText = punch.clockOut ? formatDateTime(punch.clockOut) : 'In Progress (Active)';
                        const durationHrs = punch.durationMinutes ? (punch.durationMinutes / 60).toFixed(2) : '--';
                        const durationFormatted = punch.durationMinutes 
                          ? `${Math.floor(punch.durationMinutes / 60)}h ${punch.durationMinutes % 60}m (${durationHrs} hrs)` 
                          : 'Active';

                        return (
                          <tr key={punch.id || pIdx}>
                            <td className="py-1 px-2 text-center font-mono font-bold text-slate-500 text-[11px]">{pIdx + 1}</td>
                            <td className="py-1 px-2 font-bold text-slate-900 text-[11px]">{punch.techName}</td>
                            <td className="py-1 px-2 text-[11px]">{punch.operationType || 'REPAIR'}</td>
                            <td className="py-1 px-2 font-mono text-slate-800 text-[11px]">{inText}</td>
                            <td className="py-1 px-2 font-mono text-slate-800 text-[11px]">{outText}</td>
                            <td className="py-1 px-2 font-mono font-bold text-right text-[11px]">{durationFormatted}</td>
                            <td className="py-1 px-2 text-slate-600 text-[11px]">{punch.notes || '--'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Total Cumulative Warranty Time Summary Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block text-slate-300">
                    Total Cumulative Warranty Labor Time
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Sum of all labor sessions across all job lines on this repair order
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-lg text-emerald-400">
                  {totalHoursInt}h {totalMinsInt}m ({totalHoursFormatted} hrs)
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {punches.length} total punch sessions
                </div>
              </div>
            </div>

            {/* Section: Road Test & Out Mileage Verification */}
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  <span>Road Test & Out Mileage Verification</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  outMiles !== undefined 
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {outMiles !== undefined ? '✓ Test Drive Verified' : 'Odometer Verification Pending'}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-xs space-y-2">
                <div className="grid grid-cols-3 gap-3 font-semibold">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">1. In Miles (Intake)</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'Not recorded'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">2. Out Miles (Road Test)</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {outMiles !== undefined ? `${outMiles.toLocaleString()} mi` : 'Pending entry'}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">3. Test Drive Distance</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      {testDriveDistance !== undefined ? `+${testDriveDistance.toFixed(1)} miles` : '0 miles'}
                    </span>
                  </div>
                </div>
                {testDriveNotes && (
                  <div className="pt-1 text-[11px] text-slate-700">
                    <span className="font-bold text-slate-900">Road Test Observations: </span>
                    <span className="italic">{testDriveNotes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Installed Warranty Parts */}
            {ro.parts && ro.parts.length > 0 && (
              <div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-300 pb-1">
                  <span>Installed Replacement Parts / Materials</span>
                </div>
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                        <th className="py-1.5 px-2.5">Part #</th>
                        <th className="py-1.5 px-2.5">Description</th>
                        <th className="py-1.5 px-2.5 text-center">Qty</th>
                        <th className="py-1.5 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ro.parts.map((pt, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-900">{pt.partNumber}</td>
                          <td className="py-1.5 px-2.5 text-slate-800">{pt.description}</td>
                          <td className="py-1.5 px-2.5 text-center font-mono font-bold">{pt.quantity}</td>
                          <td className="py-1.5 px-2.5 text-slate-600 uppercase text-[10px] font-bold">{pt.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Formal Signatures & Certification */}
            <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Certified Technician Sign-Off</span>
                <div className="border-b border-slate-400 h-6"></div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Tech Signature ({ro.techName || 'Certified Tech'})</span>
                  <span>Date: __________________</span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Warranty Administrator / Manager</span>
                <div className="border-b border-slate-400 h-6"></div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Manager Signature ({ro.advisorName})</span>
                  <span>Date: __________________</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer Controls (Excluded from Print) */}
        <div className="p-4 bg-slate-900 border-t-2 border-slate-700 flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-slate-300">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-slate-200 font-mono text-[10px]">Esc</kbd> to close. Standard 8.5" x 11" Letter page formatting applied.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeWarrantyPrintModal}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document (Ctrl+P)</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Official Standalone Printable Document (Portal to document.body for 100% clean printing) */}
    {typeof document !== 'undefined' && createPortal(
      <div 
        id="printable-warranty-document"
        className="bg-white text-black max-w-4xl mx-auto space-y-4 font-sans text-xs"
      >
        {/* Dealership Header */}
        <div className="border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-black uppercase">
                {shopName || 'Woolwine CDJR'}
              </div>
              <div className="text-xs font-black text-black tracking-wider uppercase mt-0.5">
                WARRANTY REPAIR & LABOR TIME VERIFICATION RECORD
              </div>
              <div className="text-xs text-black font-bold mt-1.5 leading-snug">
                <div>{DEALERSHIP_ADDRESS}</div>
                <div className="text-[12px] font-black mt-0.5">Phone: {DEALERSHIP_PHONE}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="inline-block px-3 py-1 bg-white text-black font-mono font-black text-sm rounded border-2 border-black">
                RO #{ro.id}
              </div>
              {ro.createdAt && (
                <div className="text-[11px] text-black font-bold mt-1 font-mono">
                  RO Date: {formatMilitaryDate(ro.createdAt)}
                </div>
              )}
              <div className="text-[11px] text-black font-bold font-mono">
                Print Date: {formatMilitaryDateTime(new Date())}
              </div>
              <div className="text-[10px] text-black font-mono">
                Printed By: {currentUser.name} ({currentUser.role.replace(/_/g, ' ')})
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Grid */}
        <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border-2 border-black text-xs">
          <div>
            <span className="text-[10px] font-black text-black uppercase block">Customer Information</span>
            <span className="font-black text-black text-sm block">{ro.customerName}</span>
            <span className="text-black block text-[11px] font-bold">{ro.customerPhone}</span>
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Vehicle Information</span>
            <span className="font-black text-black text-sm block">
              {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
            </span>
            <span className="text-black block text-[11px] font-bold">
              In Miles: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
            </span>
            {outMiles !== undefined && (
              <span className="text-black block text-[11px] font-black">
                Out Miles: {outMiles.toLocaleString()} mi {testDriveDistance !== undefined ? `(+${testDriveDistance.toFixed(1)} mi drive)` : ''}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Vehicle Identification</span>
            <span className="font-mono font-black text-black bg-white px-1.5 py-0.5 rounded border border-black inline-block text-[11px]">
              VIN: {ro.vehicle.vin}
            </span>
            {ro.vehicle.licensePlate && (
              <span className="text-black block text-[11px] mt-0.5 font-bold">
                Plate: {ro.vehicle.licensePlate}
              </span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Service Assignment</span>
            <span className="text-black font-semibold block">
              Advisor: <strong className="font-black text-black">{ro.advisorName}</strong>
            </span>
            <span className="text-black font-semibold block">
              Tech: <strong className="font-black text-black">{ro.techName || 'Unassigned'}</strong>
            </span>
          </div>
        </div>

        {/* UNIFIED JOB LINES FOR PRINTING: Line 1, 2, 3... Complaint, Cause, Correction & Labor Time */}
        <div className="space-y-3.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>Itemized Job Lines (Complaint, Cause, Correction & Labor Time)</span>
            <span>{jobLines.length} Line Items</span>
          </div>

          {jobLines.map((job) => {
            const linePunches = getLinePunches(job.lineNum);
            const lineMins = getLineTotalMinutes(linePunches);
            const lineHrsFormatted = (lineMins / 60).toFixed(2);
            const lineHrsInt = Math.floor(lineMins / 60);
            const lineMinsInt = lineMins % 60;

            return (
              <div key={job.lineNum} className="warranty-print-section border-2 border-black rounded p-2.5 bg-white space-y-2 text-xs">
                
                {/* Line Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-1">
                  <div>
                    <span className="font-mono font-black text-sm uppercase mr-2">LINE #{job.lineNum}</span>
                    <span className="font-black text-xs uppercase">
                      {job.type === 'INSPECTION_FINDING' ? '21-PT INSPECTION FINDING RECORD' : 'JOB DOCUMENTATION & TIME RECORD'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-[10px] px-2 py-0.5 border border-black rounded uppercase">
                      {job.payType}
                    </span>
                    <span className="font-mono font-black text-xs">
                      Time: {lineHrsFormatted} hrs ({lineHrsInt}h {lineMinsInt}m)
                    </span>
                  </div>
                </div>

                {/* Complaint / Finding */}
                <div className="p-2 border border-black rounded bg-white">
                  <div className="text-[10px] font-black uppercase text-black mb-0.5">
                    1. {job.type === 'INSPECTION_FINDING' ? 'Inspection Finding / Concern:' : 'Customer Complaint / Concern:'}
                  </div>
                  <div className="font-bold text-black text-xs leading-snug">{job.title}</div>
                </div>

                {/* Cause */}
                <div className="p-2 border border-black rounded bg-white">
                  <div className="text-[10px] font-black uppercase text-black mb-0.5">2. Cause (Diagnostic Finding / Root Cause):</div>
                  <div className="font-mono font-bold text-black whitespace-pre-wrap leading-snug">
                    {job.cause || 'Diagnostic finding pending technician documentation.'}
                  </div>
                </div>

                {/* Correction */}
                <div className="p-2 border border-black rounded bg-white">
                  <div className="text-[10px] font-black uppercase text-black mb-0.5">3. Correction (Repair Action Taken):</div>
                  <div className="font-mono font-bold text-black whitespace-pre-wrap leading-snug">
                    {job.correction || 'Corrective repair pending technician documentation.'}
                  </div>
                </div>

                {/* Labor Time for this Line */}
                <div className="p-2 border border-black rounded bg-white space-y-1">
                  <div className="flex items-center justify-between border-b border-black/40 pb-0.5">
                    <span className="text-[10px] font-black uppercase text-black">
                      4. Warranty Labor Time Log (Line #{job.lineNum}):
                    </span>
                    <span className="font-mono font-black text-xs text-black">
                      Logged Time: {lineHrsFormatted} hrs ({lineHrsInt}h {lineMinsInt}m)
                    </span>
                  </div>

                  {linePunches.length === 0 ? (
                    <div className="italic text-[10px] font-bold text-black py-0.5">
                      No individual punch sessions logged specifically for Line #{job.lineNum}.
                    </div>
                  ) : (
                    <table className="w-full text-left text-[10px] border-collapse border border-black mt-1">
                      <thead>
                        <tr className="bg-slate-100 border-b border-black text-[9px] font-black uppercase">
                          <th className="py-0.5 px-1.5 border-r border-black text-center w-6">#</th>
                          <th className="py-0.5 px-1.5 border-r border-black">Technician</th>
                          <th className="py-0.5 px-1.5 border-r border-black">Phase</th>
                          <th className="py-0.5 px-1.5 border-r border-black">Clock In</th>
                          <th className="py-0.5 px-1.5 border-r border-black">Clock Out</th>
                          <th className="py-0.5 px-1.5 border-r border-black text-right">Elapsed</th>
                          <th className="py-0.5 px-1.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linePunches.map((p, pIdx) => (
                          <tr key={p.id || pIdx} className="border-b border-black/30">
                            <td className="py-0.5 px-1.5 text-center font-mono font-bold border-r border-black/30">{pIdx + 1}</td>
                            <td className="py-0.5 px-1.5 font-bold border-r border-black/30 whitespace-nowrap">{p.techName}</td>
                            <td className="py-0.5 px-1.5 font-mono uppercase text-[9px] border-r border-black/30">{p.operationType || 'REPAIR'}</td>
                            <td className="py-0.5 px-1.5 font-mono border-r border-black/30 whitespace-nowrap">{formatDateTime(p.clockIn)}</td>
                            <td className="py-0.5 px-1.5 font-mono border-r border-black/30 whitespace-nowrap">{p.clockOut ? formatDateTime(p.clockOut) : 'Active'}</td>
                            <td className="py-0.5 px-1.5 font-mono font-black text-right border-r border-black/30 whitespace-nowrap">
                              {p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)}h` : 'Active'}
                            </td>
                            <td className="py-0.5 px-1.5 text-[9px] truncate max-w-xs">{p.notes || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* General / Unassigned Punches in Print */}
        {unassignedPunches.length > 0 && (
          <div className="warranty-print-section border-2 border-black rounded p-2 bg-white space-y-1 text-xs">
            <div className="text-[10px] font-black uppercase text-black border-b border-black pb-0.5 flex justify-between">
              <span>General / Shop Labor Time Logs (Unassigned Line)</span>
              <span>{unassignedPunches.length} Sessions</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-black mt-1">
              <thead>
                <tr className="bg-slate-100 border-b border-black text-[9px] font-black uppercase">
                  <th className="py-0.5 px-1.5 border-r border-black text-center w-6">#</th>
                  <th className="py-0.5 px-1.5 border-r border-black">Technician</th>
                  <th className="py-0.5 px-1.5 border-r border-black">Phase</th>
                  <th className="py-0.5 px-1.5 border-r border-black">Clock In</th>
                  <th className="py-0.5 px-1.5 border-r border-black">Clock Out</th>
                  <th className="py-0.5 px-1.5 border-r border-black text-right">Elapsed</th>
                  <th className="py-0.5 px-1.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {unassignedPunches.map((p, pIdx) => (
                  <tr key={p.id || pIdx} className="border-b border-black/30">
                    <td className="py-0.5 px-1.5 text-center font-mono font-bold border-r border-black/30">{pIdx + 1}</td>
                    <td className="py-0.5 px-1.5 font-bold border-r border-black/30 whitespace-nowrap">{p.techName}</td>
                    <td className="py-0.5 px-1.5 font-mono uppercase text-[9px] border-r border-black/30">{p.operationType || 'REPAIR'}</td>
                    <td className="py-0.5 px-1.5 font-mono border-r border-black/30 whitespace-nowrap">{formatDateTime(p.clockIn)}</td>
                    <td className="py-0.5 px-1.5 font-mono border-r border-black/30 whitespace-nowrap">{p.clockOut ? formatDateTime(p.clockOut) : 'Active'}</td>
                    <td className="py-0.5 px-1.5 font-mono font-black text-right border-r border-black/30 whitespace-nowrap">
                      {p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)}h` : 'Active'}
                    </td>
                    <td className="py-0.5 px-1.5 text-[9px] truncate max-w-xs">{p.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grand Total Warranty Labor Time Banner for Print */}
        <div className="warranty-print-section p-2.5 border-2 border-black rounded bg-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-black uppercase text-black block">
              TOTAL CUMULATIVE WARRANTY LABOR TIME:
            </span>
            <span className="text-[10px] font-bold text-black">
              Total of all individual job line time punches across {punches.length} recorded session{punches.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="text-right font-mono font-black text-base text-black">
            {totalHoursFormatted} hrs ({totalHoursInt}h {totalMinsInt}m)
          </div>
        </div>

        {/* Road Test & Out Mileage Verification */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>Road Test & Out Mileage Verification</span>
            <span className="font-mono font-black uppercase">
              {outMiles !== undefined ? 'STATUS: VERIFIED & COMPLETED' : 'STATUS: PENDING ENTRY'}
            </span>
          </div>
          <div className="p-2.5 border border-black rounded bg-white text-xs space-y-1.5">
            <div className="grid grid-cols-3 gap-2">
              <div className="border border-black p-1.5 rounded">
                <span className="text-[9px] font-black uppercase block">Intake / In Miles:</span>
                <span className="font-mono font-black text-sm">{inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}</span>
              </div>
              <div className="border border-black p-1.5 rounded">
                <span className="text-[9px] font-black uppercase block">Final Out Miles:</span>
                <span className="font-mono font-black text-sm">{outMiles !== undefined ? `${outMiles.toLocaleString()} mi` : 'Pending'}</span>
              </div>
              <div className="border border-black p-1.5 rounded">
                <span className="text-[9px] font-black uppercase block">Road Test Distance:</span>
                <span className="font-mono font-black text-sm">{testDriveDistance !== undefined ? `+${testDriveDistance.toFixed(1)} miles` : '0 miles'}</span>
              </div>
            </div>
            {testDriveNotes && (
              <div className="text-[11px] font-bold">
                <span className="uppercase text-[9px] font-black block">Test Drive Observations:</span>
                <span className="font-mono">{testDriveNotes}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] pt-1 border-t border-black/40">
              <span>Road Test Conducted By: <strong>{ro.testDriveCompletedBy || ro.techName || 'Certified Technician'}</strong></span>
              <span>Timestamp: <strong>{ro.testDriveCompletedAt ? formatMilitaryDateTime(ro.testDriveCompletedAt) : 'Logged at completion'}</strong></span>
            </div>
          </div>
        </div>

        {/* Installed Replacement Parts */}
        {ro.parts && ro.parts.length > 0 && (
          <div className="warranty-print-section space-y-1.5">
            <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1">
              Installed Replacement Parts / Materials
            </div>
            <table className="w-full text-left text-xs border-collapse border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase">
                  <th className="py-1 px-2 border-r border-black">Part Number</th>
                  <th className="py-1 px-2 border-r border-black">Description</th>
                  <th className="py-1 px-2 border-r border-black text-center w-16">Qty</th>
                  <th className="py-1 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {ro.parts.map((pt, i) => (
                  <tr key={i} className="border-b border-black/40">
                    <td className="py-1 px-2 font-mono font-bold border-r border-black/40">{pt.partNumber}</td>
                    <td className="py-1 px-2 font-bold border-r border-black/40">{pt.description}</td>
                    <td className="py-1 px-2 text-center font-mono font-black border-r border-black/40">{pt.quantity}</td>
                    <td className="py-1 px-2 uppercase text-[10px] font-black">{pt.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures & Certification */}
        <div className="warranty-print-section pt-3 border-t-2 border-black grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-black block">Certified Technician Certification:</span>
            <div className="border-b-2 border-black h-8"></div>
            <div className="flex justify-between text-[10px] font-bold text-black">
              <span>Signature ({ro.techName || 'Certified Tech'})</span>
              <span>Date: __________________</span>
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase text-black block">Warranty Administrator / Manager Approval:</span>
            <div className="border-b-2 border-black h-8"></div>
            <div className="flex justify-between text-[10px] font-bold text-black">
              <span>Signature ({ro.advisorName})</span>
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

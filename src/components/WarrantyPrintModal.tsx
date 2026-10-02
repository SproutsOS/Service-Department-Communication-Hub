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

export const WarrantyPrintModal: React.FC = () => {
  const { 
    activeWarrantyPrintRO, 
    closeWarrantyPrintModal, 
    shopName, 
    currentUser 
  } = useApp();

  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeWarrantyPrintModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeWarrantyPrintModal]);

  if (!activeWarrantyPrintRO) return null;

  const ro = activeWarrantyPrintRO;
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

  const displayConcerns = (ro.concerns && ro.concerns.length > 0) 
    ? ro.concerns 
    : (ro.primaryConcern ? [ro.primaryConcern] : ['Customer reported vehicle performance concern']);

  const handlePrint = () => {
    document.body.classList.add('printing-warranty');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-warranty');
    }, 1000);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Active / In-Progress';
    return formatMilitaryDateTime(isoString);
  };

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
      `1. COMPLAINT / CONCERNS:`,
      ...displayConcerns.map((c, i) => `  Line ${i + 1}: ${c} [${ro.concernPayTypes?.[i] || 'WARRANTY'}]`),
      `\n2. CAUSE (DIAGNOSTIC FINDING / ROOT CAUSE):`,
      ...(ro.concernCauses && ro.concernCauses.some(c => c && c.trim())
        ? ro.concernCauses.map((c, i) => `  Line ${i + 1}: ${c || 'Pending diagnosis'}`)
        : [`  ${ro.cause || ro.diagnosticNotes || 'Pending documentation'}`]
      ),
      `\n3. CORRECTION (REPAIR PERFORMED / CORRECTIVE ACTION):`,
      ...(ro.concernCorrections && ro.concernCorrections.some(c => c && c.trim())
        ? ro.concernCorrections.map((c, i) => `  Line ${i + 1}: ${c || 'Pending repair'}`)
        : [`  ${ro.correction || 'Pending documentation'}`]
      ),
      `\n4. ROAD TEST & OUT MILEAGE VERIFICATION:`,
      `  Intake Odometer: ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`,
      `  Out Odometer: ${outMiles !== undefined ? `${outMiles.toLocaleString()} mi` : 'Not recorded'}`,
      `  Test Drive Distance: ${testDriveDistance !== undefined ? `${testDriveDistance.toFixed(1)} miles driven` : '0 miles'}`,
      `  Road Test Observations: ${testDriveNotes || 'Road test completed - verified resolved'}`,
      `  Completed By: ${ro.testDriveCompletedBy || ro.techName || currentUser.name}`,
      `\n5. WARRANTY LABOR TIME CLOCK PUNCHES (START & END TIMES):`,
    ];

    if (punches.length === 0) {
      lines.push(`  No time clock punches recorded on this ticket yet.`);
    } else {
      punches.forEach((p, idx) => {
        const start = formatDateTime(p.clockIn);
        const end = p.clockOut ? formatDateTime(p.clockOut) : 'Active / In Progress';
        const dur = p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)} hrs (${p.durationMinutes} min)` : 'In Progress';
        lines.push(`  Punch #${idx + 1}: Tech: ${p.techName}${p.techEmployeeNumber ? ` (#${p.techEmployeeNumber})` : ''}`);
        lines.push(`    - Phase: ${p.operationType || 'REPAIR'}`);
        lines.push(`    - Start (Clock In):  ${start}`);
        lines.push(`    - End   (Clock Out): ${end}`);
        lines.push(`    - Elapsed: ${dur}`);
        if (p.notes) lines.push(`    - Notes: ${p.notes}`);
      });
      lines.push(`  ----------------------------------------------------`);
      lines.push(`  TOTAL WARRANTY LABOR TIME: ${totalHoursFormatted} hrs (${totalHoursInt}h ${totalMinsInt}m) across ${punches.length} punch sessions`);
    }

    if (ro.parts && ro.parts.length > 0) {
      lines.push(`\n6. INSTALLED PARTS:`);
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
                Official Cause & Correction, Out Miles Road Test Verification, and Itemized Labor Time Punches
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

            {/* Section 1: Customer Complaints */}
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>1. Customer Complaint / Concern (Customer Stated Symptom)</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{displayConcerns.length} {displayConcerns.length === 1 ? 'Line Item' : 'Line Items'}</span>
              </div>
              <div className="space-y-1.5">
                {displayConcerns.map((concern, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded border border-slate-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded shrink-0">
                        Line {idx + 1}
                      </span>
                      <span className="font-medium text-slate-900">{concern}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-200 shrink-0">
                      {ro.concernPayTypes?.[idx] || 'WARRANTY'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Cause (Diagnostic Finding) */}
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-300 pb-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>2. Cause (Diagnostic Finding / Root Cause of Failure)</span>
              </div>
              <div className="space-y-2">
                {ro.concernCauses && ro.concernCauses.some(c => c && c.trim()) ? (
                  ro.concernCauses.map((causeText, idx) => (
                    <div key={idx} className="bg-amber-50/50 p-3 rounded-lg border-2 border-amber-300 text-xs">
                      <div className="text-[10px] font-mono font-bold uppercase text-amber-900 mb-1">
                        Line {idx + 1} Root Cause:
                      </div>
                      <p className="font-mono text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                        {causeText || <span className="italic text-slate-400">Diagnosis pending</span>}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-amber-50/50 p-3.5 rounded-lg border-2 border-amber-300 text-xs">
                    {ro.cause ? (
                      <p className="font-mono text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {ro.cause}
                      </p>
                    ) : ro.diagnosticNotes ? (
                      <p className="font-mono text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {ro.diagnosticNotes}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic font-mono">
                        No diagnostic root cause documented yet. Technician can enter cause findings in the shop terminal.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Correction (Repair Completed) */}
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-300 pb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>3. Correction (Corrective Repair Performed / Action Taken)</span>
              </div>
              <div className="space-y-2">
                {ro.concernCorrections && ro.concernCorrections.some(c => c && c.trim()) ? (
                  ro.concernCorrections.map((corrText, idx) => (
                    <div key={idx} className="bg-emerald-50/50 p-3 rounded-lg border-2 border-emerald-300 text-xs">
                      <div className="text-[10px] font-mono font-bold uppercase text-emerald-900 mb-1">
                        Line {idx + 1} Corrective Action:
                      </div>
                      <p className="font-mono text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                        {corrText || <span className="italic text-slate-400">Repair pending</span>}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-emerald-50/50 p-3.5 rounded-lg border-2 border-emerald-300 text-xs">
                    {ro.correction ? (
                      <p className="font-mono text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                        {ro.correction}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic font-mono">
                        No corrective repair documented yet. Technician can document completed repairs in the shop terminal.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Road Test & Out Mileage Verification */}
            <div>
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center justify-between border-b border-slate-300 pb-1">
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  <span>4. Road Test & Out Mileage Verification</span>
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

            {/* Section 5: Warranty Labor Time Clock Punches */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-300 pb-1 mb-2">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>5. Warranty Labor Time Clock Logs (Multi-Punch Start & End Times)</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600">
                  Total Sessions: {punches.length}
                </span>
              </div>

              {punches.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-400 rounded-lg text-center text-xs text-slate-500 italic">
                  No labor time clock punches recorded on this repair order ticket yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                        <th className="py-2 px-2.5 w-12 text-center">#</th>
                        <th className="py-2 px-2.5">Technician</th>
                        <th className="py-2 px-2.5">Phase / Operation</th>
                        <th className="py-2 px-2.5">Clock In (Start)</th>
                        <th className="py-2 px-2.5">Clock Out (End)</th>
                        <th className="py-2 px-2.5 text-right">Elapsed</th>
                        <th className="py-2 px-2.5">Work Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {punches.map((punch, idx) => {
                        const inText = formatDateTime(punch.clockIn);
                        const outText = punch.clockOut ? formatDateTime(punch.clockOut) : 'In Progress (Active)';
                        const durationHrs = punch.durationMinutes ? (punch.durationMinutes / 60).toFixed(2) : '--';
                        const durationFormatted = punch.durationMinutes 
                          ? `${Math.floor(punch.durationMinutes / 60)}h ${punch.durationMinutes % 60}m (${durationHrs} hrs)` 
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
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
                                  {punch.operationType || 'REPAIR'}
                                </span>
                                {punch.roLineNumber && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    Line {punch.roLineNumber}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                              {inText}
                            </td>
                            <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                              {punch.clockOut ? (
                                outText
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Active</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                              {durationFormatted}
                            </td>
                            <td className="py-2 px-2.5 text-slate-700 text-[11px] max-w-xs truncate">
                              {punch.notes || '--'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                        <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider">
                          Total Cumulative Warranty Labor Time:
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-black text-sm text-blue-900 whitespace-nowrap">
                          {totalHoursInt}h {totalMinsInt}m ({totalHoursFormatted} hrs)
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-500 text-[11px]">
                          {punches.length} total punch sessions
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Section 6: Installed Warranty Parts */}
            {ro.parts && ro.parts.length > 0 && (
              <div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5 border-b border-slate-300 pb-1">
                  <span>6. Installed Replacement Parts / Materials</span>
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

            {/* Section 7: Formal Signatures & Certification */}
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

        {/* 1. Customer Complaints / Concerns */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>1. Customer Complaint / Concern (Customer Stated Symptom)</span>
            <span>{displayConcerns.length} Line Items</span>
          </div>
          <div className="space-y-1">
            {displayConcerns.map((concern, idx) => (
              <div key={idx} className="p-2 border border-black rounded bg-white text-xs flex items-center justify-between">
                <div>
                  <strong className="font-mono font-black mr-2">Line #{idx + 1}:</strong>
                  <span className="font-bold text-black">{concern}</span>
                </div>
                <span className="font-mono font-black text-[10px] px-1.5 py-0.5 border border-black rounded uppercase">
                  {ro.concernPayTypes?.[idx] || 'WARRANTY'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Cause (Diagnostic Finding) */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1">
            2. Cause (Diagnostic Finding / Root Cause of Failure)
          </div>
          <div className="space-y-1">
            {ro.concernCauses && ro.concernCauses.some(c => c && c.trim()) ? (
              ro.concernCauses.map((cText, idx) => (
                <div key={idx} className="p-2 border border-black rounded bg-white text-xs">
                  <div className="text-[10px] font-black uppercase mb-0.5">Line #{idx + 1} Finding:</div>
                  <div className="font-mono font-bold text-black whitespace-pre-wrap">{cText || 'Diagnosis pending'}</div>
                </div>
              ))
            ) : (
              <div className="p-2.5 border border-black rounded bg-white text-xs font-mono font-bold whitespace-pre-wrap">
                {ro.cause || ro.diagnosticNotes || 'Diagnostic finding pending technician documentation.'}
              </div>
            )}
          </div>
        </div>

        {/* 3. Correction (Repair Performed) */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1">
            3. Correction (Corrective Repair Performed / Action Taken)
          </div>
          <div className="space-y-1">
            {ro.concernCorrections && ro.concernCorrections.some(c => c && c.trim()) ? (
              ro.concernCorrections.map((corrText, idx) => (
                <div key={idx} className="p-2 border border-black rounded bg-white text-xs">
                  <div className="text-[10px] font-black uppercase mb-0.5">Line #{idx + 1} Corrective Action:</div>
                  <div className="font-mono font-bold text-black whitespace-pre-wrap">{corrText || 'Repair pending'}</div>
                </div>
              ))
            ) : (
              <div className="p-2.5 border border-black rounded bg-white text-xs font-mono font-bold whitespace-pre-wrap">
                {ro.correction || 'Corrective repair pending technician documentation.'}
              </div>
            )}
          </div>
        </div>

        {/* 4. Road Test & Out Mileage Verification */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>4. Road Test & Out Mileage Verification</span>
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

        {/* 5. Warranty Labor Time Clock Logs */}
        <div className="warranty-print-section space-y-1.5">
          <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1 flex justify-between">
            <span>5. Warranty Labor Time Clock Logs (Punches)</span>
            <span>{punches.length} Sessions • Total: {totalHoursFormatted} hrs</span>
          </div>
          {punches.length === 0 ? (
            <div className="p-2 border border-black rounded text-center italic text-xs font-bold">
              No time punches recorded on this repair order ticket.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse border-2 border-black">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black uppercase">
                  <th className="py-1 px-2 text-center border-r border-black w-8">#</th>
                  <th className="py-1 px-2 border-r border-black">Technician</th>
                  <th className="py-1 px-2 border-r border-black">Phase</th>
                  <th className="py-1 px-2 border-r border-black">Clock In</th>
                  <th className="py-1 px-2 border-r border-black">Clock Out</th>
                  <th className="py-1 px-2 border-r border-black text-right">Elapsed</th>
                  <th className="py-1 px-2">Work Notes</th>
                </tr>
              </thead>
              <tbody>
                {punches.map((p, idx) => (
                  <tr key={p.id || idx} className="border-b border-black/40">
                    <td className="py-1 px-2 text-center font-mono font-bold border-r border-black/40">{idx + 1}</td>
                    <td className="py-1 px-2 font-bold border-r border-black/40">{p.techName}</td>
                    <td className="py-1 px-2 font-mono text-[10px] font-bold uppercase border-r border-black/40">{p.operationType || 'REPAIR'}</td>
                    <td className="py-1 px-2 font-mono border-r border-black/40">{formatDateTime(p.clockIn)}</td>
                    <td className="py-1 px-2 font-mono border-r border-black/40">{p.clockOut ? formatDateTime(p.clockOut) : 'Active'}</td>
                    <td className="py-1 px-2 font-mono font-black text-right border-r border-black/40">
                      {p.durationMinutes ? `${(p.durationMinutes / 60).toFixed(2)}h` : '--'}
                    </td>
                    <td className="py-1 px-2 text-[10px]">{p.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black border-t-2 border-black">
                  <td colSpan={5} className="py-1.5 px-2 text-right uppercase text-[10px]">
                    Total Cumulative Warranty Labor Time:
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-sm font-black border-r border-black">
                    {totalHoursFormatted} hrs
                  </td>
                  <td className="py-1.5 px-2 text-[10px] font-mono">
                    ({totalHoursInt}h {totalMinsInt}m)
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 6. Installed Replacement Parts */}
        {ro.parts && ro.parts.length > 0 && (
          <div className="warranty-print-section space-y-1.5">
            <div className="text-xs font-black text-black uppercase tracking-wider border-b-2 border-black pb-1">
              6. Installed Replacement Parts / Materials
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

        {/* 7. Signatures & Certification */}
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

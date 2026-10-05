import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Calculator, 
  FileText, 
  ShieldCheck, 
  User as UserIcon, 
  Car, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  Package,
  DollarSign,
  Edit3,
  MapPin,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConcernPayType } from '../types';
import { formatMilitaryDate, formatMilitaryDateTime, cleanRO3700 } from '../utils/formatters';

const DEALERSHIP_ADDRESS = '2100 HWY 49, SEMINARY, MS 39479';
const DEALERSHIP_PHONE = '601-765-2066';

export const QuotePrintModal: React.FC = () => {
  const { 
    activeQuotePrintRO: initialRO, 
    closeQuotePrintModal, 
    openQuoteModal,
    shopName, 
    currentUser,
    repairOrders 
  } = useApp();

  const [copied, setCopied] = useState(false);

  // Live RO and clean data
  const liveRO = initialRO ? (repairOrders.find(r => r.id === initialRO.id) || initialRO) : null;
  const cleanRO = liveRO ? cleanRO3700(liveRO) : null;

  // Reliable native direct print
  const handlePrint = useCallback(() => {
    if (!cleanRO) return;
    const roNumber = cleanRO.id || '';
    const vehicleDesc = cleanRO.vehicle ? `${cleanRO.vehicle.year} ${cleanRO.vehicle.make} ${cleanRO.vehicle.model}` : '';
    const title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    const prevTitle = document.title;
    document.title = title;

    document.body.classList.add('printing-quote');

    const cleanup = () => {
      document.body.classList.remove('printing-quote');
      document.title = prevTitle;
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  }, [cleanRO]);

  // Close on Escape key or trigger Print on Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuotePrintModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeQuotePrintModal, handlePrint]);

  // Ensure clean print isolation if system print is triggered
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-quote');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-quote');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-quote');
    };
  }, []);

  if (!cleanRO) return null;

  const quote = cleanRO.quote;

  const inMiles = cleanRO.vehicle.mileage ?? 0;
  const outMiles = cleanRO.outMileage ?? cleanRO.vehicle.outMileage;
  const testDriveDistance = outMiles !== undefined && inMiles > 0 ? Math.max(0, outMiles - inMiles) : undefined;

  const concernsList = (cleanRO.concerns && cleanRO.concerns.length > 0)
    ? cleanRO.concerns
    : (cleanRO.primaryConcern ? [cleanRO.primaryConcern] : ['Customer reported vehicle inspection / service concern']);

  const laborItems = quote?.laborItems || [];
  const partsItems = quote?.partsItems || [];

  // Financial calculations
  const totalLaborHours = quote?.totalLaborHours ?? laborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0);
  const totalLaborCost = quote?.totalLaborCost ?? laborItems.reduce((acc, item) => acc + (Number(item.subtotal) || ((Number(item.laborHours) || 0) * (Number(item.hourlyRate) || 165))), 0);
  
  // Calculate parts subtotal from quote parts or RO parts if not in quote
  const totalPartsCost = quote?.totalPartsCost ?? (
    partsItems.length > 0
      ? partsItems.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0)
      : (cleanRO.parts || []).reduce((acc, p) => acc + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0)
  );

  const shopSuppliesFee = quote?.applyShopSupplies ? (quote?.shopSuppliesFee ?? 25.00) : 0;
  const isTaxExempt = Boolean(cleanRO.isTaxExempt || quote?.isTaxExempt);
  const taxRatePercent = (quote as any)?.taxRatePercent ?? 7.0;
  const taxableAmount = totalLaborCost + totalPartsCost + shopSuppliesFee;
  const taxAmount = isTaxExempt ? 0 : (quote?.taxAmount ?? (taxableAmount * (taxRatePercent / 100)));
  const grandTotal = quote?.grandTotal ?? (taxableAmount + taxAmount);

  const handleCopySummary = () => {
    const lines: string[] = [
      `======================================================`,
      `OFFICIAL REPAIR ESTIMATE & QUOTE`,
      `Shop / Dealership: ${shopName || 'Woolwine CDJR'}`,
      `Address: ${DEALERSHIP_ADDRESS}`,
      `Phone: ${DEALERSHIP_PHONE}`,
      `Repair Order #: ${cleanRO.id}`,
      `Date: ${cleanRO.createdAt ? formatMilitaryDate(cleanRO.createdAt) : formatMilitaryDate(new Date())}`,
      `Status: ${quote?.status || 'PENDING ESTIMATE'}`,
      `Customer: ${cleanRO.customerName} | Phone: ${cleanRO.customerPhone || 'N/A'}`,
      `Vehicle: ${cleanRO.vehicle.year} ${cleanRO.vehicle.make} ${cleanRO.vehicle.model}`,
      `VIN: ${cleanRO.vehicle.vin}`,
      `Mileage In: ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`,
      `Service Advisor: ${cleanRO.advisorName} | Tech: ${cleanRO.techName || 'Unassigned'}`,
      `------------------------------------------------------`,
      `LINE-BY-LINE ESTIMATE BREAKDOWN:`
    ];

    concernsList.forEach((concern, idx) => {
      const lNum = idx + 1;
      const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lNum);
      const lParts = partsItems.filter(p => (p.roLineNumber || 1) === lNum);
      const lLaborTotal = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0);
      const lPartsTotal = lParts.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);
      const lCause = cleanRO.concernCauses?.[idx] || (idx === 0 ? cleanRO.cause : '');
      const lCorrection = cleanRO.concernCorrections?.[idx] || (idx === 0 ? cleanRO.correction : '');

      lines.push(`\n[Line ${lNum}] Concern: ${concern}`);
      if (lCause) lines.push(`  Cause: ${lCause}`);
      if (lCorrection) lines.push(`  Correction: ${lCorrection}`);
      if (lLabor.length > 0) {
        lLabor.forEach(li => {
          lines.push(`  Labor: ${li.description} - ${li.laborHours} hrs @ $${li.hourlyRate}/hr = $${(Number(li.subtotal) || 0).toFixed(2)}`);
        });
      }
      if (lParts.length > 0) {
        lParts.forEach(pi => {
          lines.push(`  Part: ${pi.partNumber} ${pi.description} (Qty: ${pi.quantity}) @ $${pi.unitPrice}/ea = $${(Number(pi.subtotal) || 0).toFixed(2)}`);
        });
      }
      lines.push(`  Line ${lNum} Subtotal: $${(lLaborTotal + lPartsTotal).toFixed(2)}`);
    });

    lines.push(`\n------------------------------------------------------`);
    lines.push(`FINANCIAL SUMMARY:`);
    lines.push(`Total Labor (${totalLaborHours.toFixed(1)} hrs): $${totalLaborCost.toFixed(2)}`);
    lines.push(`Total Parts: $${totalPartsCost.toFixed(2)}`);
    if (shopSuppliesFee > 0) lines.push(`Shop Supplies / Hazardous Fee: $${shopSuppliesFee.toFixed(2)}`);
    lines.push(`Sales Tax (${taxRatePercent}%): $${taxAmount.toFixed(2)}${isTaxExempt ? ' (TAX EXEMPT)' : ''}`);
    lines.push(`======================================================`);
    lines.push(`ESTIMATED GRAND TOTAL: $${grandTotal.toFixed(2)}`);
    lines.push(`======================================================`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => {
      console.error('Clipboard copy error:', err);
    });
  };

  const getStatusBadge = () => {
    const status = quote?.status || 'DRAFT';
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Authorized by Customer</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white font-bold rounded-lg text-xs shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Customer Authorization</span>
          </span>
        );
      case 'DECLINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-xs shadow-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Declined by Customer</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-700 text-slate-100 font-bold rounded-lg text-xs shadow-xs">
            <Calculator className="w-3.5 h-3.5" />
            <span>Estimate Draft</span>
          </span>
        );
    }
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
                <Calculator className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight truncate">Repair Estimate Preview</h3>
                  <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs font-mono font-bold rounded border border-blue-400/40 shrink-0">
                    RO #{cleanRO.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  Itemized Parts, Labor Operations, Taxes, and Customer Authorization Record
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Copy formatted text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeQuotePrintModal();
                  openQuoteModal(cleanRO.id);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Edit quote lines, rates, or parts"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Edit Quote</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print Quote</span>
              </button>

              <button
                type="button"
                onClick={closeQuotePrintModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1 shrink-0"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Screen Preview Paper Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
            
            <div className="bg-white p-6 sm:p-8 rounded-xl border-2 border-slate-300 shadow-sm max-w-3xl mx-auto space-y-6 text-slate-900">
              
              {/* Dealership & Estimate Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                      {shopName || 'Woolwine CDJR'}
                    </div>
                    <div className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-0.5">
                      REPAIR ESTIMATE & OFFICIAL QUOTE
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
                      RO #{cleanRO.id}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-1 font-mono">
                      Date: {cleanRO.createdAt ? formatMilitaryDate(cleanRO.createdAt) : formatMilitaryDate(new Date())}
                    </div>
                    <div className="mt-1">
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer & Vehicle Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-300 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer</span>
                  <span className="font-bold text-slate-900 block">{cleanRO.customerName}</span>
                  <span className="text-slate-600 block text-[11px]">{cleanRO.customerPhone || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle</span>
                  <span className="font-bold text-slate-900 block">
                    {cleanRO.vehicle.year} {cleanRO.vehicle.make} {cleanRO.vehicle.model}
                  </span>
                  <span className="text-slate-700 block text-[11px] font-bold">
                    In: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
                  </span>
                  {outMiles !== undefined && (
                    <span className="text-emerald-700 block text-[11px] font-bold">
                      Out: {outMiles.toLocaleString()} mi {testDriveDistance !== undefined ? `(+${testDriveDistance.toFixed(1)} mi)` : ''}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">VIN (17-Digit)</span>
                  <span className="font-mono font-black text-slate-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 inline-block text-[11px]">
                    {cleanRO.vehicle.vin}
                  </span>
                  {cleanRO.vehicle.licensePlate && (
                    <span className="text-slate-600 block text-[11px] mt-0.5">
                      Plate: {cleanRO.vehicle.licensePlate}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Service Team</span>
                  <span className="font-medium text-slate-800 block">
                    Advisor: <strong className="font-bold">{cleanRO.advisorName}</strong>
                  </span>
                  <span className="font-medium text-slate-800 block">
                    Tech: <strong className="font-bold">{cleanRO.techName || 'Unassigned'}</strong>
                  </span>
                  <span className="text-slate-500 block text-[10px] mt-0.5 font-mono">
                    Print: {formatMilitaryDateTime(new Date())}
                  </span>
                </div>
              </div>

              {/* Itemized Line-by-Line Breakdown */}
              <div className="space-y-4">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b-2 border-slate-300 pb-1">
                  <span>Itemized Concern Lines & Services</span>
                  <span className="text-[10px] text-slate-500 font-bold">{concernsList.length} Line(s) Total</span>
                </div>

                {concernsList.map((concern, idx) => {
                  const lineNum = idx + 1;
                  const payType: ConcernPayType = cleanRO.concernPayTypes?.[idx] || quote?.payType || 'CUSTOMER_PAY';
                  const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lineNum);
                  const lParts = partsItems.filter(p => (p.roLineNumber || 1) === lineNum);
                  const lROParts = (cleanRO.parts || []).filter(p => (p.roLineNumber || 1) === lineNum);
                  const effectiveParts = lParts.length > 0 ? lParts : lROParts.map(p => ({
                    id: p.id,
                    partNumber: p.partNumber,
                    description: p.description,
                    quantity: p.quantity,
                    unitPrice: p.price,
                    subtotal: (p.price || 0) * (p.quantity || 1),
                    status: 'PENDING' as const,
                    roLineNumber: lineNum
                  }));

                  const lineLaborCost = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.laborHours) || 0) * (Number(i.hourlyRate) || 165))), 0);
                  const linePartsCost = effectiveParts.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0);
                  const lineTotalCost = lineLaborCost + linePartsCost;

                  const lineCause = cleanRO.concernCauses?.[idx] || (idx === 0 ? cleanRO.cause : '');
                  const lineCorrection = cleanRO.concernCorrections?.[idx] || (idx === 0 ? cleanRO.correction : '');

                  return (
                    <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50/50">
                      
                      {/* Line Header */}
                      <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                            Line {lineNum}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {concern}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-200">
                            {payType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                            ${lineTotalCost.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-3 text-xs">
                        {/* Cause & Correction if documented */}
                        {(lineCause || lineCorrection) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-amber-50/60 p-2.5 rounded border border-amber-200 font-mono">
                            {lineCause && (
                              <div>
                                <span className="font-bold text-amber-950 uppercase block text-[10px]">Cause (Diagnostic Finding):</span>
                                <p className="text-slate-800 whitespace-pre-wrap">{lineCause}</p>
                              </div>
                            )}
                            {lineCorrection && (
                              <div>
                                <span className="font-bold text-emerald-950 uppercase block text-[10px]">Correction (Repair Plan):</span>
                                <p className="text-slate-800 whitespace-pre-wrap">{lineCorrection}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Labor Operations Table */}
                        {lLabor.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-blue-600" />
                              <span>Labor Operations:</span>
                            </span>
                            <table className="w-full text-[11px] border border-slate-200 rounded overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                                <tr>
                                  <th className="p-1.5">Operation Description</th>
                                  <th className="p-1.5 text-center w-20">Hours</th>
                                  <th className="p-1.5 text-right w-24">Rate</th>
                                  <th className="p-1.5 text-right w-24">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {lLabor.map((item, liIdx) => (
                                  <tr key={liIdx}>
                                    <td className="p-1.5 font-medium text-slate-900">{item.description}</td>
                                    <td className="p-1.5 text-center font-mono font-bold text-slate-800">{(Number(item.laborHours) || 0).toFixed(1)} hrs</td>
                                    <td className="p-1.5 text-right font-mono text-slate-600">${(Number(item.hourlyRate) || 165).toFixed(2)}</td>
                                    <td className="p-1.5 text-right font-mono font-bold text-slate-900">${(Number(item.subtotal) || 0).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Parts Items Table */}
                        {effectiveParts.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                              <Package className="w-3 h-3 text-amber-600" />
                              <span>Required Parts & Materials:</span>
                            </span>
                            <table className="w-full text-[11px] border border-slate-200 rounded overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                                <tr>
                                  <th className="p-1.5 w-28">Part #</th>
                                  <th className="p-1.5">Description</th>
                                  <th className="p-1.5 text-center w-16">Qty</th>
                                  <th className="p-1.5 text-right w-24">Unit Price</th>
                                  <th className="p-1.5 text-right w-24">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 bg-white">
                                {effectiveParts.map((part, pIdx) => {
                                  const isPartDeclined = part.status === 'DECLINED';
                                  return (
                                    <tr key={pIdx} className={isPartDeclined ? 'bg-rose-50/40 text-slate-500' : ''}>
                                      <td className="p-1.5 font-mono font-bold text-slate-900">{part.partNumber}</td>
                                      <td className="p-1.5 font-medium text-slate-800">
                                        <span className={isPartDeclined ? 'line-through text-slate-500' : ''}>{part.description}</span>
                                        {isPartDeclined && <span className="ml-1.5 text-[10px] font-black text-rose-700 uppercase font-sans">[Declined by Customer]</span>}
                                      </td>
                                      <td className="p-1.5 text-center font-mono font-bold">{part.quantity}</td>
                                      <td className="p-1.5 text-right font-mono text-slate-600">${(Number(part.unitPrice) || 0).toFixed(2)}</td>
                                      <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                                        {isPartDeclined ? <span className="text-rose-700 font-black">$0.00</span> : `$${(Number(part.subtotal) || 0).toFixed(2)}`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {lLabor.length === 0 && effectiveParts.length === 0 && (
                          <div className="text-[11px] text-slate-500 italic p-2 bg-slate-100 rounded text-center">
                            No specific parts or labor line items itemized yet for Line {lineNum}.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Totals & Tax Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1.5 flex items-center justify-between">
                  <span>Financial Estimate Summary</span>
                  <span className="font-mono text-[11px] font-bold text-slate-600">Total Labor: {totalLaborHours.toFixed(1)} hrs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span>Total Labor Cost ({totalLaborHours.toFixed(1)} hrs):</span>
                      <strong className="font-mono text-slate-900">${totalLaborCost.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Parts & Materials:</span>
                      <strong className="font-mono text-slate-900">${totalPartsCost.toFixed(2)}</strong>
                    </div>
                    {shopSuppliesFee > 0 && (
                      <div className="flex justify-between">
                        <span>Shop Supplies & Environmental Fee:</span>
                        <strong className="font-mono text-slate-900">${shopSuppliesFee.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-slate-700 sm:border-l sm:border-slate-300 sm:pl-4">
                    <div className="flex justify-between">
                      <span>Sales Tax ({taxRatePercent}%):</span>
                      <strong className="font-mono text-slate-900">
                        {isTaxExempt ? '$0.00 (Exempt)' : `$${taxAmount.toFixed(2)}`}
                      </strong>
                    </div>
                    {isTaxExempt && cleanRO.taxExemptNumber && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Tax Exempt #: {cleanRO.taxExemptNumber}
                      </div>
                    )}
                    <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-950 uppercase">Estimated Grand Total:</span>
                      <span className="text-base font-black font-mono text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                        ${grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dealership Terms & Customer Authorization Block */}
              <div className="border-t-2 border-slate-300 pt-4 text-xs space-y-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[10px] text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 block uppercase font-bold mb-0.5">Customer Authorization & Terms of Service:</strong>
                  I hereby authorize the repair work listed above to be performed along with the necessary materials and parts. 
                  Dealership employees may operate the vehicle on streets and highways for testing and inspection. An express mechanic's lien is acknowledged on vehicle to secure the amount of repairs thereto. 
                  Vehicles not picked up within 48 hours of completion notification may be subject to standard storage fees.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
                  <div className="border-t-2 border-slate-900 pt-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Authorization / Signature</span>
                    {quote?.status === 'APPROVED' ? (
                      <div className="mt-1">
                        <span className="text-emerald-700 font-black text-xs block">
                          ✓ AUTHORIZED: {quote.approvedBy || cleanRO.customerName}
                        </span>
                        {quote.approvedAt && (
                          <span className="text-[10px] font-mono text-slate-500 block">
                            Timestamp: {formatMilitaryDateTime(quote.approvedAt)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-6 mt-1 flex items-end">
                        <span className="text-[11px] text-slate-400 italic">Signature: ________________________________</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-slate-900 pt-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Service Advisor Acknowledgment</span>
                    <div className="mt-1">
                      <span className="text-slate-900 font-bold text-xs block">
                        {cleanRO.advisorName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        Date: {formatMilitaryDateTime(new Date())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer (Excluded from Print) */}
          <div className="p-4 bg-slate-900 border-t-2 border-slate-700 flex items-center justify-between gap-3 shrink-0 no-print">
            <div className="text-xs text-slate-400">
              Dealership: <strong className="text-slate-200">{shopName || 'Woolwine CDJR'}</strong> • {DEALERSHIP_ADDRESS} • Phone: {DEALERSHIP_PHONE} • RO #{cleanRO.id}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeQuotePrintModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-600"
              >
                Close Preview
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Quote (Ctrl+P)</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Official Standalone Printable Document (Portal to document.body for 100% clean printing) */}
      {typeof document !== 'undefined' && createPortal(
        <div 
          id="printable-quote-document"
          className="bg-white text-black max-w-4xl mx-auto space-y-4 font-sans text-xs p-6"
        >
          {/* Header */}
          <div className="border-b-2 border-black pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-black tracking-tight text-black uppercase">
                  {shopName || 'Woolwine CDJR'}
                </div>
                <div className="text-xs font-black text-black tracking-wider uppercase mt-0.5">
                  REPAIR ESTIMATE & QUOTE
                </div>
                {/* Dealership Address & Phone Number */}
                <div className="text-xs text-black font-bold mt-1.5 leading-snug">
                  <div>{DEALERSHIP_ADDRESS}</div>
                  <div className="text-[12px] font-black mt-0.5">Phone: {DEALERSHIP_PHONE}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-white text-black font-mono font-black text-sm rounded border-2 border-black">
                  RO #{cleanRO.id}
                </div>
                <div className="text-[11px] text-black font-bold mt-1 font-mono">
                  Date: {cleanRO.createdAt ? formatMilitaryDate(cleanRO.createdAt) : formatMilitaryDate(new Date())}
                </div>
                <div className="text-[11px] font-black text-black mt-0.5 uppercase">
                  Status: {quote?.status || 'PENDING AUTHORIZATION'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Grid */}
          <div className="grid grid-cols-2 gap-4 border-2 border-black p-3 text-xs">
            <div>
              <div className="text-[10px] font-black uppercase text-black">Customer Details:</div>
              <div className="font-black text-sm text-black">{cleanRO.customerName}</div>
              <div className="text-black font-bold">Phone: {cleanRO.customerPhone || 'N/A'}</div>
              <div className="text-black mt-1">Service Advisor: <strong>{cleanRO.advisorName}</strong></div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase text-black">Vehicle Details:</div>
              <div className="font-black text-sm text-black">
                {cleanRO.vehicle.year} {cleanRO.vehicle.make} {cleanRO.vehicle.model}
              </div>
              <div className="font-mono font-bold text-black">VIN: {cleanRO.vehicle.vin}</div>
              <div className="text-black font-bold">
                Mileage In: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
                {outMiles !== undefined ? ` | Out: ${outMiles.toLocaleString()} mi` : ''}
              </div>
              {cleanRO.vehicle.licensePlate && <div className="text-black">Plate: {cleanRO.vehicle.licensePlate}</div>}
            </div>
          </div>

          {/* Itemized Lines */}
          <div className="space-y-3">
            <div className="font-black uppercase text-xs border-b border-black pb-1">
              Itemized Concern Lines & Services:
            </div>

            {concernsList.map((concern, idx) => {
              const lineNum = idx + 1;
              const payType: ConcernPayType = cleanRO.concernPayTypes?.[idx] || quote?.payType || 'CUSTOMER_PAY';
              const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lineNum);
              const lParts = partsItems.filter(p => (p.roLineNumber || 1) === lineNum);
              const lROParts = (cleanRO.parts || []).filter(p => (p.roLineNumber || 1) === lineNum);
              const effectiveParts = lParts.length > 0 ? lParts : lROParts.map(p => ({
                id: p.id,
                partNumber: p.partNumber,
                description: p.description,
                quantity: p.quantity,
                unitPrice: p.price,
                subtotal: (p.price || 0) * (p.quantity || 1),
                status: 'PENDING' as const,
                roLineNumber: lineNum
              }));

              const lineLaborCost = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.laborHours) || 0) * (Number(i.hourlyRate) || 165))), 0);
              const linePartsCost = effectiveParts.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0);
              const lineTotalCost = lineLaborCost + linePartsCost;
              const lineCause = cleanRO.concernCauses?.[idx] || (idx === 0 ? cleanRO.cause : '');
              const lineCorrection = cleanRO.concernCorrections?.[idx] || (idx === 0 ? cleanRO.correction : '');

              return (
                <div key={idx} className="border border-black p-2.5 space-y-2 quote-line-item">
                  <div className="flex justify-between items-center border-b border-black pb-1">
                    <div className="font-black text-xs">
                      Line {lineNum}: {concern} ({payType.replace(/_/g, ' ')})
                    </div>
                    <div className="font-mono font-black text-xs">
                      Line Total: ${lineTotalCost.toFixed(2)}
                    </div>
                  </div>

                  {(lineCause || lineCorrection) && (
                    <div className="text-[11px] font-mono space-y-0.5">
                      {lineCause && <div><strong>Cause:</strong> {lineCause}</div>}
                      {lineCorrection && <div><strong>Correction:</strong> {lineCorrection}</div>}
                    </div>
                  )}

                  {lLabor.length > 0 && (
                    <div className="text-[11px]">
                      <div className="font-bold underline mb-0.5">Labor:</div>
                      {lLabor.map((li, liIdx) => (
                        <div key={liIdx} className="flex justify-between pl-2">
                          <span>{li.description} ({(Number(li.laborHours) || 0).toFixed(1)} hrs @ ${li.hourlyRate}/hr)</span>
                          <span className="font-mono font-bold">${(Number(li.subtotal) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {effectiveParts.length > 0 && (
                    <div className="text-[11px]">
                      <div className="font-bold underline mb-0.5">Parts:</div>
                      {effectiveParts.map((pi, piIdx) => (
                        <div key={piIdx} className="flex justify-between pl-2">
                          <span>{pi.partNumber} - {pi.description} (Qty: {pi.quantity} @ ${pi.unitPrice}/ea)</span>
                          <span className="font-mono font-bold">${(Number(pi.subtotal) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financial Totals */}
          <div className="border-2 border-black p-3 quote-summary-block space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Labor Cost ({totalLaborHours.toFixed(1)} hrs):</span>
              <strong className="font-mono">${totalLaborCost.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span>Total Parts & Materials:</span>
              <strong className="font-mono">${totalPartsCost.toFixed(2)}</strong>
            </div>
            {shopSuppliesFee > 0 && (
              <div className="flex justify-between text-xs">
                <span>Shop Supplies & Environmental Fee:</span>
                <strong className="font-mono">${shopSuppliesFee.toFixed(2)}</strong>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span>Sales Tax ({taxRatePercent}%):</span>
              <strong className="font-mono">{isTaxExempt ? '$0.00 (Exempt)' : `$${taxAmount.toFixed(2)}`}</strong>
            </div>
            <div className="border-t-2 border-black pt-1 flex justify-between items-center text-sm font-black">
              <span>ESTIMATED GRAND TOTAL:</span>
              <span className="font-mono">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Signature & Terms */}
          <div className="pt-3 border-t-2 border-black text-[10px] space-y-3">
            <div>
              I authorize the repair work and parts specified above. I acknowledge that the dealership is not responsible for loss or damage to vehicle or articles left in vehicle.
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-black pt-1">
                <strong>Customer Signature:</strong> {quote?.status === 'APPROVED' ? `AUTHORIZED (${quote.approvedBy || cleanRO.customerName})` : ''}
              </div>
              <div className="border-t border-black pt-1">
                <strong>Date & Time:</strong> {formatMilitaryDateTime(new Date())}
              </div>
            </div>
          </div>

        </div>,
        document.body
      )}
    </>
  );
};

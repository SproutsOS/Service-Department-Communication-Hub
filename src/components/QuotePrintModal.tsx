import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Calculator, 
  Wrench, 
  Package, 
  Edit3, 
  MapPin, 
  Phone,
  Download,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConcernPayType } from '../types';
import { formatMilitaryDate, formatMilitaryDateTime, cleanRO3700 } from '../utils/formatters';
import { printIsolatedDocument, downloadPrintableDocument } from '../utils/printUtils';

const DEALERSHIP_ADDRESS = '2100 HWY 49, SEMINARY, MS 39479';
const DEALERSHIP_PHONE = '601-765-2066';

export const QuotePrintModal: React.FC = () => {
  const { 
    activeQuotePrintRO: initialRO, 
    closeQuotePrintModal, 
    openQuoteModal,
    shopName, 
    repairOrders 
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [printStatusMsg, setPrintStatusMsg] = useState<string | null>(null);
  const [isPaperMode, setIsPaperMode] = useState(false);

  // Live RO and clean data
  const liveRO = useMemo(() => {
    if (!initialRO) return null;
    const cleanId = (initialRO.id || '').trim();
    const cleanDigits = cleanId.replace(/\D/g, '');
    const found = repairOrders.find(r => 
      r.id === cleanId || 
      r.id.toLowerCase() === cleanId.toLowerCase() || 
      (cleanDigits && r.id.replace(/\D/g, '') === cleanDigits)
    );
    return found || initialRO;
  }, [initialRO, repairOrders]);

  const cleanRO = useMemo(() => {
    return liveRO ? cleanRO3700(liveRO) : null;
  }, [liveRO]);

  // Safe fallback vehicle
  const vehicle = useMemo(() => {
    return {
      year: cleanRO?.vehicle?.year || new Date().getFullYear(),
      make: cleanRO?.vehicle?.make || 'Vehicle',
      model: cleanRO?.vehicle?.model || '',
      vin: cleanRO?.vehicle?.vin || 'VIN ON FILE',
      mileage: Number(cleanRO?.vehicle?.mileage) || 0,
      licensePlate: cleanRO?.vehicle?.licensePlate || '',
      outMileage: cleanRO?.vehicle?.outMileage
    };
  }, [cleanRO]);

  // Reliable direct document print
  const handlePrint = useCallback(() => {
    if (!cleanRO) return;
    const roNumber = cleanRO.id || '';
    const vehicleDesc = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    const title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    
    try {
      const printed = printIsolatedDocument('printable-quote-document', title);
      if (printed) {
        setPrintStatusMsg('Print dialog opened. If your browser preview blocks print popups, use "Download Document" to print directly.');
      } else {
        setPrintStatusMsg('Direct print command issued. You can also click "Download Document" to save & print instantly.');
      }
      setTimeout(() => setPrintStatusMsg(null), 6000);
    } catch (err) {
      console.warn('Direct print error:', err);
      setPrintStatusMsg('Direct browser printing restricted. Click "Download Document" to print immediately.');
    }
  }, [cleanRO, vehicle]);

  // Download standalone HTML with instant auto-print script
  const handleDownload = useCallback(() => {
    if (!cleanRO) return;
    const roNumber = cleanRO.id || '';
    const vehicleDesc = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim();
    const title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    const filename = `Repair-Estimate-RO-${roNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    
    const success = downloadPrintableDocument('printable-quote-document', filename, title);
    if (success) {
      setDownloaded(true);
      setPrintStatusMsg('Document downloaded! Opening the downloaded file will immediately launch your printer dialog.');
      setTimeout(() => setDownloaded(false), 2500);
      setTimeout(() => setPrintStatusMsg(null), 6000);
    }
  }, [cleanRO, vehicle]);

  // Close on Escape key or trigger Print on Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuotePrintModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        // Allow native print or handlePrint
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeQuotePrintModal, handlePrint]);

  if (!cleanRO) return null;

  const quote = cleanRO.quote;

  const inMiles = Number(vehicle.mileage ?? (cleanRO as any).inMileage) || 0;
  const outMilesRaw = cleanRO.outMileage ?? vehicle.outMileage;
  const outMiles = outMilesRaw !== undefined && outMilesRaw !== null ? Number(outMilesRaw) : undefined;
  const testDriveDistance = outMiles !== undefined && inMiles > 0 ? Math.max(0, outMiles - inMiles) : undefined;

  const rawConcerns = (cleanRO.concerns && cleanRO.concerns.length > 0)
    ? cleanRO.concerns.filter(Boolean)
    : (cleanRO.primaryConcern ? [cleanRO.primaryConcern] : ['Customer reported vehicle inspection / service concern']);

  const baseConcerns = rawConcerns.length > 0 ? rawConcerns : ['Customer reported vehicle inspection / service concern'];
  const recommendations = (cleanRO.recommendations || []).filter(Boolean);

  const unifiedLines = [
    ...baseConcerns.map((concern, idx) => ({
      lineNum: idx + 1,
      title: concern || `Customer Concern #${idx + 1}`,
      isInspection: false,
      payType: ((cleanRO.concernPayTypes && cleanRO.concernPayTypes[idx]) || quote?.payType || 'CUSTOMER_PAY') as ConcernPayType,
      cause: (cleanRO.concernCauses && cleanRO.concernCauses[idx]) || (idx === 0 ? cleanRO.cause : '') || '',
      correction: (cleanRO.concernCorrections && cleanRO.concernCorrections[idx]) || (idx === 0 ? cleanRO.correction : '') || '',
    })),
    ...recommendations.map((rec, rIdx) => {
      const lineNum = baseConcerns.length + rIdx + 1;
      return {
        lineNum,
        title: rec.serviceName || `Recommended Service #${rIdx + 1}`,
        isInspection: true,
        payType: (rec.payType || (cleanRO.concernPayTypes && cleanRO.concernPayTypes[lineNum - 1]) || quote?.payType || 'CUSTOMER_PAY') as ConcernPayType,
        cause: rec.cause || (cleanRO.concernCauses && cleanRO.concernCauses[lineNum - 1]) || '',
        correction: rec.correction || (cleanRO.concernCorrections && cleanRO.concernCorrections[lineNum - 1]) || `Perform ${rec.serviceName || 'service'}`,
      };
    })
  ];

  const laborItems = (quote?.laborItems || []).filter(Boolean);
  const partsItems = (quote?.partsItems || []).filter(Boolean);

  // Financial calculations with 100% safe numbers
  const totalLaborHours = Number(quote?.totalLaborHours) || laborItems.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0);
  const totalLaborCost = Number(quote?.totalLaborCost) || laborItems.reduce((acc, item) => acc + (Number(item.subtotal) || ((Number(item.laborHours) || 0) * (Number(item.hourlyRate) || 165))), 0);
  
  const totalPartsCost = Number(quote?.totalPartsCost) || (
    partsItems.length > 0
      ? partsItems.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0)
      : (cleanRO.parts || []).reduce((acc, p) => acc + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0)
  );

  const shopSuppliesFee = quote?.applyShopSupplies ? Math.min(35.00, Number(quote?.shopSuppliesFee) || 25.00) : 0;
  const isTaxExempt = Boolean(cleanRO.isTaxExempt || quote?.isTaxExempt);
  const taxRatePercent = isTaxExempt ? 0 : (Number((quote as any)?.taxRatePercent) || (quote?.taxRate !== undefined ? Number((quote.taxRate * 100).toFixed(2)) : 7.0));
  const taxableAmount = totalLaborCost + totalPartsCost + shopSuppliesFee;
  // Sales tax is never capped at $35; only shop supplies is capped at $35
  const taxAmount = isTaxExempt ? 0 : Number((taxableAmount * (taxRatePercent / 100)).toFixed(2));
  const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

  // Helper to extract line parts with ETA
  const getLineEffectiveParts = useCallback((lineNum: number) => {
    const lParts = partsItems.filter(p => (p.roLineNumber || 1) === lineNum);
    const lROParts = (cleanRO.parts || []).filter(p => (p.roLineNumber || 1) === lineNum);

    const seenPartIds = new Set<string>();
    const result: Array<{
      id: string;
      partNumber: string;
      description: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      status: string;
      roLineNumber: number;
      estimatedArrival: string;
    }> = [];

    // 1. Process quote parts
    lParts.forEach(qp => {
      seenPartIds.add(qp.id);
      if (qp.sourcePartId) seenPartIds.add(qp.sourcePartId);
      const matchedRO = lROParts.find(rp => 
        rp.id === qp.sourcePartId || 
        rp.id === qp.id || 
        (qp.partNumber && qp.partNumber !== 'TBD' && rp.partNumber && rp.partNumber.trim().toUpperCase() === qp.partNumber.trim().toUpperCase()) ||
        (qp.description && rp.description && rp.description.trim().toLowerCase() === qp.description.trim().toLowerCase())
      );
      
      let eta = (qp as any).estimatedArrival || matchedRO?.estimatedArrival;
      if (!eta || eta === 'Pending Parts Counter') {
        const status = matchedRO?.status || qp.status;
        if (status === 'RECEIVED' || status === 'IN_STOCK' || status === 'ISSUED_TO_TECH') {
          eta = 'In Stock / Arrived';
        } else if (status === 'DAILY_ORDER') {
          eta = 'Today 2:00 PM';
        } else if (status === 'SPECIAL_ORDER_1_5_DAYS') {
          eta = '1-5 Business Days';
        } else if (status === 'VOR_UPGRADE') {
          eta = 'Tomorrow Morning (VOR)';
        } else if (status === 'ORDERED' || status === 'IN_TRANSIT') {
          eta = 'Ordered (In Transit)';
        } else if (status === 'BACKORDERED') {
          eta = 'Backordered';
        } else {
          eta = matchedRO?.estimatedArrival || 'Pending Parts Counter';
        }
      }

      result.push({
        id: qp.id,
        partNumber: qp.partNumber || 'TBD',
        description: qp.description || 'Part Item',
        quantity: qp.quantity || 1,
        unitPrice: Number(qp.unitPrice) || 0,
        subtotal: Number(qp.subtotal) || ((Number(qp.unitPrice) || 0) * (qp.quantity || 1)),
        status: qp.status || 'PENDING',
        roLineNumber: lineNum,
        estimatedArrival: eta,
      });
    });

    // 2. Add RO parts not already covered in quote parts
    lROParts.forEach(rp => {
      if (!seenPartIds.has(rp.id)) {
        seenPartIds.add(rp.id);
        let eta = rp.estimatedArrival;
        if (!eta || eta === 'Pending Parts Counter') {
          if (rp.status === 'RECEIVED' || rp.status === 'IN_STOCK' || rp.status === 'ISSUED_TO_TECH') {
            eta = 'In Stock / Arrived';
          } else if (rp.status === 'DAILY_ORDER') {
            eta = 'Today 2:00 PM';
          } else if (rp.status === 'SPECIAL_ORDER_1_5_DAYS') {
            eta = '1-5 Business Days';
          } else if (rp.status === 'VOR_UPGRADE') {
            eta = 'Tomorrow Morning (VOR)';
          } else if (rp.status === 'ORDERED' || rp.status === 'IN_TRANSIT') {
            eta = 'Ordered (In Transit)';
          } else if (rp.status === 'BACKORDERED') {
            eta = 'Backordered';
          } else {
            eta = 'Pending Parts Counter';
          }
        }

        result.push({
          id: rp.id,
          partNumber: rp.partNumber || 'TBD',
          description: rp.description || 'Part Item',
          quantity: rp.quantity || 1,
          unitPrice: Number(rp.price) || 0,
          subtotal: (Number(rp.price) || 0) * (rp.quantity || 1),
          status: rp.status || 'PENDING',
          roLineNumber: lineNum,
          estimatedArrival: eta,
        });
      }
    });

    return result;
  }, [partsItems, cleanRO.parts]);

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
      `Customer: ${cleanRO.customerName || 'Customer'} | Phone: ${cleanRO.customerPhone || 'N/A'}`,
      `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      `VIN: ${vehicle.vin || 'VIN ON FILE'}`,
      `Mileage In: ${inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}`,
      `Service Advisor: ${cleanRO.advisorName || 'Advisor'} | Tech: ${cleanRO.techName || 'Unassigned'}`,
      `------------------------------------------------------`,
      `LINE-BY-LINE ESTIMATE BREAKDOWN:`
    ];

    unifiedLines.forEach((line) => {
      const lNum = line.lineNum;
      const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lNum);
      const lParts = getLineEffectiveParts(lNum);
      const lLaborTotal = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0);
      const lPartsTotal = lParts.reduce((acc, p) => acc + (Number(p.subtotal) || 0), 0);

      lines.push(`\n[Line ${lNum}] ${line.isInspection ? 'Inspection Finding' : 'Concern'}: ${line.title}`);
      if (line.cause) lines.push(`  Cause: ${line.cause}`);
      if (line.correction) lines.push(`  Correction: ${line.correction}`);
      if (lLabor.length > 0) {
        lLabor.forEach(li => {
          lines.push(`  Labor: ${li.description} - ${li.laborHours} hrs @ $${li.hourlyRate || 165}/hr = $${(Number(li.subtotal) || 0).toFixed(2)}`);
        });
      }
      if (lParts.length > 0) {
        lParts.forEach(pi => {
          lines.push(`  Part: ${pi.partNumber} - ${pi.description} (Qty: ${pi.quantity}) [ETA: ${pi.estimatedArrival}] @ $${pi.unitPrice.toFixed(2)}/ea = $${(Number(pi.subtotal) || 0).toFixed(2)}`);
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
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-2 sm:p-6 overflow-y-auto no-print"
        role="dialog"
        aria-modal="true"
      >
        <div className={`bg-white w-full ${isPaperMode ? 'max-w-5xl' : 'max-w-4xl'} rounded-2xl shadow-2xl border-2 border-slate-700 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
          
          {/* Screen Header (Excluded from Print) */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b-2 border-slate-700 shrink-0 no-print flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-blue-600 rounded-lg text-white shadow-xs shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold tracking-tight truncate">Official Repair Estimate & Quote</h3>
                  <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 text-xs font-mono font-bold rounded border border-blue-400/40 shrink-0">
                    RO #{cleanRO.id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate hidden sm:block">
                  Itemized Parts, Labor Operations, Taxes, and Customer Authorization Record
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Paper View Toggle */}
              <button
                type="button"
                onClick={() => setIsPaperMode(!isPaperMode)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                title={isPaperMode ? "Exit clean paper layout" : "Switch to clean paper layout"}
              >
                {isPaperMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isPaperMode ? 'Standard' : 'Paper Mode'}</span>
              </button>

              {/* Copy Summary */}
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Copy formatted text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Edit Quote button */}
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
                <span className="hidden sm:inline">Edit</span>
              </button>

              {/* Download Printable HTML (100% Reliable Fallback) */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                title="Save and download clean printable HTML file (auto-prints on opening)"
              >
                {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloaded ? 'Saved' : 'Download Document'}</span>
              </button>

              {/* Main Print Button */}
              <button
                type="button"
                id="quote-print-modal-trigger-btn"
                onClick={handlePrint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0 ring-2 ring-blue-400/30"
                title="Print document via system print dialog (Ctrl+P)"
              >
                <Printer className="w-4 h-4" />
                <span>Print Quote</span>
              </button>

              {/* Close Button */}
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

          {/* Print Status Notification */}
          {printStatusMsg && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 text-xs font-semibold text-blue-900 flex items-center justify-between no-print animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{printStatusMsg}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded cursor-pointer"
                >
                  Download HTML
                </button>
                <button 
                  type="button" 
                  onClick={() => setPrintStatusMsg(null)}
                  className="text-blue-500 hover:text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Screen Preview Paper Container */}
          <div className={`flex-1 overflow-y-auto ${isPaperMode ? 'p-2 sm:p-4 bg-slate-200' : 'p-3 sm:p-6 bg-slate-100'}`}>
            
            <div className={`bg-white p-6 sm:p-8 rounded-xl border-2 border-slate-300 shadow-md ${isPaperMode ? 'max-w-4xl' : 'max-w-3xl'} mx-auto space-y-6 text-slate-900`}>
              
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
                  <span className="font-bold text-slate-900 block">{cleanRO.customerName || 'Customer'}</span>
                  <span className="text-slate-600 block text-[11px]">{cleanRO.customerPhone || 'N/A'}</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle</span>
                  <span className="font-bold text-slate-900 block">
                    {vehicle.year} {vehicle.make} {vehicle.model}
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
                    {vehicle.vin || 'VIN ON FILE'}
                  </span>
                  {vehicle.licensePlate && (
                    <span className="text-slate-600 block text-[11px] mt-0.5">
                      Plate: {vehicle.licensePlate}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Service Team</span>
                  <span className="font-medium text-slate-800 block">
                    Advisor: <strong className="font-bold">{cleanRO.advisorName || 'Advisor'}</strong>
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
                  <span className="text-[10px] text-slate-500 font-bold">{unifiedLines.length} Line(s) Total</span>
                </div>

                {unifiedLines.map((line) => {
                  const lineNum = line.lineNum;
                  const payType: string = line.payType || 'CUSTOMER_PAY';
                  const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lineNum);
                  const effectiveParts = getLineEffectiveParts(lineNum);

                  const lineLaborCost = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.laborHours) || 0) * (Number(i.hourlyRate) || 165))), 0);
                  const linePartsCost = effectiveParts.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0);
                  const lineTotalCost = lineLaborCost + linePartsCost;

                  const lineCause = line.cause;
                  const lineCorrection = line.correction;

                  return (
                    <div key={lineNum} className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50/50">
                      
                      {/* Line Header */}
                      <div className="bg-slate-100 p-2.5 border-b border-slate-300 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                            Line {lineNum}
                          </span>
                          {line.isInspection && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-red-100 text-red-900 rounded border border-red-200">
                              Inspection Finding
                            </span>
                          )}
                          <span className="font-bold text-slate-900 text-sm">
                            {line.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-900 rounded border border-blue-200">
                            {String(payType).replace(/_/g, ' ')}
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
                          <div style={{ fontSize: '101.5%' }}>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1" style={{ fontSize: '101.5%' }}>
                              <Wrench className="w-3 h-3 text-blue-600" />
                              <span>Labor Operations:</span>
                            </span>
                            <table className="w-full text-[11px] border border-slate-200 rounded overflow-hidden" style={{ fontSize: '101.5%' }}>
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
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Package className="w-3 h-3 text-amber-600" />
                              <span>Required Parts & Materials:</span>
                            </span>
                            <table className="w-full text-[11px] border border-slate-200 rounded overflow-hidden">
                              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                                <tr>
                                  <th className="p-1.5 w-24">Part #</th>
                                  <th className="p-1.5">Description</th>
                                  <th className="p-1.5 w-36">ETA / Availability</th>
                                  <th className="p-1.5 text-center w-14">Qty</th>
                                  <th className="p-1.5 text-right w-20">Unit Price</th>
                                  <th className="p-1.5 text-right w-20">Subtotal</th>
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
                                      <td className="p-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                                          <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                                          <span className="truncate">{part.estimatedArrival || 'Pending Parts Counter'}</span>
                                        </span>
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
                  <span className="font-mono text-[11px] font-bold text-slate-600" style={{ fontSize: '101.5%' }}>Total Labor: {totalLaborHours.toFixed(1)} hrs</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex justify-between" style={{ fontSize: '101.5%' }}>
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
                  <div className="border-t-2 border-slate-400 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Signature</span>
                    <span className="font-medium text-slate-900 text-xs">
                      {quote?.status === 'APPROVED' ? `AUTHORIZED (${quote.approvedBy || cleanRO.customerName})` : 'X ___________________________________'}
                    </span>
                  </div>

                  <div className="border-t-2 border-slate-400 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Authorization Date</span>
                    <span className="font-medium text-slate-900 text-xs font-mono">
                      {quote?.approvedAt ? formatMilitaryDate(quote.approvedAt) : formatMilitaryDate(new Date())}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Modal Footer (Excluded from Print) */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-700 shrink-0 no-print">
            <div className="text-xs text-slate-400">
              Dealership: <strong className="text-slate-200">{shopName || 'Woolwine CDJR'}</strong> • {DEALERSHIP_ADDRESS} • Phone: {DEALERSHIP_PHONE} • RO #{cleanRO.id}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={closeQuotePrintModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-600"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download HTML File</span>
              </button>
              
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer ring-2 ring-blue-400/40"
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
                  OFFICIAL REPAIR ESTIMATE & QUOTE
                </div>
                <div className="text-xs text-black mt-1">
                  {DEALERSHIP_ADDRESS} • Phone: <strong>{DEALERSHIP_PHONE}</strong>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-black font-mono border-2 border-black px-2.5 py-0.5 inline-block">
                  RO #{cleanRO.id}
                </div>
                <div className="text-xs font-mono font-bold mt-1">
                  Date: {cleanRO.createdAt ? formatMilitaryDate(cleanRO.createdAt) : formatMilitaryDate(new Date())}
                </div>
                <div className="text-xs font-bold uppercase mt-0.5">
                  Status: {quote?.status || 'ESTIMATE DRAFT'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Grid */}
          <div className="grid grid-cols-2 gap-4 border-2 border-black p-3 text-xs">
            <div>
              <div className="text-[10px] font-black uppercase text-black">Customer Details:</div>
              <div className="font-black text-sm text-black">{cleanRO.customerName || 'Customer'}</div>
              <div className="text-black font-bold">Phone: {cleanRO.customerPhone || 'N/A'}</div>
              <div className="text-black mt-1">Service Advisor: <strong>{cleanRO.advisorName || 'Advisor'}</strong></div>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase text-black">Vehicle Details:</div>
              <div className="font-black text-sm text-black">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              <div className="font-mono font-bold text-black">VIN: {vehicle.vin || 'VIN ON FILE'}</div>
              <div className="text-black font-bold">
                Mileage In: {inMiles > 0 ? `${inMiles.toLocaleString()} mi` : 'N/A'}
                {outMiles !== undefined ? ` | Out: ${outMiles.toLocaleString()} mi` : ''}
              </div>
              {vehicle.licensePlate && <div className="text-black">Plate: {vehicle.licensePlate}</div>}
            </div>
          </div>

          {/* Itemized Lines */}
          <div className="space-y-3">
            <div className="font-black uppercase text-xs border-b border-black pb-1">
              Itemized Concern Lines & Services:
            </div>

            {unifiedLines.map((line) => {
              const lineNum = line.lineNum;
              const payType: string = line.payType || 'CUSTOMER_PAY';
              const lLabor = laborItems.filter(item => (item.roLineNumber || 1) === lineNum);
              const effectiveParts = getLineEffectiveParts(lineNum);

              const lineLaborCost = lLabor.reduce((acc, i) => acc + (Number(i.subtotal) || ((Number(i.laborHours) || 0) * (Number(i.hourlyRate) || 165))), 0);
              const linePartsCost = effectiveParts.reduce((acc, p) => acc + (Number(p.subtotal) || ((Number(p.unitPrice) || 0) * (Number(p.quantity) || 1))), 0);
              const lineTotalCost = lineLaborCost + linePartsCost;
              const lineCause = line.cause;
              const lineCorrection = line.correction;

              return (
                <div key={lineNum} className="border border-black p-2.5 space-y-2 quote-line-item">
                  <div className="flex justify-between items-center border-b border-black pb-1">
                    <div className="font-black text-xs">
                      Line {lineNum}: {line.title} {line.isInspection ? '[Inspection Finding]' : ''} ({String(payType).replace(/_/g, ' ')})
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
                    <div className="text-[11px]" style={{ fontSize: '101.5%' }}>
                      <div className="font-bold underline mb-0.5">Labor:</div>
                      {lLabor.map((li, liIdx) => (
                        <div key={liIdx} className="flex justify-between pl-2">
                          <span>{li.description} ({(Number(li.laborHours) || 0).toFixed(1)} hrs @ ${li.hourlyRate || 165}/hr)</span>
                          <span className="font-mono font-bold">${(Number(li.subtotal) || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {effectiveParts.length > 0 && (
                    <div className="text-[11px] space-y-1">
                      <div className="font-bold underline mb-0.5">Parts & Materials:</div>
                      <table className="w-full text-left text-[11px] border border-black border-collapse">
                        <thead className="bg-gray-100 border-b border-black">
                          <tr>
                            <th className="p-1 font-bold">Part #</th>
                            <th className="p-1 font-bold">Description</th>
                            <th className="p-1 font-bold">ETA / Availability</th>
                            <th className="p-1 text-center font-bold">Qty</th>
                            <th className="p-1 text-right font-bold">Unit Price</th>
                            <th className="p-1 text-right font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                          {effectiveParts.map((pi, piIdx) => (
                            <tr key={piIdx}>
                              <td className="p-1 font-mono font-bold">{pi.partNumber}</td>
                              <td className="p-1">{pi.description}</td>
                              <td className="p-1 font-mono text-[10px] font-bold">
                                {pi.estimatedArrival || 'Pending Parts Counter'}
                              </td>
                              <td className="p-1 text-center font-mono">{pi.quantity}</td>
                              <td className="p-1 text-right font-mono">${(Number(pi.unitPrice) || 0).toFixed(2)}</td>
                              <td className="p-1 text-right font-mono font-bold">${(Number(pi.subtotal) || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Financial Totals */}
          <div className="border-2 border-black p-3 quote-summary-block space-y-1">
            <div className="flex justify-between text-xs" style={{ fontSize: '101.5%' }}>
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

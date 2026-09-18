import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Wrench, 
  DollarSign, 
  Clock, 
  Printer, 
  Send, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Package, 
  FileText,
  AlertCircle,
  Calculator,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairQuote, LaborLineItem, QuotePartItem, QuoteStatus } from '../types';

const COMMON_LABOR_PRESETS = [
  { name: 'Diagnostic Scan & Pinpoint Testing', hours: 1.0, notes: 'Includes scan tool live data & diagnostic tree' },
  { name: 'Front Brake Pads & Rotors Replacement', hours: 1.8, notes: 'Replace pads, rotors, clean & lube slide pins' },
  { name: 'Rear Brake Pads & Rotors Replacement', hours: 1.6, notes: 'Replace pads, rotors, caliper reset' },
  { name: 'Oil & Filter Service + Multi-Point Inspection', hours: 0.5, notes: 'Full synthetic oil, OEM filter & digital inspection' },
  { name: 'Alternator / Charging System Replacement', hours: 2.0, notes: 'Remove & replace alternator, test output voltage' },
  { name: 'Water Pump & Cooling System Service', hours: 2.5, notes: 'Replace pump, vacuum fill coolant & pressure test' },
  { name: 'Spark Plugs Replacement (4-Cyl / Inline)', hours: 1.2, notes: 'Replace plugs to OEM torque specs & inspect coils' },
  { name: 'Spark Plugs Replacement (V6 / Transverse)', hours: 2.5, notes: 'Includes upper intake plenum removal & new gaskets' },
  { name: 'Four-Wheel Alignment & Steering Center', hours: 1.2, notes: 'Full computer alignment check & toe/camber adjust' },
  { name: 'Air Conditioning System Evacuate & Recharge', hours: 1.4, notes: 'Recover refrigerant, vacuum leak check, oil & dye fill' },
];

export const RepairQuoteModal: React.FC = () => {
  const { 
    activeQuoteRO, 
    closeQuoteModal, 
    saveRepairQuote, 
    updateQuoteStatus, 
    currentUser,
    shopName
  } = useApp();

  const [copiedVin, setCopiedVin] = useState(false);
  const [copiedVehicleInfo, setCopiedVehicleInfo] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quote Form State
  const [defaultRate, setDefaultRate] = useState<number>(150);
  const [laborItems, setLaborItems] = useState<LaborLineItem[]>([]);
  const [partsItems, setPartsItems] = useState<QuotePartItem[]>([]);
  const [applyShopSupplies, setApplyShopSupplies] = useState<boolean>(true);
  const [shopSuppliesFee, setShopSuppliesFee] = useState<number>(25);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(7.0);
  const [isTaxExempt, setIsTaxExempt] = useState<boolean>(false);
  const [taxExemptNumber, setTaxExemptNumber] = useState<string>('');
  const [techNotes, setTechNotes] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclinePrompt, setShowDeclinePrompt] = useState<boolean>(false);

  // Auto-Save System State & Tracking
  const [quoteAutoSaveStatus, setQuoteAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [quoteLastSavedTime, setQuoteLastSavedTime] = useState<string | null>(null);
  const quoteAutoSaveTimerRef = React.useRef<any>(null);
  const hasInitializedRef = React.useRef(false);
  const activeQuoteRORef = React.useRef(activeQuoteRO);

  useEffect(() => {
    activeQuoteRORef.current = activeQuoteRO;
  }, [activeQuoteRO]);

  const latestQuoteValuesRef = React.useRef({
    laborItems,
    partsItems,
    defaultRate,
    applyShopSupplies,
    shopSuppliesFee,
    taxRatePercent,
    isTaxExempt,
    taxExemptNumber,
    techNotes,
  });

  useEffect(() => {
    latestQuoteValuesRef.current = {
      laborItems,
      partsItems,
      defaultRate,
      applyShopSupplies,
      shopSuppliesFee,
      taxRatePercent,
      isTaxExempt,
      taxExemptNumber,
      techNotes,
    };
  }, [laborItems, partsItems, defaultRate, applyShopSupplies, shopSuppliesFee, taxRatePercent, isTaxExempt, taxExemptNumber, techNotes]);

  // Flush pending quote auto-save immediately to storage
  const flushQuoteAutoSave = () => {
    if (quoteAutoSaveTimerRef.current) {
      clearTimeout(quoteAutoSaveTimerRef.current);
      quoteAutoSaveTimerRef.current = null;
    }
    const currentRO = activeQuoteRORef.current;
    if (!currentRO || !hasInitializedRef.current) return;

    const {
      laborItems: curLabor,
      partsItems: curParts,
      defaultRate: curRate,
      applyShopSupplies: curApplySupplies,
      shopSuppliesFee: curSuppliesFee,
      taxRatePercent: curTaxPercent,
      isTaxExempt: curIsExempt,
      taxExemptNumber: curExemptNum,
      techNotes: curTechNotes,
    } = latestQuoteValuesRef.current;

    // Only auto-save if there is something meaningful in the quote
    if (curLabor.length === 0 && curParts.length === 0 && !curTechNotes.trim()) return;

    const curLaborHours = Number(curLabor.reduce((acc, item) => acc + (Number(item.laborHours) || 0), 0).toFixed(2));
    const curLaborCost = Number(curLabor.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0).toFixed(2));
    const fivePercent = curLaborCost * 0.05;
    const curShopSupplies = !curApplySupplies ? 0 : Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 50) : curSuppliesFee).toFixed(2));
    const curPartsCost = Number(curParts.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0).toFixed(2));
    const curTax = curIsExempt ? 0 : Number((curPartsCost * ((curTaxPercent || 0) / 100)).toFixed(2));
    const curGrandTotal = Number((curLaborCost + curPartsCost + curShopSupplies + curTax).toFixed(2));

    const autoQuote: RepairQuote = {
      id: currentRO.quote?.id || `quote_${Date.now()}`,
      roId: currentRO.id,
      createdAt: currentRO.quote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiatedByTechId: currentRO.quote?.initiatedByTechId || currentUser.id,
      initiatedByTechName: currentRO.quote?.initiatedByTechName || currentUser.name,
      status: currentRO.quote?.status || 'DRAFT',
      laborItems: curLabor,
      partsItems: curParts,
      defaultLaborRate: curRate,
      shopSuppliesFee: curShopSupplies,
      taxRate: curIsExempt ? 0 : (curTaxPercent || 0) / 100,
      taxAmount: curTax,
      isTaxExempt: curIsExempt,
      taxExemptNumber: curExemptNum || undefined,
      totalLaborHours: curLaborHours,
      totalLaborCost: curLaborCost,
      totalPartsCost: curPartsCost,
      grandTotal: curGrandTotal,
      techNotes: curTechNotes.trim() || undefined,
      advisorNotes: currentRO.quote?.advisorNotes,
      submittedAt: currentRO.quote?.submittedAt,
      approvedAt: currentRO.quote?.approvedAt,
      approvedBy: currentRO.quote?.approvedBy,
      declinedAt: currentRO.quote?.declinedAt,
      declinedReason: currentRO.quote?.declinedReason,
    };

    saveRepairQuote(currentRO.id, autoQuote, false, { isAutoSave: true });
    setQuoteAutoSaveStatus('saved');
    setQuoteLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const triggerQuoteAutoSave = () => {
    if (!activeQuoteRO || !hasInitializedRef.current) return;
    setQuoteAutoSaveStatus('saving');
    if (quoteAutoSaveTimerRef.current) {
      clearTimeout(quoteAutoSaveTimerRef.current);
    }
    quoteAutoSaveTimerRef.current = setTimeout(() => {
      flushQuoteAutoSave();
    }, 750);
  };

  // Safe close that flushes auto-save before closing
  const handleCloseModal = () => {
    flushQuoteAutoSave();
    closeQuoteModal();
  };

  // Clean up timer on unmount and flush any pending auto-save
  useEffect(() => {
    return () => {
      if (quoteAutoSaveTimerRef.current) {
        clearTimeout(quoteAutoSaveTimerRef.current);
      }
    };
  }, []);

  // Initialize quote from active RO or defaults
  useEffect(() => {
    if (!activeQuoteRO) return;
    hasInitializedRef.current = false;

    const isExemptCustomer = Boolean(activeQuoteRO.isTaxExempt || activeQuoteRO.quote?.isTaxExempt);
    setIsTaxExempt(isExemptCustomer);
    setTaxExemptNumber(activeQuoteRO.taxExemptNumber || activeQuoteRO.quote?.taxExemptNumber || '');

    if (activeQuoteRO.quote) {
      const q = activeQuoteRO.quote;
      setDefaultRate(q.defaultLaborRate || 150);
      setLaborItems(q.laborItems || []);
      setPartsItems(q.partsItems || []);
      setApplyShopSupplies((q.shopSuppliesFee || 0) > 0);
      setShopSuppliesFee(q.shopSuppliesFee || 0);
      setTaxRatePercent(isExemptCustomer ? 0 : (q.taxRate !== undefined ? q.taxRate * 100 : 7.0));
      setTechNotes(q.techNotes || '');
    } else {
      // Tech is initiating a brand new quote
      const initialRate = 150;
      setDefaultRate(initialRate);

      // Pre-populate first labor item from primary concern if available
      const initialLabor: LaborLineItem[] = [];
      if (activeQuoteRO.primaryConcern) {
        initialLabor.push({
          id: `labor_${Date.now()}_1`,
          description: `Diagnose & Repair: ${activeQuoteRO.primaryConcern}`,
          laborHours: 1.0,
          hourlyRate: initialRate,
          subtotal: initialRate * 1.0,
          techNotes: activeQuoteRO.cause ? `Diagnosis finding: ${activeQuoteRO.cause}` : undefined,
        });
      } else {
        initialLabor.push({
          id: `labor_${Date.now()}_1`,
          description: 'Primary Diagnostic & Repair Labor',
          laborHours: 1.0,
          hourlyRate: initialRate,
          subtotal: initialRate * 1.0,
        });
      }
      setLaborItems(initialLabor);

      // Pre-populate parts from existing RO parts if any exist
      if (activeQuoteRO.parts && activeQuoteRO.parts.length > 0) {
        const initialParts: QuotePartItem[] = activeQuoteRO.parts.map(p => ({
          id: `qpart_${Date.now()}_${p.id}`,
          description: p.description || p.name,
          partNumber: p.partNumber,
          quantity: p.quantity || 1,
          unitPrice: p.price || 0,
          subtotal: (p.quantity || 1) * (p.price || 0),
          sourcePartId: p.id,
        }));
        setPartsItems(initialParts);
      } else {
        setPartsItems([]);
      }

      setApplyShopSupplies(true);
      setShopSuppliesFee(25);
      setTaxRatePercent(isExemptCustomer ? 0 : 7.0);
      setTechNotes(
        activeQuoteRO.cause && activeQuoteRO.correction
          ? `Technician Findings:\nCause: ${activeQuoteRO.cause}\nCorrection: ${activeQuoteRO.correction}`
          : ''
      );
    }
    setSaveSuccessMsg(null);
    setShowDeclinePrompt(false);
    // Mark initialized on next frame
    const timer = setTimeout(() => {
      hasInitializedRef.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [activeQuoteRO?.id]);

  // Handle Tax Exemption Toggle
  const handleToggleTaxExempt = () => {
    const nextExempt = !isTaxExempt;
    setIsTaxExempt(nextExempt);
    if (nextExempt) {
      setTaxRatePercent(0);
    } else {
      setTaxRatePercent(7.0);
    }
  };

  // Watch for any changes to form fields and trigger auto-save
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    triggerQuoteAutoSave();
  }, [laborItems, partsItems, defaultRate, applyShopSupplies, shopSuppliesFee, taxRatePercent, isTaxExempt, taxExemptNumber, techNotes]);

  // Calculations (must remain before any early return to obey React Rules of Hooks)
  const totalLaborHours = useMemo(() => {
    return Number(laborItems.reduce((acc, item) => acc + (Number(item?.laborHours) || 0), 0).toFixed(2));
  }, [laborItems]);

  const totalLaborCost = useMemo(() => {
    return Number(laborItems.reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2));
  }, [laborItems]);

  const calculatedShopSupplies = useMemo(() => {
    if (!applyShopSupplies) return 0;
    // 5% of labor cost capped at $45, or the manual amount
    const fivePercent = totalLaborCost * 0.05;
    return Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 50) : shopSuppliesFee).toFixed(2));
  }, [applyShopSupplies, totalLaborCost, shopSuppliesFee]);

  const totalPartsCost = useMemo(() => {
    return Number(partsItems.reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2));
  }, [partsItems]);

  const estimatedTaxAmount = useMemo(() => {
    if (isTaxExempt) return 0;
    const rate = (taxRatePercent || 0) / 100;
    // Sales tax applied to parts at 7% standard rate (or custom rate if adjusted)
    return Number((totalPartsCost * rate).toFixed(2));
  }, [totalPartsCost, taxRatePercent, isTaxExempt]);

  const grandTotal = useMemo(() => {
    return Number(((totalLaborCost || 0) + (totalPartsCost || 0) + (calculatedShopSupplies || 0) + (estimatedTaxAmount || 0)).toFixed(2));
  }, [totalLaborCost, totalPartsCost, calculatedShopSupplies, estimatedTaxAmount]);

  if (!activeQuoteRO) return null;

  const vehicle = activeQuoteRO.vehicle || {
    year: '',
    make: 'Vehicle',
    model: '',
    vin: '',
    engine: '',
    mileage: 0,
  };

  const quote = activeQuoteRO.quote;
  const quoteStatus: QuoteStatus = quote?.status || 'DRAFT';

  // Copy helper for ProDemand VIN lookup
  const handleCopyVin = () => {
    const vin = vehicle.vin;
    if (vin) {
      navigator.clipboard.writeText(vin);
      setCopiedVin(true);
      setTimeout(() => setCopiedVin(false), 2500);
    }
  };

  const handleCopyVehicleInfo = () => {
    const v = vehicle;
    const text = `${v.year || ''} ${v.make || ''} ${v.model || ''}${v.engine ? ` ${v.engine}` : ''}${v.vin ? ` (VIN: ${v.vin})` : ''}`.trim();
    navigator.clipboard.writeText(text);
    setCopiedVehicleInfo(true);
    setTimeout(() => setCopiedVehicleInfo(false), 2500);
  };

  // Labor line operations
  const handleAddLaborItem = (preset?: { name: string; hours: number; notes?: string }) => {
    const hours = preset ? preset.hours : 1.0;
    const rate = defaultRate;
    const newItem: LaborLineItem = {
      id: `labor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: preset ? preset.name : '',
      laborHours: hours,
      hourlyRate: rate,
      subtotal: Number((hours * rate).toFixed(2)),
      techNotes: preset?.notes,
    };
    setLaborItems(prev => [...prev, newItem]);
  };

  const handleUpdateLaborItem = (id: string, updates: Partial<LaborLineItem>) => {
    setLaborItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      const hours = Number(updated.laborHours) || 0;
      const rate = Number(updated.hourlyRate) || 0;
      updated.subtotal = Number((hours * rate).toFixed(2));
      return updated;
    }));
  };

  const handleRemoveLaborItem = (id: string) => {
    setLaborItems(prev => prev.filter(item => item.id !== id));
  };

  // Parts operations
  const handleAddPartItem = () => {
    const newItem: QuotePartItem = {
      id: `qpart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      partNumber: '',
      quantity: 1,
      unitPrice: 0,
      subtotal: 0,
    };
    setPartsItems(prev => [...prev, newItem]);
  };

  const handleUpdatePartItem = (id: string, updates: Partial<QuotePartItem>) => {
    setPartsItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      const qty = Number(updated.quantity) || 0;
      const price = Number(updated.unitPrice) || 0;
      updated.subtotal = Number((qty * price).toFixed(2));
      return updated;
    }));
  };

  const handleRemovePartItem = (id: string) => {
    setPartsItems(prev => prev.filter(item => item.id !== id));
  };

  // Quick import helpers
  const handleImportConcerns = () => {
    const concerns = activeQuoteRO.concerns && activeQuoteRO.concerns.length > 0 
      ? activeQuoteRO.concerns 
      : (activeQuoteRO.primaryConcern ? [activeQuoteRO.primaryConcern] : []);

    if (concerns.length === 0) return;

    const newLabor: LaborLineItem[] = concerns.map((concern, idx) => ({
      id: `labor_${Date.now()}_c_${idx}`,
      description: `Diagnose & Repair: ${concern}`,
      laborHours: 1.0,
      hourlyRate: defaultRate,
      subtotal: defaultRate * 1.0,
      techNotes: 'Imported from customer concern list',
    }));

    setLaborItems(prev => [...prev, ...newLabor]);
    setSaveSuccessMsg('Imported customer concerns as labor line items!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleImportCauseCorrection = () => {
    if (!activeQuoteRO.cause && !activeQuoteRO.correction) {
      alert('No Cause & Correction documented yet on this RO.');
      return;
    }
    const textToAdd = `[Tech Diagnostic Findings]\nCause: ${activeQuoteRO.cause || 'N/A'}\nCorrection Required: ${activeQuoteRO.correction || 'N/A'}`;
    setTechNotes(prev => prev ? `${prev}\n\n${textToAdd}` : textToAdd);
    setSaveSuccessMsg('Imported Cause & Correction into quote notes!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleImportROParts = () => {
    if (!activeQuoteRO.parts || activeQuoteRO.parts.length === 0) {
      alert('No parts currently logged in this Repair Order.');
      return;
    }
    const existingPartIds = new Set(partsItems.map(p => p.sourcePartId).filter(Boolean));
    const partsToAdd = activeQuoteRO.parts
      .filter(p => !existingPartIds.has(p.id))
      .map(p => ({
        id: `qpart_${Date.now()}_${p.id}`,
        description: p.description || p.name,
        partNumber: p.partNumber,
        quantity: p.quantity || 1,
        unitPrice: p.price || 0,
        subtotal: (p.quantity || 1) * (p.price || 0),
        sourcePartId: p.id,
      }));

    if (partsToAdd.length === 0) {
      alert('All parts from this RO are already included in the quote.');
      return;
    }

    setPartsItems(prev => [...prev, ...partsToAdd]);
    setSaveSuccessMsg(`Imported ${partsToAdd.length} part(s) from RO parts queue!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Save / Submit
  const handleSave = (submitToAdvisor: boolean = false) => {
    if (laborItems.length === 0 && partsItems.length === 0) {
      alert('Please add at least one labor operation or part to the repair quote.');
      return;
    }

    const newQuote: RepairQuote = {
      id: quote?.id || `quote_${Date.now()}`,
      roId: activeQuoteRO.id,
      createdAt: quote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiatedByTechId: quote?.initiatedByTechId || currentUser.id,
      initiatedByTechName: quote?.initiatedByTechName || currentUser.name,
      status: submitToAdvisor ? 'SUBMITTED' : (quote?.status || 'DRAFT'),
      laborItems,
      partsItems,
      defaultLaborRate: defaultRate,
      shopSuppliesFee: calculatedShopSupplies,
      isTaxExempt,
      taxExemptNumber: taxExemptNumber.trim() || undefined,
      taxRate: isTaxExempt ? 0 : (taxRatePercent || 0) / 100,
      taxAmount: isTaxExempt ? 0 : estimatedTaxAmount,
      totalLaborHours,
      totalLaborCost,
      totalPartsCost,
      grandTotal,
      techNotes: techNotes.trim() || undefined,
      advisorNotes: quote?.advisorNotes,
      submittedAt: submitToAdvisor ? new Date().toISOString() : quote?.submittedAt,
      approvedAt: quote?.approvedAt,
      approvedBy: quote?.approvedBy,
      declinedAt: quote?.declinedAt,
      declinedReason: quote?.declinedReason,
    };

    const success = saveRepairQuote(activeQuoteRO.id, newQuote, submitToAdvisor);
    if (success) {
      setSaveSuccessMsg(
        submitToAdvisor 
          ? 'Quote successfully submitted to Service Advisor for customer authorization!' 
          : 'Repair quote draft saved successfully.'
      );
      setTimeout(() => {
        setSaveSuccessMsg(null);
        if (submitToAdvisor) {
          closeQuoteModal();
        }
      }, 2000);
    }
  };

  // Advisor / Manager approval or decline
  const handleApproveQuote = () => {
    const formattedTotal = (Number(grandTotal) || 0).toFixed(2);
    if (window.confirm(`Authorize repair quote for ${activeQuoteRO.customerName} totaling $${formattedTotal}?`)) {
      updateQuoteStatus(activeQuoteRO.id, 'APPROVED');
      setSaveSuccessMsg('Quote authorized and repair order approved!');
      setTimeout(() => {
        setSaveSuccessMsg(null);
        closeQuoteModal();
      }, 1500);
    }
  };

  const handleConfirmDecline = () => {
    if (!declineReason.trim()) {
      alert('Please provide a reason why the customer declined the quote.');
      return;
    }
    updateQuoteStatus(activeQuoteRO.id, 'DECLINED', declineReason.trim());
    setSaveSuccessMsg('Quote marked as declined.');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      closeQuoteModal();
    }, 1500);
  };

  useEffect(() => {
    const handleBeforePrint = () => {
      const roNumber = activeQuoteRO?.id || '';
      const vehicleDesc = activeQuoteRO?.vehicle ? `${activeQuoteRO.vehicle.year} ${activeQuoteRO.vehicle.make} ${activeQuoteRO.vehicle.model}` : '';
      document.title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    };
    const handleAfterPrint = () => {
      document.title = 'Service Department & Repair Order Hub';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [activeQuoteRO?.id, activeQuoteRO?.vehicle]);

  const handlePrint = () => {
    const originalTitle = document.title;
    const roNumber = activeQuoteRO?.id || '';
    const vehicleDesc = activeQuoteRO?.vehicle ? `${activeQuoteRO.vehicle.year} ${activeQuoteRO.vehicle.make} ${activeQuoteRO.vehicle.model}` : '';
    document.title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const isAdvisorOrManager = currentUser.role === 'SERVICE_ADVISOR' || currentUser.role === 'SERVICE_MANAGER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto print:z-auto print:overflow-visible print:block">
      <div 
        id="repair-quote-modal-container"
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col no-print"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 print:bg-white print:text-black print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400 print:hidden">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-white print:text-black">
                  Repair Quote & Labor Estimate
                </h2>
                <span className="bg-slate-800 text-blue-400 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                  RO #{activeQuoteRO.id}
                </span>

                {/* Status Badge */}
                {quoteStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Customer Authorized ($ {grandTotal.toFixed(2)})
                  </span>
                )}
                {quoteStatus === 'DECLINED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <XCircle className="w-3.5 h-3.5" /> Declined
                  </span>
                )}
                {quoteStatus === 'SUBMITTED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Clock className="w-3.5 h-3.5" /> Submitted to Advisor (Awaiting Auth)
                  </span>
                )}
                {quoteStatus === 'DRAFT' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Wrench className="w-3.5 h-3.5" /> Tech Quote Draft
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2.5 flex-wrap">
                <span>Customer: <strong className="text-slate-200">{activeQuoteRO.customerName}</strong></span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleToggleTaxExempt}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                    isTaxExempt 
                      ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 hover:bg-emerald-600/40' 
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                  title={isTaxExempt ? "Customer is Tax Exempt (0% sales tax). Click to change to taxable." : "Click if customer is Tax Exempt (0% sales tax)"}
                >
                  <ShieldCheck className={`w-3.5 h-3.5 ${isTaxExempt ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{isTaxExempt ? 'Tax Exempt Customer (0% Tax)' : 'Tax Exempt? Click if exempt'}</span>
                </button>
                <span>•</span>
                <span>Vehicle: <strong className="text-slate-200">{vehicle.year} {vehicle.make} {vehicle.model}</strong></span>
                {vehicle.vin && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-300">VIN: {vehicle.vin}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Auto-Save Status Badge */}
            <div 
              id="quote-autosave-badge"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 select-none"
              title="All changes to labor operations, parts, and notes are automatically saved to the system"
            >
              {quoteAutoSaveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Auto-Saving...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {quoteLastSavedTime ? `Auto-Saved (${quoteLastSavedTime})` : 'Auto-Save Active'}
                  </span>
                </span>
              )}
            </div>

            <button
              id="print-quote-btn"
              onClick={handlePrint}
              title="Print official repair quote"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Quote</span>
            </button>
            <button
              id="close-quote-modal-btn"
              onClick={handleCloseModal}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close quote editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Alert / Feedback message */}
          {saveSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* ProDemand Integration Banner & Vehicle Decoder */}
          <div 
            id="prodemand-action-card"
            className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-blue-800/80 relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-300 text-[11px] font-bold rounded-full uppercase tracking-wider border border-blue-400/30">
                    OEM Labor Time Lookup
                  </span>
                  <span className="text-xs text-slate-300">Mitchell 1 Integration</span>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Look Up Flat-Rate Labor in ProDemand
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Open Mitchell 1 ProDemand to look up OEM flat-rate labor times, R&R procedures, service intervals, and repair specs for this vehicle.
                </p>
                {vehicle.vin && (
                  <div className="text-xs text-blue-200 font-mono flex items-center gap-2 pt-1">
                    <span>VIN: <strong>{vehicle.vin}</strong></span>
                    {vehicle.engine && <span>• Engine: <strong>{vehicle.engine}</strong></span>}
                  </div>
                )}
              </div>

              {/* Action Buttons for ProDemand */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
                {vehicle.vin && (
                  <button
                    id="copy-vin-for-prodemand-btn"
                    onClick={handleCopyVin}
                    className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                    title="Copy VIN to paste into ProDemand vehicle selector"
                  >
                    {copiedVin ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">VIN Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-blue-400" />
                        <span>Copy VIN</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  id="copy-vehicle-info-btn"
                  onClick={handleCopyVehicleInfo}
                  className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                  title="Copy full vehicle info (Year, Make, Model, VIN)"
                >
                  {copiedVehicleInfo ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Copy Vehicle Info</span>
                    </>
                  )}
                </button>

                {/* Primary Button to Link to Pro Demand */}
                <a
                  id="open-prodemand-link-btn"
                  href="https://www.prodemand.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950/40 border border-blue-400/50 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-blue-200" />
                  <span>Open ProDemand ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Import Tools */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs print:hidden">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Quick Import:
            </span>

            <button
              id="import-concerns-btn"
              onClick={handleImportConcerns}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg border border-slate-200 hover:border-blue-300 font-medium transition-colors cursor-pointer shadow-2xs"
            >
              + Import Customer Concerns
            </button>

            {activeQuoteRO.parts && activeQuoteRO.parts.length > 0 && (
              <button
                id="import-ro-parts-btn"
                onClick={handleImportROParts}
                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 hover:border-amber-300 font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Import RO Parts ({activeQuoteRO.parts.length})</span>
              </button>
            )}

            {(activeQuoteRO.cause || activeQuoteRO.correction) && (
              <button
                id="import-cause-correction-btn"
                onClick={handleImportCauseCorrection}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg border border-slate-200 hover:border-emerald-300 font-medium transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Import Cause & Correction</span>
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <label className="text-slate-600 font-medium">Shop Hourly Rate:</label>
              <div className="relative w-24">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={defaultRate}
                  onChange={(e) => {
                    const newRate = Number(e.target.value) || 0;
                    setDefaultRate(newRate);
                    // optionally update rate across existing items
                    setLaborItems(prev => prev.map(item => ({
                      ...item,
                      hourlyRate: newRate,
                      subtotal: Number(((Number(item.laborHours) || 0) * newRate).toFixed(2))
                    })));
                  }}
                  className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 1: Labor Operations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Labor Operations</h3>
                  <p className="text-xs text-slate-500">
                    OEM flat-rate hours from ProDemand or shop manual times
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Direct ProDemand link right in the labor section */}
                <a
                  href="https://www.prodemand.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-colors"
                  title="Open ProDemand to verify flat rate hours"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ProDemand Labor Times ↗</span>
                </a>

                <button
                  id="add-labor-line-btn"
                  onClick={() => handleAddLaborItem()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Labor Item</span>
                </button>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-600 print:hidden">
              <span className="font-bold text-slate-400 uppercase tracking-wider shrink-0 text-[10px]">Presets:</span>
              {COMMON_LABOR_PRESETS.slice(0, 5).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddLaborItem(preset)}
                  className="shrink-0 px-2.5 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-800 rounded-full border border-slate-200 hover:border-blue-300 font-medium transition-colors cursor-pointer"
                >
                  + {preset.name.split(' ')[0]} ({preset.hours}h)
                </button>
              ))}
            </div>

            {/* Labor Lines Table / Cards */}
            {laborItems.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">No labor operations added yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Add Labor Item", select a preset, or look up labor times in ProDemand.
                </p>
                <button
                  onClick={() => handleAddLaborItem()}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  + Add First Labor Item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {laborItems.map((item, index) => (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{index + 1}</span>

                      {/* Operation Description */}
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="e.g. Front Brake Pads & Rotors Replacement"
                          value={item.description}
                          onChange={(e) => handleUpdateLaborItem(item.id, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Labor Hours (ProDemand) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Hours:</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.laborHours}
                          onChange={(e) => handleUpdateLaborItem(item.id, { laborHours: Number(e.target.value) || 0 })}
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Hourly Rate */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Rate:</label>
                        <div className="relative w-22">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="5"
                            min="0"
                            value={item.hourlyRate}
                            onChange={(e) => handleUpdateLaborItem(item.id, { hourlyRate: Number(e.target.value) || 0 })}
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right w-24 shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Subtotal</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          ${(item.subtotal || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLaborItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors print:hidden cursor-pointer"
                        title="Delete labor item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Notes / ProDemand Operation code */}
                    <div className="flex items-center gap-3 pl-8">
                      <input
                        type="text"
                        placeholder="Optional labor notes or ProDemand op code (e.g. ProDemand Op #B-402, includes caliper lube)"
                        value={item.techNotes || ''}
                        onChange={(e) => handleUpdateLaborItem(item.id, { techNotes: e.target.value })}
                        className="w-full px-3 py-1 bg-white/70 border border-slate-200 rounded-md text-[11px] text-slate-600 placeholder:text-slate-400 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                ))}

                {/* Labor Subtotal Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs font-bold text-blue-900">
                  <div className="flex items-center gap-4">
                    <span>Total Operations: {laborItems.length}</span>
                    <span>Total Labor Hours: {totalLaborHours.toFixed(1)} hrs</span>
                  </div>
                  <div className="text-sm font-black font-mono">
                    Labor Total: ${totalLaborCost.toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Required Parts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Required Parts & Materials</h3>
                  <p className="text-xs text-slate-500">
                    OEM or aftermarket parts required to complete the repair
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="add-part-line-btn"
                  onClick={handleAddPartItem}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Part</span>
                </button>
              </div>
            </div>

            {partsItems.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Package className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600">No parts on quote yet (Labor only)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click "Add Part" or use "Import RO Parts" if parts have already been requested.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {partsItems.map((part, index) => (
                  <div
                    key={part.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">#{index + 1}</span>

                      {/* Part Description */}
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          placeholder="e.g. Front Ceramic Brake Pad Set"
                          value={part.description}
                          onChange={(e) => handleUpdatePartItem(part.id, { description: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Part Number */}
                      <div className="w-36 shrink-0">
                        <input
                          type="text"
                          placeholder="Part # (optional)"
                          value={part.partNumber || ''}
                          onChange={(e) => handleUpdatePartItem(part.id, { partNumber: e.target.value })}
                          className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => handleUpdatePartItem(part.id, { quantity: Number(e.target.value) || 1 })}
                          className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Price:</label>
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={part.unitPrice}
                            onChange={(e) => handleUpdatePartItem(part.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right w-24 shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Subtotal</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          ${(part.subtotal || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemovePartItem(part.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors print:hidden cursor-pointer"
                        title="Delete part item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Parts Subtotal Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/70 border border-amber-100 rounded-xl text-xs font-bold text-amber-900">
                  <span>Total Parts Items: {partsItems.length}</span>
                  <span className="text-sm font-black font-mono">
                    Parts Total: ${totalPartsCost.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Shop Supplies, Taxes & Grand Total Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left: Settings & Notes */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Supplies & Taxes
                </h4>

                {/* Shop Supplies Fee */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyShopSupplies}
                      onChange={(e) => setApplyShopSupplies(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Shop Supplies & Hazmat Fee (5% of labor)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    ${calculatedShopSupplies.toFixed(2)}
                  </span>
                </div>

                {/* Sales Tax */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-700">Sales Tax on Parts:</span>
                    {!isTaxExempt ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={taxRatePercent}
                          onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
                          className="w-16 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs text-center font-bold"
                          title="Standard 7% sales tax rate"
                        />
                        <span className="text-xs text-slate-500 font-bold">%</span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded border border-emerald-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        0% Tax Exempt
                      </span>
                    )}

                    {/* Tax Exempt Toggle Button */}
                    <button
                      type="button"
                      onClick={handleToggleTaxExempt}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer border ${
                        isTaxExempt 
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700' 
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-300 hover:border-emerald-300'
                      }`}
                      title={isTaxExempt ? "Customer is marked Tax Exempt. Click to remove exemption." : "Click if customer is Tax Exempt (0% sales tax)"}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{isTaxExempt ? 'Tax Exempt Active ✓' : 'Click if Tax Exempt'}</span>
                    </button>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isTaxExempt ? 'text-emerald-600' : 'text-slate-800'}`}>
                    ${estimatedTaxAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Technician Quote Remarks / Customer Explanation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Technician Notes & Scope Details
                  </h4>
                  <span className="text-[10px] text-slate-400">Visible to Advisor & Customer</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Explain findings, why parts are needed, warranty details (e.g. 12mo/12k mile warranty), or any secondary safety concerns observed during inspection..."
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Right: Financial Summary Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col justify-between space-y-5 print:bg-white print:text-black print:border-2 print:border-black">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:border-black">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider print:text-black">
                    Official Quote Summary
                  </h4>
                  <span className="text-xs font-mono text-blue-400 print:text-black">
                    RO #{activeQuoteRO.id}
                  </span>
                </div>

                <div className="space-y-3 pt-4 text-xs">
                  <div className="flex items-center justify-between text-slate-300 print:text-black">
                    <span>Labor ({totalLaborHours.toFixed(1)} hrs @ ${defaultRate}/hr):</span>
                    <span className="font-mono font-bold text-white print:text-black">${totalLaborCost.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 print:text-black">
                    <span>Parts & Materials ({partsItems.length} item{partsItems.length === 1 ? '' : 's'}):</span>
                    <span className="font-mono font-bold text-white print:text-black">${totalPartsCost.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 print:text-black">
                    <span>Shop Supplies & Environmental:</span>
                    <span className="font-mono font-bold text-white print:text-black">${calculatedShopSupplies.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 print:text-black">
                    <span>Sales Tax (${(isTaxExempt ? 0 : Number(taxRatePercent || 0)).toFixed(2)}%):</span>
                    <span className={`font-mono font-bold print:text-black ${isTaxExempt ? 'text-emerald-400' : 'text-white'}`}>${estimatedTaxAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Grand Total Callout */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80 print:bg-slate-100 print:border-black">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block print:text-black">
                      Grand Total Estimate
                    </span>
                    <span className="text-[11px] text-slate-400 print:text-black">Parts, Labor, Supplies & Tax included</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight print:text-black">
                    ${grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Quote Status / Metadata */}
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800 print:border-black print:text-black">
                <div>Initiated by: <strong className="text-slate-200 print:text-black">{quote?.initiatedByTechName || currentUser.name}</strong></div>
                {quote?.submittedAt && (
                  <div>Submitted at: {new Date(quote.submittedAt).toLocaleDateString()} {new Date(quote.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                )}
                {quote?.approvedBy && (
                  <div className="text-emerald-400 print:text-black font-semibold">Authorized by: {quote.approvedBy}</div>
                )}
                {quote?.declinedReason && (
                  <div className="text-rose-400 print:text-black">Declined reason: {quote.declinedReason}</div>
                )}
              </div>
            </div>

          </div>

          {/* Decline Prompt Modal for Advisor/Manager */}
          {showDeclinePrompt && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-fade-in print:hidden">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Document Customer Decline Reason</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Customer decided to trade in vehicle / Price exceeded budget / Postponing until next month..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeclinePrompt(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="close-quote-footer-btn"
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Close
            </button>

            {/* Print button */}
            <button
              id="print-quote-footer-btn"
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Quote</span>
            </button>

            {/* Auto-Save Footer Feedback */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium pl-2">
              {quoteAutoSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span className="text-blue-600 font-semibold">Auto-saving quote changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Auto-saved {quoteLastSavedTime ? `at ${quoteLastSavedTime}` : 'live'}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
            {/* If Advisor/Manager, allow one-click authorization or decline */}
            {isAdvisorOrManager && quoteStatus === 'SUBMITTED' && (
              <>
                <button
                  id="decline-quote-btn"
                  type="button"
                  onClick={() => setShowDeclinePrompt(true)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Customer Declined</span>
                </button>

                <button
                  id="authorize-quote-btn"
                  type="button"
                  onClick={handleApproveQuote}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize & Approve ($ {(Number(grandTotal) || 0).toFixed(2)})</span>
                </button>
              </>
            )}

            {/* Save as Draft (Tech or Advisor) */}
            <button
              id="save-quote-draft-btn"
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-300" />
              <span>Save Draft</span>
            </button>

            {/* Primary Action: Tech Submits to Advisor */}
            <button
              id="submit-quote-advisor-btn"
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Quote to Advisor ($ {(Number(grandTotal) || 0).toFixed(2)})</span>
            </button>
          </div>
        </div>

      </div>

      {/* Official Printable Repair Quote Document (Rendered only during Print) */}
      <div 
        id="printable-quote-document"
        className="hidden print:block bg-white text-slate-950 max-w-4xl mx-auto space-y-4 font-sans text-xs"
      >
        {/* Dealership & Repair Quote Header */}
        <div className="border-b-2 border-slate-950 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                {shopName || 'Precision Auto & Truck Service'}
              </div>
              <div className="text-xs font-bold text-slate-700 tracking-wider uppercase mt-0.5">
                Official Repair Quote & Estimate • Service Department
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Certified Automotive Service • OEM & High-Grade Replacement Specifications
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block px-3 py-1 bg-slate-950 text-white font-mono font-black text-sm rounded">
                RO #{activeQuoteRO.id}
              </div>
              <div className="text-[11px] text-slate-800 font-semibold mt-1 font-mono">
                Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[11px] font-bold mt-0.5">
                Status:{' '}
                {quoteStatus === 'APPROVED' && <span className="text-emerald-700 font-black">AUTHORIZED BY CUSTOMER</span>}
                {quoteStatus === 'SUBMITTED' && <span className="text-blue-700 font-black">PENDING AUTHORIZATION</span>}
                {quoteStatus === 'DECLINED' && <span className="text-rose-700 font-black">DECLINED BY CUSTOMER</span>}
                {quoteStatus === 'DRAFT' && <span className="text-amber-700 font-black">ESTIMATE DRAFT</span>}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Advisor: {activeQuoteRO.advisorName}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Information Grid */}
        <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Customer Information</span>
            <span className="font-bold text-slate-950 text-sm block">{activeQuoteRO.customerName}</span>
            <span className="text-slate-700 block text-[11px] font-medium">{activeQuoteRO.customerPhone}</span>
            <div className="mt-1">
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                isTaxExempt ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-slate-200 text-slate-800 border-slate-300'
              }`}>
                {isTaxExempt ? `0.00% Tax Exempt${taxExemptNumber ? ` (Cert #${taxExemptNumber})` : ''}` : 'Taxable (7.00%)'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle Year / Make / Model</span>
            <span className="font-bold text-slate-950 text-sm block">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </span>
            <span className="text-slate-700 block text-[11px]">
              Mileage: {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}
            </span>
            {vehicle.engine && (
              <span className="text-slate-600 block text-[10px]">Engine: {vehicle.engine}</span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Vehicle VIN (17-Digit)</span>
            <span className="font-mono font-black text-slate-950 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 inline-block text-[11px]">
              {vehicle.vin || 'N/A'}
            </span>
            <span className="text-slate-600 block text-[11px] mt-0.5 font-mono">
              Tag: RO #{activeQuoteRO.id}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Service Assignment</span>
            <span className="text-slate-800 block">
              Advisor: <strong className="font-bold text-slate-950">{activeQuoteRO.advisorName}</strong>
            </span>
            <span className="text-slate-800 block">
              Technician: <strong className="font-bold text-slate-950">{activeQuoteRO.techName || quote?.initiatedByTechName || 'Assigned Tech'}</strong>
            </span>
            <span className="text-slate-600 block text-[11px]">
              Bay: {activeQuoteRO.bay || 'General Service'}
            </span>
          </div>
        </div>

        {/* Customer Stated Complaints / Concerns */}
        {((activeQuoteRO.concerns && activeQuoteRO.concerns.length > 0) || activeQuoteRO.primaryConcern) && (
          <div>
            <div className="text-xs font-black text-slate-950 uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-slate-300 pb-1">
              <span>Customer Stated Concern(s):</span>
            </div>
            <div className="space-y-1">
              {(activeQuoteRO.concerns && activeQuoteRO.concerns.length > 0 ? activeQuoteRO.concerns : [activeQuoteRO.primaryConcern!]).map((c, idx) => (
                <div key={idx} className="bg-slate-50 p-1.5 rounded border border-slate-300 text-xs flex items-start gap-2">
                  <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.2 rounded shrink-0">Line {idx + 1}</span>
                  <span className="font-medium text-slate-900">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technician Findings / Diagnostics */}
        {(activeQuoteRO.cause || activeQuoteRO.correction || techNotes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {activeQuoteRO.cause && (
              <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-300">
                <span className="text-[10px] font-bold text-amber-900 uppercase block mb-0.5">Diagnostic Finding / Cause:</span>
                <p className="font-mono text-slate-900 leading-snug">{activeQuoteRO.cause}</p>
              </div>
            )}
            {activeQuoteRO.correction && (
              <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-300">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block mb-0.5">Recommended Correction:</span>
                <p className="font-mono text-slate-900 leading-snug">{activeQuoteRO.correction}</p>
              </div>
            )}
          </div>
        )}

        {/* Section: Labor Operations */}
        <div className="space-y-1">
          <div className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center justify-between border-b border-slate-300 pb-1">
            <span>Labor Operations & Flat-Rate Procedures</span>
            <span className="text-[11px] font-bold text-slate-600 font-mono">
              Shop Labor Rate: ${defaultRate.toFixed(2)}/hr
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                <th className="py-1.5 px-2 w-10 text-center border-r border-slate-300">#</th>
                <th className="py-1.5 px-3 border-r border-slate-300">Operation Description & Procedures</th>
                <th className="py-1.5 px-2.5 w-24 text-center border-r border-slate-300">Hours</th>
                <th className="py-1.5 px-2.5 w-24 text-right border-r border-slate-300">Rate</th>
                <th className="py-1.5 px-3 w-28 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {laborItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-2.5 text-center text-slate-500 italic">No labor items on this estimate</td>
                </tr>
              ) : (
                laborItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                    <td className="py-1.5 px-3 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{item.description}</div>
                      {item.techNotes && (
                        <div className="text-[10px] text-slate-600 font-mono mt-0.5">{item.techNotes}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-semibold border-r border-slate-200">
                      {(Number(item.laborHours) || 0).toFixed(1)} hrs
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                      ${(Number(item.hourlyRate) || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-950">
                      ${(Number(item.subtotal) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                <td colSpan={2} className="py-1.5 px-3 text-right text-slate-700 uppercase text-[11px]">
                  Total Labor:
                </td>
                <td className="py-1.5 px-2.5 text-center font-mono text-slate-900">
                  {totalLaborHours.toFixed(1)} hrs
                </td>
                <td className="py-1.5 px-2.5 text-right text-slate-500"></td>
                <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950 text-sm">
                  ${totalLaborCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section: Parts & Materials */}
        <div className="space-y-1">
          <div className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center justify-between border-b border-slate-300 pb-1">
            <span>Required Parts & Materials</span>
            <span className="text-[11px] font-bold text-slate-600">
              Total Items: {partsItems.length}
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold text-slate-700 uppercase">
                <th className="py-1.5 px-2 w-10 text-center border-r border-slate-300">#</th>
                <th className="py-1.5 px-3 border-r border-slate-300">Part Description</th>
                <th className="py-1.5 px-3 w-36 border-r border-slate-300">Part Number</th>
                <th className="py-1.5 px-2 w-16 text-center border-r border-slate-300">Qty</th>
                <th className="py-1.5 px-2.5 w-24 text-right border-r border-slate-300">Unit Price</th>
                <th className="py-1.5 px-3 w-28 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {partsItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-2.5 text-center text-slate-500 italic">No replacement parts required for this estimate (Labor only)</td>
                </tr>
              ) : (
                partsItems.map((part, idx) => (
                  <tr key={part.id} className="border-b border-slate-200">
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">{part.description}</td>
                    <td className="py-1.5 px-3 font-mono text-slate-700 text-[11px] border-r border-slate-200">{part.partNumber || 'OEM / Standard'}</td>
                    <td className="py-1.5 px-2 text-center font-mono font-semibold border-r border-slate-200">{part.quantity}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">${(Number(part.unitPrice) || 0).toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-950">${(Number(part.subtotal) || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-400 font-bold">
                <td colSpan={5} className="py-1.5 px-3 text-right text-slate-700 uppercase text-[11px]">
                  Total Parts & Materials:
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950 text-sm">
                  ${totalPartsCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Financial Totals & Policies */}
        <div className="grid grid-cols-2 gap-4 pt-1 break-inside-avoid">
          {/* Left: Notes & Policies */}
          <div className="space-y-2 text-[11px] text-slate-600">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-300 space-y-1">
              <span className="font-bold text-slate-900 uppercase tracking-wider block text-[10px]">Warranty & Terms</span>
              <p className="leading-snug text-[10px]">
                All parts and labor are backed by our standard 12-Month / 12,000-Mile Warranty. Shop supplies and environmental hazmat fees cover consumables, fluid recycling, and shop equipment.
              </p>
              {techNotes && (
                <div className="pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-800 block text-[10px]">Technician Notes:</span>
                  <p className="font-mono text-slate-800 text-[10px] leading-tight whitespace-pre-wrap">{techNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Totals Table */}
          <div className="border border-slate-400 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 font-black text-xs uppercase tracking-wider text-slate-900">
              Official Quote Summary
            </div>
            <div className="p-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Labor Total ({totalLaborHours.toFixed(1)} hrs):</span>
                <span className="font-mono font-bold text-slate-950">${totalLaborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Parts & Materials ({partsItems.length} items):</span>
                <span className="font-mono font-bold text-slate-950">${totalPartsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Shop Supplies & Environmental:</span>
                <span className="font-mono font-bold text-slate-950">${calculatedShopSupplies.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Sales Tax (${(isTaxExempt ? 0 : Number(taxRatePercent || 0)).toFixed(2)}%):</span>
                <span className="font-mono font-bold text-slate-950">${estimatedTaxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 mt-1 border-t-2 border-slate-950 font-black">
                <span className="text-slate-950 uppercase text-xs">Grand Total Estimate:</span>
                <span className="font-mono text-slate-950 text-lg font-black">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Authorization & Signature Block */}
        <div className="border-2 border-slate-400 rounded-lg p-3 space-y-2 break-inside-avoid">
          <p className="text-[10px] text-slate-600 leading-tight">
            I hereby authorize the repair work listed above to be performed along with necessary materials. Precision Auto Care and its employees are granted permission to operate the vehicle described on streets and highways for testing and inspection purposes.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-1">
            <div>
              <div className="border-b-2 border-slate-900 pb-1 h-6"></div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mt-1 uppercase">
                <span>Customer Signature</span>
                <span>Date</span>
              </div>
            </div>

            <div>
              <div className="border-b-2 border-slate-900 pb-1 h-6 flex items-end">
                <span className="text-xs font-semibold text-slate-800">{activeQuoteRO.advisorName}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-700 mt-1 uppercase">
                <span>Service Advisor Signature</span>
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Bottom Bar */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200">
          <span>RO #{activeQuoteRO.id} • {shopName || 'Precision Auto & Truck Service'}</span>
          <span>Official Customer Copy</span>
        </div>
      </div>
    </div>
  );
};

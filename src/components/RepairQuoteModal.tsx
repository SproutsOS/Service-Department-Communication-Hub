import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ShieldCheck,
  User,
  Edit3,
  Camera
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairQuote, LaborLineItem, QuotePartItem, QuoteStatus, ConcernPayType, LineApprovalStatus } from '../types';
import { PAY_TYPE_RATES, getPayTypeRate, cleanRO3700 } from '../utils/formatters';
import { LinePhotoSection } from './LinePhotoSection';

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

/**
 * Extracts a line-specific substring from multi-line text (e.g. "Line 1: ... Line 2: ...")
 */
export const parseLineFromCombinedText = (text: string | undefined | null, lineNum: number): string => {
  if (!text) return '';
  const regex = new RegExp(`(?:^|\\b)Line\\s*${lineNum}[:\\s-]+([^\\n]*?)(?=(?:Line\\s*\\d+|$))`, 'i');
  const match = text.match(regex);
  if (match && match[1]?.trim()) {
    return match[1].trim();
  }
  if (lineNum === 1 && !/(?:^|\b)Line\s*\d+/i.test(text)) {
    return text.trim();
  }
  return '';
};

export const RepairQuoteModal: React.FC = () => {
  const { 
    activeQuoteRO, 
    closeQuoteModal, 
    saveRepairQuote, 
    updateQuoteStatus, 
    updateConcernStatus,
    currentUser,
    users,
    sendShopChatMessage,
    activeRoleView,
    shopName,
    updateTechCauseAndCorrection
  } = useApp();

  const isTech = currentUser.role === 'TECHNICIAN' || activeRoleView === 'TECHNICIAN';
  const isAdvisorOrManager = !isTech && (
    currentUser.role === 'SERVICE_ADVISOR' || 
    currentUser.role === 'SERVICE_MANAGER' || 
    activeRoleView === 'SERVICE_ADVISOR' || 
    activeRoleView === 'SERVICE_MANAGER'
  );

  const [copiedVin, setCopiedVin] = useState(false);
  const [copiedVehicleInfo, setCopiedVehicleInfo] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Quote Form State: Default to Customer Pay ($165.00/hr)
  const [quotePayType, setQuotePayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [defaultRate, setDefaultRate] = useState<number>(165.00);
  const [laborItems, setLaborItems] = useState<LaborLineItem[]>([]);
  const [partsItems, setPartsItems] = useState<QuotePartItem[]>([]);
  const [lineStatuses, setLineStatuses] = useState<Record<number, LineApprovalStatus>>({});
  const [applyShopSupplies, setApplyShopSupplies] = useState<boolean>(true);
  const [shopSuppliesFee, setShopSuppliesFee] = useState<number>(25);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(7.0);
  const [isTaxExempt, setIsTaxExempt] = useState<boolean>(false);
  const [taxExemptNumber, setTaxExemptNumber] = useState<string>('');
  const [techNotes, setTechNotes] = useState<string>('');
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclinePrompt, setShowDeclinePrompt] = useState<boolean>(false);
  const [showCorrectionEditor, setShowCorrectionEditor] = useState<boolean>(false);
  const [correctionInput, setCorrectionInput] = useState<string>('');

  // Handle Approve / Declined toggle for each line
  const handleToggleLineStatus = (lineNum: number, targetStatus: LineApprovalStatus) => {
    const current = lineStatuses[lineNum] || 'PENDING';
    const nextStatus: LineApprovalStatus = current === targetStatus ? 'PENDING' : targetStatus;

    setLineStatuses(prev => ({
      ...prev,
      [lineNum]: nextStatus
    }));

    setLaborItems(prev => prev.map(item => {
      if ((item.roLineNumber || 1) === lineNum) {
        return { ...item, status: nextStatus };
      }
      return item;
    }));

    setPartsItems(prev => prev.map(item => {
      if ((item.roLineNumber || 1) === lineNum) {
        return { ...item, status: nextStatus };
      }
      return item;
    }));

    if (activeQuoteRO && updateConcernStatus) {
      updateConcernStatus(activeQuoteRO.id, lineNum - 1, nextStatus);
    }
  };

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
    lineStatuses,
    defaultRate,
    quotePayType,
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
      lineStatuses,
      defaultRate,
      quotePayType,
      applyShopSupplies,
      shopSuppliesFee,
      taxRatePercent,
      isTaxExempt,
      taxExemptNumber,
      techNotes,
    };
  }, [laborItems, partsItems, lineStatuses, defaultRate, quotePayType, applyShopSupplies, shopSuppliesFee, taxRatePercent, isTaxExempt, taxExemptNumber, techNotes]);

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
      lineStatuses: curLineStatuses,
      defaultRate: curRate,
      quotePayType: curPayType,
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
    const curShopSupplies = !curApplySupplies ? 0 : Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 35) : Math.min(curSuppliesFee, 35)).toFixed(2));
    const curPartsCost = Number(curParts.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0).toFixed(2));
    const curTaxableAmount = curLaborCost + curPartsCost;
    const curTax = curIsExempt ? 0 : Number((curTaxableAmount * ((curTaxPercent || 0) / 100)).toFixed(2));
    const curGrandTotal = Number((curLaborCost + curPartsCost + curShopSupplies + curTax).toFixed(2));

    const autoQuote: RepairQuote = {
      id: currentRO.quote?.id || `quote_${Date.now()}`,
      roId: currentRO.id,
      createdAt: currentRO.quote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      initiatedByTechId: currentRO.quote?.initiatedByTechId || currentUser.id,
      initiatedByTechName: currentRO.quote?.initiatedByTechName || currentUser.name,
      status: currentRO.quote?.status || 'DRAFT',
      payType: curPayType,
      lineStatuses: curLineStatuses,
      laborItems: curLabor.map(l => ({
        ...l,
        laborHours: Number(l.laborHours) || 0,
        hourlyRate: Number(l.hourlyRate) || 0,
        subtotal: Number(l.subtotal) || 0,
        payType: l.payType || curPayType,
      })),
      partsItems: curParts.map(p => ({
        ...p,
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        subtotal: Number(p.subtotal) || 0,
      })),
      defaultLaborRate: curRate,
      applyShopSupplies: curApplySupplies,
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
    try {
      flushQuoteAutoSave();
    } catch (e) {
      console.error('Error flushing quote auto-save:', e);
    }
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

  // Handle print event and document title formatting (Must be declared before any early return)
  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-quote');
      if (!activeQuoteRO) return;
      const roNumber = activeQuoteRO.id || '';
      const vehicleDesc = activeQuoteRO.vehicle ? `${activeQuoteRO.vehicle.year} ${activeQuoteRO.vehicle.make} ${activeQuoteRO.vehicle.model}` : '';
      document.title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-quote');
      document.title = 'The HUB - Everything Moving. Everyone Connected';
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      document.body.classList.remove('printing-quote');
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [activeQuoteRO]);

  // Initialize quote from active RO or defaults
  useEffect(() => {
    if (!activeQuoteRO) return;
    hasInitializedRef.current = false;
    const cleanRO = cleanRO3700(activeQuoteRO);

    const isExemptCustomer = Boolean(cleanRO.isTaxExempt || cleanRO.quote?.isTaxExempt);
    setIsTaxExempt(isExemptCustomer);
    setTaxExemptNumber(cleanRO.taxExemptNumber || cleanRO.quote?.taxExemptNumber || '');

    const initialPayType: ConcernPayType = cleanRO.quote?.payType || cleanRO.concernPayTypes?.[0] || 'CUSTOMER_PAY';
    setQuotePayType(initialPayType);

    const initialRate = cleanRO.quote?.defaultLaborRate && cleanRO.quote.defaultLaborRate !== 150
      ? cleanRO.quote.defaultLaborRate
      : (PAY_TYPE_RATES[initialPayType] || 165.00);
    setDefaultRate(initialRate);

    // Build itemized list of customer concerns (Line 1, Line 2, etc.) mirroring the repair order
    const concernsList = cleanRO.concerns && cleanRO.concerns.length > 0
      ? cleanRO.concerns
      : [cleanRO.primaryConcern || 'General Diagnostic & Inspection'];

    // Helper to mirror RO concern and correction into a labor line
    const createMirroredROItem = (concern: string, idx: number, existing?: LaborLineItem): LaborLineItem => {
      const roLineNumber = idx + 1;
      const linePayType = existing?.payType || cleanRO.concernPayTypes?.[idx] || initialPayType;
      const lineRate = (existing?.hourlyRate && existing.hourlyRate !== 150)
        ? existing.hourlyRate
        : (PAY_TYPE_RATES[linePayType] || initialRate);
      
      const hoursVal = (existing?.laborHours !== undefined && existing.laborHours !== ('' as any))
        ? existing.laborHours
        : ('' as any);
      
      const subtotalVal = hoursVal !== '' ? Number(((Number(hoursVal) || 0) * lineRate).toFixed(2)) : 0;
      
      const lineCorrection = cleanRO.concernCorrections?.[idx] || parseLineFromCombinedText(cleanRO.correction, roLineNumber);

      // Box to the left of hours must be the CORRECTION, not the concern or cause
      let desc = '';
      if (existing?.description) {
        let raw = existing.description.trim();
        if (raw.includes('— Correction:')) {
          desc = raw.split('— Correction:')[1].trim();
        } else if (/^Correction:\s*/i.test(raw)) {
          desc = raw.replace(/^Correction:\s*/i, '').trim();
        } else if (/^Concern:\s*/i.test(raw) || /^Cause:\s*/i.test(raw)) {
          desc = lineCorrection;
        } else {
          desc = raw;
        }
      } else {
        desc = lineCorrection;
      }

      // Clean techNotes so it NEVER repeats "Cause: Line 1: ..."
      let notes = existing?.techNotes ? existing.techNotes.trim() : '';
      if (/^Cause:\s*/i.test(notes)) {
        notes = '';
      }

      return {
        id: existing?.id || `labor_${Date.now()}_ro_${idx}`,
        description: desc,
        laborHours: hoursVal,
        hourlyRate: lineRate,
        subtotal: subtotalVal,
        payType: linePayType,
        techNotes: notes || undefined,
        roLineNumber,
        concernText: concern,
        correctionText: lineCorrection,
        addedByAdvisor: false,
      };
    };

    if (cleanRO.quote) {
      const q = cleanRO.quote;
      const existingItems = q.laborItems || [];

      // 1. Mirror RO concerns 1-to-1
      const mirroredLabor: LaborLineItem[] = concernsList.map((concern, idx) => {
        const matched = existingItems.find(item => item.roLineNumber === idx + 1) || existingItems[idx];
        return createMirroredROItem(concern, idx, matched);
      });

      // 2. Only include additional lines IF added by the service advisor!
      const advisorAddedLines: LaborLineItem[] = existingItems
        .filter(item => item.addedByAdvisor === true)
        .map(item => {
          const itemPay = item.payType || initialPayType;
          const itemRate = (item.hourlyRate && item.hourlyRate !== 150)
            ? item.hourlyRate
            : (PAY_TYPE_RATES[itemPay] || initialRate);
          return {
            ...item,
            payType: itemPay,
            hourlyRate: itemRate,
            subtotal: Number(((Number(item.laborHours) || 0) * itemRate).toFixed(2)),
            addedByAdvisor: true,
          };
        });

      setLaborItems([...mirroredLabor, ...advisorAddedLines]);

      // Bring parts information from Parts Department together on the quote
      const existingQuoteParts: QuotePartItem[] = (q.partsItems || []).map(p => ({
        ...p,
        unitPrice: (p.unitPrice && Number(p.unitPrice) > 0) ? p.unitPrice : ('' as any),
      }));

      if (cleanRO.parts && cleanRO.parts.length > 0) {
        cleanRO.parts.forEach(roPart => {
          const partLineNum = roPart.roLineNumber || (roPart.notes?.match(/Line (\d+)/i)?.[1] ? parseInt(roPart.notes.match(/Line (\d+)/i)![1]) : 1);
          const matchIndex = existingQuoteParts.findIndex(qp => 
            qp.sourcePartId === roPart.id || 
            (roPart.partNumber && qp.partNumber && qp.partNumber.trim().toUpperCase() === roPart.partNumber.trim().toUpperCase())
          );
          if (matchIndex >= 0) {
            const current = existingQuoteParts[matchIndex];
            const updatedPrice = (roPart.price !== undefined && Number(roPart.price) > 0) ? roPart.price : current.unitPrice;
            existingQuoteParts[matchIndex] = {
              ...current,
              description: roPart.description || roPart.name || current.description,
              partNumber: roPart.partNumber || current.partNumber,
              quantity: roPart.quantity || current.quantity || 1,
              unitPrice: updatedPrice,
              subtotal: (roPart.quantity || current.quantity || 1) * (Number(updatedPrice) || 0),
              sourcePartId: roPart.id,
              roLineNumber: current.roLineNumber || partLineNum,
            };
          } else {
            existingQuoteParts.push({
              id: `qpart_${Date.now()}_${roPart.id}`,
              description: roPart.description || roPart.name,
              partNumber: roPart.partNumber,
              quantity: roPart.quantity || 1,
              unitPrice: (roPart.price && Number(roPart.price) > 0) ? roPart.price : ('' as any),
              subtotal: (roPart.quantity || 1) * (roPart.price || 0),
              sourcePartId: roPart.id,
              roLineNumber: partLineNum,
            });
          }
        });
      }

      setPartsItems(existingQuoteParts);
      // Automatically charge shop supplies unless explicitly unchecked (applyShopSupplies === false)
      setApplyShopSupplies(q.applyShopSupplies !== false);
      setShopSuppliesFee(q.shopSuppliesFee !== undefined ? Math.min(q.shopSuppliesFee, 35) : 25);
      const initialStatuses: Record<number, LineApprovalStatus> = {};
      concernsList.forEach((_, idx) => {
        const lineNum = idx + 1;
        initialStatuses[lineNum] = q.lineStatuses?.[lineNum] || cleanRO.concernStatuses?.[idx] || 'PENDING';
      });
      setLineStatuses(initialStatuses);
      setTaxRatePercent(isExemptCustomer ? 0 : (q.taxRate !== undefined ? q.taxRate * 100 : 7.0));
      setTechNotes(q.techNotes || (cleanRO.correction ? `Correction: ${cleanRO.correction}` : ''));
    } else {
      // Initiating a brand new quote — auto-populate customer concern and correction mirroring RO 1-to-1
      const initialLabor: LaborLineItem[] = concernsList.map((concern, idx) => createMirroredROItem(concern, idx));
      setLaborItems(initialLabor);

      // Pre-populate parts from existing RO parts if any exist
      if (cleanRO.parts && cleanRO.parts.length > 0) {
        const initialParts: QuotePartItem[] = cleanRO.parts.map(p => ({
          id: `qpart_${Date.now()}_${p.id}`,
          description: p.description || p.name,
          partNumber: p.partNumber,
          quantity: p.quantity || 1,
          unitPrice: (p.price && Number(p.price) > 0) ? p.price : ('' as any),
          subtotal: (p.quantity || 1) * (p.price || 0),
          sourcePartId: p.id,
          roLineNumber: p.roLineNumber || (p.notes?.match(/Line (\d+)/i)?.[1] ? parseInt(p.notes.match(/Line (\d+)/i)![1]) : 1),
        }));
        setPartsItems(initialParts);
      } else {
        setPartsItems([]);
      }

      // Automatically charge shop supplies by default on new quotes
      setApplyShopSupplies(true);
      setShopSuppliesFee(25);
      const initialStatuses: Record<number, LineApprovalStatus> = {};
      concernsList.forEach((_, idx) => {
        const lineNum = idx + 1;
        initialStatuses[lineNum] = cleanRO.concernStatuses?.[idx] || 'PENDING';
      });
      setLineStatuses(initialStatuses);
      setTaxRatePercent(isExemptCustomer ? 0 : 7.0);

      // Auto-populate quote notes with customer concerns, diagnostic findings, and correction
      const notesParts: string[] = [];
      if (concernsList.length > 0) {
        notesParts.push(`Customer Concern${concernsList.length > 1 ? 's' : ''}:\n${concernsList.map((c, i) => `Line ${i + 1}: ${c}`).join('\n')}`);
      }
      if (cleanRO.cause) {
        notesParts.push(`Diagnostic Finding (Cause):\n${cleanRO.cause}`);
      }
      if (cleanRO.correction) {
        notesParts.push(`Technician Correction:\n${cleanRO.correction}`);
      }
      setTechNotes(notesParts.join('\n\n'));
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
    // 5% of labor cost capped at max $35.00, or the manual amount capped at $35.00
    const fivePercent = totalLaborCost * 0.05;
    return Number((fivePercent > 0 ? Math.min(Math.max(fivePercent, 15), 35) : Math.min(shopSuppliesFee, 35)).toFixed(2));
  }, [applyShopSupplies, totalLaborCost, shopSuppliesFee]);

  const totalPartsCost = useMemo(() => {
    return Number(partsItems.reduce((acc, item) => acc + (Number(item?.subtotal) || 0), 0).toFixed(2));
  }, [partsItems]);

  const estimatedTaxAmount = useMemo(() => {
    if (isTaxExempt) return 0;
    const rate = (taxRatePercent || 0) / 100;
    // Sales tax applied to parts and labor
    const taxableAmount = (totalLaborCost || 0) + (totalPartsCost || 0);
    return Number((taxableAmount * rate).toFixed(2));
  }, [totalLaborCost, totalPartsCost, taxRatePercent, isTaxExempt]);

  const grandTotal = useMemo(() => {
    return Number(((totalLaborCost || 0) + (totalPartsCost || 0) + (calculatedShopSupplies || 0) + (estimatedTaxAmount || 0)).toFixed(2));
  }, [totalLaborCost, totalPartsCost, calculatedShopSupplies, estimatedTaxAmount]);

  const totalApprovedAmount = useMemo(() => {
    let sum = 0;
    laborItems.forEach(l => {
      const lNum = l.roLineNumber || 1;
      const st = lineStatuses[lNum] || 'PENDING';
      if (st !== 'DECLINED') {
        sum += Number(l.subtotal) || 0;
      }
    });
    partsItems.forEach(p => {
      const pNum = p.roLineNumber || 1;
      const st = lineStatuses[pNum] || 'PENDING';
      if (st !== 'DECLINED') {
        sum += Number(p.subtotal) || 0;
      }
    });
    return Number(sum.toFixed(2));
  }, [laborItems, partsItems, lineStatuses]);

  const totalDeclinedAmount = useMemo(() => {
    let sum = 0;
    laborItems.forEach(l => {
      const lNum = l.roLineNumber || 1;
      const st = lineStatuses[lNum] || 'PENDING';
      if (st === 'DECLINED') {
        sum += Number(l.subtotal) || 0;
      }
    });
    partsItems.forEach(p => {
      const pNum = p.roLineNumber || 1;
      const st = lineStatuses[pNum] || 'PENDING';
      if (st === 'DECLINED') {
        sum += Number(p.subtotal) || 0;
      }
    });
    return Number(sum.toFixed(2));
  }, [laborItems, partsItems, lineStatuses]);

  if (!activeQuoteRO) return null;

  const cleanRO = cleanRO3700(activeQuoteRO);

  const vehicle = cleanRO.vehicle || {
    year: '',
    make: 'Vehicle',
    model: '',
    vin: '',
    engine: '',
    mileage: 0,
  };

  const quote = cleanRO.quote;
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

  const handleSetQuotePayType = (newPayType: ConcernPayType) => {
    setQuotePayType(newPayType);
    const newRate = PAY_TYPE_RATES[newPayType] || 165.00;
    setDefaultRate(newRate);
    setLaborItems(prev => prev.map(item => ({
      ...item,
      payType: newPayType,
      hourlyRate: newRate,
      subtotal: Number(((Number(item.laborHours) || 0) * newRate).toFixed(2))
    })));
  };

  // Labor line operations - only Service Advisors can add additional lines per user requirement
  const handleAddLaborItem = (preset?: { name: string; hours?: number; notes?: string }) => {
    if (!isAdvisorOrManager) {
      alert('Only a Service Advisor can add additional lines to the repair quote / labor estimate.');
      return;
    }
    const itemPayType = quotePayType;
    const rate = PAY_TYPE_RATES[itemPayType] || defaultRate;
    const newItem: LaborLineItem = {
      id: `labor_${Date.now()}_adv_${Math.random().toString(36).substring(2, 6)}`,
      description: preset ? preset.name : '',
      laborHours: '' as any, // Do NOT auto-populate hours!
      hourlyRate: rate,
      subtotal: 0,
      payType: itemPayType,
      techNotes: preset?.notes || undefined,
      addedByAdvisor: true,
    };
    setLaborItems(prev => [...prev, newItem]);
  };

  const handleUpdateLaborItem = (id: string, updates: Partial<LaborLineItem>) => {
    setLaborItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      if (updates.payType && updates.payType !== item.payType && !('hourlyRate' in updates)) {
        updated.hourlyRate = PAY_TYPE_RATES[updates.payType] || updated.hourlyRate;
      }
      const hours = Number(updated.laborHours) || 0;
      const rate = Number(updated.hourlyRate) || 0;
      updated.subtotal = Number((hours * rate).toFixed(2));
      return updated;
    }));
  };

  const handleRemoveLaborItem = (id: string) => {
    // Only Service Advisors can remove lines
    if (!isAdvisorOrManager) {
      alert('Only a Service Advisor can remove lines from the repair quote / labor estimate.');
      return;
    }
    setLaborItems(prev => prev.filter(item => item.id !== id));
  };

  // Parts operations
  const handleAddPartItem = (targetLine = 1) => {
    const newItem: QuotePartItem = {
      id: `qpart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      partNumber: '',
      quantity: 1,
      unitPrice: '' as any,
      subtotal: 0,
      roLineNumber: targetLine,
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

  // Quick helper to re-mirror RO concerns & correction without duplicate lines
  const handleMirrorROConcernsAndCorrection = () => {
    const cleanRO = cleanRO3700(activeQuoteRO);
    const concerns = cleanRO.concerns && cleanRO.concerns.length > 0 
      ? cleanRO.concerns 
      : (cleanRO.primaryConcern ? [cleanRO.primaryConcern] : []);

    if (concerns.length === 0) return;

    const mirrored: LaborLineItem[] = concerns.map((concern, idx) => {
      const roLineNumber = idx + 1;
      const existing = laborItems.find(item => item.roLineNumber === roLineNumber) || laborItems[idx];
      const linePayType = existing?.payType || cleanRO.concernPayTypes?.[idx] || quotePayType || 'CUSTOMER_PAY';
      const rate = (existing?.hourlyRate && existing.hourlyRate !== 150)
        ? existing.hourlyRate
        : (PAY_TYPE_RATES[linePayType] || defaultRate);
      const hoursVal = (existing?.laborHours !== undefined && existing.laborHours !== ('' as any))
        ? existing.laborHours
        : ('' as any);
      const subtotalVal = hoursVal !== '' ? Number(((Number(hoursVal) || 0) * rate).toFixed(2)) : 0;
      const lineCorrection = cleanRO.concernCorrections?.[idx] || parseLineFromCombinedText(cleanRO.correction, roLineNumber);

      let desc = '';
      if (existing?.description) {
        let raw = existing.description.trim();
        if (raw.includes('— Correction:')) {
          desc = raw.split('— Correction:')[1].trim();
        } else if (/^Correction:\s*/i.test(raw)) {
          desc = raw.replace(/^Correction:\s*/i, '').trim();
        } else if (/^Concern:\s*/i.test(raw) || /^Cause:\s*/i.test(raw)) {
          desc = lineCorrection;
        } else {
          desc = raw;
        }
      } else {
        desc = lineCorrection;
      }

      let notes = existing?.techNotes ? existing.techNotes.trim() : '';
      if (/^Cause:\s*/i.test(notes)) {
        notes = '';
      }

      return {
        id: existing?.id || `labor_${Date.now()}_ro_${idx}`,
        roLineNumber,
        concernText: concern,
        correctionText: lineCorrection,
        description: desc,
        laborHours: hoursVal,
        hourlyRate: rate,
        subtotal: subtotalVal,
        payType: linePayType,
        techNotes: notes || undefined,
        addedByAdvisor: false,
      };
    });

    // Retain only advisor-added lines
    const advisorLines = laborItems.filter(item => item.addedByAdvisor === true);

    setLaborItems([...mirrored, ...advisorLines]);
    setSaveSuccessMsg('Mirrored Repair Order concerns & correction 1:1');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Allow tech or advisor to update the Repair Order correction and immediately mirror it into the quote/estimate lines
  const handleSaveCorrectionToRO = (newCorrection: string) => {
    const trimmed = newCorrection.trim();
    if (!trimmed) {
      alert('Please enter a valid correction procedure.');
      return;
    }
    updateTechCauseAndCorrection(activeQuoteRO.id, cleanRO.cause || '', trimmed);
    setLaborItems(prev => prev.map(item => {
      if (item.addedByAdvisor) return item;
      return {
        ...item,
        correctionText: trimmed,
        description: trimmed,
        techNotes: item.techNotes && !item.techNotes.startsWith('Cause:') ? item.techNotes : undefined,
      };
    }));
    setShowCorrectionEditor(false);
    setSaveSuccessMsg('Updated RO Correction and mirrored to estimate line items!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleImportCauseCorrection = () => {
    const cleanRO = cleanRO3700(activeQuoteRO);
    if (!cleanRO.cause && !cleanRO.correction) {
      alert('No Cause & Correction documented yet on this RO.');
      return;
    }
    const textToAdd = `[Tech Diagnostic Findings]\nCause: ${cleanRO.cause || 'N/A'}\nCorrection Required: ${cleanRO.correction || 'N/A'}`;
    setTechNotes(prev => prev ? `${prev}\n\n${textToAdd}` : textToAdd);
    setSaveSuccessMsg('Imported Cause & Correction into quote notes!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleImportROParts = () => {
    const cleanRO = cleanRO3700(activeQuoteRO);
    if (!cleanRO.parts || cleanRO.parts.length === 0) {
      alert('No parts currently logged in this Repair Order.');
      return;
    }
    const existingPartIds = new Set(partsItems.map(p => p.sourcePartId).filter(Boolean));
    const partsToAdd = cleanRO.parts
      .filter(p => !existingPartIds.has(p.id))
      .map(p => ({
        id: `qpart_${Date.now()}_${p.id}`,
        description: p.description || p.name,
        partNumber: p.partNumber,
        quantity: p.quantity || 1,
        unitPrice: (p.price && Number(p.price) > 0) ? p.price : ('' as any),
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
      payType: quotePayType,
      lineStatuses,
      applyShopSupplies,
      laborItems: laborItems.map(l => ({
        ...l,
        laborHours: Number(l.laborHours) || 0,
        hourlyRate: Number(l.hourlyRate) || 0,
        subtotal: Number(l.subtotal) || 0,
        payType: l.payType || quotePayType,
      })),
      partsItems: partsItems.map(p => ({
        ...p,
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        subtotal: Number(p.subtotal) || 0,
      })),
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
          ? (isTech ? 'Labor time successfully submitted to Service Advisor!' : 'Quote successfully submitted to Service Advisor for customer authorization!')
          : (isTech ? 'Labor time draft saved.' : 'Repair quote draft saved successfully.')
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
    if (!window.confirm(`Authorize and approve repair quote for ${activeQuoteRO.customerName} totaling $${formattedTotal}?\n\nThis will:\n1. Update repair order status to APPROVED\n2. Notify assigned Technician that repairs are authorized\n3. Notify Service Manager\n4. Notify Parts Counter to order parts immediately`)) {
      return;
    }

    // 1. Save latest quote labor and parts before approving
    handleSave(false);

    // 2. Update quote and repair order status to APPROVED (automatically rolls parts into RO)
    updateQuoteStatus(activeQuoteRO.id, 'APPROVED');

    const vehicleDesc = activeQuoteRO.vehicle 
      ? `${activeQuoteRO.vehicle.year} ${activeQuoteRO.vehicle.make} ${activeQuoteRO.vehicle.model}` 
      : 'Vehicle';

    // 3. Send targeted ShopChat alert to Service Manager(s)
    const managerUsers = users.filter(u => u.role === 'SERVICE_MANAGER' && u.id !== currentUser.id);
    managerUsers.forEach(mu => {
      sendShopChatMessage(
        `📋 [RO APPROVED] RO #${activeQuoteRO.id} (${activeQuoteRO.customerName} - ${vehicleDesc}) approved for $${formattedTotal}. Parts counter and assigned tech notified.`,
        mu.id,
        activeQuoteRO.id,
        true
      );
    });

    // 4. Send targeted ShopChat alert to Parts Specialists
    const partsUsers = users.filter(u => u.role === 'PARTS_SPECIALIST' && u.id !== currentUser.id);
    partsUsers.forEach(pu => {
      sendShopChatMessage(
        `📦 [PARTS ACTION REQUIRED] Customer authorized Quote for RO #${activeQuoteRO.id} ($${formattedTotal}). Please review and place parts order now.`,
        pu.id,
        activeQuoteRO.id,
        true
      );
    });

    // 5. Send targeted ShopChat alert strictly to the Technician assigned to THIS repair order
    if (activeQuoteRO.techId && activeQuoteRO.techId !== currentUser.id) {
      sendShopChatMessage(
        `🔧 [REPAIR AUTHORIZED] Quote approved for RO #${activeQuoteRO.id} ($${formattedTotal}). Customer authorized repairs. Work is approved to proceed!`,
        activeQuoteRO.techId,
        activeQuoteRO.id,
        true
      );
    }

    setSaveSuccessMsg('Quote authorized and repair order approved! Targeted notifications sent to the assigned Technician, Service Manager, and Parts Counter.');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      closeQuoteModal();
    }, 1800);
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

  const handlePrint = () => {
    document.body.classList.add('printing-quote');
    const originalTitle = document.title;
    const roNumber = activeQuoteRO?.id || '';
    const vehicleDesc = activeQuoteRO?.vehicle ? `${activeQuoteRO.vehicle.year} ${activeQuoteRO.vehicle.make} ${activeQuoteRO.vehicle.model}` : '';
    document.title = `Repair Quote - RO #${roNumber} - ${vehicleDesc}`;
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-quote');
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <>
      <div 
        id="repair-quote-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto no-print"
      >
        <div 
          id="repair-quote-modal-container"
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col"
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
                  {isTech ? 'Job Labor Time Entry' : 'Repair Quote & Labor Estimate'}
                </h2>
                <span className="bg-slate-800 text-blue-400 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-slate-700">
                  RO #{activeQuoteRO.id}
                </span>

                {/* Status Badge */}
                {quoteStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {isTech ? 'Customer Authorized' : `Customer Authorized ($ ${grandTotal.toFixed(2)})`}
                  </span>
                )}
                {quoteStatus === 'DECLINED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <XCircle className="w-3.5 h-3.5" /> Declined
                  </span>
                )}
                {quoteStatus === 'SUBMITTED' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    <Clock className="w-3.5 h-3.5" /> {isTech ? 'Submitted to Advisor' : 'Submitted to Advisor (Awaiting Auth)'}
                  </span>
                )}
                {quoteStatus === 'DRAFT' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Wrench className="w-3.5 h-3.5" /> {isTech ? 'Labor Time Draft' : 'Tech Quote Draft'}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-100 font-semibold mt-1 flex items-center gap-2.5 flex-wrap">
                <span>Customer: <strong className="text-white font-black">{activeQuoteRO.customerName}</strong></span>
                <span className="text-slate-300 font-black">•</span>
                {!isTech && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleTaxExempt}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                        isTaxExempt 
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 hover:bg-emerald-600/40' 
                          : 'bg-slate-800 text-slate-100 hover:text-white border-slate-700 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                      title={isTaxExempt ? "Customer is Tax Exempt (0% sales tax). Click to change to taxable." : "Click if customer is Tax Exempt (0% sales tax)"}
                    >
                      <ShieldCheck className={`w-3.5 h-3.5 ${isTaxExempt ? 'text-emerald-400' : 'text-slate-300'}`} />
                      <span>{isTaxExempt ? 'Tax Exempt Customer (0% Tax)' : 'Tax Exempt? Click if exempt'}</span>
                    </button>
                    <span className="text-slate-300 font-black">•</span>
                  </>
                )}
                <span>Vehicle: <strong className="text-white font-black">{vehicle.year} {vehicle.make} {vehicle.model}</strong></span>
                {vehicle.vin && (
                  <>
                    <span className="text-slate-300 font-black">•</span>
                    <span>VIN: <strong className="text-white font-black select-all">{vehicle.vin}</strong></span>
                  </>
                )}
                <span className="text-slate-300 font-black">•</span>
                <span>Miles: <strong className="text-white font-black">{vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : `${vehicle.mileage ?? 0} mi`}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {/* Auto-Save Status Badge */}
            <div 
              id="quote-autosave-badge"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 select-none text-slate-100"
              title="All changes are automatically saved"
            >
              {quoteAutoSaveStatus === 'saving' ? (
                <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-100 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Saved</span>
                </span>
              )}
            </div>

            {isAdvisorOrManager && quoteStatus !== 'APPROVED' && (
              <button
                id="header-approve-quote-btn"
                type="button"
                onClick={handleApproveQuote}
                title="Authorize and approve this repair quote"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Approve Quote</span>
              </button>
            )}

            {!isTech && (
              <button
                id="print-quote-btn"
                onClick={handlePrint}
                title="Print official repair quote"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Print Quote</span>
              </button>
            )}
            <button
              id="close-quote-modal-btn"
              onClick={handleCloseModal}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
                  <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 text-[11px] font-black rounded-full uppercase tracking-wider border border-blue-400/40">
                    OEM Labor Time Lookup
                  </span>
                  <span className="text-xs text-white font-bold">Pro Demand Integration</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Look Up Flat-Rate Labor in Pro Demand
                </h3>
                {vehicle.vin && (
                  <div className="text-xs text-white font-mono font-bold flex items-center gap-2 pt-1">
                    <span>VIN: <strong className="text-white font-black">{vehicle.vin}</strong></span>
                    {vehicle.engine && <span>• Engine: <strong className="text-white font-black">{vehicle.engine}</strong></span>}
                  </div>
                )}
              </div>

              {/* Action Buttons for ProDemand */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
                {vehicle.vin && (
                  <button
                    id="copy-vin-for-prodemand-btn"
                    onClick={handleCopyVin}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 border-2 border-slate-700 transition-all active:scale-95 shadow-md cursor-pointer"
                    title="Copy VIN to paste into Pro Demand vehicle selector"
                  >
                    {copiedVin ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">VIN Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-blue-400" />
                        <span className="font-bold text-white">Copy VIN</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  id="copy-vehicle-info-btn"
                  onClick={handleCopyVehicleInfo}
                  className="px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                  title="Copy full vehicle info (Year, Make, Model, VIN)"
                >
                  {copiedVehicleInfo ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-white" />
                      <span className="text-white font-bold">Copy Vehicle Info</span>
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
                  <span>Open Pro Demand ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Tools & Pay Rate Selector */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-100 p-3 rounded-xl border border-slate-300 text-xs print:hidden">
            {!isTech && activeQuoteRO.parts && activeQuoteRO.parts.length > 0 && (
              <button
                id="import-ro-parts-btn"
                onClick={handleImportROParts}
                className="px-2.5 py-1.5 bg-white hover:bg-amber-50 text-slate-900 hover:text-amber-800 rounded-lg border border-slate-300 hover:border-amber-400 font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <Package className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Import RO Parts ({activeQuoteRO.parts.length})</span>
              </button>
            )}

            {(activeQuoteRO.cause || activeQuoteRO.correction) && (
              <button
                id="import-cause-correction-btn"
                onClick={handleImportCauseCorrection}
                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-900 hover:text-emerald-800 rounded-lg border border-slate-300 hover:border-emerald-400 font-bold transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Import Cause & Correction into Notes</span>
              </button>
            )}

            {!isTech ? (
              <div className="ml-auto flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-slate-950 uppercase">Rate Tier:</span>
                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleSetQuotePayType('CUSTOMER_PAY')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        quotePayType === 'CUSTOMER_PAY'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-900 hover:text-black hover:bg-slate-300'
                      }`}
                    >
                      Customer Pay ($165.00)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuotePayType('WARRANTY')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        quotePayType === 'WARRANTY'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-900 hover:text-black hover:bg-slate-300'
                      }`}
                    >
                      Warranty ($121.78)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuotePayType('INTERNAL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        quotePayType === 'INTERNAL'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-900 hover:text-black hover:bg-slate-300'
                      }`}
                    >
                      Internal ($135.00)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-slate-950 font-black text-xs">Rate:</label>
                  <div className="relative w-24">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-950 font-black text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={defaultRate === 0 || !defaultRate ? '' : defaultRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newRate = val === '' ? 0 : Number(val);
                        setDefaultRate(newRate);
                        setLaborItems(prev => prev.map(item => ({
                          ...item,
                          hourlyRate: newRate,
                          subtotal: Number(((Number(item.laborHours) || 0) * newRate).toFixed(2))
                        })));
                      }}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== '' && !isNaN(Number(val))) {
                          const newRate = Number(Number(val).toFixed(2));
                          setDefaultRate(newRate);
                          setLaborItems(prev => prev.map(item => ({
                            ...item,
                            hourlyRate: newRate,
                            subtotal: Number(((Number(item.laborHours) || 0) * newRate).toFixed(2))
                          })));
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-lg font-black text-slate-950 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] font-black text-slate-950 uppercase">Rate Tier:</span>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-900 border border-blue-300">
                  {quotePayType === 'CUSTOMER_PAY' ? 'Customer Pay ($165.00/hr)' : quotePayType === 'WARRANTY' ? 'Warranty ($121.78/hr)' : 'Internal ($135.00/hr)'}
                </span>
              </div>
            )}
          </div>

          {/* Section 1: Labor Operations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-950 text-base">
                    {isTech ? 'Job Labor Operations' : 'Labor Operations'}
                  </h3>
                  <p className="text-xs text-slate-900 font-semibold">
                    {isTech 
                      ? 'Enter flat-rate labor hours.' 
                      : 'Labor operations, flat-rate hours, and procedures.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Direct ProDemand link right in the labor section */}
                <a
                  href="https://www.prodemand.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-black flex items-center gap-1.5 border border-blue-300 transition-colors"
                  title="Open Pro Demand to verify flat rate hours"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pro Demand Labor Times ↗</span>
                </a>

                {/* Only Service Advisors / Managers can add additional lines */}
                {isAdvisorOrManager ? (
                  <button
                    id="add-labor-line-btn"
                    onClick={() => handleAddLaborItem()}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Add an additional labor operation (Service Advisor only)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Labor Line (Advisor)</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-900 rounded-lg text-xs font-bold border border-slate-300">
                    Flat-rate hours only
                  </span>
                )}
              </div>
            </div>

            {/* Quick preset chips - Service Advisor only */}
            {isAdvisorOrManager && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-900 print:hidden">
                <span className="font-black text-slate-950 uppercase tracking-wider shrink-0 text-[10px]">
                  Advisor Extra Line Presets:
                </span>
                {COMMON_LABOR_PRESETS.slice(0, 5).map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddLaborItem(preset)}
                    className="shrink-0 px-2.5 py-1 bg-white hover:bg-blue-100 text-slate-900 hover:text-blue-950 rounded-full border border-slate-300 hover:border-blue-400 font-bold transition-colors cursor-pointer shadow-2xs"
                    title={`Add "${preset.name}" as an additional advisor line`}
                  >
                    + {preset.name.split(' ')[0]} ({preset.hours}h)
                  </button>
                ))}
              </div>
            )}

            {/* Labor Lines Table / Cards */}
            {laborItems.length === 0 ? (
              <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Wrench className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">No labor operations configured</p>
                <p className="text-xs text-slate-800 font-semibold mt-1">
                  Click "Sync RO Concerns & Correction" to load the line items from the Repair Order.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    onClick={handleMirrorROConcernsAndCorrection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Sync RO Concerns & Correction
                  </button>
                  {isAdvisorOrManager && (
                    <button
                      onClick={() => handleAddLaborItem()}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      + Add Advisor Labor Line
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {laborItems.map((item, index) => {
                  const isMirroredROLine = !item.addedByAdvisor;
                  const roLineNum = item.roLineNumber || (index + 1);
                  return (
                    <div 
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-colors space-y-2.5 ${
                        isMirroredROLine 
                          ? 'bg-slate-50/90 border-slate-300 hover:border-blue-400' 
                          : 'bg-purple-50/70 border-purple-300 hover:border-purple-400'
                      }`}
                    >
                      {/* Line Header Badge & Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMirroredROLine ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-950 border border-blue-400">
                              <FileText className="w-3 h-3 text-blue-800" />
                              <span>RO Line #{roLineNum}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-950 border border-purple-400">
                              <User className="w-3 h-3 text-purple-800" />
                              <span>Added by Service Advisor</span>
                            </span>
                          )}

                          {isMirroredROLine && cleanRO.correction && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Correction Documented</span>
                            </span>
                          )}

                          {/* Line Status Tag */}
                          {lineStatuses[roLineNum] === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-400">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Approved</span>
                            </span>
                          )}
                          {lineStatuses[roLineNum] === 'DECLINED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-400">
                              <XCircle className="w-3 h-3 text-rose-700" />
                              <span>Declined</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Each Line Approve / Declined Action Buttons */}
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleToggleLineStatus(roLineNum, 'APPROVED')}
                              className={`px-2.5 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                                (lineStatuses[roLineNum] || 'PENDING') === 'APPROVED'
                                  ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-500'
                                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={lineStatuses[roLineNum] === 'APPROVED' ? 'Line is Approved (Click to reset)' : 'Approve this line'}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLineStatus(roLineNum, 'DECLINED')}
                              className={`px-2.5 py-1 rounded text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                                (lineStatuses[roLineNum] || 'PENDING') === 'DECLINED'
                                  ? 'bg-rose-600 text-white shadow-2xs ring-1 ring-rose-500'
                                  : 'text-slate-700 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={lineStatuses[roLineNum] === 'DECLINED' ? 'Line is Declined (Click to reset)' : 'Decline this line'}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Declined</span>
                            </button>
                          </div>

                          {/* Remove Button - Only Service Advisors can delete lines */}
                          {isAdvisorOrManager && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLaborItem(item.id)}
                              className="p-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors print:hidden cursor-pointer"
                              title={isMirroredROLine ? "Remove line from quote" : "Delete advisor added labor item"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mirrored Concern & Correction Display when from RO */}
                      {isMirroredROLine && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-white p-2.5 rounded-lg border border-slate-300">
                          {/* 1. Customer Stated Complaint */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider block">
                              1. Customer Complaint:
                            </span>
                            <p className="font-bold text-slate-950 text-xs leading-snug">
                              {item.concernText || cleanRO.concerns?.[roLineNum - 1] || cleanRO.primaryConcern}
                            </p>
                          </div>

                          {/* 2. Cause (Technician Diagnostic Findings) */}
                          <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-slate-200 pt-1.5 md:pt-0 md:pl-2.5">
                            <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block">
                              2. Cause:
                            </span>
                            <p className="font-bold text-amber-950 text-xs leading-snug font-mono">
                              {cleanRO.concernCauses?.[roLineNum - 1] || parseLineFromCombinedText(cleanRO.cause, roLineNum) || (
                                <span className="italic text-slate-800 font-sans font-medium">Pending diagnosis</span>
                              )}
                            </p>
                          </div>

                          {/* 3. Correction (Repair Procedure / Action Taken) */}
                          <div className="space-y-0.5 border-t md:border-t-0 md:border-l border-slate-200 pt-1.5 md:pt-0 md:pl-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-emerald-950 uppercase tracking-wider block">
                                3. Correction:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCorrectionInput(item.correctionText || cleanRO.concernCorrections?.[roLineNum - 1] || parseLineFromCombinedText(cleanRO.correction, roLineNum) || '');
                                  setShowCorrectionEditor(true);
                                }}
                                className="text-[10px] text-blue-700 hover:text-blue-900 font-black flex items-center gap-1 cursor-pointer"
                                title="Edit correction on the Repair Order"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>{cleanRO.correction || cleanRO.concernCorrections?.[roLineNum - 1] ? 'Edit' : '+ Add'}</span>
                              </button>
                            </div>
                            <p className="font-bold text-emerald-950 text-xs leading-snug font-mono">
                              {item.correctionText || cleanRO.concernCorrections?.[roLineNum - 1] || parseLineFromCombinedText(cleanRO.correction, roLineNum) || (
                                <span className="italic text-slate-800 font-sans font-medium">Pending technician repair plan</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className="text-xs font-black text-slate-950 w-5 shrink-0">#{index + 1}</span>

                        {/* Operation Description */}
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            placeholder="Correction..."
                            value={item.description}
                            onChange={(e) => handleUpdateLaborItem(item.id, { description: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
                          />
                          {!isMirroredROLine && (
                            <span className="text-[10px] text-slate-600 font-semibold mt-0.5 block">
                              Advisor added custom labor operation
                            </span>
                          )}
                        </div>

                        {/* Labor Hours (ProDemand) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-[11px] font-black text-slate-950 uppercase">Hours:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder=""
                            value={item.laborHours === 0 || item.laborHours === undefined || (item.laborHours as any) === '' ? '' : item.laborHours}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateLaborItem(item.id, { 
                                laborHours: val === '' ? ('' as any) : Number(val) 
                              });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-20 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-950 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Hourly Rate & Pay Type (Hidden from Tech) */}
                        {!isTech && (
                          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                            {/* Pay Type Selector */}
                            <div className="flex items-center gap-1 shrink-0">
                              <label className="text-[11px] font-black text-slate-950 uppercase">Pay:</label>
                              <select
                                value={item.payType || quotePayType}
                                onChange={(e) => {
                                  const newPT = e.target.value as ConcernPayType;
                                  const newR = PAY_TYPE_RATES[newPT] || 165.00;
                                  handleUpdateLaborItem(item.id, { 
                                    payType: newPT,
                                    hourlyRate: newR,
                                    subtotal: Number(((Number(item.laborHours) || 0) * newR).toFixed(2))
                                  });
                                }}
                                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                              >
                                <option value="CUSTOMER_PAY">Customer Pay ($165.00)</option>
                                <option value="WARRANTY">Warranty ($121.78)</option>
                                <option value="INTERNAL">Internal ($135.00)</option>
                              </select>
                            </div>

                            {/* Rate input */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <label className="text-[11px] font-black text-slate-950 uppercase">Rate:</label>
                              <div className="relative w-22">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-950 font-black text-xs">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={item.hourlyRate === 0 || item.hourlyRate === undefined || (item.hourlyRate as any) === '' ? '' : item.hourlyRate}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateLaborItem(item.id, { 
                                      hourlyRate: val === '' ? ('' as any) : Number(val) 
                                    });
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val !== '' && !isNaN(Number(val))) {
                                      handleUpdateLaborItem(item.id, { 
                                        hourlyRate: Number(Number(val).toFixed(2)) 
                                      });
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Line Subtotal (Hidden from Tech) */}
                        {!isTech && (
                          <div className="text-right w-24 shrink-0">
                            <span className="text-[10px] text-slate-950 block uppercase font-black">Subtotal</span>
                            <span className="text-sm font-black text-slate-950 font-mono">
                              ${(item.subtotal || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes / Warranty Operation code */}
                      <div className="flex items-center gap-3 pl-8">
                        <input
                          type="text"
                          placeholder="Optional labor notes or Warranty op code"
                          value={item.techNotes && !item.techNotes.startsWith('Cause:') ? item.techNotes : ''}
                          onChange={(e) => handleUpdateLaborItem(item.id, { techNotes: e.target.value })}
                          className="w-full px-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium placeholder:text-slate-500 focus:bg-white focus:outline-none"
                        />
                      </div>

                      {/* Parts assigned to this Line and Line Total (Labor + Parts) */}
                      {(() => {
                        const partsForThisLine = partsItems.filter(p => (p.roLineNumber || 1) === roLineNum);
                        const linePartsSubtotal = partsForThisLine.reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0);
                        const lineTotal = (Number(item.subtotal) || 0) + linePartsSubtotal;

                        return (
                          <div className="pt-2 border-t border-slate-200/80 space-y-1.5 pl-8">
                            {partsForThisLine.length > 0 && (
                              <div className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 text-xs">
                                <div className="flex items-center justify-between font-bold text-amber-950 text-[11px] mb-1">
                                  <span className="flex items-center gap-1">
                                    <Package className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Parts for Line #{roLineNum} ({partsForThisLine.length}):</span>
                                  </span>
                                  <span className="font-mono">${linePartsSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="space-y-1">
                                  {partsForThisLine.map(p => {
                                    const roPart = cleanRO.parts?.find(rp => rp.id === p.sourcePartId || rp.partNumber === p.partNumber || rp.description.toLowerCase() === p.description.toLowerCase());
                                    const availability = roPart ? (roPart.status === 'IN_STOCK' ? 'In Stock' : roPart.estimatedArrival || roPart.status.replace(/_/g, ' ')) : 'Quoted on Estimate';
                                    const isQuoteOnly = roPart?.status === 'QUOTE_ONLY' || roPart?.requestType === 'QUOTE_ONLY';

                                    return (
                                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-900 font-medium bg-white p-1.5 rounded border border-amber-200 gap-1.5 shadow-2xs">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-extrabold text-slate-950">{p.description}</span>
                                          {p.partNumber && (
                                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                                              #{p.partNumber}
                                            </span>
                                          )}
                                          <span className="text-slate-400">•</span>
                                          <span className="text-slate-700 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                            Qty: {p.quantity}
                                          </span>
                                          <span className="text-slate-400">•</span>
                                          <span className="font-mono font-bold text-emerald-800">
                                            ${(Number(p.unitPrice) || 0).toFixed(2)} ea
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {isQuoteOnly && (
                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300">
                                              Quote Only
                                            </span>
                                          )}
                                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                                            Avail: {availability}
                                          </span>
                                          <span className="font-mono font-black text-slate-950 text-xs">
                                            ${(Number(p.subtotal) || 0).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {!isTech && (
                              <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold">
                                <span className="text-indigo-950 text-[11px] uppercase tracking-wider font-black">
                                  Line #{roLineNum} Total (Labor ${(Number(item.subtotal) || 0).toFixed(2)} + Parts ${linePartsSubtotal.toFixed(2)}):
                                </span>
                                <span className="font-mono text-sm font-black text-indigo-950">
                                  ${lineTotal.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Evidence & Inspection Photos for Line #{roLineNum} */}
                      <LinePhotoSection
                        roId={cleanRO.id}
                        roLineNumber={roLineNum}
                        concernIndex={roLineNum - 1}
                        photos={cleanRO.linePhotos}
                        lineTitle={item.concernText || item.description}
                      />
                    </div>
                  );
                })}

                {/* Labor Subtotal Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-black text-blue-950">
                  <div className="flex items-center gap-4">
                    <span>Total Operations: {laborItems.length}</span>
                    <span>Total Estimated Labor Time: {totalLaborHours.toFixed(1)} hrs</span>
                  </div>
                  {!isTech && (
                    <div className="text-sm font-black font-mono text-blue-950">
                      Labor Total: ${totalLaborCost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Required Parts & Materials */}
          {isTech ? (
            <div className="bg-slate-50 rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-base">Required Parts & Materials</h3>
                    <p className="text-xs text-slate-900 font-semibold">
                      Parts pricing and inventory sourcing are managed exclusively by the Parts Department
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 rounded-lg text-xs font-bold border border-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Managed by Parts Specialist</span>
                </div>
              </div>

              {activeQuoteRO.parts && activeQuoteRO.parts.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-black text-slate-950 uppercase tracking-wider">
                    Parts Logged for this Repair Order ({activeQuoteRO.parts.length})
                  </div>
                  <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-300 overflow-hidden shadow-2xs">
                    {activeQuoteRO.parts.map((p, idx) => (
                      <div key={p.id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-950 text-sm block">{p.description || p.name}</span>
                          {p.partNumber && (
                            <span className="text-xs font-mono text-slate-950 font-bold">Part #: <strong>{p.partNumber}</strong></span>
                          )}
                          {p.notes && (
                            <p className="text-[11px] text-slate-900 italic mt-0.5 font-medium">{p.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="px-2.5 py-1 bg-slate-200 text-slate-950 font-black rounded-lg border border-slate-300 text-xs">
                            Qty: {p.quantity || 1}
                          </span>
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-950 font-black rounded-lg border border-blue-300 text-[11px] uppercase">
                            {p.status?.replace(/_/g, ' ') || 'LOGGED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 flex items-start sm:items-center gap-3 shadow-2xs">
                  <Package className="w-5 h-5 text-slate-600 shrink-0 mt-0.5 sm:mt-0" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-slate-950 block">No parts currently logged on this RO.</span>
                    <span>If this job requires replacement parts, use the <strong>"Request Parts"</strong> button on your dashboard to submit a parts requisition to the Parts Counter.</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-base">Required Parts & Materials</h3>
                    <p className="text-xs text-slate-900 font-semibold">
                      OEM or aftermarket parts required to complete the repair
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 rounded-lg text-xs font-bold border border-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Managed by Parts Specialist</span>
                </div>
              </div>

              {partsItems.length === 0 ? (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Package className="w-7 h-7 text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-900">No parts on quote yet (Labor only)</p>
                  <p className="text-[11px] text-slate-800 font-semibold mt-0.5">
                    Parts requested through the Parts Counter will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partsItems.map((part, index) => (
                    <div
                      key={part.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-300 hover:border-slate-400 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className="text-xs font-black text-slate-950 w-5 shrink-0">#{index + 1}</span>

                        {/* Part Description */}
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            placeholder="e.g. Front Ceramic Brake Pad Set"
                            value={part.description}
                            onChange={(e) => handleUpdatePartItem(part.id, { description: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
                          />
                        </div>

                        {/* Part Number */}
                        <div className="w-36 shrink-0">
                          <input
                            type="text"
                            placeholder="Part # (optional)"
                            value={part.partNumber || ''}
                            onChange={(e) => handleUpdatePartItem(part.id, { partNumber: e.target.value })}
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-500"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-[11px] font-black text-slate-950 uppercase">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            placeholder=""
                            value={part.quantity === 0 || part.quantity === undefined || (part.quantity as any) === '' ? '' : part.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdatePartItem(part.id, { 
                                quantity: val === '' ? ('' as any) : Number(val) 
                              });
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-950 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-[11px] font-black text-slate-950 uppercase">Price:</label>
                          <div className="relative w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-950 font-black text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={part.unitPrice === 0 || part.unitPrice === undefined || (part.unitPrice as any) === '' ? '' : part.unitPrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleUpdatePartItem(part.id, { 
                                  unitPrice: val === '' ? ('' as any) : Number(val) 
                                });
                              }}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== '' && !isNaN(Number(val))) {
                                  handleUpdatePartItem(part.id, { 
                                    unitPrice: Number(Number(val).toFixed(2)) 
                                  });
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Line Subtotal */}
                        <div className="text-right w-24 shrink-0">
                          <span className="text-[10px] text-slate-950 block uppercase font-black">Subtotal</span>
                          <span className="text-sm font-black text-slate-950 font-mono">
                            ${(part.subtotal || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemovePartItem(part.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors print:hidden cursor-pointer"
                          title="Delete part item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Parts Subtotal Bar */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black text-amber-950">
                    <span>Total Parts Items: {partsItems.length}</span>
                    <span className="text-sm font-black font-mono">
                      Parts Total: ${totalPartsCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Labor Time Summary & Breakdown */}
          {isTech ? (
            <div className="max-w-2xl mx-auto w-full">
              {/* Job Labor Time Summary Card */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50/60 to-slate-50 rounded-2xl border border-blue-200 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-blue-200/80">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-950 text-base">Job Labor Time Summary</h4>
                      <p className="text-xs text-blue-900 font-bold">Estimated repair duration entered by technician</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
                      <span className="text-xs font-bold text-slate-950">Total Labor Operations:</span>
                      <span className="text-sm font-black text-slate-950">{laborItems.length} lines</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-blue-600 text-white rounded-xl shadow-sm">
                      <span className="text-xs font-black uppercase tracking-wide">Total Estimated Job Time:</span>
                      <span className="text-2xl font-black font-mono">{totalLaborHours.toFixed(1)} hrs</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 text-[11px] text-slate-900 font-bold border-t border-blue-200 mt-4 leading-relaxed">
                  Hourly labor rates, parts pricing, shop supplies, and taxes are applied automatically by the Service Advisor to generate the customer quote.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left: Settings & Notes */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-2xs space-y-3">
                  <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                    Supplies & Taxes
                  </h4>

                  {/* Shop Supplies Fee - Automatically charged unless unchecked */}
                  <div className="flex items-center justify-between gap-2 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyShopSupplies}
                        onChange={(e) => setApplyShopSupplies(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <span className="font-black text-slate-950 block">Shop Supplies & Hazmat Fee</span>
                        <span className="text-[10px] text-slate-600 font-medium">5% of labor, max $35.00 (Uncheck if waived)</span>
                      </div>
                    </label>
                    <span className={`text-xs font-mono font-black ${applyShopSupplies ? 'text-slate-950' : 'text-slate-400 line-through'}`}>
                      ${calculatedShopSupplies.toFixed(2)}
                    </span>
                  </div>

                  {/* Sales Tax */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-950">Sales Tax (Parts & Labor):</span>
                      {!isTaxExempt ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            value={taxRatePercent}
                            onChange={(e) => setTaxRatePercent(Number(e.target.value) || 0)}
                            className="w-16 px-2 py-0.5 bg-white border border-slate-300 rounded text-xs text-center font-black text-slate-950"
                            title="Sales tax rate applied to parts and labor"
                          />
                          <span className="text-xs text-slate-950 font-black">%</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase rounded border border-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
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
                            : 'bg-slate-100 hover:bg-emerald-50 text-slate-900 hover:text-emerald-900 border-slate-300 hover:border-emerald-300'
                        }`}
                        title={isTaxExempt ? "Customer is marked Tax Exempt. Click to remove exemption." : "Click if customer is Tax Exempt (0% sales tax)"}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{isTaxExempt ? 'Tax Exempt Active ✓' : 'Click if Tax Exempt'}</span>
                      </button>
                    </div>
                    <span className={`text-xs font-mono font-black ${isTaxExempt ? 'text-emerald-700' : 'text-slate-950'}`}>
                      ${estimatedTaxAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Technician Quote Remarks / Customer Explanation */}
                <div className="bg-white rounded-2xl border border-slate-300 p-4 sm:p-5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Technician Notes & Scope Details
                    </h4>
                    <span className="text-[10px] text-slate-950 font-bold">Visible to Advisor & Customer</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Explain findings, why parts are needed, warranty details (e.g. 12mo/12k mile warranty), or any secondary safety concerns observed during inspection..."
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-950 placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right: Financial Summary Card */}
              <div className="bg-slate-950 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col justify-between space-y-5 print:bg-white print:text-black print:border-2 print:border-black">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:border-black">
                    <h4 className="text-sm font-black text-white uppercase tracking-wider print:text-black">
                      Official Quote Summary
                    </h4>
                    <span className="text-xs font-mono font-bold text-white print:text-black">
                      RO #{activeQuoteRO.id}
                    </span>
                  </div>

                  <div className="space-y-3 pt-4 text-xs">
                    <div className="flex items-center justify-between text-white font-bold print:text-black">
                      <span>Labor ({totalLaborHours.toFixed(1)} hrs @ ${Number(defaultRate).toFixed(2)}/hr):</span>
                      <span className="font-mono font-black text-white print:text-black">${totalLaborCost.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-white font-bold print:text-black">
                      <span>Parts & Materials ({partsItems.length} item{partsItems.length === 1 ? '' : 's'}):</span>
                      <span className="font-mono font-black text-white print:text-black">${totalPartsCost.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-white font-bold print:text-black">
                      <span>Shop Supplies & Environmental:</span>
                      <span className="font-mono font-black text-white print:text-black">${calculatedShopSupplies.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between text-white font-bold print:text-black">
                      <span>Sales Tax (${(isTaxExempt ? 0 : Number(taxRatePercent || 0)).toFixed(2)}%):</span>
                      <span className={`font-mono font-black print:text-black ${isTaxExempt ? 'text-emerald-300' : 'text-white'}`}>${estimatedTaxAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total Callout */}
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 print:bg-slate-100 print:border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-wider block print:text-black">
                        Grand Total Estimate
                      </span>
                      <span className="text-[11px] text-slate-100 font-bold print:text-black">Parts, Labor, Supplies & Tax included</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight print:text-black">
                      ${grandTotal.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Quote Status / Metadata */}
                <div className="text-[11px] text-slate-100 font-semibold space-y-1 pt-2 border-t border-slate-800 print:border-black print:text-black">
                  <div>Initiated by: <strong className="text-white font-bold print:text-black">{quote?.initiatedByTechName || currentUser.name}</strong></div>
                  {quote?.submittedAt && (
                    <div>Submitted at: <strong className="text-white font-bold">{new Date(quote.submittedAt).toLocaleDateString()} {new Date(quote.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  )}
                  {quote?.approvedBy && (
                    <div className="text-emerald-300 print:text-black font-bold">Authorized by: {quote.approvedBy}</div>
                  )}
                  {quote?.declinedReason && (
                    <div className="text-rose-300 print:text-black font-bold">Declined reason: {quote.declinedReason}</div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Quick RO Correction Editor for Tech & Advisor */}
          {showCorrectionEditor && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3 animate-fade-in print:hidden shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>Update Technician Correction on RO #{cleanRO.id}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCorrectionEditor(false)}
                  className="text-slate-600 hover:text-slate-900 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-emerald-950 font-bold">
                This will save directly to the Repair Order and immediately mirror across all quote and labor estimate line items.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. Replaced front brake pads and rotors, lubed caliper slide pins, flushed brake fluid, and road tested 5 miles..."
                value={correctionInput}
                onChange={(e) => setCorrectionInput(e.target.value)}
                className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-950 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCorrectionEditor(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveCorrectionToRO(correctionInput)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Mirror to Estimate</span>
                </button>
              </div>
            </div>
          )}

          {/* Decline Prompt Modal for Advisor/Manager */}
          {showDeclinePrompt && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-fade-in print:hidden">
              <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Document Customer Decline Reason</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Customer decided to trade in vehicle / Price exceeded budget / Postponing until next month..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-950 font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeclinePrompt(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
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
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="close-quote-footer-btn"
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer w-full sm:w-auto text-center flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4 text-slate-700" />
              <span>Exit Quote</span>
            </button>

            {/* Print button (Hidden from Tech) */}
            {!isTech && (
              <button
                id="print-quote-footer-btn"
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Print Quote</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
            {/* If Advisor/Manager, allow one-click authorization or decline */}
            {isAdvisorOrManager && quoteStatus !== 'APPROVED' && (
              <>
                <button
                  id="decline-quote-btn"
                  type="button"
                  onClick={() => setShowDeclinePrompt(true)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Customer Declined</span>
                </button>

                <button
                  id="authorize-quote-btn"
                  type="button"
                  onClick={handleApproveQuote}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20 hover:scale-102 active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Approve Quote ($ {(Number(grandTotal) || 0).toFixed(2)})</span>
                </button>
              </>
            )}

            {/* Save as Draft (Tech or Advisor) */}
            <button
              id="save-quote-draft-btn"
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4 text-white" />
              <span>{isTech ? 'Save Labor Time' : 'Save Draft'}</span>
            </button>

            {/* Primary Action: Tech Submits to Advisor */}
            <button
              id="submit-quote-advisor-btn"
              type="button"
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4 text-white" />
              <span>
                {isTech 
                  ? `Submit Labor Time to Advisor (${totalLaborHours.toFixed(1)} hrs)` 
                  : `Submit Quote to Advisor ($ ${(Number(grandTotal) || 0).toFixed(2)})`}
              </span>
            </button>
          </div>
        </div>

      </div>
      </div>

      {/* Official Printable Repair Quote Document (Rendered via Portal directly under document.body for clean print output) */}
      {typeof document !== 'undefined' && createPortal(
        <div 
          id="printable-quote-document"
          className="bg-white text-black max-w-4xl mx-auto space-y-4 font-sans text-xs"
        >
        {/* Dealership & Repair Quote Header */}
        <div className="border-b-2 border-black pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-black uppercase">
                {shopName || 'Woolwine CDJR'}
              </div>
              <div className="text-xs font-black text-black tracking-wider uppercase mt-0.5">
                REPAIR ESTIMATE
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block px-3 py-1 bg-white text-black font-mono font-black text-sm rounded border-2 border-black">
                RO #{activeQuoteRO.id}
              </div>
              <div className="text-[11px] text-black font-bold mt-1 font-mono">
                Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[11px] font-black text-black mt-0.5">
                Status:{' '}
                {quoteStatus === 'APPROVED' && <span className="text-black font-black uppercase underline">AUTHORIZED BY CUSTOMER</span>}
                {quoteStatus === 'SUBMITTED' && <span className="text-black font-black uppercase underline">PENDING AUTHORIZATION</span>}
                {quoteStatus === 'DECLINED' && <span className="text-black font-black uppercase underline">DECLINED BY CUSTOMER</span>}
                {quoteStatus === 'DRAFT' && <span className="text-black font-black uppercase underline">ESTIMATE DRAFT</span>}
              </div>
              <div className="text-[10px] text-black font-mono font-bold mt-0.5">
                Advisor: {activeQuoteRO.advisorName}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Vehicle Information Grid */}
        <div className="grid grid-cols-4 gap-3 bg-white p-3 rounded-lg border-2 border-black text-xs">
          <div>
            <span className="text-[10px] font-black text-black uppercase block">Customer Information</span>
            <span className="font-black text-black text-sm block">{activeQuoteRO.customerName}</span>
            <span className="text-black block text-[11px] font-bold">{activeQuoteRO.customerPhone}</span>
            <div className="mt-1">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border border-black bg-white text-black">
                {isTaxExempt ? `0.00% Tax Exempt${taxExemptNumber ? ` (Cert #${taxExemptNumber})` : ''}` : 'Taxable (7.00%)'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Vehicle Year / Make / Model</span>
            <span className="font-black text-black text-sm block">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </span>
            <span className="text-black block text-[11px] font-bold">
              Mileage: {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}
            </span>
            {vehicle.engine && (
              <span className="text-black block text-[10px] font-bold">Engine: {vehicle.engine}</span>
            )}
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Vehicle VIN (17-Digit)</span>
            <span className="font-mono font-black text-black bg-white px-1.5 py-0.5 rounded border border-black inline-block text-[11px]">
              {vehicle.vin || 'N/A'}
            </span>
            <span className="text-black block text-[11px] mt-0.5 font-mono font-bold">
              Tag: RO #{activeQuoteRO.id}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-black text-black uppercase block">Service Assignment</span>
            <span className="text-black font-semibold block">
              Advisor: <strong className="font-black text-black">{activeQuoteRO.advisorName}</strong>
            </span>
            <span className="text-black font-semibold block">
              Technician: <strong className="font-black text-black">{activeQuoteRO.techName || quote?.initiatedByTechName || 'Assigned Tech'}</strong>
            </span>
          </div>
        </div>

        {/* Itemized by RO Line Items (Complaint, Concern/Cause, Correction, Labor & Parts) */}
        <div className="space-y-4">
          <div className="text-xs font-black text-black uppercase tracking-wider flex items-center justify-between border-b-2 border-black pb-1">
            <span>Itemized Repair Estimate & Work Order (By Line Item)</span>
            <span className="text-[11px] font-black text-black font-mono">
              Labor Rate: ${defaultRate.toFixed(2)}/hr ({quotePayType === 'CUSTOMER_PAY' ? 'Customer Pay' : quotePayType === 'WARRANTY' ? 'Warranty' : 'Internal'})
            </span>
          </div>

          {(activeQuoteRO.concerns && activeQuoteRO.concerns.length > 0 
            ? activeQuoteRO.concerns 
            : [activeQuoteRO.primaryConcern || 'General Inspection & Diagnostic']
          ).map((concern, idx) => {
            const lineNum = idx + 1;
            const lineLabor = laborItems.filter(item => (item.roLineNumber || 1) === lineNum);
            const lineParts = partsItems.filter(p => (p.roLineNumber || 1) === lineNum);
            const lineCause = activeQuoteRO.concernCauses?.[idx] || parseLineFromCombinedText(activeQuoteRO.cause, lineNum);
            const lineCorrection = activeQuoteRO.concernCorrections?.[idx] || parseLineFromCombinedText(activeQuoteRO.correction, lineNum);
            
            const lineLaborHoursSum = lineLabor.reduce((sum, item) => sum + (Number(item.laborHours) || 0), 0);
            const lineLaborCostSum = lineLabor.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
            const linePartsCostSum = lineParts.reduce((sum, p) => sum + (Number(p.subtotal) || 0), 0);
            const lineTotalSum = lineLaborCostSum + linePartsCostSum;

            return (
              <div 
                key={idx} 
                data-print-keep-together="true"
                className="quote-line-item border-2 border-black rounded-lg overflow-hidden space-y-0 break-inside-avoid [page-break-inside:avoid]"
                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
              >
                {/* Line Header Banner: Complaint, Concern/Cause, Correction */}
                <div className={`p-2.5 border-b-2 border-black space-y-1 ${lineStatuses[lineNum] === 'DECLINED' ? 'bg-rose-50' : 'bg-slate-100'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-white text-black border border-black">
                        Line #{lineNum}
                      </span>
                      <span className="font-black text-black text-xs">
                        1. Complaint: {concern}
                      </span>

                      {/* Approval/Declined Status Badge */}
                      {lineStatuses[lineNum] === 'APPROVED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white border border-emerald-800 flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                          <span>APPROVED</span>
                        </span>
                      )}
                      {lineStatuses[lineNum] === 'DECLINED' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-800 flex items-center gap-1 shadow-2xs">
                          <XCircle className="w-3 h-3 text-white" />
                          <span>DECLINED BY CUSTOMER</span>
                        </span>
                      )}
                      {(!lineStatuses[lineNum] || lineStatuses[lineNum] === 'PENDING') && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white text-slate-700 border border-slate-400 print:hidden flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Pending Review</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Approve / Declined Action Buttons (Screen/Interactive Mode) */}
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-black print:hidden">
                        <button
                          type="button"
                          onClick={() => handleToggleLineStatus(lineNum, 'APPROVED')}
                          className={`px-2 py-0.5 rounded text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                            lineStatuses[lineNum] === 'APPROVED'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title="Customer authorized this repair line"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLineStatus(lineNum, 'DECLINED')}
                          className={`px-2 py-0.5 rounded text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                            lineStatuses[lineNum] === 'DECLINED'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-700 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title="Customer declined this repair line"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Declined</span>
                        </button>
                      </div>

                      <span className={`font-mono text-xs font-black px-2 py-0.5 rounded border border-black ${
                        lineStatuses[lineNum] === 'DECLINED' 
                          ? 'bg-rose-100 text-rose-900 line-through' 
                          : 'bg-white text-black'
                      }`}>
                        Line Total: ${lineTotalSum.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 2. Cause & 3. Correction */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-white p-1.5 rounded border border-black">
                      <strong className="text-black uppercase text-[9px] font-black tracking-wider block">2. Cause (Diagnostic Finding):</strong>
                      <span className="font-mono font-bold text-black">{lineCause || <span className="italic text-black font-sans font-semibold">Pending diagnosis</span>}</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-black">
                      <strong className="text-black uppercase text-[9px] font-black tracking-wider block">3. Correction (Repair Procedure):</strong>
                      <span className="font-mono font-bold text-black">{lineCorrection || <span className="italic text-black font-sans font-semibold">Pending technician repair plan</span>}</span>
                    </div>
                  </div>
                </div>

                {/* Operations & Parts Table for this Line */}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-black text-[10px] font-black text-black uppercase">
                      <th className="py-1 px-2 w-16 text-center border-r border-black">Category</th>
                      <th className="py-1 px-3 border-r border-black">Description / Part #</th>
                      <th className="py-1 px-2.5 w-20 text-center border-r border-black">Qty / Hrs</th>
                      <th className="py-1 px-2.5 w-24 text-right border-r border-black">Rate / Price</th>
                      <th className="py-1 px-3 w-24 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Labor items for this line */}
                    {lineLabor.map((item) => (
                      <tr key={item.id} className="border-b border-black/30 bg-white">
                        <td className="py-1 px-2 text-center border-r border-black/30">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black border border-black bg-white text-black">Labor</span>
                        </td>
                        <td className="py-1 px-3 border-r border-black/30">
                          <span className="font-bold text-black">{item.description}</span>
                          {item.techNotes && !item.techNotes.startsWith('Cause:') && (
                            <div className="text-[10px] text-black font-mono font-bold">{item.techNotes}</div>
                          )}
                        </td>
                        <td className="py-1 px-2.5 text-center font-mono font-bold text-black border-r border-black/30">
                          {(Number(item.laborHours) || 0).toFixed(1)}h
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-black border-r border-black/30">
                          ${(Number(item.hourlyRate) || 0).toFixed(2)}
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-black text-black">
                          ${(Number(item.subtotal) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {/* Parts items for this line */}
                    {lineParts.map((part) => (
                      <tr key={part.id} className="border-b border-black/30 bg-white">
                        <td className="py-1 px-2 text-center border-r border-black/30">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black border border-black bg-white text-black">Part</span>
                        </td>
                        <td className="py-1 px-3 border-r border-black/30">
                          <span className="font-bold text-black">{part.description}</span>
                          {part.partNumber && <span className="text-[10px] text-black font-mono font-bold ml-1.5">#{part.partNumber}</span>}
                        </td>
                        <td className="py-1 px-2.5 text-center font-mono font-bold text-black border-r border-black/30">
                          {part.quantity}
                        </td>
                        <td className="py-1 px-2.5 text-right font-mono font-bold text-black border-r border-black/30">
                          ${(Number(part.unitPrice) || 0).toFixed(2)}
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-black text-black">
                          ${(Number(part.subtotal) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {lineLabor.length === 0 && lineParts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-2 text-center text-black font-bold italic text-[11px]">
                          No labor or parts priced for this line yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-black">
                      <td colSpan={4} className="py-1 px-3 text-right text-black uppercase text-[10px] font-black">
                        Line #{lineNum} Subtotal (Labor ${lineLaborCostSum.toFixed(2)} + Parts ${linePartsCostSum.toFixed(2)}):
                      </td>
                      <td className="py-1 px-3 text-right font-mono font-black text-black text-xs">
                        ${lineTotalSum.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Photographic Evidence for this Line (Customer Estimate View) */}
                {(() => {
                  const photosForLine = (cleanRO.linePhotos || []).filter(p => p.roLineNumber === lineNum || p.concernIndex === idx);
                  if (photosForLine.length === 0) return null;
                  return (
                    <div className="bg-slate-50 p-2.5 border-t-2 border-black">
                      <div className="text-[10px] font-black uppercase text-black mb-1.5 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-black" />
                        <span>Line #{lineNum} Photographic Evidence ({photosForLine.length} {photosForLine.length === 1 ? 'photo' : 'photos'}):</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {photosForLine.map((photo, pIdx) => (
                          <div key={photo.id} className="w-20 h-20 rounded-md border-2 border-black overflow-hidden shrink-0 bg-white shadow-2xs">
                            <img 
                              src={photo.thumbnailUrl || photo.dataUrl} 
                              alt={photo.caption || `Line ${lineNum} Photo ${pIdx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}

          {/* Additional Advisor Labor Operations (if any) */}
          {laborItems.filter(item => item.addedByAdvisor).length > 0 && (
            <div 
              data-print-keep-together="true"
              className="quote-line-item border-2 border-black rounded-lg overflow-hidden space-y-0 break-inside-avoid [page-break-inside:avoid]"
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <div className="bg-slate-100 p-2 border-b-2 border-black flex items-center justify-between text-xs font-black text-black">
                <span>Additional Service Advisor Operations</span>
                <span>
                  ${laborItems.filter(item => item.addedByAdvisor).reduce((s, i) => s + (Number(i.subtotal) || 0), 0).toFixed(2)}
                </span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <tbody>
                  {laborItems.filter(item => item.addedByAdvisor).map((item) => (
                    <tr key={item.id} className="border-b border-black/30 bg-white">
                      <td className="py-1 px-3 font-bold text-black">{item.description}</td>
                      <td className="py-1 px-2.5 w-20 text-center font-mono font-bold text-black">{(Number(item.laborHours) || 0).toFixed(1)}h</td>
                      <td className="py-1 px-2.5 w-24 text-right font-mono font-bold text-black">${(Number(item.hourlyRate) || 0).toFixed(2)}</td>
                      <td className="py-1 px-3 w-24 text-right font-mono font-black text-black">${(Number(item.subtotal) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Financial Totals & Policies */}
        <div 
          data-print-keep-together="true"
          className="quote-summary-block space-y-3 pt-1 break-inside-avoid [page-break-inside:avoid]"
          style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Manufacturer Warranty Disclaimer */}
            <div className="border-2 border-black rounded-lg bg-white overflow-hidden text-black p-3.5 flex flex-col justify-center">
              <p className="text-[9.5px] leading-relaxed text-black font-bold uppercase text-justify">
                ANY WARRANTIES ON THE PRODUCT SOLD HEREBY ARE THOSE MADE BY THE MANUFACTURER. THE SELLER HEREBY EXPRESSLY DISCLAIMS ALL WARRANTIES, EITHER EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE, AND THE SELLER NEITHER ASSUMES NOR AUTHORIZES ANY OTHER PERSON TO ASSUME FOR IT ANY LIABILITY IN CONNECTION WITH THE SALE OF SAID PRODUCTS.
              </p>
            </div>

            {/* Right: Totals Table */}
            <div className="border-2 border-black rounded-lg overflow-hidden bg-white">
              <div className="bg-slate-100 px-3 py-1 border-b-2 border-black font-black text-xs uppercase tracking-wider text-black">
                Official Quote Summary
              </div>
              <div className="p-2.5 space-y-1 text-xs">
                <div className="flex justify-between text-black font-bold">
                  <span>Labor Total ({totalLaborHours.toFixed(1)} hrs):</span>
                  <span className="font-mono font-black text-black">${totalLaborCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-black font-bold">
                  <span>Parts & Materials ({partsItems.length} items):</span>
                  <span className="font-mono font-black text-black">${totalPartsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-black font-bold">
                  <span>Shop Supplies & Environmental:</span>
                  <span className="font-mono font-black text-black">${calculatedShopSupplies.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-black font-bold">
                  <span>Sales Tax (${(isTaxExempt ? 0 : Number(taxRatePercent || 0)).toFixed(2)}%):</span>
                  <span className="font-mono font-black text-black">${estimatedTaxAmount.toFixed(2)}</span>
                </div>
                {totalDeclinedAmount > 0 && (
                  <div className="pt-1.5 mt-1 border-t border-black/30 space-y-1">
                    <div className="flex justify-between text-emerald-900 font-bold">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-700" /> Authorized Repairs:</span>
                      <span className="font-mono font-black">${totalApprovedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-rose-900 font-bold">
                      <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-700" /> Declined Operations:</span>
                      <span className="font-mono font-black">-${totalDeclinedAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 mt-1 border-t-2 border-black font-black">
                  <span className="text-black uppercase text-xs font-black">Grand Total Estimate:</span>
                  <span className="font-mono text-black text-lg font-black">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer / Management Approval Section */}
          <div className="border-2 border-black rounded-lg p-3 bg-white">
            <div className="flex items-end justify-between gap-6 text-black">
              <div className="flex-[2] flex items-baseline gap-2">
                <span className="font-black text-xs uppercase tracking-wider text-black shrink-0">
                  APPROVED BY:
                </span>
                <div className="flex-1 border-b-2 border-black min-h-[20px] pb-0.5">
                  {activeQuoteRO.quote?.approvedBy ? (
                    <span className="font-black text-xs uppercase font-mono text-black">
                      {activeQuoteRO.quote.approvedBy}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="w-48 flex items-baseline gap-2">
                <span className="font-black text-xs uppercase tracking-wider text-black shrink-0">
                  DATE:
                </span>
                <div className="flex-1 border-b-2 border-black min-h-[20px] pb-0.5 text-center">
                  {activeQuoteRO.quote?.approvedAt ? (
                    <span className="font-black text-xs font-mono text-black">
                      {new Date(activeQuoteRO.quote.approvedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="w-40 flex items-baseline gap-2">
                <span className="font-black text-xs uppercase tracking-wider text-black shrink-0">
                  TIME:
                </span>
                <div className="flex-1 border-b-2 border-black min-h-[20px] pb-0.5 text-center">
                  {activeQuoteRO.quote?.approvedAt ? (
                    <span className="font-black text-xs font-mono text-black">
                      {new Date(activeQuoteRO.quote.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

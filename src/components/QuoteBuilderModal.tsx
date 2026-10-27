import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  DollarSign, 
  Clock, 
  Package, 
  FileText, 
  CheckCircle2, 
  Printer, 
  ArrowRight, 
  Search, 
  Filter, 
  Sparkles, 
  Car, 
  User, 
  Phone, 
  Mail, 
  Layers, 
  Building2, 
  ShieldCheck, 
  AlertCircle,
  Hash,
  ChevronDown,
  Calendar,
  Save,
  Check,
  Zap,
  ExternalLink,
  Copy,
  Receipt,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  StandaloneQuote, 
  StandaloneQuoteLine, 
  StandaloneQuotePart, 
  StandaloneQuoteStatus, 
  ConcernPayType 
} from '../types';
import { MENU_SERVICE_TEMPLATES, MenuPackageTemplate } from '../data/menuServiceTemplates';
import { decodeVin } from '../utils/vinDecoder';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { QuotePrintSheet } from './QuotePrintSheet';
import { RollToROModal } from './RollToROModal';
import { PriceField } from './PriceField';

interface QuoteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuoteId?: string | null;
}

const DEFAULT_SHOP_RATE = 165.00;
const DEFAULT_TAX_RATE = 0.07;

export const QuoteBuilderModal: React.FC<QuoteBuilderModalProps> = ({
  isOpen,
  onClose,
  initialQuoteId
}) => {
  const { 
    quotes, 
    createStandaloneQuote, 
    updateStandaloneQuote, 
    deleteStandaloneQuote,
    currentUser, 
    users, 
    repairOrders,
    setSelectedRO
  } = useApp();

  // Tabs: BUILDER vs SAVED_QUOTES
  const [activeTab, setActiveTab] = useState<'BUILDER' | 'SAVED_QUOTES'>('BUILDER');
  
  // Active quote state being edited
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(initialQuoteId || null);
  
  // Customer & Vehicle fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState<string | number>('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [engine, setEngine] = useState('');
  const [mileage, setMileage] = useState<string | number>('');
  const [licensePlate, setLicensePlate] = useState('');
  const [advisorId, setAdvisorId] = useState(currentUser.id);
  const [expirationDays, setExpirationDays] = useState<number>(30);
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<StandaloneQuoteStatus>('DRAFT');

  // Job lines
  const [lines, setLines] = useState<StandaloneQuoteLine[]>([]);
  const [defaultLaborRate, setDefaultLaborRate] = useState<number>(DEFAULT_SHOP_RATE);
  const [applyShopSupplies, setApplyShopSupplies] = useState<boolean>(true);
  const [manualShopSupplies, setManualShopSupplies] = useState<number | null>(null);
  const [isTaxExempt, setIsTaxExempt] = useState<boolean>(false);
  const [taxExemptNumber, setTaxExemptNumber] = useState<string>('');

  // Modals inside Quote Builder
  const [isMenuTemplateModalOpen, setIsMenuTemplateModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isRollModalOpen, setIsRollModalOpen] = useState(false);
  const [selectedQuoteForRoll, setSelectedQuoteForRoll] = useState<StandaloneQuote | null>(null);
  const [selectedQuoteForPrint, setSelectedQuoteForPrint] = useState<StandaloneQuote | null>(null);

  // Search & Filter in Saved Quotes tab
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StandaloneQuoteStatus | 'ALL'>('ALL');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Auto-Save State & Tracking
  const STORAGE_KEY_QUOTE_DRAFT = 'applet_quote_builder_active_draft';
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const isInitialMountRef = useRef<boolean>(true);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Sync with initialQuoteId or restore unsaved local draft
  useEffect(() => {
    if (!isOpen) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      return;
    }

    isInitialMountRef.current = true;

    if (initialQuoteId) {
      loadQuoteIntoForm(initialQuoteId);
      setActiveTab('BUILDER');
    } else if (!editingQuoteId) {
      // Restore locally stored in-progress draft if available
      try {
        const savedDraftRaw = localStorage.getItem(STORAGE_KEY_QUOTE_DRAFT);
        if (savedDraftRaw) {
          const draft = JSON.parse(savedDraftRaw);
          setEditingQuoteId(draft.editingQuoteId || null);
          setCustomerName(draft.customerName || '');
          setCustomerPhone(draft.customerPhone || '');
          setCustomerEmail(draft.customerEmail || '');
          setVin(draft.vin || '');
          setYear(draft.year || '');
          setMake(draft.make || '');
          setModel(draft.model || '');
          setEngine(draft.engine || '');
          setMileage(draft.mileage || '');
          setLicensePlate(draft.licensePlate || '');
          setAdvisorId(draft.advisorId || currentUser.id);
          setCustomerNotes(draft.customerNotes || '');
          setInternalNotes(draft.internalNotes || '');
          setQuoteStatus(draft.quoteStatus || 'DRAFT');
          setLines(draft.lines && draft.lines.length > 0 ? draft.lines : [
            {
              id: `line_${Date.now()}_1`,
              lineNum: 1,
              concern: 'General Service & Diagnostic Inspection',
              payType: 'CUSTOMER_PAY',
              laborHours: 1.0,
              laborRate: DEFAULT_SHOP_RATE,
              laborSubtotal: DEFAULT_SHOP_RATE,
              parts: []
            }
          ]);
          setDefaultLaborRate(draft.defaultLaborRate || DEFAULT_SHOP_RATE);
          setApplyShopSupplies(draft.applyShopSupplies ?? true);
          setManualShopSupplies(draft.manualShopSupplies !== undefined ? draft.manualShopSupplies : null);
          setIsTaxExempt(draft.isTaxExempt || false);
          setTaxExemptNumber(draft.taxExemptNumber || '');
          if (draft.savedAtTime) {
            setLastAutoSaveTime(draft.savedAtTime);
            setAutoSaveStatus('saved');
          }
        } else if (lines.length === 0) {
          resetFormToNew();
        }
      } catch {
        resetFormToNew();
      }
    }

    const timer = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, initialQuoteId]);

  const loadQuoteIntoForm = (quoteId: string) => {
    const q = quotes.find(item => item.id === quoteId);
    if (!q) return;

    setEditingQuoteId(q.id);
    setCustomerName(q.customerName);
    setCustomerPhone(q.customerPhone);
    setCustomerEmail(q.customerEmail || '');
    setVin(q.vehicle.vin || '');
    setYear(q.vehicle.year || '');
    setMake(q.vehicle.make || '');
    setModel(q.vehicle.model || '');
    setEngine(q.vehicle.engine || '');
    setMileage(q.vehicle.mileage || '');
    setLicensePlate(q.vehicle.licensePlate || '');
    setAdvisorId(q.advisorId || currentUser.id);
    setCustomerNotes(q.customerNotes || '');
    setInternalNotes(q.internalNotes || '');
    setQuoteStatus(q.status);
    setLines(q.lines || []);
    setDefaultLaborRate(q.defaultLaborRate || DEFAULT_SHOP_RATE);
    setApplyShopSupplies(q.applyShopSupplies ?? true);
    setManualShopSupplies(q.shopSuppliesFee !== undefined ? q.shopSuppliesFee : null);
    setIsTaxExempt(q.isTaxExempt || false);
    setTaxExemptNumber(q.taxExemptNumber || '');
    setActiveTab('BUILDER');
  };

  const resetFormToNew = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_QUOTE_DRAFT);
    } catch {}
    setAutoSaveStatus('idle');
    setLastAutoSaveTime(null);
    setEditingQuoteId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setVin('');
    setYear('');
    setMake('');
    setModel('');
    setEngine('');
    setMileage('');
    setLicensePlate('');
    setAdvisorId(currentUser.id);
    setExpirationDays(30);
    setCustomerNotes('');
    setInternalNotes('');
    setQuoteStatus('DRAFT');
    setDefaultLaborRate(DEFAULT_SHOP_RATE);
    setApplyShopSupplies(true);
    setManualShopSupplies(null);
    setIsTaxExempt(false);
    setTaxExemptNumber('');
    
    // Start with 1 default blank line
    setLines([
      {
        id: `line_${Date.now()}_1`,
        lineNum: 1,
        concern: 'General Service & Diagnostic Inspection',
        payType: 'CUSTOMER_PAY',
        laborHours: 1.0,
        laborRate: DEFAULT_SHOP_RATE,
        laborSubtotal: DEFAULT_SHOP_RATE,
        parts: []
      }
    ]);
  };

  // VIN Auto-decode
  const handleVinDecode = async () => {
    if (!vin.trim()) return;
    const decoded = await decodeVin(vin.trim());
    if (decoded.year) setYear(decoded.year);
    if (decoded.make) setMake(decoded.make);
    if (decoded.model) setModel(decoded.model);
    if (decoded.bodyClass || decoded.trim) setEngine(decoded.bodyClass || decoded.trim || '');
    if (decoded.success) {
      triggerToast(`✓ Decoded VIN: ${decoded.year || ''} ${decoded.make || ''} ${decoded.model || ''}`);
    }
  };

  // Financial Calculations
  const financials = useMemo(() => {
    let totalLaborHours = 0;
    let totalLaborCost = 0;
    let totalPartsCost = 0;
    let totalWholesaleCost = 0;

    lines.forEach(line => {
      totalLaborHours += Number(line.laborHours) || 0;
      totalLaborCost += Number(line.laborSubtotal) || 0;

      (line.parts || []).forEach(part => {
        const pQty = Number(part.quantity) || 1;
        const pPrice = Number(part.price) || 0;
        const pCost = Number(part.cost) || 0;
        const pSubtotal = part.subtotal !== undefined && part.subtotal !== null && !isNaN(Number(part.subtotal))
          ? Number(part.subtotal)
          : pPrice * pQty;
        
        totalPartsCost += pSubtotal;
        totalWholesaleCost += pCost * pQty;
      });
    });

    // Shop supplies: manual override if entered by user, otherwise 8% of labor capped at $35.00
    const calculatedSupplies = Math.min(35.00, Number((totalLaborCost * 0.08).toFixed(2)));
    const shopSuppliesFee = applyShopSupplies
      ? (manualShopSupplies !== null ? Math.max(0, Number(manualShopSupplies)) : calculatedSupplies)
      : 0;

    // Tax calculation
    const taxableAmount = totalLaborCost + totalPartsCost + shopSuppliesFee;
    const taxRate = isTaxExempt ? 0 : DEFAULT_TAX_RATE;
    const taxAmount = isTaxExempt ? 0 : Number((taxableAmount * taxRate).toFixed(2));
    const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

    // Profit & Margin
    const totalRevenue = totalLaborCost + totalPartsCost;
    const grossProfit = totalRevenue - totalWholesaleCost;
    const grossProfitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalLaborHours: Number(totalLaborHours.toFixed(1)),
      totalLaborCost: Number(totalLaborCost.toFixed(2)),
      totalPartsCost: Number(totalPartsCost.toFixed(2)),
      totalWholesaleCost: Number(totalWholesaleCost.toFixed(2)),
      shopSuppliesFee,
      calculatedSupplies,
      taxRate,
      taxAmount,
      grandTotal,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossProfitMargin
    };
  }, [lines, applyShopSupplies, manualShopSupplies, isTaxExempt]);

  // Continuous Auto-Save Engine (Saves draft locally & syncs to AppContext / Firestore)
  useEffect(() => {
    if (!isOpen || isInitialMountRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('saving');

    autoSaveTimerRef.current = setTimeout(() => {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Save full draft to localStorage
      const draftPayload = {
        editingQuoteId,
        customerName,
        customerPhone,
        customerEmail,
        vin,
        year,
        make,
        model,
        engine,
        mileage,
        licensePlate,
        advisorId,
        customerNotes,
        internalNotes,
        quoteStatus,
        lines,
        defaultLaborRate,
        applyShopSupplies,
        manualShopSupplies,
        isTaxExempt,
        taxExemptNumber,
        savedAt: new Date().toISOString(),
        savedAtTime: nowTime
      };

      try {
        localStorage.setItem(STORAGE_KEY_QUOTE_DRAFT, JSON.stringify(draftPayload));
      } catch {}

      // 2. Synchronize to AppContext / Firestore if there is meaningful data entered
      const hasMeaningfulData = customerName.trim().length > 0 || vin.trim().length > 0 || lines.some(l => l.concern.trim().length > 0 || (l.parts && l.parts.length > 0));

      if (hasMeaningfulData) {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + (expirationDays || 30));
        const advisorUser = users.find(u => u.id === advisorId);

        const quotePayload: Omit<StandaloneQuote, 'id' | 'quoteNumber' | 'createdAt' | 'updatedAt'> = {
          advisorId,
          advisorName: advisorUser ? advisorUser.name : (currentUser.name || 'Service Advisor'),
          customerName: customerName.trim() || 'Draft Quote',
          customerPhone: customerPhone.trim() || '(555) 000-0000',
          customerEmail: customerEmail.trim() || undefined,
          vehicle: {
            year: year || '',
            make: make.trim() || 'Vehicle',
            model: model.trim() || '',
            vin: vin.trim() || undefined,
            engine: engine.trim() || undefined,
            mileage: mileage ? Number(mileage) : undefined,
            licensePlate: licensePlate.trim() || undefined
          },
          status: quoteStatus || 'DRAFT',
          expirationDate: expDate.toISOString(),
          lines,
          defaultLaborRate,
          applyShopSupplies,
          shopSuppliesFee: financials.shopSuppliesFee,
          taxRate: financials.taxRate,
          taxAmount: financials.taxAmount,
          isTaxExempt,
          taxExemptNumber: isTaxExempt ? taxExemptNumber : undefined,
          totalLaborHours: financials.totalLaborHours,
          totalLaborCost: financials.totalLaborCost,
          totalPartsCost: financials.totalPartsCost,
          grandTotal: financials.grandTotal,
          customerNotes: customerNotes.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined
        };

        if (editingQuoteId) {
          updateStandaloneQuote(editingQuoteId, quotePayload);
        } else {
          const created = createStandaloneQuote(quotePayload);
          setEditingQuoteId(created.id);
          draftPayload.editingQuoteId = created.id;
          try {
            localStorage.setItem(STORAGE_KEY_QUOTE_DRAFT, JSON.stringify(draftPayload));
          } catch {}
        }
      }

      setAutoSaveStatus('saved');
      setLastAutoSaveTime(nowTime);
    }, 700);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    isOpen,
    editingQuoteId,
    customerName,
    customerPhone,
    customerEmail,
    vin,
    year,
    make,
    model,
    engine,
    mileage,
    licensePlate,
    advisorId,
    customerNotes,
    internalNotes,
    quoteStatus,
    lines,
    defaultLaborRate,
    applyShopSupplies,
    manualShopSupplies,
    isTaxExempt,
    taxExemptNumber,
    expirationDays,
    financials
  ]);

  // Add Blank Job Line
  const handleAddBlankLine = () => {
    const nextLineNum = lines.length + 1;
    setLines(prev => [
      ...prev,
      {
        id: `line_${Date.now()}_${nextLineNum}`,
        lineNum: nextLineNum,
        concern: `Line ${nextLineNum} Service / Concern`,
        payType: 'CUSTOMER_PAY',
        laborHours: 1.0,
        laborRate: defaultLaborRate,
        laborSubtotal: defaultLaborRate,
        parts: []
      }
    ]);
  };

  // Add Package from Menu Template
  const handleAddMenuTemplate = (tmpl: MenuPackageTemplate) => {
    const nextLineNum = lines.length + 1;
    const laborCost = Number((tmpl.laborHours * defaultLaborRate).toFixed(2));

    const convertedParts: StandaloneQuotePart[] = (tmpl.parts || []).map((p, pIdx) => ({
      id: `qpart_${Date.now()}_${nextLineNum}_${pIdx}`,
      partNumber: p.partNumber,
      description: p.description,
      quantity: p.quantity,
      cost: p.cost,
      price: p.price,
      subtotal: Number((p.quantity * p.price).toFixed(2)),
      vendor: p.vendor || 'MOPAR'
    }));

    setLines(prev => [
      ...prev,
      {
        id: `line_${Date.now()}_${nextLineNum}`,
        lineNum: nextLineNum,
        concern: tmpl.name,
        correction: tmpl.description,
        payType: 'CUSTOMER_PAY',
        laborHours: tmpl.laborHours,
        laborRate: defaultLaborRate,
        laborSubtotal: laborCost,
        parts: convertedParts
      }
    ]);

    setIsMenuTemplateModalOpen(false);
    triggerToast(`✓ Added "${tmpl.name}" with ${convertedParts.length} parts and ${tmpl.laborHours}h labor.`);
  };

  // Update Line Fields
  const handleUpdateLine = (lineIdx: number, updates: Partial<StandaloneQuoteLine>) => {
    setLines(prev => {
      const next = [...prev];
      const cur = next[lineIdx];
      if (!cur) return prev;

      const newHours = updates.laborHours !== undefined ? Number(updates.laborHours) : cur.laborHours;
      const newRate = updates.laborRate !== undefined ? Number(updates.laborRate) : cur.laborRate;
      const newLaborSubtotal = Number((newHours * newRate).toFixed(2));

      next[lineIdx] = {
        ...cur,
        ...updates,
        laborHours: newHours,
        laborRate: newRate,
        laborSubtotal: newLaborSubtotal
      };
      return next;
    });
  };

  // Delete Line
  const handleDeleteLine = (lineIdx: number) => {
    setLines(prev => {
      const filtered = prev.filter((_, idx) => idx !== lineIdx);
      return filtered.map((l, idx) => ({ ...l, lineNum: idx + 1 }));
    });
  };

  // Add Part to Line
  const handleAddPartToLine = (lineIdx: number) => {
    setLines(prev => {
      const next = [...prev];
      const cur = next[lineIdx];
      if (!cur) return prev;

      const newPart: StandaloneQuotePart = {
        id: `prt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        partNumber: '',
        description: '',
        quantity: 1,
        cost: 0,
        price: 0,
        subtotal: 0,
        vendor: 'STELLANTIS'
      };

      next[lineIdx] = {
        ...cur,
        parts: [...cur.parts, newPart]
      };
      return next;
    });
  };

  // Update Part in Line (supports direct entry of Part Number, Name, Qty, Price, or Total)
  const handleUpdatePartInLine = (lineIdx: number, partIdx: number, updates: Partial<StandaloneQuotePart>) => {
    setLines(prev => {
      const next = [...prev];
      const curLine = next[lineIdx];
      if (!curLine) return prev;

      const curParts = [...curLine.parts];
      const targetPart = curParts[partIdx];
      if (!targetPart) return prev;

      const qty = updates.quantity !== undefined ? Math.max(1, Number(updates.quantity) || 1) : (targetPart.quantity || 1);
      let price = updates.price !== undefined ? (updates.price as any) : targetPart.price;
      let subtotal = updates.subtotal !== undefined ? (updates.subtotal as any) : targetPart.subtotal;

      // Bidirectional calculation between Price and Total
      if (updates.subtotal !== undefined && updates.price === undefined) {
        // User typed in the Total
        const numSubtotal = Number(updates.subtotal) || 0;
        price = qty > 0 ? Number((numSubtotal / qty).toFixed(2)) : numSubtotal;
        subtotal = updates.subtotal;
      } else if (updates.price !== undefined && updates.subtotal === undefined) {
        // User typed in the Price
        const numPrice = Number(updates.price) || 0;
        subtotal = Number((qty * numPrice).toFixed(2));
      } else if (updates.quantity !== undefined && updates.subtotal === undefined) {
        // User changed quantity
        const numPrice = Number(targetPart.price) || 0;
        subtotal = Number((qty * numPrice).toFixed(2));
      }

      curParts[partIdx] = {
        ...targetPart,
        ...updates,
        quantity: qty,
        price,
        subtotal
      };

      next[lineIdx] = {
        ...curLine,
        parts: curParts
      };
      return next;
    });
  };

  // Delete Part from Line
  const handleDeletePartFromLine = (lineIdx: number, partIdx: number) => {
    setLines(prev => {
      const next = [...prev];
      const curLine = next[lineIdx];
      if (!curLine) return prev;

      next[lineIdx] = {
        ...curLine,
        parts: curLine.parts.filter((_, idx) => idx !== partIdx)
      };
      return next;
    });
  };

  // Save Quote to AppContext / Firestore
  const handleSaveQuote = (statusOverride?: StandaloneQuoteStatus) => {
    if (!customerName.trim()) {
      alert('Please enter a Customer Name before saving.');
      return null;
    }

    const effectiveStatus = statusOverride || quoteStatus;
    const advisorUser = users.find(u => u.id === advisorId);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (expirationDays || 30));

    const quotePayload: Omit<StandaloneQuote, 'id' | 'quoteNumber' | 'createdAt' | 'updatedAt'> = {
      advisorId,
      advisorName: advisorUser ? advisorUser.name : (currentUser.name || 'Service Advisor'),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '(555) 000-0000',
      customerEmail: customerEmail.trim() || undefined,
      vehicle: {
        year: year || '',
        make: make.trim() || 'Vehicle',
        model: model.trim() || '',
        vin: vin.trim() || undefined,
        engine: engine.trim() || undefined,
        mileage: mileage ? Number(mileage) : undefined,
        licensePlate: licensePlate.trim() || undefined
      },
      status: effectiveStatus,
      expirationDate: expDate.toISOString(),
      lines,
      defaultLaborRate,
      applyShopSupplies,
      shopSuppliesFee: financials.shopSuppliesFee,
      taxRate: financials.taxRate,
      taxAmount: financials.taxAmount,
      isTaxExempt,
      taxExemptNumber: isTaxExempt ? taxExemptNumber : undefined,
      totalLaborHours: financials.totalLaborHours,
      totalLaborCost: financials.totalLaborCost,
      totalPartsCost: financials.totalPartsCost,
      grandTotal: financials.grandTotal,
      customerNotes: customerNotes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined
    };

    let savedId = editingQuoteId;
    if (editingQuoteId) {
      updateStandaloneQuote(editingQuoteId, quotePayload);
      triggerToast(`✓ Updated Quote #${editingQuoteId} (${formatCurrency(financials.grandTotal)})`);
    } else {
      const created = createStandaloneQuote(quotePayload);
      savedId = created.id;
      setEditingQuoteId(created.id);
      triggerToast(`✓ Generated Quote ${created.quoteNumber} (${formatCurrency(financials.grandTotal)})`);
    }

    return savedId;
  };

  // Launch Roll to RO Modal
  const handleInitiateRollToRO = () => {
    const savedId = handleSaveQuote('CUSTOMER_APPROVED');
    if (!savedId) return;

    const target = quotes.find(q => q.id === savedId) || {
      id: savedId,
      quoteNumber: `EST-${savedId.slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      advisorId,
      advisorName: currentUser.name,
      customerName,
      customerPhone,
      customerEmail,
      vehicle: { year, make, model, vin, mileage, engine, licensePlate },
      status: 'CUSTOMER_APPROVED',
      expirationDate: new Date().toISOString(),
      lines,
      defaultLaborRate,
      applyShopSupplies,
      shopSuppliesFee: financials.shopSuppliesFee,
      taxRate: financials.taxRate,
      taxAmount: financials.taxAmount,
      isTaxExempt,
      totalLaborHours: financials.totalLaborHours,
      totalLaborCost: financials.totalLaborCost,
      totalPartsCost: financials.totalPartsCost,
      grandTotal: financials.grandTotal
    } as StandaloneQuote;

    setSelectedQuoteForRoll(target);
    setIsRollModalOpen(true);
  };

  // Launch Print Sheet
  const handleInitiatePrint = () => {
    const savedId = handleSaveQuote();
    if (!savedId) return;

    const target = quotes.find(q => q.id === savedId) || {
      id: savedId,
      quoteNumber: `EST-${savedId.slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      advisorId,
      advisorName: currentUser.name,
      customerName,
      customerPhone,
      customerEmail,
      vehicle: { year, make, model, vin, mileage, engine, licensePlate },
      status: quoteStatus,
      expirationDate: new Date().toISOString(),
      lines,
      defaultLaborRate,
      applyShopSupplies,
      shopSuppliesFee: financials.shopSuppliesFee,
      taxRate: financials.taxRate,
      taxAmount: financials.taxAmount,
      isTaxExempt,
      totalLaborHours: financials.totalLaborHours,
      totalLaborCost: financials.totalLaborCost,
      totalPartsCost: financials.totalPartsCost,
      grandTotal: financials.grandTotal
    } as StandaloneQuote;

    setSelectedQuoteForPrint(target);
    setIsPrintModalOpen(true);
  };

  // Filtered Saved Quotes for Tab 2
  const filteredSavedQuotes = useMemo(() => {
    return quotes.filter(q => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matchesQNum = (q.quoteNumber || q.id).toLowerCase().includes(term);
        const matchesCust = q.customerName.toLowerCase().includes(term);
        const matchesPhone = q.customerPhone.toLowerCase().includes(term);
        const matchesVeh = `${q.vehicle.year} ${q.vehicle.make} ${q.vehicle.model} ${q.vehicle.vin || ''}`.toLowerCase().includes(term);
        const matchesAdv = q.advisorName.toLowerCase().includes(term);
        if (!matchesQNum && !matchesCust && !matchesPhone && !matchesVeh && !matchesAdv) return false;
      }
      return true;
    });
  }, [quotes, statusFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-6xl h-[95vh] max-h-[950px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Quote & Estimate Builder
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Pre-RO Estimator
                </span>
                {editingQuoteId && (
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    Editing: #{editingQuoteId}
                  </span>
                )}
                {/* Header Auto-Save Badge */}
                {autoSaveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                    <span>Auto-saving draft...</span>
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                    <span>Auto-Saved {lastAutoSaveTime ? `(${lastAutoSaveTime})` : ''}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Build menu estimates, calculate parts & labor gross margins, and roll pre-approved quotes into active Repair Orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tab Switches */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('BUILDER')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'BUILDER'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Quote Builder
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SAVED_QUOTES')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'SAVED_QUOTES'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Saved Estimates</span>
                {quotes.length > 0 && (
                  <span className="bg-purple-900 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-purple-400">
                    {quotes.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackToast && (
          <div className="px-6 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-150 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackToast}</span>
            </div>
            <button onClick={() => setFeedbackToast(null)} className="text-emerald-100 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: QUOTE BUILDER */}
        {activeTab === 'BUILDER' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* 1. Customer & Vehicle Specifications Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      1. Customer & Vehicle Identification
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {autoSaveStatus === 'saved' && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Auto-Saved {lastAutoSaveTime ? `(${lastAutoSaveTime})` : ''}</span>
                      </span>
                    )}
                    {autoSaveStatus === 'saving' && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Auto-saving draft...</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={resetFormToNew}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                    >
                      + Clear / New Quote
                    </button>
                  </div>
                </div>

                {/* Customer Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. John Miller"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. (555) 342-8910"
                      className="w-full text-xs font-medium p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Email Address (For PDF Estimate)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. jmiller@example.com"
                      className="w-full text-xs font-medium p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Tax Exempt Customer Option */}
                <div className={`p-3 rounded-lg border transition-all ${
                  isTaxExempt 
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/60' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isTaxExempt}
                        onChange={(e) => setIsTaxExempt(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Tax Exempt Customer
                          </span>
                          {isTaxExempt ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                              0% Sales Tax (Exempt)
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500">
                              Standard 7% Tax Applies
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Exempts this quote from state and local sales tax on parts and labor.
                        </p>
                      </div>
                    </label>

                    {isTaxExempt && (
                      <div className="sm:w-64 flex items-center gap-2">
                        <label className="text-[11px] font-bold text-amber-900 shrink-0 uppercase">
                          Certificate / ID #:
                        </label>
                        <input
                          type="text"
                          value={taxExemptNumber}
                          onChange={(e) => setTaxExemptNumber(e.target.value)}
                          placeholder="e.g. EX-987452"
                          className="w-full text-xs font-mono font-medium p-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* VIN & Vehicle Details */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 pt-1">
                  {/* VIN Input with instant auto-decode button */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                      <span>Vehicle VIN (17-digit)</span>
                      {vin.length === 17 && (
                        <span className="text-[10px] text-emerald-600 font-bold">17 digits ✓</span>
                      )}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase())}
                        placeholder="e.g. 1C4RJFBG8LC..."
                        className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleVinDecode}
                        disabled={!vin.trim()}
                        className="px-2.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer"
                        title="Auto-decode Year, Make, Model and Engine from VIN"
                      >
                        Decode
                      </button>
                    </div>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Year</label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2022"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  {/* Make */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Make</label>
                    <input
                      type="text"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                      placeholder="Jeep / Ram"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Model</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Grand Cherokee"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  {/* Estimated Mileage */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Est. Mileage</label>
                    <input
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="45000"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Job Lines Builder */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      2. Service Operations & Quoted Job Lines ({lines.length})
                    </h3>
                  </div>

                  {/* Action Buttons to Add Lines or Drop Menu Packages */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMenuTemplateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer transition-all active:scale-98"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-300" />
                      <span>⚡ Quick Add Menu Package</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddBlankLine}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Add Blank Line</span>
                    </button>
                  </div>
                </div>

                {/* Lines List */}
                {lines.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 space-y-2">
                    <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No Job Lines Added Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click <strong>"⚡ Quick Add Menu Package"</strong> to drop instant brake, fluid, or maintenance packages with pre-filled parts and labor, or click <strong>"+ Add Blank Line"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {lines.map((line, lineIdx) => {
                      const linePartsCost = (line.parts || []).reduce((acc, p) => acc + p.subtotal, 0);
                      const lineTotal = line.laborSubtotal + linePartsCost;

                      return (
                        <div
                          key={line.id || lineIdx}
                          className="bg-white rounded-xl border-2 border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-purple-300"
                        >
                          {/* Line Header */}
                          <div className="p-3 bg-slate-100/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                                {line.lineNum || lineIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={line.concern}
                                onChange={(e) => handleUpdateLine(lineIdx, { concern: e.target.value })}
                                placeholder="Concern / Job Description (e.g. Front Ceramic Brake Pads & Rotors)"
                                className="w-full text-xs font-extrabold p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                              />
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block">Line Total</span>
                                <span className="font-mono font-black text-sm text-slate-900">
                                  {formatCurrency(lineTotal)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteLine(lineIdx)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete this job line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Line Body: Labor & Parts Settings */}
                          <div className="p-4 space-y-3 text-xs">
                            {/* Labor Controls Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                  Labor Hours (Flat Rate)
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  value={line.laborHours}
                                  onChange={(e) => handleUpdateLine(lineIdx, { laborHours: parseFloat(e.target.value) || 0 })}
                                  className="w-full text-xs font-black p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                  Hourly Shop Rate ($)
                                </label>
                                <PriceField
                                  value={line.laborRate}
                                  onChange={(newRate) => handleUpdateLine(lineIdx, { laborRate: newRate })}
                                  placeholder="165.00"
                                  className="w-full pl-6 pr-2 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
                                  title="Hourly Shop Rate"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                  Pay Type
                                </label>
                                <select
                                  value={line.payType}
                                  onChange={(e) => handleUpdateLine(lineIdx, { payType: e.target.value as ConcernPayType })}
                                  className="w-full text-xs font-bold p-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                                >
                                  <option value="CUSTOMER_PAY">Customer Pay</option>
                                  <option value="WARRANTY">Warranty</option>
                                  <option value="INTERNAL">Internal</option>
                                  <option value="EXTENDED_WARRANTY">Extended Warranty</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                                  Labor Subtotal
                                </label>
                                <div className="p-1.5 bg-slate-200 font-mono font-black text-slate-900 rounded-lg text-xs">
                                  {formatCurrency(line.laborSubtotal)}
                                </div>
                              </div>
                            </div>

                            {/* Scope / Recommendation text */}
                            <div>
                              <input
                                type="text"
                                value={line.correction || ''}
                                onChange={(e) => handleUpdateLine(lineIdx, { correction: e.target.value })}
                                placeholder="Optional: Recommended repair procedure / technician notes (e.g. Clean and lube slides, flush old fluid)"
                                className="w-full text-[11px] p-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-700"
                              />
                            </div>

                            {/* Parts for this Line */}
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span>Required Parts on Line {line.lineNum || lineIdx + 1} ({(line.parts || []).length})</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleAddPartToLine(lineIdx)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-2xs cursor-pointer transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  <span>+ Add Part</span>
                                </button>
                              </div>

                              {(line.parts || []).length === 0 ? (
                                <div className="p-3.5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs font-medium">
                                  No parts added yet. Click <strong>+ Add Part</strong> to enter Part Number, Name, Qty, Price and Total.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Table Column Headers */}
                                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-200/90 rounded-lg text-[11px] font-black uppercase tracking-wider text-slate-700 items-center">
                                    <div className="col-span-3">Part Number</div>
                                    <div className="col-span-4">Name</div>
                                    <div className="col-span-1 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Price</div>
                                    <div className="col-span-2 text-right">Total</div>
                                  </div>

                                  {line.parts.map((part, pIdx) => {
                                    return (
                                      <div
                                        key={part.id || pIdx}
                                        className="p-2.5 bg-white hover:bg-slate-50/80 rounded-xl border-2 border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center transition-all shadow-2xs"
                                      >
                                        {/* Part Number */}
                                        <div className="sm:col-span-3">
                                          <label className="sm:hidden block text-[10px] font-black text-slate-700 uppercase mb-0.5">Part Number</label>
                                          <input
                                            type="text"
                                            value={part.partNumber || ''}
                                            onChange={(e) => handleUpdatePartInLine(lineIdx, pIdx, { partNumber: e.target.value.toUpperCase() })}
                                            placeholder="Part Number"
                                            className="w-full text-xs font-mono font-bold p-2 bg-slate-50 focus:bg-white border-2 border-slate-300 focus:border-blue-500 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                          />
                                        </div>

                                        {/* Name */}
                                        <div className="sm:col-span-4">
                                          <label className="sm:hidden block text-[10px] font-black text-slate-700 uppercase mb-0.5">Name</label>
                                          <input
                                            type="text"
                                            value={part.description || ''}
                                            onChange={(e) => handleUpdatePartInLine(lineIdx, pIdx, { description: e.target.value })}
                                            placeholder="Part Name"
                                            className="w-full text-xs font-bold p-2 bg-slate-50 focus:bg-white border-2 border-slate-300 focus:border-blue-500 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                          />
                                        </div>

                                        {/* Qty */}
                                        <div className="sm:col-span-1">
                                          <label className="sm:hidden block text-[10px] font-black text-slate-700 uppercase mb-0.5 text-center">Qty</label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={part.quantity === 0 || (part.quantity as any) === '' ? '' : part.quantity}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              handleUpdatePartInLine(lineIdx, pIdx, { quantity: val === '' ? ('' as any) : parseInt(val) || 1 });
                                            }}
                                            onBlur={(e) => {
                                              const val = parseInt(e.target.value) || 1;
                                              handleUpdatePartInLine(lineIdx, pIdx, { quantity: Math.max(1, val) });
                                            }}
                                            placeholder="1"
                                            className="w-full text-xs font-black font-mono text-center p-2 bg-slate-50 focus:bg-white border-2 border-slate-300 focus:border-blue-500 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                                          />
                                        </div>

                                        {/* Price */}
                                        <div className="sm:col-span-2">
                                          <label className="sm:hidden block text-[10px] font-black text-slate-700 uppercase mb-0.5 text-right">Price</label>
                                          <PriceField
                                            value={part.price}
                                            onChange={(newPrice) => handleUpdatePartInLine(lineIdx, pIdx, { price: newPrice })}
                                            placeholder="0.00"
                                            className="w-full pl-6 pr-2 py-2 text-xs font-mono font-bold bg-slate-50 focus:bg-white border-2 border-slate-300 focus:border-blue-500 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-right"
                                            title="Unit Price - updates Total"
                                          />
                                        </div>

                                        {/* Total */}
                                        <div className="sm:col-span-2 flex items-center gap-1.5">
                                          <div className="flex-1 min-w-0">
                                            <label className="sm:hidden block text-[10px] font-black text-emerald-800 uppercase mb-0.5 text-right">Total</label>
                                            <PriceField
                                              value={part.subtotal}
                                              onChange={(newTotal) => handleUpdatePartInLine(lineIdx, pIdx, { subtotal: newTotal })}
                                              placeholder="0.00"
                                              className="w-full pl-6 pr-2 py-2 text-xs font-mono font-black bg-emerald-50 focus:bg-white border-2 border-emerald-400 focus:border-emerald-600 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-right shadow-2xs"
                                              title="Total - editing recalculates Unit Price"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePartFromLine(lineIdx, pIdx)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 mt-auto sm:mt-0"
                                            title="Remove part item"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Customer & Internal Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Customer Facing Notes / Disclaimers
                  </label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="e.g. Includes complimentary 21-point multi-point inspection and battery test."
                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Internal Shop Notes (Advisor Only)
                  </label>
                  <textarea
                    rows={2}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g. Customer stated vehicle makes squeak in the morning. Special order brake parts if authorized."
                    className="w-full text-xs p-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

            </div>

            {/* Bottom Financials Summary & Action Bar */}
            <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0 shadow-lg">
              
              {/* Financial Metrics Strip */}
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Labor ({financials.totalLaborHours}h)</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(financials.totalLaborCost)}</span>
                </div>

                <div className="border-l border-slate-700 pl-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Parts</span>
                  <span className="font-mono font-bold text-white">{formatCurrency(financials.totalPartsCost)}</span>
                </div>

                {/* Shop Supplies: Editable & Switchable */}
                <div className="border-l border-slate-700 pl-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shopSuppliesToggle"
                    checked={applyShopSupplies}
                    onChange={(e) => setApplyShopSupplies(e.target.checked)}
                    className="rounded text-purple-500 focus:ring-purple-500 cursor-pointer w-4 h-4"
                    title="Toggle shop supplies fee on/off"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="shopSuppliesToggle" className="text-[10px] text-slate-400 uppercase tracking-wider cursor-pointer">
                        Shop Supplies
                      </label>
                      {manualShopSupplies !== null ? (
                        <button
                          type="button"
                          onClick={() => setManualShopSupplies(null)}
                          title="Reset to automatic calculation (8% labor, capped at $35.00)"
                          className="text-[9px] px-1 py-0.2 text-purple-300 bg-purple-900/60 hover:bg-purple-800 rounded border border-purple-700 inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Reset Auto</span>
                        </button>
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 text-slate-400 bg-slate-800 rounded border border-slate-700">
                          Auto ($35 max)
                        </span>
                      )}
                    </div>
                    {applyShopSupplies ? (
                      <div className="w-24 mt-0.5">
                        <PriceField
                          value={manualShopSupplies !== null ? manualShopSupplies : financials.shopSuppliesFee}
                          onChange={(val) => setManualShopSupplies(val)}
                          placeholder={financials.calculatedSupplies.toFixed(2)}
                          className="w-full text-xs font-mono font-bold p-1 bg-slate-800 focus:bg-slate-700 border border-slate-600 rounded text-white focus:ring-1 focus:ring-purple-400 text-right pr-2 pl-5"
                          title="Click to edit shop supplies amount directly"
                        />
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-slate-500 block text-xs mt-0.5">$0.00 (Off)</span>
                    )}
                  </div>
                </div>

                {/* Tax & Tax-Exempt Status */}
                <div className="border-l border-slate-700 pl-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="taxExemptToggle"
                    checked={isTaxExempt}
                    onChange={(e) => setIsTaxExempt(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                    title="Check to mark customer as Tax Exempt (0% sales tax)"
                  />
                  <div>
                    <label htmlFor="taxExemptToggle" className="text-[10px] text-slate-400 uppercase tracking-wider block cursor-pointer flex items-center gap-1">
                      <span>Tax</span>
                      {isTaxExempt ? (
                        <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          EXEMPT
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400">7%</span>
                      )}
                    </label>
                    <span className={`font-mono font-bold block text-xs ${isTaxExempt ? 'text-amber-300' : 'text-white'}`}>
                      {formatCurrency(financials.taxAmount)}
                    </span>
                  </div>
                </div>

                {/* Live Dealer Margin Readout */}
                <div className="border-l border-slate-700 pl-4 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">Gross Margin</span>
                  <div className="font-mono font-black text-emerald-300 flex items-center gap-1">
                    <span>{formatCurrency(financials.grossProfit)}</span>
                    <span className="text-[10px] font-normal text-emerald-400">({financials.grossProfitMargin}%)</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="border-l border-slate-700 pl-4">
                  <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Total Estimate</span>
                  <span className="font-mono font-black text-xl text-purple-200">
                    {formatCurrency(financials.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveQuote()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold border border-slate-700 shadow-2xs transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitiatePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Estimate</span>
                </button>

                <button
                  type="button"
                  onClick={handleInitiateRollToRO}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>🚀 Roll to Repair Order</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: SAVED ESTIMATES & QUOTES HUB */}
        {activeTab === 'SAVED_QUOTES' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            
            {/* Search & Filter Bar */}
            <div className="p-3 sm:px-6 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search quote #, customer, phone, vehicle, VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({quotes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('DRAFT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === 'DRAFT' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  Drafts
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('CUSTOMER_APPROVED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === 'CUSTOMER_APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Customer Approved
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('ROLLED_TO_RO')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === 'ROLLED_TO_RO' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Rolled to RO
                </button>
              </div>
            </div>

            {/* Quotes Table */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
              {filteredSavedQuotes.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">No Quotes Found</h4>
                  <p className="text-xs text-slate-500">No estimates matched your active search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetFormToNew();
                      setActiveTab('BUILDER');
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    + Create First Estimate
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSavedQuotes.map((q) => {
                    const isRolled = q.status === 'ROLLED_TO_RO';

                    return (
                      <div
                        key={q.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Quote Identity & Customer */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {q.quoteNumber || `#${q.id}`}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              isRolled
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : q.status === 'CUSTOMER_APPROVED'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}>
                              {q.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(q.createdAt).toLocaleDateString()} by <strong>{q.advisorName}</strong>
                            </span>
                          </div>

                          <div className="text-sm font-black text-slate-900 pt-0.5">
                            {q.customerName} <span className="font-normal text-slate-500 text-xs">({q.customerPhone})</span>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                            <span>{q.vehicle.year} {q.vehicle.make} {q.vehicle.model}</span>
                            {q.vehicle.vin && (
                              <span className="font-mono text-[11px] text-slate-500">VIN: {q.vehicle.vin}</span>
                            )}
                            <span className="text-slate-300">•</span>
                            <span><strong>{q.lines.length} Job Line{q.lines.length === 1 ? '' : 's'}</strong></span>
                          </div>
                        </div>

                        {/* Financial Amount */}
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Total</span>
                          <span className="text-lg font-black font-mono text-slate-900">
                            {formatCurrency(q.grandTotal)}
                          </span>
                          <span className="text-[10px] text-emerald-700 block font-semibold">
                            Labor: {formatCurrency(q.totalLaborCost)} • Parts: {formatCurrency(q.totalPartsCost)}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                          {isRolled ? (
                            <button
                              type="button"
                              onClick={() => {
                                const targetRO = repairOrders.find(r => r.id === q.convertedRoId);
                                if (targetRO) {
                                  setSelectedRO(targetRO);
                                  onClose();
                                } else {
                                  alert(`Repair Order #${q.convertedRoId} opened.`);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-black border border-blue-200 cursor-pointer flex items-center gap-1"
                            >
                              <span>View RO #{q.convertedRoId}</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQuoteForRoll(q);
                                setIsRollModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Roll to RO</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuoteForPrint(q);
                              setIsPrintModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 cursor-pointer"
                            title="Print Estimate Sheet"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => loadQuoteIntoForm(q.id)}
                            className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 cursor-pointer"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete Quote ${q.quoteNumber || q.id} for ${q.customerName}?`)) {
                                deleteStandaloneQuote(q.id);
                                triggerToast(`✓ Deleted Quote #${q.id}`);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Quote"
                          >
                            <Trash2 className="w-4 h-4" />
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

      </div>

      {/* QUICK ADD MENU PACKAGE TEMPLATE MODAL */}
      {isMenuTemplateModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-100">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 my-auto">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-300" />
                <h3 className="text-base font-black text-white">
                  Automotive Service & Repair Menu Packages
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuTemplateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
              <p className="text-xs text-slate-500">
                Select any factory-recommended maintenance or repair package below to instantly populate full job lines with pre-calculated parts, labor hours, and pricing.
              </p>

              <div className="space-y-2">
                {MENU_SERVICE_TEMPLATES.map((tmpl) => {
                  const estPartsCost = tmpl.parts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
                  const estLaborCost = tmpl.laborHours * defaultLaborRate;
                  const estTotal = estPartsCost + estLaborCost;

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleAddMenuTemplate(tmpl)}
                      className="p-3 bg-slate-50 hover:bg-purple-50 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800 group-hover:bg-purple-200 group-hover:text-purple-900">
                            {tmpl.category}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-950">
                            {tmpl.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {tmpl.description}
                        </p>
                        <div className="text-[10px] text-slate-600">
                          Labor: <strong>{tmpl.laborHours} hrs</strong> • Parts: <strong>{tmpl.parts.length} item{tmpl.parts.length === 1 ? '' : 's'}</strong>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase block">Est. Package Total</span>
                        <span className="text-sm font-black font-mono text-purple-900">
                          {formatCurrency(estTotal)}
                        </span>
                        <span className="text-[10px] font-bold text-purple-600 group-hover:underline block mt-0.5">
                          + Add to Quote →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE ESTIMATE SHEET MODAL */}
      {isPrintModalOpen && selectedQuoteForPrint && (
        <QuotePrintSheet
          quote={selectedQuoteForPrint}
          onClose={() => setIsPrintModalOpen(false)}
          onRollToRO={() => {
            setIsPrintModalOpen(false);
            setSelectedQuoteForRoll(selectedQuoteForPrint);
            setIsRollModalOpen(true);
          }}
        />
      )}

      {/* ROLL TO REPAIR ORDER MODAL */}
      {isRollModalOpen && selectedQuoteForRoll && (
        <RollToROModal
          isOpen={true}
          quote={selectedQuoteForRoll}
          onClose={() => setIsRollModalOpen(false)}
          onSuccess={(roId) => {
            triggerToast(`🚀 Successfully generated Repair Order #${roId}!`);
            onClose();
          }}
        />
      )}

    </div>
  );
};

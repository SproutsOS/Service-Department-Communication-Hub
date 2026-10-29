import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  Plus, 
  Edit3, 
  Trash2, 
  Printer, 
  Receipt, 
  Save, 
  Check, 
  X,
  RefreshCw,
  Layers,
  ShieldCheck,
  Building2,
  User as UserIcon,
  Wrench,
  FileText,
  HelpCircle,
  CheckSquare,
  Car,
  Calendar,
  Phone,
  Hash
} from 'lucide-react';
import { RepairOrder, PartItem, PartStatus, ConcernPayType } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency, PAY_TYPE_RATES } from '../utils/formatters';
import { TicketFlowStepper } from './TicketFlowStepper';

interface ROQuotePartsTrackerProps {
  ro: RepairOrder;
  onOpenQuoteModal: (roId: string) => void;
  onOpenPrintModal: (roId: string) => void;
  onOpenEditPart: (part: PartItem, lineNum?: number) => void;
  onAddNewPart: (lineNum: number) => void;
}

const PART_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  REQUESTED: { label: 'Needs Order', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', icon: Clock },
  QUOTE_ONLY: { label: 'Quote Only', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', icon: Receipt },
  ORDERED: { label: 'Ordered', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  DAILY_ORDER: { label: 'Daily Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  SPECIAL_ORDER_1_5_DAYS: { label: 'Special Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  SPECIAL_ORDER: { label: 'Special Order', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', icon: Truck },
  VOR_UPGRADE: { label: 'VOR Critical', bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300', icon: AlertTriangle },
  IN_TRANSIT: { label: 'In Transit', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300', icon: Truck },
  RECEIVED: { label: 'Received / Staged', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle2 },
  IN_STOCK: { label: 'In Stock', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', icon: CheckCircle2 },
  ISSUED_TO_TECH: { label: 'With Tech', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', icon: CheckCircle2 },
  BACKORDERED: { label: 'Backordered', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', icon: AlertCircle },
  DECLINED: { label: 'Declined', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', icon: AlertTriangle },
};

export const ROQuotePartsTracker: React.FC<ROQuotePartsTrackerProps> = ({
  ro: propRO,
  onOpenQuoteModal,
  onOpenPrintModal,
}) => {
  const { 
    repairOrders,
    updateROStatus,
    updatePartStatus, 
    updatePartItem, 
    deletePartItem, 
    markAllPartsOrderedOnRO, 
    toggleCustomerTaxExempt,
    deleteRepairOrderConcern,
    addMultiplePartOrders,
    addRepairOrderConcern,
    updateRepairOrderConcernText,
    updateTechCauseAndCorrection,
    updateConcernPayType,
    updateConcernTech,
    updateLineLaborHours,
    updateRepairOrderDetails,
    users,
    currentUser,
    activeRoleView
  } = useApp();

  // Always bind to latest live repair order from state
  const ro = useMemo(() => {
    return repairOrders.find(r => r.id === propRO.id) || propRO;
  }, [repairOrders, propRO]);

  const isServiceManager = currentUser.role === 'SERVICE_MANAGER' || activeRoleView === 'SERVICE_MANAGER';
  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  // Inline quick editing for an existing part
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [inlinePartNumber, setInlinePartNumber] = useState<string>('');
  const [inlineDescription, setInlineDescription] = useState<string>('');
  const [inlineQty, setInlineQty] = useState<number>(1);
  const [inlinePrice, setInlinePrice] = useState<string>('0.00');
  const [inlineEta, setInlineEta] = useState<string>('');
  const [inlineTracking, setInlineTracking] = useState<string>('');
  const [inlineNotes, setInlineNotes] = useState<string>('');
  const [inlineVendor, setInlineVendor] = useState<string>('');
  const [focusField, setFocusField] = useState<'partNumber' | 'price' | 'vendor' | null>(null);

  // Inline adding new part directly to a line
  const [inlineAddingLineNum, setInlineAddingLineNum] = useState<number | null>(null);
  const [newLinePartNumber, setNewLinePartNumber] = useState<string>('');
  const [newLineDescription, setNewLineDescription] = useState<string>('');
  const [newLineQty, setNewLineQty] = useState<number>(1);
  const [newLinePrice, setNewLinePrice] = useState<string>('0.00');
  const [newLineVendor, setNewLineVendor] = useState<string>('Shop Inventory / Supplier');
  const [newLineEta, setNewLineEta] = useState<string>('Pending Parts Counter');

  // Auto-save state and debounce refs for Parts
  const activeNewPartIdRef = useRef<string | null>(null);
  const newPartDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const editPartDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [partAutoSaveStatus, setPartAutoSaveStatus] = useState<Record<string, 'saving' | 'saved'>>({});

  // Three C's local state per line index
  const [localCauses, setLocalCauses] = useState<Record<number, string>>({});
  const [localCorrections, setLocalCorrections] = useState<Record<number, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving'>>({});
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Inline editing of Concern description
  const [editingConcernIdx, setEditingConcernIdx] = useState<number | null>(null);
  const [concernInputText, setConcernInputText] = useState<string>('');

  // Add New Job Line Modal / Card
  const [isAddingJob, setIsAddingJob] = useState<boolean>(false);
  const [newJobConcern, setNewJobConcern] = useState<string>('');
  const [newJobPayType, setNewJobPayType] = useState<ConcernPayType>('CUSTOMER_PAY');
  const [newJobTechId, setNewJobTechId] = useState<string>(ro.techId || '');
  const [newJobHours, setNewJobHours] = useState<string>('1.0');
  const [newJobCause, setNewJobCause] = useState<string>('');
  const [newJobCorrection, setNewJobCorrection] = useState<string>('');

  // Quick edit Customer & Vehicle details
  const [isEditingRODetails, setIsEditingRODetails] = useState<boolean>(false);
  const [editCustName, setEditCustName] = useState<string>(ro.customerName || '');
  const [editCustPhone, setEditCustPhone] = useState<string>(ro.customerPhone || '');
  const [editVehYear, setEditVehYear] = useState<string | number>(ro.vehicle.year || '');
  const [editVehMake, setEditVehMake] = useState<string>(ro.vehicle.make || '');
  const [editVehModel, setEditVehModel] = useState<string>(ro.vehicle.model || '');
  const [editVehVin, setEditVehVin] = useState<string>(ro.vehicle.vin || '');
  const [editVehMileage, setEditVehMileage] = useState<string | number>(ro.vehicle.mileage || '');
  const [editPromisedTime, setEditPromisedTime] = useState<string>(ro.promisedTime || '');

  // Keep local causes and corrections synchronized when RO updates
  useEffect(() => {
    const concernsCount = Math.max(ro.concerns?.length || 1, 1);
    const initialCauses: Record<number, string> = {};
    const initialCorrections: Record<number, string> = {};

    for (let i = 0; i < concernsCount; i++) {
      initialCauses[i] = ro.concernCauses?.[i] ?? (i === 0 ? ro.cause : '') ?? '';
      initialCorrections[i] = ro.concernCorrections?.[i] ?? (i === 0 ? ro.correction : '') ?? '';
    }

    setLocalCauses(initialCauses);
    setLocalCorrections(initialCorrections);
  }, [ro.id, ro.concerns, ro.concernCauses, ro.concernCorrections, ro.cause, ro.correction]);

  // Keep customer/vehicle edit state synced
  useEffect(() => {
    setEditCustName(ro.customerName || '');
    setEditCustPhone(ro.customerPhone || '');
    setEditVehYear(ro.vehicle.year || '');
    setEditVehMake(ro.vehicle.make || '');
    setEditVehModel(ro.vehicle.model || '');
    setEditVehVin(ro.vehicle.vin || '');
    setEditVehMileage(ro.vehicle.mileage || '');
    setEditPromisedTime(ro.promisedTime || '');
  }, [ro]);

  // --- Auto-Save Handlers for Existing Parts Inline Edit ---
  const autoSaveInlineEdit = (
    partId: string,
    overrides?: Partial<{ partNumber: string; description: string; qty: number; price: string; vendor: string; eta: string; tracking: string; notes: string }>
  ) => {
    const curPn = overrides?.partNumber !== undefined ? overrides.partNumber : inlinePartNumber;
    const curDesc = overrides?.description !== undefined ? overrides.description : inlineDescription;
    const curQty = overrides?.qty !== undefined ? overrides.qty : inlineQty;
    const curPriceStr = overrides?.price !== undefined ? overrides.price : inlinePrice;
    const curVendor = overrides?.vendor !== undefined ? overrides.vendor : inlineVendor;
    const curEta = overrides?.eta !== undefined ? overrides.eta : inlineEta;
    const curTracking = overrides?.tracking !== undefined ? overrides.tracking : inlineTracking;
    const curNotes = overrides?.notes !== undefined ? overrides.notes : inlineNotes;

    const rawPriceClean = curPriceStr ? String(curPriceStr).replace(/[^0-9.]/g, '') : '';
    const parsedPrice = rawPriceClean !== '' && !isNaN(Number(rawPriceClean)) 
      ? Number(Number(rawPriceClean).toFixed(2)) 
      : 0;

    const finalPartNumber = curPn.trim().toUpperCase() || 'TBD';
    const finalDescription = curDesc.trim() || 'Part Item';

    const saveKey = `part_${partId}`;
    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saving' }));

    updatePartItem(ro.id, partId, {
      partNumber: finalPartNumber,
      description: finalDescription,
      quantity: Math.max(1, Number(curQty) || 1),
      price: parsedPrice,
      estimatedArrival: curEta.trim() || undefined,
      trackingNumber: curTracking.trim() || undefined,
      notes: curNotes.trim() || undefined,
      vendor: curVendor.trim() || undefined,
    });

    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saved' }));
    setTimeout(() => {
      setPartAutoSaveStatus(prev => {
        const next = { ...prev };
        delete next[saveKey];
        return next;
      });
    }, 2500);
  };

  const scheduleEditPartAutoSave = (
    partId: string,
    overrides?: Partial<{ partNumber: string; description: string; qty: number; price: string; vendor: string; eta: string; tracking: string; notes: string }>
  ) => {
    const saveKey = `part_${partId}`;
    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saving' }));
    if (editPartDebounceRef.current) {
      clearTimeout(editPartDebounceRef.current);
    }
    editPartDebounceRef.current = setTimeout(() => {
      autoSaveInlineEdit(partId, overrides);
    }, 500);
  };

  const flushSaveInlineEdit = (partId?: string) => {
    if (editPartDebounceRef.current) {
      clearTimeout(editPartDebounceRef.current);
      editPartDebounceRef.current = null;
    }
    const targetId = partId ?? editingPartId;
    if (targetId) {
      autoSaveInlineEdit(targetId);
    }
  };

  const handleStartInlineEdit = (part: PartItem, fieldToFocus: 'partNumber' | 'price' | 'vendor' = 'partNumber') => {
    // Flush any pending inline add on a line before starting edit
    if (inlineAddingLineNum !== null) {
      flushSaveInlineAdd(inlineAddingLineNum);
      activeNewPartIdRef.current = null;
      setInlineAddingLineNum(null);
    }
    if (editingPartId && editingPartId !== part.id) {
      flushSaveInlineEdit(editingPartId);
    }

    setEditingPartId(part.id);
    setInlinePartNumber(part.partNumber && part.partNumber !== 'TBD' ? part.partNumber : '');
    setInlineDescription(part.description || part.name || '');
    setInlineQty(part.quantity || 1);
    const pPrice = Number(part.price) || 0;
    setInlinePrice(pPrice > 0 ? pPrice.toFixed(2) : '0.00');
    setInlineEta(part.estimatedArrival || '');
    setInlineTracking(part.trackingNumber || '');
    setInlineNotes(part.notes || '');
    setInlineVendor(part.vendor || 'Shop Inventory / Supplier');
    setFocusField(fieldToFocus);
  };

  const handleCancelInlineEdit = () => {
    if (editPartDebounceRef.current) {
      clearTimeout(editPartDebounceRef.current);
      editPartDebounceRef.current = null;
    }
    setEditingPartId(null);
    setFocusField(null);
  };

  const handleSaveInlineEdit = (partId: string) => {
    flushSaveInlineEdit(partId);
    setEditingPartId(null);
    setFocusField(null);
  };

  // --- Auto-Save Handlers for Adding New Parts ---
  const autoSaveInlineAdd = (
    lineNum: number, 
    overrides?: Partial<{ partNumber: string; description: string; qty: number; price: string; vendor: string; eta: string }>
  ) => {
    const curPn = overrides?.partNumber !== undefined ? overrides.partNumber : newLinePartNumber;
    const curDesc = overrides?.description !== undefined ? overrides.description : newLineDescription;
    const curQty = overrides?.qty !== undefined ? overrides.qty : newLineQty;
    const curPriceStr = overrides?.price !== undefined ? overrides.price : newLinePrice;
    const curVendor = overrides?.vendor !== undefined ? overrides.vendor : newLineVendor;
    const curEta = overrides?.eta !== undefined ? overrides.eta : newLineEta;

    const rawPriceClean = curPriceStr ? String(curPriceStr).replace(/[^0-9.]/g, '') : '';
    const parsedPrice = rawPriceClean !== '' && !isNaN(Number(rawPriceClean)) 
      ? Number(Number(rawPriceClean).toFixed(2)) 
      : 0;

    const trimmedPn = curPn.trim();
    const trimmedDesc = curDesc.trim();

    // Only auto-save if user entered a part number, description, or price
    if (!trimmedPn && !trimmedDesc && parsedPrice === 0) {
      return;
    }

    const finalPartNumber = trimmedPn.toUpperCase() || 'TBD';
    const finalDescription = trimmedDesc || 'Part Item';

    const saveKey = `new_line_${lineNum}`;
    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saving' }));

    if (!activeNewPartIdRef.current) {
      const generatedId = `prt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeNewPartIdRef.current = generatedId;
      addMultiplePartOrders(ro.id, [{
        id: generatedId,
        partNumber: finalPartNumber,
        description: finalDescription,
        quantity: Math.max(1, Number(curQty) || 1),
        price: parsedPrice,
        vendor: curVendor.trim() || 'Shop Inventory / Supplier',
        estimatedArrival: curEta.trim() || 'Pending Parts Counter',
        status: 'REQUESTED',
        requestType: 'QUOTE_ONLY',
        roLineNumber: lineNum,
        notes: `For Line ${lineNum}`
      } as any]);
    } else {
      updatePartItem(ro.id, activeNewPartIdRef.current, {
        partNumber: finalPartNumber,
        description: finalDescription,
        quantity: Math.max(1, Number(curQty) || 1),
        price: parsedPrice,
        vendor: curVendor.trim() || 'Shop Inventory / Supplier',
        estimatedArrival: curEta.trim() || 'Pending Parts Counter',
        roLineNumber: lineNum,
      });
    }

    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saved' }));
    setTimeout(() => {
      setPartAutoSaveStatus(prev => {
        const next = { ...prev };
        delete next[saveKey];
        return next;
      });
    }, 2500);
  };

  const scheduleNewPartAutoSave = (
    lineNum: number, 
    overrides?: Partial<{ partNumber: string; description: string; qty: number; price: string; vendor: string; eta: string }>
  ) => {
    const saveKey = `new_line_${lineNum}`;
    setPartAutoSaveStatus(prev => ({ ...prev, [saveKey]: 'saving' }));
    if (newPartDebounceRef.current) {
      clearTimeout(newPartDebounceRef.current);
    }
    newPartDebounceRef.current = setTimeout(() => {
      autoSaveInlineAdd(lineNum, overrides);
    }, 500);
  };

  const flushSaveInlineAdd = (lineNum?: number) => {
    if (newPartDebounceRef.current) {
      clearTimeout(newPartDebounceRef.current);
      newPartDebounceRef.current = null;
    }
    const targetLine = lineNum ?? inlineAddingLineNum;
    if (targetLine !== null && targetLine !== undefined) {
      autoSaveInlineAdd(targetLine);
    }
  };

  const handleStartInlineAdd = (lineNum: number) => {
    // If another line was open, auto-save and flush its part immediately so nothing is ever lost!
    if (inlineAddingLineNum !== null && inlineAddingLineNum !== lineNum) {
      flushSaveInlineAdd(inlineAddingLineNum);
    }
    if (editingPartId) {
      flushSaveInlineEdit();
      setEditingPartId(null);
    }
    activeNewPartIdRef.current = null;
    setInlineAddingLineNum(lineNum);
    setNewLinePartNumber('');
    setNewLineDescription('');
    setNewLineQty(1);
    setNewLinePrice('0.00');
    setNewLineVendor('Shop Inventory / Supplier');
    setNewLineEta('Pending Parts Counter');
  };

  const handleCancelInlineAdd = () => {
    if (newPartDebounceRef.current) {
      clearTimeout(newPartDebounceRef.current);
      newPartDebounceRef.current = null;
    }
    if (activeNewPartIdRef.current) {
      deletePartItem(ro.id, activeNewPartIdRef.current);
      activeNewPartIdRef.current = null;
    }
    setInlineAddingLineNum(null);
  };

  const handleSaveInlineAdd = (lineNum: number) => {
    flushSaveInlineAdd(lineNum);
    activeNewPartIdRef.current = null;
    setInlineAddingLineNum(null);
  };

  const handleQuickStatusChange = (partId: string, newStatus: PartStatus) => {
    const targetPart = (ro.parts || []).find(p => p.id === partId);
    let defaultEta = targetPart?.estimatedArrival;
    if (newStatus === 'RECEIVED' || newStatus === 'IN_STOCK') {
      defaultEta = 'Arrived & Staged';
    } else if (newStatus === 'DAILY_ORDER') {
      defaultEta = 'Today 2:00 PM';
    } else if (newStatus === 'SPECIAL_ORDER_1_5_DAYS') {
      defaultEta = '1-5 Business Days';
    } else if (newStatus === 'VOR_UPGRADE') {
      defaultEta = 'Tomorrow Morning (VOR)';
    }

    updatePartStatus(ro.id, partId, newStatus, defaultEta);
  };

  const handleMarkReceived = (partId: string) => {
    updatePartStatus(ro.id, partId, 'RECEIVED', 'Arrived & Staged in Bay');
  };

  const handleMarkAllReceived = () => {
    const partsToReceive = (ro.parts || []).filter(p => 
      p.status === 'ORDERED' || 
      p.status === 'DAILY_ORDER' || 
      p.status === 'SPECIAL_ORDER' || 
      p.status === 'SPECIAL_ORDER_1_5_DAYS' || 
      p.status === 'VOR_UPGRADE' || 
      p.status === 'IN_TRANSIT'
    );
    partsToReceive.forEach(p => {
      updatePartStatus(ro.id, p.id, 'RECEIVED', 'Arrived & Staged in Bay');
    });
  };

  // Three C's Auto-Save Handler for Line Cause & Correction
  const triggerThreeCsAutoSave = (lineIdx: number, newCause?: string, newCorrection?: string) => {
    const concernsCount = Math.max(ro.concerns?.length || 1, 1);
    const updatedCauses = Array.from({ length: concernsCount }, (_, i) => 
      i === lineIdx ? (newCause !== undefined ? newCause : (localCauses[i] || '')) : (localCauses[i] || '')
    );
    const updatedCorrections = Array.from({ length: concernsCount }, (_, i) => 
      i === lineIdx ? (newCorrection !== undefined ? newCorrection : (localCorrections[i] || '')) : (localCorrections[i] || '')
    );

    const key = `line_${lineIdx}`;
    setSaveStatus(prev => ({ ...prev, [key]: 'saving' }));

    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }

    debounceTimersRef.current[key] = setTimeout(() => {
      updateTechCauseAndCorrection(
        ro.id, 
        updatedCauses[0] || '', 
        updatedCorrections[0] || '', 
        {
          isAutoSave: true,
          concernCauses: updatedCauses,
          concernCorrections: updatedCorrections
        }
      );
      setSaveStatus(prev => ({ ...prev, [key]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2000);
    }, 600);
  };

  // Handle Labor Hours update for a line
  const handleLaborHoursChange = (lineIdx: number, val: string) => {
    const cleanNum = Math.max(0, parseFloat(val) || 0);
    updateLineLaborHours(ro.id, lineIdx, cleanNum);
  };

  // Handle Concern text save
  const handleSaveConcernText = (lineIdx: number) => {
    if (concernInputText.trim()) {
      updateRepairOrderConcernText(ro.id, lineIdx, concernInputText.trim());
    }
    setEditingConcernIdx(null);
  };

  // Handle Add Job Line Submit
  const handleAddNewJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobConcern.trim()) return;

    const assignedTech = technicians.find(t => t.id === newJobTechId);
    const hoursNum = Math.max(0, parseFloat(newJobHours) || 1.0);

    addRepairOrderConcern(
      ro.id,
      newJobConcern.trim(),
      newJobPayType,
      newJobTechId || undefined,
      assignedTech?.name,
      hoursNum,
      'CUSTOMER'
    );

    // If Cause or Correction were entered during creation, update them immediately
    if (newJobCause.trim() || newJobCorrection.trim()) {
      setTimeout(() => {
        const nextIdx = (ro.concerns?.length || 1);
        const causes = [...(ro.concernCauses || [])];
        const corrections = [...(ro.concernCorrections || [])];
        while (causes.length <= nextIdx) causes.push('');
        while (corrections.length <= nextIdx) corrections.push('');
        causes[nextIdx] = newJobCause.trim();
        corrections[nextIdx] = newJobCorrection.trim();

        updateTechCauseAndCorrection(ro.id, causes[0] || '', corrections[0] || '', {
          isAutoSave: true,
          concernCauses: causes,
          concernCorrections: corrections
        });
      }, 150);
    }

    // Reset state & close
    setNewJobConcern('');
    setNewJobHours('1.0');
    setNewJobCause('');
    setNewJobCorrection('');
    setIsAddingJob(false);
  };

  // Handle Save Quick Edit Customer / Vehicle details
  const handleSaveRODetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateRepairOrderDetails(ro.id, {
      customerName: editCustName.trim(),
      customerPhone: editCustPhone.trim(),
      promisedTime: editPromisedTime,
      vehicle: {
        ...ro.vehicle,
        year: Number(editVehYear) || ro.vehicle.year,
        make: editVehMake.trim(),
        model: editVehModel.trim(),
        vin: editVehVin.trim().toUpperCase(),
        mileage: Number(editVehMileage) || ro.vehicle.mileage || 0,
      }
    });
    setIsEditingRODetails(false);
  };

  // Group concerns / job lines
  const concerns = (ro.concerns && ro.concerns.length > 0) 
    ? ro.concerns 
    : [ro.primaryConcern || 'Customer Quoted Service'];

  // Financial calculations from quote or RO lines
  const quote = ro.quote;
  const totalLaborHours = quote?.totalLaborHours || (quote?.laborItems?.reduce((sum, l) => sum + (l.laborHours || 0), 0) || 0);
  const totalLaborCost = quote?.totalLaborCost || (quote?.laborItems?.reduce((sum, l) => sum + (l.subtotal || 0), 0) || 0);
  
  // Total parts cost from RO parts merged with quote parts items
  const allParts: PartItem[] = useMemo(() => {
    const list: PartItem[] = [...(ro.parts || [])];
    const seenIds = new Set(list.map(p => p.id));
    if (ro.quote?.partsItems) {
      ro.quote.partsItems.forEach(qp => {
        if (!seenIds.has(qp.id) && (!qp.sourcePartId || !seenIds.has(qp.sourcePartId))) {
          seenIds.add(qp.id);
          list.push({
            id: qp.id,
            roId: ro.id,
            partNumber: qp.partNumber || 'TBD',
            description: qp.description || 'Part Item',
            quantity: qp.quantity || 1,
            price: qp.unitPrice || 0,
            status: qp.status === 'DECLINED' ? 'DECLINED' : 'REQUESTED',
            requestType: 'QUOTE_ONLY',
            vendor: 'Shop Inventory / Supplier',
            estimatedArrival: 'Pending Parts Counter',
            roLineNumber: qp.roLineNumber || 1,
            notes: `For Line ${qp.roLineNumber || 1}`
          });
        }
      });
    }
    return list;
  }, [ro.parts, ro.quote?.partsItems, ro.id]);

  const totalPartsCost = allParts
    .filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + ((p.quantity || 1) * (Number(p.price) || 0)), 0);

  // Shop Supplies (capped at $35.00)
  const applySupplies = quote?.applyShopSupplies ?? true;
  const shopSuppliesFee = applySupplies 
    ? (quote?.shopSuppliesFee !== undefined ? Math.min(35.00, Number(quote.shopSuppliesFee)) : Math.min(35.00, Number((totalLaborCost * 0.08).toFixed(2))))
    : 0;

  // Tax & Exemption - Taxes have NO cap, charged on Labor + Parts + Shop Supplies
  const isTaxExempt = Boolean(ro.isTaxExempt || quote?.isTaxExempt);
  const taxRate = isTaxExempt ? 0 : (quote?.taxRate ?? 0.07);
  const taxableAmount = totalLaborCost + totalPartsCost + shopSuppliesFee;
  const taxAmount = isTaxExempt ? 0 : Number((taxableAmount * taxRate).toFixed(2));
  const grandTotal = Number((totalLaborCost + totalPartsCost + shopSuppliesFee + taxAmount).toFixed(2));

  // Parts progress metrics
  const activeParts = allParts.filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED');
  const receivedCount = activeParts.filter(p => p.status === 'RECEIVED' || p.status === 'ISSUED_TO_TECH' || p.status === 'IN_STOCK').length;
  const orderedCount = activeParts.filter(p => ['ORDERED', 'DAILY_ORDER', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE'].includes(p.status)).length;
  const inTransitCount = activeParts.filter(p => p.status === 'IN_TRANSIT').length;
  const needsOrderCount = activeParts.filter(p => p.status === 'REQUESTED' || p.status === 'QUOTE_ONLY').length;
  const backorderedCount = activeParts.filter(p => p.status === 'BACKORDERED').length;
  const allPartsReady = activeParts.length > 0 && receivedCount === activeParts.length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner: Unified Quote & Working Order Master Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                Quote & Working Order #{ro.id}
              </span>
              {isTaxExempt ? (
                <span className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
                  <span>TAX EXEMPT (0% Tax)</span>
                  {ro.taxExemptNumber && <span className="font-mono text-[11px]">#{ro.taxExemptNumber}</span>}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium text-xs border border-slate-700">
                  Standard 7% Tax (Uncapped)
                </span>
              )}
              {allPartsReady ? (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All Parts Staged & Ready</span>
                </span>
              ) : activeParts.length > 0 ? (
                <span className="px-2.5 py-1 rounded-md bg-blue-900/80 text-blue-200 border border-blue-500/50 text-xs font-bold flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{receivedCount} of {activeParts.length} Parts Staged</span>
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-1">
              <h2 className="text-xl font-black text-white">
                {ro.customerName}
              </h2>
              <span className="text-xs text-slate-300 font-mono flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {ro.customerPhone}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Car className="w-3 h-3 text-slate-400" />
                {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
              </span>
              {ro.vehicle.vin && (
                <span className="text-[11px] font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                  VIN: {ro.vehicle.vin}
                </span>
              )}
              {ro.vehicle.mileage !== undefined && (
                <span className="text-[11px] text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                  Miles: {ro.vehicle.mileage.toLocaleString()}
                </span>
              )}

              {/* Quick Edit Details Button */}
              <button
                type="button"
                onClick={() => setIsEditingRODetails(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-600 text-[11px] font-bold cursor-pointer transition-colors"
                title="Edit Customer, Vehicle, Mileage, and Promised Time directly"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Order Details</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onOpenPrintModal(ro.id)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-600 shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print official customer estimate & quote sheet"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Print Quote</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuoteModal(ro.id)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open full interactive Quote Pricing Sheet"
            >
              <Receipt className="w-4 h-4 text-white" />
              <span>Full Pricing Matrix</span>
            </button>

            {needsOrderCount > 0 && (
              <button
                type="button"
                onClick={() => markAllPartsOrderedOnRO(ro.id)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Mark all pending parts as ordered"
              >
                <Truck className="w-4 h-4 text-slate-950" />
                <span>Mark All Ordered</span>
              </button>
            )}

            {orderedCount + inTransitCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllReceived}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                title="Mark all transit/ordered parts as received"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Mark All Received</span>
              </button>
            )}
          </div>
        </div>

        {/* Parts Pipeline Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-800/80 mt-4 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-amber-400 uppercase tracking-wider block font-bold">1. Needs Order</span>
            <span className="text-lg font-black font-mono text-white">{needsOrderCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-blue-400 uppercase tracking-wider block font-bold">2. Ordered (Pending)</span>
            <span className="text-lg font-black font-mono text-white">{orderedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-purple-400 uppercase tracking-wider block font-bold">3. In Transit (ETA)</span>
            <span className="text-lg font-black font-mono text-white">{inTransitCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">4. Received & Staged</span>
            <span className="text-lg font-black font-mono text-white">{receivedCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
            <span className="text-[10px] text-rose-400 uppercase tracking-wider block font-bold">5. Backordered</span>
            <span className="text-lg font-black font-mono text-white">{backorderedCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Ticket Workflow Pipeline Stepper (In Diag, In Repair, Closed, etc.) */}
      <TicketFlowStepper
        ro={ro}
        onUpdateStatus={(newStatus, notes, isUrgent) => {
          updateROStatus(ro.id, newStatus, notes, isUrgent);
        }}
        canEdit={true}
      />

      {/* 3. Quoted Financial Metrics Strip with Real-Time Totaling */}
      <div className="bg-white rounded-xl border-2 border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Labor ({totalLaborHours} hrs)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(totalLaborCost)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Parts ({activeParts.length} items)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(totalPartsCost)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
              Shop Supplies ($35 cap)
            </span>
            <span className="text-base font-black font-mono text-slate-900">
              {formatCurrency(shopSuppliesFee)}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold flex items-center gap-1">
              <span>Sales Tax</span>
              {isTaxExempt ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800 border border-amber-300">
                  EXEMPT
                </span>
              ) : (
                <span className="text-[9px] text-slate-500">7% Uncapped</span>
              )}
            </span>
            <span className={`text-base font-black font-mono ${isTaxExempt ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatCurrency(taxAmount)}
            </span>
          </div>

          <div className="border-l-2 border-slate-800 pl-4 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
            <span className="text-[10px] text-purple-700 uppercase tracking-wider block font-black">
              Total Estimate
            </span>
            <span className="text-xl font-black font-mono text-purple-900">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleCustomerTaxExempt(ro.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              isTaxExempt 
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200' 
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="Toggle customer sales tax exemption (0% tax)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTaxExempt ? 'Tax Exempt: Active' : 'Mark Tax Exempt'}</span>
          </button>
        </div>
      </div>

      {/* 3. Job Operations Pipeline: The Three C's (Concern, Cause, Correction) & Inline Parts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Working Order Operations & Parts ({concerns.length} {concerns.length === 1 ? 'Line' : 'Lines'})
            </h3>
          </div>

          {/* Service Manager & Staff: Add New Job / Operation */}
          <button
            type="button"
            onClick={() => setIsAddingJob(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer transition-colors"
            title="Add a new job line / customer concern to this repair order"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Job Line</span>
          </button>
        </div>

        {/* Add New Job Card */}
        {isAddingJob && (
          <form onSubmit={handleAddNewJobSubmit} className="bg-blue-50/70 p-5 rounded-2xl border-2 border-blue-400 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black inline-flex items-center justify-center">
                  +
                </span>
                <h4 className="text-sm font-black text-blue-950 uppercase tracking-wider">
                  Add New Job Line (Line {concerns.length + 1})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingJob(false)}
                className="text-slate-500 hover:text-slate-800 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                  Concern / Job Title *
                </label>
                <input
                  type="text"
                  value={newJobConcern}
                  onChange={(e) => setNewJobConcern(e.target.value)}
                  placeholder="e.g. Front Brake Pad & Rotor Replacement or Oil Leak Inspection"
                  className="w-full text-xs font-bold p-2.5 bg-white border-2 border-blue-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pay Type
                  </label>
                  <select
                    value={newJobPayType}
                    onChange={(e) => setNewJobPayType(e.target.value as ConcernPayType)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  >
                    <option value="CUSTOMER_PAY">Customer Pay ($165.00/hr)</option>
                    <option value="WARRANTY">Warranty ($121.78/hr)</option>
                    <option value="INTERNAL">Internal ($135.00/hr)</option>
                    <option value="EXTENDED_WARRANTY">Extended Warranty ($165.00/hr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Labor Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newJobHours}
                    onChange={(e) => setNewJobHours(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Tech
                  </label>
                  <select
                    value={newJobTechId}
                    onChange={(e) => setNewJobTechId(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Cause (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newJobCause}
                    onChange={(e) => setNewJobCause(e.target.value)}
                    placeholder="Root cause found upon diagnosis..."
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial Correction (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newJobCorrection}
                    onChange={(e) => setNewJobCorrection(e.target.value)}
                    placeholder="Repair work proposed / completed..."
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:border-blue-600 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingJob(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer"
                >
                  Create Job Line
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Lines Rendering */}
        {concerns.map((concernText, cIdx) => {
          const lineNum = cIdx + 1;
          const lineLaborItem = quote?.laborItems?.find(l => (l.roLineNumber || 1) === lineNum);
          const lineLaborHours = lineLaborItem?.laborHours !== undefined 
            ? lineLaborItem.laborHours 
            : (cIdx === 0 && quote?.totalLaborHours ? quote.totalLaborHours : 1.0);
          
          const linePayType: ConcernPayType = (ro.concernPayTypes && ro.concernPayTypes[cIdx]) || lineLaborItem?.payType || 'CUSTOMER_PAY';
          const lineLaborRate = PAY_TYPE_RATES[linePayType] || lineLaborItem?.hourlyRate || (quote?.defaultLaborRate || 165.00);
          const lineLaborSubtotal = Number((lineLaborHours * lineLaborRate).toFixed(2));

          const lineTechId = (ro.concernTechIds && ro.concernTechIds[cIdx]) || ro.techId;
          const assignedTech = technicians.find(t => t.id === lineTechId);

          // Filter parts for this specific line
          const lineParts = allParts.filter(p => {
            const pLine = p.roLineNumber || (p.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(p.notes.match(/For Line (\d+)/i)![1], 10) : 1);
            return pLine === lineNum;
          });

          const linePartsSubtotal = lineParts
            .filter(p => p.status !== 'DECLINED' && p.status !== 'CANCELLED')
            .reduce((sum, p) => sum + ((p.quantity || 1) * (Number(p.price) || 0)), 0);

          const lineTotal = lineLaborSubtotal + linePartsSubtotal;
          const isSavingLine = saveStatus[`line_${cIdx}`] === 'saving';
          const isSavedLine = saveStatus[`line_${cIdx}`] === 'saved';

          return (
            <div key={lineNum} className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden space-y-0">
              {/* Line Header: Line #, Concern title, Labor Hours, Pay Type, Assigned Tech, Line Subtotal, and Delete */}
              <div className="bg-slate-100 p-4 border-b border-slate-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Concern Title / Editor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-black inline-flex items-center justify-center shrink-0 shadow-2xs">
                        {lineNum}
                      </span>

                      {editingConcernIdx === cIdx ? (
                        <div className="flex items-center gap-1.5 flex-1 max-w-xl">
                          <input
                            type="text"
                            value={concernInputText}
                            onChange={(e) => setConcernInputText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveConcernText(cIdx);
                              if (e.key === 'Escape') setEditingConcernIdx(null);
                            }}
                            className="w-full text-sm font-black p-1.5 bg-white border-2 border-blue-600 rounded-md text-slate-950 focus:outline-none shadow-2xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveConcernText(cIdx)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                            title="Save Concern Title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingConcernIdx(null)}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-md cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group flex-wrap">
                          <h4 className="text-base font-black text-slate-950">
                            {concernText}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setConcernInputText(concernText);
                              setEditingConcernIdx(cIdx);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1 opacity-80 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Edit Concern / Job Title"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Labor, Pay Type, Tech, Total & Delete Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Labor Hours Input */}
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                      <span className="text-[10px] font-black uppercase text-slate-500">Labor:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={lineLaborHours}
                        onChange={(e) => handleLaborHoursChange(cIdx, e.target.value)}
                        className="w-14 text-xs font-mono font-black text-center text-slate-900 border-b border-slate-400 focus:border-blue-600 focus:outline-none bg-transparent"
                        title="Edit Labor Hours"
                      />
                      <span className="text-xs font-bold text-slate-600">hrs</span>
                    </div>

                    {/* Pay Type Selector */}
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
                      <span className="text-[10px] font-black uppercase text-slate-500 hidden sm:inline">Pay:</span>
                      <select
                        value={linePayType}
                        onChange={(e) => updateConcernPayType(ro.id, cIdx, e.target.value as ConcernPayType)}
                        className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                        title="Change Pay Type"
                      >
                        <option value="CUSTOMER_PAY">CP ($165/hr)</option>
                        <option value="WARRANTY">Warr ($121.78/hr)</option>
                        <option value="INTERNAL">Int ($135/hr)</option>
                        <option value="EXTENDED_WARRANTY">Ext Warr ($165/hr)</option>
                      </select>
                    </div>

                    {/* Assigned Technician Selector */}
                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-300 shadow-2xs">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      <select
                        value={lineTechId || ''}
                        onChange={(e) => updateConcernTech(ro.id, cIdx, e.target.value)}
                        className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer max-w-[120px]"
                        title="Assign Technician to Line"
                      >
                        <option value="">No Tech</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Line Total */}
                    <div className="bg-slate-900 text-white px-3 py-1 rounded-lg text-right shadow-2xs">
                      <span className="text-[9px] text-slate-300 uppercase tracking-wider block font-bold">Line Total</span>
                      <span className="text-xs font-black font-mono">{formatCurrency(lineTotal)}</span>
                    </div>

                    {/* + Add Part Button */}
                    <button
                      type="button"
                      onClick={() => handleStartInlineAdd(lineNum)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                      title={`Add part directly to Line ${lineNum}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Part</span>
                    </button>

                    {/* Service Manager Delete Job Authority */}
                    {isServiceManager && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete Line ${lineNum} (${concernText})? This will remove this job and its parts/labor from the quote.`)) {
                            deleteRepairOrderConcern(ro.id, cIdx);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                        title={`Delete Line ${lineNum} Job (Service Manager Only)`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Job</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* The Three C's Section: Cause & Correction Direct Editing */}
              <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      The Three C's (Line {lineNum})
                    </span>
                  </div>

                  {/* Auto-Save Indicator */}
                  {isSavingLine ? (
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" /> Auto-saving...
                    </span>
                  ) : isSavedLine ? (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Auto-saved
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* CAUSE Input */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2. CAUSE (Diagnostic Findings / Root Cause)</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={localCauses[cIdx] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalCauses(prev => ({ ...prev, [cIdx]: val }));
                        triggerThreeCsAutoSave(cIdx, val, undefined);
                      }}
                      placeholder="e.g. Front pads worn down to 2mm metal-to-metal; rotor surface heat-checked..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 resize-y min-h-[50px]"
                    />
                  </div>

                  {/* CORRECTION Input */}
                  <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>3. CORRECTION (Repair Procedure / Work Performed)</span>
                      </label>
                    </div>
                    <textarea
                      rows={2}
                      value={localCorrections[cIdx] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalCorrections(prev => ({ ...prev, [cIdx]: val }));
                        triggerThreeCsAutoSave(cIdx, undefined, val);
                      }}
                      placeholder="e.g. Replaced front brake pads and rotors; road test verified noise eliminated..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none font-medium text-slate-900 resize-y min-h-[50px]"
                    />
                  </div>
                </div>
              </div>

              {/* Parts Table for this Line */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Parts For Line {lineNum} ({lineParts.length} {lineParts.length === 1 ? 'part' : 'parts'})
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1" title="Parts typed into this ticket automatically save in real-time">
                      <Check className="w-2.5 h-2.5 text-emerald-600" /> Auto-Save Active
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartInlineAdd(lineNum)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Part</span>
                  </button>
                </div>

                {lineParts.length === 0 && inlineAddingLineNum !== lineNum ? (
                  <div className="py-5 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-1.5">
                    <p className="font-semibold text-slate-700">No parts assigned to Line {lineNum} yet</p>
                    <p className="text-[11px]">Click <strong>"+ Add Part"</strong> to enter the Part Number, Description, Qty, and Price directly on this screen.</p>
                    <button
                      type="button"
                      onClick={() => handleStartInlineAdd(lineNum)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Part Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Part # & Description</th>
                          <th className="py-2.5 px-2 text-center">Qty</th>
                          <th className="py-2.5 px-2 text-right">Price</th>
                          <th className="py-2.5 px-2.5 text-right">Total</th>
                          <th className="py-2.5 px-3">Supplier / Vendor</th>
                          <th className="py-2.5 px-3">Tracking & Daily ETA</th>
                          <th className="py-2.5 px-3">Part Status (Click to Change)</th>
                          <th className="py-2.5 px-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* New Part Inline Entry Row */}
                        {inlineAddingLineNum === lineNum && (
                          <tr className="bg-blue-50/70 border-2 border-blue-400 animate-in fade-in">
                            <td className="py-2.5 px-3 align-top min-w-[200px]">
                              <div className="space-y-1.5">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Part # *</span>
                                    {partAutoSaveStatus[`new_line_${lineNum}`] === 'saved' && (
                                      <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5 text-emerald-600" /> Auto-saved
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={newLinePartNumber}
                                    onChange={(e) => {
                                      const val = e.target.value.toUpperCase();
                                      setNewLinePartNumber(val);
                                      scheduleNewPartAutoSave(lineNum, { partNumber: val });
                                    }}
                                    onBlur={() => flushSaveInlineAdd(lineNum)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                      if (e.key === 'Escape') handleCancelInlineAdd();
                                    }}
                                    placeholder="e.g. 68088686AA or TBD"
                                    className="w-full text-xs font-mono font-black text-slate-950 p-1.5 bg-white border-2 border-blue-600 rounded-md focus:outline-none shadow-2xs"
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Description / Name *</span>
                                  <input
                                    type="text"
                                    value={newLineDescription}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setNewLineDescription(val);
                                      scheduleNewPartAutoSave(lineNum, { description: val });
                                    }}
                                    onBlur={() => flushSaveInlineAdd(lineNum)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                      if (e.key === 'Escape') handleCancelInlineAdd();
                                    }}
                                    placeholder="e.g. Brake Flush Fluid"
                                    className="w-full text-xs font-medium text-slate-900 p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center align-top">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Qty</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={newLineQty}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setNewLineQty(val);
                                  scheduleNewPartAutoSave(lineNum, { qty: val });
                                }}
                                onBlur={() => flushSaveInlineAdd(lineNum)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                className="w-14 text-xs font-black text-center p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right align-top min-w-[110px]">
                              <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">Unit Price ($)</span>
                              <div className="relative inline-block w-full">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={newLinePrice}
                                  onFocus={() => {
                                    if (newLinePrice === '0' || newLinePrice === '0.00') setNewLinePrice('');
                                  }}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setNewLinePrice(val);
                                    scheduleNewPartAutoSave(lineNum, { price: val });
                                  }}
                                  onBlur={() => {
                                    if (!newLinePrice || isNaN(Number(newLinePrice))) setNewLinePrice('0.00');
                                    else setNewLinePrice(Number(newLinePrice).toFixed(2));
                                    flushSaveInlineAdd(lineNum);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                    if (e.key === 'Escape') handleCancelInlineAdd();
                                  }}
                                  placeholder="0.00"
                                  className="w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono font-black text-slate-950 bg-white border-2 border-emerald-600 rounded-md focus:outline-none shadow-2xs"
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right align-top font-mono font-black text-slate-900 min-w-[90px]">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Total</span>
                              <div className="pt-1.5 text-sm font-black font-mono text-emerald-700">
                                ${((Number(newLineQty) || 1) * (Number(newLinePrice) || 0)).toFixed(2)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top min-w-[130px]">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Supplier</span>
                              <input
                                type="text"
                                value={newLineVendor}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewLineVendor(val);
                                  scheduleNewPartAutoSave(lineNum, { vendor: val });
                                }}
                                onBlur={() => flushSaveInlineAdd(lineNum)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                placeholder="Supplier / Vendor"
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md text-slate-900 font-medium focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top min-w-[180px]">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">ETA</span>
                              <input
                                type="text"
                                value={newLineEta}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewLineEta(val);
                                  scheduleNewPartAutoSave(lineNum, { eta: val });
                                }}
                                onBlur={() => flushSaveInlineAdd(lineNum)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineAdd(lineNum);
                                  if (e.key === 'Escape') handleCancelInlineAdd();
                                }}
                                placeholder="ETA (e.g. Tomorrow 10am)"
                                className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-600 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg inline-block shadow-2xs mt-4">
                                Needs Order
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center align-top">
                              <div className="flex flex-col items-center justify-center gap-1.5 pt-2">
                                {partAutoSaveStatus[`new_line_${lineNum}`] === 'saving' ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
                                    <span>Saving...</span>
                                  </span>
                                ) : (partAutoSaveStatus[`new_line_${lineNum}`] === 'saved' || activeNewPartIdRef.current) ? (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Auto-Saved</span>
                                  </span>
                                ) : null}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveInlineAdd(lineNum)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                                    title="Finish and close part row"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Done</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelInlineAdd}
                                    className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-2xs cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {lineParts.map(part => {
                          const statusConf = PART_STATUS_CONFIG[part.status] || PART_STATUS_CONFIG.ORDERED;
                          const StatusIcon = statusConf.icon;
                          const isInline = editingPartId === part.id;
                          const partPrice = Number(part.price) || 0;
                          const partTotal = (part.quantity || 1) * partPrice;
                          const isReceived = part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH' || part.status === 'IN_STOCK';

                          return (
                            <tr key={part.id} className={`hover:bg-slate-50/70 transition-colors ${isInline ? 'bg-amber-50/40' : isReceived ? 'bg-emerald-50/30' : ''}`}>
                              {/* Part Number & Name */}
                              <td className="py-2.5 px-3 align-top min-w-[200px]">
                                {isInline ? (
                                  <div className="space-y-1.5">
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">Part #</span>
                                        {partAutoSaveStatus[`part_${part.id}`] === 'saved' && (
                                          <span className="text-[9px] font-bold text-emerald-700 flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5 text-emerald-600" /> Auto-saved
                                          </span>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={inlinePartNumber}
                                        onChange={(e) => {
                                          const val = e.target.value.toUpperCase();
                                          setInlinePartNumber(val);
                                          scheduleEditPartAutoSave(part.id, { partNumber: val });
                                        }}
                                        onBlur={() => flushSaveInlineEdit(part.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="e.g. 68088686AA or TBD"
                                        className="w-full text-xs font-mono font-black text-slate-950 p-1.5 bg-white border-2 border-blue-500 rounded-md focus:outline-none shadow-2xs"
                                        autoFocus={focusField === 'partNumber'}
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Description / Name</span>
                                      <input
                                        type="text"
                                        value={inlineDescription}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setInlineDescription(val);
                                          scheduleEditPartAutoSave(part.id, { description: val });
                                        }}
                                        onBlur={() => flushSaveInlineEdit(part.id)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="Part name or description"
                                        className="w-full text-xs font-medium text-slate-900 p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                    className="cursor-pointer group py-1 rounded hover:bg-blue-50/60 transition-colors px-1 -mx-1"
                                    title="Click to put in Part # and Price inline"
                                  >
                                    <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5 group-hover:text-blue-700">
                                      <span>{part.partNumber || 'TBD'}</span>
                                      <span className="text-[10px] text-blue-600 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        <Edit3 className="w-2.5 h-2.5" /> Edit
                                      </span>
                                    </div>
                                    <div className="text-slate-700 font-medium text-xs">
                                      {part.description || part.name || 'Part Item'}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Qty */}
                              <td className="py-2.5 px-2 text-center align-top">
                                {isInline ? (
                                  <>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Qty</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={inlineQty}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                        setInlineQty(val);
                                        scheduleEditPartAutoSave(part.id, { qty: val });
                                      }}
                                      onBlur={() => flushSaveInlineEdit(part.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      className="w-14 text-xs font-black text-center p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                  </>
                                ) : (
                                  <span 
                                    onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                    className="font-bold text-slate-800 cursor-pointer hover:text-blue-700 py-1 inline-block"
                                    title="Click to edit Qty"
                                  >
                                    {part.quantity || 1}
                                  </span>
                                )}
                              </td>

                              {/* Unit Price */}
                              <td className="py-2.5 px-2 text-right align-top min-w-[110px]">
                                {isInline ? (
                                  <>
                                    <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">Price ($)</span>
                                    <div className="relative inline-block w-full">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">$</span>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={inlinePrice}
                                        onFocus={() => {
                                          if (inlinePrice === '0' || inlinePrice === '0.00' || inlinePrice === '$0.00' || inlinePrice === '0.0') {
                                            setInlinePrice('');
                                          }
                                        }}
                                        onChange={(e) => {
                                          const val = e.target.value.replace(/[^0-9.]/g, '');
                                          setInlinePrice(val);
                                          scheduleEditPartAutoSave(part.id, { price: val });
                                        }}
                                        onBlur={() => {
                                          if (!inlinePrice || inlinePrice === '.' || isNaN(Number(inlinePrice))) {
                                            setInlinePrice('0.00');
                                          } else {
                                            setInlinePrice(Number(inlinePrice).toFixed(2));
                                          }
                                          flushSaveInlineEdit(part.id);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                          if (e.key === 'Escape') handleCancelInlineEdit();
                                        }}
                                        placeholder="0.00"
                                        className="w-full pl-5 pr-2 py-1.5 text-xs text-right font-mono font-black text-slate-950 bg-white border-2 border-emerald-500 rounded-md focus:outline-none shadow-2xs"
                                        autoFocus={focusField === 'price'}
                                        title="Enter unit price in dollars and cents"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <div 
                                    onClick={() => handleStartInlineEdit(part, 'price')}
                                    className="font-mono font-bold text-slate-700 cursor-pointer group hover:bg-emerald-50/60 transition-colors py-1 px-1 -mx-1 rounded"
                                    title="Click to put in Price directly"
                                  >
                                    <div className="flex items-center justify-end gap-1.5 group-hover:text-emerald-700 font-black">
                                      <span>{formatCurrency(partPrice)}</span>
                                      <span className="text-[10px] text-emerald-600 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        <Edit3 className="w-2.5 h-2.5" />
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Total */}
                              <td className="py-2.5 px-2.5 text-right align-top font-mono font-black text-slate-900 min-w-[90px]">
                                {isInline ? (
                                  <div className="pt-4 text-sm font-black font-mono text-emerald-700">
                                    ${((Number(inlineQty) || 1) * (Number(inlinePrice) || 0)).toFixed(2)}
                                  </div>
                                ) : (
                                  <div className="py-1">
                                    {formatCurrency(partTotal)}
                                  </div>
                                )}
                              </td>

                              {/* Vendor */}
                              <td className="py-2.5 px-3 align-top min-w-[130px]">
                                {isInline ? (
                                  <>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Supplier</span>
                                    <input
                                      type="text"
                                      value={inlineVendor}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlineVendor(val);
                                        scheduleEditPartAutoSave(part.id, { vendor: val });
                                      }}
                                      onBlur={() => flushSaveInlineEdit(part.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="e.g. MOPAR / AutoZone"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
                                      autoFocus={focusField === 'vendor'}
                                    />
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-bold text-slate-700 py-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>{part.vendor || 'Shop Inventory / Supplier'}</span>
                                  </span>
                                )}
                              </td>

                              {/* Tracking & ETA */}
                              <td className="py-2.5 px-3 align-top min-w-[180px]">
                                {isInline ? (
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={inlineEta}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlineEta(val);
                                        scheduleEditPartAutoSave(part.id, { eta: val });
                                      }}
                                      onBlur={() => flushSaveInlineEdit(part.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="ETA: e.g. Tomorrow 10am"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={inlineTracking}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlineTracking(val);
                                        scheduleEditPartAutoSave(part.id, { tracking: val });
                                      }}
                                      onBlur={() => flushSaveInlineEdit(part.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="Tracking # / PO #"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md font-mono focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={inlineNotes}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setInlineNotes(val);
                                        scheduleEditPartAutoSave(part.id, { notes: val });
                                      }}
                                      onBlur={() => flushSaveInlineEdit(part.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineEdit(part.id);
                                        if (e.key === 'Escape') handleCancelInlineEdit();
                                      }}
                                      placeholder="Bin / Notes"
                                      className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => handleStartInlineEdit(part, 'vendor')}
                                    className="space-y-0.5 cursor-pointer py-1"
                                    title="Click to edit tracking & ETA"
                                  >
                                    <div className="font-bold text-slate-800 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>{part.estimatedArrival || 'Pending ETA'}</span>
                                    </div>
                                    {part.trackingNumber && (
                                      <div className="text-[11px] font-mono text-blue-700 font-bold flex items-center gap-1">
                                        <Truck className="w-3 h-3 text-blue-500" />
                                        <span>#{part.trackingNumber}</span>
                                      </div>
                                    )}
                                    {part.notes && !part.notes.startsWith('For Line') && (
                                      <div className="text-[11px] text-slate-500 italic">
                                        {part.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Part Status Dropdown */}
                              <td className="py-2.5 px-3 align-top min-w-[160px]">
                                <div className="relative inline-block w-full">
                                  <select
                                    value={part.status}
                                    onChange={(e) => handleQuickStatusChange(part.id, e.target.value as PartStatus)}
                                    className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border appearance-none cursor-pointer pr-7 shadow-2xs ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                                    title="Click to update parts logistics status"
                                  >
                                    <option value="REQUESTED">🟧 Needs Order</option>
                                    <option value="DAILY_ORDER">🚚 Daily Order (Today 2pm)</option>
                                    <option value="SPECIAL_ORDER_1_5_DAYS">📦 Special Order (1-5 Days)</option>
                                    <option value="ORDERED">📦 General Ordered</option>
                                    <option value="VOR_UPGRADE">🚨 VOR Urgent Delivery</option>
                                    <option value="IN_TRANSIT">🛫 In Transit</option>
                                    <option value="RECEIVED">✅ Arrived & Staged</option>
                                    <option value="IN_STOCK">🏢 In Stock / In Bay</option>
                                    <option value="ISSUED_TO_TECH">🔧 Issued to Tech</option>
                                    <option value="BACKORDERED">⚠️ Backordered</option>
                                    <option value="DECLINED">🛑 Declined by Customer</option>
                                  </select>
                                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                                    ▼
                                  </span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-2.5 px-2 text-center align-top">
                                <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                                  {isInline ? (
                                    <>
                                      {partAutoSaveStatus[`part_${part.id}`] === 'saving' ? (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
                                          <span>Saving...</span>
                                        </span>
                                      ) : partAutoSaveStatus[`part_${part.id}`] === 'saved' ? (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-in fade-in">
                                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                                          <span>Auto-Saved</span>
                                        </span>
                                      ) : null}
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveInlineEdit(part.id)}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer flex items-center gap-1"
                                          title="Done editing part"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Done</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelInlineEdit}
                                          className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-2xs cursor-pointer"
                                          title="Cancel"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      {!isReceived && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkReceived(part.id)}
                                          className="p-1.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-2xs cursor-pointer"
                                          title="Mark Received / Arrived today"
                                        >
                                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleStartInlineEdit(part, 'partNumber')}
                                        className="p-1.5 rounded-md hover:bg-blue-100 text-slate-700 hover:text-blue-700 transition-colors cursor-pointer border border-transparent hover:border-blue-300"
                                        title="Edit Part #, Price, Qty, and Tracking inline"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deletePartItem(ro.id, part.id)}
                                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                                        title="Remove part from quote"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
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
          );
        })}
      </div>

      {/* Quick Edit Customer & Vehicle Details Modal */}
      {isEditingRODetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveRODetails}
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border-2 border-slate-700 space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  Quick Edit Order Details (RO #{ro.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingRODetails(false)}
                className="text-slate-500 hover:text-slate-800 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={editCustName}
                  onChange={(e) => setEditCustName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Customer Phone *
                </label>
                <input
                  type="text"
                  value={editCustPhone}
                  onChange={(e) => setEditCustPhone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Vehicle Year
                </label>
                <input
                  type="number"
                  value={editVehYear}
                  onChange={(e) => setEditVehYear(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Vehicle Make
                </label>
                <input
                  type="text"
                  value={editVehMake}
                  onChange={(e) => setEditVehMake(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={editVehModel}
                  onChange={(e) => setEditVehModel(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-slate-800 mb-1">
                  Odometer Mileage
                </label>
                <input
                  type="number"
                  value={editVehMileage}
                  onChange={(e) => setEditVehMileage(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-slate-800 mb-1">
                  Vehicle Identification Number (VIN)
                </label>
                <input
                  type="text"
                  value={editVehVin}
                  onChange={(e) => setEditVehVin(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono font-bold uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-slate-800 mb-1">
                  Customer Promised Delivery Time
                </label>
                <input
                  type="datetime-local"
                  value={editPromisedTime ? new Date(editPromisedTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditPromisedTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditingRODetails(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

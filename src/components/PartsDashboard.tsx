import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Search, 
  Plus, 
  AlertTriangle, 
  Wrench, 
  ExternalLink,
  Copy,
  Check,
  Car,
  UserCheck,
  FileText,
  Layers,
  X,
  Calendar,
  DollarSign,
  Hash,
  User,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
  Trash2,
  ArrowDownToLine,
  Zap,
  LayoutGrid,
  List,
  Store,
  ChevronDown,
  Calculator
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PartItem, PartStatus, RepairOrder } from '../types';
import { formatEtaBadge, formatDateTime, formatPrice, formatCurrency } from '../utils/formatters';
import { ArrivalTimeFrameDropdown } from './ArrivalTimeFrameDropdown';
import { computeEtaAndStatus } from '../utils/partArrivalOptions';

const INITIAL_VENDORS = [
  'STELLANTIS',
  'OREILLY',
  'AUTOZONE',
  'HOLLANDS',
  'RICKS PRO TRUCK'
];

const INITIAL_PART_STATUS_OPTIONS = [
  { id: 'IN_STOCK', label: 'IN STOCK' },
  { id: 'LOCAL_PURCHASE', label: 'LOCAL PURCHASE' },
  { id: 'DAILY_ORDER', label: 'DAILY ORDER' },
  { id: 'SPECIAL_ORDER_1_5_DAYS', label: 'SPECIAL ORDER 1-5 DAYS' },
  { id: 'VOR_UPGRADE', label: 'VOR UPGRADE' },
];

export const PartsDashboard: React.FC = () => {
  const { repairOrders, updatePartStatus, addPartOrder, updatePartItem, deletePartItem, setSelectedRO, users } = useApp();

  // Active view: 'RO_LIST' (Access all ROs directly) or 'PARTS_LIST' (Tracked Logistics)
  const [activeTab, setActiveTab] = useState<'RO_LIST' | 'PARTS_LIST'>('RO_LIST');

  // View Mode: 'CARD' or 'LINE'
  const [viewMode, setViewMode] = useState<'CARD' | 'LINE'>(() => {
    try {
      return (localStorage.getItem('parts_view_mode') as 'CARD' | 'LINE') || 'CARD';
    } catch {
      return 'CARD';
    }
  });

  const handleSetViewMode = (mode: 'CARD' | 'LINE') => {
    setViewMode(mode);
    try {
      localStorage.setItem('parts_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Dedicated Repair Order Lookup & Pull-Up Bar (Unified single line)
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllBackgroundROs, setShowAllBackgroundROs] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<PartStatus | 'ALL'>('ALL');
  const [roStatusFilter, setRoStatusFilter] = useState<string>('ALL');

  // Vendor list with custom additions
  const [vendors, setVendors] = useState<string[]>(INITIAL_VENDORS);
  const [isAddingCustomVendor, setIsAddingCustomVendor] = useState(false);
  const [customVendorInput, setCustomVendorInput] = useState('');

  // Status list with custom additions
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [isAddingCustomStatus, setIsAddingCustomStatus] = useState(false);
  const [customStatusInput, setCustomStatusInput] = useState('');

  // Modal State for adding parts directly to any RO
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [selectedTargetRoId, setSelectedTargetRoId] = useState<string>('');
  const [partLines, setPartLines] = useState<Array<{
    id: string;
    sourcePartId?: string;
    partNumber: string;
    description: string;
    quantity: number;
    price: string;
    roLineNumber?: number;
  }>>([
    { id: 'pline_1', partNumber: '', description: '', quantity: 1, price: '', roLineNumber: 1 }
  ]);
  const [partVendor, setPartVendor] = useState<string>(INITIAL_VENDORS[0]);
  const [partStatus, setPartStatus] = useState<PartStatus>('IN_STOCK');
  const [partTimeFrameId, setPartTimeFrameId] = useState<string>('TODAY_5PM');
  const [partEstimatedArrival, setPartEstimatedArrival] = useState<string>('');
  const [partEtaTime, setPartEtaTime] = useState('17:00');
  const [partTracking, setPartTracking] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [copiedVinId, setCopiedVinId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Searchable RO dropdown in Add Parts modal
  const [isRoDropdownOpen, setIsRoDropdownOpen] = useState(false);
  const [roSearchQuery, setRoSearchQuery] = useState('');
  const roDropdownRef = useRef<HTMLDivElement>(null);

  // Active Repair Orders
  const activeROs = useMemo(() => {
    return repairOrders.filter(ro => ro.status !== 'COMPLETED');
  }, [repairOrders]);

  // Filtered ROs for Searchable Dropdown by RO #, customer name, phone, year, make, model, VIN, tech, advisor
  const filteredActiveROsForDropdown = useMemo(() => {
    const q = roSearchQuery.trim().toLowerCase();
    if (!q) return activeROs;
    const cleanQ = q.replace(/^#|^ro-?/, '');
    const terms = q.split(/\s+/).filter(Boolean);

    return activeROs.filter(ro => {
      const cleanRoId = ro.id.toLowerCase().replace(/^#|^ro-?/, '');
      const roNumMatch = cleanRoId.includes(cleanQ) || ro.id.toLowerCase().includes(q);
      const custMatch = (ro.customerName || '').toLowerCase().includes(q) || (ro.customerPhone || '').includes(q);
      const vehicleYear = String(ro.vehicle?.year || '');
      const vehicleMake = (ro.vehicle?.make || '').toLowerCase();
      const vehicleModel = (ro.vehicle?.model || '').toLowerCase();
      const vehiclePlate = (ro.vehicle?.licensePlate || '').toLowerCase();
      const vehicleVin = (ro.vehicle?.vin || '').toLowerCase();
      const vehicleFull = `${vehicleYear} ${vehicleMake} ${vehicleModel} ${vehiclePlate}`.toLowerCase();
      const techMatch = (ro.techName || '').toLowerCase().includes(q);
      const advisorMatch = (ro.advisorName || '').toLowerCase().includes(q);

      // Multi-word search support (e.g. "smith chevy", "2021 silverado", "#1042")
      const multiWordMatch = terms.length > 1 && terms.every(term => {
        const cleanTerm = term.replace(/^#|^ro-?/, '');
        return (
          cleanRoId.includes(cleanTerm) ||
          (ro.customerName || '').toLowerCase().includes(term) ||
          vehicleFull.includes(term) ||
          vehicleVin.includes(term) ||
          (ro.techName || '').toLowerCase().includes(term) ||
          (ro.advisorName || '').toLowerCase().includes(term)
        );
      });

      return (
        roNumMatch ||
        custMatch ||
        vehicleYear.includes(q) ||
        vehicleMake.includes(q) ||
        vehicleModel.includes(q) ||
        vehicleVin.includes(q) ||
        vehicleFull.includes(q) ||
        techMatch ||
        advisorMatch ||
        multiWordMatch
      );
    });
  }, [activeROs, roSearchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (roDropdownRef.current && !roDropdownRef.current.contains(e.target as Node)) {
        setIsRoDropdownOpen(false);
      }
    };
    if (isRoDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isRoDropdownOpen]);

  // Currently selected RO inside the Add/Order modal
  const currentSelectedRO = useMemo(() => {
    return repairOrders.find(ro => ro.id === selectedTargetRoId) || null;
  }, [repairOrders, selectedTargetRoId]);

  // Helper to identify technician requested parts (both Order Now and Quote Only)
  const isTechRequestedPart = (p: PartItem) => 
    p.status === 'REQUESTED' || p.status === 'QUOTE_ONLY' || p.status === 'NEEDED' || p.requestType === 'ORDER_NOW' || p.requestType === 'QUOTE_ONLY';

  // Helper to get numeric line order for a part (Line 1, Line 2, etc.)
  const getPartLineOrder = (part: PartItem): number => {
    if (typeof part.roLineNumber === 'number' && !isNaN(part.roLineNumber)) {
      return part.roLineNumber;
    }
    if (part.notes) {
      const match = part.notes.match(/Line (\d+)/i);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    return 999;
  };

  // Parts on the currently selected RO that are in REQUESTED or QUOTE_ONLY status from the technician
  const requestedPartsForSelectedRO = useMemo(() => {
    if (!currentSelectedRO) return [];
    return [...currentSelectedRO.parts.filter(isTechRequestedPart)].sort((a, b) => getPartLineOrder(a) - getPartLineOrder(b));
  }, [currentSelectedRO]);

  // Technician notes on the selected RO
  const techNotesForSelectedRO = useMemo(() => {
    if (!currentSelectedRO) return '';
    const partWithNotes = currentSelectedRO.parts.find(p => isTechRequestedPart(p) && p.notes);
    if (partWithNotes?.notes) return partWithNotes.notes;
    if (currentSelectedRO.quote?.techNotes) return currentSelectedRO.quote.techNotes;
    return '';
  }, [currentSelectedRO]);

  // Track ROs whose parts have been added to the repair order in this session
  const [addedRoIds, setAddedRoIds] = useState<Set<string>>(new Set());

  // All active repair orders that have technician-requested parts or are waiting on parts,
  // plus any recently processed in this session so the user sees the "Added to Repair Order" confirmation.
  const rosWithPendingTechRequests = useMemo(() => {
    return repairOrders.filter(ro => 
      ro.status !== 'COMPLETED' && ro.status !== 'CLOSED' && (
        ro.parts?.some(isTechRequestedPart) ||
        ro.status === 'WAITING_PARTS' ||
        addedRoIds.has(ro.id)
      )
    );
  }, [repairOrders, addedRoIds]);

  // Quick fulfillment draft state for technician-requested parts (Part Number, Price, etc.)
  const [reqDrafts, setReqDrafts] = useState<Record<string, {
    partNumber: string;
    price: string;
    quantity: number;
    status: PartStatus;
    vendor: string;
    timeFrameId?: string;
    estimatedArrival?: string;
  }>>({});
  const [showManualPartLines, setShowManualPartLines] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [sentToEstimatePartIds, setSentToEstimatePartIds] = useState<Set<string>>(new Set());

  // Helper to determine if a quote-only part has been sent to estimate
  const isPartSentToEstimate = (part: PartItem): boolean => {
    return Boolean(
      part.sentToEstimate ||
      sentToEstimatePartIds.has(part.id) ||
      (part.status === 'QUOTE_ONLY' && (part.estimatedArrival === 'Price Quoted for Main Estimate' || part.price !== undefined))
    );
  };

  // Helper to get or initialize draft values for any technician-requested part
  const getReqDraft = (part: PartItem) => {
    const existing = reqDrafts[part.id];
    if (existing) return existing;
    return {
      partNumber: part.partNumber && part.partNumber !== 'TBD' ? part.partNumber : '',
      price: formatPrice(part.price),
      quantity: Math.max(1, part.quantity || 1),
      status: (part.status === 'REQUESTED' || part.status === 'QUOTE_ONLY' ? 'DAILY_ORDER' : part.status) as PartStatus,
      vendor: part.vendor && part.vendor !== 'TBD' ? part.vendor : (vendors[0] || INITIAL_VENDORS[0]),
      timeFrameId: part.status === 'IN_STOCK' ? 'IN_STOCK' : 'TODAY_5PM',
      estimatedArrival: part.estimatedArrival || '',
    };
  };

  const updateReqDraft = (partId: string, field: string, value: any) => {
    setReqDrafts(prev => {
      const existing = prev[partId] || {
        partNumber: '',
        price: '',
        quantity: 1,
        status: 'DAILY_ORDER',
        vendor: vendors[0] || INITIAL_VENDORS[0],
        timeFrameId: 'TODAY_5PM',
        estimatedArrival: '',
      };
      return {
        ...prev,
        [partId]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  // Instant fulfillment for a single technician-requested part item
  const handleFulfillSingleRequestedPart = (roId: string, part: PartItem) => {
    const draft = getReqDraft(part);
    const cleanPn = draft.partNumber?.trim().toUpperCase() || 'TBD';
    const priceVal = draft.price && !isNaN(parseFloat(draft.price)) ? parseFloat(draft.price) : undefined;
    const qty = Math.max(1, Number(draft.quantity) || part.quantity || 1);
    
    // Resolve expectation of part arrival & status
    const tfCalc = draft.timeFrameId ? computeEtaAndStatus(draft.timeFrameId) : null;
    const effectiveStatus = draft.status || tfCalc?.status || 'DAILY_ORDER';
    const effectiveVendor = draft.vendor || partVendor || 'STELLANTIS';

    let etaArrival = draft.estimatedArrival || tfCalc?.estimatedArrival;
    if (!etaArrival) {
      if (effectiveStatus === 'IN_STOCK') {
        etaArrival = new Date().toISOString();
      } else {
        const today = new Date();
        const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
        const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));
        etaArrival = etaDate.toISOString();
      }
    }

    updatePartItem(roId, part.id, {
      partNumber: cleanPn,
      price: priceVal,
      quantity: qty,
      status: effectiveStatus,
      vendor: effectiveVendor,
      estimatedArrival: etaArrival,
      notes: partNotes.trim() || undefined,
    });

    showToast(`✓ "${part.description}": Part #${cleanPn} ($${priceVal !== undefined ? priceVal.toFixed(2) : '0.00'}) ordered for RO #${roId}!`);
  };

  // Save price quote for technician-requested parts directly to Main Estimate
  const handleSaveQuotePriceOnly = (roId: string, part: PartItem) => {
    const draft = getReqDraft(part);
    const cleanPn = draft.partNumber?.trim().toUpperCase() || 'TBD';
    const priceVal = draft.price && !isNaN(parseFloat(draft.price)) ? parseFloat(draft.price) : undefined;
    const qty = Math.max(1, Number(draft.quantity) || part.quantity || 1);
    const effectiveVendor = draft.vendor || partVendor || 'Shop Inventory / Supplier';

    setSentToEstimatePartIds(prev => new Set(prev).add(part.id));

    updatePartItem(roId, part.id, {
      partNumber: cleanPn,
      price: priceVal,
      quantity: qty,
      status: 'QUOTE_ONLY',
      requestType: 'QUOTE_ONLY',
      vendor: effectiveVendor,
      estimatedArrival: 'Price Quoted for Main Estimate',
      sentToEstimate: true,
      notes: partNotes.trim() || undefined,
    });

    showToast(`💬 Quoted "${part.description}": Part #${cleanPn} ($${priceVal !== undefined ? priceVal.toFixed(2) : '0.00'}) added to Quote for RO #${roId}!`);
  };

  // Batch fulfillment for all technician-requested parts on an RO
  const handleFulfillAllRequestedParts = (roId: string) => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;
    const reqs = targetRO.parts.filter(isTechRequestedPart);
    if (reqs.length === 0) return;

    let count = 0;
    reqs.forEach(part => {
      const draft = getReqDraft(part);
      const cleanPn = draft.partNumber?.trim().toUpperCase() || 'TBD';
      const priceVal = draft.price && !isNaN(parseFloat(draft.price)) ? parseFloat(draft.price) : undefined;
      const qty = Math.max(1, Number(draft.quantity) || part.quantity || 1);
      
      const tfCalc = draft.timeFrameId ? computeEtaAndStatus(draft.timeFrameId) : null;
      const effectiveStatus = draft.status || tfCalc?.status || 'DAILY_ORDER';
      const effectiveVendor = draft.vendor || partVendor || 'STELLANTIS';

      let etaArrival = draft.estimatedArrival || tfCalc?.estimatedArrival;
      if (!etaArrival) {
        if (effectiveStatus === 'IN_STOCK') {
          etaArrival = new Date().toISOString();
        } else {
          const today = new Date();
          const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
          const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));
          etaArrival = etaDate.toISOString();
        }
      }

      updatePartItem(roId, part.id, {
        partNumber: cleanPn,
        price: priceVal,
        quantity: qty,
        status: effectiveStatus,
        vendor: effectiveVendor,
        estimatedArrival: etaArrival,
        notes: partNotes.trim() || undefined,
      });
      count++;
    });

    setIsAddPartModalOpen(false);
    showToast(`⚡ Ordered and priced ${count} technician-requested parts for RO #${roId}!`);
  };

  const handleAddPartsToROFromCard = (roId: string) => {
    const targetRO = repairOrders.find(r => r.id === roId);
    if (!targetRO) return;

    handleFulfillAllRequestedParts(roId);
    setAddedRoIds(prev => new Set(prev).add(roId));
  };

  const handleImportRequestedParts = () => {
    if (!currentSelectedRO) return;
    const reqs = currentSelectedRO.parts.filter(isTechRequestedPart);
    if (reqs.length === 0) {
      showToast('No pending requested parts on this RO.');
      return;
    }
    setPartLines(reqs.map((rp, idx) => ({
      id: `pline_${rp.id}_${idx}`,
      sourcePartId: rp.id,
      partNumber: rp.partNumber && rp.partNumber !== 'TBD' ? rp.partNumber : '',
      description: rp.description || rp.name || '',
      quantity: Math.max(1, rp.quantity || 1),
      price: formatPrice(rp.price),
    })));
    setPartStatus('DAILY_ORDER');
    showToast(`Loaded ${reqs.length} requested part${reqs.length > 1 ? 's' : ''} into order lines!`);
  };

  const handleAddPartLine = () => {
    setPartLines(prev => [
      ...prev,
      { id: `pline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, partNumber: '', description: '', quantity: 1, price: '', roLineNumber: 1 }
    ]);
  };

  const handleRemovePartLine = (id: string) => {
    if (partLines.length <= 1) {
      setPartLines([{ id: `pline_${Date.now()}`, partNumber: '', description: '', quantity: 1, price: '', roLineNumber: 1 }]);
      return;
    }
    setPartLines(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePartLine = (id: string, field: 'partNumber' | 'description' | 'quantity' | 'price' | 'roLineNumber', value: any) => {
    setPartLines(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, [field]: value };
    }));
  };

  const handleStepPartQuantity = (id: string, delta: number) => {
    setPartLines(prev => prev.map(p => {
      if (p.id !== id) return p;
      const current = Number(p.quantity) || 1;
      return { ...p, quantity: Math.max(1, Math.min(99, current + delta)) };
    }));
  };

  // Technicians and Service Advisors for datalists & lookups
  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN');
  }, [users]);

  const serviceAdvisors = useMemo(() => {
    return users.filter(u => u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER');
  }, [users]);

  // Check whether lookup search query is entered
  const isAnyLookupActive = useMemo(() => {
    return Boolean(searchQuery.trim());
  }, [searchQuery]);

  // Helper to reset lookup back to hidden background state
  const clearAllLookups = () => {
    setSearchQuery('');
    setShowAllBackgroundROs(false);
  };

  // Dynamically collect custom statuses present in any RO part
  const existingCustomStatuses = useMemo(() => {
    const known = new Set([
      'IN_STOCK',
      'DAILY_ORDER',
      'SPECIAL_ORDER_1_5_DAYS',
      'SPECIAL_ORDER',
      'VOR_UPGRADE',
      'ORDERED',
      'IN_TRANSIT',
      'RECEIVED',
      'ISSUED_TO_TECH',
      'REQUESTED',
      'BACKORDERED'
    ]);
    const custom = new Set<string>(customStatuses);
    repairOrders.forEach(ro => {
      ro.parts.forEach(p => {
        if (p.status && !known.has(p.status)) {
          custom.add(p.status);
        }
      });
    });
    return Array.from(custom);
  }, [repairOrders, customStatuses]);

  const allAvailableStatuses = useMemo(() => {
    const list = [...INITIAL_PART_STATUS_OPTIONS];
    existingCustomStatuses.forEach(st => {
      if (!list.some(item => item.id === st)) {
        list.push({ id: st, label: st.replace(/_/g, ' ') });
      }
    });
    return list;
  }, [existingCustomStatuses]);

  // Flatten all parts with RO metadata for Logistics Tab
  const allParts = useMemo(() => {
    return repairOrders.flatMap(ro => 
      ro.parts.map(part => ({
        ...part,
        customerName: ro.customerName,
        vehicleStr: `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`,
        advisorName: ro.advisorName,
        techName: ro.techName,
        bay: ro.bay,
        roStatus: ro.status,
        roPromisedTime: ro.promisedTime,
      }))
    );
  }, [repairOrders]);

  // Metrics
  const totalRoCount = activeROs.length;
  const rosNeedingPartsCount = activeROs.filter(ro => ro.parts.length === 0).length;
  const inStockCount = allParts.filter(p => p.status === 'IN_STOCK' || p.status === 'ISSUED_TO_TECH').length;
  const localPurchaseCount = allParts.filter(p => p.status === 'LOCAL_PURCHASE').length;
  const dailyOrderCount = allParts.filter(p => p.status === 'DAILY_ORDER' || p.status === 'ORDERED').length;
  const specialOrderCount = allParts.filter(p => p.status === 'SPECIAL_ORDER_1_5_DAYS' || p.status === 'SPECIAL_ORDER').length;
  const vorUpgradeCount = allParts.filter(p => p.status === 'VOR_UPGRADE').length;
  const receivedCount = allParts.filter(p => p.status === 'RECEIVED').length;
  const quoteOnlyCount = allParts.filter(p => p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY').length;
  const requestedTechCount = allParts.filter(p => isTechRequestedPart(p)).length;

  // Filtered ROs for RO Directory Tab - Hidden in background by default until entered or revealed
  const filteredROs = useMemo(() => {
    // If no search input is provided and user has not clicked reveal, repair orders remain hidden in the background (unless filtering by TECH_REQUESTS)
    if (!isAnyLookupActive && !showAllBackgroundROs && roStatusFilter !== 'TECH_REQUESTS') {
      return [];
    }

    return activeROs.filter(ro => {
      // 1. RO Status filter
      if (roStatusFilter === 'TECH_REQUESTS' && !ro.parts.some(isTechRequestedPart) && ro.status !== 'WAITING_PARTS') return false;
      if (roStatusFilter === 'NEEDS_PARTS' && ro.parts.length > 0) return false;
      if (roStatusFilter === 'HAS_PARTS' && ro.parts.length === 0) return false;
      if (roStatusFilter === 'WAITING_PARTS' && ro.status !== 'WAITING_PARTS') return false;
      if (roStatusFilter === 'IN_BAY' && ro.status !== 'IN_BAY' && ro.status !== 'IN_REPAIR') return false;

      // 2. Unified Search across RO #, Customer, VIN, Tech, Advisor, Vehicle, Concerns, Parts
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const cleanQ = q.replace(/^#|^ro-?/, '');
        const cleanRoId = ro.id.toLowerCase().replace(/^#|^ro-?/, '');

        // Match RO # (handles exact, partial, or with prefix e.g. 1042 or #1042)
        const matchRO = cleanRoId.includes(cleanQ) || ro.id.toLowerCase().includes(q);

        // Match Customer Name or Phone
        const matchCustomer = ro.customerName.toLowerCase().includes(q) || 
                              (ro.customerPhone && ro.customerPhone.includes(q));

        // Match VIN (full VIN or partial / last 8)
        const matchVin = ro.vehicle.vin.toLowerCase().includes(q);

        // Match Technician (matches tech name, employee number, ID, or concern line tech)
        const assignedTech = users.find(u => u.id === ro.techId);
        const matchTech = (ro.techName && ro.techName.toLowerCase().includes(q)) ||
                          (ro.techId && ro.techId.toLowerCase() === q) ||
                          (assignedTech?.employeeNumber && assignedTech.employeeNumber.toLowerCase().includes(q)) ||
                          (assignedTech?.name && assignedTech.name.toLowerCase().includes(q)) ||
                          (ro.concernTechNames && ro.concernTechNames.some(t => t && t.toLowerCase().includes(q)));

        // Match Service Advisor (matches advisor name, ID, or employee number)
        const advisorUser = users.find(u => u.id === ro.advisorId);
        const matchAdvisor = (ro.advisorName && ro.advisorName.toLowerCase().includes(q)) ||
                             (ro.advisorId && ro.advisorId.toLowerCase() === q) ||
                             (advisorUser?.employeeNumber && advisorUser.employeeNumber.toLowerCase().includes(q)) ||
                             (advisorUser?.name && advisorUser.name.toLowerCase().includes(q));

        // Match Vehicle details (year, make, model, license plate)
        const matchVehicle = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ${ro.vehicle.licensePlate || ''}`.toLowerCase().includes(q);

        // Match Concerns
        const matchConcerns = ro.concerns.some(c => c.toLowerCase().includes(q)) || 
                              (ro.primaryConcern && ro.primaryConcern.toLowerCase().includes(q));

        // Match Parts (part number or description)
        const matchParts = ro.parts.some(p => p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

        if (!matchRO && !matchCustomer && !matchVin && !matchTech && !matchAdvisor && !matchVehicle && !matchConcerns && !matchParts) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const aReq = a.parts.some(isTechRequestedPart);
      const bReq = b.parts.some(isTechRequestedPart);
      if (aReq && !bReq) return -1;
      if (!aReq && bReq) return 1;
      return 0;
    });
  }, [
    activeROs, 
    roStatusFilter, 
    searchQuery, 
    isAnyLookupActive, 
    showAllBackgroundROs, 
    users
  ]);

  // Filtered Parts for Logistics Tab
  const filteredParts = useMemo(() => {
    return allParts.filter(p => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'SPECIAL_ORDER_1_5_DAYS' || statusFilter === 'SPECIAL_ORDER') {
          if (p.status !== 'SPECIAL_ORDER_1_5_DAYS' && p.status !== 'SPECIAL_ORDER') return false;
        } else if (statusFilter === 'REQUESTED') {
          if (p.status !== 'REQUESTED' && p.requestType !== 'ORDER_NOW') return false;
        } else if (statusFilter === 'QUOTE_ONLY') {
          if (p.status !== 'QUOTE_ONLY' && p.requestType !== 'QUOTE_ONLY') return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cleanQ = q.replace(/^#|^ro-?/, '');
        const cleanRoId = p.roId.toLowerCase().replace(/^#|^ro-?/, '');
        const matchingRo = repairOrders.find(r => r.id === p.roId);
        const matchPart = p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        const matchRO = cleanRoId.includes(cleanQ) || p.roId.toLowerCase().includes(q);
        const matchVendor = p.vendor.toLowerCase().includes(q);
        const matchTech = p.techName?.toLowerCase().includes(q);
        const matchAdvisor = p.advisorName?.toLowerCase().includes(q);
        const matchCustomer = p.customerName?.toLowerCase().includes(q);
        const matchVeh = p.vehicleStr.toLowerCase().includes(q);
        const matchVin = matchingRo?.vehicle.vin.toLowerCase().includes(q);
        return matchPart || matchRO || matchVendor || matchTech || matchAdvisor || matchCustomer || matchVeh || matchVin;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize parts with requested/quote status to the top of the list
      const aReq = isTechRequestedPart(a);
      const bReq = isTechRequestedPart(b);
      if (aReq && !bReq) return -1;
      if (bReq && !aReq) return 1;
      // If for the same RO, sort strictly by Line 1, Line 2, Line 3...
      if (a.roId === b.roId) {
        return getPartLineOrder(a) - getPartLineOrder(b);
      }
      return 0;
    });
  }, [
    allParts, 
    statusFilter, 
    searchQuery, 
    repairOrders
  ]);

  const handleQuickReceive = (roId: string, partId: string) => {
    updatePartStatus(roId, partId, 'RECEIVED', undefined, 'Marked received by parts department. Ready for technician.');
    showToast('Part marked as RECEIVED and staged for technician.');
  };

  const handleIssueToTech = (roId: string, partId: string) => {
    updatePartStatus(roId, partId, 'ISSUED_TO_TECH', undefined, 'Handed directly to technician.');
    showToast('Part marked as ISSUED TO TECH.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyVin = (vin: string, roId: string) => {
    navigator.clipboard.writeText(vin);
    setCopiedVinId(roId);
    setTimeout(() => setCopiedVinId(null), 2000);
    showToast(`VIN ${vin} copied to clipboard!`);
  };

  const openAddPartModalForRO = (roId?: string, autoImportRequests: boolean = false) => {
    const targetRoId = roId || '';
    setSelectedTargetRoId(targetRoId);
    setRoSearchQuery('');
    setIsRoDropdownOpen(!roId); // If opened generally, start with the searchable dropdown ready to pick!

    const targetRO = targetRoId ? repairOrders.find(r => r.id === targetRoId) : null;
    const reqs = targetRO ? targetRO.parts.filter(isTechRequestedPart) : [];

    // Pre-populate quick draft entries for any technician-requested parts
    const initialDrafts: Record<string, any> = {};
    reqs.forEach(rp => {
      initialDrafts[rp.id] = {
        partNumber: rp.partNumber && rp.partNumber !== 'TBD' ? rp.partNumber : '',
        price: formatPrice(rp.price),
        quantity: Math.max(1, rp.quantity || 1),
        status: rp.status === 'QUOTE_ONLY' || rp.requestType === 'QUOTE_ONLY' ? 'QUOTE_ONLY' : 'DAILY_ORDER',
        vendor: rp.vendor && rp.vendor !== 'TBD' ? rp.vendor : (vendors[0] || INITIAL_VENDORS[0]),
      };
    });
    setReqDrafts(prev => ({ ...prev, ...initialDrafts }));

    if (reqs.length > 0) {
      setShowManualPartLines(false);
      setPartLines([]);
      setPartStatus('DAILY_ORDER');
    } else {
      setShowManualPartLines(true);
      setPartLines([{ id: `pline_${Date.now()}`, partNumber: '', description: '', quantity: 1, price: '', roLineNumber: 1 }]);
      setPartStatus('IN_STOCK');
    }

    setPartVendor(vendors[0] || INITIAL_VENDORS[0]);
    setPartEtaTime('17:00');
    setPartTracking('');
    setPartNotes('');
    setShowAdvancedOptions(false);
    setIsAddingCustomVendor(false);
    setCustomVendorInput('');
    setIsAddingCustomStatus(false);
    setCustomStatusInput('');
    setIsAddPartModalOpen(true);
  };

  const handleAddCustomVendor = () => {
    const trimmed = customVendorInput.trim().toUpperCase();
    if (!trimmed) return;
    if (!vendors.includes(trimmed)) {
      setVendors(prev => [...prev, trimmed]);
    }
    setPartVendor(trimmed);
    setCustomVendorInput('');
    setIsAddingCustomVendor(false);
    showToast(`Vendor "${trimmed}" added to options.`);
  };

  const handleAddCustomStatus = () => {
    const trimmed = customStatusInput.trim().toUpperCase();
    if (!trimmed) return;
    const cleanId = trimmed.replace(/\s+/g, '_');
    if (!customStatuses.includes(cleanId)) {
      setCustomStatuses(prev => [...prev, cleanId]);
    }
    setPartStatus(cleanId);
    setCustomStatusInput('');
    setIsAddingCustomStatus(false);
    showToast(`Custom status "${trimmed}" added!`);
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetRoId) {
      alert('Please select a valid Repair Order.');
      return;
    }

    // Resolve expectation of part arrival & status
    const tfCalc = partTimeFrameId ? computeEtaAndStatus(partTimeFrameId) : null;
    const effectiveVendor = isAddingCustomVendor && customVendorInput.trim() 
      ? customVendorInput.trim().toUpperCase() 
      : partVendor;

    if (isAddingCustomVendor && customVendorInput.trim() && !vendors.includes(effectiveVendor)) {
      setVendors(prev => [...prev, effectiveVendor]);
    }

    const effectiveStatus = isAddingCustomStatus && customStatusInput.trim()
      ? customStatusInput.trim().toUpperCase().replace(/\s+/g, '_')
      : (tfCalc?.status || partStatus);

    if (isAddingCustomStatus && customStatusInput.trim() && !customStatuses.includes(effectiveStatus)) {
      setCustomStatuses(prev => [...prev, effectiveStatus]);
    }

    let etaArrival = partEstimatedArrival || tfCalc?.estimatedArrival;
    if (!etaArrival) {
      if (effectiveStatus === 'IN_STOCK') {
        etaArrival = new Date().toISOString();
      } else {
        const today = new Date();
        const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
        const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));
        etaArrival = etaDate.toISOString();
      }
    }

    let processedCount = 0;

    // 1. Process technician-requested parts if any exist
    if (requestedPartsForSelectedRO.length > 0) {
      requestedPartsForSelectedRO.forEach(rp => {
        const draft = getReqDraft(rp);
        const cleanPn = draft.partNumber?.trim().toUpperCase() || rp.partNumber || 'TBD';
        const priceVal = draft.price && !isNaN(parseFloat(draft.price)) ? parseFloat(draft.price) : rp.price;
        const qty = Math.max(1, Number(draft.quantity) || rp.quantity || 1);

        const rpTfCalc = draft.timeFrameId ? computeEtaAndStatus(draft.timeFrameId) : null;
        const rpStatus = draft.status || rpTfCalc?.status || effectiveStatus;
        const rpVendor = draft.vendor || effectiveVendor || 'STELLANTIS';
        const rpEta = draft.estimatedArrival || rpTfCalc?.estimatedArrival || etaArrival;

        updatePartItem(selectedTargetRoId, rp.id, {
          partNumber: cleanPn,
          price: priceVal,
          quantity: qty,
          status: rpStatus,
          vendor: rpVendor,
          estimatedArrival: rpEta,
          notes: partNotes.trim() || rp.notes,
          trackingNumber: partTracking.trim() || rp.trackingNumber,
        });
        processedCount++;
      });
    }

    // 2. Process manual part lines
    const validLines = partLines.filter(l => l.partNumber.trim() || l.description.trim());
    validLines.forEach(line => {
      const cleanPn = line.partNumber.trim().toUpperCase() || 'TBD';
      const cleanDesc = line.description.trim() || `Part ${cleanPn}`;
      const qty = Math.max(1, Number(line.quantity) || 1);
      const priceVal = line.price ? parseFloat(line.price) : undefined;

      if (line.sourcePartId) {
        updatePartItem(selectedTargetRoId, line.sourcePartId, {
          partNumber: cleanPn,
          description: cleanDesc,
          quantity: qty,
          status: effectiveStatus,
          vendor: effectiveVendor || 'STELLANTIS',
          estimatedArrival: etaArrival,
          trackingNumber: partTracking.trim() || undefined,
          price: priceVal,
          notes: partNotes.trim() || undefined,
          roLineNumber: line.roLineNumber,
        });
      } else {
        addPartOrder(selectedTargetRoId, {
          partNumber: cleanPn,
          description: cleanDesc,
          quantity: qty,
          status: effectiveStatus,
          vendor: effectiveVendor || 'STELLANTIS',
          estimatedArrival: etaArrival,
          trackingNumber: partTracking.trim() || undefined,
          price: priceVal,
          notes: partNotes.trim() || undefined,
          roLineNumber: line.roLineNumber,
        });
      }
      processedCount++;
    });

    if (processedCount === 0) {
      alert('Please enter at least one part number or description.');
      return;
    }

    setIsAddPartModalOpen(false);
    setAddedRoIds(prev => new Set(prev).add(selectedTargetRoId));
    showToast(`✓ Processed ${processedCount} part${processedCount === 1 ? '' : 's'} (${formatStatusLabel(effectiveStatus)}) on RO #${selectedTargetRoId}!`);
    setPartLines([{ id: `pline_${Date.now()}`, partNumber: '', description: '', quantity: 1, price: '', roLineNumber: 1 }]);
    setPartNotes('');
    setPartTracking('');
  };

  const formatStatusLabel = (status: PartStatus): string => {
    switch (status) {
      case 'IN_STOCK':
        return 'IN STOCK';
      case 'LOCAL_PURCHASE':
        return 'LOCAL PURCHASE';
      case 'DAILY_ORDER':
        return 'DAILY ORDER';
      case 'SPECIAL_ORDER_1_5_DAYS':
      case 'SPECIAL_ORDER':
        return 'SPECIAL ORDER 1-5 DAYS';
      case 'VOR_UPGRADE':
        return 'VOR UPGRADE';
      case 'RECEIVED':
        return 'RECEIVED';
      case 'ISSUED_TO_TECH':
        return 'ISSUED TO TECH';
      case 'IN_TRANSIT':
        return 'IN TRANSIT';
      case 'ORDERED':
        return 'ORDERED';
      case 'QUOTE_ONLY':
        return 'QUOTE ONLY (TECH)';
      case 'REQUESTED':
        return 'REQUESTED BY TECH';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const getStatusBadgeClass = (status: PartStatus): string => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'LOCAL_PURCHASE':
        return 'bg-teal-100 text-teal-800 border-teal-300 font-bold';
      case 'DAILY_ORDER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SPECIAL_ORDER_1_5_DAYS':
      case 'SPECIAL_ORDER':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'VOR_UPGRADE':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-black';
      case 'RECEIVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ISSUED_TO_TECH':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'IN_TRANSIT':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ORDERED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'QUOTE_ONLY':
        return 'bg-purple-100 text-purple-900 border-purple-400 font-black';
      case 'REQUESTED':
        return 'bg-amber-100 text-amber-900 border-amber-400 font-black animate-pulse';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
    }
  };

  return (
    <div className="space-y-4 pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* TOP OF SCREEN: High-Visibility Action Banner for Technician Parts Requests */}
      {rosWithPendingTechRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-amber-300">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-ping absolute inset-0 m-auto" />
                <div className="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black shadow-xs relative">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>ACTION REQUIRED: TECHNICIAN PARTS REQUESTS</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider animate-pulse">
                      {rosWithPendingTechRequests.length} Vehicle{rosWithPendingTechRequests.length === 1 ? '' : 's'} Waiting
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  The following repair orders have parts requested by technicians. Review, price, source, and place orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                ⚡ Ready for Parts Counter Sourcing
              </span>
            </div>
          </div>

          {/* Cards for each vehicle needing parts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {rosWithPendingTechRequests.map(ro => {
              const requestedParts = [...ro.parts.filter(isTechRequestedPart)].sort((a, b) => getPartLineOrder(a) - getPartLineOrder(b));
              const isROAdded = addedRoIds.has(ro.id) || (
                requestedParts.length > 0 && 
                requestedParts.every(p => p.status !== 'REQUESTED' && p.status !== 'NEEDED' && p.status !== 'QUOTE_ONLY')
              );

              return (
                <div 
                  key={ro.id}
                  className="bg-white rounded-xl border-2 border-amber-400 hover:border-amber-600 p-4 shadow-xs space-y-3 transition-all"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          RO #{ro.id}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900">
                          {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                        </span>
                        {ro.vehicle.licensePlate && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                            {ro.vehicle.licensePlate}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Customer: <strong className="text-slate-800">{ro.customerName}</strong></span>
                        <span>•</span>
                        <span className="text-amber-800 font-bold">Tech: {ro.techName || 'Unassigned'}</span>
                      </div>
                    </div>

                    {/* Dark Copy VIN */}
                    <button
                      onClick={() => copyVin(ro.vehicle.vin, ro.id)}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-black text-white rounded-lg text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
                      title="Copy VIN for parts catalog"
                    >
                      {copiedVinId === ro.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[11px]">Copy VIN</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Requested Parts List with Direct Part # & Price Inputs */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>Items Requested by Technician ({requestedParts.length}):</span>
                      </span>
                      <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border border-amber-300">
                        Add Part # & Price to Fulfill / Quote
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {requestedParts.length > 0 ? (
                        requestedParts.map((rp, idx) => {
                          const draft = getReqDraft(rp);
                          const isROApproved = Boolean(
                            ro.status === 'APPROVED' || 
                            ro.quote?.status === 'APPROVED' || 
                            ro.quote?.approvedAt || 
                            ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(ro.status)
                          );
                          const isQuoteOnly = rp.status === 'QUOTE_ONLY' || rp.requestType === 'QUOTE_ONLY';
                          const isSent = isQuoteOnly && isPartSentToEstimate(rp);
                          const lineNum = rp.roLineNumber || (rp.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(rp.notes.match(/For Line (\d+)/i)![1]) : undefined);
                          const concernDesc = lineNum && ro.concerns && ro.concerns[lineNum - 1] 
                            ? ro.concerns[lineNum - 1] 
                            : (lineNum === 1 ? ro.primaryConcern : undefined);

                          return (
                            <div 
                              key={rp.id || idx} 
                              className={`p-2.5 rounded-xl border text-xs space-y-2 transition-colors shadow-2xs ${
                                isROAdded
                                  ? 'bg-emerald-50/40 border-emerald-300'
                                  : isSent
                                    ? 'bg-purple-50/40 border-purple-300'
                                    : isROApproved 
                                      ? 'bg-emerald-50/20 border-emerald-300' 
                                      : isQuoteOnly 
                                        ? 'bg-purple-50/50 border-purple-300 hover:border-purple-400' 
                                        : 'bg-slate-50 border-slate-200 hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-950 font-black text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  {lineNum && (
                                    <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                                      Line {lineNum}
                                    </span>
                                  )}
                                  <span className="font-extrabold text-slate-900">{rp.description || rp.name}</span>
                                  <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                    Qty: {rp.quantity || 1}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {/* Quick Toggle: Quote Only vs Order Now */}
                                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-[10px] shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updatePartItem(ro.id, rp.id, { status: 'QUOTE_ONLY', requestType: 'QUOTE_ONLY' });
                                      }}
                                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                        isQuoteOnly ? 'bg-purple-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                      title="Mark this line as Quote Only (Pricing estimate for customer approval)"
                                    >
                                      Quote Only
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updatePartItem(ro.id, rp.id, { status: 'REQUESTED', requestType: 'ORDER_NOW' });
                                      }}
                                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                        !isQuoteOnly ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                      title="Mark this line as Order Now (Order immediately without quote hold)"
                                    >
                                      Order Now
                                    </button>
                                  </div>

                                  {/* Primary Line Status Pill: Shows QUOTE ONLY prominently */}
                                  {isQuoteOnly ? (
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-purple-100 text-purple-900 border-purple-300 shadow-2xs flex items-center gap-1 shrink-0">
                                      <span>💬</span>
                                      <span>QUOTE ONLY</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 shadow-2xs flex items-center gap-1 shrink-0">
                                      <span>📦</span>
                                      <span>ORDER NOW</span>
                                    </span>
                                  )}

                                  {isSent && (
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs flex items-center gap-1 shrink-0">
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                      <span>ADDED TO QUOTE</span>
                                    </span>
                                  )}

                                  {isROAdded && !isSent && (
                                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs flex items-center gap-1 shrink-0">
                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                      <span>ADDED TO RO</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {concernDesc && (
                                <div className="text-[11px] text-slate-700 bg-white/80 p-1.5 rounded border border-slate-200 font-medium truncate">
                                  <strong className="text-slate-900 font-bold uppercase text-[9px] mr-1">Line {lineNum} Concern:</strong>
                                  <span>{concernDesc}</span>
                                </div>
                              )}

                              {/* Direct Part # & Price Inputs - Zero redundant typing! */}
                              <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/60">
                                <div className="flex-1 min-w-[120px]">
                                  <input
                                    type="text"
                                    placeholder="Enter Part # (e.g. 68052369AA)"
                                    disabled={isSent || isROAdded}
                                    value={draft.partNumber}
                                    onChange={(e) => updateReqDraft(rp.id, 'partNumber', e.target.value.toUpperCase())}
                                    className="w-full px-2.5 py-1 text-xs font-mono font-bold uppercase bg-white border border-blue-400 focus:border-blue-600 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400 text-slate-900 disabled:bg-slate-100 disabled:text-slate-600 disabled:border-slate-300 disabled:cursor-not-allowed"
                                  />
                                </div>

                                <div className="w-20 relative shrink-0">
                                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-xs text-slate-400 font-bold">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    disabled={isSent || isROAdded}
                                    value={draft.price}
                                    onChange={(e) => updateReqDraft(rp.id, 'price', e.target.value)}
                                    onBlur={(e) => {
                                      const val = e.target.value.trim();
                                      if (val && !isNaN(Number(val))) {
                                        updateReqDraft(rp.id, 'price', Number(val).toFixed(2));
                                      }
                                    }}
                                    className="w-full pl-5 pr-2 py-1 text-xs font-bold bg-white border border-emerald-400 focus:border-emerald-600 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400 text-slate-900 disabled:bg-slate-100 disabled:text-slate-600 disabled:border-slate-300 disabled:cursor-not-allowed"
                                  />
                                </div>

                                <div className="w-36 sm:w-44 shrink-0">
                                  <ArrivalTimeFrameDropdown
                                    size="sm"
                                    disabled={isSent || isROAdded}
                                    value={draft.timeFrameId || draft.status || 'DAILY_ORDER'}
                                    onChange={({ timeFrameId, status, estimatedArrival }) => {
                                      updateReqDraft(rp.id, 'timeFrameId', timeFrameId);
                                      updateReqDraft(rp.id, 'status', status);
                                      updateReqDraft(rp.id, 'estimatedArrival', estimatedArrival);
                                    }}
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                  {isQuoteOnly ? (
                                    isSent ? (
                                      <button
                                        type="button"
                                        disabled
                                        className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-black shadow-none flex items-center gap-1.5 border-2 border-emerald-400 cursor-not-allowed select-none"
                                        title="Price and part already added to Main Quote"
                                      >
                                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                        <span>Added to Quote</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSaveQuotePriceOnly(ro.id, rp)}
                                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-xs font-black shadow-sm cursor-pointer flex items-center gap-1.5 border border-purple-700 transition-all"
                                        title="Add Quoted Part & Price directly to Main Quote"
                                      >
                                        <Calculator className="w-3.5 h-3.5" />
                                        <span>Add to Quote</span>
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSaveQuotePriceOnly(ro.id, rp)}
                                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 hover:text-purple-950 rounded-lg text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 border border-purple-200 transition-colors"
                                      title="Add this part to Customer Quote / Estimate"
                                    >
                                      <Calculator className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Add to Quote</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 italic">
                          RO is marked Waiting on Parts — Technician finished diagnosis.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSelectedRO(ro)}
                      className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Full RO</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openAddPartModalForRO(ro.id, true)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                        title="Add additional or custom parts"
                      >
                        <Plus className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Lines</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddPartsToROFromCard(ro.id)}
                        disabled={isROAdded}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 border ${
                          isROAdded
                            ? 'bg-emerald-600 text-white border-emerald-700 cursor-default shadow-none'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 cursor-pointer active:scale-95'
                        }`}
                      >
                        {isROAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Added to Repair Order</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Parts to Repair Order</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Streamlined Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Parts Department & Logistics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Requisition parts, source local stock, monitor orders, and issue items directly to technicians.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          <button
            id="parts-add-part-btn"
            onClick={() => openAddPartModalForRO()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer border border-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parts to Repair Order</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics with Local Purchase Box */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div 
          onClick={() => { 
            setActiveTab('RO_LIST'); 
            setRoStatusFilter('TECH_REQUESTS');
            setShowAllBackgroundROs(true); 
          }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            rosWithPendingTechRequests.length > 0
              ? 'border-amber-500 bg-amber-50/60 hover:border-amber-600 ring-2 ring-amber-300/40'
              : 'bg-white border-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-amber-900 flex items-center justify-between gap-1">
            <span>Tech Requests</span>
            <AlertTriangle className={`w-4 h-4 shrink-0 ${rosWithPendingTechRequests.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 my-2 w-full text-center flex items-center justify-center gap-1.5">
            <span>{rosWithPendingTechRequests.length}</span>
            {rosWithPendingTechRequests.length > 0 && (
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white animate-pulse">
                Action
              </span>
            )}
          </div>
        </div>

        <div 
          onClick={() => { 
            setActiveTab('RO_LIST'); 
            setShowAllBackgroundROs(prev => !prev); 
          }}
          className="bg-white p-3.5 rounded-xl border-2 border-slate-600 shadow-xs hover:border-blue-500 transition-colors cursor-pointer flex flex-col justify-between"
        >
          <div className="text-xs font-black uppercase tracking-wide text-slate-700 flex items-center justify-between gap-1">
            <span>ROs In Shop</span>
            <FileText className="w-4 h-4 text-slate-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 my-2 w-full text-center flex items-center justify-center">{totalRoCount}</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('IN_STOCK'); }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            statusFilter === 'IN_STOCK' && activeTab === 'PARTS_LIST'
              ? 'border-emerald-600 bg-emerald-100/50 ring-2 ring-emerald-400'
              : 'bg-white border-emerald-500 bg-emerald-50/20 hover:border-emerald-600'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-emerald-800 flex items-center justify-between gap-1">
            <span>In Stock</span>
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 my-2 w-full text-center flex items-center justify-center">{inStockCount}</div>
        </div>

        {/* LOCAL PURCHASE BOX */}
        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('LOCAL_PURCHASE'); }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            statusFilter === 'LOCAL_PURCHASE' && activeTab === 'PARTS_LIST'
              ? 'border-teal-600 bg-teal-100/50 ring-2 ring-teal-400'
              : 'bg-white border-teal-500 bg-teal-50/20 hover:border-teal-600'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-teal-800 flex items-center justify-between gap-1">
            <span>Local Purchase</span>
            <Store className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-700 my-2 w-full text-center flex items-center justify-center">{localPurchaseCount}</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('DAILY_ORDER'); }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            statusFilter === 'DAILY_ORDER' && activeTab === 'PARTS_LIST'
              ? 'border-blue-600 bg-blue-100/50 ring-2 ring-blue-400'
              : 'bg-white border-blue-500 shadow-xs hover:border-blue-600'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-blue-800 flex items-center justify-between gap-1">
            <span>Daily Order</span>
            <Truck className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 my-2 w-full text-center flex items-center justify-center">{dailyOrderCount}</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('SPECIAL_ORDER_1_5_DAYS'); }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            (statusFilter === 'SPECIAL_ORDER_1_5_DAYS' || statusFilter === 'SPECIAL_ORDER') && activeTab === 'PARTS_LIST'
              ? 'border-amber-600 bg-amber-100/50 ring-2 ring-amber-400'
              : 'bg-white border-amber-500 shadow-xs hover:border-amber-600'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-amber-800 flex items-center justify-between gap-1">
            <span>1-5 Days</span>
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 my-2 w-full text-center flex items-center justify-center">{specialOrderCount}</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('VOR_UPGRADE'); }}
          className={`p-3.5 rounded-xl border-2 shadow-xs transition-colors cursor-pointer flex flex-col justify-between ${
            statusFilter === 'VOR_UPGRADE' && activeTab === 'PARTS_LIST'
              ? 'border-rose-600 bg-rose-100/50 ring-2 ring-rose-400'
              : 'bg-white border-rose-500 bg-rose-50/20 shadow-xs hover:border-rose-600'
          }`}
        >
          <div className="text-xs font-black uppercase tracking-wide text-rose-800 flex items-center justify-between gap-1">
            <span>VOR Upgrade</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 my-2 w-full text-center flex items-center justify-center">{vorUpgradeCount}</div>
        </div>
      </div>

      {/* Main View Switcher Tabs & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            id="parts-tab-all-ros"
            onClick={() => setActiveTab('RO_LIST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'RO_LIST'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Repair Orders</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'RO_LIST' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              {isAnyLookupActive || showAllBackgroundROs ? `${filteredROs.length} Pulled Up` : filteredROs.length}
            </span>
          </button>

          <button
            id="parts-tab-logistics"
            onClick={() => setActiveTab('PARTS_LIST')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PARTS_LIST'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Tracked Logistics</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'PARTS_LIST' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'
            }`}>
              {allParts.length}
            </span>
          </button>
        </div>

        {/* View Mode Toggle: Card View vs Line View */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSetViewMode('CARD')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'CARD'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Card View (Expanded cards)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            <span>Card View</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetViewMode('LINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'LINE'
                ? 'bg-white text-slate-950 font-black shadow-xs border border-slate-400'
                : 'text-slate-900 font-extrabold hover:text-black'
            }`}
            title="Line View (Compact spreadsheet lines)"
          >
            <List className="w-3.5 h-3.5 text-blue-600" />
            <span>Line View</span>
          </button>
        </div>
      </div>

      {/* Dedicated Parts Counter Repair Order Lookup */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-700 shadow-xs space-y-3">
        {/* Header with status badge & action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Search className="w-4 h-4 text-blue-600" />
              <span>Repair Order Lookup</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isAnyLookupActive || showAllBackgroundROs
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {isAnyLookupActive || showAllBackgroundROs
                ? `${filteredROs.length} Pulled Up`
                : `${activeROs.length} Orders In Background`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(isAnyLookupActive || showAllBackgroundROs) && (
              <button
                type="button"
                onClick={clearAllLookups}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg border-2 border-slate-400 hover:border-slate-600 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-600" />
                <span>Clear & Hide to Background</span>
              </button>
            )}

            {!isAnyLookupActive && (
              <button
                type="button"
                onClick={() => setShowAllBackgroundROs(prev => !prev)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                  showAllBackgroundROs
                    ? 'bg-slate-900 text-white border-slate-950'
                    : 'bg-white text-slate-700 border-slate-400 hover:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {showAllBackgroundROs ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showAllBackgroundROs ? 'Hide All to Background' : `Show All Background ROs (${activeROs.length})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Condensed One-Line Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="parts-unified-lookup-bar"
              placeholder="Search by Repair Order #, Customer Name, VIN (full or last 8), Tech, or Advisor..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowAllBackgroundROs(false);
              }}
              className="w-full text-xs sm:text-sm font-semibold pl-9 pr-8 py-2 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {activeTab === 'RO_LIST' ? (
              <select
                value={roStatusFilter}
                onChange={e => setRoStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-2 border-2 border-slate-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              >
                <option value="ALL">All Shop Statuses ({activeROs.length})</option>
                <option value="TECH_REQUESTS">⚡ Tech Requested Parts ({rosWithPendingTechRequests.length})</option>
                <option value="NEEDS_PARTS">Needs Parts (0 Parts on RO)</option>
                <option value="HAS_PARTS">Has Parts Attached</option>
                <option value="WAITING_PARTS">Status: Waiting on Parts</option>
                <option value="IN_BAY">Status: In Repair</option>
              </select>
            ) : (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PartStatus | 'ALL')}
                className="text-xs px-2.5 py-2 border-2 border-slate-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              >
                <option value="ALL">All Part Statuses ({allParts.length})</option>
                <option value="REQUESTED">⚡ Tech Requests (Order Now) ({allParts.filter(p => p.status === 'REQUESTED' || p.requestType === 'ORDER_NOW').length})</option>
                <option value="QUOTE_ONLY">💬 Tech Quote Requests ({allParts.filter(p => p.status === 'QUOTE_ONLY' || p.requestType === 'QUOTE_ONLY').length})</option>
                <option value="LOCAL_PURCHASE">LOCAL PURCHASE</option>
                <option value="IN_STOCK">IN STOCK</option>
                <option value="DAILY_ORDER">DAILY ORDER</option>
                <option value="SPECIAL_ORDER_1_5_DAYS">SPECIAL ORDER 1-5 DAYS</option>
                <option value="VOR_UPGRADE">VOR UPGRADE</option>
                <option value="ORDERED">ORDERED</option>
                <option value="IN_TRANSIT">IN TRANSIT</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="ISSUED_TO_TECH">ISSUED TO TECH</option>
                {existingCustomStatuses.map(st => (
                  <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Quick Helper Subtitle */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <div className="flex items-center gap-2">
            {!isAnyLookupActive && !showAllBackgroundROs ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Type any RO #, customer, VIN, tech, or advisor into the search bar above to pull up records.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-900 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>
                  {filteredROs.length} Repair Order{filteredROs.length !== 1 ? 's' : ''} pulled up
                  {searchQuery.trim() ? ` matching "${searchQuery}"` : ''}
                </span>
              </span>
            )}
          </div>
          <span className="hidden md:inline-block text-slate-400 font-medium">
            Search handles RO #, Customer, VIN, Tech, Advisor, & Parts
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL REPAIR ORDERS DIRECT DIRECTORY (Direct Part Entry)             */}
      {/* ========================================================================= */}
      {activeTab === 'RO_LIST' && (
        <div className="space-y-3">
          {/* STATE A: NO SEARCH CRITERIA ENTERED AND NOT REVEALED -> HIDDEN IN BACKGROUND */}
          {!isAnyLookupActive && !showAllBackgroundROs && (
            <div className="bg-white rounded-xl border-2 border-slate-300 p-6 sm:p-8 text-center shadow-xs space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">
                Repair Orders Are Hidden in the Background
              </h3>

              <div>
                <button
                  type="button"
                  onClick={() => setShowAllBackgroundROs(true)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border-2 border-slate-400 hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-700" />
                  <span>Reveal All {activeROs.length} Background Repair Orders</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE B: SEARCH PERFORMED BUT NO RESULTS */}
          {(isAnyLookupActive || showAllBackgroundROs) && filteredROs.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-amber-500 p-8 text-center shadow-xs space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  No Repair Orders Match Your Entered Lookup
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Double check the RO number, customer name, VIN, technician, or advisor spelling and try again.
                </p>
              </div>
              <button
                type="button"
                onClick={clearAllLookups}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Lookup
              </button>
            </div>
          )}

          {/* STATE C: ORDERS PULLED UP */}
          {(isAnyLookupActive || showAllBackgroundROs) && filteredROs.length > 0 && (
            viewMode === 'LINE' ? (
              <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-700 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">RO #</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Vehicle & VIN</th>
                        <th className="py-2.5 px-3">Tech / Advisor</th>
                        <th className="py-2.5 px-3">RO Status</th>
                        <th className="py-2.5 px-3">Parts on Ticket</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredROs.map(ro => {
                        const hasRequested = ro.parts.some(isTechRequestedPart);
                        const reqCount = ro.parts.filter(isTechRequestedPart).length;
                        const assignedTech = users.find(u => u.id === ro.techId);
                        const advisor = users.find(u => u.id === ro.advisorId);
                        const partsTotal = ro.parts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 1), 0);
                        return (
                          <tr 
                            key={ro.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              hasRequested ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedRO(ro)}
                                className="font-mono font-black text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                RO #{ro.id}
                              </button>
                              {hasRequested && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                                  REQ ({reqCount})
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                              {ro.customerName}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">
                                {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                                <span>{ro.vehicle.vin}</span>
                                <button
                                  type="button"
                                  onClick={() => copyVin(ro.vehicle.vin, ro.id)}
                                  className="text-slate-400 hover:text-slate-800 cursor-pointer"
                                  title="Copy VIN"
                                >
                                  {copiedVinId === ro.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                              <div className="font-medium text-slate-800">{assignedTech?.name || ro.techName || 'Unassigned'}</div>
                              <div className="text-[10px] text-slate-500">Adv: {advisor?.name || ro.advisorName || '—'}</div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                {ro.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">
                                  {ro.parts.length} part{ro.parts.length === 1 ? '' : 's'}
                                </span>
                                {ro.parts.length > 0 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({formatCurrency(partsTotal)})
                                  </span>
                                )}
                                {hasRequested && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {reqCount} awaiting
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openAddPartModalForRO(ro.id)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                                >
                                  + Add Part
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedRO(ro)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold border border-slate-300 transition-colors cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            <div className="space-y-2.5">
              {filteredROs.map(ro => {
                const assignedTech = users.find(u => u.id === ro.techId);
                const advisor = users.find(u => u.id === ro.advisorId);
                const hasParts = ro.parts && ro.parts.length > 0;
                const hasRequestedParts = ro.parts.some(isTechRequestedPart);
                const requestedCount = ro.parts.filter(isTechRequestedPart).length;

                return (
                  <div
                    key={ro.id}
                    id={`parts-ro-card-${ro.id}`}
                    className={`bg-white rounded-xl border-2 p-3.5 sm:p-4 shadow-xs transition-all space-y-3 ${
                      hasRequestedParts 
                        ? 'border-amber-500 ring-2 ring-amber-300/60 bg-amber-50/15' 
                        : 'border-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {/* Top Row: RO #, Vehicle, Customer, VIN, Status Badges */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-2.5 pb-2.5 border-b border-slate-200">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span 
                            onClick={() => setSelectedRO(ro)}
                            className="text-base font-black text-blue-600 hover:text-blue-800 cursor-pointer font-mono"
                          >
                            RO #{ro.id}
                          </span>

                          <span className="font-bold text-sm text-slate-900">
                            {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                          </span>

                          {ro.vehicle.licensePlate && (
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                              Tag: {ro.vehicle.licensePlate}
                            </span>
                          )}

                          <span className="text-xs text-slate-500 font-medium">
                            ({ro.vehicle.mileage.toLocaleString()} mi)
                          </span>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            ro.status === 'WAITING_PARTS'
                              ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : ro.status === 'IN_BAY' || ro.status === 'IN_REPAIR'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}>
                            {ro.status.replace('_', ' ')}
                          </span>

                          {hasRequestedParts && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 border border-amber-600 animate-pulse flex items-center gap-1 shadow-xs">
                              <AlertTriangle className="w-3 h-3 text-slate-950" />
                              <span>TECH REQUESTED {requestedCount} PART{requestedCount === 1 ? '' : 'S'}</span>
                            </span>
                          )}

                          {ro.isWaiter && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                              Waiter Customer
                            </span>
                          )}
                        </div>

                        {/* Customer & VIN */}
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span>Customer: <strong className="text-slate-900">{ro.customerName}</strong> ({ro.customerPhone})</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-2 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-900">
                            <span>VIN: <strong>{ro.vehicle.vin}</strong></span>
                            <button
                              onClick={() => copyVin(ro.vehicle.vin, ro.id)}
                              className="px-2.5 py-1 bg-slate-950 hover:bg-black text-white rounded text-xs font-bold border border-slate-800 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
                              title="Copy VIN for parts catalog lookup"
                            >
                              {copiedVinId === ro.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Copy VIN</span>
                                </>
                              )}
                            </button>
                          </span>
                        </div>
                      </div>

                      {/* Personnel Info & Fast Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-left sm:text-right text-xs space-y-0.5">
                          <div className="text-slate-600">
                            Tech: <strong className="text-slate-900">{ro.techName || 'Unassigned'}</strong>
                            {assignedTech?.employeeNumber && (
                              <span className="ml-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-300">
                                {assignedTech.employeeNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600">
                            Advisor: <strong className="text-slate-900">{ro.advisorName}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          <button
                            id={`add-part-to-ro-${ro.id}`}
                            onClick={() => openAddPartModalForRO(ro.id, true)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer border ${
                              hasRequestedParts
                                ? 'bg-amber-600 hover:bg-amber-700 border-amber-700 animate-pulse'
                                : 'bg-blue-600 hover:bg-blue-700 border-blue-700'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{hasRequestedParts ? `⚡ Order ${requestedCount} Req Parts` : '+ Add Part to Ticket'}</span>
                          </button>

                          <button
                            onClick={() => setSelectedRO(ro)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer border-2 border-slate-400"
                            title="Open Complete RO Details Modal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open RO</span>
                          </button>
                        </div>

                      </div>

                    </div>

                    {/* Middle Row: Concerns & Findings (Context for Parts Lookup) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 sm:p-3 rounded-lg border-2 border-slate-300">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Customer Complaints & Line Items</span>
                        </div>
                        <ul className="space-y-1">
                          {(ro.concerns && ro.concerns.length > 0 ? ro.concerns : [ro.primaryConcern || 'General Inspection']).map((concern, idx) => {
                            const payType = ro.concernPayTypes?.[idx] || 'CUSTOMER_PAY';
                            const lineTechName = ro.concernTechNames?.[idx];
                            return (
                              <li key={idx} className="flex items-start gap-1.5 text-slate-700">
                                <span className="font-bold text-slate-400 shrink-0">Line {idx + 1}:</span>
                                <span className="font-medium flex-1">{concern}</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0 ${
                                  payType === 'WARRANTY'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : payType === 'INTERNAL'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {payType === 'CUSTOMER_PAY' ? 'CP' : payType}
                                </span>
                                {lineTechName && (
                                  <span className="text-[9px] font-medium text-slate-500 bg-white px-1 rounded border border-slate-200 shrink-0">
                                    Tech: {lineTechName}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-400" />
                          <span>Cause Findings & Notes</span>
                        </div>
                        {ro.cause || ro.diagnosticNotes ? (
                          <div className="text-slate-700 font-medium">
                            <span className="font-bold text-slate-900">Cause: </span>
                            {ro.cause || ro.diagnosticNotes}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">No cause findings documented yet.</div>
                        )}
                        {ro.correction && (
                          <div className="text-slate-700 font-medium mt-1">
                            <span className="font-bold text-slate-900">Correction: </span>
                            {ro.correction}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Attached Parts on this RO */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-orange-600" />
                          <span>Parts on Ticket ({ro.parts.length})</span>
                        </span>
                        {!hasParts && (
                          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            No parts requisitioned yet — Parts Dept can add directly
                          </span>
                        )}
                      </div>

                      {hasParts ? (
                        <div className="space-y-2">
                          {[...ro.parts].sort((a, b) => getPartLineOrder(a) - getPartLineOrder(b)).map(part => {
                            const etaBadge = formatEtaBadge(part.estimatedArrival);
                            const lineNum = part.roLineNumber || (part.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(part.notes.match(/For Line (\d+)/i)![1]) : undefined);
                            return (
                              <div
                                key={part.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  {lineNum && (
                                    <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                                      Line {lineNum}
                                    </span>
                                  )}
                                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    #{part.partNumber}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {part.description}
                                  </span>
                                  <span className="text-slate-500 font-medium">
                                    (Qty: {part.quantity})
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600">Vendor: <strong>{part.vendor}</strong></span>
                                  {part.price !== undefined && (
                                    <>
                                      <span className="text-slate-400">•</span>
                                      <span className="text-slate-600 font-bold">Price: {formatCurrency(part.price)}</span>
                                    </>
                                  )}
                                  {part.trackingNumber && (
                                    <span className="font-mono text-slate-500 text-[11px]">Trk: {part.trackingNumber}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Status pill */}
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClass(part.status)}`}>
                                    {formatStatusLabel(part.status)}
                                  </span>

                                  {/* Quick Actions */}
                                  {isTechRequestedPart(part) && (
                                    <button
                                      onClick={() => openAddPartModalForRO(ro.id, true)}
                                      className={`px-2.5 py-1 text-white rounded text-[10px] font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1 ${
                                        part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY'
                                          ? 'bg-purple-600 hover:bg-purple-700'
                                          : 'bg-amber-600 hover:bg-amber-700'
                                      }`}
                                      title="Fulfill and price this requested part"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>{part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY' ? 'Price / Quote' : 'Order / Price'}</span>
                                    </button>
                                  )}

                                  {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && !isTechRequestedPart(part) && (
                                    <button
                                      onClick={() => handleQuickReceive(ro.id, part.id)}
                                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      Mark Received
                                    </button>
                                  )}

                                  {(part.status === 'RECEIVED' || part.status === 'IN_STOCK') && (
                                    <button
                                      onClick={() => handleIssueToTech(ro.id, part.id)}
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      Issue to Tech
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remove "${part.description}" from RO #${ro.id}?`)) {
                                        deletePartItem(ro.id, part.id);
                                        showToast(`Removed "${part.description}"`);
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Delete part from RO"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAddPartModalForRO(ro.id)}
                          className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Part to RO #{ro.id}</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRACKED PARTS LOGISTICS ROSTER                                     */}
      {/* ========================================================================= */}
      {activeTab === 'PARTS_LIST' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-800">
                Tracked Parts Roster ({filteredParts.length})
              </h2>
              {statusFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  <span>Filtered: {formatStatusLabel(statusFilter as PartStatus)}</span>
                  <button 
                    type="button" 
                    onClick={() => setStatusFilter('ALL')}
                    className="text-blue-600 hover:text-blue-900 cursor-pointer font-bold ml-1"
                    title="Clear status filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Real-time delivery countdowns & parts status dispatch
            </span>
          </div>

          {filteredParts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No parts found</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query.</p>
              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Show All Parts
                </button>
              )}
            </div>
          ) : viewMode === 'LINE' ? (
            <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-700 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Part # & Description</th>
                      <th className="py-2.5 px-3">RO # & Customer</th>
                      <th className="py-2.5 px-3">Vehicle</th>
                      <th className="py-2.5 px-3">Vendor</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">ETA / Arrival</th>
                      <th className="py-2.5 px-3">Tech</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredParts.map(part => {
                      const etaBadge = formatEtaBadge(part.estimatedArrival);
                      const targetRO = repairOrders.find(r => r.id === part.roId);
                      const lineNum = part.roLineNumber || (part.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(part.notes.match(/For Line (\d+)/i)![1]) : undefined);
                      return (
                        <tr 
                          key={part.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY'
                              ? 'bg-purple-50/50'
                              : isTechRequestedPart(part)
                              ? 'bg-amber-50/50'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              {lineNum && (
                                <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200">
                                  Line {lineNum}
                                </span>
                              )}
                              <span>#{part.partNumber}</span>
                              {isTechRequestedPart(part) && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black text-white ${
                                  part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY'
                                    ? 'bg-purple-600'
                                    : 'bg-rose-600 animate-pulse'
                                }`}>
                                  {part.status === 'QUOTE_ONLY' || part.requestType === 'QUOTE_ONLY' ? 'QUOTE' : 'REQ'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-[200px]" title={part.description}>
                              {part.description}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => targetRO && setSelectedRO(targetRO)}
                              className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              #{part.roId}
                            </button>
                            <div className="text-[11px] text-slate-700 font-medium truncate max-w-[120px]">
                              {part.customerName}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                            {part.vehicleStr}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-700">
                            {part.vendor}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                            {part.quantity}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-slate-900">
                            {part.price !== undefined ? formatCurrency(part.price) : '—'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClass(part.status)}`}>
                              {formatStatusLabel(part.status)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {part.status !== 'IN_STOCK' && part.status !== 'ISSUED_TO_TECH' && part.estimatedArrival ? (
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-block ${
                                etaBadge.pastDue 
                                ? 'bg-red-100 text-red-700 border border-red-200' 
                                : 'bg-orange-100 text-orange-700 border border-orange-200'
                              }`}>
                                {etaBadge.text}
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-medium">In Stock</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                            {part.techName || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickReceive(part.roId, part.id)}
                                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Mark Received"
                                >
                                  Receive
                                </button>
                              )}
                              {(part.status === 'RECEIVED' || part.status === 'IN_STOCK') && (
                                <button
                                  type="button"
                                  onClick={() => handleIssueToTech(part.roId, part.id)}
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer"
                                  title="Issue to Tech"
                                >
                                  Issue
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => targetRO && setSelectedRO(targetRO)}
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                title="View Full RO Details"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove "${part.description}" from RO #${part.roId}?`)) {
                                    deletePartItem(part.roId, part.id);
                                    showToast(`Removed "${part.description}"`);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete part"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParts.map(part => {
                const etaBadge = formatEtaBadge(part.estimatedArrival);
                const targetRO = repairOrders.find(r => r.id === part.roId);
                const lineNum = part.roLineNumber || (part.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(part.notes.match(/For Line (\d+)/i)![1]) : undefined);

                return (
                  <div
                    key={part.id}
                    id={`parts-item-${part.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left Info: Part #, Description, Supplier, Vehicle */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {lineNum && (
                          <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                            Line {lineNum}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          #{part.partNumber}
                        </span>
                        <span className="font-bold text-sm text-slate-800 truncate">
                          {part.description}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          (Qty: {part.quantity})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>Vendor: <strong className="text-slate-700">{part.vendor}</strong></span>
                        {part.price !== undefined && (
                          <span>Price: <strong className="text-slate-700">{formatCurrency(part.price)}</strong></span>
                        )}
                        {part.trackingNumber && (
                          <span>Tracking: <strong className="font-mono text-slate-700">{part.trackingNumber}</strong></span>
                        )}
                        <span>•</span>
                        <span>For: <strong className="text-slate-700">{part.vehicleStr}</strong></span>
                        <span>•</span>
                        <span>Customer: <strong className="text-slate-700">{part.customerName}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                        <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => targetRO && setSelectedRO(targetRO)}>
                          #{part.roId}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>• Assigned Tech: <strong className="text-slate-800">{part.techName || 'Unassigned'}</strong></span>
                          {part.techName && (() => {
                            const tch = users.find(u => u.name === part.techName);
                            return tch?.employeeNumber ? (
                              <span className="font-mono text-xs font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {tch.employeeNumber}
                              </span>
                            ) : null;
                          })()}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>• Advisor: <strong className="text-slate-800">{part.advisorName}</strong></span>
                        </span>
                      </div>
                    </div>

                    {/* Middle / Right: ETA Badge, Status Pill, Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* ETA Countdown Badge & Arrival Timeframe Dropdown */}
                      <div className="text-left sm:text-right min-w-[170px]">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</div>
                        {part.status !== 'IN_STOCK' && part.status !== 'ISSUED_TO_TECH' && part.estimatedArrival ? (
                          <div className={`mt-0.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md inline-block ${
                            etaBadge.pastDue 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {etaBadge.text}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-emerald-700">In Stock / Complete</div>
                        )}
                        {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && (
                          <div className="mt-1">
                            <ArrivalTimeFrameDropdown
                              size="sm"
                              value={part.status}
                              onChange={({ status, estimatedArrival, label }) => {
                                updatePartItem(part.roId, part.id, {
                                  status,
                                  estimatedArrival,
                                });
                                showToast(`Updated ETA for #${part.partNumber}: ${label}`);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClass(part.status)}`}>
                          {formatStatusLabel(part.status)}
                        </span>
                      </div>

                      {/* One-Click Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && (
                          <button
                            onClick={() => handleQuickReceive(part.roId, part.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Mark Received & Notify Tech
                          </button>
                        )}

                        {(part.status === 'RECEIVED' || part.status === 'IN_STOCK') && (
                          <button
                            onClick={() => handleIssueToTech(part.roId, part.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Issue to Tech
                          </button>
                        )}

                        <button
                          onClick={() => targetRO && setSelectedRO(targetRO)}
                          className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                          title="View Full RO Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DIRECT ADD / ORDER PART TO ANY REPAIR ORDER                        */}
      {/* ========================================================================= */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold">Add Parts to Repair Order</h3>
                    {currentSelectedRO && (
                      <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-extrabold rounded-full">
                        RO #{currentSelectedRO.id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentSelectedRO 
                      ? `${currentSelectedRO.vehicle.year} ${currentSelectedRO.vehicle.make} ${currentSelectedRO.vehicle.model} • ${currentSelectedRO.customerName}`
                      : 'Direct parts order entry and quoting'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddPartModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddPartSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              
              {/* Repair Order Selector (Standard Search Bar Combobox) */}
              <div ref={roDropdownRef} className="relative">
                {!currentSelectedRO || isRoDropdownOpen ? (
                  <>
                    <label htmlFor="parts-modal-ro-search" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Select Repair Order <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        id="parts-modal-ro-search"
                        value={roSearchQuery}
                        onChange={e => {
                          setRoSearchQuery(e.target.value);
                          setIsRoDropdownOpen(true);
                        }}
                        onFocus={() => setIsRoDropdownOpen(true)}
                        placeholder="Search by RO #, customer name, vehicle, or VIN..."
                        className="w-full text-xs sm:text-sm font-medium pl-9 pr-8 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                        autoFocus={!selectedTargetRoId}
                      />
                      {roSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => setRoSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                  </>
                ) : (
                  /* Compact Selected RO Summary Banner */
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="font-extrabold text-xs bg-slate-900 text-white px-2.5 py-1 rounded-md shrink-0">
                        RO #{currentSelectedRO.id}
                      </span>
                      <div className="truncate text-xs">
                        <span className="font-bold text-slate-900 mr-2">
                          {currentSelectedRO.vehicle.year} {currentSelectedRO.vehicle.make} {currentSelectedRO.vehicle.model}
                        </span>
                        <span className="text-slate-600 font-medium mr-2">
                          • {currentSelectedRO.customerName}
                        </span>
                        <span className="text-slate-500 hidden sm:inline">
                          (Tech: <strong>{currentSelectedRO.techName || 'Unassigned'}</strong>)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentSelectedRO.vehicle.vin && (
                        <button
                          type="button"
                          onClick={() => copyVin(currentSelectedRO.vehicle.vin, currentSelectedRO.id)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Copy VIN"
                        >
                          <Copy className="w-3 h-3 text-blue-600" />
                          <span className="font-mono text-[10px]">...{currentSelectedRO.vehicle.vin.slice(-8)}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTargetRoId('');
                          setRoSearchQuery('');
                          setIsRoDropdownOpen(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {/* Dropdown Options List */}
                {isRoDropdownOpen && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 z-30">
                    {filteredActiveROsForDropdown.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center">No matching Repair Orders found.</div>
                    ) : (
                      filteredActiveROsForDropdown.map(ro => {
                        const isSelected = ro.id === selectedTargetRoId;
                        const reqCount = ro.parts.filter(isTechRequestedPart).length;
                        return (
                          <button
                            key={ro.id}
                            type="button"
                            onClick={() => {
                              setSelectedTargetRoId(ro.id);
                              setIsRoDropdownOpen(false);
                              setRoSearchQuery('');
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-blue-50/80 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected ? 'bg-blue-50/70 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded shrink-0">
                                RO #{ro.id}
                              </span>
                              <div className="truncate text-xs">
                                <span className="font-bold text-slate-900 mr-1.5">
                                  {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                                </span>
                                <span className="text-slate-600 mr-1.5">• {ro.customerName}</span>
                                <span className="text-slate-400 text-[11px] hidden sm:inline">(Tech: {ro.techName || 'Unassigned'})</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {reqCount > 0 && (
                                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  {reqCount} Req
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                  Selected
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Hidden input for form validation */}
                <input
                  type="text"
                  className="sr-only"
                  required
                  value={selectedTargetRoId}
                  onChange={() => {}}
                  tabIndex={-1}
                />
              </div>

              {/* Technician Notes Callout (Clean & Compact) */}
              {currentSelectedRO && requestedPartsForSelectedRO.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-300/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-extrabold text-amber-950">
                        {requestedPartsForSelectedRO.length} Technician-Requested Part{requestedPartsForSelectedRO.length === 1 ? '' : 's'}
                      </span>
                      {techNotesForSelectedRO && (
                        <span className="text-amber-900 ml-1.5 italic text-[11px]">
                          — "{techNotesForSelectedRO}"
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-200 text-amber-900 border border-amber-300 rounded-full shrink-0">
                    Review Below
                  </span>
                </div>
              )}

              {/* Unified Parts Section */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>Parts to Order or Quote</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPartLine}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Part</span>
                  </button>
                </div>

                {/* 1. Technician-Requested Parts */}
                {requestedPartsForSelectedRO.map((rp, idx) => {
                  const draft = getReqDraft(rp);
                  const isROApproved = Boolean(
                    currentSelectedRO?.status === 'APPROVED' || 
                    currentSelectedRO?.quote?.status === 'APPROVED' || 
                    currentSelectedRO?.quote?.approvedAt || 
                    ['APPROVED', 'PARTS_ORDERED', 'PARTS_IN_TO_TECH', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP', 'CLOSED'].includes(currentSelectedRO?.status || '')
                  );
                  const isQuoteOnly = rp.status === 'QUOTE_ONLY' || rp.requestType === 'QUOTE_ONLY';
                  const isSent = isQuoteOnly && isPartSentToEstimate(rp);
                  const lineNum = rp.roLineNumber || (rp.notes?.match(/For Line (\d+)/i)?.[1] ? parseInt(rp.notes.match(/For Line (\d+)/i)![1]) : undefined);
                  const lineTotal = draft.price && !isNaN(Number(draft.price)) ? (Number(draft.price) * (draft.quantity || 1)).toFixed(2) : '0.00';

                  return (
                    <div 
                      key={rp.id || idx} 
                      className={`p-3 rounded-xl border transition-all space-y-2 ${
                        isSent 
                          ? 'bg-purple-50/40 border-purple-300' 
                          : isQuoteOnly 
                            ? 'bg-purple-50/50 border-purple-300' 
                            : 'bg-amber-50/30 border-amber-200'
                      }`}
                    >
                      {/* Part Item Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">
                            {rp.description || rp.name}
                          </span>
                          {lineNum && (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                              Line {lineNum}
                            </span>
                          )}

                          {/* Quick Toggle: Quote Only vs Order Now */}
                          {currentSelectedRO && (
                            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  updatePartItem(currentSelectedRO.id, rp.id, { status: 'QUOTE_ONLY', requestType: 'QUOTE_ONLY' });
                                }}
                                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                  isQuoteOnly ? 'bg-purple-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Mark as Quote Only"
                              >
                                Quote Only
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  updatePartItem(currentSelectedRO.id, rp.id, { status: 'REQUESTED', requestType: 'ORDER_NOW' });
                                }}
                                className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                                  !isQuoteOnly ? 'bg-amber-600 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Mark as Order Now"
                              >
                                Order Now
                              </button>
                            </div>
                          )}

                          {isQuoteOnly ? (
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-purple-100 text-purple-900 border-purple-300 shadow-2xs flex items-center gap-1">
                              <span>💬</span>
                              <span>QUOTE ONLY</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 shadow-2xs flex items-center gap-1">
                              <span>📦</span>
                              <span>ORDER NOW</span>
                            </span>
                          )}

                          {isSent && (
                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              <span>ADDED TO QUOTE</span>
                            </span>
                          )}
                        </div>

                        {/* Quick Add to Quote button if applicable */}
                        {isQuoteOnly && currentSelectedRO && (
                          isSent ? (
                            <button
                              type="button"
                              disabled
                              className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-not-allowed select-none"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                              <span>Added to Quote</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSaveQuotePriceOnly(currentSelectedRO.id, rp)}
                              className="text-[11px] font-black text-white bg-purple-600 hover:bg-purple-700 border border-purple-700 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                              title="Add quoted price directly to main customer quote"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>Add to Quote</span>
                            </button>
                          )
                        )}
                      </div>

                      {/* Input Row */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 sm:col-span-5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Part Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 68052369AA"
                            disabled={isSent}
                            value={draft.partNumber}
                            onChange={(e) => updateReqDraft(rp.id, 'partNumber', e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-white border border-slate-300 focus:border-blue-500 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                            autoFocus={idx === 0 && !isSent}
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-3">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Unit Price ($) <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              disabled={isSent}
                              value={draft.price}
                              onChange={(e) => updateReqDraft(rp.id, 'price', e.target.value)}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val && !isNaN(Number(val))) {
                                  updateReqDraft(rp.id, 'price', Number(val).toFixed(2));
                                }
                              }}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-bold bg-white border border-slate-300 focus:border-blue-500 rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Qty <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            disabled={isSent}
                            value={draft.quantity}
                            onChange={(e) => updateReqDraft(rp.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-center bg-white disabled:bg-slate-100"
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-2 flex items-center justify-end sm:pt-4">
                          <span className="text-xs font-mono font-bold text-slate-700">
                            ${lineTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Manual Part Lines */}
                {partLines.map((line, index) => {
                  const partTotal = line.price && !isNaN(Number(line.price)) ? (Number(line.price) * (line.quantity || 1)).toFixed(2) : '0.00';
                  return (
                    <div 
                      key={line.id} 
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                            {requestedPartsForSelectedRO.length + index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Part #{requestedPartsForSelectedRO.length + index + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Target Concern Line Selector */}
                          {currentSelectedRO && (currentSelectedRO.concerns && currentSelectedRO.concerns.length > 0 ? currentSelectedRO.concerns : [currentSelectedRO.primaryConcern || 'General Diagnostic & Service']).length > 1 && (
                            <select
                              value={line.roLineNumber || 1}
                              onChange={e => handleUpdatePartLine(line.id, 'roLineNumber', parseInt(e.target.value) || 1)}
                              className="text-[11px] font-medium px-2 py-0.5 bg-white border border-slate-300 rounded-md text-slate-700"
                            >
                              {(currentSelectedRO.concerns && currentSelectedRO.concerns.length > 0 ? currentSelectedRO.concerns : [currentSelectedRO.primaryConcern || 'General Diagnostic & Service']).map((c, cIdx) => (
                                <option key={cIdx} value={cIdx + 1}>
                                  Line {cIdx + 1}: {c.slice(0, 24)}...
                                </option>
                              ))}
                            </select>
                          )}

                          {(partLines.length > 1 || requestedPartsForSelectedRO.length > 0) && (
                            <button
                              type="button"
                              onClick={() => handleRemovePartLine(line.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Remove part line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Part Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 68197867AB"
                            value={line.partNumber}
                            onChange={e => handleUpdatePartLine(line.id, 'partNumber', e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-slate-900"
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-4">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ceramic Brake Pads"
                            value={line.description}
                            onChange={e => handleUpdatePartLine(line.id, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-slate-900"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Qty <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={line.quantity}
                            onChange={e => handleUpdatePartLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-center bg-white"
                          />
                        </div>

                        <div className="col-span-6 sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                            Price ($)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={line.price}
                              onChange={e => handleUpdatePartLine(line.id, 'price', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-bold bg-white border border-slate-300 focus:border-blue-500 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* If both lists are empty (e.g. RO with tech requests where user cleared everything) */}
                {requestedPartsForSelectedRO.length === 0 && partLines.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAddPartLine}
                    className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add First Part</span>
                  </button>
                )}
              </div>

              {/* Order Logistics & Settings (Simplified 2-Column Bar) */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Supplier / Vendor
                    </label>
                    <select
                      value={partVendor}
                      onChange={e => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingCustomVendor(true);
                          setShowAdvancedOptions(true);
                        } else {
                          setPartVendor(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {vendors.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value="__ADD_NEW__">+ Add Custom Vendor...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Expected Arrival
                    </label>
                    <ArrivalTimeFrameDropdown
                      value={partTimeFrameId || partStatus}
                      onChange={({ timeFrameId, status, estimatedArrival }) => {
                        setPartTimeFrameId(timeFrameId);
                        setPartStatus(status);
                        setPartEstimatedArrival(estimatedArrival);
                      }}
                    />
                  </div>
                </div>

                {/* Toggle for optional advanced fields */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedOptions(prev => !prev)}
                    className="text-slate-500 hover:text-blue-600 font-medium cursor-pointer flex items-center gap-1"
                  >
                    <span>{showAdvancedOptions ? '− Hide Tracking & Notes' : '+ Additional Options (Tracking #, Notes)'}</span>
                  </button>
                  {partEstimatedArrival && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Calculated Arrival: <strong>{formatEtaBadge(partEstimatedArrival).text}</strong>
                    </span>
                  )}
                </div>

                {/* Collapsible Advanced Options */}
                {showAdvancedOptions && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Tracking Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 1Z9999999999999999"
                          value={partTracking}
                          onChange={e => setPartTracking(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Internal Notes (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PO # or special handling"
                          value={partNotes}
                          onChange={e => setPartNotes(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {isAddingCustomVendor && (
                      <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter vendor name..."
                          value={customVendorInput}
                          onChange={e => setCustomVendorInput(e.target.value)}
                          className="flex-1 text-xs font-bold px-3 py-1.5 border border-blue-400 rounded-lg uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomVendor}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Add Vendor
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomVendor(false);
                            setCustomVendorInput('');
                          }}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 shrink-0">
                <div className="text-xs">
                  <span className="text-slate-500 font-medium">Estimated Total: </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    ${(() => {
                      let sum = 0;
                      if (requestedPartsForSelectedRO.length > 0) {
                        requestedPartsForSelectedRO.forEach(rp => {
                          const draft = getReqDraft(rp);
                          const p = parseFloat(draft.price);
                          if (!isNaN(p)) sum += p * (draft.quantity || 1);
                        });
                      }
                      partLines.forEach(l => {
                        const p = parseFloat(l.price);
                        if (!isNaN(p)) sum += p * (l.quantity || 1);
                      });
                      return sum.toFixed(2);
                    })()}
                  </span>
                  <span className="text-slate-400 ml-1.5 text-[11px]">
                    ({requestedPartsForSelectedRO.length + partLines.filter(l => l.partNumber.trim() || l.description.trim()).length} parts)
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddPartModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer border flex items-center gap-1.5 ${
                      addedRoIds.has(selectedTargetRoId)
                        ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700 border-blue-700'
                    }`}
                  >
                    {addedRoIds.has(selectedTargetRoId) ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Added to Repair Order</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5" />
                        <span>Add Parts to Repair Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

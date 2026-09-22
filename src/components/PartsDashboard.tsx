import React, { useState, useMemo } from 'react';
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
  Filter
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PartItem, PartStatus, RepairOrder } from '../types';
import { formatEtaBadge, formatDateTime } from '../utils/formatters';

const INITIAL_VENDORS = [
  'STELLANTIS',
  'OREILLY',
  'AUTOZONE',
  'HOLLANDS',
  'RICKS PRO TRUCK'
];

const INITIAL_PART_STATUS_OPTIONS = [
  { id: 'IN_STOCK', label: 'IN STOCK' },
  { id: 'DAILY_ORDER', label: 'DAILY ORDER' },
  { id: 'SPECIAL_ORDER_1_5_DAYS', label: 'SPECIAL ORDER 1-5 DAYS' },
  { id: 'VOR_UPGRADE', label: 'VOR UPGRADE' },
];

export const PartsDashboard: React.FC = () => {
  const { repairOrders, updatePartStatus, addPartOrder, setSelectedRO, users } = useApp();

  // Active view: 'RO_LIST' (Access all ROs directly) or 'PARTS_LIST' (Tracked Logistics)
  const [activeTab, setActiveTab] = useState<'RO_LIST' | 'PARTS_LIST'>('RO_LIST');

  // Dedicated lookup fields to pull up orders respectively
  const [lookupRoNumber, setLookupRoNumber] = useState('');
  const [lookupCustomer, setLookupCustomer] = useState('');
  const [lookupVin, setLookupVin] = useState('');
  const [lookupTech, setLookupTech] = useState('');
  const [lookupAdvisor, setLookupAdvisor] = useState('');
  const [showAllBackgroundROs, setShowAllBackgroundROs] = useState(false);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
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
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const [partVendor, setPartVendor] = useState<string>(INITIAL_VENDORS[0]);
  const [partStatus, setPartStatus] = useState<PartStatus>('IN_STOCK');
  const [partEtaTime, setPartEtaTime] = useState('17:00');
  const [partTracking, setPartTracking] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [copiedVinId, setCopiedVinId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Repair Orders
  const activeROs = useMemo(() => {
    return repairOrders.filter(ro => ro.status !== 'COMPLETED');
  }, [repairOrders]);

  // Technicians and Service Advisors for datalists & lookups
  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN');
  }, [users]);

  const serviceAdvisors = useMemo(() => {
    return users.filter(u => u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER');
  }, [users]);

  // Check whether any lookup field or search query is entered
  const isAnyLookupActive = useMemo(() => {
    return Boolean(
      lookupRoNumber.trim() ||
      lookupCustomer.trim() ||
      lookupVin.trim() ||
      lookupTech.trim() ||
      lookupAdvisor.trim() ||
      searchQuery.trim()
    );
  }, [lookupRoNumber, lookupCustomer, lookupVin, lookupTech, lookupAdvisor, searchQuery]);

  const activeCriteriaCount = useMemo(() => {
    return [
      lookupRoNumber.trim(),
      lookupCustomer.trim(),
      lookupVin.trim(),
      lookupTech.trim(),
      lookupAdvisor.trim(),
      searchQuery.trim()
    ].filter(Boolean).length;
  }, [lookupRoNumber, lookupCustomer, lookupVin, lookupTech, lookupAdvisor, searchQuery]);

  // Helper to reset lookups back to hidden background state
  const clearAllLookups = () => {
    setLookupRoNumber('');
    setLookupCustomer('');
    setLookupVin('');
    setLookupTech('');
    setLookupAdvisor('');
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
  const dailyOrderCount = allParts.filter(p => p.status === 'DAILY_ORDER' || p.status === 'ORDERED').length;
  const specialOrderCount = allParts.filter(p => p.status === 'SPECIAL_ORDER_1_5_DAYS' || p.status === 'SPECIAL_ORDER').length;
  const vorUpgradeCount = allParts.filter(p => p.status === 'VOR_UPGRADE').length;
  const receivedCount = allParts.filter(p => p.status === 'RECEIVED').length;

  // Filtered ROs for RO Directory Tab - Hidden in background by default until entered or revealed
  const filteredROs = useMemo(() => {
    // If no search input is provided and user has not clicked reveal, repair orders remain hidden in the background
    if (!isAnyLookupActive && !showAllBackgroundROs) {
      return [];
    }

    return activeROs.filter(ro => {
      // 1. RO Status filter
      if (roStatusFilter === 'NEEDS_PARTS' && ro.parts.length > 0) return false;
      if (roStatusFilter === 'HAS_PARTS' && ro.parts.length === 0) return false;
      if (roStatusFilter === 'WAITING_PARTS' && ro.status !== 'WAITING_PARTS') return false;
      if (roStatusFilter === 'IN_BAY' && ro.status !== 'IN_BAY' && ro.status !== 'IN_REPAIR') return false;

      // 2. Repair Order Number lookup (e.g. 1042 or RO-1042)
      if (lookupRoNumber.trim()) {
        const cleanRoInput = lookupRoNumber.trim().toLowerCase().replace(/^#|^ro-?/, '');
        const cleanRoId = ro.id.toLowerCase().replace(/^#|^ro-?/, '');
        if (!cleanRoId.includes(cleanRoInput)) return false;
      }

      // 3. Customer Name lookup
      if (lookupCustomer.trim()) {
        const custQuery = lookupCustomer.trim().toLowerCase();
        const matchesCustomer = ro.customerName.toLowerCase().includes(custQuery) || 
                                ro.customerPhone.includes(custQuery);
        if (!matchesCustomer) return false;
      }

      // 4. VIN lookup (full VIN or partial / last 8)
      if (lookupVin.trim()) {
        const vinQuery = lookupVin.trim().toLowerCase();
        const matchesVin = ro.vehicle.vin.toLowerCase().includes(vinQuery);
        if (!matchesVin) return false;
      }

      // 5. Technician lookup (matches tech name, employee number, or concern line tech)
      if (lookupTech.trim()) {
        const techQuery = lookupTech.trim().toLowerCase();
        const assignedTech = users.find(u => u.id === ro.techId);
        const matchesTech = (ro.techName && ro.techName.toLowerCase().includes(techQuery)) ||
                            (ro.techId && ro.techId.toLowerCase() === techQuery) ||
                            (assignedTech?.employeeNumber && assignedTech.employeeNumber.toLowerCase().includes(techQuery)) ||
                            (ro.concernTechNames && ro.concernTechNames.some(t => t && t.toLowerCase().includes(techQuery)));
        if (!matchesTech) return false;
      }

      // 6. Service Advisor lookup (matches advisor name, ID, or employee number)
      if (lookupAdvisor.trim()) {
        const advQuery = lookupAdvisor.trim().toLowerCase();
        const advisorUser = users.find(u => u.id === ro.advisorId);
        const matchesAdv = (ro.advisorName && ro.advisorName.toLowerCase().includes(advQuery)) ||
                           (ro.advisorId && ro.advisorId.toLowerCase() === advQuery) ||
                           (advisorUser?.employeeNumber && advisorUser.employeeNumber.toLowerCase().includes(advQuery));
        if (!matchesAdv) return false;
      }

      // 7. General search fallback (if typed into universal search)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRO = ro.id.toLowerCase().includes(q);
        const matchCustomer = ro.customerName.toLowerCase().includes(q) || ro.customerPhone.includes(q);
        const matchVehicle = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ${ro.vehicle.vin} ${ro.vehicle.licensePlate || ''}`.toLowerCase().includes(q);
        const matchTech = ro.techName?.toLowerCase().includes(q);
        const matchAdvisor = ro.advisorName.toLowerCase().includes(q);
        const matchConcerns = ro.concerns.some(c => c.toLowerCase().includes(q)) || (ro.primaryConcern && ro.primaryConcern.toLowerCase().includes(q));
        const matchParts = ro.parts.some(p => p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        if (!matchRO && !matchCustomer && !matchVehicle && !matchTech && !matchAdvisor && !matchConcerns && !matchParts) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeROs, 
    roStatusFilter, 
    lookupRoNumber, 
    lookupCustomer, 
    lookupVin, 
    lookupTech, 
    lookupAdvisor, 
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
        } else if (p.status !== statusFilter) {
          return false;
        }
      }

      if (lookupRoNumber.trim()) {
        const cleanRoInput = lookupRoNumber.trim().toLowerCase().replace(/^#|^ro-?/, '');
        const cleanRoId = p.roId.toLowerCase().replace(/^#|^ro-?/, '');
        if (!cleanRoId.includes(cleanRoInput)) return false;
      }

      if (lookupCustomer.trim()) {
        if (!p.customerName.toLowerCase().includes(lookupCustomer.trim().toLowerCase())) return false;
      }

      if (lookupVin.trim()) {
        const matchingRo = repairOrders.find(r => r.id === p.roId);
        if (!matchingRo || !matchingRo.vehicle.vin.toLowerCase().includes(lookupVin.trim().toLowerCase())) return false;
      }

      if (lookupTech.trim()) {
        if (!p.techName || !p.techName.toLowerCase().includes(lookupTech.trim().toLowerCase())) return false;
      }

      if (lookupAdvisor.trim()) {
        if (!p.advisorName || !p.advisorName.toLowerCase().includes(lookupAdvisor.trim().toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPart = p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        const matchRO = p.roId.toLowerCase().includes(q);
        const matchVendor = p.vendor.toLowerCase().includes(q);
        const matchTech = p.techName?.toLowerCase().includes(q);
        const matchVeh = p.vehicleStr.toLowerCase().includes(q);
        return matchPart || matchRO || matchVendor || matchTech || matchVeh;
      }

      return true;
    });
  }, [
    allParts, 
    statusFilter, 
    lookupRoNumber, 
    lookupCustomer, 
    lookupVin, 
    lookupTech, 
    lookupAdvisor, 
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

  const openAddPartModalForRO = (roId?: string) => {
    setSelectedTargetRoId(roId || (activeROs[0]?.id || ''));
    setPartNumber('');
    setPartDescription('');
    setPartQuantity(1);
    setPartVendor(vendors[0] || INITIAL_VENDORS[0]);
    setPartStatus('IN_STOCK');
    setPartEtaTime('17:00');
    setPartTracking('');
    setPartPrice('');
    setPartNotes('');
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
    if (!partNumber.trim() || !partDescription.trim()) {
      alert('Part Number and Part Description are required.');
      return;
    }

    // Build ETA ISO string
    const today = new Date();
    const [hours, minutes] = partEtaTime ? partEtaTime.split(':') : ['17', '00'];
    const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '17'), parseInt(minutes || '00'));

    const effectiveVendor = isAddingCustomVendor && customVendorInput.trim() 
      ? customVendorInput.trim().toUpperCase() 
      : partVendor;

    if (isAddingCustomVendor && customVendorInput.trim() && !vendors.includes(effectiveVendor)) {
      setVendors(prev => [...prev, effectiveVendor]);
    }

    const effectiveStatus = isAddingCustomStatus && customStatusInput.trim()
      ? customStatusInput.trim().toUpperCase().replace(/\s+/g, '_')
      : partStatus;

    if (isAddingCustomStatus && customStatusInput.trim() && !customStatuses.includes(effectiveStatus)) {
      setCustomStatuses(prev => [...prev, effectiveStatus]);
    }

    addPartOrder(selectedTargetRoId, {
      partNumber: partNumber.trim().toUpperCase(),
      description: partDescription.trim(),
      quantity: partQuantity || 1,
      status: effectiveStatus,
      vendor: effectiveVendor || 'STELLANTIS',
      estimatedArrival: effectiveStatus === 'IN_STOCK' ? new Date().toISOString() : etaDate.toISOString(),
      trackingNumber: partTracking.trim() || undefined,
      price: partPrice ? parseFloat(partPrice) : undefined,
      notes: partNotes.trim() || undefined,
    });

    setIsAddPartModalOpen(false);
    showToast(`Part #${partNumber.trim().toUpperCase()} (${formatStatusLabel(effectiveStatus)}) added to RO #${selectedTargetRoId}!`);
  };

  const formatStatusLabel = (status: PartStatus): string => {
    switch (status) {
      case 'IN_STOCK':
        return 'IN STOCK';
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
      default:
        return status.replace(/_/g, ' ');
    }
  };

  const getStatusBadgeClass = (status: PartStatus): string => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
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
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Parts Department & Sourcing Hub
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              Full Shop Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Requisition parts, manage stock, and place daily orders or VOR upgrades for any repair order ticket.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          <button
            id="parts-add-part-btn"
            onClick={() => openAddPartModalForRO()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer border border-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add / Issue Part to Any RO</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div 
          onClick={() => { 
            setActiveTab('RO_LIST'); 
            setShowAllBackgroundROs(prev => !prev); 
          }}
          className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-slate-600 shadow-xs hover:border-blue-500 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>ROs In Background</span>
            <FileText className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalRoCount}</div>
          <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
            {showAllBackgroundROs ? 'Revealed in list' : 'Hidden until pulled up'}
          </div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('IN_STOCK'); }}
          className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/20 shadow-xs hover:border-emerald-600 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
            <span>In Stock</span>
            <Package className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{inStockCount}</div>
          <div className="text-[10px] text-emerald-800 font-semibold mt-0.5">Inventory ready</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('DAILY_ORDER'); }}
          className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-blue-500 shadow-xs hover:border-blue-600 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center justify-between">
            <span>Daily Order</span>
            <Truck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-1">{dailyOrderCount}</div>
          <div className="text-[10px] text-blue-800 font-semibold mt-0.5">Regular replenishment</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('SPECIAL_ORDER_1_5_DAYS'); }}
          className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-amber-500 shadow-xs hover:border-amber-600 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            <span>Special Order 1-5 Days</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">{specialOrderCount}</div>
          <div className="text-[10px] text-amber-800 font-semibold mt-0.5">Supplier pending</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('VOR_UPGRADE'); }}
          className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-rose-500 bg-rose-50/20 shadow-xs col-span-2 sm:col-span-1 hover:border-rose-600 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
            <span>VOR Upgrade</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">{vorUpgradeCount}</div>
          <div className="text-[10px] text-rose-800 font-semibold mt-0.5">Emergency expedite</div>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="parts-tab-all-ros"
          onClick={() => setActiveTab('RO_LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'RO_LIST'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-300'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Repair Orders (Direct Entry)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'RO_LIST' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-800'
          }`}>
            {isAnyLookupActive || showAllBackgroundROs ? `${filteredROs.length} Pulled Up` : 'Hidden in Background'}
          </span>
        </button>

        <button
          id="parts-tab-logistics"
          onClick={() => setActiveTab('PARTS_LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PARTS_LIST'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Tracked Parts Logistics</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'PARTS_LIST' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'
          }`}>
            {allParts.length}
          </span>
        </button>
      </div>

      {/* Dedicated Parts Counter Repair Order Lookup & Pull-Up Station */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-700 shadow-xs space-y-3">
        {/* Header with status badge & action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Search className="w-4 h-4 text-blue-600" />
              <span>Repair Order Lookup & Pull-Up Station</span>
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

        {/* 5 Distinct Lookup Inputs Requested by User */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          {/* 1. Repair Order Number */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Repair Order #
            </label>
            <div className="relative">
              <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. 1042"
                value={lookupRoNumber}
                onChange={e => {
                  setLookupRoNumber(e.target.value);
                  setShowAllBackgroundROs(false);
                }}
                className="w-full text-xs font-mono font-bold pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              {lookupRoNumber && (
                <button
                  type="button"
                  onClick={() => setLookupRoNumber('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear RO #"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Customer Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Customer Name
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Smith or Sarah"
                value={lookupCustomer}
                onChange={e => {
                  setLookupCustomer(e.target.value);
                  setShowAllBackgroundROs(false);
                }}
                className="w-full text-xs font-bold pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              {lookupCustomer && (
                <button
                  type="button"
                  onClick={() => setLookupCustomer('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear Customer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. VIN */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              VIN (Full or Last 8)
            </label>
            <div className="relative">
              <Car className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. 1C4... or last 8"
                value={lookupVin}
                onChange={e => {
                  setLookupVin(e.target.value.toUpperCase());
                  setShowAllBackgroundROs(false);
                }}
                className="w-full text-xs font-mono font-bold pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400 uppercase"
              />
              {lookupVin && (
                <button
                  type="button"
                  onClick={() => setLookupVin('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear VIN"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Technician */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Technician
            </label>
            <div className="relative">
              <Wrench className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                list="parts-tech-options"
                placeholder="Type or pick Tech..."
                value={lookupTech}
                onChange={e => {
                  setLookupTech(e.target.value);
                  setShowAllBackgroundROs(false);
                }}
                className="w-full text-xs font-bold pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <datalist id="parts-tech-options">
                {technicians.map(t => (
                  <option key={t.id} value={t.name}>
                    {t.name} {t.employeeNumber ? `(#${t.employeeNumber})` : ''}
                  </option>
                ))}
              </datalist>
              {lookupTech && (
                <button
                  type="button"
                  onClick={() => setLookupTech('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 z-10 cursor-pointer"
                  title="Clear Tech"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 5. Service Advisor */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
              Service Advisor
            </label>
            <div className="relative">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                list="parts-advisor-options"
                placeholder="Type or pick Advisor..."
                value={lookupAdvisor}
                onChange={e => {
                  setLookupAdvisor(e.target.value);
                  setShowAllBackgroundROs(false);
                }}
                className="w-full text-xs font-bold pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <datalist id="parts-advisor-options">
                {serviceAdvisors.map(a => (
                  <option key={a.id} value={a.name}>
                    {a.name} {a.employeeNumber ? `(#${a.employeeNumber})` : ''}
                  </option>
                ))}
              </datalist>
              {lookupAdvisor && (
                <button
                  type="button"
                  onClick={() => setLookupAdvisor('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 z-10 cursor-pointer"
                  title="Clear Advisor"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Filter Strip & Helper Notification */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-slate-700">
            {!isAnyLookupActive && !showAllBackgroundROs ? (
              <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Repair orders hidden in background. Enter an RO #, Customer, VIN, Tech, or Advisor above to pull up records.</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-900 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>
                  {filteredROs.length} Repair Order{filteredROs.length !== 1 ? 's' : ''} pulled up
                  {activeCriteriaCount > 0 ? ` (${activeCriteriaCount} search field${activeCriteriaCount > 1 ? 's' : ''} active)` : ''}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'RO_LIST' ? (
              <select
                value={roStatusFilter}
                onChange={e => setRoStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border-2 border-slate-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              >
                <option value="ALL">All Shop Statuses ({activeROs.length})</option>
                <option value="NEEDS_PARTS">Needs Parts (0 Parts on RO)</option>
                <option value="HAS_PARTS">Has Parts Attached</option>
                <option value="WAITING_PARTS">Status: Waiting on Parts</option>
                <option value="IN_BAY">Status: In Bay / In Repair</option>
              </select>
            ) : (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PartStatus | 'ALL')}
                className="text-xs px-2.5 py-1.5 border-2 border-slate-500 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              >
                <option value="ALL">All Part Statuses ({allParts.length})</option>
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

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL REPAIR ORDERS DIRECT DIRECTORY (Direct Part Entry)             */}
      {/* ========================================================================= */}
      {activeTab === 'RO_LIST' && (
        <div className="space-y-3">
          
          {/* Active criteria pills strip when lookups are applied */}
          {isAnyLookupActive && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/90 border-2 border-blue-400 rounded-xl text-xs flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-blue-950 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pulled Up Criteria:</span>
                </span>
                {lookupRoNumber && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-900 shadow-2xs">
                    RO #{lookupRoNumber}
                    <button type="button" onClick={() => setLookupRoNumber('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
                {lookupCustomer && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-bold text-blue-900 shadow-2xs">
                    Customer: {lookupCustomer}
                    <button type="button" onClick={() => setLookupCustomer('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
                {lookupVin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-blue-900 shadow-2xs">
                    VIN: {lookupVin}
                    <button type="button" onClick={() => setLookupVin('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
                {lookupTech && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-bold text-blue-900 shadow-2xs">
                    Tech: {lookupTech}
                    <button type="button" onClick={() => setLookupTech('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
                {lookupAdvisor && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-bold text-blue-900 shadow-2xs">
                    Advisor: {lookupAdvisor}
                    <button type="button" onClick={() => setLookupAdvisor('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-300 rounded font-bold text-blue-900 shadow-2xs">
                    Query: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 cursor-pointer">×</button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={clearAllLookups}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg border-2 border-slate-400 text-xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-slate-600" />
                <span>Clear & Hide to Background</span>
              </button>
            </div>
          )}

          {/* STATE A: NO SEARCH CRITERIA ENTERED AND NOT REVEALED -> HIDDEN IN BACKGROUND */}
          {!isAnyLookupActive && !showAllBackgroundROs && (
            <div className="bg-white rounded-xl border-2 border-slate-600 p-8 sm:p-10 text-center shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-slate-400 text-slate-700 flex items-center justify-center mx-auto shadow-2xs">
                <Search className="w-7 h-7 text-blue-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Repair Orders Are Hidden in the Background
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto">
                  Enter a <strong>Repair Order #</strong>, <strong>Customer Name</strong>, <strong>VIN</strong>, <strong>Technician</strong>, or <strong>Service Advisor</strong> in the lookup bar above to pull up the ticket.
                </p>
              </div>

              {/* Quick Click Pull-Up Suggestions */}
              {activeROs.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Quick Pull-Up by Active Ticket:
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap max-w-3xl mx-auto">
                    {activeROs.slice(0, 6).map(ro => (
                      <button
                        key={ro.id}
                        type="button"
                        onClick={() => setLookupRoNumber(ro.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-800 hover:text-blue-900 rounded-lg border-2 border-slate-400 hover:border-blue-500 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span>RO #{ro.id}</span>
                        <span className="text-slate-600 font-sans text-[11px] font-medium">
                          • {ro.customerName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAllBackgroundROs(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border-2 border-slate-400 hover:border-slate-600 transition-colors cursor-pointer"
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
                Clear Lookup & Return to Standby
              </button>
            </div>
          )}

          {/* STATE C: ORDERS PULLED UP */}
          {(isAnyLookupActive || showAllBackgroundROs) && filteredROs.length > 0 && (
            <div className="space-y-2.5">
              {filteredROs.map(ro => {
                const assignedTech = users.find(u => u.id === ro.techId);
                const advisor = users.find(u => u.id === ro.advisorId);
                const hasParts = ro.parts && ro.parts.length > 0;

                return (
                  <div
                    key={ro.id}
                    id={`parts-ro-card-${ro.id}`}
                    className="bg-white rounded-xl border-2 border-slate-600 p-3.5 sm:p-4 shadow-xs hover:border-blue-500 transition-all space-y-3"
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
                          <span className="inline-flex items-center gap-1.5 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                            <span>VIN: <strong>{ro.vehicle.vin}</strong></span>
                            <button
                              onClick={() => copyVin(ro.vehicle.vin, ro.id)}
                              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Copy VIN for parts catalog lookup"
                            >
                              {copiedVinId === ro.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
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
                            onClick={() => openAddPartModalForRO(ro.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer border border-blue-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Part to Ticket</span>
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
                          {ro.parts.map(part => {
                            const etaBadge = formatEtaBadge(part.estimatedArrival);
                            return (
                              <div
                                key={part.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
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
                                      <span className="text-slate-600 font-bold">Price: ${part.price.toFixed(2)}</span>
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
                                  {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && (
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
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRACKED PARTS LOGISTICS ROSTER                                     */}
      {/* ========================================================================= */}
      {activeTab === 'PARTS_LIST' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">
              Tracked Parts Roster ({filteredParts.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Real-time delivery countdowns & parts status dispatch
            </span>
          </div>

          {filteredParts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No parts found</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing filters or search query.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParts.map(part => {
                const etaBadge = formatEtaBadge(part.estimatedArrival);
                const targetRO = repairOrders.find(r => r.id === part.roId);

                return (
                  <div
                    key={part.id}
                    id={`parts-item-${part.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left Info: Part #, Description, Supplier, Vehicle */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
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
                          <span>Price: <strong className="text-slate-700">${part.price.toFixed(2)}</strong></span>
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
                      
                      {/* ETA Countdown Badge */}
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</div>
                        {part.status !== 'IN_STOCK' && part.status !== 'ISSUED_TO_TECH' && part.estimatedArrival ? (
                          <div className={`mt-0.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full inline-block ${
                            etaBadge.pastDue 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {etaBadge.text}
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-emerald-700">In Stock / Complete</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add / Issue Part to Repair Order</h3>
                  <p className="text-xs text-slate-400">Direct parts entry by Parts Department</p>
                </div>
              </div>

              <button
                onClick={() => setIsAddPartModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddPartSubmit} className="p-6 space-y-4">
              
              {/* Repair Order Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Repair Order <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTargetRoId}
                  onChange={e => setSelectedTargetRoId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-800"
                >
                  <option value="">-- Select Repair Order --</option>
                  {activeROs.map(ro => (
                    <option key={ro.id} value={ro.id}>
                      RO #{ro.id} — {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model} ({ro.customerName}) — Tech: {ro.techName || 'Unassigned'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Part Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Part Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 68197867AB, FL-820-S"
                    value={partNumber}
                    onChange={e => setPartNumber(e.target.value)}
                    required
                    className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs uppercase text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={partQuantity}
                    onChange={e => setPartQuantity(parseInt(e.target.value) || 1)}
                    required
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Part Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Oil Filter, Front Ceramic Brake Pads, Serpentine Belt"
                    value={partDescription}
                    onChange={e => setPartDescription(e.target.value)}
                    required
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                  />
                </div>

                {/* Supplier / Vendor Dropdown with Custom Add */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Supplier / Vendor <span className="text-red-500">*</span>
                    </label>
                    {!isAddingCustomVendor && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomVendor(true);
                          setCustomVendorInput('');
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        + Add Custom
                      </button>
                    )}
                  </div>

                  {!isAddingCustomVendor ? (
                    <select
                      value={partVendor}
                      onChange={e => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingCustomVendor(true);
                          setCustomVendorInput('');
                        } else {
                          setPartVendor(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 bg-white"
                    >
                      {vendors.map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                      <option value="__ADD_NEW__">+ Add Other Vendor...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Enter vendor name..."
                        value={customVendorInput}
                        onChange={e => setCustomVendorInput(e.target.value)}
                        autoFocus
                        className="flex-1 text-xs font-bold px-3 py-2 border-2 border-blue-500 rounded-xl focus:outline-none uppercase text-slate-800"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomVendor();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomVendor}
                        className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomVendor(false);
                          setCustomVendorInput('');
                        }}
                        className="px-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Initial Part Status (IN STOCK, DAILY ORDER, SPECIAL ORDER 1-5 DAYS, VOR UPGRADE, + Custom Status) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Initial Part Status <span className="text-red-500">*</span>
                    </label>
                    {!isAddingCustomStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomStatus(true);
                          setCustomStatusInput('');
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        + Add Custom Status
                      </button>
                    )}
                  </div>

                  {!isAddingCustomStatus ? (
                    <select
                      value={partStatus}
                      onChange={e => {
                        if (e.target.value === '__ADD_NEW_STATUS__') {
                          setIsAddingCustomStatus(true);
                          setCustomStatusInput('');
                        } else {
                          setPartStatus(e.target.value as PartStatus);
                        }
                      }}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 bg-white"
                    >
                      {allAvailableStatuses.map(st => (
                        <option key={st.id} value={st.id}>{st.label}</option>
                      ))}
                      <option value="__ADD_NEW_STATUS__">+ Add Custom Status...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. TIRE WAREHOUSE, CORE RETURN..."
                        value={customStatusInput}
                        onChange={e => setCustomStatusInput(e.target.value)}
                        autoFocus
                        className="flex-1 text-xs font-bold px-3 py-2 border-2 border-blue-500 rounded-xl focus:outline-none uppercase text-slate-800"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomStatus();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomStatus}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomStatus(false);
                          setCustomStatusInput('');
                        }}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={partPrice}
                      onChange={e => setPartPrice(e.target.value)}
                      className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>

                {/* Estimated Arrival Time Today (Only if not IN STOCK) */}
                {partStatus !== 'IN_STOCK' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Estimated Arrival Time Today (ETA)
                    </label>
                    <input
                      type="time"
                      value={partEtaTime}
                      onChange={e => setPartEtaTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                    />
                  </div>
                )}

                {/* Tracking Number (Optional) */}
                {partStatus !== 'IN_STOCK' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Tracking Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1Z9999999999999999"
                      value={partTracking}
                      onChange={e => setPartTracking(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-800"
                    />
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddPartModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer border border-blue-700"
                >
                  Confirm & Add to RO
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

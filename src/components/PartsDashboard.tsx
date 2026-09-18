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
  DollarSign
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

  // Filtered ROs for RO Directory Tab
  const filteredROs = useMemo(() => {
    return activeROs.filter(ro => {
      // Status filter
      if (roStatusFilter === 'NEEDS_PARTS' && ro.parts.length > 0) return false;
      if (roStatusFilter === 'HAS_PARTS' && ro.parts.length === 0) return false;
      if (roStatusFilter === 'WAITING_PARTS' && ro.status !== 'WAITING_PARTS') return false;
      if (roStatusFilter === 'IN_BAY' && ro.status !== 'IN_BAY' && ro.status !== 'IN_REPAIR') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRO = ro.id.toLowerCase().includes(q);
        const matchCustomer = ro.customerName.toLowerCase().includes(q) || ro.customerPhone.includes(q);
        const matchVehicle = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ${ro.vehicle.vin} ${ro.vehicle.licensePlate || ''}`.toLowerCase().includes(q);
        const matchTech = ro.techName?.toLowerCase().includes(q);
        const matchAdvisor = ro.advisorName.toLowerCase().includes(q);
        const matchConcerns = ro.concerns.some(c => c.toLowerCase().includes(q)) || (ro.primaryConcern && ro.primaryConcern.toLowerCase().includes(q));
        const matchParts = ro.parts.some(p => p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
        return matchRO || matchCustomer || matchVehicle || matchTech || matchAdvisor || matchConcerns || matchParts;
      }

      return true;
    });
  }, [activeROs, roStatusFilter, searchQuery]);

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
  }, [allParts, statusFilter, searchQuery]);

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div 
          onClick={() => { setActiveTab('RO_LIST'); setRoStatusFilter('ALL'); }}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Total Active ROs</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalRoCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{rosNeedingPartsCount} without parts</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('IN_STOCK'); }}
          className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs hover:border-emerald-400 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
            <span>In Stock</span>
            <Package className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{inStockCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Inventory ready</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('DAILY_ORDER'); }}
          className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs hover:border-blue-400 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center justify-between">
            <span>Daily Order</span>
            <Truck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{dailyOrderCount}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Regular replenishment</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('SPECIAL_ORDER_1_5_DAYS'); }}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            <span>Special Order 1-5 Days</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{specialOrderCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Supplier pending (1-5 days)</div>
        </div>

        <div 
          onClick={() => { setActiveTab('PARTS_LIST'); setStatusFilter('VOR_UPGRADE'); }}
          className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs col-span-2 sm:col-span-1 hover:border-rose-400 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
            <span>VOR Upgrade</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{vorUpgradeCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">Emergency expedite</div>
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
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>All Active Repair Orders</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'RO_LIST' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {activeROs.length}
          </span>
        </button>

        <button
          id="parts-tab-logistics"
          onClick={() => setActiveTab('PARTS_LIST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PARTS_LIST'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Tracked Parts Logistics</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'PARTS_LIST' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {allParts.length}
          </span>
        </button>
      </div>

      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'RO_LIST' 
                ? "Search RO #, Customer, VIN, Vehicle, Tech, or Concern..." 
                : "Search Part #, Description, Supplier, RO #, or Tech..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
            />
          </div>

          {activeTab === 'RO_LIST' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={roStatusFilter}
                onChange={e => setRoStatusFilter(e.target.value)}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-700"
              >
                <option value="ALL">All Active Repair Orders ({activeROs.length})</option>
                <option value="NEEDS_PARTS">Needs Parts (0 Parts on RO)</option>
                <option value="HAS_PARTS">Has Parts Attached</option>
                <option value="WAITING_PARTS">Status: Waiting on Parts</option>
                <option value="IN_BAY">Status: In Bay / In Repair</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PartStatus | 'ALL')}
                className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-700"
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
            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL REPAIR ORDERS DIRECT DIRECTORY (Direct Part Entry)             */}
      {/* ========================================================================= */}
      {activeTab === 'RO_LIST' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Active Repair Orders for Direct Part Ordering</span>
              <span className="text-xs font-semibold text-slate-500">
                ({filteredROs.length} orders shown)
              </span>
            </h2>
            <span className="text-xs text-slate-500">
              Click <strong>+ Add Part to Ticket</strong> on any order to order or issue parts
            </span>
          </div>

          {filteredROs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No matching Repair Orders</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or filter options.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredROs.map(ro => {
                const assignedTech = users.find(u => u.id === ro.techId);
                const advisor = users.find(u => u.id === ro.advisorId);
                const hasParts = ro.parts && ro.parts.length > 0;

                return (
                  <div
                    key={ro.id}
                    id={`parts-ro-card-${ro.id}`}
                    className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-blue-300 transition-all space-y-3.5"
                  >
                    {/* Top Row: RO #, Vehicle, Customer, VIN, Status Badges */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span 
                            onClick={() => setSelectedRO(ro)}
                            className="text-base font-black text-blue-600 hover:text-blue-800 cursor-pointer font-mono"
                          >
                            RO #{ro.id}
                          </span>

                          <span className="font-bold text-sm text-slate-800">
                            {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                          </span>

                          {ro.vehicle.licensePlate && (
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              Tag: {ro.vehicle.licensePlate}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-medium">
                            ({ro.vehicle.mileage.toLocaleString()} mi)
                          </span>

                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            ro.status === 'WAITING_PARTS'
                              ? 'bg-orange-100 text-orange-700 border-orange-200'
                              : ro.status === 'IN_BAY' || ro.status === 'IN_REPAIR'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {ro.status.replace('_', ' ')}
                          </span>

                          {ro.isWaiter && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                              Waiter Customer
                            </span>
                          )}
                        </div>

                        {/* Customer & VIN */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span>Customer: <strong className="text-slate-800">{ro.customerName}</strong> ({ro.customerPhone})</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1.5 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
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
                          <div className="text-slate-500">
                            Tech: <strong className="text-slate-800">{ro.techName || 'Unassigned'}</strong>
                            {assignedTech?.employeeNumber && (
                              <span className="ml-1 font-mono text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                                {assignedTech.employeeNumber}
                              </span>
                            )}
                            {ro.bay && <span className="ml-1 text-slate-500">({ro.bay})</span>}
                          </div>
                          <div className="text-slate-500">
                            Advisor: <strong className="text-slate-800">{ro.advisorName}</strong>
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
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                            title="Open Complete RO Details Modal"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open RO</span>
                          </button>
                        </div>

                      </div>

                    </div>

                    {/* Middle Row: Concerns & Findings (Context for Parts Lookup) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
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
                          <span>({part.bay || 'No Bay'})</span>
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
                            Issue to Tech in Bay
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

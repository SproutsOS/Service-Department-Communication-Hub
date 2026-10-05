import React, { useState, useMemo } from 'react';
import { 
  X, 
  Package, 
  Clock, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Check, 
  AlertTriangle, 
  Truck, 
  Calendar, 
  ArrowUpDown, 
  ExternalLink, 
  User, 
  Car, 
  Building2,
  RefreshCw,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Plus,
  SlidersHorizontal
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PartItem, RepairOrder, PartStatus } from '../types';
import { formatEtaBadge, formatDateTime, formatCurrency } from '../utils/formatters';
import { ArrivalTimeFrameDropdown } from './ArrivalTimeFrameDropdown';
import { EditPartModal } from './EditPartModal';

interface ManagerPartsOnOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRO: (ro: RepairOrder) => void;
}

export const ManagerPartsOnOrderModal: React.FC<ManagerPartsOnOrderModalProps> = ({
  isOpen,
  onClose,
  onOpenRO
}) => {
  const { 
    repairOrders, 
    updatePartItem, 
    updatePartStatus,
    currentUser,
    users
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'IN_TRANSIT' | 'SPECIAL_ORDER' | 'BACKORDERED' | 'RECEIVED'>('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [techFilter, setTechFilter] = useState('ALL');
  const [advisorFilter, setAdvisorFilter] = useState('ALL');
  const [editingEtaPartId, setEditingEtaPartId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Edit Part Modal State
  const [editingPartData, setEditingPartData] = useState<{ part: PartItem; roId: string } | null>(null);
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);

  // Extract all active parts with their parent Repair Order
  const allOrderedParts = useMemo(() => {
    const list: Array<{ part: PartItem; ro: RepairOrder }> = [];
    repairOrders.forEach(ro => {
      // Exclude closed/cancelled ROs unless specifically viewing completed
      if (ro.parts && ro.parts.length > 0) {
        ro.parts.forEach(part => {
          // Exclude quote-only parts that haven't been ordered
          if (part.status !== 'QUOTE_ONLY' && part.requestType !== 'QUOTE_ONLY') {
            list.push({ part, ro });
          }
        });
      }
    });
    return list;
  }, [repairOrders]);

  // Unique vendors for filtering
  const uniqueVendors = useMemo(() => {
    const set = new Set<string>();
    allOrderedParts.forEach(({ part }) => {
      if (part.vendor?.trim()) set.add(part.vendor.trim());
    });
    return Array.from(set).sort();
  }, [allOrderedParts]);

  // Unique technicians for filtering
  const uniqueTechs = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN');
  }, [users]);

  // Filtered parts based on search and tab selections
  const filteredParts = useMemo(() => {
    return allOrderedParts.filter(({ part, ro }) => {
      const etaBadge = formatEtaBadge(part.estimatedArrival);
      
      // Status Tab filter
      if (statusTab === 'TODAY') {
        const isToday = etaBadge.text.toLowerCase().includes('today') || etaBadge.text.toLowerCase().includes('min') || etaBadge.text.toLowerCase().includes('morning') || etaBadge.text.toLowerCase().includes('afternoon');
        if (!isToday || part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH') return false;
      } else if (statusTab === 'OVERDUE') {
        if (!etaBadge.pastDue || part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH') return false;
      } else if (statusTab === 'IN_TRANSIT') {
        if (part.status !== 'IN_TRANSIT') return false;
      } else if (statusTab === 'SPECIAL_ORDER') {
        if (part.status !== 'SPECIAL_ORDER' && part.status !== 'SPECIAL_ORDER_1_5_DAYS') return false;
      } else if (statusTab === 'BACKORDERED') {
        if (part.status !== 'BACKORDERED') return false;
      } else if (statusTab === 'RECEIVED') {
        if (part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH') return false;
      } else if (statusTab === 'ALL') {
        // Default ALL shows active on-order items (or all)
      }

      // Vendor filter
      if (vendorFilter !== 'ALL' && part.vendor?.trim().toLowerCase() !== vendorFilter.toLowerCase()) {
        return false;
      }

      // Tech filter
      if (techFilter !== 'ALL' && ro.techId !== techFilter) {
        return false;
      }

      // Advisor filter
      if (advisorFilter !== 'ALL' && ro.advisorId !== advisorFilter && ro.advisorName !== advisorFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRoId = ro.id.toLowerCase().includes(q);
        const matchesCustomer = ro.customerName.toLowerCase().includes(q);
        const matchesVehicle = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ${ro.vehicle.vin}`.toLowerCase().includes(q);
        const matchesPartNum = part.partNumber.toLowerCase().includes(q);
        const matchesPartDesc = part.description.toLowerCase().includes(q);
        const matchesVendor = (part.vendor || '').toLowerCase().includes(q);
        const matchesTracking = (part.trackingNumber || '').toLowerCase().includes(q);

        if (!matchesRoId && !matchesCustomer && !matchesVehicle && !matchesPartNum && !matchesPartDesc && !matchesVendor && !matchesTracking) {
          return false;
        }
      }

      return true;
    });
  }, [allOrderedParts, statusTab, vendorFilter, techFilter, advisorFilter, searchQuery]);

  // Statistics KPIs
  const stats = useMemo(() => {
    let totalCount = 0;
    let todayCount = 0;
    let overdueCount = 0;
    let specialOrderCount = 0;
    let backorderedCount = 0;
    let totalCost = 0;

    allOrderedParts.forEach(({ part }) => {
      const eta = formatEtaBadge(part.estimatedArrival);
      const isComplete = part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH';

      if (!isComplete) {
        totalCount++;
        if (eta.text.toLowerCase().includes('today') || eta.text.toLowerCase().includes('min') || eta.text.toLowerCase().includes('morning') || eta.text.toLowerCase().includes('afternoon')) todayCount++;
        if (eta.pastDue) overdueCount++;
        if (part.status === 'SPECIAL_ORDER' || part.status === 'SPECIAL_ORDER_1_5_DAYS') specialOrderCount++;
        if (part.status === 'BACKORDERED') backorderedCount++;
      }
      totalCost += (Number(part.cost) || Number(part.price) || 0) * (part.quantity || 1);
    });

    return {
      totalCount,
      todayCount,
      overdueCount,
      specialOrderCount,
      backorderedCount,
      totalCost
    };
  }, [allOrderedParts]);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // Live ETA Update from Report
  const handleEtaChange = (
    roId: string, 
    partId: string, 
    newEta: string, 
    newStatus?: PartStatus
  ) => {
    updatePartItem(roId, partId, {
      estimatedArrival: newEta,
      ...(newStatus ? { status: newStatus } : {})
    });
    setEditingEtaPartId(null);
    triggerToast(`✓ Updated ETA for Part & synced with Repair Order #${roId}`);
  };

  // Live Status Change from Report
  const handleStatusChange = (
    roId: string, 
    partId: string, 
    newStatus: PartStatus
  ) => {
    updatePartStatus(roId, partId, newStatus);
    triggerToast(`✓ Updated Part Status to ${newStatus.replace(/_/g, ' ')} & synced with Repair Order #${roId}`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['RO Number', 'Customer', 'Vehicle', 'VIN', 'Part Number', 'Description', 'Qty', 'Vendor', 'Status', 'Estimated Arrival (ETA)', 'Tracking #', 'Notes'];
    const rows = filteredParts.map(({ part, ro }) => [
      `"${ro.id}"`,
      `"${ro.customerName || ''}"`,
      `"${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}"`,
      `"${ro.vehicle.vin || ''}"`,
      `"${part.partNumber || ''}"`,
      `"${part.description || ''}"`,
      part.quantity || 1,
      `"${part.vendor || ''}"`,
      `"${part.status || ''}"`,
      `"${part.estimatedArrival || ''}"`,
      `"${part.trackingNumber || ''}"`,
      `"${(part.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Parts_On_Order_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('✓ Exported Parts Report to CSV!');
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
      <div 
        id="manager-parts-report-modal"
        className="bg-white w-full max-w-7xl h-[94vh] max-h-[950px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300"
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Parts on Order Master Report
                </h2>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/30 text-blue-300 border border-blue-400/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Service Manager Only</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Track supplier shipments, manage parts ETAs in real-time, and auto-sync updates directly to Repair Orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddPartModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all cursor-pointer"
              title="Add a new part to any open Repair Order"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ Add Part</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Print Manifest / Report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Print Report</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shadow-xs"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackToast && (
          <div className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackToast}</span>
            </div>
            <button 
              onClick={() => setFeedbackToast(null)}
              className="p-0.5 text-emerald-100 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 sm:px-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Parts On Order</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{stats.totalCount}</span>
              <span className="text-xs text-slate-500">items</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Expected Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-900">{stats.todayCount}</span>
              <span className="text-xs text-amber-700">deliveries</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">Overdue / Delayed</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-red-900">{stats.overdueCount}</span>
              <span className="text-xs text-red-700">alerts</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-purple-200 shadow-2xs">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Special Orders</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-purple-900">{stats.specialOrderCount}</span>
              <span className="text-xs text-purple-700">1-5 days</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Parts Value</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">{formatCurrency(stats.totalCost)}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-6 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search part #, description, RO #, customer, VIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-600 shadow-2xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Parts ({allOrderedParts.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                statusTab === 'TODAY'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Today's Runs</span>
              {stats.todayCount > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-black ${statusTab === 'TODAY' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'}`}>
                  {stats.todayCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                statusTab === 'OVERDUE'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span>Overdue</span>
              {stats.overdueCount > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full font-black ${statusTab === 'OVERDUE' ? 'bg-red-800 text-white' : 'bg-red-200 text-red-900'}`}>
                  {stats.overdueCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('SPECIAL_ORDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusTab === 'SPECIAL_ORDER'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              Special Order (1-5d)
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('RECEIVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusTab === 'RECEIVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Received
            </button>
          </div>

          {/* Vendor Filter Dropdown */}
          {uniqueVendors.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="text-xs font-bold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Vendors ({uniqueVendors.length})</option>
                {uniqueVendors.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Master Parts On Order Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {filteredParts.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Parts Matching Filters</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting a different status tab.</p>
              {(searchQuery || statusTab !== 'ALL' || vendorFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusTab('ALL');
                    setVendorFilter('ALL');
                  }}
                  className="mt-3 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-700 uppercase font-black tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200 shadow-2xs backdrop-blur-xs">
                <tr>
                  <th className="py-3 px-4">Repair Order / Customer</th>
                  <th className="py-3 px-4">Part Details</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4 min-w-[200px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Estimated Arrival (ETA)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 min-w-[160px]">Status</th>
                  <th className="py-3 px-4">Cost / Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredParts.map(({ part, ro }) => {
                  const etaBadge = formatEtaBadge(part.estimatedArrival);
                  const isEditingThisEta = editingEtaPartId === part.id;
                  const isReceived = part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH';

                  return (
                    <tr 
                      key={`${ro.id}-${part.id}`}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      {/* RO & Customer Context */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenRO(ro)}
                            className="font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-mono text-sm cursor-pointer"
                            title="Open full repair order details"
                          >
                            <span>#{ro.id}</span>
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                          </button>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {ro.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 mt-1">
                          {ro.customerName}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                        </div>
                        {ro.techName && (
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                            <span>Tech:</span>
                            <strong className="text-slate-700 font-semibold">{ro.techName}</strong>
                          </div>
                        )}
                      </td>

                      {/* Part Information */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {part.partNumber || 'NO-PART-#'}
                        </div>
                        <div className="font-semibold text-slate-800 text-xs mt-0.5 leading-snug">
                          {part.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span>Qty: <strong className="text-slate-800 font-bold">{part.quantity || 1}</strong></span>
                          {part.roLineNumber && (
                            <span>• Line #{part.roLineNumber}</span>
                          )}
                          {part.trackingNumber && (
                            <span>• Track: <strong className="text-slate-700 font-mono">{part.trackingNumber}</strong></span>
                          )}
                        </div>
                        {part.notes && (
                          <div className="mt-1 text-[10px] text-slate-600 bg-amber-50/80 p-1 rounded border border-amber-200">
                            <span className="font-bold">Note:</span> {part.notes}
                          </div>
                        )}
                      </td>

                      {/* Vendor / Supplier */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          <span>{part.vendor || 'Shop Supplier'}</span>
                        </span>
                      </td>

                      {/* Estimated Arrival (ETA) with Interactive Live Editor */}
                      <td className="py-3 px-4 align-top">
                        {isEditingThisEta ? (
                          <div className="bg-blue-50 p-2.5 rounded-xl border-2 border-blue-400 shadow-sm space-y-2 animate-in fade-in duration-100">
                            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                              <span>Select New Delivery ETA:</span>
                              <button
                                type="button"
                                onClick={() => setEditingEtaPartId(null)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <ArrivalTimeFrameDropdown
                              value={part.estimatedArrival || part.status}
                              onChange={({ estimatedArrival, status }) => {
                                handleEtaChange(ro.id, part.id, estimatedArrival, status);
                              }}
                              size="sm"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${
                              isReceived
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : etaBadge.pastDue
                                ? 'bg-red-100 text-red-900 border-red-300 animate-pulse'
                                : (etaBadge.text.toLowerCase().includes('today') || etaBadge.text.toLowerCase().includes('min') || etaBadge.text.toLowerCase().includes('morning') || etaBadge.text.toLowerCase().includes('afternoon'))
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>{etaBadge.text}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => setEditingEtaPartId(part.id)}
                              className="p-1 rounded bg-white hover:bg-blue-100 text-slate-500 hover:text-blue-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                              title="Click to change and update ETA on this repair order"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4 align-top">
                        <select
                          value={part.status}
                          onChange={(e) => handleStatusChange(ro.id, part.id, e.target.value as PartStatus)}
                          className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                              : part.status === 'IN_TRANSIT'
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : part.status === 'BACKORDERED'
                              ? 'bg-red-50 text-red-900 border-red-300'
                              : 'bg-white text-slate-800 border-slate-300'
                          }`}
                        >
                          <option value="ORDERED">Ordered</option>
                          <option value="DAILY_ORDER">Daily Stock Order</option>
                          <option value="LOCAL_PURCHASE">Local Hot Shot</option>
                          <option value="SPECIAL_ORDER_1_5_DAYS">Special Order (1-5 Days)</option>
                          <option value="SPECIAL_ORDER">Special Order</option>
                          <option value="VOR_UPGRADE">VOR Emergency</option>
                          <option value="IN_TRANSIT">In Transit / Courier</option>
                          <option value="BACKORDERED">Backordered</option>
                          <option value="RECEIVED">Received in Shop</option>
                          <option value="ISSUED_TO_TECH">Delivered to Tech</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4 align-top whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-900 text-xs">
                          {formatCurrency((Number(part.cost) || Number(part.price) || 0) * (part.quantity || 1))}
                        </div>
                        {part.cost && part.price && (
                          <div className="text-[10px] text-slate-500">
                            Cost: {formatCurrency(part.cost)}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPartData({ part, roId: ro.id })}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                            title="Edit all part details (Part #, Description, Qty, Cost, Sell Price, ETA, Status, Notes)"
                          >
                            <Edit3 className="w-3 h-3 text-blue-600" />
                            <span>Edit Part</span>
                          </button>

                          {!isReceived && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ro.id, part.id, 'RECEIVED')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title="Mark this part received in shop"
                            >
                              <Check className="w-3 h-3" />
                              <span>Mark Received</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRO(ro)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                            title="Open RO Details Modal"
                          >
                            Open RO
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold">Showing {filteredParts.length} of {allOrderedParts.length} ordered parts</span>
            <span className="text-slate-300">•</span>
            <span>All Part & ETA updates auto-sync live with database & repair orders</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>

      {/* Edit Part Modal */}
      {editingPartData && (
        <EditPartModal
          isOpen={true}
          onClose={() => setEditingPartData(null)}
          part={editingPartData.part}
          roId={editingPartData.roId}
          onSuccess={(msg) => triggerToast(msg)}
        />
      )}

      {/* Add New Part to Any RO Modal */}
      {isAddPartModalOpen && (
        <EditPartModal
          isOpen={true}
          onClose={() => setIsAddPartModalOpen(false)}
          onSuccess={(msg) => triggerToast(msg)}
        />
      )}
    </div>
  );
};

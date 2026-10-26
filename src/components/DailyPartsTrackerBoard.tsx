import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  Search, 
  Filter, 
  ExternalLink, 
  Edit3, 
  Check, 
  Calendar, 
  MapPin, 
  Building2, 
  Tag, 
  RefreshCw,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, PartItem, PartStatus } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface DailyPartsTrackerBoardProps {
  onOpenRO: (ro: RepairOrder) => void;
}

export const DailyPartsTrackerBoard: React.FC<DailyPartsTrackerBoardProps> = ({ onOpenRO }) => {
  const { repairOrders, updatePartStatus, updatePartItem, setSelectedRO } = useApp();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEEDS_ORDER' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED' | 'BACKORDERED'>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingPartKey, setEditingPartKey] = useState<string | null>(null);
  const [inlineEta, setInlineEta] = useState<string>('');
  const [inlineTracking, setInlineTracking] = useState<string>('');
  const [inlineNotes, setInlineNotes] = useState<string>('');

  // Collect all parts across non-archived, non-closed repair orders
  const allJobParts = useMemo(() => {
    const list: Array<{
      ro: RepairOrder;
      part: PartItem;
      uniqueKey: string;
    }> = [];

    repairOrders.forEach(ro => {
      if (ro.status === 'CLOSED' || ro.isArchived) return;
      (ro.parts || []).forEach(part => {
        if (part.status === 'DECLINED' || part.status === 'CANCELLED') return;
        list.push({
          ro,
          part,
          uniqueKey: `${ro.id}_${part.id}`,
        });
      });
    });

    return list;
  }, [repairOrders]);

  // Unique vendors
  const vendors = useMemo(() => {
    const set = new Set<string>();
    allJobParts.forEach(item => {
      if (item.part.vendor) set.add(item.part.vendor.toUpperCase());
    });
    return Array.from(set).sort();
  }, [allJobParts]);

  // Filtered parts
  const filteredParts = useMemo(() => {
    return allJobParts.filter(item => {
      const { ro, part } = item;

      // Status Filter
      if (statusFilter === 'NEEDS_ORDER') {
        if (part.status !== 'REQUESTED' && part.status !== 'QUOTE_ONLY') return false;
      } else if (statusFilter === 'ORDERED') {
        if (!['ORDERED', 'DAILY_ORDER', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE'].includes(part.status)) return false;
      } else if (statusFilter === 'IN_TRANSIT') {
        if (part.status !== 'IN_TRANSIT') return false;
      } else if (statusFilter === 'RECEIVED') {
        if (part.status !== 'RECEIVED' && part.status !== 'IN_STOCK' && part.status !== 'ISSUED_TO_TECH') return false;
      } else if (statusFilter === 'BACKORDERED') {
        if (part.status !== 'BACKORDERED') return false;
      }

      // Vendor Filter
      if (vendorFilter !== 'ALL') {
        if ((part.vendor || '').toUpperCase() !== vendorFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRO = ro.id.toLowerCase().includes(q);
        const matchCustomer = ro.customerName.toLowerCase().includes(q);
        const matchPhone = (ro.customerPhone || '').toLowerCase().includes(q);
        const matchPartNum = (part.partNumber || '').toLowerCase().includes(q);
        const matchDesc = (part.description || part.name || '').toLowerCase().includes(q);
        const matchVendor = (part.vendor || '').toLowerCase().includes(q);
        const matchTracking = (part.trackingNumber || '').toLowerCase().includes(q);
        if (!matchRO && !matchCustomer && !matchPhone && !matchPartNum && !matchDesc && !matchVendor && !matchTracking) {
          return false;
        }
      }

      return true;
    });
  }, [allJobParts, statusFilter, vendorFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    let needsOrder = 0;
    let ordered = 0;
    let inTransit = 0;
    let received = 0;
    let backordered = 0;

    allJobParts.forEach(item => {
      const s = item.part.status;
      if (s === 'REQUESTED' || s === 'QUOTE_ONLY') needsOrder++;
      else if (['ORDERED', 'DAILY_ORDER', 'SPECIAL_ORDER', 'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE'].includes(s)) ordered++;
      else if (s === 'IN_TRANSIT') inTransit++;
      else if (s === 'RECEIVED' || s === 'IN_STOCK' || s === 'ISSUED_TO_TECH') received++;
      else if (s === 'BACKORDERED') backordered++;
    });

    return {
      all: allJobParts.length,
      needsOrder,
      ordered,
      inTransit,
      received,
      backordered,
    };
  }, [allJobParts]);

  const handleQuickStatus = (roId: string, partId: string, newStatus: PartStatus) => {
    let defaultEta = undefined;
    if (newStatus === 'RECEIVED' || newStatus === 'IN_STOCK') {
      defaultEta = 'Arrived & Staged';
    } else if (newStatus === 'ORDERED') {
      defaultEta = 'Expected in 1-3 Days';
    } else if (newStatus === 'IN_TRANSIT') {
      defaultEta = 'In Transit';
    } else if (newStatus === 'BACKORDERED') {
      defaultEta = 'Supplier Backordered';
    }
    updatePartStatus(roId, partId, newStatus, defaultEta);
  };

  const handleMarkReceived = (roId: string, partId: string) => {
    updatePartStatus(roId, partId, 'RECEIVED', 'Arrived & Staged in Bay');
  };

  const handleStartInline = (key: string, part: PartItem) => {
    setEditingPartKey(key);
    setInlineEta(part.estimatedArrival || '');
    setInlineTracking(part.trackingNumber || '');
    setInlineNotes(part.notes || '');
  };

  const handleSaveInline = (roId: string, partId: string) => {
    updatePartItem(roId, partId, {
      estimatedArrival: inlineEta.trim() || undefined,
      trackingNumber: inlineTracking.trim() || undefined,
      notes: inlineNotes.trim() || undefined,
    });
    setEditingPartKey(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Truck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">
              Daily Parts Pipeline & Status Tracker
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Track, update, and receive all quoted parts across every active customer repair order day-by-day.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-300 font-bold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            {allJobParts.length} Total Parts in System
          </span>
        </div>
      </div>

      {/* Metric Pipeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'ALL' 
              ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-400/20' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">All Parts</span>
          <span className="text-2xl font-black font-mono text-slate-900">{counts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('NEEDS_ORDER')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'NEEDS_ORDER' 
              ? 'bg-amber-50 border-amber-600 shadow-md ring-2 ring-amber-400/20' 
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[10px] text-amber-700 uppercase tracking-wider block font-bold">1. Needs Order</span>
          <span className="text-2xl font-black font-mono text-amber-900">{counts.needsOrder}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('ORDERED')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'ORDERED' 
              ? 'bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-400/20' 
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <span className="text-[10px] text-blue-700 uppercase tracking-wider block font-bold">2. Ordered</span>
          <span className="text-2xl font-black font-mono text-blue-900">{counts.ordered}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('IN_TRANSIT')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'IN_TRANSIT' 
              ? 'bg-purple-50 border-purple-600 shadow-md ring-2 ring-purple-400/20' 
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[10px] text-purple-700 uppercase tracking-wider block font-bold">3. In Transit</span>
          <span className="text-2xl font-black font-mono text-purple-900">{counts.inTransit}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('RECEIVED')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'RECEIVED' 
              ? 'bg-emerald-50 border-emerald-600 shadow-md ring-2 ring-emerald-400/20' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-bold">4. Received & Staged</span>
          <span className="text-2xl font-black font-mono text-emerald-900">{counts.received}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('BACKORDERED')}
          className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
            statusFilter === 'BACKORDERED' 
              ? 'bg-rose-50 border-rose-600 shadow-md ring-2 ring-rose-400/20' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[10px] text-rose-700 uppercase tracking-wider block font-bold">5. Backordered</span>
          <span className="text-2xl font-black font-mono text-rose-900">{counts.backordered}</span>
        </button>
      </div>

      {/* Search and Vendor Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Customer, RO #, Part Number, Description, or Tracking #..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-600 shrink-0 uppercase">Vendor:</label>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Vendors</option>
            {vendors.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Parts Table */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        {filteredParts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Parts Matching Filter</h4>
            <p className="text-xs">Try selecting a different status or clearing your search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3.5">RO # & Customer</th>
                  <th className="py-3 px-3">Part Details</th>
                  <th className="py-3 px-2 text-center">Qty</th>
                  <th className="py-3 px-2.5 text-right">Price</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Tracking & Daily ETA</th>
                  <th className="py-3 px-3">Part Status (Click to Change)</th>
                  <th className="py-3 px-3 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredParts.map(({ ro, part, uniqueKey }) => {
                  const isReceived = part.status === 'RECEIVED' || part.status === 'IN_STOCK' || part.status === 'ISSUED_TO_TECH';
                  const isInline = editingPartKey === uniqueKey;
                  const price = Number(part.price) || 0;

                  return (
                    <tr key={uniqueKey} className={`hover:bg-slate-50/80 transition-colors ${isReceived ? 'bg-emerald-50/20' : ''}`}>
                      {/* RO # & Customer */}
                      <td className="py-3 px-3.5">
                        <button
                          type="button"
                          onClick={() => onOpenRO(ro)}
                          className="font-mono font-black text-blue-700 hover:text-blue-900 text-xs inline-flex items-center gap-1 cursor-pointer hover:underline"
                          title="Open Quote / RO Details"
                        >
                          <span>RO #{ro.id}</span>
                          <ExternalLink className="w-3 h-3 text-blue-500" />
                        </button>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {ro.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                        </div>
                      </td>

                      {/* Part Details */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-black text-slate-900 text-xs">
                          {part.partNumber || 'OEM-PART'}
                        </div>
                        <div className="text-slate-700 font-medium text-xs">
                          {part.description || part.name}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="py-3 px-2 text-center font-bold text-slate-800">
                        {part.quantity || 1}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-2.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(price)}
                      </td>

                      {/* Supplier */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{part.vendor || 'STELLANTIS'}</span>
                        </span>
                      </td>

                      {/* Tracking & Daily ETA */}
                      <td className="py-3 px-3">
                        {isInline ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={inlineEta}
                              onChange={(e) => setInlineEta(e.target.value)}
                              placeholder="ETA: e.g. Today 2pm / Oct 25"
                              className="w-full text-xs p-1 bg-white border border-slate-300 rounded"
                            />
                            <input
                              type="text"
                              value={inlineTracking}
                              onChange={(e) => setInlineTracking(e.target.value)}
                              placeholder="Tracking # / PO #"
                              className="w-full text-xs p-1 bg-white border border-slate-300 rounded font-mono"
                            />
                            <input
                              type="text"
                              value={inlineNotes}
                              onChange={(e) => setInlineNotes(e.target.value)}
                              placeholder="Shelf / Bin #"
                              className="w-full text-xs p-1 bg-white border border-slate-300 rounded"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInline(ro.id, part.id)}
                              className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{part.estimatedArrival || 'ETA Pending'}</span>
                            </div>
                            {part.trackingNumber && (
                              <div className="text-[11px] font-mono text-blue-700 font-bold flex items-center gap-1">
                                <Truck className="w-3 h-3 text-blue-500" />
                                <span>#{part.trackingNumber}</span>
                              </div>
                            )}
                            {part.notes && (
                              <div className="text-[11px] text-slate-500 italic flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>{part.notes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-3">
                        <select
                          value={part.status}
                          onChange={(e) => handleQuickStatus(ro.id, part.id, e.target.value as PartStatus)}
                          className={`w-full text-xs font-bold py-1 px-2 rounded-lg border shadow-2xs cursor-pointer ${
                            part.status === 'RECEIVED' || part.status === 'IN_STOCK'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : part.status === 'IN_TRANSIT'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : part.status === 'BACKORDERED'
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : part.status === 'REQUESTED' || part.status === 'QUOTE_ONLY'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-blue-50 text-blue-900 border-blue-300'
                          }`}
                        >
                          <option value="REQUESTED">🟧 Needs Order</option>
                          <option value="QUOTE_ONLY">📋 Quote Only</option>
                          <option value="ORDERED">🟦 Ordered</option>
                          <option value="SPECIAL_ORDER_1_5_DAYS">🚚 Special Order (1-5 Days)</option>
                          <option value="IN_TRANSIT">🟪 In Transit</option>
                          <option value="RECEIVED">🟩 Received & Staged</option>
                          <option value="IN_STOCK">📦 In Stock</option>
                          <option value="BACKORDERED">🟥 Backordered</option>
                        </select>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {!isReceived ? (
                            <button
                              type="button"
                              onClick={() => handleMarkReceived(ro.id, part.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              title="Mark this part as received & staged"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Received</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                              ✓ Staged
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartInline(uniqueKey, part)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                            title="Edit ETA, tracking, and shelf notes"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenRO(ro)}
                            className="p-1 hover:bg-blue-100 text-blue-700 rounded cursor-pointer"
                            title="Open full Quote / RO"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
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
};

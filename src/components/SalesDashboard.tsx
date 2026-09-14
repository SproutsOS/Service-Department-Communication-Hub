import React, { useState } from 'react';
import { 
  Eye, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Package, 
  UserCheck, 
  Calendar, 
  Lock,
  ChevronRight,
  Shield,
  Phone,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, ROStatus } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

export const SalesDashboard: React.FC = () => {
  const { 
    repairOrders, 
    setSelectedRO, 
    currentUser,
    shopName
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'REPAIR' | 'PARTS' | 'DIAG' | 'COMPLETED'>('ALL');
  const [sortOrder, setSortOrder] = useState<'PROMISED_ASC' | 'NEWEST' | 'CUSTOMER'>('PROMISED_ASC');

  // Categorized counts for the sales team
  const readyForPickup = repairOrders.filter(ro => normalizeROStatus(ro.status) === 'READY_FOR_PICKUP');
  const inRepair = repairOrders.filter(ro => 
    normalizeROStatus(ro.status) === 'REPAIR_IN_PROGRESS' || 
    normalizeROStatus(ro.status) === 'REPAIR_COMPLETE' ||
    ro.status === 'IN_BAY' ||
    ro.status === 'IN_REPAIR'
  );
  const waitingParts = repairOrders.filter(ro => 
    normalizeROStatus(ro.status) === 'PARTS_ORDERED' || 
    normalizeROStatus(ro.status) === 'PARTS_IN_TO_TECH' ||
    ro.status === 'WAITING_PARTS'
  );
  const inDiagOrWait = repairOrders.filter(ro => 
    normalizeROStatus(ro.status) === 'WAITING_DIAGNOSTICS' || 
    normalizeROStatus(ro.status) === 'IN_DIAG' ||
    normalizeROStatus(ro.status) === 'ESTIMATE_DONE' ||
    normalizeROStatus(ro.status) === 'WAITING_FOR_APPROVAL'
  );
  const completedHistory = repairOrders.filter(ro => 
    ro.status === 'CLOSED' || 
    ro.status === 'COMPLETED'
  );

  // Active units
  const activeOrders = repairOrders.filter(ro => ro.status !== 'CLOSED' && ro.status !== 'COMPLETED');

  // Filter logic
  const filteredROs = repairOrders.filter(ro => {
    const norm = normalizeROStatus(ro.status);

    // Tab filter
    if (statusFilter === 'READY' && norm !== 'READY_FOR_PICKUP') return false;
    if (statusFilter === 'REPAIR' && !(norm === 'REPAIR_IN_PROGRESS' || norm === 'REPAIR_COMPLETE' || ro.status === 'IN_BAY' || ro.status === 'IN_REPAIR')) return false;
    if (statusFilter === 'PARTS' && !(norm === 'PARTS_ORDERED' || norm === 'PARTS_IN_TO_TECH' || ro.status === 'WAITING_PARTS')) return false;
    if (statusFilter === 'DIAG' && !(norm === 'WAITING_DIAGNOSTICS' || norm === 'IN_DIAG' || norm === 'ESTIMATE_DONE' || norm === 'WAITING_FOR_APPROVAL')) return false;
    if (statusFilter === 'COMPLETED' && !(ro.status === 'CLOSED' || ro.status === 'COMPLETED')) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRO = ro.id.toLowerCase().includes(q);
      const matchCust = ro.customerName.toLowerCase().includes(q);
      const matchPhone = ro.customerPhone?.toLowerCase().includes(q);
      const matchVeh = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`.toLowerCase().includes(q);
      const matchVin = ro.vehicle.vin?.toLowerCase().includes(q);
      const matchTech = ro.techName?.toLowerCase().includes(q);
      const matchAdvisor = ro.advisorName?.toLowerCase().includes(q);
      return matchRO || matchCust || matchPhone || matchVeh || matchVin || matchTech || matchAdvisor;
    }

    return true;
  });

  // Sorting
  const sortedROs = [...filteredROs].sort((a, b) => {
    if (sortOrder === 'PROMISED_ASC') {
      return new Date(a.promisedTime).getTime() - new Date(b.promisedTime).getTime();
    }
    if (sortOrder === 'NEWEST') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'CUSTOMER') {
      return a.customerName.localeCompare(b.customerName);
    }
    return 0;
  });

  // Helper for delivery status badge
  const getDeliveryStatus = (ro: RepairOrder) => {
    const isPastPromised = new Date(ro.promisedTime).getTime() < Date.now();
    const isReady = normalizeROStatus(ro.status) === 'READY_FOR_PICKUP';
    const isCompleted = ro.status === 'CLOSED' || ro.status === 'COMPLETED';

    if (isCompleted) {
      return {
        label: 'Delivered / Closed',
        badge: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: CheckCircle2,
      };
    }
    if (isReady) {
      return {
        label: 'READY FOR CUSTOMER PICKUP',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse',
        icon: Sparkles,
      };
    }
    if (isPastPromised) {
      return {
        label: 'Past Promised Time',
        badge: 'bg-red-100 text-red-800 border-red-300',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'On Schedule',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Clock,
    };
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      
      {/* Top Banner: Sales Department Portal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Eye className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Sales Department Portal
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-Only Delivery Monitor
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Track customer vehicle progress, pre-delivery inspections (PDI), parts arrival ETAs, and promised delivery times in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Signed In As
              </span>
              <span className="text-xs font-bold text-white block mt-0.5">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-teal-300 font-medium block">
                {currentUser.title || 'Sales Consultant'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center ring-2 ring-teal-400/50 shrink-0">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SC'}
            </div>
          </div>
        </div>

        {/* Read-Only Notice Bar */}
        <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              <strong>Read-Only Integrity:</strong> Sales staff can review all vehicle repair data and promised times without modifying bay technician or advisor workflows.
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {shopName || 'Dealership Service'} Real-Time Sync
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Ready for Delivery (The primary sales metric) */}
        <div 
          onClick={() => setStatusFilter('READY')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'READY'
              ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300'
              : 'bg-white hover:bg-emerald-50/50 border-emerald-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'READY' ? 'text-emerald-100' : 'text-emerald-700'
            }`}>
              Ready for Pickup
            </span>
            <div className={`p-1.5 rounded-lg ${
              statusFilter === 'READY' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            {readyForPickup.length}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${
            statusFilter === 'READY' ? 'text-emerald-100' : 'text-slate-500'
          }`}>
            Finished & ready for client
          </div>
        </div>

        {/* In Active Repair */}
        <div 
          onClick={() => setStatusFilter('REPAIR')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'REPAIR'
              ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300'
              : 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'REPAIR' ? 'text-blue-100' : 'text-blue-600'
            }`}>
              In Bay Repair
            </span>
            <div className={`p-1.5 rounded-lg ${
              statusFilter === 'REPAIR' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            {inRepair.length}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${
            statusFilter === 'REPAIR' ? 'text-blue-100' : 'text-slate-500'
          }`}>
            Actively being serviced
          </div>
        </div>

        {/* Waiting on Parts */}
        <div 
          onClick={() => setStatusFilter('PARTS')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'PARTS'
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
              : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'PARTS' ? 'text-amber-100' : 'text-amber-700'
            }`}>
              Waiting on Parts
            </span>
            <div className={`p-1.5 rounded-lg ${
              statusFilter === 'PARTS' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            {waitingParts.length}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${
            statusFilter === 'PARTS' ? 'text-amber-100' : 'text-slate-500'
          }`}>
            Tracking supplier ETAs
          </div>
        </div>

        {/* In Diagnostics */}
        <div 
          onClick={() => setStatusFilter('DIAG')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
            statusFilter === 'DIAG'
              ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-300'
              : 'bg-white hover:bg-purple-50/50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'DIAG' ? 'text-purple-100' : 'text-purple-700'
            }`}>
              In Diagnostics
            </span>
            <div className={`p-1.5 rounded-lg ${
              statusFilter === 'DIAG' ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">
            {inDiagOrWait.length}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${
            statusFilter === 'DIAG' ? 'text-purple-100' : 'text-slate-500'
          }`}>
            Initial scan & inspection
          </div>
        </div>

      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Name, VIN, Vehicle, Stock/RO #, or Advisor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" /> Sort:
            </span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="PROMISED_ASC">Promised Delivery Time (Earliest First)</option>
              <option value="NEWEST">Date Created (Newest First)</option>
              <option value="CUSTOMER">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Active Vehicles ({activeOrders.length})
          </button>

          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Ready for Pickup ({readyForPickup.length})
          </button>

          <button
            onClick={() => setStatusFilter('REPAIR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'REPAIR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <Wrench className="w-3 h-3" />
            In Bay Repair ({inRepair.length})
          </button>

          <button
            onClick={() => setStatusFilter('PARTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'PARTS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Package className="w-3 h-3" />
            Waiting on Parts ({waitingParts.length})
          </button>

          <button
            onClick={() => setStatusFilter('DIAG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'DIAG'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Clock className="w-3 h-3" />
            In Diagnostics ({inDiagOrWait.length})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Completed Archive ({completedHistory.length})
          </button>
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      {sortedROs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-2xs">
          <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Vehicles Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? `No vehicles matched your search query "${searchQuery}".` : 'No repair orders found in this filter category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedROs.map((ro) => {
            const statusConfig = STATUS_CONFIG[ro.status] || {
              label: ro.status.replace(/_/g, ' '),
              badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
              borderClass: 'border-slate-300',
            };
            const delivery = getDeliveryStatus(ro);
            const DeliveryIcon = delivery.icon;

            return (
              <div
                key={ro.id}
                id={`sales-card-${ro.id}`}
                onClick={() => setSelectedRO(ro)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
              >
                <div>
                  {/* Top line: RO #, Delivery Badge, Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-base text-blue-600 group-hover:text-teal-600 transition-colors">
                        #{ro.id}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 mt-0.5 leading-snug">
                        {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${statusConfig.badgeClass}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* VIN pill */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      VIN: {ro.vehicle.vin}
                    </span>
                  </div>

                  {/* Customer line */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="font-bold text-slate-800">
                      {ro.customerName}
                    </div>
                    {ro.customerPhone && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{ro.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Concern */}
                  <div className="mt-2 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    <span className="font-bold text-slate-700">Concern: </span>
                    {ro.primaryConcern}
                  </div>

                  {/* Parts Summary if present */}
                  {ro.parts && ro.parts.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded border border-amber-200 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium truncate">
                        Parts ({ro.parts.length}): {ro.parts.map(p => p.status.replace(/_/g, ' ')).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Footer: Delivery Countdown, Staff, and Read-Only Action */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  {/* Delivery Status */}
                  <div className={`p-2 rounded-lg border flex items-center justify-between text-xs ${delivery.badge}`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      <DeliveryIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{delivery.label}</span>
                    </div>
                    <div className="font-medium text-[11px]">
                      Promised: {formatDateTime(ro.promisedTime)}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span>Adv: <strong className="text-slate-700">{ro.advisorName}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Tech: <strong className="text-slate-700">{ro.techName || 'Pending'}</strong></span>
                    </div>
                  </div>

                  {/* Click trigger button */}
                  <button
                    type="button"
                    className="w-full py-2 bg-slate-50 group-hover:bg-teal-50 group-hover:text-teal-800 group-hover:border-teal-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>View Vehicle Details & History</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

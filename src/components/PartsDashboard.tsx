import React, { useState } from 'react';
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Search, 
  Plus, 
  AlertTriangle, 
  Wrench,
  Send,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PartItem, PartStatus } from '../types';
import { formatEtaBadge, formatDateTime } from '../utils/formatters';

export const PartsDashboard: React.FC = () => {
  const { repairOrders, updatePartStatus, setSelectedRO } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PartStatus | 'ALL'>('ALL');

  // Flatten all parts with RO metadata
  const allParts = repairOrders.flatMap(ro => 
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

  // Metrics
  const requestedCount = allParts.filter(p => p.status === 'REQUESTED').length;
  const orderedCount = allParts.filter(p => p.status === 'ORDERED').length;
  const inTransitCount = allParts.filter(p => p.status === 'IN_TRANSIT').length;
  const receivedCount = allParts.filter(p => p.status === 'RECEIVED').length;
  const issuedCount = allParts.filter(p => p.status === 'ISSUED_TO_TECH').length;

  // Filter parts
  const filteredParts = allParts.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

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

  const handleQuickReceive = (roId: string, partId: string) => {
    updatePartStatus(roId, partId, 'RECEIVED', undefined, 'Marked received by parts department. Ready for tech.');
  };

  const handleIssueToTech = (roId: string, partId: string) => {
    updatePartStatus(roId, partId, 'ISSUED_TO_TECH', undefined, 'Handed to technician.');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Parts Department Tracking & Logistics
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              Live Parts Tracker
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Tech Requests</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{requestedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Ordered / In Processing</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{orderedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm bg-orange-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-orange-800">In-Transit / Courier</span>
            <Truck className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">{inTransitCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase text-slate-400">Received at Counter</div>
          <div className="text-2xl font-black text-green-600 mt-1">{receivedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-bold uppercase text-slate-400">Issued to Tech</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{issuedCount}</div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by part number, part name, RO #, supplier, or technician..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as PartStatus | 'ALL')}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-700"
            >
              <option value="ALL">All Part Statuses ({allParts.length})</option>
              <option value="REQUESTED">Requested by Tech</option>
              <option value="ORDERED">Ordered from Vendor</option>
              <option value="IN_TRANSIT">In Transit (With Courier)</option>
              <option value="RECEIVED">Received at Counter</option>
              <option value="ISSUED_TO_TECH">Issued to Tech</option>
            </select>
          </div>

        </div>
      </div>

      {/* Parts Table & Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">
            Tracked Parts Roster ({filteredParts.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Real-time delivery countdowns displayed directly on the dashboard
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
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
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
                      {part.trackingNumber && (
                        <span>Tracking: <strong className="font-mono text-slate-700">{part.trackingNumber}</strong></span>
                      )}
                      <span>•</span>
                      <span>For: <strong className="text-slate-700">{part.vehicleStr}</strong></span>
                      <span>•</span>
                      <span>Customer: <strong className="text-slate-700">{part.customerName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => targetRO && setSelectedRO(targetRO)}>
                        #{part.roId}
                      </span>
                      <span>• Assigned Tech: <strong className="text-slate-800">{part.techName || 'Unassigned'}</strong> ({part.bay || 'No Bay'})</span>
                      <span>• Advisor: <strong className="text-slate-800">{part.advisorName}</strong></span>
                    </div>
                  </div>

                  {/* Middle / Right: ETA Badge, Status Pill, Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* ETA Countdown Badge */}
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</div>
                      {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' ? (
                        <div className={`mt-0.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full inline-block ${
                          etaBadge.pastDue 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          {etaBadge.text}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-green-700">In Bay / Complete</div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : part.status === 'IN_TRANSIT'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {part.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* One-Click Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {part.status !== 'RECEIVED' && part.status !== 'ISSUED_TO_TECH' && (
                        <button
                          onClick={() => handleQuickReceive(part.roId, part.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Mark Received & Notify Tech
                        </button>
                      )}

                      {part.status === 'RECEIVED' && (
                        <button
                          onClick={() => handleIssueToTech(part.roId, part.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
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

    </div>
  );
};

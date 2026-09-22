import React, { useState } from 'react';
import { 
  PhoneCall, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  ChevronRight, 
  User, 
  Package, 
  Search, 
  Filter,
  PhoneForwarded,
  ShieldCheck,
  Check
} from 'lucide-react';
import { RepairOrder } from '../types';
import { useApp } from '../context/AppContext';
import { getContactCadenceStatus, isEligibleForCadence, formatContactOutcome } from '../utils/cadenceUtils';
import { STATUS_CONFIG } from '../data/mockData';
import { formatEtaBadge } from '../utils/formatters';

interface CustomerCallSheetWidgetProps {
  onSelectRO: (ro: RepairOrder) => void;
  onOpenFollowUpModal: (ro: RepairOrder) => void;
  filterAdvisorId?: string;
  isManagerView?: boolean;
}

export const CustomerCallSheetWidget: React.FC<CustomerCallSheetWidgetProps> = ({
  onSelectRO,
  onOpenFollowUpModal,
  filterAdvisorId,
  isManagerView = false,
}) => {
  const { repairOrders, users, currentUser } = useApp();
  const [activeFilter, setActiveFilter] = useState<'ALL_DUE' | 'OVERDUE' | 'DUE_TODAY' | 'WAITING_PARTS' | 'UP_TO_DATE'>('ALL_DUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string>(filterAdvisorId || 'ALL');

  // Filter repair orders
  const activeROs = repairOrders.filter(ro => isEligibleForCadence(ro));

  const roWithCadence = activeROs.map(ro => ({
    ro,
    cadence: getContactCadenceStatus(ro),
  }));

  // Counts
  const overdueCount = roWithCadence.filter(item => item.cadence.isOverdue).length;
  const dueTodayCount = roWithCadence.filter(item => item.cadence.isDueToday).length;
  const waitingPartsCount = roWithCadence.filter(item => 
    item.ro.parts.some(p => p.status === 'ORDERED' || p.status === 'BACKORDERED')
  ).length;
  const upToDateCount = roWithCadence.filter(item => !item.cadence.needsCall).length;

  // Filtered items
  const filteredItems = roWithCadence.filter(item => {
    // Advisor filter
    if (selectedAdvisorFilter !== 'ALL' && item.ro.advisorId !== selectedAdvisorFilter) {
      return false;
    }

    // Category filter
    if (activeFilter === 'ALL_DUE' && !item.cadence.needsCall) return false;
    if (activeFilter === 'OVERDUE' && !item.cadence.isOverdue) return false;
    if (activeFilter === 'DUE_TODAY' && !item.cadence.isDueToday) return false;
    if (activeFilter === 'WAITING_PARTS') {
      const hasWaitingParts = item.ro.parts.some(p => p.status === 'ORDERED' || p.status === 'BACKORDERED');
      if (!hasWaitingParts) return false;
    }
    if (activeFilter === 'UP_TO_DATE' && item.cadence.needsCall) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.ro.customerName.toLowerCase().includes(q);
      const matchRo = item.ro.id.toLowerCase().includes(q);
      const matchVehicle = `${item.ro.vehicle.year} ${item.ro.vehicle.make} ${item.ro.vehicle.model}`.toLowerCase().includes(q);
      const matchPhone = item.ro.customerPhone.includes(q);
      const matchPart = item.ro.parts.some(p => p.description.toLowerCase().includes(q));
      return matchName || matchRo || matchVehicle || matchPhone || matchPart;
    }

    return true;
  });

  // Sort: Overdue first, then due today, then rest
  filteredItems.sort((a, b) => {
    if (a.cadence.isOverdue && !b.cadence.isOverdue) return -1;
    if (!a.cadence.isOverdue && b.cadence.isOverdue) return 1;
    if (a.cadence.isDueToday && !b.cadence.isDueToday) return -1;
    if (!a.cadence.isDueToday && b.cadence.isDueToday) return 1;
    return b.cadence.daysSinceLastContact - a.cadence.daysSinceLastContact;
  });

  const advisors = users.filter(u => u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER');

  return (
    <div id="customer-call-sheet-widget" className="bg-white rounded-xl border-2 border-slate-600 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Customer Communications
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Twice-Weekly Call Tracker
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black mt-0.5 text-white tracking-tight flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <span>Daily Customer Call Sheet</span>
          </h2>
          <p className="text-xs text-slate-300">
            Keep customers with vehicles in shop or waiting on parts informed every 3 to 4 days.
          </p>
        </div>

        {/* Quick Summary Pill Counters */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-red-500/20 border-2 border-red-400/60 rounded-lg text-center">
            <span className="block text-sm font-black text-red-300">{overdueCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-200">Overdue</span>
          </div>
          <div className="px-2.5 py-1 bg-amber-500/20 border-2 border-amber-400/60 rounded-lg text-center">
            <span className="block text-sm font-black text-amber-300">{dueTodayCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Due Today</span>
          </div>
          <div className="px-2.5 py-1 bg-purple-500/20 border-2 border-purple-400/60 rounded-lg text-center hidden sm:block">
            <span className="block text-sm font-black text-purple-300">{waitingPartsCount}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Waiting on Parts</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-2.5 sm:p-3 bg-slate-50 border-b-2 border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL_DUE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'ALL_DUE'
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                : 'bg-white text-slate-800 border-slate-500 hover:border-slate-800 hover:bg-slate-100'
            }`}
          >
            Calls Due ({overdueCount + dueTodayCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('OVERDUE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'OVERDUE'
                ? 'bg-red-600 text-white border-red-700 shadow-xs'
                : 'bg-white text-red-800 border-slate-500 hover:border-red-600 hover:bg-red-50'
            }`}
          >
            Overdue ({overdueCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('DUE_TODAY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'DUE_TODAY'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-white text-amber-900 border-slate-500 hover:border-amber-600 hover:bg-amber-50'
            }`}
          >
            Due Today ({dueTodayCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('WAITING_PARTS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'WAITING_PARTS'
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                : 'bg-white text-purple-900 border-slate-500 hover:border-purple-600 hover:bg-purple-50'
            }`}
          >
            Waiting on Parts ({waitingPartsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('UP_TO_DATE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'UP_TO_DATE'
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                : 'bg-white text-emerald-800 border-slate-500 hover:border-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Current / Up to Date ({upToDateCount})
          </button>
        </div>

        {/* Search & Advisor selector */}
        <div className="flex items-center gap-2">
          {/* Advisor filter dropdown if manager view or multi-advisor */}
          {advisors.length > 1 && (
            <select
              value={selectedAdvisorFilter}
              onChange={e => setSelectedAdvisorFilter(e.target.value)}
              aria-label="Filter by Service Advisor"
              className="text-xs font-semibold px-2.5 py-1 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">All Advisors</option>
              {advisors.map(adv => (
                <option key={adv.id} value={adv.id}>
                  {adv.name}{adv.employeeNumber ? ` ${adv.employeeNumber}` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Quick Search */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter customer, RO, part..."
              className="w-full text-xs pl-8 pr-3 py-1 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Call Sheet Table / List */}
      <div className="divide-y-2 divide-slate-200 max-h-[460px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-sm text-slate-700">All Customer Follow-Ups Are Up to Date!</p>
            <p className="text-xs text-slate-400 mt-1">
              {activeFilter === 'ALL_DUE'
                ? 'No calls are currently overdue or due today under the twice-weekly cadence rule.'
                : 'No repair orders matched the selected filter criteria.'}
            </p>
          </div>
        ) : (
          filteredItems.map(({ ro, cadence }) => {
            const statusCfg = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
            const waitingParts = ro.parts.filter(p => p.status === 'ORDERED' || p.status === 'BACKORDERED');
            const hasRecentTouchpoint = ro.contactHistory && ro.contactHistory.length > 0;
            const latestContact = hasRecentTouchpoint ? ro.contactHistory![0] : null;

            return (
              <div
                key={ro.id}
                className={`p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  cadence.isOverdue ? 'bg-red-50/30' : cadence.isDueToday ? 'bg-amber-50/20' : ''
                }`}
              >
                {/* Left side: RO & Customer info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <button
                      type="button"
                      onClick={() => onSelectRO(ro)}
                      className="font-mono font-bold text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {ro.id}
                    </button>
                    
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>
                      {statusCfg.label}
                    </span>

                    {/* Cadence badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cadence.badgeClass}`}>
                      {cadence.label}
                    </span>

                    {waitingParts.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <Package className="w-2.5 h-2.5" />
                        <span>{waitingParts.length} Part(s) on Order</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{ro.customerName}</span>
                    <span className="text-xs text-slate-600 font-medium">
                      • {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({ro.customerPhone})
                    </span>
                  </div>

                  {/* Pre-call snippet: Parts ETA or Primary Concern */}
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    {waitingParts.length > 0 ? (
                      <span className="text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1">
                        <span>ETA:</span>
                        <span className="font-bold">
                          {formatEtaBadge(waitingParts[0].estimatedArrival).text}
                        </span>
                        <span className="text-purple-700">({waitingParts[0].description})</span>
                      </span>
                    ) : (
                      <span className="line-clamp-1 italic text-[11px]">
                        "{ro.concerns && ro.concerns.length > 1
                          ? `${ro.concerns[0]} (+${ro.concerns.length - 1} more)`
                          : ro.primaryConcern}"
                      </span>
                    )}

                    <span className="text-slate-400 text-[11px]">•</span>
                    <span className="text-slate-500 text-[11px] flex items-center gap-1 flex-wrap">
                      <span>Advisor: {ro.advisorName}</span>
                      {(() => {
                        const adv = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
                        return adv?.employeeNumber ? (
                          <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {adv.employeeNumber}
                          </span>
                        ) : null;
                      })()}
                    </span>

                    {/* Last contact record summary */}
                    {latestContact && (
                      <>
                        <span className="text-slate-400 text-[11px]">•</span>
                        <span className="text-slate-600 text-[11px] flex items-center gap-1 flex-wrap">
                          <span>Last called: {latestContact.timestamp.split('T')[0]} ({latestContact.advisorName}</span>
                          {(() => {
                            const adv = users.find(u => u.id === latestContact.advisorId || u.name === latestContact.advisorName);
                            return adv?.employeeNumber ? (
                              <span className="font-mono text-[11px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {adv.employeeNumber}
                              </span>
                            ) : null;
                          })()}
                          <span>)</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Direct Dial Link */}
                  <a
                    href={`tel:${ro.customerPhone}`}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    title={`Dial ${ro.customerPhone}`}
                  >
                    <PhoneForwarded className="w-4 h-4 text-emerald-600" />
                  </a>

                  {/* Log Touchpoint Button */}
                  <button
                    type="button"
                    onClick={() => onOpenFollowUpModal(ro)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                      cadence.isOverdue
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : cadence.isDueToday
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Log Call</span>
                  </button>

                  {/* View Details */}
                  <button
                    type="button"
                    onClick={() => onSelectRO(ro)}
                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="View Full Repair Order"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Cadence Guidelines */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold">Service Standard:</span>
          <span>Customers contacted every 3–4 days (min 2x/week) while vehicle is on site.</span>
        </div>
        <span className="font-semibold text-slate-700 text-[11px]">
          {filteredItems.length} vehicle(s) in current view
        </span>
      </div>
    </div>
  );
};

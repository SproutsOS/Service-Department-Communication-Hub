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
import { getContactCadenceStatus, isEligibleForCadence, isROCompleted, getPostRepairFollowUpStatus, formatContactOutcome } from '../utils/cadenceUtils';
import { STATUS_CONFIG } from '../data/mockData';
import { formatEtaBadge } from '../utils/formatters';

interface CustomerCallSheetWidgetProps {
  onSelectRO: (ro: RepairOrder) => void;
  onOpenFollowUpModal: (ro: RepairOrder) => void;
  filterAdvisorId?: string;
  isManagerView?: boolean;
}

interface CallSheetItem {
  ro: RepairOrder;
  isCompleted: boolean;
  postRepair: ReturnType<typeof getPostRepairFollowUpStatus> | null;
  cadence: {
    status: 'OVERDUE' | 'DUE_TODAY' | 'CURRENT' | 'NOT_APPLICABLE' | 'UPCOMING' | 'UP_TO_DATE';
    label: string;
    badgeClass: string;
    daysSinceLastContact: number;
    daysOverdue: number;
    isOverdue: boolean;
    isDueToday: boolean;
    needsCall: boolean;
    lastContactText: string;
    nextDueText: string;
  };
}

export const CustomerCallSheetWidget: React.FC<CustomerCallSheetWidgetProps> = ({
  onSelectRO,
  onOpenFollowUpModal,
  filterAdvisorId,
  isManagerView = false,
}) => {
  const { repairOrders, users } = useApp();
  const [activeFilter, setActiveFilter] = useState<'ALL_DUE' | 'OVERDUE' | 'DUE_TODAY' | 'POST_REPAIR_3DAY' | 'WAITING_PARTS' | 'UP_TO_DATE'>('ALL_DUE');
  const [searchQuery, setSearchQuery] = useState('');

  // Map both active cadence orders and completed orders (post-repair quality check)
  const allCadenceItems: CallSheetItem[] = repairOrders.flatMap((ro): CallSheetItem[] => {
    const isCompleted = isROCompleted(ro);
    if (isCompleted) {
      const postRepair = getPostRepairFollowUpStatus(ro);
      return [{
        ro,
        isCompleted: true,
        postRepair,
        cadence: {
          status: postRepair.isOverdue ? 'OVERDUE' : postRepair.isDueToday ? 'DUE_TODAY' : 'CURRENT',
          label: postRepair.label,
          badgeClass: postRepair.badgeClass,
          daysSinceLastContact: postRepair.daysSinceCompleted,
          daysOverdue: postRepair.isOverdue ? Math.max(1, postRepair.daysSinceCompleted - 3) : 0,
          isOverdue: postRepair.isOverdue,
          isDueToday: postRepair.isDueToday,
          needsCall: postRepair.needsCall,
          lastContactText: `Completed ${postRepair.completedDateFormatted} (${postRepair.daysSinceCompleted}d ago)`,
          nextDueText: postRepair.isCompleted ? 'Follow-up logged' : `3-Day Follow Up: ${postRepair.targetDate}`,
        }
      }];
    } else if (isEligibleForCadence(ro)) {
      return [{
        ro,
        isCompleted: false,
        postRepair: null,
        cadence: getContactCadenceStatus(ro)
      }];
    }
    return [];
  });

  // Counts
  const overdueCount = allCadenceItems.filter(item => item.cadence.isOverdue).length;
  const dueTodayCount = allCadenceItems.filter(item => item.cadence.isDueToday).length;
  const postRepairDueCount = allCadenceItems.filter(item => item.isCompleted && item.postRepair?.needsCall).length;
  const waitingPartsCount = allCadenceItems.filter(item => 
    !item.isCompleted && item.ro.parts.some(p => p.status === 'ORDERED' || p.status === 'BACKORDERED')
  ).length;
  const upToDateCount = allCadenceItems.filter(item => !item.cadence.needsCall).length;

  // Filtered items
  const filteredItems = allCadenceItems.filter(item => {
    // Category filter
    if (activeFilter === 'ALL_DUE' && !item.cadence.needsCall) return false;
    if (activeFilter === 'OVERDUE' && !item.cadence.isOverdue) return false;
    if (activeFilter === 'DUE_TODAY' && !item.cadence.isDueToday) return false;
    if (activeFilter === 'POST_REPAIR_3DAY' && (!item.isCompleted || !item.postRepair?.needsCall)) return false;
    if (activeFilter === 'WAITING_PARTS') {
      if (item.isCompleted) return false;
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

  // Sort: Overdue first, then due today, then post-repair due, then rest
  filteredItems.sort((a, b) => {
    if (a.cadence.isOverdue && !b.cadence.isOverdue) return -1;
    if (!a.cadence.isOverdue && b.cadence.isOverdue) return 1;
    if (a.cadence.isDueToday && !b.cadence.isDueToday) return -1;
    if (!a.cadence.isDueToday && b.cadence.isDueToday) return 1;
    return b.cadence.daysSinceLastContact - a.cadence.daysSinceLastContact;
  });

  return (
    <div id="customer-call-sheet-widget" className="bg-white rounded-xl border-2 border-slate-600 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Customer Communications
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black mt-0.5 text-white tracking-tight flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" />
            <span>Daily Call Log</span>
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
      <div className="p-2.5 sm:p-3 bg-slate-50 border-b-2 border-slate-300 flex flex-col gap-2.5">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
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
            onClick={() => setActiveFilter('POST_REPAIR_3DAY')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
              activeFilter === 'POST_REPAIR_3DAY'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                : 'bg-white text-emerald-900 border-slate-500 hover:border-emerald-600 hover:bg-emerald-50'
            }`}
          >
            3-Day Follow Up ({postRepairDueCount})
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

        {/* Search Bar - positioned directly under Calls Due and Overdue */}
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, RO, vehicle..."
              className="w-full text-xs pl-8 pr-7 py-1.5 bg-white border-2 border-slate-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-[11px] font-bold text-slate-600">
              {filteredItems.length} result{filteredItems.length === 1 ? '' : 's'}
            </span>
          )}
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
                ? 'No customer follow-up calls are currently overdue or due today.'
                : 'No repair orders matched the selected filter criteria.'}
            </p>
          </div>
        ) : (
          filteredItems.map(({ ro, cadence, isCompleted, postRepair }) => {
            const statusCfg = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
            const waitingParts = !isCompleted ? ro.parts.filter(p => p.status === 'ORDERED' || p.status === 'BACKORDERED') : [];
            const hasRecentTouchpoint = ro.contactHistory && ro.contactHistory.length > 0;
            const latestContact = hasRecentTouchpoint ? ro.contactHistory![0] : null;

            return (
              <div
                key={ro.id}
                className={`p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  cadence.isOverdue ? 'bg-red-50/30' : cadence.isDueToday ? 'bg-amber-50/20' : isCompleted ? 'bg-emerald-50/20' : ''
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

                    {isCompleted && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>3-Day Quality Check</span>
                      </span>
                    )}

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

                  {/* Pre-call snippet: Parts ETA, Work Performed, or Primary Concern */}
                  <div className="mt-1 text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    {isCompleted ? (
                      <span className="text-emerald-950 bg-emerald-50/90 border border-emerald-200 px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1 truncate max-w-md">
                        <span className="font-bold text-emerald-800">Repairs Performed:</span>
                        <span className="truncate">{ro.correction || ro.cause || ro.primaryConcern}</span>
                      </span>
                    ) : waitingParts.length > 0 ? (
                      <span className="text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1">
                        <span>ETA:</span>
                        <span className="font-bold">
                          {formatEtaBadge(waitingParts[0].estimatedArrival).text}
                        </span>
                        <span className="text-purple-700">({waitingParts[0].description})</span>
                      </span>
                    ) : (
                      <span className="italic text-[11px] text-slate-800 font-medium">
                        {ro.concerns && ro.concerns.length > 1
                          ? ro.concerns.map((c, i) => `L${i + 1}: ${c}`).join(' • ')
                          : `"${ro.primaryConcern}"`}
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
                      isCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : cadence.isOverdue
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : cadence.isDueToday
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Log 3-Day Quality Check' : 'Log Call'}</span>
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

import React, { useState } from 'react';
import { 
  UserCheck, 
  Plus, 
  Clock, 
  AlertTriangle, 
  Package, 
  CheckCircle2, 
  Search, 
  MessageSquare,
  Wrench,
  Send,
  Calculator,
  ShieldCheck,
  PhoneCall,
  LayoutGrid
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROStatus, RepairOrder } from '../types';
import { normalizeROStatus } from '../data/mockData';
import { CustomerCallSheetWidget } from './CustomerCallSheetWidget';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { getContactCadenceStatus, isEligibleForCadence } from '../utils/cadenceUtils';

export const AdvisorDashboard: React.FC = () => {
  const { currentUser, repairOrders, setSelectedRO, setIsNewROModalOpen } = useApp();
  
  const [viewMode, setViewMode] = useState<'BOARD' | 'CALL_SHEET'>('BOARD');
  const [activeTab, setActiveTab] = useState<ROStatus | 'ALL' | 'CALLS_DUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowUpRO, setSelectedFollowUpRO] = useState<RepairOrder | null>(null);

  // Strictly filter by this advisor's ROs to prevent clutter
  const myROs = repairOrders.filter(ro => ro.advisorId === currentUser.id);

  // Calculate customer cadence counts for this advisor
  const myEligibleROs = myROs.filter(ro => isEligibleForCadence(ro));
  const myOverdueCalls = myEligibleROs.filter(ro => getContactCadenceStatus(ro).isOverdue).length;
  const myDueTodayCalls = myEligibleROs.filter(ro => getContactCadenceStatus(ro).isDueToday).length;
  const totalCallsDue = myOverdueCalls + myDueTodayCalls;

  // Status counts for this advisor
  const waitingDiagnosisCount = myROs.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length;
  const inDiagCount = myROs.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length;
  const estimateDoneCount = myROs.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE').length;
  const waitingApprovalCount = myROs.filter(r => normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL').length;
  const approvedCount = myROs.filter(r => normalizeROStatus(r.status) === 'APPROVED').length;
  const partsOrderedCount = myROs.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length;
  const inRepairCount = myROs.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS' || normalizeROStatus(r.status) === 'REPAIR_COMPLETE').length;
  const readyPickupCount = myROs.filter(r => normalizeROStatus(r.status) === 'READY_FOR_PICKUP').length;
  const completedCount = myROs.filter(r => normalizeROStatus(r.status) === 'CLOSED' || r.status === 'COMPLETED').length;

  // Filtered list
  const displayROs = myROs.filter(ro => {
    if (activeTab === 'CALLS_DUE') {
      const cadence = getContactCadenceStatus(ro);
      if (!cadence.needsCall) return false;
    } else if (activeTab !== 'ALL' && normalizeROStatus(ro.status) !== normalizeROStatus(activeTab)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRO = ro.id.toLowerCase().includes(q);
      const matchCust = ro.customerName.toLowerCase().includes(q);
      const matchVeh = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`.toLowerCase().includes(q);
      const matchTech = ro.techName?.toLowerCase().includes(q);
      return matchRO || matchCust || matchVeh || matchTech;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Advisor Bio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Advisor Desk: {currentUser.name}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Personal Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track your active repair orders and maintain twice-weekly customer communication.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('BOARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'BOARD'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>RO Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALL_SHEET')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'CALL_SHEET'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Daily Call Sheet</span>
              {totalCallsDue > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {totalCallsDue}
                </span>
              )}
            </button>
          </div>

          <button
            id="advisor-new-ro-btn"
            onClick={() => setIsNewROModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer RO</span>
          </button>
        </div>
      </div>

      {/* Cadence Notification Alert when calls are due */}
      {totalCallsDue > 0 && viewMode === 'BOARD' && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>Customer Cadence Standard: {totalCallsDue} Calls Pending</span>
                {myOverdueCalls > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {myOverdueCalls} Overdue
                  </span>
                )}
                {myDueTodayCalls > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {myDueTodayCalls} Due Today
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Dealership standard requires contacting customers with vehicles waiting on parts or undergoing repairs at least twice per week.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('CALL_SHEET')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Call Sheet Now</span>
          </button>
        </div>
      )}

      {/* Render either Call Sheet or RO Board */}
      {viewMode === 'CALL_SHEET' ? (
        <div className="space-y-4">
          <CustomerCallSheetWidget 
            filterAdvisorId={currentUser.id}
            onSelectRO={setSelectedRO}
            onOpenFollowUpModal={setSelectedFollowUpRO}
          />
        </div>
      ) : (
        <>
          {/* Quick Status Pill Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-2.5">
            
            <button
              onClick={() => setActiveTab('ALL')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 truncate">All My ROs</div>
              <div className="text-lg sm:text-xl font-black">{myROs.length}</div>
            </button>

            {/* Cadence filter tab */}
            <button
              onClick={() => setActiveTab('CALLS_DUE')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                activeTab === 'CALLS_DUE'
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50/50 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Calls Due (2x/Wk)</span>
                <PhoneCall className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-red-600">{totalCallsDue}</div>
            </button>

        <button
          onClick={() => setActiveTab('WAITING_DIAGNOSTICS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'WAITING_DIAGNOSTICS'
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Waiting Diag</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600">{waitingDiagnosisCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('IN_DIAG')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'IN_DIAG'
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">In Diag</span>
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600">{inDiagCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('ESTIMATE_DONE')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'ESTIMATE_DONE'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Estimate Done</span>
            <Calculator className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-600">{estimateDoneCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('WAITING_FOR_APPROVAL')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'WAITING_FOR_APPROVAL'
              ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Needs Approval</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-orange-600">{waitingApprovalCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Approved</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-600">{approvedCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('PARTS_ORDERED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'PARTS_ORDERED'
              ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Parts Ordered</span>
            <Package className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-600">{partsOrderedCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('REPAIR_IN_PROGRESS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'REPAIR_IN_PROGRESS'
              ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-cyan-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">In Repair</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-cyan-600">{inRepairCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('READY_FOR_PICKUP')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'READY_FOR_PICKUP'
              ? 'bg-green-600 text-white border-green-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-green-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Ready/Pickup</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-green-600">{readyPickupCount + completedCount}</div>
        </button>

      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter my ROs by customer, vehicle, RO number, or technician..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Repair Orders List */}
      <div>
        {displayROs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No repair orders in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              {myROs.length === 0 
                ? "You currently have no repair orders assigned. Click 'New Customer RO' to open one." 
                : "No orders match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayROs.map(ro => (
              <ROCard 
                key={ro.id} 
                ro={ro} 
                onClick={() => setSelectedRO(ro)} 
              />
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {/* Customer Follow-Up Modal */}
      {selectedFollowUpRO && (
        <CustomerFollowUpModal
          ro={selectedFollowUpRO}
          onClose={() => setSelectedFollowUpRO(null)}
        />
      )}

    </div>
  );
};

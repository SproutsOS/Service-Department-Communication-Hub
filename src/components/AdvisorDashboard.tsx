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
    <div className="space-y-3 sm:space-y-3.5">
      
      {/* Header & Advisor Bio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Advisor Desk: {currentUser.name}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border-2 border-blue-400">
              Personal Queue
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Track your active repair orders and maintain twice-weekly customer communication.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border-2 border-slate-500">
            <button
              type="button"
              onClick={() => setViewMode('BOARD')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'BOARD'
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>RO Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALL_SHEET')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'CALL_SHEET'
                  ? 'bg-white text-blue-700 shadow-2xs border border-slate-300'
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
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer border-2 border-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer RO</span>
          </button>
        </div>
      </div>

      {/* Cadence Notification Alert when calls are due */}
      {totalCallsDue > 0 && viewMode === 'BOARD' && (
        <div className="p-3 bg-gradient-to-r from-red-50 to-amber-50 border-2 border-amber-500 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs border border-amber-600">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>Customer Service Standard: {totalCallsDue} Calls Pending</span>
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
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 border border-blue-700"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Open Call Sheet</span>
          </button>
        </div>
      )}

      {/* Render either Call Sheet or RO Board */}
      {viewMode === 'CALL_SHEET' ? (
        <div className="space-y-3">
          <CustomerCallSheetWidget 
            filterAdvisorId={currentUser.id}
            onSelectRO={setSelectedRO}
            onOpenFollowUpModal={setSelectedFollowUpRO}
          />
        </div>
      ) : (
        <>
          {/* Quick Status Pill Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-1">
            
            <button
              onClick={() => setActiveTab('ALL')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-900 border-slate-800 hover:border-black hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase mb-0.5 truncate ${activeTab === 'ALL' ? 'text-slate-300' : 'text-slate-700'}`}>
                All My ROs
              </div>
              <div className={`text-base sm:text-lg font-black ${activeTab === 'ALL' ? 'text-white' : 'text-black'}`}>
                {myROs.length}
              </div>
            </button>

            {/* Cadence filter tab */}
            <button
              onClick={() => setActiveTab('CALLS_DUE')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'CALLS_DUE'
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-red-600 hover:bg-red-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'CALLS_DUE' ? 'text-red-950' : 'text-slate-700'}`}>
                  Calls Due
                </span>
                <PhoneCall className="w-3 h-3 text-red-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{totalCallsDue}</div>
            </button>

            <button
              onClick={() => setActiveTab('WAITING_DIAGNOSTICS')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'WAITING_DIAGNOSTICS'
                  ? 'bg-amber-100 border-amber-700 ring-2 ring-amber-500/40 text-amber-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-amber-600 hover:bg-amber-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'WAITING_DIAGNOSTICS' ? 'text-amber-950' : 'text-slate-700'}`}>
                  Waiting Diag
                </span>
                <Clock className="w-3 h-3 text-amber-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{waitingDiagnosisCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('IN_DIAG')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'IN_DIAG'
                  ? 'bg-blue-100 border-blue-700 ring-2 ring-blue-500/40 text-blue-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-blue-600 hover:bg-blue-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'IN_DIAG' ? 'text-blue-950' : 'text-slate-700'}`}>
                  In Diag
                </span>
                <Wrench className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{inDiagCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('ESTIMATE_DONE')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'ESTIMATE_DONE'
                  ? 'bg-indigo-100 border-indigo-700 ring-2 ring-indigo-500/40 text-indigo-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-indigo-600 hover:bg-indigo-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'ESTIMATE_DONE' ? 'text-indigo-950' : 'text-slate-700'}`}>
                  Estimate Done
                </span>
                <Calculator className="w-3 h-3 text-indigo-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{estimateDoneCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('WAITING_FOR_APPROVAL')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'WAITING_FOR_APPROVAL'
                  ? 'bg-orange-100 border-orange-700 ring-2 ring-orange-500/40 text-orange-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-orange-600 hover:bg-orange-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'WAITING_FOR_APPROVAL' ? 'text-orange-950' : 'text-slate-700'}`}>
                  Approval
                </span>
                <AlertTriangle className="w-3 h-3 text-orange-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{waitingApprovalCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'APPROVED'
                  ? 'bg-teal-100 border-teal-700 ring-2 ring-teal-500/40 text-teal-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-teal-600 hover:bg-teal-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'APPROVED' ? 'text-teal-950' : 'text-slate-700'}`}>
                  Approved
                </span>
                <ShieldCheck className="w-3 h-3 text-teal-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{approvedCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('PARTS_ORDERED')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'PARTS_ORDERED'
                  ? 'bg-purple-100 border-purple-700 ring-2 ring-purple-500/40 text-purple-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-purple-600 hover:bg-purple-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'PARTS_ORDERED' ? 'text-purple-950' : 'text-slate-700'}`}>
                  Parts
                </span>
                <Package className="w-3 h-3 text-purple-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{partsOrderedCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('REPAIR_IN_PROGRESS')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'REPAIR_IN_PROGRESS'
                  ? 'bg-cyan-100 border-cyan-700 ring-2 ring-cyan-500/40 text-cyan-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-cyan-600 hover:bg-cyan-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'REPAIR_IN_PROGRESS' ? 'text-cyan-950' : 'text-slate-700'}`}>
                  In Repair
                </span>
                <CheckCircle2 className="w-3 h-3 text-cyan-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{inRepairCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('READY_FOR_PICKUP')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'READY_FOR_PICKUP'
                  ? 'bg-emerald-100 border-emerald-700 ring-2 ring-emerald-500/40 text-emerald-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-emerald-600 hover:bg-emerald-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'READY_FOR_PICKUP' ? 'text-emerald-950' : 'text-slate-700'}`}>
                  Ready
                </span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{readyPickupCount + completedCount}</div>
            </button>

          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter my ROs by customer, vehicle, RO number, or technician..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-1.5 bg-white border-2 border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs text-slate-900 placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Repair Orders List */}
          <div>
            {displayROs.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-slate-800 p-8 text-center">
                <UserCheck className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No repair orders in this view</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {myROs.length === 0 
                    ? "You currently have no repair orders assigned. Click 'New Customer RO' to open one." 
                    : "No orders match the selected filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
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

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
  LayoutGrid,
  ListFilter,
  CalendarCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROLineRow } from './ROLineRow';
import { ROStatus, RepairOrder } from '../types';
import { normalizeROStatus } from '../data/mockData';
import { CustomerCallSheetWidget } from './CustomerCallSheetWidget';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { getContactCadenceStatus, isEligibleForCadence, isROCompleted, getPostRepairFollowUpStatus } from '../utils/cadenceUtils';
import { sortROsNumerically } from '../utils/formatters';

export const AdvisorDashboard: React.FC = () => {
  const { 
    currentUser, 
    repairOrders, 
    setSelectedRO, 
    setIsNewROModalOpen, 
    users,
    appointments,
    setIsAppointmentCalendarOpen 
  } = useApp();
  
  const [viewMode, setViewMode] = useState<'BOARD' | 'CALL_SHEET'>('BOARD');
  const [displayMode, setDisplayMode] = useState<'CARD' | 'LINE'>('CARD');
  const [activeTab, setActiveTab] = useState<ROStatus | 'ALL' | 'CALLS_DUE' | 'COMPLETED'>('ALL');
  const [completedSubFilter, setCompletedSubFilter] = useState<'ALL' | 'DUE' | 'DONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowUpRO, setSelectedFollowUpRO] = useState<RepairOrder | null>(null);

  // Strictly filter by this advisor's ROs to prevent clutter (sorted in numerical order)
  const myROs = sortROsNumerically(repairOrders.filter(ro => ro.advisorId === currentUser.id));

  // Separate Active repair orders vs Completed repair orders (keeps active screen completely uncluttered)
  const myActiveROs = myROs.filter(ro => !isROCompleted(ro));
  const myCompletedROs = myROs.filter(ro => isROCompleted(ro));

  // 3-Day Post-repair customer follow-up metrics
  const myPostRepairList = myCompletedROs.map(ro => ({
    ro,
    status: getPostRepairFollowUpStatus(ro),
  }));
  const myPostRepairDue = myPostRepairList.filter(p => p.status.needsCall);
  const postRepairDueCount = myPostRepairDue.length;
  const postRepairOverdueCount = myPostRepairDue.filter(p => p.status.isOverdue).length;
  const postRepairDueTodayCount = myPostRepairDue.filter(p => p.status.isDueToday).length;

  // Active in-progress customer cadence counts
  const myEligibleROs = myActiveROs.filter(ro => isEligibleForCadence(ro));
  const myOverdueCalls = myEligibleROs.filter(ro => getContactCadenceStatus(ro).isOverdue).length;
  const myDueTodayCalls = myEligibleROs.filter(ro => getContactCadenceStatus(ro).isDueToday).length;
  const totalCadenceCallsDue = myOverdueCalls + myDueTodayCalls;

  // Total calls due across active cadence AND 3-day post-repair follow-up
  const totalCallsDue = totalCadenceCallsDue + postRepairDueCount;

  // Status counts for this advisor (using active ROs only)
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const myTodayAppointments = React.useMemo(() => {
    return (appointments || []).filter(a => a.appointmentDate === todayStr && a.advisorId === currentUser.id && a.status !== 'CANCELLED');
  }, [appointments, todayStr, currentUser.id]);

  const waitingDiagnosisCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length;
  const inDiagCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length;
  const estimateDoneCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE').length;
  const waitingApprovalCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL').length;
  const approvedCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'APPROVED').length;
  const partsOrderedCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length;
  const inRepairCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS' || normalizeROStatus(r.status) === 'REPAIR_COMPLETE').length;
  const readyPickupCount = myActiveROs.filter(r => normalizeROStatus(r.status) === 'READY_FOR_PICKUP').length;
  const completedCount = myCompletedROs.length;

  // Filtered list (sorted in numerical order)
  const displayROs = sortROsNumerically(myROs.filter(ro => {
    const isCompleted = isROCompleted(ro);

    if (activeTab === 'ALL') {
      // Completed ROs are NOT on active screen!
      if (isCompleted) return false;
    } else if (activeTab === 'COMPLETED') {
      // Only completed ROs
      if (!isCompleted) return false;
      const postRepair = getPostRepairFollowUpStatus(ro);
      if (completedSubFilter === 'DUE' && !postRepair.needsCall) return false;
      if (completedSubFilter === 'DONE' && postRepair.needsCall) return false;
    } else if (activeTab === 'CALLS_DUE') {
      if (isCompleted) {
        const postRepair = getPostRepairFollowUpStatus(ro);
        if (!postRepair.needsCall) return false;
      } else {
        const cadence = getContactCadenceStatus(ro);
        if (!cadence.needsCall) return false;
      }
    } else {
      // Specific status tabs: only active ROs matching that status
      if (isCompleted) return false;
      if (normalizeROStatus(ro.status) !== normalizeROStatus(activeTab as ROStatus)) {
        return false;
      }
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
  }));

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
          {/* Appointment Calendar Button */}
          <button
            type="button"
            onClick={() => setIsAppointmentCalendarOpen(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Customer Service Appointment Calendar"
          >
            <CalendarCheck className="w-4 h-4 text-purple-200" />
            <span>Appointment Calendar</span>
            {myTodayAppointments.length > 0 && (
              <span className="bg-purple-900 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-purple-400">
                {myTodayAppointments.length} Today
              </span>
            )}
          </button>

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
              <span>Daily Call Log</span>
              {totalCallsDue > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {totalCallsDue}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3-Day Post-Repair Customer Follow-Up Alert Banner */}
      {postRepairDueCount > 0 && viewMode === 'BOARD' && (
        <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs border border-emerald-700">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <span>3-Day Follow Up: {postRepairDueCount} Customer Call(s) Due</span>
                {postRepairOverdueCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full animate-pulse">
                    {postRepairOverdueCount} Overdue
                  </span>
                )}
                {postRepairDueTodayCount > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {postRepairDueTodayCount} Due Today
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Check on customers 3 days after repair completion to verify their vehicle is performing well and ensure they have no remaining concerns.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { setActiveTab('COMPLETED'); setCompletedSubFilter('DUE'); }}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-emerald-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>View 3-Day Follow-Ups</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALL_SHEET')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-blue-700"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call Log</span>
            </button>
          </div>
        </div>
      )}

      {/* Cadence Notification Alert when in-shop calls are due */}
      {totalCadenceCallsDue > 0 && viewMode === 'BOARD' && (
        <div className="p-3 bg-gradient-to-r from-red-50 to-amber-50 border-2 border-amber-500 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs border border-amber-600">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>In-Shop Cadence: {totalCadenceCallsDue} Calls Pending</span>
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
            <span>Open Call Log</span>
          </button>
        </div>
      )}

      {/* Render either Call Sheet or RO Board */}
      {viewMode === 'CALL_SHEET' ? (
        <div className="space-y-3">
          <CustomerCallSheetWidget 
            onSelectRO={setSelectedRO}
            onOpenFollowUpModal={setSelectedFollowUpRO}
          />
        </div>
      ) : (
        <>
          {/* Quick Status Pill Filters & Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-1">
            
            {/* Create RO Action Button */}
            <button
              id="advisor-new-ro-btn"
              type="button"
              onClick={() => setIsNewROModalOpen(true)}
              className="p-2 rounded-lg border-2 border-blue-700 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-left transition-all shadow-xs cursor-pointer flex flex-col justify-between group"
              title="Create RO"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold uppercase truncate text-blue-100">
                  New RO
                </span>
                <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </div>
              <div className="text-xs sm:text-sm font-black text-white leading-tight">
                Create RO
              </div>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white text-slate-900 border-slate-800 hover:border-black hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase mb-0.5 truncate ${activeTab === 'ALL' ? 'text-red-950' : 'text-slate-700'}`}>
                Active ROs
              </div>
              <div className="text-base sm:text-lg font-black text-black">
                {myActiveROs.length}
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-amber-600 hover:bg-amber-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'WAITING_DIAGNOSTICS' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-blue-600 hover:bg-blue-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'IN_DIAG' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-indigo-600 hover:bg-indigo-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'ESTIMATE_DONE' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-orange-600 hover:bg-orange-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span 
                  className={`text-[10px] font-bold uppercase truncate ${activeTab === 'WAITING_FOR_APPROVAL' ? 'text-red-950' : 'text-slate-700'}`}
                  title="Pending Approval"
                >
                  Pending Approval
                </span>
                <AlertTriangle className="w-3 h-3 text-orange-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{waitingApprovalCount}</div>
            </button>

            <button
              onClick={() => setActiveTab('APPROVED')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'APPROVED'
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-teal-600 hover:bg-teal-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'APPROVED' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-purple-600 hover:bg-purple-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'PARTS_ORDERED' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-cyan-600 hover:bg-cyan-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'REPAIR_IN_PROGRESS' ? 'text-red-950' : 'text-slate-700'}`}>
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
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : 'bg-white border-slate-800 hover:border-emerald-600 hover:bg-emerald-50/40 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${activeTab === 'READY_FOR_PICKUP' ? 'text-red-950' : 'text-slate-700'}`}>
                  Ready
                </span>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-black">{readyPickupCount}</div>
            </button>

            {/* Dedicated Completed Repair Orders Tab */}
            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`p-2 rounded-lg border-2 text-left transition-all cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-red-100 border-red-700 ring-2 ring-red-500/40 text-red-950 shadow-xs'
                  : postRepairDueCount > 0
                  ? 'bg-emerald-50 border-emerald-600 hover:border-emerald-700 shadow-2xs'
                  : 'bg-white border-slate-800 hover:border-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[10px] font-bold uppercase truncate ${
                  activeTab === 'COMPLETED' ? 'text-red-950 font-bold' : postRepairDueCount > 0 ? 'text-emerald-900 font-black' : 'text-slate-700'
                }`}>
                  Completed
                </span>
                <ShieldCheck className={`w-3 h-3 ${activeTab === 'COMPLETED' ? 'text-red-600' : 'text-emerald-600'}`} />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <div className="text-base sm:text-lg font-black text-black">
                  {completedCount}
                </div>
                {postRepairDueCount > 0 && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-emerald-600 text-white animate-pulse">
                    {postRepairDueCount} Due
                  </span>
                )}
              </div>
            </button>

          </div>

          {/* Completed Sub-Filter Navigation Bar (shown when viewing Completed tab) */}
          {activeTab === 'COMPLETED' && (
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5 text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Completed Repair Orders Archive & 3-Day Quality Checks</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase bg-white/20 text-slate-200 px-2 py-0.5 rounded-full">
                    Historical Record
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Completed orders are safely stored here so your active repair screen stays clean. Quality standard: 3-day follow up to verify customer satisfaction and ensure no concerns.
                </p>
              </div>

              {/* Sub-filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                <button
                  type="button"
                  onClick={() => setCompletedSubFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    completedSubFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  All Completed ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedSubFilter('DUE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    completedSubFilter === 'DUE'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : postRepairDueCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>3-Day Follow-Up Due ({postRepairDueCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompletedSubFilter('DONE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    completedSubFilter === 'DONE'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Follow-Up Done ({completedCount - postRepairDueCount})
                </button>
              </div>
            </div>
          )}

          {/* Search Filter & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter my ROs by customer, vehicle, RO number, or technician..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-1.5 bg-white border-2 border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs text-slate-900 placeholder:text-slate-500 font-medium"
              />
            </div>

            {/* Card View vs Line View Toggle */}
            <div className="flex items-center self-end sm:self-auto bg-slate-100 p-1 rounded-lg border-2 border-slate-800 shrink-0">
              <button
                type="button"
                id="advisor-card-view-btn"
                onClick={() => setDisplayMode('CARD')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  displayMode === 'CARD'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Card View (Standard Grid)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                id="advisor-line-view-btn"
                onClick={() => setDisplayMode('LINE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  displayMode === 'LINE'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-900 font-extrabold hover:text-black hover:bg-slate-200/60'
                }`}
                title="Line View (Compact Detailed Table)"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Line View</span>
              </button>
            </div>
          </div>

          {/* Repair Orders List */}
          <div>
            {displayROs.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-slate-800 p-8 text-center">
                <UserCheck className="w-9 h-9 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">
                  {activeTab === 'COMPLETED' ? 'No completed repair orders found' : 'No repair orders in this view'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeTab === 'COMPLETED'
                    ? completedCount === 0
                      ? 'No repair orders have been completed and closed yet.'
                      : 'No completed orders match the current filter or search.'
                    : myActiveROs.length === 0 
                    ? "You currently have no active repair orders assigned. Click 'Create RO' to open one." 
                    : "No orders match the selected filter."}
                </p>
              </div>
            ) : displayMode === 'CARD' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                {displayROs.map(ro => (
                  <ROCard 
                    key={ro.id} 
                    ro={ro} 
                    onClick={() => setSelectedRO(ro)} 
                    onOpenFollowUp={setSelectedFollowUpRO}
                    hideCauseCorrection={true}
                  />
                ))}
              </div>
            ) : (
              /* Line View Table (Detailed Row Format) */
              <div className="bg-white rounded-xl border-2 border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">RO # & Priority</th>
                        <th className="px-3 py-2.5">Customer & Phone</th>
                        <th className="px-3 py-2.5">Vehicle & Mileage</th>
                        <th className="px-3 py-2.5">Customer Concern / 3 C's</th>
                        <th className="px-3 py-2.5">Ticket Status</th>
                        <th className="px-3 py-2.5">Promised Time</th>
                        <th className="px-3 py-2.5">Assigned Tech</th>
                        <th className="px-3 py-2.5">
                          {activeTab === 'COMPLETED' ? '3-Day Follow-Up' : 'Follow-Up (2x/Wk)'}
                        </th>
                        <th className="px-3 py-2.5 text-right">Items / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {displayROs.map(ro => (
                        <ROLineRow
                          key={ro.id}
                          ro={ro}
                          users={users}
                          onClick={() => setSelectedRO(ro)}
                          showCadence={true}
                          onOpenFollowUp={setSelectedFollowUpRO}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Showing {displayROs.length} repair order{displayROs.length === 1 ? '' : 's'} in Line View</span>
                  <span className="text-[11px] text-slate-500">Click any row to open the complete repair order</span>
                </div>
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

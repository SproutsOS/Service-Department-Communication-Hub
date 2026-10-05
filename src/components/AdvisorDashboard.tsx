import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Users,
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
  CalendarCheck,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROLineRow } from './ROLineRow';
import { ROStatus, RepairOrder } from '../types';
import { normalizeROStatus } from '../data/mockData';
import { CustomerCallSheetWidget } from './CustomerCallSheetWidget';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { getContactCadenceStatus, isEligibleForCadence, isROCompleted, getPostRepairFollowUpStatus } from '../utils/cadenceUtils';
import { sortROsNumerically, matchesROSearch } from '../utils/formatters';

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

  // Scope filter: 'MY_ROS' (default: only assigned to logged-in advisor), 'ALL_SHOP' (all advisors), or specific advisor ID
  const [advisorScope, setAdvisorScope] = useState<'MY_ROS' | 'ALL_SHOP' | string>('MY_ROS');

  // List of all active service advisors / managers for quick colleague switching
  const serviceAdvisors = useMemo(() => {
    return users.filter(u => 
      (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated
    );
  }, [users]);

  // 1. My assigned repair orders (Default queue for this Advisor)
  const myROs = useMemo(() => {
    return sortROsNumerically(repairOrders.filter(ro => ro.advisorId === currentUser.id));
  }, [repairOrders, currentUser.id]);
  const myActiveROs = useMemo(() => myROs.filter(ro => !isROCompleted(ro)), [myROs]);
  const myCompletedROs = useMemo(() => myROs.filter(ro => isROCompleted(ro)), [myROs]);

  // 2. All shop repair orders (across all advisors)
  const allShopROs = useMemo(() => sortROsNumerically(repairOrders), [repairOrders]);
  const allActiveShopROs = useMemo(() => allShopROs.filter(ro => !isROCompleted(ro)), [allShopROs]);

  // 3. Current active scope list
  const currentScopeROs = useMemo(() => {
    if (advisorScope === 'MY_ROS') return myROs;
    if (advisorScope === 'ALL_SHOP') return allShopROs;
    return sortROsNumerically(repairOrders.filter(ro => ro.advisorId === advisorScope));
  }, [advisorScope, myROs, allShopROs, repairOrders]);

  const currentScopeActiveROs = useMemo(() => currentScopeROs.filter(ro => !isROCompleted(ro)), [currentScopeROs]);
  const currentScopeCompletedROs = useMemo(() => currentScopeROs.filter(ro => isROCompleted(ro)), [currentScopeROs]);

  // 3-Day Post-repair customer follow-up metrics for current scope
  const currentPostRepairList = useMemo(() => {
    return currentScopeCompletedROs.map(ro => ({
      ro,
      status: getPostRepairFollowUpStatus(ro),
    }));
  }, [currentScopeCompletedROs]);
  const currentPostRepairDue = useMemo(() => currentPostRepairList.filter(p => p.status.needsCall), [currentPostRepairList]);
  const postRepairDueCount = currentPostRepairDue.length;
  const postRepairOverdueCount = currentPostRepairDue.filter(p => p.status.isOverdue).length;
  const postRepairDueTodayCount = currentPostRepairDue.filter(p => p.status.isDueToday).length;

  // Active in-progress customer cadence counts
  const currentEligibleROs = useMemo(() => currentScopeActiveROs.filter(ro => isEligibleForCadence(ro)), [currentScopeActiveROs]);
  const overdueCallsCount = useMemo(() => currentEligibleROs.filter(ro => getContactCadenceStatus(ro).isOverdue).length, [currentEligibleROs]);
  const dueTodayCallsCount = useMemo(() => currentEligibleROs.filter(ro => getContactCadenceStatus(ro).isDueToday).length, [currentEligibleROs]);
  const totalCadenceCallsDue = overdueCallsCount + dueTodayCallsCount;

  // Total calls due across active cadence AND 3-day post-repair follow-up
  const totalCallsDue = totalCadenceCallsDue + postRepairDueCount;

  // Status counts for selected scope (using active ROs only)
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayAppointments = useMemo(() => {
    return (appointments || []).filter(a => {
      if (a.appointmentDate !== todayStr || a.status === 'CANCELLED') return false;
      if (advisorScope === 'MY_ROS') return a.advisorId === currentUser.id;
      if (advisorScope === 'ALL_SHOP') return true;
      return a.advisorId === advisorScope;
    });
  }, [appointments, todayStr, advisorScope, currentUser.id]);

  const waitingDiagnosisCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length;
  const inDiagCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length;
  const estimateDoneCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE').length;
  const waitingApprovalCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL').length;
  const approvedCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'APPROVED').length;
  const partsOrderedCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length;
  const inRepairCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS' || normalizeROStatus(r.status) === 'REPAIR_COMPLETE').length;
  const readyPickupCount = currentScopeActiveROs.filter(r => normalizeROStatus(r.status) === 'READY_FOR_PICKUP').length;
  const completedCount = currentScopeCompletedROs.length;

  // Cross-Advisor Search Lookup: When on "My ROs" and typing in search, also check other advisors' ROs
  const otherAdvisorsMatchingROs = useMemo(() => {
    if (!searchQuery.trim() || advisorScope !== 'MY_ROS') return [];
    const otherROs = repairOrders.filter(ro => ro.advisorId !== currentUser.id);
    return sortROsNumerically(otherROs.filter(ro => matchesROSearch(ro, searchQuery, users)));
  }, [searchQuery, advisorScope, repairOrders, currentUser.id, users]);

  // Filtered list (sorted in numerical order)
  const displayROs = sortROsNumerically(currentScopeROs.filter(ro => {
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
      return matchesROSearch(ro, searchQuery, users);
    }

    return true;
  }));

  const activeAdvisorName = useMemo(() => {
    if (advisorScope === 'MY_ROS') return currentUser.name;
    if (advisorScope === 'ALL_SHOP') return 'All Service Advisors';
    return serviceAdvisors.find(a => a.id === advisorScope)?.name || 'Selected Advisor';
  }, [advisorScope, currentUser.name, serviceAdvisors]);

  return (
    <div className="space-y-3 sm:space-y-3.5">
      
      {/* Header & Advisor Bio + Scope Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border-2 border-slate-700 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Advisor Desk: {activeAdvisorName}
            </h1>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-2xs ${
              advisorScope === 'MY_ROS'
                ? 'bg-blue-100 text-blue-900 border-blue-400'
                : 'bg-purple-100 text-purple-900 border-purple-400'
            }`}>
              {advisorScope === 'MY_ROS' ? 'My Personal Queue' : advisorScope === 'ALL_SHOP' ? 'All Shop ROs View' : 'Colleague Queue View'}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {advisorScope === 'MY_ROS' 
              ? 'Showing only your assigned repair orders. Use search or the scope selector to pull up any colleague’s RO when a customer calls.' 
              : 'Viewing shared repair orders across advisors. You can view, diagnose, or update any customer’s order while assisting calls.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Advisor Scope Selector (My ROs vs All Shop ROs vs Colleague) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border-2 border-slate-600 text-xs">
            <button
              type="button"
              id="advisor-scope-my-ros-btn"
              onClick={() => setAdvisorScope('MY_ROS')}
              className={`px-3 py-1.5 rounded-md font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                advisorScope === 'MY_ROS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
              }`}
              title="View only your assigned repair orders"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>My ROs ({myActiveROs.length})</span>
            </button>

            <button
              type="button"
              id="advisor-scope-all-shop-btn"
              onClick={() => setAdvisorScope('ALL_SHOP')}
              className={`px-3 py-1.5 rounded-md font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                advisorScope === 'ALL_SHOP'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
              }`}
              title="Access and pull up all shop repair orders across all advisors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Shop ({allActiveShopROs.length})</span>
            </button>

            {/* Colleague Quick Filter Dropdown */}
            <select
              value={advisorScope}
              onChange={(e) => setAdvisorScope(e.target.value)}
              className="ml-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Filter by specific service advisor"
            >
              <option value="MY_ROS">My Queue ({currentUser.name})</option>
              <option value="ALL_SHOP">All Service Advisors ({allActiveShopROs.length})</option>
              {serviceAdvisors.filter(a => a.id !== currentUser.id).length > 0 && (
                <optgroup label="Select Colleague:">
                  {serviceAdvisors.filter(a => a.id !== currentUser.id).map(a => {
                    const count = repairOrders.filter(r => r.advisorId === a.id && !isROCompleted(r)).length;
                    return (
                      <option key={a.id} value={a.id}>
                        {a.name} ({count} Active)
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>

          {/* Appointment Calendar Button */}
          <button
            type="button"
            onClick={() => setIsAppointmentCalendarOpen(true)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Customer Service Appointment Calendar"
          >
            <CalendarCheck className="w-4 h-4 text-purple-200" />
            <span>Appointments</span>
            {todayAppointments.length > 0 && (
              <span className="bg-purple-900 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-purple-400">
                {todayAppointments.length}
              </span>
            )}
          </button>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center border-2 border-slate-600">
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

      {/* Notice Banner when viewing shared/all shop orders */}
      {advisorScope !== 'MY_ROS' && (
        <div className="p-3 bg-blue-50/90 border-2 border-blue-400 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150 flex-wrap">
          <div className="flex items-center gap-2.5 text-blue-950 font-medium">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <span>
              {advisorScope === 'ALL_SHOP'
                ? `Shared Access Active: Viewing all ${allActiveShopROs.length} active repair orders in the dealership. Click any order to open details or assist a calling customer.`
                : `Viewing repair orders assigned to ${activeAdvisorName}. Click any order to pull up details, diagnosis, inspection findings, or parts status.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAdvisorScope('MY_ROS')}
            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-lg shadow-2xs cursor-pointer transition-colors shrink-0"
          >
            ← Return to My ROs ({myActiveROs.length})
          </button>
        </div>
      )}

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
                {overdueCallsCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {overdueCallsCount} Overdue
                  </span>
                )}
                {dueTodayCallsCount > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {dueTodayCallsCount} Due Today
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
            filterAdvisorId={advisorScope === 'MY_ROS' ? currentUser.id : advisorScope === 'ALL_SHOP' ? undefined : advisorScope}
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
                {currentScopeActiveROs.length}
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
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  advisorScope === 'MY_ROS'
                    ? "Search my ROs, or type any customer/RO to pull up colleague orders..."
                    : "Search all shop ROs by #, customer, phone, vehicle, or tech..."
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-8 py-1.5 bg-white border-2 border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs text-slate-900 placeholder:text-slate-500 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
                  title="Clear search"
                >
                  ×
                </button>
              )}
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

          {/* Cross-Advisor Customer Call Search Pull-Up Banner (Shown when searching on My ROs view and matches are found under other advisors) */}
          {searchQuery.trim() && advisorScope === 'MY_ROS' && otherAdvisorsMatchingROs.length > 0 && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 rounded-xl shadow-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-2xs">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>Customer Call Assistance: Found {otherAdvisorsMatchingROs.length} matching order(s) under other advisors</span>
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                        Cross-Advisor Access
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Customer is on the phone? Click any repair order below to pull up full details, inspection findings, parts, and notes immediately.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvisorScope('ALL_SHOP')}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Switch to All Shop View</span>
                </button>
              </div>

              {/* Quick-action pull-up cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-blue-200">
                {otherAdvisorsMatchingROs.map(otherRO => {
                  return (
                    <div
                      key={otherRO.id}
                      onClick={() => setSelectedRO(otherRO)}
                      className="p-2.5 bg-white rounded-lg border-2 border-blue-400 hover:border-blue-600 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-blue-700">#{otherRO.id}</span>
                          <span className="font-bold text-xs text-slate-900 truncate">{otherRO.customerName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            Advisor: {otherRO.advisorName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {otherRO.vehicle.year} {otherRO.vehicle.make} {otherRO.vehicle.model} • {otherRO.primaryConcern || 'Service'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRO(otherRO);
                        }}
                        className="px-2.5 py-1 bg-blue-600 group-hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-2xs shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        <span>Pull Up RO</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Repair Orders List */}
          <div>
            {displayROs.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-slate-800 p-8 text-center space-y-2">
                <UserCheck className="w-9 h-9 text-slate-400 mx-auto mb-1" />
                <h3 className="text-sm font-bold text-slate-800">
                  {activeTab === 'COMPLETED' ? 'No completed repair orders found' : 'No repair orders in this view'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeTab === 'COMPLETED'
                    ? completedCount === 0
                      ? 'No repair orders have been completed and closed in this scope yet.'
                      : 'No completed orders match the current filter or search.'
                    : currentScopeActiveROs.length === 0 
                    ? advisorScope === 'MY_ROS'
                      ? "You currently have no active repair orders assigned. Click 'Create RO' to open one, or use the scope toggle above to pull up colleague orders."
                      : `No active repair orders found under ${activeAdvisorName}.`
                    : "No orders match the selected filter."}
                </p>
                {advisorScope === 'MY_ROS' && allActiveShopROs.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setAdvisorScope('ALL_SHOP')}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View All {allActiveShopROs.length} Shop Repair Orders</span>
                    </button>
                  </div>
                )}
              </div>
            ) : displayMode === 'CARD' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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


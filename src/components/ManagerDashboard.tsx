import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Wrench, 
  Package, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Send, 
  Truck, 
  LayoutGrid, 
  ListFilter, 
  Check, 
  Calendar, 
  Award,
  Calculator,
  ShieldCheck,
  PhoneCall
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROStatus, RepairOrder } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatEtaBadge, formatTimeOnly, formatDateTime, formatDurationSince } from '../utils/formatters';
import { CustomerCallSheetWidget } from './CustomerCallSheetWidget';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { getContactCadenceStatus, isEligibleForCadence } from '../utils/cadenceUtils';

export const ManagerDashboard: React.FC = () => {
  const { repairOrders, users, setSelectedRO, setIsNewROModalOpen, startDiagnosis } = useApp();

  const [viewSection, setViewSection] = useState<'FLOOR' | 'CALL_SHEET'>('FLOOR');
  const [selectedFollowUpRO, setSelectedFollowUpRO] = useState<RepairOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ROStatus | 'ALL' | 'CALLS_DUE'>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [displayMode, setDisplayMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Technicians & Service Writers
  const technicians = users.filter(u => u.role === 'TECHNICIAN');
  const serviceWriters = users.filter(u => 
    (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated
  );

  // Cadence tracking (Twice-per-week policy dealership overview)
  const eligibleROs = repairOrders.filter(r => isEligibleForCadence(r));
  const overdueCallsCount = eligibleROs.filter(r => getContactCadenceStatus(r).isOverdue).length;
  const dueTodayCallsCount = eligibleROs.filter(r => getContactCadenceStatus(r).isDueToday).length;
  const totalCallsDue = overdueCallsCount + dueTodayCallsCount;

  // Metrics matching user flow (Uniform with Service Advisor)
  const openROsCount = repairOrders.filter(r => r.status !== 'CLOSED' && r.status !== 'COMPLETED').length;
  const waitingDiagCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length;
  const inDiagCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length;
  const estimateDoneCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE').length;
  const waitingApprovalCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL').length;
  const approvedCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'APPROVED').length;
  const partsOrderedCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length;
  const inRepairCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS' || normalizeROStatus(r.status) === 'REPAIR_COMPLETE').length;
  const readyPickupCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'READY_FOR_PICKUP').length;
  const completedCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'CLOSED' || r.status === 'COMPLETED').length;

  // Parts arriving today
  const partsInTransit = repairOrders.flatMap(ro => 
    ro.parts
      .filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED')
      .map(p => ({ ...p, roId: ro.id, customerName: ro.customerName, techName: ro.techName }))
  );

  // Filter ROs
  const filteredROs = repairOrders.filter(ro => {
    if (urgentOnly && !ro.isUrgent) return false;
    if (statusFilter === 'CALLS_DUE') {
      const cadence = getContactCadenceStatus(ro);
      if (!cadence.needsCall) return false;
    } else if (statusFilter !== 'ALL') {
      const roNorm = normalizeROStatus(ro.status);
      const filterNorm = normalizeROStatus(statusFilter);
      if (filterNorm === 'PARTS_ORDERED') {
        if (roNorm !== 'PARTS_ORDERED' && roNorm !== 'PARTS_IN_TO_TECH') return false;
      } else if (filterNorm === 'REPAIR_IN_PROGRESS') {
        if (roNorm !== 'REPAIR_IN_PROGRESS' && roNorm !== 'REPAIR_COMPLETE') return false;
      } else if (filterNorm === 'READY_FOR_PICKUP') {
        if (roNorm !== 'READY_FOR_PICKUP' && roNorm !== 'CLOSED' && ro.status !== 'COMPLETED') return false;
      } else {
        if (roNorm !== filterNorm) return false;
      }
    }
    if (techFilter !== 'ALL' && ro.techId !== techFilter) return false;
    if (advisorFilter !== 'ALL' && ro.advisorId !== advisorFilter && ro.advisorName !== advisorFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRO = ro.id.toLowerCase().includes(q);
      const matchCustomer = ro.customerName.toLowerCase().includes(q);
      const matchVehicle = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`.toLowerCase().includes(q);
      const matchTech = ro.techName?.toLowerCase().includes(q);
      const matchPart = ro.parts.some(p => p.partNumber.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      return matchRO || matchCustomer || matchVehicle || matchTech || matchPart;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header / Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Master Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Centralized communications, live assignments, technician real-time status & parts ETA
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Section Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewSection('FLOOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewSection === 'FLOOR'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Floor Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewSection('CALL_SHEET')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewSection === 'CALL_SHEET'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Call Sheet</span>
              {totalCallsDue > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {totalCallsDue}
                </span>
              )}
            </button>
          </div>

          <button
            id="create-new-ro-btn-mgr"
            onClick={() => setIsNewROModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            + Create New RO
          </button>
        </div>
      </div>

      {/* Cadence Notification Alert for Service Manager */}
      {totalCallsDue > 0 && viewSection === 'FLOOR' && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span>Dealership 2x/Week Customer Follow-Up Policy: {totalCallsDue} Calls Pending</span>
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
                Ensure customers waiting on backordered parts, teardown, or lengthy repairs are contacted at least twice per week.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewSection('CALL_SHEET')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Manage Dealership Call Sheet</span>
          </button>
        </div>
      )}

      {viewSection === 'CALL_SHEET' ? (
        <CustomerCallSheetWidget 
          onSelectRO={setSelectedRO}
          onOpenFollowUpModal={setSelectedFollowUpRO}
        />
      ) : (
        <>

      {/* Quick Status Pill Filters (Matching Service Advisor Flow Uniformity) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        
            {/* 1. Open RO's */}
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase mb-1 truncate ${statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                Open RO's
              </div>
              <div className={`text-lg sm:text-xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-950'}`}>
                {openROsCount}
              </div>
            </button>

            {/* Cadence filter */}
            <button
              onClick={() => setStatusFilter(statusFilter === 'CALLS_DUE' ? 'ALL' : 'CALLS_DUE')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                statusFilter === 'CALLS_DUE'
                  ? 'bg-red-100 border-2 border-red-500 ring-2 ring-red-400/30 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-red-50/40 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'CALLS_DUE' ? 'text-red-900' : 'text-slate-500'}`}>
                  Calls Due (2x/Wk)
                </span>
                <PhoneCall className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-950">{totalCallsDue}</div>
            </button>

        {/* 2. Waiting Diag */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'WAITING_DIAGNOSTICS' ? 'ALL' : 'WAITING_DIAGNOSTICS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'WAITING_DIAGNOSTICS'
              ? 'bg-amber-100 border-2 border-amber-500 ring-2 ring-amber-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-amber-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'WAITING_DIAGNOSTICS' ? 'text-amber-900' : 'text-slate-500'}`}>
              Waiting Diag
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{waitingDiagCount}</div>
        </button>

        {/* 3. In Diag */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'IN_DIAG' ? 'ALL' : 'IN_DIAG')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'IN_DIAG'
              ? 'bg-blue-100 border-2 border-blue-500 ring-2 ring-blue-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-blue-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'IN_DIAG' ? 'text-blue-900' : 'text-slate-500'}`}>
              In Diag
            </span>
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{inDiagCount}</div>
        </button>

        {/* 4. Estimate Done */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'ESTIMATE_DONE' ? 'ALL' : 'ESTIMATE_DONE')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ESTIMATE_DONE'
              ? 'bg-indigo-100 border-2 border-indigo-500 ring-2 ring-indigo-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-indigo-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'ESTIMATE_DONE' ? 'text-indigo-900' : 'text-slate-500'}`}>
              Estimate Done
            </span>
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{estimateDoneCount}</div>
        </button>

        {/* 5. Needs Approval */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'WAITING_FOR_APPROVAL' ? 'ALL' : 'WAITING_FOR_APPROVAL')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'WAITING_FOR_APPROVAL'
              ? 'bg-orange-100 border-2 border-orange-500 ring-2 ring-orange-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-orange-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'WAITING_FOR_APPROVAL' ? 'text-orange-900' : 'text-slate-500'}`}>
              Needs Approval
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{waitingApprovalCount}</div>
        </button>

        {/* 6. Approved */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-teal-100 border-2 border-teal-500 ring-2 ring-teal-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-teal-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'APPROVED' ? 'text-teal-900' : 'text-slate-500'}`}>
              Approved
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{approvedCount}</div>
        </button>

        {/* 7. Parts Ordered */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'PARTS_ORDERED' ? 'ALL' : 'PARTS_ORDERED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'PARTS_ORDERED'
              ? 'bg-purple-100 border-2 border-purple-500 ring-2 ring-purple-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-purple-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'PARTS_ORDERED' ? 'text-purple-900' : 'text-slate-500'}`}>
              Parts Ordered
            </span>
            <Package className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{partsOrderedCount}</div>
        </button>

        {/* 8. In Repair */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'REPAIR_IN_PROGRESS' ? 'ALL' : 'REPAIR_IN_PROGRESS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'REPAIR_IN_PROGRESS'
              ? 'bg-cyan-100 border-2 border-cyan-500 ring-2 ring-cyan-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-cyan-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'REPAIR_IN_PROGRESS' ? 'text-cyan-900' : 'text-slate-500'}`}>
              In Repair
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{inRepairCount}</div>
        </button>

        {/* 9. Ready/Pickup */}
        <button
          onClick={() => setStatusFilter(statusFilter === 'READY_FOR_PICKUP' ? 'ALL' : 'READY_FOR_PICKUP')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'READY_FOR_PICKUP'
              ? 'bg-emerald-100 border-2 border-emerald-500 ring-2 ring-emerald-400/30 shadow-sm'
              : 'bg-white border-slate-200 hover:bg-emerald-50/40 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] font-bold uppercase truncate ${statusFilter === 'READY_FOR_PICKUP' ? 'text-emerald-900' : 'text-slate-500'}`}>
              Ready/Pickup
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-950">{readyPickupCount + completedCount}</div>
        </button>

      </div>

      {/* Technician Live Status Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Technician Real-Time Status
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {technicians.length} active technician{technicians.length === 1 ? '' : 's'}
          </span>
        </div>

        {technicians.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            No technicians registered yet. Open the Setup Wizard or Staff Directory to add technicians.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {technicians.map(tech => {
              const activeJobs = repairOrders.filter(r => r.techId === tech.id && r.status !== 'COMPLETED');
              const currentJob = activeJobs[0];

              return (
                <div 
                  key={tech.id}
                  onClick={() => currentJob && setSelectedRO(currentJob)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    currentJob 
                      ? 'border-slate-200 bg-slate-50/60 hover:border-blue-400 hover:bg-white cursor-pointer shadow-2xs' 
                      : 'border-dashed border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1 flex-wrap">
                        <span>{tech.name}</span>
                        {tech.employeeNumber && (
                          <span className="font-mono text-xs font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            {tech.employeeNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-blue-700 font-semibold truncate flex items-center gap-1">
                        <Award className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                        <span className="truncate">{tech.certificationLevel || tech.title || 'Technician'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
                    {currentJob ? (
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-blue-600 text-[11px]">{currentJob.id}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                            STATUS_CONFIG[currentJob.status]?.badgeClass || 'bg-blue-100 text-blue-700'
                          }`}>
                            {STATUS_CONFIG[currentJob.status]?.label || currentJob.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-1">
                          {currentJob.vehicle.year} {currentJob.vehicle.make} {currentJob.vehicle.model}
                        </div>

                        {/* Diagnostic Status helper in Tech card */}
                        {(currentJob.status === 'WAITING_DIAGNOSTICS' || currentJob.status === 'WAITING_DIAGNOSIS') && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-700 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              Waiting Diag ({formatDurationSince(currentJob.waitingDiagnosisAt)})
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startDiagnosis(currentJob.id);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-1.5 py-0.5 rounded text-[9px] shadow-2xs transition-colors"
                            >
                              Start Diag
                            </button>
                          </div>
                        )}
                        {(currentJob.status === 'IN_DIAG' || currentJob.status === 'BEING_DIAGNOSED' || currentJob.status === 'IN_BAY') && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                            <Wrench className="w-3 h-3 text-blue-600" />
                            <span>Diagnosing: {formatDurationSince(currentJob.diagnosisStartedAt)} active</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px] italic">
                        Tech available • Ready for assignment
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Parts Tracking & ETA Strip */}
      {partsInTransit.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Parts Tracking & Estimated Arrivals
              </h2>
            </div>
            <span className="text-xs text-orange-600 font-bold">
              {partsInTransit.length} deliveries expected today
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {partsInTransit.map(part => {
              const etaBadge = formatEtaBadge(part.estimatedArrival);
              const targetRO = repairOrders.find(r => r.id === part.roId);

              return (
                <div 
                  key={part.id}
                  onClick={() => targetRO && setSelectedRO(targetRO)}
                  className="bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-white transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-blue-600">#{part.roId}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        etaBadge.pastDue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {etaBadge.text}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 mt-1.5 truncate">
                      {part.description}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      #{part.partNumber} • {part.vendor}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-1 flex-wrap">
                      <span>Assigned Tech: <strong className="text-slate-700">{part.techName || 'Unassigned'}</strong></span>
                      {part.techName && (() => {
                        const tch = users.find(u => u.name === part.techName);
                        return tch?.employeeNumber ? (
                          <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {tch.employeeNumber}
                          </span>
                        ) : null;
                      })()}
                    </span>
                    <span className="text-blue-600 font-bold">View RO &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Repair Orders Container (Matching Professional Polish Table Pattern) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
        
        {/* Table Header with Search & Filter bar (Exact pattern from Theme) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-700 text-base">Live Repair Orders</h2>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {filteredROs.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search RO, Tech, or Customer..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ROStatus | 'ALL')}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Ticket Stages</option>
              <option value="WAITING_DIAGNOSTICS">1. Waiting Diagnostics</option>
              <option value="IN_DIAG">2. In Diag</option>
              <option value="ESTIMATE_DONE">3. Estimate Done</option>
              <option value="WAITING_FOR_APPROVAL">4. Waiting for Approval</option>
              <option value="APPROVED">5. Approved</option>
              <option value="DENIED">5b. Denied</option>
              <option value="PARTS_ORDERED">6. Parts Ordered (ETA)</option>
              <option value="PARTS_IN_TO_TECH">7. Parts In / To Tech</option>
              <option value="REPAIR_IN_PROGRESS">8. Repair in Progress</option>
              <option value="REPAIR_COMPLETE">9. Repair Complete</option>
              <option value="READY_FOR_PICKUP">10. Ready for Pickup</option>
              <option value="CLOSED">11. Closed</option>
            </select>

            {/* Service Writer (Advisor) Filter */}
            <select
              value={advisorFilter}
              onChange={e => setAdvisorFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Service Writers</option>
              {serviceWriters.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}{w.employeeNumber ? ` #${w.employeeNumber}` : ''}
                </option>
              ))}
            </select>

            {/* Tech Filter */}
            <select
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Techs</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.employeeNumber ? ` ${t.employeeNumber}` : ''}
                </option>
              ))}
            </select>

            {/* Urgent Only Filter Button */}
            <button 
              onClick={() => setUrgentOnly(!urgentOnly)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                urgentOnly 
                  ? 'bg-red-500 text-white shadow-xs' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Urgent
            </button>

            {/* View Switcher (Table vs Cards) */}
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
              <button
                onClick={() => setDisplayMode('TABLE')}
                className={`p-1.5 transition-colors ${
                  displayMode === 'TABLE' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Table View (Professional Polish)"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDisplayMode('CARDS')}
                className={`p-1.5 transition-colors ${
                  displayMode === 'CARDS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Display: Table View (From Professional Polish HTML) */}
        {displayMode === 'TABLE' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-200 font-bold">
                  <th className="px-6 py-3">RO #</th>
                  <th className="px-6 py-3">Customer & Vehicle</th>
                  <th className="px-6 py-3">Follow-Up (2x/Wk)</th>
                  <th className="px-6 py-3">Date Created</th>
                  <th className="px-6 py-3">Assigned Tech</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3">Parts Status / ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredROs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No repair orders match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredROs.map(ro => {
                    const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
                    const isWaitingParts = ro.status === 'WAITING_PARTS';
                    const activePart = ro.parts.find(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED');
                    const etaBadge = activePart ? formatEtaBadge(activePart.estimatedArrival) : null;
                    const techInitials = ro.techName
                      ? ro.techName.split(' ').map(n => n[0]).join('')
                      : '--';

                    return (
                      <tr 
                        key={ro.id}
                        id={`ro-row-${ro.id}`}
                        onClick={() => setSelectedRO(ro)}
                        className={`cursor-pointer transition-colors ${
                          ro.isUrgent 
                            ? 'bg-red-50/50 hover:bg-red-50' 
                            : isWaitingParts 
                            ? 'bg-orange-50/30 hover:bg-orange-50/50' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* RO # */}
                        <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>#{ro.id}</span>
                            {ro.isUrgent && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-400">
                                HIGH PRIORITY
                              </span>
                            )}
                            {ro.isWaiter && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-400">
                                WAITER
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 flex items-center gap-1 flex-wrap">
                            <span>Adv: {ro.advisorName}</span>
                            {(() => {
                              const adv = users.find(u => u.id === ro.advisorId || u.name === ro.advisorName);
                              return adv?.employeeNumber ? (
                                <span className="font-mono text-[10px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {adv.employeeNumber}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </td>

                        {/* Customer & Vehicle */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {ro.customerName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                          </div>
                        </td>

                        {/* Customer Follow-Up Cadence */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const cadence = getContactCadenceStatus(ro);
                            return (
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cadence.badgeClass}`}>
                                  <PhoneCall className="w-2.5 h-2.5" />
                                  <span>{cadence.label}</span>
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {cadence.lastContactText}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Date Created */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-slate-600 text-xs">
                            {formatDateTime(ro.createdAt)}
                          </div>
                        </td>

                        {/* Assigned Tech */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ro.techName ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">
                                {techInitials}
                              </div>
                              <div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-medium text-slate-700 text-xs">
                                    {ro.techName}
                                  </span>
                                  {(() => {
                                    const tch = users.find(u => u.id === ro.techId || u.name === ro.techName);
                                    return tch?.employeeNumber ? (
                                      <span className="font-mono text-xs font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        {tch.employeeNumber}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600 font-semibold italic">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold rounded-full uppercase border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                          {ro.status === 'WAITING_DIAGNOSIS' && (
                            <div className="text-[10px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Waiting {formatDurationSince(ro.waitingDiagnosisAt)}</span>
                            </div>
                          )}
                          {(ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_BAY') && (
                            <div className="text-[10px] text-blue-700 font-medium mt-1 flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Diagnosing: {formatDurationSince(ro.diagnosisStartedAt)} active</span>
                            </div>
                          )}
                        </td>

                        {/* Parts Status / ETA */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ro.parts.length > 0 ? (
                            <div className="flex flex-col">
                              {activePart ? (
                                <>
                                  <span className="text-xs font-bold text-orange-600">
                                    {activePart.status.replace('_', ' ')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                    {etaBadge?.text}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-emerald-600">
                                    In Hand / Issued
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {ro.parts.length} part{ro.parts.length > 1 ? 's' : ''} staged
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No parts required</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Display: Cards Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredROs.map(ro => (
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

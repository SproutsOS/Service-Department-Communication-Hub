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
  Calendar
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROStatus } from '../types';
import { STATUS_CONFIG } from '../data/mockData';
import { formatEtaBadge, formatTimeOnly, formatDateTime, formatDurationSince } from '../utils/formatters';

export const ManagerDashboard: React.FC = () => {
  const { repairOrders, users, setSelectedRO, setIsNewROModalOpen, startDiagnosis } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ROStatus | 'ALL'>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [displayMode, setDisplayMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Technicians
  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  // Metrics (Matching Professional Polish Theme)
  const totalOpen = repairOrders.filter(r => r.status !== 'COMPLETED').length;
  const waitingDiagCount = repairOrders.filter(r => r.status === 'WAITING_DIAGNOSIS').length;
  const beingDiagnosedCount = repairOrders.filter(r => r.status === 'BEING_DIAGNOSED' || r.status === 'IN_BAY').length;
  const gettingEstimateCount = repairOrders.filter(r => r.status === 'GETTING_ESTIMATE').length;
  const waitingApprovalCount = repairOrders.filter(r => r.status === 'WAITING_APPROVAL').length;
  const approvedCount = repairOrders.filter(r => r.status === 'APPROVED').length;
  const waitingPartsCount = repairOrders.filter(r => r.status === 'WAITING_PARTS').length;
  const readyQC = repairOrders.filter(r => r.status === 'QC_TEST' || r.status === 'COMPLETED').length;

  // Parts arriving today
  const partsInTransit = repairOrders.flatMap(ro => 
    ro.parts
      .filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED')
      .map(p => ({ ...p, roId: ro.id, customerName: ro.customerName, techName: ro.techName }))
  );

  // Filter ROs
  const filteredROs = repairOrders.filter(ro => {
    if (urgentOnly && !ro.isUrgent) return false;
    if (statusFilter !== 'ALL' && ro.status !== statusFilter) return false;
    if (techFilter !== 'ALL' && ro.techId !== techFilter) return false;

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
            Master Service Floor Board
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Centralized communications, live assignments, technician real-time status & parts ETA
          </p>
        </div>

        <button
          id="create-new-ro-btn-mgr"
          onClick={() => setIsNewROModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          + Create New RO
        </button>
      </div>

      {/* 5 KPI Stats Cards with Dedicated Diagnostic Phase Visibility */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 shrink-0">
        
        {/* Open Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase mb-1">Open Orders</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800">{totalOpen}</div>
          <div className="text-[11px] text-slate-400 mt-1">Total active jobs in shop</div>
        </div>

        {/* Waiting to be Diagnosed */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'WAITING_DIAGNOSIS' ? 'ALL' : 'WAITING_DIAGNOSIS')}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'WAITING_DIAGNOSIS' 
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400' 
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-amber-700 uppercase">Waiting Diag</div>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{waitingDiagCount}</div>
          <div className="text-[11px] text-amber-800 font-medium mt-1">Queued for technician check</div>
        </div>

        {/* Being Diagnosed */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'BEING_DIAGNOSED' ? 'ALL' : 'BEING_DIAGNOSED')}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'BEING_DIAGNOSED' 
              ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400' 
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-blue-700 uppercase">Being Diagnosed</div>
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{beingDiagnosedCount}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Active scan & teardown</div>
        </div>

        {/* Waiting on Parts */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'WAITING_PARTS' ? 'ALL' : 'WAITING_PARTS')}
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'WAITING_PARTS' 
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400' 
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase">Waiting Parts</div>
            <Package className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-500 mt-1">{waitingPartsCount}</div>
          <div className="text-[11px] text-orange-600 font-medium mt-1">
            {partsInTransit.length} delivery ETA(s) live
          </div>
        </div>

        {/* Ready / QC */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-bold text-slate-500 uppercase mb-1">Ready / QC</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{readyQC}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Road test or delivery
          </div>
        </div>

      </div>

      {/* Technician Bay Live Status Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Technician Bay Real-Time Status
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {technicians.length} technician stall{technicians.length === 1 ? '' : 's'}
          </span>
        </div>

        {technicians.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            No technicians registered yet. Open the Setup Wizard or Staff Directory to add technicians and assign bay numbers.
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
                    <img 
                      src={tech.avatar} 
                      alt={tech.name} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{tech.name}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold truncate">{tech.bayNumber || 'Stall unassigned'}</div>
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

                        {/* Diagnostic Status helper in Bay card */}
                        {currentJob.status === 'WAITING_DIAGNOSIS' && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-amber-700 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
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
                        {(currentJob.status === 'BEING_DIAGNOSED' || currentJob.status === 'IN_BAY') && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                            <Wrench className="w-3 h-3 text-blue-600" />
                            <span>Diagnosing: {formatDurationSince(currentJob.diagnosisStartedAt)} active</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px] italic">
                        Bay idle • Ready for assignment
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
                    <span>Assigned Tech: <strong className="text-slate-700">{part.techName || 'Unassigned'}</strong></span>
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
              <option value="ALL">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="DISPATCHED">Assigned</option>
              <option value="WAITING_DIAGNOSIS">Waiting to be Diagnosed</option>
              <option value="BEING_DIAGNOSED">Being Diagnosed</option>
              <option value="GETTING_ESTIMATE">Getting Estimate</option>
              <option value="WAITING_APPROVAL">Needs Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="WAITING_PARTS">Waiting Parts</option>
              <option value="IN_REPAIR">In Repair</option>
              <option value="QC_TEST">Quality Check/Test Drive</option>
              <option value="COMPLETED">Ready / Done</option>
            </select>

            {/* Tech Filter */}
            <select
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">All Techs</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
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
                          <div className="flex items-center gap-1.5">
                            <span>#{ro.id}</span>
                            {ro.isUrgent && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Adv: {ro.advisorName}
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
                                <span className="font-medium text-slate-700 block text-xs">
                                  {ro.techName}
                                </span>
                                {ro.bay && (
                                  <span className="text-[10px] text-slate-400 block">
                                    {ro.bay}
                                  </span>
                                )}
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

    </div>
  );
};

import React, { useState } from 'react';
import { 
  Wrench, 
  Clock, 
  Package, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  Play, 
  Calendar, 
  Send,
  Truck,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { ROStatus } from '../types';
import { formatDateTime, formatEtaBadge, calculateDispatchedDuration, formatDurationSince, getDiagnosticStatusDetails, formatTimeOnly } from '../utils/formatters';

export const TechDashboard: React.FC = () => {
  const { 
    currentUser, 
    repairOrders, 
    setSelectedRO, 
    updateROStatus, 
    startDiagnosis
  } = useApp();

  // Filter strictly to this technician's assigned ROs
  const myROs = repairOrders.filter(ro => ro.techId === currentUser.id);

  const activeROs = myROs.filter(ro => 
    ro.status !== 'CLOSED' && 
    ro.status !== 'COMPLETED' && 
    normalizeROStatus(ro.status) !== 'REPAIR_COMPLETE' && 
    normalizeROStatus(ro.status) !== 'READY_FOR_PICKUP'
  );
  const completedROs = myROs.filter(ro => 
    ro.status === 'CLOSED' || 
    ro.status === 'COMPLETED' || 
    normalizeROStatus(ro.status) === 'REPAIR_COMPLETE' || 
    normalizeROStatus(ro.status) === 'READY_FOR_PICKUP'
  );

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');

  const displayList = activeTab === 'ACTIVE' ? activeROs : completedROs;

  const handleQuickStatus = (e: React.MouseEvent, roId: string, newStatus: ROStatus) => {
    e.stopPropagation();
    updateROStatus(roId, newStatus, `1-tap status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus} by ${currentUser.name}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-800 text-white rounded-xl p-5 sm:p-6 border border-slate-700 shadow-sm relative">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-600 ring-2 ring-blue-400 text-white font-bold text-base flex items-center justify-center shrink-0">
              {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">{currentUser.name}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-blue-400" />
                  <span>{currentUser.certificationLevel || currentUser.bayNumber || 'Technician'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {currentUser.title}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider block">
              Assigned Total:
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white block mt-0.5">
              {activeROs.length}
            </span>
          </div>
        </div>

        {/* Quick Bay Metrics including Diagnostic Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-700 text-xs">
          <div>
            <span className="text-amber-400 text-[11px] uppercase font-bold tracking-wider block">Waiting Diag:</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length}
            </span>
          </div>
          <div>
            <span className="text-blue-400 text-[11px] uppercase font-bold tracking-wider block">In Diag:</span>
            <span className="text-2xl font-black text-blue-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length}
            </span>
          </div>
          <div>
            <span className="text-indigo-400 text-[11px] uppercase font-bold tracking-wider block">Waiting on Approval:</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE' || normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL' || normalizeROStatus(r.status) === 'APPROVED').length}
            </span>
          </div>
          <div>
            <span className="text-orange-400 text-[11px] uppercase font-bold tracking-wider block">Parts on Order:</span>
            <span className="text-2xl font-black text-orange-400 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length}
            </span>
          </div>
          <div>
            <span className="text-cyan-400 text-[11px] uppercase font-bold tracking-wider block">In Repair:</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">
              {myROs.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS').length}
            </span>
          </div>
          <div>
            <span className="text-emerald-400 text-[11px] uppercase font-bold tracking-wider block">Finished:</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {completedROs.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'ACTIVE' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Active Repair Orders ({activeROs.length})
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'COMPLETED' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Finished ({completedROs.length})
        </button>
      </div>

      {/* Technician Jobs List with 1-Click Status Controls */}
      <div className="space-y-4">
        {displayList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Your Bay Queue is Clear</h3>
            <p className="text-xs text-slate-500 mt-1">
              No repair orders currently in this queue. When a Service Advisor assigns work to your bay, it will show up here immediately with real-time push alerts.
            </p>
          </div>
        ) : (
          displayList.map(ro => {
            const statusInfo = STATUS_CONFIG[ro.status] || STATUS_CONFIG.CREATED;
            const hasPartsETA = ro.parts.some(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED');

            return (
              <div
                key={ro.id}
                id={`tech-ro-card-${ro.id}`}
                onClick={() => setSelectedRO(ro)}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 transition-all cursor-pointer space-y-4"
              >
                {/* Header: RO, Customer, Vehicle, Assigned Time */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-blue-600">#{ro.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                      {ro.isUrgent && (
                        <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Urgent
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm font-semibold text-slate-800">
                      {ro.customerName} • {ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-slate-500">
                    <div className="flex items-center sm:justify-end gap-1 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {calculateDispatchedDuration(ro.dispatchedAt)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Advisor: {ro.advisorName}
                    </div>
                  </div>
                </div>

                {/* Diagnostic Phase Callout: Waiting vs Being Diagnosed */}
                {ro.status === 'WAITING_DIAGNOSIS' && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Vehicle is Waiting to be Diagnosed</span>
                      </div>
                      <div className="text-xs text-amber-800 mt-0.5">
                        Staged in bay • In queue since {formatTimeOnly(ro.waitingDiagnosisAt)} ({formatDurationSince(ro.waitingDiagnosisAt)} wait)
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startDiagnosis(ro.id);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Begin Diagnosis Now</span>
                    </button>
                  </div>
                )}

                {ro.status === 'BEING_DIAGNOSED' && (
                  <div className="bg-blue-50 border border-blue-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs uppercase tracking-wide">
                        <Wrench className="w-4 h-4 text-blue-600" />
                        <span>Vehicle is Being Diagnosed</span>
                      </div>
                      <div className="text-xs text-blue-800 mt-0.5">
                        Diagnostic testing & scan underway • Started at {formatTimeOnly(ro.diagnosisStartedAt)} ({formatDurationSince(ro.diagnosisStartedAt)} active)
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
                      Active Inspection
                    </span>
                  </div>
                )}

                {/* Complaint / Diagnostic findings */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Customer Concern:</span>
                  <p className="text-slate-800 font-medium">{ro.primaryConcern}</p>
                </div>

                {/* Prominent Parts Arrival Tracker */}
                {ro.parts.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-orange-600" />
                        Parts Ordered & Estimated Arrival Time
                      </span>
                      {hasPartsETA && (
                        <span className="text-[10px] font-bold uppercase text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                          Live Delivery
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {ro.parts.map(part => {
                        const etaBadge = formatEtaBadge(part.estimatedArrival);
                        return (
                          <div 
                            key={part.id} 
                            className="flex items-center justify-between text-xs bg-white p-2 rounded-md border border-slate-200"
                          >
                            <div className="truncate pr-2">
                              <span className="font-mono text-slate-400 text-[11px] mr-1.5">#{part.partNumber}</span>
                              <span className="font-semibold text-slate-800">{part.description}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {part.status.replace('_', ' ')}
                              </span>
                              {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  etaBadge.pastDue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {etaBadge.text}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Real-Time Technician Status Actions */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Quick Bay Status Updates:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'WAITING_DIAGNOSTICS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'WAITING_DIAGNOSTICS'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Waiting Diag
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'IN_DIAG')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'IN_DIAG'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      In Diag
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'ESTIMATE_DONE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'ESTIMATE_DONE'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Estimate Done
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'PARTS_IN_TO_TECH')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'PARTS_IN_TO_TECH'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Parts In / To Tech
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'REPAIR_IN_PROGRESS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'REPAIR_IN_PROGRESS'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Repair in Progress
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'REPAIR_COMPLETE')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        normalizeROStatus(ro.status) === 'REPAIR_COMPLETE'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Repair Complete
                    </button>

                    <button
                      onClick={(e) => handleQuickStatus(e, ro.id, 'READY_FOR_PICKUP')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white ml-auto cursor-pointer"
                    >
                      Ready for Pickup
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ro.messages.length} messages with {ro.advisorName}</span>
                  </div>
                  <span className="text-blue-600 font-bold">
                    Open Full RO Thread &rarr;
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

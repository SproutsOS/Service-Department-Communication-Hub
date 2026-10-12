import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Wrench, 
  Car, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  User as UserIcon, 
  UserCheck, 
  Search, 
  ChevronRight, 
  Award, 
  Phone, 
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Tag
} from 'lucide-react';
import { RepairOrder, User, ROStatus } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatDurationSince, formatDateTime, cleanRO3700 } from '../utils/formatters';
import { ROStickyNoteChip } from './ROStickyNoteBadge';

interface TechWorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tech: User | null;
  repairOrders: RepairOrder[];
  onSelectRO: (ro: RepairOrder) => void;
  onStartDiag?: (roId: string) => void;
}

export const TechWorkloadModal: React.FC<TechWorkloadModalProps> = ({
  isOpen,
  onClose,
  tech,
  repairOrders,
  onSelectRO,
  onStartDiag,
}) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ALL' | 'DIAG' | 'PARTS' | 'REPAIR' | 'COMPLETED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab on tech change
  useEffect(() => {
    setActiveTab('ACTIVE');
    setSearchQuery('');
  }, [tech?.id]);

  // All repair orders assigned to this tech
  const assignedROs = useMemo(() => {
    if (!tech) return [];
    const techNameClean = tech.name.trim().toLowerCase();
    return repairOrders
      .map(cleanRO3700)
      .filter(ro => 
        ro.techId === tech.id || 
        (ro.concernTechIds && ro.concernTechIds.some(id => id === tech.id)) ||
        (ro.techName && ro.techName.trim().toLowerCase() === techNameClean) ||
        (ro.concernTechNames && ro.concernTechNames.some(name => name && name.trim().toLowerCase() === techNameClean))
      );
  }, [repairOrders, tech]);

  // Status categories
  const activeROs = useMemo(() => {
    return assignedROs.filter(ro => ro.status !== 'COMPLETED' && ro.status !== 'CLOSED');
  }, [assignedROs]);

  const diagROs = useMemo(() => {
    return assignedROs.filter(ro => 
      ['WAITING_DIAGNOSTICS', 'WAITING_DIAGNOSIS', 'IN_DIAG', 'BEING_DIAGNOSED', 'IN_BAY'].includes(ro.status)
    );
  }, [assignedROs]);

  const partsROs = useMemo(() => {
    return assignedROs.filter(ro => 
      ro.status === 'PARTS_ORDERED' || 
      ro.status === 'PARTS_IN_TO_TECH' ||
      (ro.parts && ro.parts.some(p => p.status === 'ORDERED' || p.status === 'BACKORDERED'))
    );
  }, [assignedROs]);

  const repairROs = useMemo(() => {
    return assignedROs.filter(ro => 
      ['APPROVED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETE', 'READY_FOR_PICKUP'].includes(ro.status)
    );
  }, [assignedROs]);

  const completedROs = useMemo(() => {
    return assignedROs.filter(ro => ro.status === 'COMPLETED' || ro.status === 'CLOSED');
  }, [assignedROs]);

  // Tab filtering
  const tabFilteredROs = useMemo(() => {
    switch (activeTab) {
      case 'ACTIVE':
        return activeROs;
      case 'DIAG':
        return diagROs;
      case 'PARTS':
        return partsROs;
      case 'REPAIR':
        return repairROs;
      case 'COMPLETED':
        return completedROs;
      case 'ALL':
      default:
        return assignedROs;
    }
  }, [activeTab, activeROs, diagROs, partsROs, repairROs, completedROs, assignedROs]);

  // Search filtering
  const displayedROs = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredROs;
    const q = searchQuery.toLowerCase().trim();
    return tabFilteredROs.filter(ro => {
      const matchId = ro.id.toLowerCase().includes(q);
      const matchCust = (ro.customerName || '').toLowerCase().includes(q);
      const matchPhone = (ro.customerPhone || '').includes(q);
      const matchVeh = `${ro.vehicle?.year || ''} ${ro.vehicle?.make || ''} ${ro.vehicle?.model || ''} ${ro.vehicle?.vin || ''} ${ro.vehicle?.licensePlate || ''}`.toLowerCase().includes(q);
      const matchConcern = `${ro.primaryConcern || ''} ${(ro.concerns || []).join(' ')}`.toLowerCase().includes(q);
      return matchId || matchCust || matchPhone || matchVeh || matchConcern;
    });
  }, [tabFilteredROs, searchQuery]);

  if (!isOpen || !tech) return null;

  const techInitials = tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T';

  return (
    <div 
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md ring-2 ring-blue-400/40">
              {techInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white tracking-tight">
                  {tech.name}
                </h3>
                {tech.employeeNumber && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                    Emp #{tech.employeeNumber}
                  </span>
                )}
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Technician Active
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="flex items-center gap-1 text-blue-300 font-semibold">
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>{tech.certificationLevel || tech.title || 'Master Technician'}</span>
                </span>
                {tech.bayNumber && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 font-medium">Bay: {tech.bayNumber}</span>
                  </>
                )}
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-bold">
                  {activeROs.length} Active Assigned {activeROs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-slate-400">Total All-Time:</span>
              <span className="font-mono font-bold text-white">{assignedROs.length} ROs</span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation & Search Bar */}
        <div className="bg-slate-50 p-3 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Workload Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>Active Workload</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'ACTIVE' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-800 font-bold'
              }`}>
                {activeROs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('DIAG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DIAG'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>In Diag / Testing</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'DIAG' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-800 font-bold'
              }`}>
                {diagROs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('PARTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PARTS'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>Waiting on Parts</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'PARTS' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-800 font-bold'
              }`}>
                {partsROs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('REPAIR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REPAIR'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>Repair Progress</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'REPAIR' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-800 font-bold'
              }`}>
                {repairROs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>All ({assignedROs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'COMPLETED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>History ({completedROs.length})</span>
            </button>
          </div>

          {/* Quick Search in this tech's workload */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter RO #, vehicle, customer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
            />
          </div>
        </div>

        {/* Modal Body: Grid of Small Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70">
          {displayedROs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Wrench className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {searchQuery ? 'No matching repair orders' : 'No repair orders in this category'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery 
                  ? `No assigned ROs match "${searchQuery}". Clear search to view all.`
                  : activeTab === 'ACTIVE' 
                  ? `${tech.name} has no active jobs right now. This technician is available and ready for dispatch.` 
                  : `No repair orders found under ${activeTab.toLowerCase()} status for ${tech.name}.`}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedROs.map(ro => {
                const statusInfo = STATUS_CONFIG[ro.status] || {
                  label: ro.status.replace(/_/g, ' '),
                  badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
                  color: 'text-slate-800',
                  bg: 'bg-slate-50'
                };

                const isWaitingDiag = ro.status === 'WAITING_DIAGNOSTICS' || ro.status === 'WAITING_DIAGNOSIS';
                const isDiagnosing = ro.status === 'IN_DIAG' || ro.status === 'BEING_DIAGNOSED' || ro.status === 'IN_BAY';
                const hasOrderedParts = (ro.parts || []).some(p => p.status === 'ORDERED' || p.status === 'BACKORDERED');
                const waitingPartsCount = (ro.parts || []).filter(p => p.status === 'ORDERED' || p.status === 'BACKORDERED').length;

                return (
                  <div
                    key={ro.id}
                    onClick={() => onSelectRO(ro)}
                    className="bg-white hover:bg-blue-50/40 rounded-xl border-2 border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-md p-4 transition-all cursor-pointer flex flex-col justify-between group relative"
                  >
                    <div>
                      {/* Top Row: RO ID & Status Badges */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            RO #{ro.id}
                          </span>
                          {ro.isWaiter && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-red-600 text-white animate-pulse">
                              Waiter
                            </span>
                          )}
                          {ro.isUrgent && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white">
                              Priority
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Vehicle Details */}
                      <div className="mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {ro.vehicle?.year} {ro.vehicle?.make} {ro.vehicle?.model}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 pl-5 font-mono">
                          {ro.vehicle?.licensePlate && (
                            <span className="font-bold text-slate-700">Tag: {ro.vehicle.licensePlate}</span>
                          )}
                          {ro.vehicle?.vin && (
                            <span>VIN: ...{ro.vehicle.vin.slice(-6)}</span>
                          )}
                        </div>
                      </div>

                      {/* Customer & Advisor */}
                      <div className="mt-2 text-xs text-slate-600 space-y-0.5 pl-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <strong className="text-slate-900">{ro.customerName}</strong>
                            {ro.customerPhone && <span className="text-slate-500 font-mono text-[11px]"> ({ro.customerPhone})</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Advisor: <strong className="text-slate-700">{ro.advisorName || 'Assigned'}</strong></span>
                        </div>
                      </div>

                      {/* Primary Complaint / Concern Preview */}
                      {(ro.primaryConcern || (ro.concerns && ro.concerns.length > 0)) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 bg-slate-50/70 p-2 rounded-lg text-xs">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                            Customer Concern:
                          </span>
                          <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                            {ro.primaryConcern || ro.concerns?.[0] || 'No primary complaint specified'}
                          </p>
                        </div>
                      )}

                      {/* Live Status Indicators (Diag timer, Parts ETA) */}
                      {isWaitingDiag && (
                        <div className="mt-2 pt-2 border-t border-amber-100 flex items-center justify-between text-xs text-amber-800 bg-amber-50 p-2 rounded-lg">
                          <span className="flex items-center gap-1 text-[11px] font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Waiting Diag ({formatDurationSince(ro.waitingDiagnosisAt) || 'Ready'})
                          </span>
                          {onStartDiag && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartDiag(ro.id);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-2xs transition-colors cursor-pointer"
                            >
                              Start Diag
                            </button>
                          )}
                        </div>
                      )}

                      {isDiagnosing && (
                        <div className="mt-2 pt-2 border-t border-blue-100 flex items-center gap-1 text-[11px] text-blue-800 bg-blue-50 p-2 rounded-lg font-medium">
                          <Wrench className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                          <span>Diagnosing: {formatDurationSince(ro.diagnosisStartedAt) || 'In Bay'} active</span>
                        </div>
                      )}

                      {hasOrderedParts && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-purple-800 bg-purple-50 p-1.5 rounded-lg font-medium border border-purple-200">
                          <Package className="w-3 h-3 text-purple-600" />
                          <span>Waiting on {waitingPartsCount} part{waitingPartsCount === 1 ? '' : 's'} on order</span>
                        </div>
                      )}

                      {/* Digital Sticky Note chip if attached */}
                      {ro.stickyNote && (
                        <div className="mt-2">
                          <ROStickyNoteChip roId={ro.id} stickyNote={ro.stickyNote} />
                        </div>
                      )}
                    </div>

                    {/* Bottom Card Footer: Clickable Action Cue */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-800">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-500 font-normal">In Shop: {formatDurationSince(ro.createdAt) || 'Recent'}</span>
                      </span>
                      <span className="flex items-center gap-0.5 group-hover:underline">
                        <span>See Whole RO</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Controls */}
        <div className="bg-white p-3.5 sm:px-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-semibold text-slate-700">
              Showing {displayedROs.length} of {assignedROs.length} repair orders assigned to {tech.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

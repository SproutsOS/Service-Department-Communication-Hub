import React, { useState, useMemo } from 'react';
import { 
  Archive, 
  Search, 
  X, 
  Calendar, 
  User, 
  Car, 
  Wrench, 
  Printer, 
  RotateCcw, 
  Eye, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Filter,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RepairOrder, ConcernPayType } from '../types';
import { formatMilitaryDate, formatMilitaryDateTime, sortROsNumerically, matchesROSearch } from '../utils/formatters';
import { normalizeROStatus, STATUS_CONFIG } from '../data/mockData';

export const ArchivedROsModal: React.FC = () => {
  const { 
    isArchivedROsModalOpen, 
    closeArchivedROsModal, 
    repairOrders, 
    users, 
    setSelectedRO, 
    openQuotePrintModal, 
    openWarrantyPrintModal,
    unarchiveRepairOrder,
    currentUser
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [payTypeFilter, setPayTypeFilter] = useState<'ALL' | ConcernPayType>('ALL');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH'>('ALL');
  const [selectedArchivedRO, setSelectedArchivedRO] = useState<RepairOrder | null>(null);

  // Filter list to all Closed / Completed / Archived repair orders
  const archivedROs = useMemo(() => {
    return repairOrders.filter(ro => 
      ro.status === 'CLOSED' || 
      ro.status === 'COMPLETED' || 
      Boolean(ro.isArchived)
    );
  }, [repairOrders]);

  const advisors = useMemo(() => {
    return users.filter(u => (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated);
  }, [users]);

  const technicians = useMemo(() => {
    return users.filter(u => u.role === 'TECHNICIAN' && !u.isDeactivated);
  }, [users]);

  // Filtered archived list based on user search & filters
  const filteredROs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return archivedROs.filter(ro => {
      // Pay Type Filter
      if (payTypeFilter !== 'ALL') {
        const hasMatchingPayType = (ro.concernPayTypes || []).includes(payTypeFilter) ||
          ro.quote?.payType === payTypeFilter ||
          (ro.quote?.laborItems || []).some(l => l.payType === payTypeFilter);
        if (!hasMatchingPayType) return false;
      }

      // Advisor Filter
      if (advisorFilter !== 'ALL' && ro.advisorId !== advisorFilter && ro.advisorName !== advisorFilter) {
        return false;
      }

      // Tech Filter
      if (techFilter !== 'ALL' && ro.techId !== techFilter && !(ro.concernTechIds || []).includes(techFilter)) {
        return false;
      }

      // Date Range Filter
      if (dateRangeFilter !== 'ALL') {
        const closedDateStr = (ro.closedAt || ro.completedAt || ro.updatedAt || ro.createdAt || '').split('T')[0];
        if (dateRangeFilter === 'TODAY' && closedDateStr !== todayStr) {
          return false;
        }
        if (dateRangeFilter === '7DAYS') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
          if (closedDateStr < sevenDaysStr) return false;
        }
        if (dateRangeFilter === '30DAYS') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];
          if (closedDateStr < thirtyDaysStr) return false;
        }
        if (dateRangeFilter === 'THIS_MONTH') {
          const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM
          if (!closedDateStr.startsWith(currentMonthPrefix)) return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesStandard = matchesROSearch(ro, searchQuery, users);
        const matchClosedBy = (ro.archivedBy || '').toLowerCase().includes(q);
        const matchCorrection = (ro.correction || '').toLowerCase().includes(q) || (ro.concernCorrections || []).some(c => (c || '').toLowerCase().includes(q));
        if (!matchesStandard && !matchClosedBy && !matchCorrection) {
          return false;
        }
      }

      return true;
    });
  }, [archivedROs, searchQuery, payTypeFilter, advisorFilter, techFilter, dateRangeFilter, users]);

  // Sorted list: Most recently closed first
  const sortedFilteredROs = useMemo(() => {
    return [...filteredROs].sort((a, b) => {
      const timeA = new Date(a.closedAt || a.completedAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.closedAt || b.completedAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [filteredROs]);

  // Overall statistics for the archived repository
  const totalSettledRevenue = useMemo(() => {
    return filteredROs.reduce((acc, ro) => {
      if (ro.quote?.grandTotal) return acc + ro.quote.grandTotal;
      // Calculate from parts + labor if quote object total isn't cached
      const partsTotal = (ro.parts || []).reduce((pAcc, p) => pAcc + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
      const laborHours = (ro.quote?.laborItems || []).reduce((lAcc, l) => lAcc + (Number(l.laborHours) || 0), 0);
      const laborTotal = laborHours * (ro.quote?.defaultLaborRate || 150);
      return acc + partsTotal + laborTotal;
    }, 0);
  }, [filteredROs]);

  const warrantyROCount = useMemo(() => {
    return filteredROs.filter(ro => 
      (ro.concernPayTypes || []).includes('WARRANTY') || 
      (ro.concernPayTypes || []).includes('EXTENDED_WARRANTY')
    ).length;
  }, [filteredROs]);

  const handleOpenRODetails = (ro: RepairOrder) => {
    setSelectedRO(ro);
  };

  const handleReopenRO = (ro: RepairOrder) => {
    const isManager = currentUser.role === 'SERVICE_MANAGER';
    const confirmMsg = `Are you sure you want to REOPEN and UNARCHIVE Repair Order #${ro.id} for ${ro.customerName}?\n\nThis will move the repair order back to active workstations in "Ready for Pickup" status.`;
    if (window.confirm(confirmMsg)) {
      unarchiveRepairOrder(ro.id, 'READY_FOR_PICKUP', `Reopened from Closed Archive by ${currentUser.name} (${currentUser.role})`);
    }
  };

  if (!isArchivedROsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-7xl max-h-[92vh] rounded-2xl shadow-2xl border-2 border-slate-700 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Archived Repair Orders Repository
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-2xs">
                  {archivedROs.length} Settled Records
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Permanently preserved closed repair orders, invoices, and warranty punch records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={closeArchivedROsModal}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Close Archive"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Archived Invoices</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 block mt-0.5">
              {filteredROs.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Of {archivedROs.length} total historical tickets</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total Settled Value</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 block mt-0.5">
              ${totalSettledRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Labor, parts & shop charges</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Warranty Verification</span>
            <span className="text-xl sm:text-2xl font-black text-blue-700 block mt-0.5">
              {warrantyROCount} <span className="text-xs text-slate-400 font-bold">ROs</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Labor punch records logged</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Repository Status</span>
            <span className="text-sm font-black text-emerald-700 block mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Isolated from Active Workstations</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Cleared from live advisor & tech queues</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by RO #, Customer, Phone, VIN, Vehicle, Advisor, Tech, or Diagnostic Finding..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border-2 border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters dropdowns */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Date Range Filter */}
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Closed Dates</option>
              <option value="TODAY">Settled Today</option>
              <option value="7DAYS">Past 7 Days</option>
              <option value="30DAYS">Past 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>

            {/* Pay Type Filter */}
            <select
              value={payTypeFilter}
              onChange={e => setPayTypeFilter(e.target.value as any)}
              className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Pay Types</option>
              <option value="CUSTOMER_PAY">Customer Pay</option>
              <option value="WARRANTY">Warranty</option>
              <option value="INTERNAL">Internal</option>
              <option value="EXTENDED_WARRANTY">Ext. Warranty</option>
            </select>

            {/* Advisor Filter */}
            <select
              value={advisorFilter}
              onChange={e => setAdvisorFilter(e.target.value)}
              className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Advisors</option>
              {advisors.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Tech Filter */}
            <select
              value={techFilter}
              onChange={e => setTechFilter(e.target.value)}
              className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Technicians</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable List of Archived Repair Orders */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-100">
          {sortedFilteredROs.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-center text-slate-500 space-y-2 max-w-md mx-auto my-8">
              <Archive className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
              <h3 className="font-bold text-sm text-slate-800">No Archived Repair Orders Found</h3>
              <p className="text-xs text-slate-500">
                {searchQuery || payTypeFilter !== 'ALL' || advisorFilter !== 'ALL' || techFilter !== 'ALL' || dateRangeFilter !== 'ALL'
                  ? 'No archived repair orders match your search criteria. Try clearing filters.'
                  : 'When repair orders are closed and settled, they will be archived here permanently and removed from active workstations.'}
              </p>
              {(searchQuery || payTypeFilter !== 'ALL' || advisorFilter !== 'ALL' || techFilter !== 'ALL' || dateRangeFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPayTypeFilter('ALL');
                    setAdvisorFilter('ALL');
                    setTechFilter('ALL');
                    setDateRangeFilter('ALL');
                  }}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            sortedFilteredROs.map(ro => {
              const concernsList = (ro.concerns && ro.concerns.length > 0)
                ? ro.concerns
                : [ro.primaryConcern || 'General Service'];
              const punchesCount = ro.timePunches?.length || 0;
              const hasWarranty = (ro.concernPayTypes || []).some(pt => pt === 'WARRANTY' || pt === 'EXTENDED_WARRANTY');
              const grandTotal = ro.quote?.grandTotal;
              const closedTimestamp = ro.closedAt || ro.completedAt || ro.updatedAt || ro.createdAt;

              return (
                <div 
                  key={ro.id}
                  className="bg-white rounded-xl border-2 border-slate-300 hover:border-blue-400 transition-all p-4 shadow-2xs hover:shadow-sm space-y-3"
                >
                  {/* Top Bar: RO ID, Customer, Closed Date, Grand Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-black px-3 py-1 rounded-lg bg-slate-900 text-white shadow-2xs">
                        RO #{ro.id}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                        Closed & Archived
                      </span>
                      {hasWarranty && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                          Warranty Verified
                        </span>
                      )}
                      {ro.isTaxExempt && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          0% Tax Exempt
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {grandTotal !== undefined && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Settled Total:</span>
                          <span className="text-sm sm:text-base font-black text-emerald-700 font-mono">
                            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="text-right pl-3 border-l border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Closed Date:</span>
                        <span className="text-xs font-bold text-slate-700 font-mono">
                          {formatMilitaryDate(closedTimestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Details: Customer, Vehicle, Line items, Diagnostics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    
                    {/* Customer & Vehicle */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{ro.customerName}</span>
                      </div>
                      <div className="text-slate-600 font-mono text-[11px]">{ro.customerPhone}</div>
                      <div className="text-slate-800 font-bold flex items-center gap-1.5 pt-1 border-t border-slate-200">
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        <span>{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>VIN: {ro.vehicle.vin}</span>
                        {ro.outMileage && <span>• Out: {ro.outMileage.toLocaleString()} mi</span>}
                      </div>
                    </div>

                    {/* Staff Assignment & Turnaround */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="text-slate-700 font-medium">
                        Service Advisor: <strong className="text-slate-900 font-bold">{ro.advisorName}</strong>
                      </div>
                      <div className="text-slate-700 font-medium">
                        Lead Technician: <strong className="text-slate-900 font-bold">{ro.techName || 'Unassigned'}</strong>
                      </div>
                      {ro.archivedBy && (
                        <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                          Archived by: <span className="font-bold text-slate-700">{ro.archivedBy}</span>
                        </div>
                      )}
                      {punchesCount > 0 && (
                        <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          <span>{punchesCount} Warranty punch logs recorded</span>
                        </div>
                      )}
                    </div>

                    {/* Concerns / Repairs performed */}
                    <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Concerns & Resolution:</span>
                      <div className="space-y-0.5">
                        {concernsList.slice(0, 2).map((c, i) => (
                          <p key={i} className="text-slate-800 truncate text-[11px] font-medium">
                            <strong>L{i + 1}:</strong> {c}
                          </p>
                        ))}
                      </div>
                      {ro.correction && (
                        <p className="text-[11px] text-emerald-800 font-medium truncate pt-1 border-t border-slate-200">
                          <strong>Correction:</strong> {ro.correction}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenRODetails(ro)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="View Full Repair Order Record & Audit History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View RO Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openQuotePrintModal(ro.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer border border-slate-600 shadow-2xs"
                        title="Print Final Invoice / Repair Estimate"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                        <span>Print Invoice</span>
                      </button>

                      {hasWarranty && (
                        <button
                          type="button"
                          onClick={() => openWarrantyPrintModal(ro.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-colors cursor-pointer border border-slate-600 shadow-2xs"
                          title="Print Warranty Repair & Labor Time Punch Record"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>Print Warranty Record</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReopenRO(ro)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer border border-amber-300 shadow-2xs"
                        title="Reopen ticket and move back to active workstations"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                        <span>Reopen & Unarchive RO</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
          <div>
            Showing <strong className="text-white">{sortedFilteredROs.length}</strong> of <strong className="text-white">{archivedROs.length}</strong> archived closed repair orders.
          </div>
          <button
            type="button"
            onClick={closeArchivedROsModal}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold cursor-pointer transition-colors"
          >
            Close Archive
          </button>
        </div>

      </div>
    </div>
  );
};

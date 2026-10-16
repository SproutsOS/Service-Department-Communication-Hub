import React, { useState, useMemo } from 'react';
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
  CalendarDays,
  CalendarCheck,
  Award,
  Calculator,
  ShieldCheck,
  PhoneCall,
  ExternalLink,
  Receipt,
  Archive,
  ChevronRight,
  Bell,
  X,
  Bookmark,
  Tag,
  Phone,
  KeyRound
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROStatus, RepairOrder, User } from '../types';
import { STATUS_CONFIG, normalizeROStatus } from '../data/mockData';
import { formatEtaBadge, formatTimeOnly, formatDateTime, formatDurationSince, sortROsNumerically, matchesROSearch } from '../utils/formatters';
import { CustomerCallSheetWidget } from './CustomerCallSheetWidget';
import { CustomerFollowUpModal } from './CustomerFollowUpModal';
import { ManagerPartsOnOrderModal } from './ManagerPartsOnOrderModal';
import { TechWorkloadModal } from './TechWorkloadModal';
import { getContactCadenceStatus, isEligibleForCadence, isWoolwineVehicle } from '../utils/cadenceUtils';

export const ManagerDashboard: React.FC = () => {
  const { 
    repairOrders, 
    users, 
    setSelectedRO, 
    setIsNewROModalOpen, 
    startDiagnosis, 
    staffLeaveEntries,
    setIsStaffCalendarOpen,
    appointments,
    setIsAppointmentCalendarOpen,
    managerViewSection: viewSection,
    setManagerViewSection: setViewSection,
    openQuoteBuilder,
    quotes,
    openArchivedROsModal,
    notifications,
    markNotificationRead,
    dismissPartsOrderAlert,
    setActiveRoleView,
    specialParts,
    openSpecialPartsModal,
    importantNumbers,
    openImportantNumbersModal,
    managerPasswords,
    openManagerPasswordsModal,
  } = useApp();

  const [selectedWorkloadTech, setSelectedWorkloadTech] = useState<User | null>(null);
  const [selectedFollowUpRO, setSelectedFollowUpRO] = useState<RepairOrder | null>(null);
  const [isPartsOnOrderModalOpen, setIsPartsOnOrderModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ROStatus | 'ALL' | 'CALLS_DUE'>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [advisorFilter, setAdvisorFilter] = useState<string>('ALL');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [displayMode, setDisplayMode] = useState<'TABLE' | 'CARDS'>(() => {
    try {
      const saved = localStorage.getItem('manager_display_mode');
      if (saved === 'TABLE' || saved === 'CARDS') return saved;
    } catch {
      // ignore
    }
    return 'CARDS';
  });

  const handleSetDisplayMode = (mode: 'TABLE' | 'CARDS') => {
    setDisplayMode(mode);
    try {
      localStorage.setItem('manager_display_mode', mode);
    } catch {
      // ignore
    }
  };

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayAppointmentsCount = useMemo(() => {
    return (appointments || []).filter(a => a.appointmentDate === todayStr && a.status !== 'CANCELLED').length;
  }, [appointments, todayStr]);

  // Today's absences (Leave early, out sick, vacation, etc.)
  const todayAbsences = useMemo(() => {
    return (staffLeaveEntries || []).filter(e => todayStr >= e.startDate && todayStr <= e.endDate);
  }, [staffLeaveEntries, todayStr]);

  // Technicians & Service Writers
  const technicians = users.filter(u => u.role === 'TECHNICIAN');
  const serviceWriters = users.filter(u => 
    (u.role === 'SERVICE_ADVISOR' || u.role === 'SERVICE_MANAGER') && !u.isDeactivated
  );

  // Cadence tracking (Twice-per-week policy dealership overview)
  const activeROsList = repairOrders.filter(r => r.status !== 'CLOSED' && r.status !== 'COMPLETED' && !r.isArchived);
  const eligibleROs = activeROsList.filter(r => isEligibleForCadence(r));
  const overdueCallsCount = eligibleROs.filter(r => getContactCadenceStatus(r).isOverdue).length;
  const dueTodayCallsCount = eligibleROs.filter(r => getContactCadenceStatus(r).isDueToday).length;
  const totalCallsDue = overdueCallsCount + dueTodayCallsCount;

  // Metrics matching user flow (Uniform with Service Advisor)
  const openROsCount = activeROsList.length;
  const waitingDiagCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'WAITING_DIAGNOSTICS').length;
  const inDiagCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'IN_DIAG').length;
  const estimateDoneCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'ESTIMATE_DONE').length;
  const waitingApprovalCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'WAITING_FOR_APPROVAL').length;
  const approvedCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'APPROVED').length;
  const partsOrderedCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'PARTS_ORDERED' || normalizeROStatus(r.status) === 'PARTS_IN_TO_TECH').length;
  const inRepairCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'REPAIR_IN_PROGRESS' || normalizeROStatus(r.status) === 'REPAIR_COMPLETE').length;
  const readyPickupCount = activeROsList.filter(r => normalizeROStatus(r.status) === 'READY_FOR_PICKUP').length;
  const completedCount = repairOrders.filter(r => normalizeROStatus(r.status) === 'CLOSED' || r.status === 'COMPLETED' || r.isArchived).length;

  // Parts in transit / courier deliveries expected today (active ROs only)
  const partsInTransit = activeROsList.flatMap(ro => 
    ro.parts
      .filter(p => p.status === 'IN_TRANSIT')
      .map(p => ({ ...p, roId: ro.id, customerName: ro.customerName, techName: ro.techName }))
  );

  // Total active parts on order across all open ROs
  const totalPartsOnOrderCount = useMemo(() => {
    return activeROsList.reduce((acc, ro) => {
      const active = (ro.parts || []).filter(p => p.status !== 'QUOTE_ONLY' && p.requestType !== 'QUOTE_ONLY' && p.status !== 'RECEIVED' && p.status !== 'ISSUED_TO_TECH');
      return acc + active.length;
    }, 0);
  }, [activeROsList]);

  // Set of dismissed notification IDs in the current session on manager screen
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  // Parts Order Notifications visible to Service Manager & Parts Counter (Synchronized via Firestore)
  const partsAlertNotifications = useMemo(() => {
    const isFulfilled = (st?: string) => [
      'ORDERED', 'DAILY_ORDER', 'LOCAL_PURCHASE', 'SPECIAL_ORDER', 
      'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'IN_TRANSIT', 
      'RECEIVED', 'ISSUED_TO_TECH', 'IN_STOCK', 'DECLINED', 'CANCELLED'
    ].includes(st || '');

    const directNotifs = (notifications || []).filter(n => {
      if (n.read) return false;
      if (dismissedAlertIds.has(n.id)) return false;

      const titleLower = (n.title || '').toLowerCase();
      const msgLower = (n.message || '').toLowerCase();
      if (
        titleLower.includes('parts ordered') || 
        titleLower.includes('placed on order') || 
        msgLower.includes('placed on order')
      ) {
        return false;
      }

      // Do NOT classify "no parts required", "no part", or "labor only" notifications as parts order alerts
      if (
        titleLower.includes('no part') ||
        msgLower.includes('no part') ||
        msgLower.includes('labor only') ||
        titleLower.includes('labor only') ||
        msgLower.includes('labor-only') ||
        titleLower.includes('labor-only') ||
        msgLower.includes('zero parts')
      ) {
        return false;
      }

      const isParts = n.type === 'PARTS_UPDATE' || 
        n.targetRole === 'PARTS_SPECIALIST' || 
        n.targetRole === 'SERVICE_MANAGER' ||
        titleLower.includes('part') ||
        titleLower.includes('approved') ||
        msgLower.includes('part') ||
        msgLower.includes('place parts orders');

      if (!isParts) return false;

      if (n.roId) {
        const ro = repairOrders.find(r => String(r.id) === String(n.roId));
        if (ro && (ro.partsAlertDismissed || ro.partsOrderClaimedBy || ro.partsOrderCompletedBy || ro.status === 'PARTS_ORDERED' || ro.status === 'PARTS_IN_TO_TECH')) {
          return false;
        }
        // If RO has no parts and no quoted parts at all, it's labor only
        const allParts = ro?.parts || [];
        const quoteParts = ro?.quote?.partsItems || [];
        if (allParts.length === 0 && quoteParts.length === 0) {
          return false;
        }
        // If all parts in RO and quote are already fulfilled/declined/in-stock, do not show order alert
        const unfulfilledROParts = allParts.filter(p => !isFulfilled(p.status));
        const unfulfilledQuoteParts = quoteParts.filter(qp => !isFulfilled(qp.status));
        if (unfulfilledROParts.length === 0 && unfulfilledQuoteParts.length === 0) {
          return false;
        }
      }

      return true;
    });

    const autoAlerts = repairOrders
      .filter(ro => {
        if (ro.status === 'COMPLETED' || ro.status === 'CLOSED' || ro.status === 'DENIED') return false;
        if (ro.status === 'PARTS_ORDERED' || ro.status === 'PARTS_IN_TO_TECH') return false;
        if (ro.partsAlertDismissed || ro.partsOrderClaimedBy || ro.partsOrderCompletedBy) return false;
        if (directNotifs.some(n => String(n.roId) === String(ro.id))) return false;
        if (dismissedAlertIds.has(`auto_alert_ro_${ro.id}`) || dismissedAlertIds.has(`auto_alert_ro_${String(ro.id)}`)) return false;

        const isApproved = ro.quote?.status === 'APPROVED' || 
                           ro.status === 'APPROVED' || 
                           (ro.quote?.lineStatuses && Object.values(ro.quote.lineStatuses).some(st => st === 'APPROVED'));
        if (!isApproved) return false;

        const allParts = ro.parts || [];
        const quoteParts = ro.quote?.partsItems || [];
        if (allParts.length === 0 && quoteParts.length === 0) return false;

        return allParts.some(p => !isFulfilled(p.status)) || quoteParts.some(qp => !isFulfilled(qp.status));
      })
      .map(ro => ({
        id: `auto_alert_ro_${ro.id}`,
        roId: ro.id,
        roNumber: ro.id,
        title: `🚨 Parts Action: RO Approved #${ro.id}`,
        message: `Customer authorized repairs for ${ro.customerName} (${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}). Verify and place parts orders now.`,
        timestamp: ro.updatedAt || new Date().toISOString(),
        isUrgent: true,
        type: 'PARTS_UPDATE' as const,
        read: false,
        targetRole: 'SERVICE_MANAGER' as const,
      }));

    return [...directNotifs, ...autoAlerts];
  }, [notifications, repairOrders, dismissedAlertIds]);

  // Filter & Sort ROs in numerical order
  const filteredROs = sortROsNumerically(repairOrders.filter(ro => {
    const isClosed = ro.status === 'CLOSED' || ro.status === 'COMPLETED' || ro.isArchived;
    if (urgentOnly && !ro.isUrgent) return false;
    if (statusFilter === 'CALLS_DUE') {
      if (isWoolwineVehicle(ro)) return false;
      const cadence = getContactCadenceStatus(ro);
      if (!cadence.needsCall) return false;
    } else if (statusFilter === 'ALL') {
      // Default view ONLY shows active open tickets, never closed archived ones
      if (isClosed) return false;
    } else if (statusFilter === 'CLOSED') {
      if (!isClosed) return false;
    } else {
      const roNorm = normalizeROStatus(ro.status);
      const filterNorm = normalizeROStatus(statusFilter);
      if (isClosed) return false;
      if (filterNorm === 'PARTS_ORDERED') {
        if (roNorm !== 'PARTS_ORDERED' && roNorm !== 'PARTS_IN_TO_TECH') return false;
      } else if (filterNorm === 'REPAIR_IN_PROGRESS') {
        if (roNorm !== 'REPAIR_IN_PROGRESS' && roNorm !== 'REPAIR_COMPLETE') return false;
      } else if (filterNorm === 'READY_FOR_PICKUP') {
        if (roNorm !== 'READY_FOR_PICKUP') return false;
      } else {
        if (roNorm !== filterNorm) return false;
      }
    }
    if (techFilter !== 'ALL' && ro.techId !== techFilter) return false;
    if (advisorFilter !== 'ALL' && ro.advisorId !== advisorFilter && ro.advisorName !== advisorFilter) return false;

    if (searchQuery.trim()) {
      return matchesROSearch(ro, searchQuery, users);
    }

    return true;
  }));

  return (
    <div className="space-y-6">
      
      {/* Top Header / Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Master Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="open-archived-ros-mgr"
            onClick={() => openArchivedROsModal()}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border border-slate-600"
            title="Open Archived Closed Repair Orders Repository"
          >
            <Archive className="w-4 h-4 text-amber-400" />
            <span>Archived ROs</span>
            {completedCount > 0 && (
              <span className="bg-slate-900 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-slate-700">
                {completedCount}
              </span>
            )}
          </button>

          <button
            id="open-parts-on-order-report-mgr"
            onClick={() => setIsPartsOnOrderModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Open Service Manager Master Parts on Order & ETA Control Report"
          >
            <Package className="w-4 h-4 text-orange-200" />
            <span>Parts on Order Report</span>
            {totalPartsOnOrderCount > 0 && (
              <span className="bg-orange-950 text-orange-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-orange-400">
                {totalPartsOnOrderCount}
              </span>
            )}
          </button>

          <button
            id="open-special-parts-mgr"
            onClick={() => openSpecialPartsModal()}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border border-slate-600 hover:border-amber-400"
            title="Open Frequent & Special Part Numbers Directory"
          >
            <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            <span>Special Parts</span>
            {specialParts.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-amber-400/40">
                {specialParts.length}
              </span>
            )}
          </button>

          <button
            id="open-important-numbers-mgr"
            onClick={() => openImportantNumbersModal()}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border border-slate-600 hover:border-sky-400"
            title="Open Important Phone Numbers & Vendor Directory"
          >
            <Phone className="w-4 h-4 text-sky-400" />
            <span>Important Numbers</span>
            {importantNumbers.length > 0 && (
              <span className="bg-sky-500/20 text-sky-300 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-sky-400/40">
                {importantNumbers.length}
              </span>
            )}
          </button>

          <button
            id="open-manager-passwords-mgr"
            onClick={() => openManagerPasswordsModal()}
            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer border border-slate-600 hover:border-indigo-400"
            title="Open Manager Passwords & Portal Credentials Vault"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Passwords</span>
            {managerPasswords.length > 0 && (
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-indigo-400/40">
                {managerPasswords.length}
              </span>
            )}
          </button>

          <button
            id="open-quote-builder-mgr"
            onClick={() => openQuoteBuilder()}
            className="inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Pre-RO Quote & Estimate Builder (Roll into Repair Orders)"
          >
            <Receipt className="w-4 h-4 text-amber-200" />
            <span>Quote Builder</span>
            {quotes.length > 0 && (
              <span className="bg-amber-950 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-amber-400">
                {quotes.length}
              </span>
            )}
          </button>

          <button
            id="open-appointment-calendar-mgr"
            onClick={() => setIsAppointmentCalendarOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-3.5 py-2 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            title="Open Service Appointment Calendar"
          >
            <CalendarCheck className="w-4 h-4 text-purple-200" />
            <span>Appointment Calendar</span>
            {todayAppointmentsCount > 0 && (
              <span className="bg-purple-900 text-purple-200 text-[10px] px-1.5 py-0.2 rounded-full font-black border border-purple-400">
                {todayAppointmentsCount} Today
              </span>
            )}
          </button>

          <button
            id="create-new-ro-btn-mgr"
            onClick={() => setIsNewROModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            + Create New RO
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NEW PARTS ORDER NOTIFICATIONS (Real-time sync with Parts Counter)          */}
      {/* ========================================================================= */}
      {partsAlertNotifications.length > 0 && viewSection === 'FLOOR' && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-red-400 space-y-3 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="w-4 h-4 rounded-full bg-yellow-300 animate-ping absolute inset-0 m-auto" />
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-black shadow-inner relative border border-white/30">
                  <Bell className="w-5 h-5 text-yellow-300 animate-bounce" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                    <span>NEW PARTS ORDER NOTIFICATIONS</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-rose-700 text-xs font-black uppercase tracking-wider shadow-xs">
                      {partsAlertNotifications.length} {partsAlertNotifications.length === 1 ? 'Alert' : 'Alerts'}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-rose-100 font-medium">
                  Service Advisor authorized repairs — action required to verify and place parts orders with suppliers.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedAlertIds(prev => {
                  const next = new Set(prev);
                  partsAlertNotifications.forEach(n => {
                    next.add(n.id);
                    if (n.roId) next.add(n.roId);
                  });
                  return next;
                });
                partsAlertNotifications.forEach(n => {
                  markNotificationRead(n.id);
                  dismissPartsOrderAlert(n.roId, n.id, false);
                });
              }}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          </div>

          {/* Individual Notification Items */}
          <div className="space-y-2">
            {partsAlertNotifications.map(notif => {
              const notifRO = repairOrders.find(r => String(r.id) === String(notif.roId));
              return (
                <div
                  key={notif.id}
                  className="bg-black/25 hover:bg-black/35 backdrop-blur-xs rounded-xl p-3 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2 py-0.5 rounded-md bg-yellow-400 text-slate-900 font-black text-xs shrink-0 font-mono">
                      {notif.roNumber || notif.roId}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-white">{notif.title}</span>
                        <span className="text-[10px] text-white/70 font-mono">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-100 font-medium truncate sm:whitespace-normal">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {notifRO && (
                      <button
                        type="button"
                        onClick={() => {
                          setDismissedAlertIds(prev => new Set([...prev, notif.id, notif.roId, `auto_alert_ro_${notif.roId}`, `auto_alert_ro_${String(notif.roId)}`, `parts_alert_${notif.roId}`]));
                          markNotificationRead(notif.id);
                          dismissPartsOrderAlert(notif.roId, notif.id, true);
                          setSelectedRO(notifRO);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-yellow-300 text-xs font-black transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        {(() => {
                          const isFulfilledStatus = (st?: string) => [
                            'ORDERED', 'DAILY_ORDER', 'LOCAL_PURCHASE', 'SPECIAL_ORDER', 
                            'SPECIAL_ORDER_1_5_DAYS', 'VOR_UPGRADE', 'IN_TRANSIT', 
                            'RECEIVED', 'ISSUED_TO_TECH', 'IN_STOCK', 'DECLINED', 'CANCELLED'
                          ].includes(st || '');

                          const isNoPartsAlert = (notif.message || '').toLowerCase().includes('no part') ||
                            (notif.message || '').toLowerCase().includes('labor only') ||
                            (notif.message || '').toLowerCase().includes('labor-only') ||
                            (notif.title || '').toLowerCase().includes('no part') ||
                            (notif.title || '').toLowerCase().includes('labor only');

                          const neededParts = (notifRO.parts || []).filter(p => !isFulfilledStatus(p.status));
                          const neededQuoteParts = (notifRO.quote?.partsItems || []).filter(qp => !isFulfilledStatus(qp.status));
                          const hasPartsToOrder = !isNoPartsAlert && (neededParts.length > 0 || neededQuoteParts.length > 0);

                          if (hasPartsToOrder) {
                            return (
                              <>
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                <span>Order Parts Now</span>
                              </>
                            );
                          }
                          return (
                            <>
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                              <span>View RO #{notifRO.id}</span>
                            </>
                          );
                        })()}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedAlertIds(prev => new Set([...prev, notif.id, notif.roId, `auto_alert_ro_${notif.roId}`, `auto_alert_ro_${String(notif.roId)}`, `parts_alert_${notif.roId}`]));
                        markNotificationRead(notif.id);
                        dismissPartsOrderAlert(notif.roId, notif.id, false);
                      }}
                      className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <span>Manage Dealership Call Log</span>
          </button>
        </div>
      )}

      {/* Today's Staff Attendance Banner for Service Manager */}
      {viewSection === 'FLOOR' && todayAbsences.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-amber-50 border border-purple-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Today's Staff Attendance: {todayAbsences.length} Member{todayAbsences.length > 1 ? 's' : ''} Out or Left Early</span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {todayAbsences.map(e => (
                    <span 
                      key={e.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-purple-200 text-slate-800 shadow-2xs"
                    >
                      <span>{e.leaveType === 'LEFT_EARLY' ? '⏰' : e.leaveType === 'SICK' ? '🤒' : e.leaveType === 'VACATION' ? '🌴' : '📋'}</span>
                      <span className="font-extrabold">{e.userName}</span>
                      <span className="text-slate-500 font-medium">({e.timeDetails || (e.leaveType === 'LEFT_EARLY' ? 'Left Early' : e.leaveType === 'SICK' ? 'Out Sick' : 'Vacation')})</span>
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Keep shop job dispatch and technician workload aligned with today's staff coverage.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsStaffCalendarOpen(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Open Staff Calendar</span>
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
              const techNameClean = tech.name.trim().toLowerCase();
              const assignedROs = repairOrders.filter(r => 
                r.techId === tech.id || 
                (r.concernTechIds && r.concernTechIds.some(id => id === tech.id)) ||
                (r.techName && r.techName.trim().toLowerCase() === techNameClean) ||
                (r.concernTechNames && r.concernTechNames.some(name => name && name.trim().toLowerCase() === techNameClean))
              );
              const activeJobs = assignedROs.filter(r => r.status !== 'COMPLETED' && r.status !== 'CLOSED');
              const currentJob = activeJobs[0];

              return (
                <div 
                  key={tech.id}
                  onClick={() => setSelectedWorkloadTech(tech)}
                  className="p-3.5 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/20 hover:shadow-md transition-all cursor-pointer text-left flex flex-col justify-between group relative"
                  title={`Click to view all ${assignedROs.length} repair orders assigned to ${tech.name}`}
                >
                  <div>
                    {/* Header: Tech Name, Cert, Active Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-blue-700 transition-colors">
                          {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'T'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1 flex-wrap">
                            <span className="group-hover:text-blue-700 transition-colors">{tech.name}</span>
                            {tech.employeeNumber && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                #{tech.employeeNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-blue-700 font-semibold truncate flex items-center gap-1">
                            <Award className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                            <span className="truncate">{tech.certificationLevel || tech.title || 'Technician'}</span>
                            {tech.bayNumber && <span className="text-slate-400 font-normal">• Bay {tech.bayNumber}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Workload Pill */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        activeJobs.length > 0
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-extrabold'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {activeJobs.length === 0 ? 'Available' : `${activeJobs.length} Active`}
                      </span>
                    </div>

                    {/* Active Job Preview or Idle State */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
                      {currentJob ? (
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-blue-600 text-[11px] group-hover:underline">
                              RO #{currentJob.id}
                            </span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                              STATUS_CONFIG[currentJob.status]?.badgeClass || 'bg-blue-100 text-blue-700'
                            }`}>
                              {STATUS_CONFIG[currentJob.status]?.label || currentJob.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium truncate mt-1">
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startDiagnosis(currentJob.id);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-1.5 py-0.5 rounded text-[9px] shadow-2xs transition-colors cursor-pointer"
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

                          {activeJobs.length > 1 && (
                            <div className="mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                              +{activeJobs.length - 1} more assigned job{activeJobs.length - 1 === 1 ? '' : 's'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px] italic py-1">
                          Tech available • Ready for assignment
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Click cue bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-blue-600 group-hover:text-blue-800">
                    <span className="text-slate-500 font-medium text-[10px]">
                      {assignedROs.length} assigned RO{assignedROs.length === 1 ? '' : 's'} total
                    </span>
                    <span className="flex items-center gap-0.5 group-hover:underline">
                      <span>View All ROs</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live Parts Tracking & Estimated Arrivals
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-orange-600 font-bold">
                {partsInTransit.length} deliveries expected today
              </span>
              <button
                type="button"
                onClick={() => setIsPartsOnOrderModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
              >
                <span>Open Full Master Report</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
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
                onClick={() => handleSetDisplayMode('TABLE')}
                className={`p-1.5 transition-colors ${
                  displayMode === 'TABLE' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Table View (Professional Polish)"
              >
                <ListFilter className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetDisplayMode('CARDS')}
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
          /* Display: Cards Grid View (Main RO Cards ~1/2" wider) */
          <div className="p-3.5 sm:p-4.5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4.5">
            {filteredROs.map(ro => (
              <ROCard 
                key={ro.id} 
                ro={ro} 
                onClick={() => setSelectedRO(ro)} 
                isMainCard={true}
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

      {/* Service Manager Master Parts on Order & ETA Control Report */}
      <ManagerPartsOnOrderModal
        isOpen={isPartsOnOrderModalOpen}
        onClose={() => setIsPartsOnOrderModalOpen(false)}
        onOpenRO={(ro) => setSelectedRO(ro)}
      />

      {/* Service Manager: Technician Workload Modal (View all assigned ROs and click to see whole RO) */}
      <TechWorkloadModal
        isOpen={Boolean(selectedWorkloadTech)}
        onClose={() => setSelectedWorkloadTech(null)}
        tech={selectedWorkloadTech}
        repairOrders={repairOrders}
        onSelectRO={(ro) => {
          setSelectedRO(ro);
        }}
        onStartDiag={(roId) => startDiagnosis(roId)}
      />

    </div>
  );
};

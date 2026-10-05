import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdvisorDashboard } from './components/AdvisorDashboard';
import { TechDashboard } from './components/TechDashboard';
import { PartsDashboard } from './components/PartsDashboard';
import { SalesDashboard } from './components/SalesDashboard';
import { StaffManagement } from './components/StaffManagement';
import { TimeCardCalculator } from './components/TimeCardCalculator';
import { RODetailModal } from './components/RODetailModal';
import { NewROModal } from './components/NewROModal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { InitialSetupModal } from './components/InitialSetupModal';
import { RepairQuoteModal } from './components/RepairQuoteModal';
import { WarrantyPrintModal } from './components/WarrantyPrintModal';
import { QuotePrintModal } from './components/QuotePrintModal';
import { CustomerDirectoryModal } from './components/CustomerDirectoryModal';
import { UrgentToastStack } from './components/UrgentToastStack';
import { ShopChatDrawer } from './components/ShopChatDrawer';
import { DraggableShopChatButton } from './components/DraggableShopChatButton';
import { ManagerStaffCalendar } from './components/ManagerStaffCalendar';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { QuoteBuilderModal } from './components/QuoteBuilderModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  LayoutDashboard, 
  Wrench, 
  UserCheck, 
  Package, 
  CheckCircle2, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Users, 
  ArrowLeft, 
  Eye, 
  Lock, 
  MessageSquare,
  Calculator,
  CalendarDays,
  CalendarCheck,
  PhoneCall,
  PlusCircle,
  Receipt
} from 'lucide-react';
import { UserRole } from './types';

const MainContent: React.FC = () => {
  const { 
    currentUser, 
    setCurrentUser, 
    users, 
    repairOrders, 
    isStaffManagementOpen, 
    setIsStaffManagementOpen,
    isTimeCardCalculatorOpen,
    setIsTimeCardCalculatorOpen,
    isChatBoxOpen,
    setIsChatBoxOpen,
    openShopChat,
    unreadShopCount,
    latestUnreadShopMessage,
    shopMessages,
    isAuthenticated,
    lockWorkstation,
    activeRoleView,
    setActiveRoleView,
    isStaffCalendarOpen,
    setIsStaffCalendarOpen,
    isAppointmentCalendarOpen,
    setIsAppointmentCalendarOpen,
    appointments,
    setIsNewROModalOpen,
    managerViewSection,
    setManagerViewSection,
    quotes,
    isQuoteBuilderOpen,
    closeQuoteBuilder,
    activeQuoteBuilderId,
    openQuoteBuilder
  } = useApp();
  
  // Only managers can inspect other department dashboards; all individual staff are strictly locked to their own role space
  const isManager = currentUser.role === 'SERVICE_MANAGER';

  // Auto-close staff management, calendar, & time card calculator if a non-manager is active
  React.useEffect(() => {
    if (!isManager) {
      if (isStaffManagementOpen) setIsStaffManagementOpen(false);
      if (isTimeCardCalculatorOpen) setIsTimeCardCalculatorOpen(false);
      if (isStaffCalendarOpen) setIsStaffCalendarOpen(false);
    }
    if (!isManager && currentUser.role !== 'SERVICE_ADVISOR') {
      if (isAppointmentCalendarOpen) setIsAppointmentCalendarOpen(false);
    }
  }, [isManager, currentUser.role, isStaffManagementOpen, isTimeCardCalculatorOpen, isStaffCalendarOpen, isAppointmentCalendarOpen, setIsStaffManagementOpen, setIsTimeCardCalculatorOpen, setIsStaffCalendarOpen, setIsAppointmentCalendarOpen]);

  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const todayAppointmentsCount = React.useMemo(() => {
    return (appointments || []).filter(a => a.appointmentDate === todayStr && a.status !== 'CANCELLED').length;
  }, [appointments, todayStr]);

  // Authentication Gate: Render ONLY the Login Screen until authorized staff credentials/PIN are entered
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen 
          onLoginSuccess={(loggedUser) => {
            if (loggedUser.role === 'SERVICE_MANAGER') {
              setActiveRoleView('SERVICE_MANAGER');
            } else {
              setActiveRoleView(loggedUser.role);
            }
          }}
        />
        <InitialSetupModal />
      </>
    );
  }

  // Real-time capacity calculation
  const TOTAL_SHOP_CAPACITY = 12;
  const totalActive = repairOrders.filter(r => r.status !== 'COMPLETED').length;
  const inRepair = repairOrders.filter(r => r.status === 'IN_BAY' || r.status === 'IN_REPAIR').length;
  const partsTrackingCount = repairOrders.flatMap(r => r.parts.filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED')).length;
  const assignedCount = repairOrders.filter(r => r.status === 'DISPATCHED' || (r.techId && r.status !== 'COMPLETED')).length;
  const efficiency = totalActive === 0 ? 0 : Math.min(Math.round(((inRepair + 2) / TOTAL_SHOP_CAPACITY) * 100), 100);

  const handleSelectRole = (role: UserRole) => {
    // Non-managers are strictly blocked from accessing any other role's space
    if (!isManager) {
      return;
    }
    setIsStaffManagementOpen(false);
    setIsTimeCardCalculatorOpen(false);
    setActiveRoleView(role);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Top Header */}
      <Navbar />

      {/* Main View Shell with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Navigation - Only shown for Managers with multi-workstation oversight */}
        {isManager && (
          <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-700 flex-col shrink-0 h-full overflow-hidden">
            
            {/* Scrollable Navigation Area (Workstation Views + Dealership Staff & Tools) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40">
              <nav className="space-y-1 mb-4">
                <div className="text-[10px] text-slate-400 font-bold uppercase px-3 mb-2 tracking-widest">
                  Workstation Views (Manager Access)
                </div>

            {/* Manager View: Has full oversight of all department boards */}
            {isManager ? (
              <>
                {/* Master Dashboard (Manager) */}
                <button
                  onClick={() => handleSelectRole('SERVICE_MANAGER')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    !isStaffManagementOpen && activeRoleView === 'SERVICE_MANAGER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Master Dashboard</span>
                </button>

                {/* Technician Hub */}
                <button
                  onClick={() => handleSelectRole('TECHNICIAN')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    !isStaffManagementOpen && activeRoleView === 'TECHNICIAN'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Wrench className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Technician Hub</span>
                </button>

                {/* Advisor Console */}
                <button
                  onClick={() => handleSelectRole('SERVICE_ADVISOR')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    !isStaffManagementOpen && activeRoleView === 'SERVICE_ADVISOR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Advisor Console</span>
                </button>

                {/* Parts & Tracking Hub */}
                <button
                  onClick={() => handleSelectRole('PARTS_SPECIALIST')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    !isStaffManagementOpen && activeRoleView === 'PARTS_SPECIALIST'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Parts & Tracking</span>
                </button>

                {/* Sales Portal (Read-Only) */}
                <button
                  id="sidebar-sales-portal-btn"
                  onClick={() => handleSelectRole('SALES')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                    !isStaffManagementOpen && activeRoleView === 'SALES'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 shrink-0 text-teal-400" />
                    <span className="text-sm font-medium">Sales Portal</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-900/80 text-teal-300 border border-teal-700/50 uppercase tracking-wider">
                    Read-Only
                  </span>
                </button>

                {/* Administration / Staff Section */}
                <div className="pt-4 mt-4 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400 font-bold uppercase px-3 mb-2 tracking-widest">
                    Dealership Staff & Tools
                  </div>

                  {/* 1. Shop Tracker */}
                  <button
                    id="sidebar-shop-tracker-btn"
                    onClick={() => {
                      setIsStaffManagementOpen(false);
                      setIsTimeCardCalculatorOpen(false);
                      setIsStaffCalendarOpen(false);
                      setIsAppointmentCalendarOpen(false);
                      setActiveRoleView('SERVICE_MANAGER');
                      setManagerViewSection('FLOOR');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                      !isStaffManagementOpen && !isTimeCardCalculatorOpen && !isStaffCalendarOpen && !isAppointmentCalendarOpen && activeRoleView === 'SERVICE_MANAGER' && managerViewSection === 'FLOOR'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Live Shop Tracker Board"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-blue-400" />
                    <span className="text-sm font-medium">Shop Tracker</span>
                  </button>

                  {/* 2. Daily Call Log */}
                  <button
                    id="sidebar-daily-call-log-btn"
                    onClick={() => {
                      setIsStaffManagementOpen(false);
                      setIsTimeCardCalculatorOpen(false);
                      setIsStaffCalendarOpen(false);
                      setIsAppointmentCalendarOpen(false);
                      setActiveRoleView('SERVICE_MANAGER');
                      setManagerViewSection('CALL_SHEET');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 ${
                      !isStaffManagementOpen && !isTimeCardCalculatorOpen && !isStaffCalendarOpen && !isAppointmentCalendarOpen && activeRoleView === 'SERVICE_MANAGER' && managerViewSection === 'CALL_SHEET'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Daily Customer Call Log & Scheduled Follow-ups"
                  >
                    <PhoneCall className="w-4 h-4 shrink-0 text-blue-400" />
                    <span className="text-sm font-medium">Daily Call Log</span>
                  </button>

                  {/* 3. Appointment Calendar (Advisors & Service Manager) */}
                  <button
                    id="sidebar-appointment-calendar-btn"
                    onClick={() => {
                      setIsStaffManagementOpen(false);
                      setIsTimeCardCalculatorOpen(false);
                      setIsStaffCalendarOpen(false);
                      setIsAppointmentCalendarOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 ${
                      isAppointmentCalendarOpen && !isStaffCalendarOpen && !isTimeCardCalculatorOpen && !isStaffManagementOpen
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Service Appointment Calendar (Customer Check-Ins, Waiters, Loaners)"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck className="w-4 h-4 shrink-0 text-purple-400" />
                      <span className="text-sm font-medium">Appointments</span>
                    </div>
                    {todayAppointmentsCount > 0 && (
                      <span className="text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full">
                        {todayAppointmentsCount} Today
                      </span>
                    )}
                  </button>

                  {/* 4. Create New RO */}
                  <button
                    id="sidebar-create-new-ro-btn"
                    onClick={() => setIsNewROModalOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 shadow-xs font-bold"
                    title="Create New Repair Order"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="text-sm font-medium">+ Create New RO</span>
                  </button>

                  {/* 5. Employee Roster */}
                  <button
                    id="sidebar-staff-management-btn"
                    onClick={() => {
                      setIsTimeCardCalculatorOpen(false);
                      setIsStaffCalendarOpen(false);
                      setIsAppointmentCalendarOpen(false);
                      setIsStaffManagementOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 ${
                      isStaffManagementOpen && !isTimeCardCalculatorOpen && !isStaffCalendarOpen && !isAppointmentCalendarOpen
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 shrink-0 text-blue-400" />
                      <span className="text-sm font-medium">Employee Roster</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      {users.length}
                    </span>
                  </button>

                  {/* 6. Time Card Punch Calculator - Exclusive to Service Manager */}
                  <button
                    id="sidebar-time-card-calculator-btn"
                    onClick={() => {
                      setIsStaffManagementOpen(false);
                      setIsStaffCalendarOpen(false);
                      setIsAppointmentCalendarOpen(false);
                      setIsTimeCardCalculatorOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 ${
                      isTimeCardCalculatorOpen && !isStaffCalendarOpen && !isStaffManagementOpen && !isAppointmentCalendarOpen
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="7-Day Military Time Card Calculator (24-Hour Clock)"
                  >
                    <div className="flex items-center gap-3">
                      <Calculator className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="text-sm font-medium">Time Card Calc</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/50 uppercase tracking-wider">
                      Military
                    </span>
                  </button>

                  {/* 7. Staff Attendance & Out-of-Office Calendar */}
                  <button
                    id="sidebar-staff-calendar-btn"
                    onClick={() => {
                      setIsStaffManagementOpen(false);
                      setIsTimeCardCalculatorOpen(false);
                      setIsAppointmentCalendarOpen(false);
                      setIsStaffCalendarOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 ${
                      isStaffCalendarOpen && !isTimeCardCalculatorOpen && !isStaffManagementOpen && !isAppointmentCalendarOpen
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Staff Attendance & Out-of-Office Calendar (Track Vacation, Sick, Left Early)"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 shrink-0 text-purple-400" />
                      <span className="text-sm font-medium">Staff Calendar</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-700/50 uppercase tracking-wider">
                      Leave/PTO
                    </span>
                  </button>

                  {/* 8. Quote & Estimate Builder (Roll to RO) */}
                  <button
                    id="sidebar-quote-builder-btn"
                    onClick={() => openQuoteBuilder()}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer mt-1 text-slate-400 hover:bg-slate-800 hover:text-white group"
                    title="Pre-RO Quote & Estimate Builder (Build menu & custom quotes, roll to Repair Order with 1 click)"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 shrink-0 text-amber-400 group-hover:text-amber-300" />
                      <span className="text-sm font-medium">Quote Builder</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/50 uppercase tracking-wider">
                      {quotes.length > 0 ? `${quotes.length} Quotes` : 'Estimator'}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              /* Non-Manager Personnel: Strictly restricted to their respected space */
              <div className="space-y-3">
                {currentUser.role === 'SALES' && (
                  <button
                    id="sidebar-sales-portal-btn"
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left bg-blue-600 text-white shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-teal-300" />
                      <div>
                        <div className="text-sm font-bold leading-tight">Sales Portal</div>
                        <div className="text-[11px] text-blue-200">RO & Vehicle Status</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/40 uppercase">
                      Read-Only
                    </span>
                  </button>
                )}

                {currentUser.role === 'TECHNICIAN' && (
                  <button
                    id="sidebar-tech-hub-btn"
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left bg-blue-600 text-white shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wrench className="w-4 h-4 text-emerald-300" />
                      <div>
                        <div className="text-sm font-bold leading-tight">Technician Hub</div>
                        <div className="text-[11px] text-blue-200">Active Repair Orders</div>
                      </div>
                    </div>
                  </button>
                )}

                {currentUser.role === 'SERVICE_ADVISOR' && (
                  <div className="space-y-1.5">
                    {/* 1. Advisor Console (Active ROs) */}
                    <button
                      id="sidebar-advisor-console-btn"
                      onClick={() => {
                        setIsAppointmentCalendarOpen(false);
                        setActiveRoleView('SERVICE_ADVISOR');
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer ${
                        !isAppointmentCalendarOpen ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className="w-4 h-4 text-blue-300" />
                        <div>
                          <div className="text-sm font-bold leading-tight">Advisor Console</div>
                          <div className="text-[11px] text-blue-200">Customer Follow-Up & ROs</div>
                        </div>
                      </div>
                    </button>

                    {/* 2. Service Appointment Calendar */}
                    <button
                      id="sidebar-advisor-appointment-calendar-btn"
                      onClick={() => {
                        setIsAppointmentCalendarOpen(true);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer ${
                        isAppointmentCalendarOpen ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                      title="Service Appointment Calendar (Customer Check-Ins, Waiters, Loaners)"
                    >
                      <div className="flex items-center gap-2.5">
                        <CalendarCheck className="w-4 h-4 text-purple-300" />
                        <div>
                          <div className="text-sm font-bold leading-tight">Appointment Calendar</div>
                          <div className="text-[11px] text-purple-200">Waiters, Drop-Offs & Loaners</div>
                        </div>
                      </div>
                      {todayAppointmentsCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-500/50">
                          {todayAppointmentsCount} Today
                        </span>
                      )}
                    </button>

                    {/* 3. Create New RO */}
                    <button
                      id="sidebar-advisor-create-new-ro-btn"
                      onClick={() => setIsNewROModalOpen(true)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors cursor-pointer bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 shadow-xs font-bold text-xs"
                      title="Create New Repair Order"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>+ Create New RO</span>
                    </button>

                    {/* 4. Quote & Estimate Builder */}
                    <button
                      id="sidebar-advisor-quote-builder-btn"
                      onClick={() => openQuoteBuilder()}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer bg-amber-500/10 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 shadow-xs font-bold text-xs"
                      title="Pre-RO Quote & Estimate Builder (Roll to Repair Order with 1 click)"
                    >
                      <div className="flex items-center gap-2.5">
                        <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Quote & Estimates</span>
                      </div>
                      {quotes.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-900 text-amber-200">
                          {quotes.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {currentUser.role === 'PARTS_SPECIALIST' && (
                  <button
                    id="sidebar-parts-hub-btn"
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left bg-blue-600 text-white shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-amber-300" />
                      <div>
                        <div className="text-sm font-bold leading-tight">Parts & Tracking</div>
                        <div className="text-[11px] text-blue-200">Procurement & Sourcing</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 uppercase">
                      Parts Dept
                    </span>
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Pinned Bottom Footer Area (Active User & Lock Workstation) */}
        <div className="p-3 pt-2 border-t border-slate-800 shrink-0 bg-slate-900/95 space-y-2">
          {/* Perspective Indicator & Lock Button */}
          <div className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/80">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Active User
            </div>
            <div className="text-xs font-semibold text-blue-400 truncate mt-0.5">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser.title || currentUser.role}
            </div>
          </div>

          {/* Lock Workstation / Sign Out Button */}
          <button
            id="sidebar-lock-workstation-btn"
            onClick={lockWorkstation}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-bold transition-colors cursor-pointer"
            title="Lock Workstation & Return to Sign-In Screen"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>Lock Workstation</span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-800/60">
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    )}

        {/* Center Main Dashboard Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Mobile Tab Navigator (Shown on small screens where sidebar is hidden) */}
          <div className="md:hidden bg-slate-800 border-b border-slate-700 px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0">
            {isManager ? (
              <>
                <button
                  onClick={() => handleSelectRole('SERVICE_MANAGER')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                    !isStaffManagementOpen && activeRoleView === 'SERVICE_MANAGER' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Master Board
                </button>
                <button
                  onClick={() => handleSelectRole('TECHNICIAN')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                    !isStaffManagementOpen && activeRoleView === 'TECHNICIAN' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Tech Hub
                </button>
                <button
                  onClick={() => handleSelectRole('SERVICE_ADVISOR')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                    !isStaffManagementOpen && activeRoleView === 'SERVICE_ADVISOR' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Advisor
                </button>
                <button
                  onClick={() => handleSelectRole('PARTS_SPECIALIST')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                    !isStaffManagementOpen && activeRoleView === 'PARTS_SPECIALIST' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Parts ETA
                </button>
                <button
                  onClick={() => handleSelectRole('SALES')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    !isStaffManagementOpen && activeRoleView === 'SALES' ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Eye className="w-3 h-3 text-teal-400" />
                  <span>Sales (Read-Only)</span>
                </button>
                <button
                  onClick={() => {
                    setIsTimeCardCalculatorOpen(false);
                    setIsStaffManagementOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isStaffManagementOpen && !isTimeCardCalculatorOpen ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Staff ({users.length})</span>
                </button>
                <button
                  id="mobile-time-card-calculator-btn"
                  onClick={() => {
                    setIsStaffManagementOpen(false);
                    setIsTimeCardCalculatorOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isTimeCardCalculatorOpen ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Military Time Card</span>
                </button>
                <button
                  id="mobile-appointment-calendar-btn"
                  onClick={() => {
                    setIsStaffManagementOpen(false);
                    setIsTimeCardCalculatorOpen(false);
                    setIsStaffCalendarOpen(false);
                    setIsAppointmentCalendarOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isAppointmentCalendarOpen ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Appointments</span>
                  {todayAppointmentsCount > 0 && (
                    <span className="text-[10px] bg-purple-950 text-purple-200 px-1.5 py-0.2 rounded-full font-bold">
                      {todayAppointmentsCount}
                    </span>
                  )}
                </button>
                <button
                  id="mobile-staff-calendar-btn"
                  onClick={() => {
                    setIsStaffManagementOpen(false);
                    setIsTimeCardCalculatorOpen(false);
                    setIsAppointmentCalendarOpen(false);
                    setIsStaffCalendarOpen(true);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isStaffCalendarOpen ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                  <span>Staff Calendar</span>
                </button>
              </>
            ) : currentUser.role === 'SERVICE_ADVISOR' ? (
              <div className="flex items-center gap-2 text-xs text-white font-medium px-2">
                <button
                  onClick={() => setIsAppointmentCalendarOpen(false)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    !isAppointmentCalendarOpen ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Advisor Console</span>
                </button>
                <button
                  onClick={() => setIsAppointmentCalendarOpen(true)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                    isAppointmentCalendarOpen ? 'bg-purple-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Appointments</span>
                  {todayAppointmentsCount > 0 && (
                    <span className="text-[10px] bg-purple-950 text-purple-200 px-1.5 py-0.2 rounded-full font-bold">
                      {todayAppointmentsCount}
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white font-medium px-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentUser.role === 'SALES' && 'Sales Portal (Read-Only)'}
                  {currentUser.role === 'TECHNICIAN' && 'Technician Hub'}
                  {currentUser.role === 'PARTS_SPECIALIST' && 'Parts & Tracking Hub'}
                </span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  {currentUser.name}
                </span>
              </div>
            )}
            <button
              onClick={lockWorkstation}
              className="px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 bg-red-950/60 text-red-300 border border-red-800/60 ml-auto"
              title="Lock Workstation"
            >
              <Lock className="w-3 h-3 text-red-400" />
              <span>Lock</span>
            </button>
          </div>

          {/* Primary Viewport */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
            {isAppointmentCalendarOpen ? (
              (isManager || currentUser.role === 'SERVICE_ADVISOR') ? (
                <div>
                  <div className="mb-4">
                    <button
                      onClick={() => setIsAppointmentCalendarOpen(false)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                  <AppointmentCalendar onBackToDashboard={() => setIsAppointmentCalendarOpen(false)} />
                </div>
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900">Restricted Space</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    The Service Appointment Calendar is authorized for Service Advisors and the Service Manager. Your account ({currentUser.name}) is authorized for the {currentUser.title || currentUser.role} space only.
                  </p>
                  <button
                    onClick={() => setIsAppointmentCalendarOpen(false)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Return to My Workspace
                  </button>
                </div>
              )
            ) : isTimeCardCalculatorOpen ? (
              isManager ? (
                <div>
                  <div className="mb-4">
                    <button
                      onClick={() => setIsTimeCardCalculatorOpen(false)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                  <TimeCardCalculator onBackToDashboard={() => setIsTimeCardCalculatorOpen(false)} />
                </div>
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900">Restricted Space</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    The Time Card Calculator is restricted to the Service Manager. Your account ({currentUser.name}) is authorized for the {currentUser.title || currentUser.role} space only.
                  </p>
                  <button
                    onClick={() => setIsTimeCardCalculatorOpen(false)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Return to My Workspace
                  </button>
                </div>
              )
            ) : isStaffCalendarOpen ? (
              isManager ? (
                <div>
                  <div className="mb-4">
                    <button
                      onClick={() => setIsStaffCalendarOpen(false)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                  <ManagerStaffCalendar />
                </div>
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900">Restricted Space</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Staff Attendance & Leave Calendar is restricted to the Service Manager. Your account ({currentUser.name}) is authorized for the {currentUser.title || currentUser.role} space only.
                  </p>
                  <button
                    onClick={() => setIsStaffCalendarOpen(false)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Return to My Workspace
                  </button>
                </div>
              )
            ) : isStaffManagementOpen ? (
              isManager ? (
                <div>
                  <div className="mb-4">
                    <button
                      onClick={() => setIsStaffManagementOpen(false)}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                  <StaffManagement />
                </div>
              ) : (
                <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
                  <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-slate-900">Restricted Space</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Staff roster management is restricted to the Service Manager. Your account ({currentUser.name}) is authorized for the {currentUser.title || currentUser.role} space only.
                  </p>
                  <button
                    onClick={() => setIsStaffManagementOpen(false)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    Return to My Workspace
                  </button>
                </div>
              )
            ) : (
              <>
                {activeRoleView === 'SERVICE_MANAGER' && isManager && <ManagerDashboard />}
                {activeRoleView === 'SERVICE_ADVISOR' && (isManager || currentUser.role === 'SERVICE_ADVISOR') && <AdvisorDashboard />}
                {activeRoleView === 'TECHNICIAN' && (isManager || currentUser.role === 'TECHNICIAN') && <TechDashboard />}
                {activeRoleView === 'PARTS_SPECIALIST' && (isManager || currentUser.role === 'PARTS_SPECIALIST') && <PartsDashboard />}
                {activeRoleView === 'SALES' && (isManager || currentUser.role === 'SALES') && <SalesDashboard />}

                {/* Guard if an unauthorized view was requested */}
                {!isManager && activeRoleView !== currentUser.role && (
                  <div className="p-8 bg-white rounded-2xl border border-red-200 text-center max-w-lg mx-auto shadow-sm my-auto">
                    <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      You are signed in as <strong>{currentUser.name}</strong>. You do not have permission to access the {activeRoleView} workspace.
                    </p>
                  </div>
                )}
              </>
            )}
          </main>

          {/* Bottom Status Strip (Professional Polish Theme) */}
          <footer className="h-10 sm:h-12 flex items-center justify-between px-4 sm:px-6 bg-white border-t border-slate-200 shrink-0 text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-[10px] text-slate-600 uppercase tracking-tight font-bold">
                  Active Assigned ({assignedCount})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-[10px] text-slate-600 uppercase tracking-tight font-bold">
                  Parts Tracking Live ({partsTrackingCount})
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider hidden sm:block">
              System v2.4.0 — Secure Shop Network
            </div>
          </footer>

        </div>
      </div>

      {/* Global Modals & Notifications */}
      <ErrorBoundary fallbackTitle="Repair Order Details Error">
        <RODetailModal />
      </ErrorBoundary>
      <NewROModal />
      <LoginModal />
      <InitialSetupModal />
      <ErrorBoundary fallbackTitle="Repair Quote Modal Error">
        <RepairQuoteModal />
      </ErrorBoundary>
      <WarrantyPrintModal />
      <QuotePrintModal />
      <CustomerDirectoryModal />
      <ErrorBoundary fallbackTitle="Quote Builder Error">
        <QuoteBuilderModal 
          isOpen={isQuoteBuilderOpen} 
          onClose={closeQuoteBuilder} 
          initialQuoteId={activeQuoteBuilderId} 
        />
      </ErrorBoundary>
      <UrgentToastStack />

      {/* Draggable Floating Quick Chat Launcher (hold left mouse button and drag to reposition anywhere) */}
      <DraggableShopChatButton
        unreadShopCount={unreadShopCount}
        latestUnreadShopMessage={latestUnreadShopMessage}
        onOpenChat={() => openShopChat()}
        isChatBoxOpen={isChatBoxOpen}
      />

      {/* Real-time Shop Team Chat Box */}
      <ShopChatDrawer 
        isOpen={isChatBoxOpen} 
        onClose={() => setIsChatBoxOpen(false)} 
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Shop Management System Encountered an Error">
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}


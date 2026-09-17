import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdvisorDashboard } from './components/AdvisorDashboard';
import { TechDashboard } from './components/TechDashboard';
import { PartsDashboard } from './components/PartsDashboard';
import { SalesDashboard } from './components/SalesDashboard';
import { StaffManagement } from './components/StaffManagement';
import { RODetailModal } from './components/RODetailModal';
import { NewROModal } from './components/NewROModal';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/LoginScreen';
import { InitialSetupModal } from './components/InitialSetupModal';
import { RepairQuoteModal } from './components/RepairQuoteModal';
import { WarrantyPrintModal } from './components/WarrantyPrintModal';
import { UrgentToastStack } from './components/UrgentToastStack';
import { ShopChatDrawer } from './components/ShopChatDrawer';
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
  MessageSquare
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
    isChatBoxOpen,
    setIsChatBoxOpen,
    openShopChat,
    unreadShopCount,
    latestUnreadShopMessage,
    shopMessages,
    isAuthenticated,
    lockWorkstation
  } = useApp();
  
  // Only managers can inspect other department dashboards; all individual staff are strictly locked to their own role space
  const isManager = currentUser.role === 'SERVICE_MANAGER';
  const [viewOverride, setViewOverride] = useState<UserRole | null>(null);

  // Active space: non-managers are locked strictly to their assigned role
  const activeRoleView: UserRole = isManager ? (viewOverride || 'SERVICE_MANAGER') : currentUser.role;

  // Auto-close staff management if a non-manager is active
  React.useEffect(() => {
    if (!isManager && isStaffManagementOpen) {
      setIsStaffManagementOpen(false);
    }
  }, [isManager, isStaffManagementOpen, setIsStaffManagementOpen]);

  // Authentication Gate: Render ONLY the Login Screen until authorized staff credentials/PIN are entered
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen 
          onLoginSuccess={(loggedUser) => {
            if (loggedUser.role === 'SERVICE_MANAGER') {
              setViewOverride('SERVICE_MANAGER');
            } else {
              setViewOverride(loggedUser.role);
            }
          }}
        />
        <InitialSetupModal />
      </>
    );
  }

  // Real-time capacity calculation
  const totalActive = repairOrders.filter(r => r.status !== 'COMPLETED').length;
  const inRepair = repairOrders.filter(r => r.status === 'IN_BAY' || r.status === 'IN_REPAIR').length;
  const partsTrackingCount = repairOrders.flatMap(r => r.parts.filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED')).length;
  const assignedCount = repairOrders.filter(r => r.status === 'DISPATCHED' || (r.techId && r.status !== 'COMPLETED')).length;
  const efficiency = totalActive === 0 ? 0 : Math.min(Math.round(((inRepair + 2) / 8) * 100), 100);

  const handleSelectRole = (role: UserRole) => {
    // Non-managers are strictly blocked from accessing any other role's space
    if (!isManager) {
      return;
    }
    setIsStaffManagementOpen(false);
    setViewOverride(role);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Top Header */}
      <Navbar />

      {/* Main View Shell with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Navigation (Professional Polish Theme) */}
        <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-700 p-4 flex-col shrink-0">
          <nav className="space-y-1 mb-6">
            <div className="text-[10px] text-slate-400 font-bold uppercase px-3 mb-2 tracking-widest">
              {isManager ? 'Workstation Views (Manager Access)' : 'Authorized Workstation'}
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
                    Dealership Staff
                  </div>
                  <button
                    id="sidebar-staff-management-btn"
                    onClick={() => setIsStaffManagementOpen(true)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left transition-colors cursor-pointer ${
                      isStaffManagementOpen
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
                  <button
                    id="sidebar-advisor-console-btn"
                    className="w-full flex items-center justify-between p-3 rounded-lg text-left bg-blue-600 text-white shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-blue-300" />
                      <div>
                        <div className="text-sm font-bold leading-tight">Advisor Console</div>
                        <div className="text-[11px] text-blue-200">Customer Follow-Up & ROs</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-400/40 uppercase">
                      Advisor
                    </span>
                  </button>
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

          {/* Perspective Indicator & Lock Button */}
          <div className="px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 mb-3">
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
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-xs font-bold transition-colors cursor-pointer mb-4"
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

          {/* Shop Load Status Widget (Professional Polish) */}
          <div className="mt-auto p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 mb-1.5 font-medium">Shop Load Status</div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${efficiency}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400 uppercase">{efficiency}% Efficiency</span>
              <span className="text-[10px] text-green-400 uppercase font-bold">Active</span>
            </div>
          </div>
        </aside>

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
                  Parts & ETA
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
                  onClick={() => setIsStaffManagementOpen(true)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    isStaffManagementOpen ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Staff ({users.length})</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-white font-medium px-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentUser.role === 'SALES' && 'Sales Portal (Read-Only)'}
                  {currentUser.role === 'TECHNICIAN' && 'Technician Hub'}
                  {currentUser.role === 'SERVICE_ADVISOR' && 'Advisor Console'}
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
            {isStaffManagementOpen ? (
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
      <UrgentToastStack />

      {/* Floating Quick Chat Launcher (visible when chat box is closed) */}
      {!isChatBoxOpen && (
        <button
          id="floating-chat-launcher-btn"
          onClick={() => openShopChat()}
          className={`fixed bottom-14 sm:bottom-16 right-5 z-40 text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-xl border-2 border-white flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
            unreadShopCount > 0 
              ? 'bg-blue-700 ring-4 ring-amber-400/50 shadow-amber-500/20' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={
            latestUnreadShopMessage
              ? `New message from ${latestUnreadShopMessage.senderName}: "${latestUnreadShopMessage.content}" - Click to open chat`
              : 'Open Shop Team Chat'
          }
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 text-white ${unreadShopCount > 0 ? 'animate-bounce' : ''}`} />
            {unreadShopCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadShopCount > 9 ? '9+' : unreadShopCount}
              </span>
            )}
          </div>
          <span className="hidden sm:inline text-xs font-bold truncate max-w-[200px]">
            {latestUnreadShopMessage 
              ? `Chat from ${latestUnreadShopMessage.senderName}` 
              : 'Shop Chat'}
          </span>
          {unreadShopCount > 0 && (
            <span className="hidden sm:inline-flex text-[10px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-xs">
              {unreadShopCount}
            </span>
          )}
        </button>
      )}

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


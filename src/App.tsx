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
import { InitialSetupModal } from './components/InitialSetupModal';
import { UrgentToastStack } from './components/UrgentToastStack';
import { 
  LayoutDashboard, 
  Wrench, 
  UserCheck, 
  Package, 
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Users,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { UserRole } from './types';

const MainContent: React.FC = () => {
  const { 
    currentUser, 
    setCurrentUser, 
    users, 
    repairOrders, 
    isStaffManagementOpen, 
    setIsStaffManagementOpen 
  } = useApp();
  
  // Tab override to allow user to inspect different dashboards while preserving active login
  const [viewOverride, setViewOverride] = useState<UserRole | null>(null);

  const activeRoleView = viewOverride || currentUser.role;

  // Real-time capacity calculation
  const totalActive = repairOrders.filter(r => r.status !== 'COMPLETED').length;
  const inRepair = repairOrders.filter(r => r.status === 'IN_BAY' || r.status === 'IN_REPAIR').length;
  const partsTrackingCount = repairOrders.flatMap(r => r.parts.filter(p => p.status === 'IN_TRANSIT' || p.status === 'ORDERED')).length;
  const assignedCount = repairOrders.filter(r => r.status === 'DISPATCHED' || (r.techId && r.status !== 'COMPLETED')).length;
  const efficiency = totalActive === 0 ? 0 : Math.min(Math.round(((inRepair + 2) / 8) * 100), 100);

  const handleSelectRole = (role: UserRole) => {
    setIsStaffManagementOpen(false);
    setViewOverride(role);
    const targetUser = users.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
    }
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
              Workstation Views
            </div>

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
          </nav>

          {/* Perspective Indicator */}
          <div className="px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 mb-4">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Viewing Filter
            </div>
            <div className="text-xs font-semibold text-blue-400 truncate mt-0.5">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser.title}
            </div>
          </div>

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
          </div>

          {/* Primary Viewport */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
            {isStaffManagementOpen ? (
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
              <>
                {activeRoleView === 'SERVICE_MANAGER' && <ManagerDashboard />}
                {activeRoleView === 'SERVICE_ADVISOR' && <AdvisorDashboard />}
                {activeRoleView === 'TECHNICIAN' && <TechDashboard />}
                {activeRoleView === 'PARTS_SPECIALIST' && <PartsDashboard />}
                {activeRoleView === 'SALES' && <SalesDashboard />}
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
      <RODetailModal />
      <NewROModal />
      <LoginModal />
      <InitialSetupModal />
      <UrgentToastStack />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}


import React, { useState } from 'react';
import { 
  UserCheck, 
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
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROCard } from './ROCard';
import { ROStatus } from '../types';

export const AdvisorDashboard: React.FC = () => {
  const { currentUser, repairOrders, setSelectedRO, setIsNewROModalOpen } = useApp();
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'WAITING_DIAGNOSIS' | 'BEING_DIAGNOSED' | 'GETTING_ESTIMATE' | 'WAITING_APPROVAL' | 'APPROVED' | 'WAITING_PARTS' | 'QC_TEST' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Strictly filter by this advisor's ROs to prevent clutter
  const myROs = repairOrders.filter(ro => ro.advisorId === currentUser.id);

  // Status counts for this advisor
  const waitingDiagnosisCount = myROs.filter(r => r.status === 'WAITING_DIAGNOSIS').length;
  const beingDiagnosedCount = myROs.filter(r => r.status === 'BEING_DIAGNOSED' || r.status === 'IN_BAY').length;
  const gettingEstimateCount = myROs.filter(r => r.status === 'GETTING_ESTIMATE').length;
  const waitingApprovalCount = myROs.filter(r => r.status === 'WAITING_APPROVAL').length;
  const approvedCount = myROs.filter(r => r.status === 'APPROVED').length;
  const waitingPartsCount = myROs.filter(r => r.status === 'WAITING_PARTS').length;
  const qcTestCount = myROs.filter(r => r.status === 'QC_TEST').length;
  const completedCount = myROs.filter(r => r.status === 'COMPLETED').length;

  // Filtered list
  const displayROs = myROs.filter(ro => {
    if (activeTab === 'WAITING_DIAGNOSIS' && ro.status !== 'WAITING_DIAGNOSIS') return false;
    if (activeTab === 'BEING_DIAGNOSED' && !['BEING_DIAGNOSED', 'IN_BAY'].includes(ro.status)) return false;
    if (activeTab === 'GETTING_ESTIMATE' && ro.status !== 'GETTING_ESTIMATE') return false;
    if (activeTab === 'WAITING_APPROVAL' && ro.status !== 'WAITING_APPROVAL') return false;
    if (activeTab === 'APPROVED' && ro.status !== 'APPROVED') return false;
    if (activeTab === 'WAITING_PARTS' && ro.status !== 'WAITING_PARTS') return false;
    if (activeTab === 'QC_TEST' && ro.status !== 'QC_TEST') return false;
    if (activeTab === 'COMPLETED' && ro.status !== 'COMPLETED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRO = ro.id.toLowerCase().includes(q);
      const matchCust = ro.customerName.toLowerCase().includes(q);
      const matchVeh = `${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}`.toLowerCase().includes(q);
      const matchTech = ro.techName?.toLowerCase().includes(q);
      return matchRO || matchCust || matchVeh || matchTech;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Advisor Bio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Advisor Desk: {currentUser.name}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
              Personal Queue
            </span>
          </div>
        </div>

        <button
          id="advisor-new-ro-btn"
          onClick={() => setIsNewROModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer RO</span>
        </button>
      </div>

      {/* Quick Status Pill Filters (Professional Polish Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 truncate">All My ROs</div>
          <div className="text-lg sm:text-xl font-black">{myROs.length}</div>
        </button>

        <button
          onClick={() => setActiveTab('WAITING_DIAGNOSIS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'WAITING_DIAGNOSIS'
              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Waiting Diag</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600">{waitingDiagnosisCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('BEING_DIAGNOSED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'BEING_DIAGNOSED'
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Being Diagnosed</span>
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600">{beingDiagnosedCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('GETTING_ESTIMATE')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'GETTING_ESTIMATE'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Getting Estimate</span>
            <Calculator className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-indigo-600">{gettingEstimateCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('WAITING_APPROVAL')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'WAITING_APPROVAL'
              ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Needs Approval</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-orange-600">{waitingApprovalCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Approved</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-teal-600">{approvedCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('WAITING_PARTS')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'WAITING_PARTS'
              ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Waiting Parts</span>
            <Package className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-600">{waitingPartsCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('QC_TEST')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'QC_TEST'
              ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-cyan-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">QC / Test Drive</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-cyan-600">{qcTestCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'bg-green-600 text-white border-green-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-green-50/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 truncate">Ready/Done</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          </div>
          <div className="text-lg sm:text-xl font-black text-green-600">{completedCount}</div>
        </button>

      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter my ROs by customer, vehicle, RO number, or technician..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Repair Orders List */}
      <div>
        {displayROs.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No repair orders in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              {myROs.length === 0 
                ? "You currently have no repair orders assigned. Click 'New Customer RO' to open one." 
                : "No orders match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayROs.map(ro => (
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

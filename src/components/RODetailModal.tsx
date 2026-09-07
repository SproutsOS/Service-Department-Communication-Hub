import React, { useState } from 'react';
import { 
  X, 
  Send, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  Wrench, 
  Package, 
  MessageSquare, 
  History, 
  Plus, 
  CheckCircle2, 
  Phone, 
  FileText,
  Truck,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStatus, PartStatus, UserRole } from '../types';
import { STATUS_CONFIG } from '../data/mockData';
import { formatDateTime, formatTimeOnly, formatRelativeTime, formatEtaBadge, formatDurationSince, getDiagnosticStatusDetails } from '../utils/formatters';

export const RODetailModal: React.FC = () => {
  const { 
    selectedRO, 
    setSelectedRO, 
    currentUser, 
    users, 
    updateROStatus, 
    startDiagnosis,
    dispatchRO, 
    sendMessage, 
    addPartOrder, 
    updatePartStatus 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'CHAT' | 'PARTS' | 'HISTORY'>('DETAILS');
  const [chatInput, setChatInput] = useState('');
  const [isUrgentMessage, setIsUrgentMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isUrgentStatusUpdate, setIsUrgentStatusUpdate] = useState(false);

  // New Part Form state
  const [showAddPart, setShowAddPart] = useState(false);
  const [partNumber, setPartNumber] = useState('');
  const [partDescription, setPartDescription] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [partVendor, setPartVendor] = useState('Ford Direct Warehouse');
  const [partEtaTime, setPartEtaTime] = useState('14:30');
  const [partTracking, setPartTracking] = useState('');

  // Dispatch selector state
  const [selectedTechId, setSelectedTechId] = useState(selectedRO?.techId || '');
  const [selectedBay, setSelectedBay] = useState(selectedRO?.bay || '');

  if (!selectedRO) return null;

  const currentStatusInfo = STATUS_CONFIG[selectedRO.status] || STATUS_CONFIG.CREATED;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(selectedRO.id, chatInput, isUrgentMessage);
    setChatInput('');
    setIsUrgentMessage(false);
  };

  const handleStatusChange = (newStatus: ROStatus) => {
    updateROStatus(selectedRO.id, newStatus, statusNote, isUrgentStatusUpdate);
    setStatusNote('');
    setIsUrgentStatusUpdate(false);
  };

  const handleDispatch = () => {
    if (!selectedTechId) return;
    dispatchRO(selectedRO.id, selectedTechId, selectedBay);
  };

  const handleAddPartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim() || !partDescription.trim()) return;

    // Build today's date with chosen ETA time
    const today = new Date();
    const [hours, minutes] = partEtaTime.split(':');
    const etaDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours || '14'), parseInt(minutes || '00'));

    addPartOrder(selectedRO.id, {
      partNumber: partNumber.trim(),
      description: partDescription.trim(),
      quantity: partQuantity,
      status: 'ORDERED',
      vendor: partVendor,
      estimatedArrival: etaDate.toISOString(),
      trackingNumber: partTracking.trim() || undefined,
    });

    setPartNumber('');
    setPartDescription('');
    setShowAddPart(false);
  };

  const technicians = users.filter(u => u.role === 'TECHNICIAN');
  const statusOptions: ROStatus[] = [
    'CREATED',
    'DISPATCHED',
    'WAITING_DIAGNOSIS',
    'BEING_DIAGNOSED',
    'GETTING_ESTIMATE',
    'WAITING_APPROVAL',
    'APPROVED',
    'WAITING_PARTS',
    'IN_REPAIR',
    'QC_TEST',
    'COMPLETED'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="ro-detail-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50 gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg sm:text-xl text-blue-600 tracking-tight">
                #{selectedRO.id}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${currentStatusInfo.badgeClass}`}>
                {currentStatusInfo.label}
              </span>
              {selectedRO.isUrgent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgent Attention Required
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">{selectedRO.customerName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {selectedRO.customerPhone}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700">
                {selectedRO.vehicle.year} {selectedRO.vehicle.make} {selectedRO.vehicle.model}
              </span>
              <span className="text-slate-400">({selectedRO.vehicle.vin})</span>
            </div>
          </div>

          <button
            id="close-ro-detail-btn"
            onClick={() => setSelectedRO(null)}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-white gap-2">
          <button
            id="ro-tab-details"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>RO Details & Assignment</span>
          </button>

          <button
            id="ro-tab-chat"
            onClick={() => setActiveTab('CHAT')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'CHAT'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Live Communication</span>
            {selectedRO.messages.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.messages.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-parts"
            onClick={() => setActiveTab('PARTS')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'PARTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Parts & ETA Tracking</span>
            {selectedRO.parts.length > 0 && (
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {selectedRO.parts.length}
              </span>
            )}
          </button>

          <button
            id="ro-tab-history"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 px-3 border-b-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History ({selectedRO.history.length})</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: DETAILS & ASSIGNMENT & QUICK STATUS CHANGE */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">
              
              {/* Primary Concern & Tech Notes */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Customer Primary Concern
                </h4>
                <p className="text-sm text-slate-900 font-medium leading-relaxed">
                  {selectedRO.primaryConcern}
                </p>
                {selectedRO.diagnosticNotes && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <h5 className="text-xs font-bold text-slate-700 mb-1">
                      Technician Diagnostic Findings:
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed font-mono bg-white p-2.5 rounded border border-slate-200">
                      {selectedRO.diagnosticNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Metadata Grid: Created, Assigned, Advisor, Tech, Promised */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Date Repair Order Made */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Date RO Was Made
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateTime(selectedRO.createdAt)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Logged by {selectedRO.advisorName}
                  </div>
                </div>

                {/* When Assigned and to Which Tech */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5 text-indigo-500" />
                    When Assigned & Tech
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {selectedRO.techName ? selectedRO.techName : 'Unassigned'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedRO.dispatchedAt ? (
                      `Assigned: ${formatDateTime(selectedRO.dispatchedAt)} • ${selectedRO.bay || 'Bay Pending'}`
                    ) : (
                      <span className="text-amber-600 font-semibold">Not yet assigned</span>
                    )}
                  </div>
                </div>

                {/* Promised Completion Time */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Customer Promised Time
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {formatDateTime(selectedRO.promisedTime)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Service Advisor: {selectedRO.advisorName}
                  </div>
                </div>

              </div>

              {/* Diagnostic Phase Tracking Box: Waiting to be Diagnosed vs Being Diagnosed */}
              {selectedRO.status === 'WAITING_DIAGNOSIS' && (
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Clock className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Vehicle is Waiting to be Diagnosed
                      </div>
                      <div className="text-xs text-amber-800 mt-0.5">
                        Staged in {selectedRO.bay || 'technician bay'} awaiting initial scan & teardown. Placed in queue at{' '}
                        <strong className="font-semibold">{formatTimeOnly(selectedRO.waitingDiagnosisAt)}</strong> ({formatDurationSince(selectedRO.waitingDiagnosisAt)} wait time).
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startDiagnosis(selectedRO.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Begin Diagnosis Now</span>
                  </button>
                </div>
              )}

              {(selectedRO.status === 'BEING_DIAGNOSED' || selectedRO.status === 'IN_BAY') && (
                <div className="p-4 rounded-xl border border-blue-300 bg-blue-50/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                      <Wrench className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                        Vehicle is Being Diagnosed
                      </div>
                      <div className="text-xs text-blue-800 mt-0.5">
                        Active testing & inspection underway by <strong className="font-semibold">{selectedRO.techName || 'assigned technician'}</strong> in {selectedRO.bay || 'bay'}.
                        Commenced at <strong className="font-semibold">{formatTimeOnly(selectedRO.diagnosisStartedAt)}</strong> ({formatDurationSince(selectedRO.diagnosisStartedAt)} active duration).
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/90 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider shrink-0">
                    Active Inspection
                  </span>
                </div>
              )}

              {/* Status Update Control Section */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Update Repair Order Status in Real-Time
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Logged as <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.title})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statusOptions.map(opt => {
                    const cfg = STATUS_CONFIG[opt];
                    const isCurrent = selectedRO.status === opt;
                    return (
                      <button
                        key={opt}
                        id={`update-status-btn-${opt}`}
                        onClick={() => handleStatusChange(opt)}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? `${cfg.badgeClass} ring-2 ring-blue-600 font-bold`
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-semibold">{cfg.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cfg.description}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-3 pt-3 border-t border-slate-100">
                  <input
                    type="text"
                    placeholder="Optional note for status change log (e.g., scan tool complete, customer phoned)..."
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUrgentStatusUpdate}
                      onChange={e => setIsUrgentStatusUpdate(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-red-600">Mark Urgent Push</span>
                  </label>
                </div>
              </div>

              {/* Technician Assignment Section (For Manager & Advisors) */}
              {(currentUser.role === 'SERVICE_MANAGER' || currentUser.role === 'SERVICE_ADVISOR') && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Technician & Bay Assignment
                  </h4>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <select
                      id="dispatch-tech-select"
                      value={selectedTechId}
                      onChange={e => {
                        const techId = e.target.value;
                        setSelectedTechId(techId);
                        const tech = technicians.find(t => t.id === techId);
                        if (tech?.bayNumber) {
                          setSelectedBay(tech.bayNumber);
                        }
                      }}
                      className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-700 font-semibold"
                    >
                      <option value="">Select Technician...</option>
                      {technicians.map(tech => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name} — {tech.title} ({tech.bayNumber || 'No Bay'})
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Bay / Stall (e.g. Bay 3)"
                      value={selectedBay}
                      onChange={e => setSelectedBay(e.target.value)}
                      className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg sm:w-44 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                    />

                    <button
                      id="confirm-dispatch-btn"
                      onClick={handleDispatch}
                      disabled={!selectedTechId}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {selectedRO.techId ? 'Re-Assign Job' : 'Assign to Tech'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: LIVE COMMUNICATION THREAD */}
          {activeTab === 'CHAT' && (
            <div className="flex flex-col h-[480px]">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Inter-Department Communication Thread
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Direct channel between Service Manager, Service Advisors, Techs, & Parts
                  </p>
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                  {selectedRO.messages.length} messages logged
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {selectedRO.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    No messages yet on {selectedRO.id}. Start the conversation below.
                  </div>
                ) : (
                  selectedRO.messages.map(msg => {
                    const isSelf = msg.senderId === currentUser.id;
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-bold text-slate-700">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold uppercase">
                            {msg.senderRole.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(msg.timestamp)}
                          </span>
                        </div>

                        <div 
                          className={`max-w-md p-3 rounded-xl text-xs leading-relaxed ${
                            msg.isUrgent
                              ? 'bg-red-50 text-red-950 border border-red-200 font-medium'
                              : isSelf
                              ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200'
                          }`}
                        >
                          {msg.isUrgent && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">
                              <AlertTriangle className="w-3 h-3" /> Urgent Notice
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isUrgentMessage}
                      onChange={e => setIsUrgentMessage(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Flag as Urgent Push Notification
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">Press Enter to send</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Message regarding ${selectedRO.id} as ${currentUser.name}...`}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    className="flex-1 text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* TAB 3: PARTS ORDERED & TRACKED WITH ESTIMATED ARRIVAL */}
          {activeTab === 'PARTS' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Parts Ordered & Tracking Status
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Live delivery ETAs and parts staging directly on this repair order
                  </p>
                </div>

                <button
                  id="add-part-toggle-btn"
                  onClick={() => setShowAddPart(!showAddPart)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Order New Part</span>
                </button>
              </div>

              {/* Add Part Form */}
              {showAddPart && (
                <form 
                  onSubmit={handleAddPartSubmit}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-100 shadow-sm"
                >
                  <h5 className="text-xs font-bold text-slate-900">Order Parts from Supplier</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. ML3Z-8C419-A"
                        value={partNumber}
                        onChange={e => setPartNumber(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Part Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Auxiliary Coolant Pump"
                        value={partDescription}
                        onChange={e => setPartDescription(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Supplier / Vendor</label>
                      <input
                        type="text"
                        value={partVendor}
                        onChange={e => setPartVendor(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Estimated Arrival Time Today (ETA)</label>
                      <input
                        type="time"
                        value={partEtaTime}
                        onChange={e => setPartEtaTime(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPart(false)}
                      className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer"
                    >
                      Confirm Order & Notify Tech
                    </button>
                  </div>
                </form>
              )}

              {/* Parts List */}
              {selectedRO.parts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">No parts currently ordered for this repair order.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedRO.parts.map(part => {
                    const etaBadge = formatEtaBadge(part.estimatedArrival);
                    return (
                      <div 
                        key={part.id}
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                #{part.partNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-800">
                                {part.description} (Qty: {part.quantity})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Vendor: {part.vendor} {part.trackingNumber ? `• Tracking: ${part.trackingNumber}` : ''}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : part.status === 'IN_TRANSIT'
                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                              {part.status.replace('_', ' ')}
                            </span>
                            {part.estimatedArrival && (
                              <div className="mt-1">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  etaBadge.pastDue
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                                }`}>
                                  {etaBadge.text}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Part Status Transition Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">Quick Update Status:</span>
                          <div className="flex gap-1.5">
                            {(['ORDERED', 'IN_TRANSIT', 'RECEIVED', 'ISSUED_TO_TECH'] as PartStatus[]).map(st => (
                              <button
                                key={st}
                                onClick={() => updatePartStatus(selectedRO.id, part.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                  part.status === st
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {st === 'ISSUED_TO_TECH' ? 'Issued to Tech' : st.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 4: AUDIT HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Real-Time Event & Status Audit Trail
              </h4>
              <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                {selectedRO.history.map(item => (
                  <div key={item.id} className="relative pb-2">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white"></span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.notes}
                    </p>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Updated by: <strong className="font-semibold text-slate-700">{item.updatedByName}</strong> ({item.userRole.replace('_', ' ')})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Status: <strong className="text-slate-800 font-bold">{currentStatusInfo.label}</strong>
          </div>
          <button
            onClick={() => setSelectedRO(null)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

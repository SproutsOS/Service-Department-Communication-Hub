import React, { useState } from 'react';
import { 
  Smartphone, 
  Wrench, 
  Clock, 
  Package, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Phone,
  Laptop,
  Plus,
  Play
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { STATUS_CONFIG } from '../data/mockData';
import { ROStatus } from '../types';
import { formatEtaBadge, calculateDispatchedDuration, formatDurationSince, formatTimeOnly } from '../utils/formatters';

export const TechMobileView: React.FC = () => {
  const { 
    currentUser, 
    repairOrders, 
    updateROStatus, 
    startDiagnosis,
    sendMessage, 
    setIsMobileSimulated,
    setSelectedRO,
    addPartOrder
  } = useApp();

  // Filter to this technician's active ROs (or all active ROs if current user is not a tech, with quick select)
  const isTech = currentUser.role === 'TECHNICIAN';
  const myROs = repairOrders.filter(r => isTech ? r.techId === currentUser.id : true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [quickNote, setQuickNote] = useState('');
  const [isUrgentPing, setIsUrgentPing] = useState(false);
  const [showPartRequest, setShowPartRequest] = useState(false);
  const [requestedPartNumber, setRequestedPartNumber] = useState('');
  const [requestedPartDesc, setRequestedPartDesc] = useState('');

  const currentRO = myROs[activeIndex] || myROs[0];

  const handleStatusClick = (status: ROStatus) => {
    if (!currentRO) return;
    updateROStatus(currentRO.id, status, `Updated on mobile bay terminal by ${currentUser.name}`);
  };

  const handleSendNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRO || !quickNote.trim()) return;
    sendMessage(currentRO.id, quickNote.trim(), isUrgentPing);
    setQuickNote('');
    setIsUrgentPing(false);
  };

  const handlePartRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRO || !requestedPartDesc.trim()) return;

    addPartOrder(currentRO.id, {
      partNumber: requestedPartNumber.trim() || 'REQ-TBD',
      description: requestedPartDesc.trim(),
      quantity: 1,
      status: 'REQUESTED',
      vendor: 'Dealership Parts Department',
      estimatedArrival: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    });

    setRequestedPartNumber('');
    setRequestedPartDesc('');
    setShowPartRequest(false);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white min-h-[90vh] rounded-3xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col">
      
      {/* Mobile Top Bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight">{currentUser.name}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">{currentUser.bayNumber || 'Mobile Service Bay'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSimulated(false)}
            className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-full text-slate-300 font-medium"
            title="Exit mobile view"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* RO Carousel Selector */}
      {myROs.length > 1 && (
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="p-1 rounded bg-slate-800 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-bold text-center">
            <span>Job {activeIndex + 1} of {myROs.length}</span>
            <span className="text-indigo-400 ml-1.5 font-mono">({currentRO?.id})</span>
          </div>
          <button
            onClick={() => setActiveIndex(prev => Math.min(myROs.length - 1, prev + 1))}
            disabled={activeIndex === myROs.length - 1}
            className="p-1 rounded bg-slate-800 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Body */}
      {!currentRO ? (
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
          <Wrench className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-300">No repair orders assigned</p>
          <p className="text-xs text-slate-500 mt-1">Wait for advisor assignment or switch to another user role.</p>
        </div>
      ) : (
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Active Job Hero Card */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 shadow-md space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-indigo-400">{currentRO.id}</span>
                  {currentRO.isUrgent && (
                    <span className="text-[10px] font-bold uppercase bg-red-600/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/40">
                      Urgent
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {currentRO.customerName}
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  {currentRO.vehicle.year} {currentRO.vehicle.make} {currentRO.vehicle.model}
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_CONFIG[currentRO.status]?.badgeClass || ''}`}>
                  {STATUS_CONFIG[currentRO.status]?.label}
                </span>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {calculateDispatchedDuration(currentRO.dispatchedAt)}
                </div>
              </div>
            </div>

            {/* Concern */}
            <div className="p-3 bg-slate-900/80 rounded-xl text-xs text-slate-300 border border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Primary Concern:</span>
              <p className="line-clamp-3 font-medium text-white">{currentRO.primaryConcern}</p>
            </div>

            {/* Diagnostic Stage Mobile Banner */}
            {currentRO.status === 'WAITING_DIAGNOSIS' && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Waiting to be Diagnosed</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded-full">
                    {formatDurationSince(currentRO.waitingDiagnosisAt)} in queue
                  </span>
                </div>
                <button
                  onClick={() => startDiagnosis(currentRO.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Begin Diagnosis Now</span>
                </button>
              </div>
            )}

            {currentRO.status === 'BEING_DIAGNOSED' && (
              <div className="p-3 bg-blue-500/20 border border-blue-500/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <Wrench className="w-3.5 h-3.5 text-blue-400" />
                  <span>Vehicle is Being Diagnosed</span>
                </div>
                <span className="text-[10px] font-bold text-blue-200 bg-blue-500/30 px-2 py-0.5 rounded-full">
                  {formatDurationSince(currentRO.diagnosisStartedAt)} active
                </span>
              </div>
            )}
          </div>

          {/* Big Tactile Status Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              1-Tap Status Update (Mobile):
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'WAITING_DIAGNOSIS', label: 'Waiting Diag', color: 'bg-amber-600 hover:bg-amber-500' },
                { key: 'BEING_DIAGNOSED', label: 'Being Diagnosed', color: 'bg-blue-600 hover:bg-blue-500' },
                { key: 'GETTING_ESTIMATE', label: 'Getting Estimate', color: 'bg-indigo-600 hover:bg-indigo-500' },
                { key: 'WAITING_APPROVAL', label: 'Needs Approval', color: 'bg-orange-600 hover:bg-orange-500' },
                { key: 'APPROVED', label: 'Approved', color: 'bg-teal-600 hover:bg-teal-500' },
                { key: 'WAITING_PARTS', label: 'Waiting on Parts', color: 'bg-purple-600 hover:bg-purple-500' },
                { key: 'IN_REPAIR', label: 'Active Assembly', color: 'bg-emerald-600 hover:bg-emerald-500' },
                { key: 'QC_TEST', label: 'Quality Check/Test Drive', color: 'bg-cyan-600 hover:bg-cyan-500' },
                { key: 'COMPLETED', label: 'Vehicle Ready & Done', color: 'bg-slate-100 text-slate-950 hover:bg-white' },
              ].map(btn => {
                const isSelected = currentRO.status === btn.key;
                return (
                  <button
                    key={btn.key}
                    id={`mobile-status-${btn.key}`}
                    onClick={() => handleStatusClick(btn.key as ROStatus)}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
                      isSelected 
                        ? 'border-white ring-2 ring-white/60 ' + btn.color
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{btn.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parts Ordered & Live Arrival Section */}
          {currentRO.parts.length > 0 && (
            <div className="p-3.5 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-purple-400" />
                  Parts on Order & ETA
                </span>
                <span className="text-[10px] text-purple-300 font-bold">
                  {currentRO.parts.length} item(s)
                </span>
              </div>

              <div className="space-y-1.5">
                {currentRO.parts.map(part => {
                  const etaBadge = formatEtaBadge(part.estimatedArrival);
                  return (
                    <div 
                      key={part.id}
                      className="p-2 bg-slate-900 rounded-lg border border-slate-700/80 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate">{part.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">#{part.partNumber}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          part.status === 'RECEIVED' || part.status === 'ISSUED_TO_TECH'
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                            : 'bg-amber-900/60 text-amber-300 border border-amber-700'
                        }`}>
                          {part.status.replace('_', ' ')}
                        </div>
                        {part.estimatedArrival && part.status !== 'ISSUED_TO_TECH' && (
                          <div className="text-[10px] font-bold text-indigo-400 mt-0.5">
                            {etaBadge.text}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Request Parts Form Toggle */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Need Additional Parts?</span>
              <button
                onClick={() => setShowPartRequest(!showPartRequest)}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request Part</span>
              </button>
            </div>

            {showPartRequest && (
              <form onSubmit={handlePartRequestSubmit} className="mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Part description / name"
                  value={requestedPartDesc}
                  onChange={e => setRequestedPartDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  required
                />
                <input
                  type="text"
                  placeholder="Part # if known (e.g. 04465-AZ201)"
                  value={requestedPartNumber}
                  onChange={e => setRequestedPartNumber(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPartRequest(false)}
                    className="px-2.5 py-1 text-xs text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg"
                  >
                    Send to Parts Dept
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Message to Advisor */}
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Quick Ping to {currentRO.advisorName}
              </span>
              <label className="flex items-center gap-1 text-[10px] font-bold text-red-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgentPing}
                  onChange={e => setIsUrgentPing(e.target.checked)}
                  className="rounded text-red-500"
                />
                <span>Urgent Chime</span>
              </label>
            </div>

            <form onSubmit={handleSendNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Type status memo or question..."
                value={quickNote}
                onChange={e => setQuickNote(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!quickNote.trim()}
                className="px-3 py-2 bg-indigo-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Sticky Bottom Bar: Full RO Details button */}
      {currentRO && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Advisor: <strong className="text-white font-medium">{currentRO.advisorName}</strong>
          </span>
          <button
            onClick={() => setSelectedRO(currentRO)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
          >
            Open Full RO Drawer &rarr;
          </button>
        </div>
      )}

    </div>
  );
};

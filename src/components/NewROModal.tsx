import React, { useState } from 'react';
import { X, Plus, FileText, Send, User, Car, Clock, Phone, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NewROModal: React.FC = () => {
  const { isNewROModalOpen, setIsNewROModalOpen, createRepairOrder, users, setSelectedRO, repairOrders } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [year, setYear] = useState(2023);
  const [make, setMake] = useState('Ford');
  const [model, setModel] = useState('Explorer ST');
  const [vin, setVin] = useState('1FM5K8GC8PGA' + Math.floor(10000 + Math.random() * 90000));
  const [mileage, setMileage] = useState(32500);
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [promisedTime, setPromisedTime] = useState('');
  const [techId, setTechId] = useState('');
  const [bay, setBay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  if (!isNewROModalOpen) return null;

  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !primaryConcern.trim()) return;

    const newROId = createRepairOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '(555) 555-0199',
      vehicle: {
        year: Number(year),
        make: make.trim(),
        model: model.trim(),
        vin: vin.trim(),
        mileage: Number(mileage),
      },
      primaryConcern: primaryConcern.trim(),
      promisedTime: promisedTime || undefined,
      techId: techId || undefined,
      bay: bay || undefined,
      isUrgent,
    });

    setIsNewROModalOpen(false);

    // Automatically open newly created RO
    setTimeout(() => {
      const created = repairOrders.find(r => r.id === newROId);
      if (created) setSelectedRO(created);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="new-ro-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Create New Repair Order</h2>
              <p className="text-xs text-slate-500 font-medium">
                Log customer intake, primary diagnostic concern, and assign to bay
              </p>
            </div>
          </div>
          <button
            id="close-new-ro-modal-btn"
            onClick={() => setIsNewROModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Customer Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Adams"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-blue-600" /> Vehicle Specs
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Make</label>
                <input
                  type="text"
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Model & Trim</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">VIN (17-character)</label>
                <input
                  type="text"
                  value={vin}
                  onChange={e => setVin(e.target.value)}
                  className="w-full text-xs px-3 py-2 font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Odometer Mileage</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={e => setMileage(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Primary Concern */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
              Customer Complaint / Primary Concern *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Customer states check engine light on, coolant leak observed on driveway, loud fan noise during idle..."
              value={primaryConcern}
              onChange={e => setPrimaryConcern(e.target.value)}
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed shadow-xs"
            />
          </div>

          {/* Assign to Technician */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" /> Immediate Assignment (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Assign Technician</label>
                <select
                  value={techId}
                  onChange={e => {
                    const id = e.target.value;
                    setTechId(id);
                    const tech = technicians.find(t => t.id === id);
                    if (tech?.bayNumber) setBay(tech.bayNumber);
                  }}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-700"
                >
                  <option value="">Leave in Queue (Unassigned)</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.title} ({t.bayNumber || 'No Bay'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Assigned Bay</label>
                <input
                  type="text"
                  placeholder="e.g. Bay 3"
                  value={bay}
                  onChange={e => setBay(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Urgent checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
              />
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High Priority / Urgent Push Alert
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsNewROModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Open Repair Order
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

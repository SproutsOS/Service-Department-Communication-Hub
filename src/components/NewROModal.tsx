import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, FileText, Send, User, Car, Clock, Phone, AlertTriangle, Loader2, CheckCircle2, Sparkles, RefreshCw, Hash, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { decodeVin } from '../utils/vinDecoder';


export const NewROModal: React.FC = () => {
  const { isNewROModalOpen, setIsNewROModalOpen, createRepairOrder, users, setSelectedRO, repairOrders } = useApp();

  // Next suggested RO number based on current orders
  const nextSuggestedRoNumber = React.useMemo(() => {
    const maxRoNum = repairOrders.reduce((max, ro) => {
      const match = ro.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 10488);
    return `RO-${maxRoNum + 1}`;
  }, [repairOrders]);

  const [roNumber, setRoNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [year, setYear] = useState<number | string>('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState<number | string>('');
  const [concerns, setConcerns] = useState<string[]>(['']);
  const [promisedTime, setPromisedTime] = useState('');
  const [techId, setTechId] = useState('');
  const [bay, setBay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isWaiter, setIsWaiter] = useState(false);

  // Initialize all fields to completely empty when modal opens
  useEffect(() => {
    if (isNewROModalOpen) {
      setRoNumber('');
      setCustomerName('');
      setCustomerPhone('');
      setYear('');
      setMake('');
      setModel('');
      setVin('');
      setMileage('');
      setConcerns(['']);
      setPromisedTime('');
      setTechId('');
      setBay('');
      setIsUrgent(false);
      setIsWaiter(false);
      setVinDecodedMsg(null);
      setVinError(null);
    }
  }, [isNewROModalOpen]);

  // Duplicate RO check
  const cleanedRoNumber = roNumber.trim().toUpperCase();
  const isDuplicateRo = Boolean(
    cleanedRoNumber && repairOrders.some(ro => ro.id.toUpperCase() === cleanedRoNumber)
  );

  const handleConcernChange = (index: number, val: string) => {
    setConcerns(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddConcern = (initialText = '') => {
    setConcerns(prev => [...prev, initialText]);
  };

  const handleRemoveConcern = (index: number) => {
    setConcerns(prev => {
      if (prev.length <= 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };


  // Auto-VIN Decoding state
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinDecodedMsg, setVinDecodedMsg] = useState<string | null>(null);
  const [vinError, setVinError] = useState<string | null>(null);
  const decodeAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Function to execute VIN lookup
  const runVinDecode = async (inputVin: string, isManual = false) => {
    const cleanVin = inputVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanVin.length < 10) {
      if (isManual) setVinError('VIN must be at least 10 characters');
      return;
    }

    if (decodeAbortRef.current) {
      decodeAbortRef.current.abort();
    }
    decodeAbortRef.current = new AbortController();

    setIsDecodingVin(true);
    setVinError(null);
    setVinDecodedMsg(null);

    try {
      const result = await decodeVin(cleanVin, decodeAbortRef.current.signal);
      if (result.success) {
        if (result.year) setYear(result.year);
        if (result.make) setMake(result.make);
        if (result.model) setModel(result.model);
        
        const summary = [result.year, result.make, result.model].filter(Boolean).join(' ');
        setVinDecodedMsg(summary ? `Auto-populated: ${summary}` : 'Decoded successfully');
      } else if (isManual || cleanVin.length === 17) {
        setVinError(result.error || 'Could not decode VIN');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setVinError('Error decoding VIN');
      }
    } finally {
      setIsDecodingVin(false);
    }
  };

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setVin(rawVal);
    setVinDecodedMsg(null);
    setVinError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Auto-decode immediately if full 17 characters, otherwise debounce when 10+ characters
    if (rawVal.length === 17) {
      runVinDecode(rawVal, false);
    } else if (rawVal.length >= 10) {
      debounceTimerRef.current = setTimeout(() => {
        runVinDecode(rawVal, false);
      }, 500);
    }
  };

  if (!isNewROModalOpen) return null;

  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  const validConcerns = concerns.map(c => c.trim()).filter(Boolean);
  const hasValidConcern = validConcerns.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !hasValidConcern || isDuplicateRo) return;

    const newROId = createRepairOrder({
      roNumber: cleanedRoNumber || undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      vehicle: {
        year: year ? Number(year) : new Date().getFullYear(),
        make: make.trim() || 'Vehicle',
        model: model.trim() || '',
        vin: vin.trim(),
        mileage: mileage ? Number(mileage) : 0,
      },
      primaryConcern: validConcerns[0],
      concerns: validConcerns,
      promisedTime: promisedTime || undefined,
      techId: techId || undefined,
      bay: bay || undefined,
      isUrgent,
      isWaiter,
    });

    setIsNewROModalOpen(false);
    setConcerns(['']);

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
        className="bg-white rounded-xl shadow-2xl border-2 border-slate-400 max-w-2xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 border-b-2 border-slate-300 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Create New Repair Order</h2>
              <p className="text-xs text-slate-600 font-medium">
                Log customer intake, primary diagnostic concern, and assign to technician
              </p>
            </div>
          </div>
          <button
            id="close-new-ro-modal-btn"
            onClick={() => setIsNewROModalOpen(false)}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Repair Order Reference & Promised Time */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" /> Repair Order Reference
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Dealership / DMS Reference
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                    Repair Order # (RO Number)
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="new-ro-number-input"
                    type="text"
                    placeholder="Enter Repair Order # (e.g. 10489)"
                    value={roNumber}
                    onChange={e => setRoNumber(e.target.value)}
                    className={`w-full text-xs font-mono font-bold px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:outline-none uppercase bg-white shadow-xs ${
                      isDuplicateRo
                        ? 'border-red-500 focus:ring-red-400 text-red-700 bg-red-50/50'
                        : 'border-slate-600 focus:border-blue-600 focus:ring-blue-500/20 text-slate-900'
                    }`}
                  />
                </div>
                {isDuplicateRo ? (
                  <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-center gap-1 bg-red-50 p-1.5 rounded-md border-2 border-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Repair Order #{cleanedRoNumber} already exists in the system. Please enter a unique RO number.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter your shop or DMS repair order number.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Promised Completion Time (Optional)
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={promisedTime}
                    onChange={e => setPromisedTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-medium text-slate-800"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Promise time committed to the customer at vehicle intake.
                </p>
              </div>
            </div>
          </div>

          {/* Customer Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-900 bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs text-slate-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-600" /> Vehicle Information
              </h3>
              <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Decodes Year, Make & Model
              </span>
            </div>

            {/* VIN Input Box with Decode Status */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <span>VIN (Vehicle Identification Number)</span>
                  {isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium normal-case">
                      <Loader2 className="w-3 h-3 animate-spin" /> Decoding VIN with NHTSA...
                    </span>
                  )}
                  {vinDecodedMsg && !isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold normal-case bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {vinDecodedMsg}
                    </span>
                  )}
                  {vinError && !isDecodingVin && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium normal-case bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                      {vinError}
                    </span>
                  )}
                </label>

                {vin.trim().length >= 10 && (
                  <button
                    type="button"
                    onClick={() => runVinDecode(vin, true)}
                    disabled={isDecodingVin}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isDecodingVin ? 'animate-spin' : ''}`} /> Decode VIN
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter or paste 17-character VIN"
                  value={vin}
                  onChange={handleVinChange}
                  maxLength={17}
                  className="w-full text-xs px-3 py-2.5 font-mono font-bold tracking-wider border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase bg-white shadow-xs text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Enter or paste any 17-digit VIN. Year, Make, and Model will automatically be fetched and entered into the fields below.
              </p>
            </div>

            {/* Year, Make, Model & Trim */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Year</label>
                <input
                  type="number"
                  placeholder="Year"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Make</label>
                <input
                  type="text"
                  placeholder="Make"
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Model & Trim</label>
                <input
                  type="text"
                  placeholder="Model & Trim"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="mt-2.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Odometer Mileage</label>
              <input
                type="number"
                placeholder="Mileage"
                value={mileage}
                onChange={e => setMileage(e.target.value)}
                className="w-full sm:w-1/2 text-xs px-3 py-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white shadow-xs text-slate-900"
              />
            </div>
          </div>

          {/* Customer Complaints & Concerns Section */}
          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-400 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" /> Customer Complaints / Concerns *
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {concerns.length} {concerns.length === 1 ? 'Line Item' : 'Line Items'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddConcern()}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md border-2 border-slate-400 hover:border-blue-600 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Concern Line
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Add all customer complaints, symptoms, or requested service lines. Line 1 is logged as the primary complaint.
            </p>

            {/* List of Concerns */}
            <div className="space-y-2.5">
              {concerns.map((concern, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border-2 border-slate-400 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 tracking-wider">
                      {idx === 0 ? 'Line 1 (Primary Concern)' : `Line ${idx + 1}`}
                    </span>
                    {concerns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveConcern(idx)}
                        className="text-[11px] text-red-500 hover:text-red-700 cursor-pointer flex items-center gap-1 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
                        title="Remove this line item"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Line
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    required={idx === 0}
                    placeholder={
                      idx === 0
                        ? "Enter primary customer complaint or requested service..."
                        : `Enter additional concern line ${idx + 1}...`
                    }
                    value={concern}
                    onChange={e => handleConcernChange(idx, e.target.value)}
                    className="w-full text-xs p-2.5 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed bg-white text-slate-900 font-medium"
                  />
                </div>
              ))}
            </div>

          </div>

          {/* Assign to Technician */}
          <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-400 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-blue-600" /> Immediate Assignment (Optional)
            </h3>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1">Assign Technician</label>
              <select
                value={techId}
                onChange={e => {
                  const id = e.target.value;
                  setTechId(id);
                  const tech = technicians.find(t => t.id === id);
                  if (tech?.bayNumber) setBay(tech.bayNumber);
                }}
                className="w-full text-xs px-3 py-2.5 bg-white border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs font-semibold text-slate-800"
              >
                <option value="">Leave in Queue (Unassigned)</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.employeeNumber ? ` ${t.employeeNumber}` : ''} — {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* High Priority & Waiter Buttons */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {/* High Priority Button */}
            <button
              type="button"
              id="new-ro-high-priority-btn"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                isUrgent
                  ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                  : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-slate-500'}`} />
              <span>High Priority</span>
              {isUrgent && (
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </button>

            {/* Waiter Button to the right of High Priority */}
            <button
              type="button"
              id="new-ro-waiter-btn"
              onClick={() => setIsWaiter(!isWaiter)}
              className={`px-3.5 py-2 rounded-lg border-2 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer select-none ${
                isWaiter
                  ? 'border-red-600 bg-red-50 text-red-600 shadow-sm ring-1 ring-red-500'
                  : 'border-slate-500 bg-white text-slate-700 hover:border-red-500 hover:text-red-600'
              }`}
            >
              <Clock className={`w-4 h-4 ${isWaiter ? 'text-red-600' : 'text-slate-500'}`} />
              <span>Waiter</span>
              {isWaiter && (
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-200/80 px-1.5 py-0.5 rounded">
                  Active
                </span>
              )}
            </button>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t-2 border-slate-300 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsNewROModalOpen(false)}
              className="px-4 py-2 border-2 border-slate-400 text-xs font-semibold text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-new-ro-btn"
              type="submit"
              disabled={isDuplicateRo || !customerName.trim() || !hasValidConcern}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Open Repair Order
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
